import { act, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { scrollRequests } from './dom-polyfills';

const panel = () => screen.getByRole('region', { name: 'Search results' });
const rows = () => [...panel().querySelectorAll<HTMLButtonElement>(':scope > button')];
const input = () => screen.getByRole('textbox', { name: 'Search document' });
const count = () => panel().querySelector('header > span');
const active = () => document.querySelector('.outline-item[aria-current="location"]');
const origin = () => within(panel()).getByRole('button', { name: 'Return to origin' });
const next = () => within(panel()).getByRole('button', { name: 'Next search result' });
const previous = () => within(panel()).getByRole('button', { name: 'Previous search result' });

it('preserves search DOM, ordered first eight rows, match counts, full-set cycling and retained session focus', async () => {
  const source = '# Origin\n\n' + Array.from({ length: 10 }, (_, i) => `needle ${i + 1}${i === 0 ? ' needle' : ''}.`).join('\n\n');
  const s = await startScenario({ storage: { 'sensiblemd-document': source, 'sensiblemd-name': 'Search.md' } });
  try {
    await s.clickOutlineHeading('Origin');
    await s.user.type(input(), 'needle');
    expect(panel().parentElement).toHaveClass('main-area');
    expect(panel().previousElementSibling).toHaveClass('reader-toolbar');
    expect([...panel().children].map(e => e.tagName)).toEqual(['HEADER', 'DIV', ...Array(8).fill('BUTTON')]);
    expect(panel().children[1]).toHaveClass('search-session-controls');
    expect(count()).toHaveTextContent('11 matches in 10 document blocks');
    expect(rows()).toHaveLength(8);
    for (const [index, row] of rows().entries()) {
      expect(row).toHaveAttribute('type', 'button');
      expect([...row.children].map(e => e.tagName)).toEqual(['STRONG', 'SPAN', 'SMALL']);
      expect(row.querySelector('strong')).toHaveTextContent('Search.md · Origin');
      expect(row.querySelector('span')!.textContent).toBe(`needle ${index + 1}${index === 0 ? ' needle' : ''}.`);
      expect(row.querySelector('small')).toHaveTextContent(`Line ${3 + index * 2}`);
      expect(row.className).toBe('');
    }
    expect(within(panel()).getByRole('group', { name: 'Search scope' })).toBeInTheDocument();
    const buttons = within(panel()).getAllByRole('button');
    for (const button of buttons) expect(button).toHaveAttribute('type', 'button');
    expect(origin()).toBeDisabled();
    buttons[0].focus();
    for (const button of buttons.slice(1).filter(b => !(b as HTMLButtonElement).disabled)) {
      await s.user.tab(); expect(button).toHaveFocus();
    }
    await s.user.click(previous()); // From no selection, previous chooses the full set's last result.
    expect(count()).toHaveTextContent('10 of 10 results');
    expect(rows().every(r => !r.classList.contains('selected-result'))).toBe(true);
    expect(origin()).toBeEnabled();
    await s.user.click(next());
    expect(count()).toHaveTextContent('1 of 10 results');
    expect(rows()[0]).toHaveClass('selected-result');
    for (let i = 0; i < 8; i++) await s.user.click(next());
    expect(count()).toHaveTextContent('9 of 10 results');
    expect(rows()).toHaveLength(8);
    expect(rows().every(r => !r.classList.contains('selected-result'))).toBe(true);
    await s.user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
    expect(input()).toHaveValue('needle');
    expect(input()).toHaveFocus();
    await s.user.keyboard('{Control>}f{/Control}');
    expect(count()).toHaveTextContent('9 of 10 results');
    expect(origin()).toBeEnabled();
    await s.user.click(origin());
    expect(count()).toHaveTextContent('11 matches in 10 document blocks');
    expect(origin()).toBeDisabled();
    expect(active()).toHaveTextContent('Origin');
  } finally { s.unmount(); }
});

it('preserves empty-query visibility, no-result disabled states and query/scope resets including reselecting a scope', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# Start\n\nneedle.' } });
  try {
    await s.user.click(input());
    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
    await s.user.type(input(), 'absent');
    expect(count()).toHaveTextContent('0 matches in 0 document blocks');
    expect(rows()).toHaveLength(0);
    for (const control of [previous(), next(), origin()]) expect(control).toBeDisabled();
    await s.user.clear(input());
    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
    await s.user.type(input(), 'needle');
    for (const scope of ['All chapters', 'This file', 'This file']) {
      await s.user.click(next());
      expect(origin()).toBeEnabled();
      expect(count()).toHaveTextContent('1 of 1 results');
      const control = within(panel()).getByRole('button', { name: scope });
      await s.user.click(control);
      expect(control).toHaveClass('selected');
      expect(origin()).toBeDisabled();
      expect(count()).toHaveTextContent('1 matches in 1 document blocks');
      expect(rows()[0]).not.toHaveClass('selected-result');
    }
    await s.user.click(next());
    await s.user.type(input(), 'x');
    expect(origin()).toBeDisabled();
    expect(count()).toHaveTextContent('0 matches in 0 document blocks');
  } finally { s.unmount(); }
});

