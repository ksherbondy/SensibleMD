import { act, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { CommandPalette } from '../components/CommandPalette';
import type { CommandDefinition } from '../core/commands';
import { startScenario, type Scenario } from './scenario';
import { FakeDesktop } from './electron-double';

const capture = vi.hoisted(() => ({ commands: [] as CommandDefinition[] }));
vi.mock('../components/CommandPalette', async importOriginal => {
  const actual = await importOriginal<typeof import('../components/CommandPalette')>();
  return { CommandPalette: (props: ComponentProps<typeof CommandPalette>) => {
    capture.commands = props.commands;
    return <actual.CommandPalette {...props} />;
  } };
});
beforeEach(() => { capture.commands = []; });

const source = '# First\n\nFirst paragraph.\n\n[link](https://example.com)\n\n![image](image.png)\n\n| A | B |\n| - | - |\n| one | two |\n\n```txt\nfirst code\n```\n\n## Second\n\nSecond paragraph.\n\n```txt\nsecond code\n```';
async function catalog(s: Scenario) {
  if (!screen.queryByRole('dialog', { name: 'Command palette' })) {
    await s.user.click(screen.getByRole('button', { name: 'Show command palette' }));
    await screen.findByRole('dialog', { name: 'Command palette' });
  }
  return capture.commands;
}
async function command(s: Scenario, id: string) {
  const result = (await catalog(s)).find(c => c.id === id);
  if (!result) throw Error(`Missing command ${id}`);
  return result;
}
async function execute(s: Scenario, id: string) {
  const c = await command(s, id);
  expect(c.enabled, id).toBe(true);
  const dialog = screen.getByRole('dialog', { name: 'Command palette' });
  const button = [...dialog.querySelectorAll('button')].find(b => b.querySelector('small')?.textContent === id)!;
  await s.user.click(button);
  await s.settleNavigation();
}
async function dismiss(s: Scenario) { await s.user.keyboard('{Escape}'); }

it('characterizes the complete ordered catalog metadata and Read/Write/Split availability', async () => {
  const desktop = new FakeDesktop().addFile('/Recent.md', '# Recent');
  desktop.recents = ['/Recent.md'];
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('First');
    for (const mode of ['Read', 'Write', 'Split'] as const) {
      await s.enterMode(mode);
      const commands = await catalog(s);
      expect(commands.map(({ execute: _execute, ...metadata }) => metadata)).toMatchSnapshot(mode);
      const dialog = screen.getByRole('dialog', { name: 'Command palette' });
      for (const c of commands) {
        const button = [...dialog.querySelectorAll('button')].find(b => b.querySelector('small')?.textContent === c.id)!;
        expect(button.disabled).toBe(!c.enabled);
        expect(button.querySelector('strong')).toHaveTextContent(c.title);
      }
      await dismiss(s);
    }
  } finally { s.unmount(); }
});

it('refreshes save availability and executes fallback/direct save with the latest edited source', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    expect((await command(s, 'file.save')).enabled).toBe(true); // clean browser document still needs Save As
    s.desktop.saveAsDialogResult = '/Saved.md';
    await execute(s, 'file.save');
    expect(s.desktop.diskContents('/Saved.md')).toBe(source);
    expect((await command(s, 'file.save')).enabled).toBe(false);
    expect((await command(s, 'file.save')).disabledReason).toBe('No unsaved changes.');
    await execute(s, 'editor.enterRawMode');
    await s.appendToEditor('\n\nLatest edit.');
    expect((await command(s, 'file.save')).enabled).toBe(true);
    await execute(s, 'file.save');
    expect(s.desktop.diskContents('/Saved.md')).toBe(source + '\n\nLatest edit.');
    expect(s.isDirty()).toBe(false);
    Reflect.deleteProperty(s.desktop.api, 'saveOpenedDocument');
    Reflect.deleteProperty(s.desktop.api, 'saveDocumentAs');
    await s.appendToEditor('\nUnavailable edit.');
    expect((await command(s, 'file.save')).enabled).toBe(false);
    expect((await command(s, 'file.save')).disabledReason).toBe('Native saving is unavailable. Use Download copy to export.');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect((await command(s, 'file.downloadCopy')).enabled).toBe(true);
  } finally { s.unmount(); }
});

