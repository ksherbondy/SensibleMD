import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { consumedHeight, paginateDocument, paginationBlocks, type PageGeometry } from './pagination';
import type { SemanticDocument } from './semantic-document';

const pixels = (value: string) => Number.parseFloat(value) || 0;
function box(element: Element) {
  const style = getComputedStyle(element);
  return { height: element.getBoundingClientRect().height, marginTop: pixels(style.marginTop), marginBottom: pixels(style.marginBottom) };
}

/** Reads layout only from the offscreen full render and the stable visible grid. */
export function measurePageGeometry(viewport: HTMLElement, surface: HTMLElement, document: SemanticDocument): PageGeometry | null {
  const grid = getComputedStyle(viewport);
  const width = pixels(grid.gridTemplateColumns.split(' ')[0]);
  const height = viewport.getBoundingClientRect().height - pixels(grid.paddingTop) - pixels(grid.paddingBottom);
  if (width <= 0 || height <= 0) return null;
  // Exactly the first resolved CSS grid track, including page padding/border.
  const widthValue = `${width}px`;
  if (surface.style.width !== widthValue) surface.style.width = widthValue;
  const page = getComputedStyle(surface);
  const footer = surface.querySelector(':scope > footer');
  const body = surface.querySelector(':scope > .page-content');
  if (!footer || !body) return null;
  const availableHeight = height - pixels(page.paddingTop) - pixels(page.paddingBottom)
    - pixels(page.borderTopWidth) - pixels(page.borderBottomWidth) - consumedHeight(box(footer));
  if (availableHeight <= 0) return null;
  const blocks: PageGeometry['blocks'] = {};
  const children = Array.from(body.children);
  const byId = new Map(children.map(child => [child.id, child]));
  for (const node of paginationBlocks(document)) {
    const id = `measure-${node.type === 'heading' ? node.id : `reader-node-${node.id}`}`;
    const element = byId.get(id);
    if (!element) return null; // Never invent a height for an unmeasured block.
    blocks[node.id] = box(element);
  }
  const trailingHeight = children.filter(child => child.hasAttribute('data-footnotes'))
    .reduce((sum, element) => sum + consumedHeight(box(element)), 0);
  return { availableHeight, blocks, trailingHeight };
}

export function useMeasuredPagination(document: SemanticDocument, layoutKey: string, enabled: boolean, viewportRef: RefObject<HTMLDivElement | null>) {
  const measurementRef = useRef<HTMLElement>(null);
  // Source and version validate deferred work; geometry is derived, never navigation state.
  const [result, setResult] = useState<{ document: SemanticDocument; layoutKey: string; geometry: PageGeometry; signature: string } | null>(null);
  useLayoutEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    const surface = measurementRef.current;
    if (!viewport || !surface) return;
    let alive = true;
    let frame: number | null = null;
    const measure = () => {
      if (!alive) return;
      frame = null;
      const geometry = measurePageGeometry(viewport, surface, document);
      if (!geometry) { setResult(current => current === null ? current : null); return; }
      const signature = JSON.stringify(geometry);
      setResult(current => current?.document === document && current.layoutKey === layoutKey && current.signature === signature ? current : { document, layoutKey, geometry, signature });
    };
    const schedule = () => {
      if (alive && frame === null) frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    const reader = viewport.closest(".book-reader");
    if (reader) observer.observe(reader);
    // Observe content, not visible page fragments: packing cannot resize its own input.
    const body = surface.querySelector('.page-content');
    if (body) {
      observer.observe(body);
      for (const child of body.children) observer.observe(child);
    }
    window.addEventListener('resize', schedule);
    surface.addEventListener('load', schedule, true);
    surface.addEventListener('error', schedule, true);
    const fonts = window.document.fonts;
    fonts?.addEventListener('loadingdone', schedule);
    void fonts?.ready.then(schedule);
    measure();
    return () => {
      alive = false;
      if (frame !== null) cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('resize', schedule);
      surface.removeEventListener('load', schedule, true);
      surface.removeEventListener('error', schedule, true);
      fonts?.removeEventListener('loadingdone', schedule);
    };
  }, [document, layoutKey, enabled, viewportRef]);
  const geometry = result?.document === document && result.layoutKey === layoutKey ? result.geometry : null;
  const pages = useMemo(() => geometry ? paginateDocument(document, geometry) : [], [document, geometry]);
  return { viewportRef, measurementRef, pages, ready: geometry !== null };
}
