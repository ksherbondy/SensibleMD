import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';

type Snapshot = Awaited<ReturnType<NonNullable<Window['sensibleMD']>['loadRecoverySnapshot']>>;
const snapshot = (documentId: string, source: string): Snapshot => ({ documentId, source, version: 1, savedAt: '2026-01-02T03:04:05Z' });
const notice = () => document.querySelector('.recovery-notice');
const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;

it('does not retain A recovery notice after activating B without recovery', async () => {
  const desktop = new FakeDesktop().addFile('/A.md', '# Disk A').addFile('/B.md', '# Disk B');
  const a = desktop.documentIdFor('/A.md');
  desktop.recoveryLatest.set(a, snapshot(a, '# Recovered A')!);
  const s = await startScenario({ desktop, home: true });
  try {
    desktop.openDialogResult = '/A.md'; await s.openDocument();
    expect(notice()).not.toBeNull();
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    expect(id()).toBe(desktop.documentIdFor('/B.md'));
    expect(localStorage.getItem('sensiblemd-document')).toBe('# Disk B');
    expect(notice()).toBeNull();
  } finally { s.unmount(); }
});

it('removes A notice while B loads and permits only the valid B recovery to be restored', async () => {
  const desktop = new FakeDesktop().addFile('/A.md', '# Disk A').addFile('/B.md', '# Disk B');
  const a = desktop.documentIdFor('/A.md');
  const b = desktop.documentIdFor('/B.md');
  desktop.recoveryLatest.set(a, snapshot(a, '# Recovered A')!);
  const s = await startScenario({ desktop, home: true });
  const held = deferred<Snapshot>();
  try {
    desktop.openDialogResult = '/A.md'; await s.openDocument();
    expect(notice()).not.toBeNull();
    const load = vi.spyOn(desktop.api, 'loadRecoverySnapshot').mockReturnValueOnce(held.promise);
    try {
      desktop.openDialogResult = '/B.md'; await s.openDocument();
      expect(load).toHaveBeenCalledExactlyOnceWith(b);
      expect(notice()).toBeNull();
      await act(async () => held.resolve(snapshot(b, '# Recovered B')));
      expect(notice()).not.toBeNull();
      await s.restoreRecovery();
      expect(id()).toBe(b);
      expect(localStorage.getItem('sensiblemd-document')).toBe('# Recovered B');
      expect(s.isDirty()).toBe(true);
      expect(notice()).toBeNull();
    } finally { load.mockRestore(); }
  } finally { s.unmount(); }
});

it.each([false, true])('compares recovery with live buffer text at completion (edit during load: %s)', async edit => {
  const desktop = new FakeDesktop();
  const held = deferred<Snapshot>();
  const load = vi.spyOn(desktop.api, 'loadRecoverySnapshot').mockReturnValueOnce(held.promise);
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': '# Original' } });
  try {
    expect(load).toHaveBeenCalledWith(s.welcomeDocumentId);
    if (edit) { await s.enterMode('Write'); await s.setEditorSource('# Live edit'); }
    await act(async () => held.resolve(snapshot(id(), edit ? '# Live edit' : '# Original')));
    expect(notice()).toBeNull();
    expect(localStorage.getItem('sensiblemd-document')).toBe(edit ? '# Live edit' : '# Original');
  } finally { s.unmount(); load.mockRestore(); }
});

it('invalidates a held load when successful save clears recovery for the captured document', async () => {
  const desktop = new FakeDesktop().addFile('/A.md', '# A');
  desktop.openDialogResult = '/A.md';
  const held = deferred<Snapshot>();
  const load = vi.spyOn(desktop.api, 'loadRecoverySnapshot').mockReturnValueOnce(held.promise);
  const s = await startScenario({ desktop, home: true });
  try {
    await s.openDocument();
    const capturedId = id();
    await s.enterMode('Write'); await s.appendToEditor(' edited'); await s.save();
    expect(desktop.recoveryRequests.filter(r => r.operation === 'clear')).toEqual([{ operation: 'clear', documentId: capturedId }]);
    await act(async () => held.resolve(snapshot(capturedId, '# Obsolete recovery')));
    expect(notice()).toBeNull();
    expect(s.editorSource()).toBe('# A edited');
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); load.mockRestore(); }
});

