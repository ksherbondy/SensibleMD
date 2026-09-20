import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import { WELCOME_DOCUMENT_ID } from '../core/identity';
import { FakeDesktop } from './electron-double';
import { startScenario } from './scenario';
import { deferred } from './scheduler';

const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;
const session = () => document.querySelector('.app-shell')!.getAttribute('data-session-id');
async function setup(strictMode = false) {
  const desktop = new FakeDesktop();
  desktop.recoveryLatest.set(WELCOME_DOCUMENT_ID, { documentId: WELCOME_DOCUMENT_ID, version: 1, source: '# Recovery', savedAt: '2026-01-02T03:04:05Z' });
  const read = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ desktop, strictMode, storage: { 'sensiblemd-document': '# A', 'sensiblemd-name': 'A.md' } });
  const buffer = read.mock.contexts.at(-1); read.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  desktop.saveAsDialogResult = '/New.md';
  return { s, buffer, desktop };
}

it.each([[false, false], [true, false], [false, true], [true, true]])('valid Save As preserves capture, adoption and cleanup tracking (StrictMode %s, newer edits %s)', async (strictMode, newer) => {
  const { s, buffer, desktop } = await setup(strictMode);
  const operation = deferred<void>(), cleanup = deferred<void>();
  const originalSave = desktop.api.saveDocumentAs, originalClear = desktop.api.clearRecoverySnapshot;
  const saveAs = vi.spyOn(desktop.api, 'saveDocumentAs').mockImplementationOnce(async payload => { await operation.promise; return originalSave(payload); });
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot').mockImplementationOnce(async documentId => { await cleanup.promise; return originalClear(documentId); });
  const recents = vi.spyOn(desktop.api, 'listRecentDocuments');
  const mark = vi.spyOn(buffer, 'markSaved');
  try {
    const oldId = id(), baseline = buffer.snapshot();
    expect(document.querySelector('.recovery-notice')).not.toBeNull();
    await s.enterMode('Write'); await s.save();
    expect(saveAs).toHaveBeenCalledExactlyOnceWith({ name: 'A.md', source: '# A' });
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(s.status()).toBe('A save is still in progress. Close the document when it finishes.');
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      desktop.closeDecisionListener?.({ id: 'save-close', choice: 'save' });
    });
    expect(desktop.closeResults).toHaveLength(0);
    if (newer) await s.appendToEditor(' newer');
    await act(async () => operation.resolve());
    const newId = desktop.documentIdFor('/New.md');
    expect(id()).toBe(newId); expect(session()).toBe(desktop.sessions.at(-1)!.sessionId);
    expect(s.documentName()).toBe('New.md');
    expect(s.chapterNames()).toEqual([]); // Single-document collections hide the chapter list.
    expect(desktop.diskContents('/New.md')).toBe('# A');
    expect(s.editorSource()).toBe(newer ? '# A newer' : '# A');
    expect(s.isDirty()).toBe(newer);
    expect(mark).toHaveBeenCalledTimes(newer ? 0 : 1);
    expect(buffer.snapshot().savedVersion).toBe(newer ? baseline.savedVersion : buffer.snapshot().version);
    expect(s.status()).toBe(newer ? 'Saved the earlier version. Newer changes remain open.' : 'Saved.');
    expect(document.querySelector('.recovery-notice')).toBeNull();
    expect(recents).toHaveBeenCalledTimes(1); expect(desktop.recents[0]).toBe('/New.md');
    expect(clear).toHaveBeenCalledExactlyOnceWith(oldId);
    expect(desktop.recoveryLatest.has(oldId)).toBe(true); // Cleanup is held.
    expect(desktop.closeResults).toHaveLength(0);
    if (!newer) {
      await s.user.click(screen.getByRole('button', { name: 'Close document' }));
      expect(s.status()).toBe('A save is still in progress. Close the document when it finishes.');
    }
    await act(async () => cleanup.resolve());
    expect(desktop.recoveryLatest.has(oldId)).toBe(false);
    expect(desktop.closeResults).toEqual([{ id: 'save-close', allow: !newer }]);
    expect(saveAs).toHaveBeenCalledTimes(1);
    if (newer) {
      await act(async () => { await new Promise(resolve => setTimeout(resolve, 1600)); });
      expect(desktop.recoveryLatest.get(newId)?.source).toBe('# A newer');
    }
    await s.appendToEditor(' next'); await s.save();
    expect(saveAs).toHaveBeenCalledTimes(1); // Adopted capability uses direct Save.
    expect(desktop.diskContents('/New.md')).toBe(newer ? '# A newer next' : '# A next');
  } finally { s.unmount(); saveAs.mockRestore(); clear.mockRestore(); recents.mockRestore(); mark.mockRestore(); }
});

