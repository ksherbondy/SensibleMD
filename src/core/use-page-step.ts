import { useLayoutEffect, useRef, useState } from "react";

// Both column selection and pagination observe the same available page grid.
// The minimum page width and gutter are CSS geometry, not window breakpoints.
export function usePageStep(spread: boolean, enabled: boolean) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);
  useLayoutEffect(() => {
    if (!enabled) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    let alive = true;
    let frame: number | null = null;
    const update = () => {
      if (!alive) return;
      frame = null;
      const style = getComputedStyle(viewport);
      const minimum = Number.parseFloat(style.getPropertyValue('--spread-min-page-width'));
      const gap = Number.parseFloat(style.columnGap) || 0;
      const width = viewport.clientWidth || viewport.getBoundingClientRect().width;
      const padding = (Number.parseFloat(style.paddingLeft) || 0) + (Number.parseFloat(style.paddingRight) || 0);
      const next = minimum > 0 && width - padding >= 2 * minimum + gap ? 2 : 1;
      setColumns(current => current === next ? current : next);
    };
    const schedule = () => { if (alive && frame === null) frame = requestAnimationFrame(update); };
    const observer = new ResizeObserver(schedule);
    observer.observe(viewport);
    // Gutter units follow this container even when the preference caps grid width.
    const reader = viewport.closest('.book-reader');
    if (reader) observer.observe(reader);
    update();
    return () => { alive = false; observer.disconnect(); if (frame !== null) cancelAnimationFrame(frame); };
  }, [enabled, spread]);
  return { pageStep: spread ? columns : 1, viewportRef };
}
