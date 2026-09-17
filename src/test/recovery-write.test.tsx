import { act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { DocumentBuffer } from '../core/document-buffer';
import { deferred } from './scheduler';
import * as windowClose from '../core/use-window-close';

// Control only the recovery delay; editor/user-event and other workspace timers
// retain their real scheduler. No production delay or effect is replaced.
function recoveryClock() {
  // jsdom uses browser timer handles; Node types also contribute global overloads.
  const timers = window as unknown as {
    setTimeout: (handler: TimerHandler, delay?: number, ...args: unknown[]) => number;
    clearTimeout: (id?: number) => void;
  };
  const originalSet = timers.setTimeout.bind(window);
  const originalClear = timers.clearTimeout.bind(window);
  let now = 0, next = -1;
  const pending = new Map<number, { due: number; run: () => void }>();
  const set = vi.spyOn(timers, 'setTimeout').mockImplementation((handler, delay, ...args) => {
    if (delay !== 1500) return originalSet(handler, delay, ...args);
    const id = next--;
    pending.set(id, { due: now + delay, run: () => { if (typeof handler === 'function') handler(...args); } });
    return id;
  });
  const clear = vi.spyOn(timers, 'clearTimeout').mockImplementation(id => {
    if (typeof id === 'number' && pending.delete(id)) return;
    originalClear(id);
  });
  return {
    pending,
    advance: async (ms: number) => {
      now += ms;
      await act(async () => {
        for (const [id, timer] of [...pending]) {
          if (timer.due > now) continue;
          pending.delete(id); timer.run();
        }
      });
    },
    restore: () => { set.mockRestore(); clear.mockRestore(); },
  };
}
const activeId = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;

it('gates clean documents and writes once at exactly 1500 ms after becoming dirty', async () => {
  const clock = recoveryClock();
  const s = await startScenario({ storage: { 'sensiblemd-document': '# A' } });
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    expect(clock.pending.size).toBe(0);
    await clock.advance(1500); expect(save).not.toHaveBeenCalled();
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    expect(clock.pending.size).toBe(1);
    await clock.advance(1499); expect(save).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(save).toHaveBeenCalledExactlyOnceWith({ documentId: activeId(), version: 1, source: '# A edited' });
    expect(s.isDirty()).toBe(true);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it('cancels the old timer and schedules the newer snapshot on subsequent edits', async () => {
  const clock = recoveryClock(); const s = await startScenario({ storage: { 'sensiblemd-document': '# A' } });
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' first'); await clock.advance(1000);
    await s.appendToEditor(' second'); expect(clock.pending.size).toBe(1);
    await clock.advance(500); expect(save).not.toHaveBeenCalled();
    await clock.advance(999); expect(save).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(save).toHaveBeenCalledExactlyOnceWith({ documentId: activeId(), version: 2, source: '# A first second' });
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it('writes the captured snapshot even if the live buffer advances without an effect rerender', async () => {
  const clock = recoveryClock(); const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ storage: { 'sensiblemd-document': '# A' } });
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' captured');
    // Deliberately isolate capture timing from React's normal edit rescheduling.
    const buffer = reads.mock.contexts.at(-1);
    if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected the workspace buffer');
    buffer.replace('# Later buffer version', 'programmatic');
    await clock.advance(1500);
    expect(save).toHaveBeenCalledExactlyOnceWith({ documentId: activeId(), version: 1, source: '# A captured' });
    expect(buffer.snapshot().text).toBe('# Later buffer version');
  } finally { s.unmount(); save.mockRestore(); reads.mockRestore(); clock.restore(); }
});

it('cancels A on activation of clean B and schedules B independently when dirty', async () => {
  const clock = recoveryClock(); const s = await startScenario({ storage: { 'sensiblemd-document': '# A' } });
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited'); await clock.advance(1000);
    s.desktop.addFile('/B.md', '# B'); s.desktop.openDialogResult = '/B.md'; await s.openDocument();
    expect(clock.pending.size).toBe(0);
    await clock.advance(500); expect(save).not.toHaveBeenCalled();
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    await clock.advance(1500);
    expect(save).toHaveBeenCalledExactlyOnceWith({ documentId: s.desktop.documentIdFor('/B.md'), version: 3, source: '# B edited' });
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it.each(['matching', 'different-version', 'different-document'] as const)('uses captured identity/version for discard suppression: %s', async kind => {
  const clock = recoveryClock(); const s = await startScenario({ storage: { 'sensiblemd-document': '# A' } });
  const held = deferred<void>();
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot').mockReturnValueOnce(held.promise);
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      s.desktop.closeDecisionListener?.({ id: 'discard', choice: 'discard' });
    });
    expect(clear).toHaveBeenCalledExactlyOnceWith(s.welcomeDocumentId);
    if (kind === 'different-version') await s.appendToEditor(' newer');
    if (kind === 'different-document') {
      s.desktop.addFile('/B.md', '# B'); s.desktop.openDialogResult = '/B.md'; await s.openDocument();
      await s.enterMode('Write'); await s.appendToEditor(' edited');
    }
    await clock.advance(1500);
    if (kind === 'matching') expect(save).not.toHaveBeenCalled();
    else expect(save).toHaveBeenCalledExactlyOnceWith({
      documentId: activeId(), version: kind === 'different-version' ? 2 : 3,
      source: kind === 'different-version' ? '# A edited newer' : '# B edited',
    });
  } finally { s.unmount(); clear.mockRestore(); save.mockRestore(); clock.restore(); }
});

