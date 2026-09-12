import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { ControlledIntersectionObserver } from './dom-polyfills';
import { ControlledResizeObserver } from './pagination-geometry';

const source = '# Alpha\n\nFirst paragraph.\n\n# Beta\n\nSecond paragraph.';
it('Scroll places bottom controls outside its guttered document scrollport', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    const reader = document.querySelector('.scroll-reader')!;
    expect(reader).not.toBeNull();
    expect(reader.querySelector('.document-reader > .reading-column')).not.toBeNull();
    expect(ControlledIntersectionObserver.instances.findLast(o => o.targets.size)?.options?.root).toBe(reader.querySelector('.document-reader'));
    const footer = document.querySelector<HTMLElement>('.scroll-navigation')!;
    expect(footer).not.toBeNull();
    expect(footer).toContainElement(screen.getByRole('navigation', { name: 'Navigation history' }));
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Section context' }));
    expect(reader).not.toContainElement(footer);
    await s.setReadingLayout('Page');
    expect(document.querySelector('.scroll-reader')).toBeNull();
    expect(document.querySelector('.scroll-navigation')).toBeNull();
  } finally { s.unmount(); }
});
it('container-only Scroll reflow projects the current semantic target and rejects stale resize work', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');
  try {
    await s.clickOutlineHeading('Beta'); await s.settleNavigation();
    const observer = ControlledResizeObserver.instances.find(o => [...o.targets].some(t => t.matches('.reading-column')))!;
    expect(observer).toBeDefined();
    rect.mockReturnValue(new DOMRect(0, 0, 700, 500));
    await act(async () => observer.emit()); await s.settleNavigation();
    expect(s.lastScrollRequest()?.elementId).toBe(screen.getByRole('heading', { name: 'Beta' }).id);
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Beta');
    expect(s.isDirty()).toBe(false);
    await s.enterMode('Write');
    const previous = s.lastScrollRequest();
    rect.mockReturnValue(new DOMRect(0, 0, 800, 500));
    await act(async () => observer.emit()); await s.settleNavigation();
    expect(s.lastScrollRequest()).toBe(previous);
  } finally { rect.mockRestore(); s.unmount(); }
});
