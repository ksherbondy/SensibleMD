import { act, fireEvent, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';
import { parseSemanticDocument } from '../core/semantic-document';
import { createReaderStatePayload } from '../core/reader-state-payload';
import { DocumentBuffer } from '../core/document-buffer';

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

const first = model.headings[0].id;
const closeReader = async (s: Awaited<ReturnType<typeof startScenario>>) => {
  await s.user.click(screen.getByRole('button', { name: 'Close document' }));
  await s.settle();
};

it.each(['bookmarks', 'heading', 'node', 'fontScale', 'lineHeight', 'contentWidth', 'reducedMotion', 'source'] as const)(
  'restarts the full debounce and persists only newest %s state', async change => {
    const clock = metadataClock(); const desktop = new FakeDesktop();
    const save = vi.spyOn(desktop.api, 'saveDocumentState');
    const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
    try {
      await s.clickOutlineHeading('First');
      if (change === 'node') await s.enterMode('Write');
      if (['fontScale', 'lineHeight', 'contentWidth', 'reducedMotion'].includes(change))
        await s.user.click(screen.getByRole('button', { name: 'Reading settings' }));
      expect(clock.pending.size).toBe(1);
      const oldTimer = [...clock.pending.keys()][0];
      await clock.advance(400);
      if (change === 'bookmarks') await s.user.click(screen.getByRole('button', { name: 'Bookmark' }));
      if (change === 'heading') await s.clickOutlineHeading('Second');
      if (change === 'node') await s.moveEditorCursorToLine(3);
      const slider = { fontScale: 0, lineHeight: 1, contentWidth: 2 };
      if (change in slider) {
        const i = slider[change as keyof typeof slider];
        fireEvent.change(screen.getAllByRole('slider')[i], { target: { value: ['130', '2.2', '920'][i] } });
        await s.settle();
      }
      if (change === 'reducedMotion') await s.user.click(screen.getByRole('checkbox', { name: 'Reduce motion' }));
      if (change === 'source') { desktop.emitExternalChange(source.replace('First', 'Other')); await s.settle(); }
      expect(clock.pending.has(oldTimer)).toBe(false);
      expect(clock.pending.size).toBe(1);
      await clock.advance(100); expect(save).not.toHaveBeenCalled();
      await clock.advance(399); expect(save).not.toHaveBeenCalled();
      await clock.advance(1); expect(save).toHaveBeenCalledTimes(1);
      const payload = save.mock.calls[0][0];
      if (change === 'bookmarks') expect(payload.bookmarks).toEqual([first]);
      if (change === 'heading') expect(payload.activeHeading).toBe(second);
      if (change === 'node') {
        expect(payload.activeHeading).toBe(first);
        expect(payload.position?.nodeId).toBe(model.navigableNodes.find(n => n.type === 'paragraph' && n.range.line === 3)!.id);
      }
      if (change === 'fontScale') expect(payload.fontScale).toBe(130);
      if (change === 'lineHeight') expect(payload.lineHeight).toBe(2.2);
      if (change === 'contentWidth') expect(payload.contentWidth).toBe(920);
      if (change === 'reducedMotion') expect(payload.reducedMotion).toBe(true);
      if (change === 'source') {
        expect(payload.activeHeading).toBe(first); // Same node ID, new semantic content.
        expect(payload.position).toEqual(createReaderStatePayload({
          ...payload, semanticDocument: parseSemanticDocument(source.replace('First', 'Other'), 1), activeNodeId: first,
        }).position);
        expect(payload.position?.nodeFingerprint).toBe('heading:other');
      }
      await clock.advance(1000); expect(save).toHaveBeenCalledTimes(1);
    } finally { s.unmount(); save.mockRestore(); clock.restore(); }
  },
);

it.each(['resolve', 'reject'] as const)('tracks a held ordinary write through %s, drains before one final flush, and suppresses ordinary timers while closing', async outcome => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const ordinary = deferred<SensibleDocumentState>(); const final = deferred<SensibleDocumentState>();
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockImplementationOnce(() => ordinary.promise).mockImplementationOnce(() => final.promise);
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    await clock.advance(500); expect(save).toHaveBeenCalledTimes(1);
    await s.clickOutlineHeading('Second'); // Latest final payload differs from held ordinary write.
    await s.user.click(screen.getByRole('button', { name: 'Bookmark' }));
    await s.user.click(screen.getByRole('button', { name: 'Reading settings' }));
    for (const [i, value] of ['125', '2.1', '900'].entries()) fireEvent.change(screen.getAllByRole('slider')[i], { target: { value } });
    await s.user.click(screen.getByRole('checkbox', { name: 'Reduce motion' }));
    await closeReader(s);
    expect(screen.getByRole('button', { name: 'Close document' })).toBeDisabled();
    expect(s.status()).not.toContain('A save is still in progress'); // Not normal pendingSaves.
    expect(clock.pending.size).toBe(0);
    await clock.advance(1000); expect(save).toHaveBeenCalledTimes(1);
    await act(async () => outcome === 'resolve' ? ordinary.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 }) : ordinary.reject(new Error('ordinary failure')));
    expect(save).toHaveBeenCalledTimes(2);
    if (outcome === 'reject') expect(s.status()).toBe('Desktop settings could not be saved. Your document remains open.');
    const expected = createReaderStatePayload({ ...loadedState(s.welcomeDocumentId), semanticDocument: model, activeNodeId: second });
    expect(save.mock.calls[1][0]).toEqual(expected);
    expect(save.mock.calls[1][0]).not.toEqual(save.mock.calls[0][0]);
    expect(screen.queryByText('No document open')).toBeNull();
    await clock.advance(1000); expect(save).toHaveBeenCalledTimes(2);
    await act(async () => final.resolve({ ...expected, schemaVersion: 1 }));
    expect(screen.getByText('No document open')).toBeInTheDocument();
    expect(clock.pending.size).toBe(0);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it.each(['before flush', 'during flush'] as const)('rechecks navigation, dirty source and clean buffer version %s', async phase => {
  // Each invalidator runs in a fresh workspace, so none can hide another guard.
  for (const invalidator of ['navigation', 'dirty', 'clean version'] as const) {
    const clock = metadataClock(); const desktop = new FakeDesktop();
    const ordinary = deferred<SensibleDocumentState>(); const final = deferred<SensibleDocumentState>();
    const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
    const save = vi.spyOn(desktop.api, 'saveDocumentState').mockImplementationOnce(() => ordinary.promise).mockImplementationOnce(() => final.promise);
    const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
    try {
      await s.clickOutlineHeading('First'); await clock.advance(500);
      await closeReader(s);
      if (phase === 'during flush') {
        await act(async () => ordinary.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 }));
        expect(save).toHaveBeenCalledTimes(2);
      }
      if (invalidator === 'navigation') await s.clickOutlineHeading('Second');
      if (invalidator === 'dirty') { await s.enterMode('Write'); await s.appendToEditor(' changed'); }
      if (invalidator === 'clean version') {
        const buffer = reads.mock.contexts.find(value => value instanceof DocumentBuffer);
        if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
        // Isolate version guard from React source/navigation and dirty guards.
        buffer.replace(source, 'programmatic'); buffer.markSaved();
        expect(buffer.snapshot().isDirty).toBe(false);
      }
      await act(async () => phase === 'before flush'
        ? ordinary.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 })
        : final.resolve({ ...save.mock.calls[1][0], schemaVersion: 1 }));
      expect(save).toHaveBeenCalledTimes(phase === 'before flush' ? 1 : 2);
      expect(screen.queryByText('No document open')).toBeNull();
      expect(screen.getByRole('button', { name: 'Close document' })).toBeEnabled();
      if (invalidator === 'navigation') expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Second');
      if (invalidator === 'dirty') { expect(s.isDirty()).toBe(true); expect(s.editorSource()).toContain(' changed'); }
    } finally { s.unmount(); reads.mockRestore(); save.mockRestore(); clock.restore(); }
  }
});