it('reports write failure without changing dirty state, recovery notice, or normal save tracking', async () => {
  const clock = recoveryClock(); const desktop = new FakeDesktop();
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': '# A' } });
  const held = deferred<{ version: number }>();
  const save = vi.spyOn(desktop.api, 'saveRecoverySnapshot').mockReturnValueOnce(held.promise);
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited'); await clock.advance(1500);
    // A held recovery write must not be treated as a normal save by window close.
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      desktop.closeDecisionListener?.({ id: 'discard', choice: 'discard' });
    });
    expect(desktop.closeResults.at(-1)).toEqual({ id: 'discard', allow: true });
    await act(async () => held.reject(new Error('recovery write failed')));
    expect(s.status()).toBe('Recovery snapshot could not be saved. Your document remains open.');
    expect(s.isDirty()).toBe(true);
    expect(s.editorSource()).toBe('# A edited');
    expect(document.querySelector('.recovery-notice')).toBeNull();
    expect(desktop.writes).toHaveLength(0);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it('StrictMode cancels on unmount and remount schedules only after becoming dirty', async () => {
  const clock = recoveryClock();
  const first = await startScenario({ strictMode: true, storage: { 'sensiblemd-document': '# A' } });
  await first.enterMode('Write'); await first.appendToEditor(' old');
  expect(clock.pending.size).toBe(1);
  first.unmount(); expect(clock.pending.size).toBe(0);
  const s = await startScenario({ strictMode: true, storage: { 'sensiblemd-document': '# B' } });
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    await clock.advance(1500); expect(save).not.toHaveBeenCalled();
    await s.enterMode('Write'); await s.appendToEditor(' new');
    expect(clock.pending.size).toBe(1);
    await clock.advance(1500); expect(save).toHaveBeenCalledTimes(1);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it('does not suppress for a different discard document even when its version matches', async () => {
  const clock = recoveryClock();
  const close = vi.spyOn(windowClose, 'useWindowClose');
  const s = await startScenario({ storage: { 'sensiblemd-document': '# A' } });
  const held = deferred<void>();
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot').mockReturnValueOnce(held.promise);
  const save = vi.spyOn(s.desktop.api, 'saveRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    // Isolate the ID half of the suppression predicate through the existing
    // workspace discard consumer; ordinary switches also advance buffer version.
    await act(async () => {
      void close.mock.calls.at(-1)![0].discard({ documentId: 'another-document', version: 1, isDirty: true });
    });
    expect(clear).toHaveBeenCalledExactlyOnceWith('another-document');
    await clock.advance(1500);
    expect(save).toHaveBeenCalledExactlyOnceWith({ documentId: activeId(), version: 1, source: '# A edited' });
  } finally { s.unmount(); clear.mockRestore(); save.mockRestore(); close.mockRestore(); clock.restore(); }
});

it('a failed write preserves an already-visible recovery notice and dirty source', async () => {
  const clock = recoveryClock(); const desktop = new FakeDesktop().addFile('/A.md', '# A');
  const id = desktop.documentIdFor('/A.md');
  desktop.recoveryLatest.set(id, { documentId: id, source: '# Recovered A', version: 1, savedAt: '2026-01-02T03:04:05Z' });
  const s = await startScenario({ desktop, home: true });
  const save = vi.spyOn(desktop.api, 'saveRecoverySnapshot').mockRejectedValue(new Error('write failed'));
  try {
    desktop.openDialogResult = '/A.md'; await s.openDocument();
    const originalNotice = document.querySelector('.recovery-notice'); expect(originalNotice).not.toBeNull();
    await s.enterMode('Write'); await s.appendToEditor(' edited'); await clock.advance(1500);
    expect(s.status()).toBe('Recovery snapshot could not be saved. Your document remains open.');
    expect(document.querySelector('.recovery-notice')).toBe(originalNotice);
    expect(s.isDirty()).toBe(true); expect(s.editorSource()).toBe('# A edited');
    expect(desktop.writes).toHaveLength(0);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});