it('opens files and dynamic recents, updates navigation facts after switching, and closes to Home', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    s.desktop.addFile('/Plain.md', 'No headings or code.');
    s.desktop.openDialogResult = '/Plain.md';
    await execute(s, 'app.openFile');
    expect(s.documentName()).toBe('Plain.md');
    expect((await command(s, 'reader.nextHeading')).enabled).toBe(false);
    expect((await command(s, 'reader.nextCodeBlock')).enabled).toBe(false);
    expect((await command(s, 'bookmark.addCurrentPosition')).enabled).toBe(false);
    s.desktop.addFile('/Other.md', '# Other');
    s.desktop.openDialogResult = '/Other.md';
    await execute(s, 'app.openFile');
    expect((await command(s, 'app.openRecent.1')).title).toBe('Open Recent: Plain.md');
    await execute(s, 'app.openRecent.1');
    expect(s.documentName()).toBe('Plain.md');
    await execute(s, 'file.close');
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { s.unmount(); }
});

it('keeps Close enabled when dirty but lets the existing close action refuse', async () => {
  const s = await startScenario();
  try {
    await s.enterMode('Write');
    await s.appendToEditor('\nDirty');
    await execute(s, 'file.close');
    expect(s.isDirty()).toBe(true);
    expect(screen.queryByText('No document open')).toBeNull();
    expect(s.status()).toMatch(/save/i);
  } finally { s.unmount(); }
});

it('disables Close while its final reader-state write is pending', async () => {
  const s = await startScenario();
  try {
    s.scheduler.useManualOrder();
    await execute(s, 'file.close');
    expect(s.scheduler.pending('state:save').length).toBeGreaterThan(0);
    expect((await command(s, 'file.close')).enabled).toBe(false);
    await act(async () => { s.scheduler.useAutomaticOrder(); });
    await s.settle();
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { s.unmount(); }
});

it('opens a collection picker and executes next/previous chapter without inventing history semantics', async () => {
  const s = await startScenario();
  try {
    const input = document.querySelector<HTMLInputElement>('input[type="file"][multiple]')!;
    const click = vi.spyOn(input, 'click');
    await execute(s, 'app.openCollection');
    expect(click).toHaveBeenCalledOnce();
    await s.user.upload(input, [new File(['# A\n\nOne'], 'A.md', { type: 'text/markdown' }), new File(['# B\n\nTwo'], 'B.md', { type: 'text/markdown' })]);
    await s.settleNavigation();
    expect(s.documentName()).toBe('A.md');
    expect((await command(s, 'book.previousChapter')).enabled).toBe(false);
    await execute(s, 'book.nextChapter');
    expect(s.documentName()).toBe('B.md');
    expect((await command(s, 'book.nextChapter')).enabled).toBe(false);
    await execute(s, 'book.previousChapter');
    expect(s.documentName()).toBe('A.md');
  } finally { s.unmount(); }
});

it.each([
  ['reader.nextParagraph', 'paragraph'], ['reader.previousParagraph', 'paragraph'],
  ['reader.nextLink', 'link'], ['reader.nextImage', 'image'],
  ['reader.nextTable', 'table'], ['reader.nextCodeBlock', 'code'],
] as const)('executes %s against the current semantic source', async (id, type) => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('First');
    await execute(s, id);
    expect(s.lastScrollRequest()?.elementId).toMatch(new RegExp(`^reader-node-${type}-`));
    if (type === 'paragraph') expect(s.lastScrollRequest()?.element).toHaveTextContent(id === 'reader.previousParagraph' ? 'Second paragraph.' : 'First paragraph.');
    expect(s.currentMode()).toBe('Read');
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});

it('executes heading/history/page commands and refreshes endpoint availability', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('First');
    await execute(s, 'reader.nextHeading');
    expect(document.querySelector('.outline-item[aria-current]')).toHaveTextContent('Second');
    expect((await command(s, 'reader.nextHeading')).enabled).toBe(false);
    await execute(s, 'reader.previousHeading');
    expect(document.querySelector('.outline-item[aria-current]')).toHaveTextContent('First');
    await execute(s, 'history.back');
    expect(document.querySelector('.outline-item[aria-current]')).toHaveTextContent('Second');
    await execute(s, 'history.forward');
    expect(document.querySelector('.outline-item[aria-current]')).toHaveTextContent('First');
    await dismiss(s);
    await s.setReadingLayout('Page');
    const initial = s.visiblePageNumbers();
    expect((await command(s, 'book.previousPage')).enabled).toBe(false);
    await execute(s, 'book.nextPage');
    expect(s.visiblePageNumbers()).not.toEqual(initial);
    await execute(s, 'book.previousPage');
    expect(s.visiblePageNumbers()).toEqual(initial);
  } finally { s.unmount(); }
});