it.each(['cancel', 'fail'] as const)('%s preserves complete renderer state, notice and saved baseline, and settles tracking', async outcome => {
  const { s, buffer, desktop } = await setup();
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  const recents = vi.spyOn(desktop.api, 'listRecentDocuments');
  const saveAs = vi.spyOn(desktop.api, 'saveDocumentAs');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' unsaved');
    const before = { id: id(), session: session(), name: s.documentName(), chapters: s.chapterNames(), snapshot: buffer.snapshot(), dirty: s.isDirty(), status: s.status() };
    const notice = document.querySelector('.recovery-notice'); expect(notice).not.toBeNull();
    if (outcome === 'cancel') desktop.saveAsDialogResult = null; else desktop.failures.saveAs = true;
    await s.save();
    expect({ id: id(), session: session(), name: s.documentName(), chapters: s.chapterNames(), snapshot: buffer.snapshot(), dirty: s.isDirty() })
      .toEqual({ id: before.id, session: before.session, name: before.name, chapters: before.chapters, snapshot: before.snapshot, dirty: before.dirty });
    expect(s.status()).toBe(outcome === 'cancel' ? before.status : 'The file could not be saved. Your edits are still open.');
    expect(document.querySelector('.recovery-notice')).toBe(notice);
    expect(clear).not.toHaveBeenCalled(); expect(recents).not.toHaveBeenCalled();
    expect(desktop.recoveryLatest.has(before.id)).toBe(true);
    desktop.saveAsDialogResult = '/New.md'; desktop.failures.saveAs = false;
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      desktop.closeDecisionListener?.({ id: 'retry', choice: 'save' });
    });
    await s.settle();
    expect(saveAs).toHaveBeenCalledTimes(2);
    expect(desktop.closeResults).toEqual([{ id: 'retry', allow: true }]);
  } finally { s.unmount(); clear.mockRestore(); recents.mockRestore(); saveAs.mockRestore(); }
});

it('returned-ID collision keeps the saved entry with live source, removes the prior target entry, and preserves unrelated C', async () => {
  const s = await startScenario();
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [new File(['# A'], 'A.md'), new File(['# B'], 'B.md'), new File(['# C'], 'C.md')]); await s.settle();
    await s.switchChapter('B.md'); s.desktop.saveAsDialogResult = '/Target.md'; await s.save();
    const targetId = id();
    await s.switchChapter('A.md'); await s.enterMode('Write'); await s.appendToEditor(' live A');
    s.desktop.saveAsDialogResult = '/Target.md';
    const operation = deferred<void>(); const native = s.desktop.api.saveDocumentAs;
    const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockImplementationOnce(async payload => { await operation.promise; return native(payload); });
    await s.save(); await s.appendToEditor(' newer');
    await act(async () => operation.resolve()); saveAs.mockRestore();
    expect(id()).toBe(targetId); expect(s.documentName()).toBe('Target.md');
    expect(s.chapterNames()).toEqual(['Target.md', 'C.md']);
    expect(s.editorSource()).toBe('# A live A newer');
    expect(s.isDirty()).toBe(true);
    expect(s.desktop.diskContents('/Target.md')).toBe('# A live A');
    await s.switchChapter('C.md'); expect(localStorage.getItem('sensiblemd-document')).toBe('# C');
    await s.switchChapter('Target.md'); expect(localStorage.getItem('sensiblemd-document')).toBe('# A live A newer');
  } finally { s.unmount(); }
});

it.each([{ metaKey: true }, { ctrlKey: true }])('keyboard Save As uses the latest committed name/source (%j)', async modifiers => {
  const { s, desktop } = await setup();
  const saveAs = vi.spyOn(desktop.api, 'saveDocumentAs');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' latest');
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ...modifiers, bubbles: true, cancelable: true })));
    expect(saveAs).toHaveBeenCalledExactlyOnceWith({ name: 'A.md', source: '# A latest' });
    expect(s.status()).toBe('Saved.'); expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); saveAs.mockRestore(); }
});

it('a native close begun after Save As adoption still waits for held recovery cleanup', async () => {
  const { s, desktop } = await setup();
  const cleanup = deferred<void>();
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot').mockReturnValueOnce(cleanup.promise);
  const saveAs = vi.spyOn(desktop.api, 'saveDocumentAs');
  try {
    await s.save();
    expect(id()).toBe(desktop.documentIdFor('/New.md')); expect(s.isDirty()).toBe(false);
    expect(clear).toHaveBeenCalledExactlyOnceWith(WELCOME_DOCUMENT_ID);
    await act(async () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event); expect(event.defaultPrevented).toBe(true);
      desktop.closeDecisionListener?.({ id: 'cleanup-close', choice: 'save' });
    });
    expect(desktop.closeResults).toHaveLength(0); expect(saveAs).toHaveBeenCalledTimes(1);
    await act(async () => cleanup.resolve());
    expect(desktop.closeResults).toEqual([{ id: 'cleanup-close', allow: true }]);
    expect(saveAs).toHaveBeenCalledTimes(1);
  } finally { s.unmount(); clear.mockRestore(); saveAs.mockRestore(); }
});
