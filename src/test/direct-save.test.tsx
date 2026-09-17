import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import { startScenario } from './scenario';
import { deferred } from './scheduler';

async function setup() {
  const read = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario();
  s.desktop.addFile('/A.md', '# A').addFile('/B.md', '# B');
  s.desktop.openDialogResult = '/A.md'; await s.openDocument();
  await s.enterMode('Write'); await s.appendToEditor(' edited');
  const buffer = read.mock.contexts.at(-1);
  read.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  return { s, buffer, id: s.desktop.documentIdFor('/A.md') };
}
const closeWindow = async (s: Awaited<ReturnType<typeof startScenario>>) => {
  await act(async () => {
    window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
    s.desktop.closeDecisionListener?.({ id: 'save-close', choice: 'save' });
  });
};

it('marks clean after disk resolution and keeps tracking through recovery cleanup', async () => {
  const { s, buffer, id } = await setup();
  const disk = deferred<{ name: string }>(), cleanup = deferred<void>();
  const save = vi.spyOn(s.desktop.api, 'saveOpenedDocument').mockReturnValueOnce(disk.promise);
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot').mockImplementationOnce(documentId => {
    expect(documentId).toBe(id);
    expect(buffer.snapshot().isDirty).toBe(false);
    // React state updates are queued; the buffer commit precedes this call.
    return cleanup.promise;
  });
  const mark = vi.spyOn(buffer, 'markSaved');
  try {
    await s.save();
    expect(save).toHaveBeenCalledExactlyOnceWith({ source: '# A edited' });
    expect(mark).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled();
    await act(async () => disk.resolve({ name: 'A.md' }));
    expect(mark).toHaveBeenCalledTimes(1); expect(s.isDirty()).toBe(false);
    expect(s.status()).toBe('Saved.'); expect(clear).toHaveBeenCalledExactlyOnceWith(id);
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(s.status()).toBe('A save is still in progress. Close the document when it finishes.');
    await closeWindow(s);
    expect(s.desktop.closeResults).toHaveLength(0);
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => cleanup.resolve());
    expect(s.desktop.closeResults).toEqual([{ id: 'save-close', allow: true }]);
  } finally { s.unmount(); save.mockRestore(); clear.mockRestore(); mark.mockRestore(); }
});

it('retains the newer buffer and recovery when disk completes for the earlier version', async () => {
  const { s, buffer, id } = await setup();
  const savedVersion = buffer.snapshot().savedVersion;
  const mark = vi.spyOn(buffer, 'markSaved');
  try {
    await s.desktop.api.saveRecoverySnapshot({ documentId: id, version: buffer.snapshot().version, source: s.editorSource() });
    s.scheduler.useManualOrder(); await s.save(); await s.appendToEditor(' newer');
    await act(async () => s.scheduler.release('document:save-opened'));
    expect(s.desktop.diskContents('/A.md')).toBe('# A edited');
    expect(s.editorSource()).toBe('# A edited newer'); expect(s.isDirty()).toBe(true);
    expect(mark).not.toHaveBeenCalled(); expect(buffer.snapshot().savedVersion).toBe(savedVersion);
    expect(s.status()).toBe('Saved the earlier version. Newer changes remain open.');
    expect(s.desktop.recoveryRequests.filter(r => r.operation === 'clear')).toEqual([]);
    expect(s.desktop.recoveryLatest.has(id)).toBe(true);
  } finally { s.unmount(); mark.mockRestore(); }
});

it('failure preserves saved baseline and recovery and settles tracking for a subsequent save', async () => {
  const { s, buffer, id } = await setup();
  const savedVersion = buffer.snapshot().savedVersion;
  const mark = vi.spyOn(buffer, 'markSaved');
  try {
    await s.desktop.api.saveRecoverySnapshot({ documentId: id, version: buffer.snapshot().version, source: s.editorSource() });
    s.desktop.failures.save = true; await s.save();
    expect(s.status()).toBe('The file could not be saved. Your edits are still open.');
    expect(s.editorSource()).toBe('# A edited'); expect(s.isDirty()).toBe(true);
    expect(buffer.snapshot().savedVersion).toBe(savedVersion); expect(mark).not.toHaveBeenCalled();
    expect(s.desktop.recoveryLatest.has(id)).toBe(true);
    expect(s.desktop.recoveryRequests.filter(r => r.operation === 'clear')).toEqual([]);
    s.desktop.failures.save = false;
    await closeWindow(s); await s.settle();
    expect(s.desktop.closeResults).toEqual([{ id: 'save-close', allow: true }]);
    expect(s.desktop.diskContents('/A.md')).toBe('# A edited');
  } finally { s.unmount(); mark.mockRestore(); }
});