it.each([['reader.copyCurrentParagraph', 'First paragraph.'], ['reader.copyCurrentCodeBlock', '```txt\nfirst code\n```']] as const)('executes %s without changing the source', async (id, expected) => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  const write = vi.spyOn(navigator.clipboard, 'writeText');
  try {
    await s.clickOutlineHeading('First');
    await execute(s, id);
    expect(write).toHaveBeenCalledExactlyOnceWith(expected);
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); write.mockRestore(); }
});

it('refreshes structural availability after edits, preserving current-node copy enablement quirks', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# Only\n\nOnly paragraph.' } });
  try {
    await s.clickOutlineHeading('Only');
    await execute(s, 'reader.nextParagraph');
    expect((await command(s, 'reader.nextParagraph')).enabled).toBe(false);
    expect((await command(s, 'reader.copyCurrentParagraph')).enabled).toBe(false);
    expect((await command(s, 'reader.copyCurrentCodeBlock')).enabled).toBe(false);
    await execute(s, 'editor.enterRawMode');
    await s.setEditorSource('# New\n\n```txt\nnew code\n```');
    await execute(s, 'reader.enterRenderedMode');
    expect((await command(s, 'reader.nextParagraph')).enabled).toBe(false);
    expect((await command(s, 'reader.nextCodeBlock')).enabled).toBe(true);
  } finally { s.unmount(); }
});

it('retains browser-open fallback when the native open API is absent', async () => {
  const s = await startScenario();
  try {
    Reflect.deleteProperty(s.desktop.api, 'openDocument');
    const input = document.querySelector<HTMLInputElement>('input[type="file"]:not([multiple])')!;
    const click = vi.spyOn(input, 'click');
    await execute(s, 'app.openFile');
    expect(click).toHaveBeenCalledOnce();
  } finally { s.unmount(); }
});

it('executes search cycling/origin and bookmark/context commands with current state', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('First');
    expect((await command(s, 'search.nextResult')).enabled).toBe(false);
    await dismiss(s);
    await s.user.type(screen.getByRole('textbox', { name: 'Search document' }), 'paragraph');
    await execute(s, 'search.nextResult');
    expect(screen.getByRole('region', { name: 'Search results' }).querySelector('header')).toHaveTextContent('1 of 2 results');
    expect((await command(s, 'search.returnToOrigin')).enabled).toBe(true);
    await execute(s, 'search.previousResult');
    expect(screen.getByRole('region', { name: 'Search results' }).querySelector('header')).toHaveTextContent('2 of 2 results');
    await execute(s, 'search.returnToOrigin');
    expect((await command(s, 'search.returnToOrigin')).enabled).toBe(false);
    await execute(s, 'bookmark.addCurrentPosition');
    expect(JSON.parse(localStorage.getItem('sensiblemd-bookmarks')!)).toHaveLength(1);
    await execute(s, 'bookmark.addCurrentPosition');
    expect(JSON.parse(localStorage.getItem('sensiblemd-bookmarks')!)).toEqual([]);
    await execute(s, 'accessibility.showCurrentContext');
    expect(document.querySelector('.section-summary')).not.toBeNull();
  } finally { s.unmount(); }
});

it('executes view, diagnostics and settings commands without merging their distinct actions', async () => {
  const s = await startScenario();
  try {
    await execute(s, 'editor.enterRawMode');
    expect(s.currentMode()).toBe('Write');
    await execute(s, 'editor.enterSplitMode');
    expect(s.currentMode()).toBe('Split');
    await execute(s, 'reader.enterRenderedMode');
    expect(s.currentMode()).toBe('Read');
    await execute(s, 'accessibility.openFindings');
    expect(s.currentMode()).toBe('Write');
    for (const [id, label] of [['diagnostics.showErrors', 'Errors'], ['diagnostics.showWarnings', 'Warnings'], ['diagnostics.showAll', 'All']] as const) {
      await execute(s, id);
      expect(s.currentMode()).toBe('Write');
      expect(screen.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true');
    }
    await execute(s, 'settings.show');
    expect(screen.getByRole('region', { name: 'Reading settings' })).toBeInTheDocument();
  } finally { s.unmount(); }
});

it('executes Download copy through the palette without marking edits saved', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const s = await startScenario();
  try {
    await s.enterMode('Write');
    await s.appendToEditor('\nUnsent');
    await execute(s, 'file.downloadCopy');
    expect(click).toHaveBeenCalledOnce();
    expect(s.isDirty()).toBe(true);
    expect(s.status()).toBe('Download requested. The original file is unchanged.');
  } finally { s.unmount(); click.mockRestore(); }
});
