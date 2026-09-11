import { act } from '@testing-library/react';
import { expect, it } from 'vitest';
import { startScenario } from './scenario';

export function attemptClose() {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return !event.defaultPrevented;
}
it('clean window allows unload, dirty native/menu window close vetoes unload', async () => {
  const s = await startScenario();
  try {
    expect(attemptClose()).toBe(true);
    await s.enterMode('Write');
    await s.appendToEditor(' unsaved');
    await act(async () => { expect(attemptClose()).toBe(false); });
    expect(s.isDirty()).toBe(true);
  } finally { s.unmount(); }
});

async function dirtyScenario() {
  const s = await startScenario();
  s.desktop.addFile('/A.md', '# Original');
  s.desktop.openDialogResult = '/A.md';
  await s.openDocument();
  await s.enterMode('Write');
  await s.appendToEditor(' edited');
  const id = s.desktop.documentIdFor('/A.md');
  await s.desktop.api.saveRecoverySnapshot({ documentId: id, version: 1, source: '# Original edited' });
  return { s, id };
}
async function decide(s: Awaited<ReturnType<typeof startScenario>>, choice: 'save' | 'discard' | 'cancel') {
  await act(async () => {
    expect(attemptClose()).toBe(false);
    s.desktop.closeDecisionListener?.({ id: '1', choice });
  });
  await s.settle();
}

it('Cancel retains the dirty document, recovery and cached source', async () => {
  const { s, id } = await dirtyScenario();
  try {
    const cache = localStorage.getItem('sensiblemd-document');
    await decide(s, 'cancel');
    expect(s.desktop.closeResults).toEqual([{ id: '1', allow: false }]);
    expect(attemptClose()).toBe(false);
    expect(s.isDirty()).toBe(true);
    expect(s.desktop.recoveryLatest.has(id)).toBe(true);
    expect(localStorage.getItem('sensiblemd-document')).toBe(cache);
  } finally { s.unmount(); }
});
it('Discard clears both recovery generations and cached source, preserves disk, and permits final unload', async () => {
  const { s, id } = await dirtyScenario();
  try {
    await s.desktop.api.saveRecoverySnapshot({ documentId: id, version: 2, source: '# Original edited' });
    await decide(s, 'discard');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(true);
    expect(attemptClose()).toBe(true);
    expect(s.desktop.recoveryLatest.has(id)).toBe(false);
    expect(s.desktop.recoveryPrevious.has(id)).toBe(false);
    expect(localStorage.getItem('sensiblemd-document')).toBeNull();
    expect(s.desktop.diskContents('/A.md')).toBe('# Original');
    await new Promise((resolve) => setTimeout(resolve, 1600));
    expect(s.desktop.recoveryLatest.has(id)).toBe(false);
  } finally { s.unmount(); }
});
it('successful Save uses the existing save lifecycle, clears recovery and permits unload', async () => {
  const { s, id } = await dirtyScenario();
  try {
    await decide(s, 'save');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(true);
    expect(s.isDirty()).toBe(false);
    expect(attemptClose()).toBe(true);
    expect(s.desktop.diskContents('/A.md')).toBe('# Original edited');
    expect(s.desktop.recoveryLatest.has(id)).toBe(false);
    expect(s.desktop.writes).toHaveLength(1);
  } finally { s.unmount(); }
});
it('failed Save retains dirty state, recovery and reports the existing error', async () => {
  const { s, id } = await dirtyScenario();
  try {
    s.desktop.failures.save = true;
    await decide(s, 'save');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(false);
    expect(attemptClose()).toBe(false);
    expect(s.isDirty()).toBe(true);
    expect(s.desktop.recoveryLatest.has(id)).toBe(true);
    expect(s.status()).toMatch(/could not be saved/);
  } finally { s.unmount(); }
});
it('new edits during Save remain dirty and duplicate decisions do not start another save', async () => {
  const { s, id } = await dirtyScenario();
  try {
    s.scheduler.useManualOrder();
    await decide(s, 'save');
    await act(async () => s.desktop.closeDecisionListener?.({ id: '1', choice: 'save' }));
    expect(s.scheduler.pending('document:save-opened')).toHaveLength(1);
    await s.appendToEditor(' newer');
    await act(async () => s.scheduler.release('document:save-opened'));
    await s.settle();
    expect(s.desktop.closeResults).toEqual([{ id: '1', allow: false }]);
    expect(attemptClose()).toBe(false);
    expect(s.isDirty()).toBe(true);
    expect(s.desktop.recoveryLatest.has(id)).toBe(true);
    expect(s.status()).toMatch(/Newer changes remain open/);
  } finally { s.scheduler.useAutomaticOrder(); s.unmount(); }
});
it('new edits after successful Save approval still veto the final unload', async () => {
  const { s } = await dirtyScenario();
  try {
    await decide(s, 'save');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(true);
    await s.appendToEditor(' late');
    expect(attemptClose()).toBe(false);
  } finally { s.unmount(); }
});
it('failed recovery deletion prevents Discard close', async () => {
  const { s, id } = await dirtyScenario();
  try {
    s.desktop.failures.recovery = true;
    await decide(s, 'discard');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(false);
    expect(attemptClose()).toBe(false);
    expect(s.desktop.recoveryLatest.has(id)).toBe(true);
    expect(s.isDirty()).toBe(true);
    expect(s.status()).toMatch(/could not be discarded/);
  } finally { s.unmount(); }
});
it('Save As cancellation retains the dirty buffer and recovery', async () => {
  const s = await startScenario();
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    await decide(s, 'save');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(false);
    expect(s.isDirty()).toBe(true);
    expect(attemptClose()).toBe(false);
  } finally { s.unmount(); }
});
it('new edits during recovery deletion prevent discard approval and receive a fresh recovery snapshot', async () => {
  const { s, id } = await dirtyScenario();
  try {
    s.scheduler.useManualOrder();
    await decide(s, 'discard');
    await s.appendToEditor(' newer');
    await act(async () => s.scheduler.release('recovery:clear'));
    await act(async () => s.scheduler.release('recovery:save'));
    await s.settle();
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(false);
    expect(attemptClose()).toBe(false);
    expect(s.desktop.recoveryLatest.get(id)?.source).toBe('# Original edited newer');
    expect(s.isDirty()).toBe(true);
  } finally { s.scheduler.useAutomaticOrder(); s.unmount(); }
});
it('Save As success uses the existing lifecycle and allows closing after identity adoption', async () => {
  const s = await startScenario();
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    s.desktop.saveAsDialogResult = '/Saved.md';
    await decide(s, 'save');
    expect(s.desktop.closeResults.at(-1)?.allow).toBe(true);
    expect(s.isDirty()).toBe(false);
    expect(attemptClose()).toBe(true);
    expect(s.desktop.writes).toHaveLength(1);
  } finally { s.unmount(); }
});
