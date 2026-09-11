import { act, fireEvent, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { ControlledResizeObserver, testPageGeometry } from './pagination-geometry';

const source = Array.from({ length: 8 }, (_, i) => `# Section ${i + 1}\n\nParagraph ${i + 1}.`).join('\n\n');
const start = () => startScenario({ storage: { 'sensiblemd-document': source } });
async function frame() { await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); }); }

it.each(['Text size', 'Line spacing', 'Content width'])('%s invalidates geometry and keeps the semantic target on its new page', async label => {
  const s = await start();
  try {
    await s.setReadingLayout('Page'); await s.clickOutlineHeading('Section 6');
    expect(s.visiblePageNumbers()).toEqual([6]);
    testPageGeometry.blockScale = 0.4;
    await s.user.click(screen.getByRole('button', { name: 'Reading settings' }));
    const slider = Array.from(document.querySelectorAll('.settings-popover label')).find(element => element.textContent?.includes(label))!.querySelector('input')!;
    fireEvent.change(slider, { target: { value: label === 'Text size' ? '120' : label === 'Line spacing' ? '2' : '900' } });
    await s.settle();
    expect(s.visiblePageNumbers()).toEqual([3]);
    expect(screen.getByRole('article', { name: 'Page 3' })).toHaveTextContent('Section 6');
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Section 6');
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});
it('resize notifications are coalesced, preserve the anchor, and settle with stable pages', async () => {
  const s = await start();
  try {
    await s.setReadingLayout('Page'); await s.clickOutlineHeading('Section 8');
    const resize = ControlledResizeObserver.instances.find(o => [...o.targets].some(t => t.matches('.book-pages')))!;
    const rect = vi.spyOn(Element.prototype, 'getBoundingClientRect');
    testPageGeometry.height = 270; // 250px usable, two heading/paragraph groups per page.
    await act(async () => { for (let i = 0; i < 30; i++) { resize.emit(); window.dispatchEvent(new Event('resize')); } });
    await frame();
    expect(s.visiblePageNumbers()).toEqual([4]);
    expect(s.visiblePageLabel()).toBe('Page 4 of 4');
    const measurements = rect.mock.calls.length;
    await frame(); await frame();
    expect(rect.mock.calls.length).toBe(measurements);
    rect.mockRestore();
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Section 8');
  } finally { s.unmount(); }
});
it('unavailable initial geometry shows a placeholder until layout can be measured', async () => {
  testPageGeometry.unavailable = true;
  const s = await start();
  try {
    await s.setReadingLayout('Page');
    expect(screen.getByText('Preparing pages…')).toBeInTheDocument();
    expect(s.visiblePageNumbers()).toEqual([]);
    testPageGeometry.unavailable = false;
    window.dispatchEvent(new Event('resize')); await frame();
    expect(s.visiblePageNumbers()).toEqual([1]);
    expect(screen.queryByText('Preparing pages…')).not.toBeInTheDocument();
  } finally { s.unmount(); }
});
it('font completion and late content changes trigger stable repagination without duplicate visible IDs', async () => {
  const fonts = Object.assign(new EventTarget(), { ready: Promise.resolve() });
  const previous = Object.getOwnPropertyDescriptor(document, 'fonts');
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
  const s = await start();
  try {
    await s.setReadingLayout('Page'); await s.clickOutlineHeading('Section 6'); await frame();
    testPageGeometry.blockScale = 0.4;
    fonts.dispatchEvent(new Event('loadingdone')); await frame();
    expect(s.visiblePageNumbers()).toEqual([3]);
    const ids = Array.from(document.querySelectorAll('[id]')).map(e => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    const surface = document.querySelector('.pagination-measurement')!;
    expect(surface).toHaveAttribute('inert'); expect(surface).toHaveAttribute('aria-hidden', 'true');
    testPageGeometry.blockScale = 1;
    fireEvent.load(surface.querySelector('.page-content')!); await frame();
    expect(s.visiblePageNumbers()).toEqual([6]);
  } finally {
    s.unmount();
    if (previous) Object.defineProperty(document, 'fonts', previous); else Reflect.deleteProperty(document, 'fonts');
  }
});
it('source replacement and stale layout callbacks cannot restore old pages', async () => {
  const s = await start();
  try {
    await s.setReadingLayout('Page'); await s.clickOutlineHeading('Section 8');
    const old = ControlledResizeObserver.instances.find(o => [...o.targets].some(t => t.matches('.book-pages')))!;
    await s.enterMode('Write'); await s.setEditorSource('# Replacement\n\nOnly block.');
    old.emit(); await frame();
    await s.enterMode('Read');
    expect(s.visiblePageLabel()).toBe('Page 1 of 1');
    expect(screen.getByRole('article', { name: 'Page 1' })).toHaveTextContent('Replacement');
    expect(screen.queryByRole('heading', { name: 'Section 8' })).not.toBeInTheDocument();
  } finally { s.unmount(); }
});
it('usable height subtracts computed page padding, borders, and the footer margin box', async () => {
  const { measurePageGeometry } = await import('../core/use-measured-pagination');
  const { parseSemanticDocument } = await import('../core/semantic-document');
  const model = parseSemanticDocument('Text.', 0);
  const host = document.createElement('div');
  host.innerHTML = `<div class="book-pages"></div><article class="pagination-measurement" style="padding:10px 20px;border:3px solid"><div class="page-content"><p id="measure-reader-node-${model.nodes[0].id}" style="margin:3px 0 5px">Text.</p></div><footer style="margin:7px 0 9px">Page</footer></article>`;
  document.body.append(host);
  try {
    const geometry = measurePageGeometry(host.firstElementChild as HTMLElement, host.lastElementChild as HTMLElement, model)!;
    expect(geometry.availableHeight).toBe(150 - 20 - 6 - 20 - 7 - 9);
    expect(geometry.blocks[model.nodes[0].id]).toEqual({ height: 100, marginTop: 3, marginBottom: 5 });
    expect((host.lastElementChild as HTMLElement).style.width).toBe('760px');
  } finally { host.remove(); }
});
it('container-only sidebar changes recompute spread columns and preserve the semantic anchor', async () => {
  testPageGeometry.width = 500;
  const s = await start();
  const windowWidth = window.innerWidth;
  try {
    await s.setReadingLayout('Spread'); await s.clickOutlineHeading('Section 6');
    expect(document.querySelector('.book-reader')).toHaveAttribute('data-columns', '1');
    await s.user.click(screen.getByRole('button', { name: 'Close outline' }));
    testPageGeometry.width = 760;
    ControlledResizeObserver.instances.forEach(observer => observer.emit()); await frame(); await frame();
    expect(window.innerWidth).toBe(windowWidth);
    expect(document.querySelector('.book-reader')).toHaveAttribute('data-columns', '2');
    expect(s.visiblePageNumbers()).toContain(6);
    // A future panel can consume space without a React sidebar toggle or OS resize.
    testPageGeometry.width = 500;
    ControlledResizeObserver.instances.forEach(observer => observer.emit()); await frame(); await frame();
    expect(document.querySelector('.book-reader')).toHaveAttribute('data-columns', '1');
    expect(s.visiblePageNumbers()).toEqual([6]);
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});
it('container-only width changes repaginate Page without a window resize event', async () => {
  const s = await start();
  try {
    await s.setReadingLayout('Page'); await s.clickOutlineHeading('Section 6');
    await s.user.click(screen.getByRole('button', { name: 'Close outline' }));
    testPageGeometry.width = 900;
    testPageGeometry.blockScale = 0.4;
    ControlledResizeObserver.instances.forEach(observer => observer.emit()); await frame();
    expect(s.visiblePageNumbers()).toEqual([3]);
    expect(screen.getByRole('article', { name: 'Page 3' })).toHaveTextContent('Section 6');
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});
