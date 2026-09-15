import { act, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';

const acceptedTypes = '.md,.markdown,.mdown,.txt,text/markdown,text/plain';

it('preserves header children, control attributes, focus order and settings trigger ref', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-name': 'Header.md' } });
  try {
    const header = document.querySelector<HTMLElement>('.topbar')!;
    expect(header.parentElement).toHaveClass('app-shell');
    expect(header.parentElement!.firstElementChild).toBe(header);
    expect([...header.children].map(e => [e.tagName, e.className])).toEqual([
      ['DIV', 'brand'], ['DIV', 'document-title'], ['DIV', 'topbar-actions'], ['INPUT', 'visually-hidden'],
    ]);
    expect(header.querySelector('.brand')).toHaveAttribute('aria-label', 'SensibleMD');
    expect(header.querySelector('.document-title > span:first-of-type')).toHaveTextContent('Header.md');
    expect(header.querySelector('.saved')).toHaveTextContent('No unsaved changes');
    expect(header.querySelector('.saved .lucide-check')).not.toBeNull();
    const names = ['Open Markdown file', 'Close document', 'Save', 'Download copy', 'Reading settings', 'Show command palette'];
    const buttons = within(header).getAllByRole('button');
    expect(buttons.map(b => b.getAttribute('aria-label'))).toEqual(names);
    for (const [index, button] of buttons.entries()) {
      expect(button.parentElement).toHaveClass('topbar-actions');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveClass('icon-button');
      expect(button).toHaveAttribute('title', index === 5 ? 'Show command palette (Cmd/Ctrl+K)' : names[index]);
    }
    buttons[0].focus();
    for (const button of buttons.slice(1)) { await s.user.tab(); expect(button).toHaveFocus(); }
    const single = header.querySelector('input')!;
    const collection = header.nextElementSibling!;
    for (const input of [single, collection]) {
      expect(input).toHaveAttribute('type', 'file');
      expect(input).toHaveClass('visually-hidden');
      expect(input).toHaveAttribute('accept', acceptedTypes);
    }
    expect(single).not.toHaveAttribute('multiple');
    expect(collection).toHaveAttribute('multiple');
    expect(collection.nextElementSibling).toHaveClass('workspace');
    expect(header.contains(screen.getByRole('textbox', { name: 'Search document' }))).toBe(false);
    const settings = buttons[4];
    expect(settings).toHaveAttribute('aria-expanded', 'false');
    await s.user.click(settings);
    expect(settings).toHaveAttribute('aria-expanded', 'true');
    await s.user.keyboard('{Escape}');
    expect(settings).toHaveFocus();
    expect(settings).toHaveAttribute('aria-expanded', 'false');
    await s.user.click(buttons[5]);
    await screen.findByRole('dialog', { name: 'Command palette' });
    await s.user.keyboard('{Escape}');
    expect(buttons[5]).toHaveFocus();
    await s.enterMode('Write');
    await s.appendToEditor('\nChanged');
    expect(header.querySelector('.saved')).toHaveTextContent('Unsaved changes');
    expect(header.querySelector('.saved .lucide-check')).toBeNull();
    expect(document.querySelector('.topbar')).toBe(header);
  } finally { s.unmount(); }
});

it('retains the single-file ref across native open, browser fallback, resets and same-file reselection', async () => {
  const s = await startScenario();
  try {
    const input = document.querySelector<HTMLInputElement>('.topbar input[type="file"]')!;
    const click = vi.spyOn(input, 'click');
    s.desktop.addFile('/Native.md', '# Native');
    s.desktop.openDialogResult = '/Native.md';
    await s.openDocument();
    expect(s.documentName()).toBe('Native.md');
    expect(click).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    Reflect.deleteProperty(s.desktop.api, 'openDocument');
    await s.openDocument();
    expect(click).toHaveBeenCalledOnce();
    const file = new File(['# Browser'], 'Browser.md', { type: 'text/markdown' });
    await s.user.upload(input, file);
    expect(input.value).toBe('');
    await waitFor(() => expect(s.documentName()).toBe('Browser.md'));
    expect(s.isDirty()).toBe(false);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await s.enterMode('Write');
    await s.appendToEditor('\nEdited');
    await s.user.upload(input, file);
    await waitFor(() => expect(s.currentMode()).toBe('Read'));
    expect(input.value).toBe('');
    expect(s.isDirty()).toBe(false);
    expect(localStorage.getItem('sensiblemd-document')).toBe('# Browser');
    expect(document.querySelector('.topbar input')).toBe(input);
  } finally { s.unmount(); }
});

it('retains collection picker ref, reset and reselection while leaving its input outside the header', async () => {
  const s = await startScenario();
  try {
    const header = document.querySelector('.topbar')!;
    const input = header.nextElementSibling as HTMLInputElement;
    const click = vi.spyOn(input, 'click');
    await s.user.click(screen.getByRole('button', { name: 'Show command palette' }));
    await s.user.click(await screen.findByRole('button', { name: /Open Markdown Collection/ }));
    expect(click).toHaveBeenCalledOnce();
    const files = [new File(['# B'], 'B.md', { type: 'text/markdown' }), new File(['# A'], 'A.md', { type: 'text/markdown' })];
    await s.user.upload(input, files);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    expect(input.value).toBe('');
    expect(s.chapterNames()).toEqual(['A.md', 'B.md']);
    await s.switchChapter('B.md');
    await s.user.upload(input, files);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    expect(input.value).toBe('');
    expect(document.querySelector('.topbar')!.nextElementSibling).toBe(input);
  } finally { s.unmount(); }
});

it('disables the header close control while the parent close action flushes reader state', async () => {
  const s = await startScenario();
  try {
    s.scheduler.useManualOrder();
    const close = screen.getByRole('button', { name: 'Close document' });
    await s.user.click(close);
    expect(close).toBeDisabled();
    expect(s.scheduler.pending('state:save').length).toBeGreaterThan(0);
    await act(async () => { s.scheduler.useAutomaticOrder(); });
    await s.settle();
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { s.unmount(); }
});
