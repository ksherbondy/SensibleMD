import { act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import { startScenario } from './scenario';
import { deferred } from './scheduler';

const activeId = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;
const activeSession = () => document.querySelector('.app-shell')!.getAttribute('data-session-id');
const response = { documentId: 'doc-saved-a', sessionId: 'session-saved-a', name: 'SavedA.md', source: '# A' };
async function collection() {
  const s = await startScenario();
  const files = [new File(['# A'], 'A.md'), new File(['# B'], 'B.md')];
  await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files); await s.settle();
  return { s, files };
}

it.each([false, true])('A→B→A does not restore old Save As authority (newer A edits: %s)', async edited => {
  const { s } = await collection(); const a = activeId();
  const completion = deferred<SensibleOpenedDocument | null>();
  const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(completion.promise);
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot');
  const recents = vi.spyOn(s.desktop.api, 'listRecentDocuments');
  try {
    await s.save();
    if (edited) { await s.enterMode('Write'); await s.appendToEditor(' unsaved A'); }
    const aSource = edited ? '# A unsaved A' : '# A';
    await s.desktop.api.saveRecoverySnapshot({ documentId: a, version: 2, source: aSource });
    await s.switchChapter('B.md'); await s.enterMode('Write'); await s.appendToEditor(' unrelated B');
    await s.switchChapter('A.md');
    const status = s.status(), dirty = s.isDirty(), session = activeSession();
    recents.mockClear();
    await act(async () => completion.resolve(response));
    expect(activeId()).toBe(a); expect(activeSession()).toBe(session);
    expect(s.documentName()).toBe('A.md'); expect(s.chapterNames()).toEqual(['A.md', 'B.md']);
    expect(localStorage.getItem('sensiblemd-document')).toBe(aSource);
    expect(s.isDirty()).toBe(dirty); expect(s.status()).toBe(status);
    expect(clear).not.toHaveBeenCalled(); expect(recents).not.toHaveBeenCalled();
    expect(s.desktop.recoveryLatest.get(a)?.source).toBe(aSource);
  } finally { s.unmount(); saveAs.mockRestore(); clear.mockRestore(); recents.mockRestore(); }
});

it('stale completion preserves B recovery, source, saved baseline and Save As capability', async () => {
  const read = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const { s } = await collection(); const a = activeId();
  await s.switchChapter('B.md'); const b = activeId(); await s.switchChapter('A.md');
  const completion = deferred<SensibleOpenedDocument | null>();
  const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(completion.promise);
  const direct = vi.spyOn(s.desktop.api, 'saveOpenedDocument');
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot');
  try {
    await s.save(); await s.enterMode('Write'); await s.appendToEditor(' unsaved A');
    await s.desktop.api.saveRecoverySnapshot({ documentId: a, version: 2, source: '# A unsaved A' });
    await s.desktop.api.saveRecoverySnapshot({ documentId: b, version: 1, source: '# B recovery' });
    await s.switchChapter('B.md'); await s.enterMode('Write'); await s.appendToEditor(' newer B');
    const buffer = read.mock.contexts.at(-1);
    if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected buffer');
    const before = buffer.snapshot(); const session = activeSession(), status = s.status();
    const notice = document.querySelector('.recovery-notice'); expect(notice).not.toBeNull();
    await act(async () => completion.resolve(response));
    expect(activeId()).toBe(b); expect(activeSession()).toBe(session); expect(s.documentName()).toBe('B.md');
    expect(buffer.snapshot()).toEqual(before); expect(s.editorSource()).toBe('# B newer B'); expect(s.isDirty()).toBe(true);
    expect(document.querySelector('.recovery-notice')).toBe(notice); expect(s.status()).toBe(status);
    expect(clear).not.toHaveBeenCalled(); expect(s.desktop.recoveryLatest.get(a)?.source).toBe('# A unsaved A');
    await s.save(); // Browser B must still use Save As; default dialog cancellation.
    expect(saveAs).toHaveBeenCalledTimes(2); expect(direct).not.toHaveBeenCalled();
    await s.switchChapter('A.md');
    expect(localStorage.getItem('sensiblemd-document')).toBe('# A unsaved A');
  } finally { s.unmount(); read.mockRestore(); saveAs.mockRestore(); direct.mockRestore(); clear.mockRestore(); }
});

it.each([false, true])('unmounted Save As cannot mutate or clean recovery in a remounted workspace (StrictMode: %s)', async strictMode => {
  const first = await startScenario({ strictMode, storage: { 'sensiblemd-document': '# A', 'sensiblemd-name': 'A.md' } });
  const desktop = first.desktop;
  const completion = deferred<SensibleOpenedDocument | null>();
  const saveAs = vi.spyOn(desktop.api, 'saveDocumentAs').mockReturnValueOnce(completion.promise);
  await first.save(); first.unmount();
  const s = await startScenario({ desktop, strictMode, storage: { 'sensiblemd-document': '# New workspace', 'sensiblemd-name': 'New.md' } });
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  const recents = vi.spyOn(desktop.api, 'listRecentDocuments');
  try {
    const id = activeId(), session = activeSession(), status = s.status();
    await desktop.api.saveRecoverySnapshot({ documentId: id, version: 3, source: '# New workspace recovery' });
    await act(async () => completion.resolve(response));
    expect(activeId()).toBe(id); expect(activeSession()).toBe(session); expect(s.documentName()).toBe('New.md');
    expect(localStorage.getItem('sensiblemd-document')).toBe('# New workspace'); expect(s.status()).toBe(status);
    expect(clear).not.toHaveBeenCalled(); expect(recents).not.toHaveBeenCalled();
    expect(desktop.recoveryLatest.get(id)?.source).toBe('# New workspace recovery');
  } finally { s.unmount(); saveAs.mockRestore(); clear.mockRestore(); recents.mockRestore(); }
});

it('reopening an identical collection establishes a new lifetime even when its active ID is unchanged', async () => {
  const { s, files } = await collection(); const a = activeId();
  const completion = deferred<SensibleOpenedDocument | null>();
  const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(completion.promise);
  try {
    await s.save();
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files); await s.settle();
    expect(activeId()).toBe(a);
    await act(async () => completion.resolve(response));
    expect(activeId()).toBe(a); expect(s.documentName()).toBe('A.md'); expect(s.chapterNames()).toEqual(['A.md', 'B.md']);
  } finally { s.unmount(); saveAs.mockRestore(); }
});

it('a stale Save As rejection does not replace the current document status', async () => {
  const { s } = await collection(); const completion = deferred<SensibleOpenedDocument | null>();
  const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(completion.promise);
  try {
    await s.save(); await s.switchChapter('B.md'); const status = s.status();
    await act(async () => completion.reject(new Error('Old Save As failure')));
    expect(s.status()).toBe(status); expect(s.documentName()).toBe('B.md');
  } finally { s.unmount(); saveAs.mockRestore(); }
});
