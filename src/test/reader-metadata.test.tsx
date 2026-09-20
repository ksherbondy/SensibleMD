import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';
import { parseSemanticDocument } from '../core/semantic-document';
import { createReaderStatePayload } from '../core/reader-state-payload';

// Selectively control the existing metadata delay; all other timers stay real.
function metadataClock() {
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
    if (delay !== 500) return originalSet(handler, delay, ...args);
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

it.each([false, true])('does not persist reader metadata before hydration is ready (StrictMode=%s)', async strictMode => {
  const clock = metadataClock();
  const desktop = new FakeDesktop();
  const hydration = deferred<SensibleDocumentState | null>();
  const load = vi.spyOn(desktop.api, 'loadDocumentState').mockReturnValue(hydration.promise);
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, strictMode, storage: { 'sensiblemd-document': '# Waiting for reader state' } });
  try {
    expect(load).toHaveBeenCalled();
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(s.status()).toBe('Reader state is still loading. Try closing again when it finishes.');
    await clock.advance(499);
    expect(save).not.toHaveBeenCalled();
    await clock.advance(1);
    // Required Step 16 gate: no metadata may overwrite stored state while its
    // hydration is held. The original production dispatched one write here.
    expect(save).not.toHaveBeenCalled();
    await clock.advance(5000);
    expect(save).not.toHaveBeenCalled();
  } finally {
    s.unmount();
    await act(async () => hydration.resolve(null));
    load.mockRestore(); save.mockRestore(); clock.restore();
  }
});

const source = '# First\n\nFirst paragraph.\n\n## Second\n\nSecond paragraph.';
const model = parseSemanticDocument(source, 0);
const second = model.headings[1].id;
const loadedState = (documentId: string): SensibleDocumentState => ({
  schemaVersion: 1, documentId, bookmarks: [second], activeHeading: second,
  fontScale: 125, lineHeight: 2.1, contentWidth: 900, reducedMotion: true,
});

it.each([false, true])('starts one 500 ms debounce with hydrated values after held hydration (StrictMode=%s)', async strictMode => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const hydration = deferred<SensibleDocumentState | null>();
  const load = vi.spyOn(desktop.api, 'loadDocumentState').mockReturnValue(hydration.promise);
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, strictMode, storage: { 'sensiblemd-document': source } });
  try {
    await clock.advance(2000);
    expect(save).not.toHaveBeenCalled();
    const state = loadedState(s.welcomeDocumentId);
    await act(async () => hydration.resolve(state));
    await s.settleNavigation();
    expect(clock.pending.size).toBe(1);
    expect(save).not.toHaveBeenCalled();
    await clock.advance(499); expect(save).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(save).toHaveBeenCalledExactlyOnceWith(createReaderStatePayload({
      ...state, semanticDocument: model, activeNodeId: second,
    }));
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Second');
    expect(s.isDirty()).toBe(false);
    await clock.advance(1000); expect(save).toHaveBeenCalledTimes(1);
  } finally { s.unmount(); load.mockRestore(); save.mockRestore(); clock.restore(); }
});

it('gates B until its own hydration and cancels A debounce on document switch', async () => {
  const clock = metadataClock(); const desktop = new FakeDesktop().addFile('/B.md', source);
  const hydration = deferred<SensibleDocumentState | null>();
  const load = vi.spyOn(desktop.api, 'loadDocumentState').mockImplementation(id =>
    id === desktop.documentIdFor('/B.md') ? hydration.promise : Promise.resolve(null));
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': '# A' } });
  try {
    expect(clock.pending.size).toBe(1);
    await clock.advance(400);
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    expect(load).toHaveBeenCalledWith(desktop.documentIdFor('/B.md'));
    expect(clock.pending.size).toBe(0);
    await clock.advance(5000); expect(save).not.toHaveBeenCalled();
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(s.status()).toBe('Reader state is still loading. Try closing again when it finishes.');
    const state = loadedState(desktop.documentIdFor('/B.md'));
    await act(async () => hydration.resolve(state));
    await s.settleNavigation();
    expect(clock.pending.size).toBe(1);
    await clock.advance(499); expect(save).not.toHaveBeenCalled();
    await clock.advance(1);
    expect(save).toHaveBeenCalledExactlyOnceWith(createReaderStatePayload({
      ...state, semanticDocument: model, activeNodeId: second,
    }));
  } finally { s.unmount(); load.mockRestore(); save.mockRestore(); clock.restore(); }
});

it('fast null hydration starts a fresh debounce without a pre-hydration write', async () => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const hydration = deferred<SensibleDocumentState | null>();
  const load = vi.spyOn(desktop.api, 'loadDocumentState').mockReturnValue(hydration.promise);
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop });
  try {
    await clock.advance(100);
    await act(async () => hydration.resolve(null));
    expect(save).not.toHaveBeenCalled(); expect(clock.pending.size).toBe(1);
    await clock.advance(400); expect(save).not.toHaveBeenCalled();
    await clock.advance(99); expect(save).not.toHaveBeenCalled();
    await clock.advance(1); expect(save).toHaveBeenCalledTimes(1);
    await clock.advance(1000); expect(save).toHaveBeenCalledTimes(1);
  } finally { s.unmount(); load.mockRestore(); save.mockRestore(); clock.restore(); }
});

it('load rejection preserves its status and enables ordinary persistence through existing finally readiness', async () => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const hydration = deferred<SensibleDocumentState | null>();
  const load = vi.spyOn(desktop.api, 'loadDocumentState').mockReturnValue(hydration.promise);
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop });
  try {
    await clock.advance(100);
    await act(async () => hydration.reject(new Error('held load failed')));
    expect(s.status()).toBe('Desktop settings are temporarily unavailable. Restart the desktop app to reconnect.');
    expect(save).not.toHaveBeenCalled(); expect(clock.pending.size).toBe(1);
    await clock.advance(499); expect(save).not.toHaveBeenCalled();
    await clock.advance(1); expect(save).toHaveBeenCalledTimes(1);
    expect(s.isDirty()).toBe(false);
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { s.unmount(); load.mockRestore(); save.mockRestore(); clock.restore(); }
});

it.each([false, true])('actual unmount cancels the post-hydration timer (StrictMode=%s)', async strictMode => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, strictMode });
  try {
    expect(clock.pending.size).toBe(1);
    await clock.advance(499); expect(save).not.toHaveBeenCalled();
    s.unmount(); expect(clock.pending.size).toBe(0);
    await clock.advance(1000); expect(save).not.toHaveBeenCalled();
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});
