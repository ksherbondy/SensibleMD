import type { SemanticDocument, SemanticNode } from './semantic-document';

export const SPLIT_ANCHOR = 1 / 3;
export interface SplitEditor {
  scrollDOM: HTMLElement;
  source: () => string;
  offsetAtAnchor: () => number;
  reveal: (offset: number) => void;
}
interface Work {
  interruptCurrentContext: () => void;
  capture: () => () => boolean;
}
type Driver = 'editor' | 'preview';

/** One model-scoped bridge. It derives locations; the workspace owns the anchor. */
export function connectSplit(document: SemanticDocument, editor: SplitEditor, preview: HTMLElement, work: Work, onObserve: (node: SemanticNode) => void) {
  const elements = new Map(Array.from(preview.querySelectorAll<HTMLElement>('[id]')).map(element => [element.id, element]));
  const entries = document.nodes.flatMap(node => {
    const element = elements.get(node.type === 'heading' ? node.id : `reader-node-${node.id}`);
    return element ? [{ node, element }] : [];
  });
  let alive = true;
  let driver: Driver | null = null;
  let expires = 0;
  let current = work.capture();
  let frame: number | null = null;
  let last = '';
  let tops: number[] | null = null;
  const valid = () => alive && current() && editor.source() === document.source;
  const invalidateLayout = () => { tops = null; last = ''; };
  const positions = () => {
    if (!tops) {
      const top = preview.getBoundingClientRect().top + preview.clientTop;
      tops = entries.map(({ element }) => element.getBoundingClientRect().top - top + preview.scrollTop);
    }
    return tops;
  };
  // Source/render entries are ordered. Scroll-time lookup is logarithmic.
  const preceding = (value: number, at: (index: number) => number) => {
    let lo = 0, hi = entries.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (at(mid) <= value) lo = mid + 1; else hi = mid; }
    return entries[Math.max(0, lo - 1)];
  };
  const fromOffset = (offset: number) => preceding(offset, index => entries[index].node.range.start);
  const revealPreview = (entry: typeof entries[number]) => {
    const top = entry.element.getBoundingClientRect().top - preview.getBoundingClientRect().top - preview.clientTop + preview.scrollTop;
    preview.scrollTo({ top: Math.max(0, top - preview.clientHeight * SPLIT_ANCHOR), behavior: 'instant' });
  };
  const cancelFrame = () => { if (frame !== null) cancelAnimationFrame(frame); frame = null; };
  const arm = (side: Driver) => {
    work.interruptCurrentContext(); current = work.capture();
    driver = side; expires = performance.now() + 1000; last = ''; cancelFrame();
  };
  const scroll = (side: Driver) => {
    if (!valid() || driver !== side || performance.now() > expires) return;
    expires = performance.now() + 1000;
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      if (!valid() || driver !== side) return;
      const entry = side === 'editor' ? fromOffset(editor.offsetAtAnchor()) : preceding(preview.scrollTop + preview.clientHeight * SPLIT_ANCHOR, index => positions()[index]);
      if (!entry || last === `${side}:${entry.node.id}`) return;
      last = `${side}:${entry.node.id}`;
      if (side === 'editor') revealPreview(entry); else editor.reveal(entry.node.range.start);
      onObserve(entry.node);
    });
  };
  const cleanups: (() => void)[] = [];
  for (const [side, element] of [['editor', editor.scrollDOM], ['preview', preview]] as const) {
    const input = () => arm(side);
    const key = (event: KeyboardEvent) => { if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) arm(side); };
    const moved = () => scroll(side);
    for (const type of ['wheel', 'touchmove', 'pointerdown']) element.addEventListener(type, input, { passive: true });
    element.addEventListener('keydown', key);
    element.addEventListener('scroll', moved, { passive: true });
    cleanups.push(() => {
      for (const type of ['wheel', 'touchmove', 'pointerdown']) element.removeEventListener(type, input);
      element.removeEventListener('keydown', key); element.removeEventListener('scroll', moved);
    });
  }
  const resize = new ResizeObserver(invalidateLayout);
  resize.observe(preview);
  for (const { element } of entries) resize.observe(element);
  preview.addEventListener('load', invalidateLayout, true);
  const fonts = window.document.fonts;
  fonts?.addEventListener('loadingdone', invalidateLayout);
  return {
    navigate(offset: number) {
      driver = null; last = ''; cancelFrame(); current = work.capture();
      const entry = fromOffset(offset);
      frame = requestAnimationFrame(() => {
        frame = null;
        if (!valid() || !entry || driver !== null) return;
        editor.reveal(offset); revealPreview(entry);
      });
    },
    dispose() {
      alive = false; cancelFrame(); cleanups.forEach(cleanup => cleanup()); resize.disconnect();
      preview.removeEventListener('load', invalidateLayout, true);
      fonts?.removeEventListener('loadingdone', invalidateLayout);
    },
  };
}
