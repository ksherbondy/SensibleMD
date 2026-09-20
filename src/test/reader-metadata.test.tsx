import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';

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
    // hydration is held. Current production fails here by dispatching one write.
    expect(save).not.toHaveBeenCalled();
  } finally {
    s.unmount();
    await act(async () => hydration.resolve(null));
    load.mockRestore(); save.mockRestore(); clock.restore();
  }
});
