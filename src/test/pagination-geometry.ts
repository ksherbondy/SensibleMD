import { paginateDocument, paginationBlocks } from '../core/pagination';
import type { SemanticDocument } from '../core/semantic-document';

// Test-only geometry. This is not a typography approximation or an app fallback.
// Every ordinary block is 100px, every heading 20px, usable page height 130px.
export function paginateTestDocument(document: SemanticDocument, availableHeight = 130) {
  return paginateDocument(document, { availableHeight, blocks: Object.fromEntries(paginationBlocks(document).map(node => [node.id, {
    height: node.type === 'heading' ? 20 : 100, marginTop: 0, marginBottom: 0,
  }])) });
}
export const testPageGeometry = { width: 760, height: 130, blockScale: 1, unavailable: false };
export function resetPageGeometry() { Object.assign(testPageGeometry, { width: 760, height: 130, blockScale: 1, unavailable: false }); }
export class ControlledResizeObserver {
  static instances: ControlledResizeObserver[] = [];
  targets = new Set<Element>();
  private callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) { this.callback = callback; ControlledResizeObserver.instances.push(this); }
  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
  disconnect() { this.targets.clear(); }
  emit() { this.callback([], this as unknown as ResizeObserver); }
}
export function installPaginationGeometry() {
  const originalRect = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () {
    if (this.matches('.book-pages')) return new DOMRect(0, 0, testPageGeometry.width, testPageGeometry.unavailable ? 0 : testPageGeometry.height);
    if (this.matches('.pagination-measurement > .page-content > *')) return new DOMRect(0, 0, testPageGeometry.width, (/^H[1-6]$/.test(this.tagName) ? 20 : 100) * testPageGeometry.blockScale);
    return originalRect.call(this);
  };
  const originalStyle = window.getComputedStyle;
  const style = (element: Element, pseudo?: string | null) => {
    const actual = originalStyle(element, pseudo);
    if (!element.matches('.book-pages')) return actual;
    return new Proxy(actual, { get(target, key) {
      if (key === 'gridTemplateColumns') return `${testPageGeometry.width}px`;
      if (key === 'columnGap') return '18px';
      if (key === 'getPropertyValue') return (name: string) => name === '--spread-min-page-width' ? '320px' : target.getPropertyValue(name);
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
  };
  window.getComputedStyle = style;
  globalThis.getComputedStyle = style;
  globalThis.ResizeObserver = ControlledResizeObserver as unknown as typeof ResizeObserver;
  window.ResizeObserver = globalThis.ResizeObserver;
}
