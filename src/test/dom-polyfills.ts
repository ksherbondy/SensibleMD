/**
 * jsdom omits several APIs the reader depends on. These shims record what the
 * application asked for so tests can assert on it (for example, that Reduced Motion
 * never produces a smooth scroll).
 */

export interface ScrollRequest { elementId: string; behavior: ScrollBehavior | undefined; block: ScrollLogicalPosition | undefined }

export const scrollRequests: ScrollRequest[] = []
export const clipboardWrites: string[] = []

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return [] }
}

// Node's experimental web storage shadows the jsdom implementation and is not usable,
// so the harness supplies its own.
class MemoryStorage {
  private readonly entries = new Map<string, string>()
  get length() { return this.entries.size }
  clear() { this.entries.clear() }
  getItem(key: string) { return this.entries.get(String(key)) ?? null }
  key(index: number) { return [...this.entries.keys()][index] ?? null }
  removeItem(key: string) { this.entries.delete(String(key)) }
  setItem(key: string, value: string) { this.entries.set(String(key), String(value)) }
}

function defineGlobal(target: object, name: string, value: unknown) {
  Object.defineProperty(target, name, { writable: true, configurable: true, value })
}

export function installDomPolyfills() {
  defineGlobal(globalThis, 'localStorage', new MemoryStorage())
  defineGlobal(globalThis, 'sessionStorage', new MemoryStorage())

  Element.prototype.scrollIntoView = function scrollIntoView(this: Element, options?: boolean | ScrollIntoViewOptions) {
    const settings = typeof options === 'object' && options !== null ? options : {}
    scrollRequests.push({ elementId: this.id, behavior: settings.behavior, block: settings.block })
  }

  if (!('ResizeObserver' in globalThis)) defineGlobal(globalThis, 'ResizeObserver', NoopObserver)
  if (!('IntersectionObserver' in globalThis)) defineGlobal(globalThis, 'IntersectionObserver', NoopObserver)
  if (!('matchMedia' in window)) defineGlobal(window, 'matchMedia', (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }))
  if (!('createObjectURL' in URL)) defineGlobal(URL, 'createObjectURL', () => 'blob:sensiblemd-test')
  if (!('revokeObjectURL' in URL)) defineGlobal(URL, 'revokeObjectURL', () => {})

  defineGlobal(navigator, 'clipboard', { writeText: (text: string) => { clipboardWrites.push(text); return Promise.resolve() } })
}

export function resetDomPolyfills() {
  scrollRequests.length = 0
  clipboardWrites.length = 0
}