it('an older A disk completion cannot mark newly active edited B clean', async () => {
  const { s, buffer } = await setup();
  const disk = deferred<{ name: string }>();
  // Hold only renderer completion; FakeDesktop otherwise resolves authorization
  // at release time, which is not the native invocation-bound capability contract.
  const save = vi.spyOn(s.desktop.api, 'saveOpenedDocument').mockReturnValueOnce(disk.promise);
  const mark = vi.spyOn(buffer, 'markSaved');
  try {
    await s.save();
    s.desktop.openDialogResult = '/B.md'; await s.openDocument();
    await s.enterMode('Write'); await s.appendToEditor(' newer'); mark.mockClear();
    const savedVersion = buffer.snapshot().savedVersion;
    await act(async () => disk.resolve({ name: 'A.md' }));
    expect(s.editorSource()).toBe('# B newer'); expect(s.isDirty()).toBe(true);
    expect(mark).not.toHaveBeenCalled(); expect(buffer.snapshot().savedVersion).toBe(savedVersion);
    expect(s.status()).toBe('Saved the earlier version. Newer changes remain open.');
    expect(s.desktop.recoveryRequests.filter(r => r.operation === 'clear')).toEqual([]);
  } finally { s.unmount(); save.mockRestore(); mark.mockRestore(); }
});

it('held cleanup retains invocation A identity after activation of B', async () => {
  const { s, id } = await setup(); const cleanup = deferred<void>();
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot').mockReturnValueOnce(cleanup.promise);
  try {
    await s.save(); expect(clear).toHaveBeenCalledExactlyOnceWith(id);
    s.desktop.openDialogResult = '/B.md'; await s.openDocument();
    await s.enterMode('Write'); await s.appendToEditor(' newer');
    await act(async () => cleanup.resolve());
    expect(clear).toHaveBeenCalledExactlyOnceWith(id);
    expect(s.editorSource()).toBe('# B newer'); expect(s.isDirty()).toBe(true);
  } finally { s.unmount(); clear.mockRestore(); }
});

it('preserves overlapping saves and their existing out-of-order completion behavior', async () => {
  const { s, id } = await setup();
  const save = vi.spyOn(s.desktop.api, 'saveOpenedDocument');
  try {
    s.scheduler.useManualOrder(); await s.save();
    await s.appendToEditor(' newer'); await s.save();
    expect(save.mock.calls).toEqual([[{ source: '# A edited' }], [{ source: '# A edited newer' }]]);
    expect(s.scheduler.pending('document:save-opened')).toHaveLength(2);
    await act(async () => s.scheduler.releaseLatest('document:save-opened'));
    await act(async () => s.scheduler.release('recovery:clear'));
    expect(s.isDirty()).toBe(false); expect(s.status()).toBe('Saved.');
    await act(async () => s.scheduler.release('document:save-opened'));
    expect(s.editorSource()).toBe('# A edited newer'); expect(s.isDirty()).toBe(false);
    expect(s.status()).toBe('Saved the earlier version. Newer changes remain open.');
    expect(s.desktop.writes.map(w => w.source)).toEqual(['# A edited newer', '# A edited']);
    expect(s.desktop.recoveryRequests.filter(r => r.operation === 'clear')).toEqual([{ operation: 'clear', documentId: id }]);
  } finally { s.unmount(); save.mockRestore(); }
});

it('keeps render source separate from invocation version and live completion version', async () => {
  const { s, buffer, id } = await setup();
  const disk = deferred<{ name: string }>();
  const save = vi.spyOn(s.desktop.api, 'saveOpenedDocument').mockReturnValueOnce(disk.promise);
  const mark = vi.spyOn(buffer, 'markSaved');
  try {
    // Isolate the accepted mixed capture points without a React source update.
    buffer.replace('# Buffer-only advancement', 'programmatic');
    const invocationVersion = buffer.snapshot().version;
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true })));
    expect(save).toHaveBeenCalledExactlyOnceWith({ source: '# A edited' });
    await act(async () => disk.resolve({ name: 'A.md' }));
    expect(mark).toHaveBeenCalledTimes(1);
    expect(buffer.snapshot().savedVersion).toBe(invocationVersion);
    expect(s.status()).toBe('Saved.');
    expect(s.desktop.recoveryRequests.filter(r => r.operation === 'clear')).toEqual([{ operation: 'clear', documentId: id }]);
  } finally { s.unmount(); save.mockRestore(); mark.mockRestore(); }
});