it('rejects obsolete A loads after A→B→A within one workspace context lifetime', async () => {
  const s = await startScenario();
  const oldA = deferred<Snapshot>();
  const newA = deferred<Snapshot>();
  const load = vi.spyOn(s.desktop.api, 'loadRecoverySnapshot')
    .mockReturnValueOnce(oldA.promise).mockResolvedValueOnce(null).mockReturnValueOnce(newA.promise);
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [new File(['# A'], 'A.md'), new File(['# B'], 'B.md')]);
    await s.settle(); const a = id();
    await s.switchChapter('B.md'); const b = id();
    expect(notice()).toBeNull();
    await s.switchChapter('A.md');
    expect(load.mock.calls.map(call => call[0])).toEqual([a, b, a]);
    await act(async () => newA.resolve(snapshot(a, '# Current A recovery')));
    expect(notice()).not.toBeNull();
    await act(async () => oldA.resolve(snapshot(a, '# Obsolete A recovery')));
    await s.restoreRecovery();
    expect(localStorage.getItem('sensiblemd-document')).toBe('# Current A recovery');
  } finally { s.unmount(); load.mockRestore(); }
});

it('Save As cleanup of the old ID cannot clear the new active document notice', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# Original' } });
  const heldClear = deferred<void>();
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot').mockReturnValueOnce(heldClear.promise);
  try {
    const oldId = id(); const newId = s.desktop.documentIdFor('/New.md');
    s.desktop.recoveryLatest.set(newId, snapshot(newId, '# New recovery')!);
    s.desktop.saveAsDialogResult = '/New.md';
    await s.save();
    expect(id()).toBe(newId);
    expect(clear).toHaveBeenCalledExactlyOnceWith(oldId);
    expect(notice()).not.toBeNull();
    await act(async () => heldClear.resolve());
    expect(notice()).not.toBeNull();
    await s.restoreRecovery();
    expect(localStorage.getItem('sensiblemd-document')).toBe('# New recovery');
  } finally { s.unmount(); clear.mockRestore(); }
});

it('StrictMode cleanup/remount and a switch reject held loads from obsolete lifetimes', async () => {
  const desktop = new FakeDesktop().addFile('/B.md', '# B');
  const loads: ReturnType<typeof deferred<Snapshot>>[] = [];
  const load = vi.spyOn(desktop.api, 'loadRecoverySnapshot').mockImplementation(() => {
    const held = deferred<Snapshot>(); loads.push(held); return held.promise;
  });
  const first = await startScenario({ desktop, strictMode: true });
  expect(loads).toHaveLength(2); // StrictMode setup, cleanup, setup.
  first.unmount();
  const s = await startScenario({ desktop, strictMode: true });
  try {
    expect(loads).toHaveLength(4);
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    expect(loads).toHaveLength(5); // Native activation updates this mounted workspace.
    const b = id();
    await act(async () => loads[4].resolve(snapshot(b, '# Current B recovery')));
    for (const held of loads.slice(0, 4)) {
      await act(async () => held.resolve(snapshot(s.welcomeDocumentId, '# Obsolete recovery')));
    }
    expect(screen.getAllByRole('button', { name: 'Restore changes' })).toHaveLength(1);
    await s.restoreRecovery();
    expect(localStorage.getItem('sensiblemd-document')).toBe('# Current B recovery');
    expect(notice()).toBeNull();
    await s.settle(); expect(notice()).toBeNull();
  } finally { s.unmount(); load.mockRestore(); }
});
