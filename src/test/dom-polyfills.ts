/**
 * jsdom omits several APIs the reader depends on. These shims record what the
 * application asked for so tests can assert on it (for example, that Reduced Motion
 * never produces a smooth scroll).
 */

export interface ScrollRequest { element: Element; elementId: string; behavior: ScrollBehavior | undefined; block: ScrollLogicalPosition | undefined }

export const scrollRequests: ScrollRequest[] = []
export const clipboardWrites: string[] = []

export class ControlledIntersectionObserver {
  static instances: ControlledIntersectionObserver[] = []
  readonly targets = new Set<Element>()
  private callback: IntersectionObserverCallback
  constructor(callback: IntersectionObserverCallback) { this.callback = callback; ControlledIntersectionObserver.instances.push(this) }
  observe(element: Element) { this.targets.add(element) }
  unobserve(element: Element) { this.targets.delete(element) }
  disconnect() { this.targets.clear() }
  takeRecords() { return [] }
  // Deliberately permits delivery after disconnect to test stale queued work.
  emit(targets: Element[]) {
    this.callback(targets.map((target) => ({ target, isIntersecting: true, intersectionRatio: 1, time: performance.now(), boundingClientRect: new DOMRect(0, 0, 100, 20), intersectionRect: new DOMRect(0, 0, 100, 20), rootBounds: new DOMRect(0, 0, 100, 100) })), this as unknown as IntersectionObserver)
  }
}

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

  // CodeMirror measures the caret after navigation. jsdom has no layout;
  // empty measurements allow selection tests without claiming visual geometry.
  if (!('getClientRects' in Range.prototype)) defineGlobal(Range.prototype, 'getClientRects', () => [])
  if (!('getBoundingClientRect' in Range.prototype)) defineGlobal(Range.prototype, 'getBoundingClientRect', () => new DOMRect())

  Element.prototype.scrollIntoView = function scrollIntoView(this: Element, options?: boolean | ScrollIntoViewOptions) {
    const settings = typeof options === 'object' && options !== null ? options : {}
    scrollRequests.push({ element: this, elementId: this.id, behavior: settings.behavior, block: settings.block })
  }

  if (!('ResizeObserver' in globalThis)) defineGlobal(globalThis, 'ResizeObserver', NoopObserver)
  defineGlobal(globalThis, 'IntersectionObserver', ControlledIntersectionObserver)
  if (typeof window.matchMedia !== 'function') defineGlobal(window, 'matchMedia', (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }))
  if (!('createObjectURL' in URL)) defineGlobal(URL, 'createObjectURL', () => 'blob:sensiblemd-test')
  if (!('revokeObjectURL' in URL)) defineGlobal(URL, 'revokeObjectURL', () => {})

  defineGlobal(navigator, 'clipboard', { writeText: (text: string) => { clipboardWrites.push(text); return Promise.resolve() } })
}

export function resetDomPolyfills() {
  ControlledIntersectionObserver.instances.length = 0
  scrollRequests.length = 0
  clipboardWrites.length = 0
}