it('final flush failure resets closing, restarts ordinary scheduling and permits a later close retry', async () => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const final = deferred<SensibleDocumentState>();
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockImplementationOnce(() => final.promise);
  const s = await startScenario({ desktop });
  try {
    await closeReader(s); expect(save).toHaveBeenCalledTimes(1); expect(clock.pending.size).toBe(0);
    await act(async () => final.reject(new Error('final failure')));
    expect(s.status()).toBe('Reader state could not be saved. The document is still open.');
    expect(screen.getByRole('button', { name: 'Close document' })).toBeEnabled();
    expect(clock.pending.size).toBe(1);
    await closeReader(s); expect(save).toHaveBeenCalledTimes(2);
    expect(screen.getByText('No document open')).toBeInTheDocument();
    expect(clock.pending.size).toBe(0);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it('ordinary rejection changes only status, leaves dirty source/recovery and an independent save pending, and then settles', async () => {
  const clock = metadataClock(); const desktop = new FakeDesktop().addFile('/Native.md', source);
  const ordinary = deferred<SensibleDocumentState>(); const disk = deferred<{ name: string }>();
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockImplementationOnce(() => ordinary.promise);
  const direct = vi.spyOn(desktop.api, 'saveOpenedDocument').mockReturnValue(disk.promise);
  const recovery = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  const s = await startScenario({ desktop });
  try {
    desktop.openDialogResult = '/Native.md'; await s.openDocument();
    await s.enterMode('Write'); await s.appendToEditor(' dirty');
    const text = s.editorSource(); const id = desktop.documentIdFor('/Native.md');
    const record = { documentId: id, version: 1, source: text, savedAt: '2026-01-01T00:00:00Z' };
    desktop.recoveryLatest.set(id, record);
    await clock.advance(500); await s.save();
    await closeReader(s); expect(s.status()).toBe('Save your changes before closing this document.');
    await act(async () => ordinary.reject(new Error('ordinary failure')));
    expect(s.status()).toBe('Desktop settings could not be saved. Your document remains open.');
    expect(s.editorSource()).toBe(text); expect(s.isDirty()).toBe(true);
    expect(desktop.recoveryLatest.get(id)).toEqual(record); expect(recovery).not.toHaveBeenCalled();
    expect(direct).toHaveBeenCalledTimes(1);
    await act(async () => disk.resolve({ name: 'Native.md' }));
    expect(s.isDirty()).toBe(false); expect(s.status()).toBe('Saved.');
    await closeReader(s); expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { s.unmount(); save.mockRestore(); direct.mockRestore(); recovery.mockRestore(); clock.restore(); }
});

it('already-dispatched A write settles only under A after B activates and persists', async () => {
  const clock = metadataClock(); const desktop = new FakeDesktop().addFile('/B.md', '# B');
  const held = deferred<void>(); const original = desktop.api.saveDocumentState;
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockImplementationOnce(async payload => { await held.promise; return original(payload); });
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('Second'); await clock.advance(500);
    const a = save.mock.calls[0][0];
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    await clock.advance(500); const b = save.mock.calls[1][0];
    expect(b.documentId).toBe(desktop.documentIdFor('/B.md'));
    expect(a.documentId).toBe(s.welcomeDocumentId);
    await act(async () => held.resolve());
    expect(desktop.documentState.get(a.documentId)).toEqual({ ...a, schemaVersion: 1 });
    expect(desktop.documentState.get(b.documentId)).toEqual({ ...b, schemaVersion: 1 });
    expect(s.documentName()).toBe('B.md'); expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); save.mockRestore(); clock.restore(); }
});

it.each(['resolve', 'reject'] as const)('old workspace write %s cannot mutate a remounted StrictMode workspace', async outcome => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const held = deferred<SensibleDocumentState>();
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockImplementationOnce(() => held.promise);
  const a = await startScenario({ desktop, strictMode: true, storage: { 'sensiblemd-document': '# A' } });
  await clock.advance(500); a.unmount();
  const b = await startScenario({ desktop, strictMode: true, storage: { 'sensiblemd-document': '# B', 'sensiblemd-name': 'B.md' } });
  try {
    const status = b.status();
    expect(clock.pending.size).toBe(1);
    await act(async () => outcome === 'resolve'
      ? held.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 }) : held.reject(new Error('old failure')));
    expect(b.status()).toBe(status); expect(b.documentName()).toBe('B.md'); expect(b.isDirty()).toBe(false);
    expect(localStorage.getItem('sensiblemd-document')).toBe('# B');
    await clock.advance(499); expect(save).toHaveBeenCalledTimes(1);
    await clock.advance(1); expect(save).toHaveBeenCalledTimes(2);
    await clock.advance(1000); expect(save).toHaveBeenCalledTimes(2);
  } finally { b.unmount(); save.mockRestore(); clock.restore(); }
});