it('keeps direct selection distinct from cycling and resolves duplicate formatted headings in Write', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# Origin\n\n## **Twin**\n\nneedle first.\n\n## **Twin**\n\nneedle second.' } });
  try {
    await s.clickOutlineHeading('Origin');
    await s.enterMode('Write');
    await s.user.type(input(), 'needle');
    const twins = [...document.querySelectorAll('.outline-item')].filter(b => b.textContent === 'Twin');
    await s.user.click(rows()[1]);
    expect(rows()[1]).toHaveClass('selected-result');
    expect(document.querySelector('.cm-content')).toHaveFocus();
    expect(active()).toBe(twins[1]);
    expect(s.editorCursorLine()).toBe(7);
    expect(s.currentMode()).toBe('Write');
    expect(origin()).toBeDisabled();
    await s.user.click(previous()); // Captures second Twin; direct selection did not capture Origin.
    expect(active()).toBe(twins[0]);
    expect(s.editorCursorLine()).toBe(3);
    expect(origin()).toBeEnabled();
    await s.user.click(rows()[0]); // An existing origin survives direct selection.
    expect(origin()).toBeEnabled();
    await s.user.click(origin());
    expect(active()).toBe(twins[1]);
    expect(s.editorCursorLine()).toBe(7);
    expect(s.currentMode()).toBe('Write');
    expect(origin()).toBeDisabled();
    expect(count()).toHaveTextContent('2 matches in 2 document blocks');
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});

it('preserves collection ordering, cross-document direct/cycle distinctions and return identity', async () => {
  const s = await startScenario();
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# **Twin**\n\nneedle B.'], 'B.md', { type: 'text/markdown' }),
      new File(['# **Twin**\n\nneedle A.'], 'A.md', { type: 'text/markdown' }),
    ]);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    const firstId = document.querySelector('.app-shell')!.getAttribute('data-document-id');
    await s.clickOutlineHeading('Twin');
    await s.user.type(input(), 'needle');
    expect(rows()).toHaveLength(1);
    await s.user.click(within(panel()).getByRole('button', { name: 'All chapters' }));
    expect(rows().map(r => r.querySelector('strong')!.textContent)).toEqual(['A.md · Twin', 'B.md · Twin']);
    await s.enterMode('Split');
    await s.user.click(rows()[1]);
    await s.settleNavigation();
    const secondId = document.querySelector('.app-shell')!.getAttribute('data-document-id');
    expect(secondId).not.toBe(firstId);
    expect(s.documentName()).toBe('B.md');
    expect(s.currentMode()).toBe('Read');
    expect(origin()).toBeDisabled();
    expect(active()).toHaveTextContent('Twin');
    await s.user.click(previous()); // Capture B, then cycle to A.
    await s.settleNavigation();
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', firstId);
    expect(s.documentName()).toBe('A.md');
    expect(origin()).toBeEnabled();
    await s.user.click(origin());
    await s.settleNavigation();
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', secondId);
    expect(s.documentName()).toBe('B.md');
    expect(active()).toHaveTextContent('Twin');
    expect(origin()).toBeDisabled();
    expect(count()).toHaveTextContent('2 matches in 2 document blocks');
    expect(input()).toHaveValue('needle');
  } finally { s.unmount(); }
});

it('rejects a queued cross-document search target after source editing', async () => {
  const s = await startScenario();
  let spy: ReturnType<typeof vi.spyOn> | undefined;
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A\n\nneedle A.'], 'A.md', { type: 'text/markdown' }),
      new File(['# B\n\nneedle B.'], 'B.md', { type: 'text/markdown' }),
    ]);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    await s.user.type(input(), 'needle');
    await s.user.click(within(panel()).getByRole('button', { name: 'All chapters' }));
    const callbacks: FrameRequestCallback[] = [];
    spy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(callback => { callbacks.push(callback); return callbacks.length; });
    await s.user.click(rows()[1]);
    expect(s.documentName()).toBe('B.md');
    const old = callbacks.at(-1)!;
    expect(old).toBeTypeOf('function');
    await s.enterMode('Write');
    await s.setEditorSource('# Revised\n\nChanged.');
    const before = active()?.textContent;
    const scrollCount = scrollRequests.length;
    await act(async () => old(performance.now()));
    expect(active()?.textContent).toBe(before);
    expect(scrollRequests).toHaveLength(scrollCount);
    expect(s.editorSource()).toBe('# Revised\n\nChanged.');
    expect(s.currentMode()).toBe('Write');
  } finally { spy?.mockRestore(); s.unmount(); }
});