it.each(['resolve', 'reject'] as const)('removes the exact tracked ordinary promise after %s settlement', async outcome => {
  const clock = metadataClock(); const desktop = new FakeDesktop();
  const held = deferred<SensibleDocumentState>();
  const caught = vi.spyOn(held.promise, 'catch');
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockReturnValueOnce(held.promise);
  const s = await startScenario({ desktop });
  const add = vi.spyOn(Set.prototype, 'add');
  try {
    await clock.advance(500);
    const write = caught.mock.results[0].value as Promise<unknown>;
    const registrations = add.mock.calls.flatMap(([value], i) => value === write ? [add.mock.contexts[i]] : []);
    expect(registrations).toHaveLength(1); // Not also registered in pendingSaves.
    const pending = registrations[0] as Set<Promise<unknown>>;
    expect(pending.has(write)).toBe(true);
    await s.settle(); expect(pending.has(write)).toBe(true);
    await act(async () => outcome === 'resolve'
      ? held.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 }) : held.reject(new Error('metadata failure')));
    expect(pending.has(write)).toBe(false); expect(pending.size).toBe(0);
    if (outcome === 'reject') expect(s.status()).toBe('Desktop settings could not be saved. Your document remains open.');
  } finally { add.mockRestore(); s.unmount(); caught.mockRestore(); save.mockRestore(); clock.restore(); }
});
