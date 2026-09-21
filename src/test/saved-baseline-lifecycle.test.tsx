import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import { startScenario, type Scenario } from './scenario';
import { deferred } from './scheduler';
import { FakeDesktop } from './electron-double';

const aSource = '# A\n\n[Go to B](B.md)';
const files = () => [new File([aSource], 'A.md', { lastModified: 1 }), new File(['# B\n\nneedle'], 'B.md', { lastModified: 1 }), new File(['# C'], 'C.md', { lastModified: 1 })];
const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;
async function setup(strictMode = false, desktop?: FakeDesktop) {
  const read = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ strictMode, desktop });
  const buffer = read.mock.contexts.at(-1); read.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle();
  return { s, buffer };
}
function dirty(s: Scenario, buffer: DocumentBuffer, expected: boolean) {
  expect(s.isDirty()).toBe(expected); expect(buffer.snapshot().isDirty).toBe(expected);
}
async function edit(s: Scenario) {
  await s.enterMode('Write'); await s.appendToEditor(' edited'); await s.enterMode('Read');
}
async function click(s: Scenario, name: string) {
  await s.user.click(screen.getByRole('button', { name })); await s.settle();
}
async function search(s: Scenario) {
  await s.user.type(screen.getByRole('textbox', { name: 'Search document' }), 'needle');
  await click(s, 'All chapters');
}

it.each([false, true])('retains dirty revisions after editing back to identical text (StrictMode=%s)', async strict => {
  const { s, buffer } = await setup(strict);
  try {
    const baseline = buffer.snapshot();
    await s.enterMode('Write'); await s.appendToEditor(' edited'); await s.setEditorSource(aSource);
    expect(buffer.snapshot().text).toBe(baseline.text); dirty(s, buffer, true);
    await s.switchChapter('B.md'); dirty(s, buffer, false);
    await s.switchChapter('A.md'); dirty(s, buffer, true);
    expect(buffer.snapshot().savedVersion).toBe(baseline.savedVersion);
  } finally { s.unmount(); }
});

it.each([false, true])('same-ID collection reimport resets both active and inactive baselines (StrictMode=%s)', async strict => {
  const { s, buffer } = await setup(strict);
  try {
    const originalId = id(); await edit(s); await s.switchChapter('B.md'); await edit(s);
    const previousVersion = buffer.snapshot().version;
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle();
    expect(id()).toBe(originalId); expect(buffer.snapshot().version).toBe(previousVersion + 1);
    expect(buffer.snapshot().text).toBe(aSource); dirty(s, buffer, false);
    await s.switchChapter('B.md'); expect(buffer.snapshot().text).toBe('# B\n\nneedle'); dirty(s, buffer, false);
    await s.switchChapter('A.md'); dirty(s, buffer, false);
  } finally { s.unmount(); }
});

it.each(['internal link', 'history', 'direct search', 'search cycle', 'search origin'] as const)('transfers baselines through %s, preserving edited A and untouched B', async route => {
  const { s, buffer } = await setup(true);
  try {
    await edit(s); await s.clickOutlineHeading('A'); const savedA = buffer.snapshot().savedVersion;
    if (route === 'internal link' || route === 'history') {
      await s.user.click(screen.getByRole('link', { name: 'Go to B' })); await s.settle();
      dirty(s, buffer, false);
      if (route === 'history') {
        await click(s, 'Go back'); expect(s.documentName()).toBe('A.md'); dirty(s, buffer, true);
        await click(s, 'Go forward'); expect(s.documentName()).toBe('B.md'); dirty(s, buffer, false);
      }
    } else {
      await search(s);
      if (route === 'direct search') {
        const panel = screen.getByRole('region', { name: 'Search results' });
        await s.user.click(panel.querySelector<HTMLButtonElement>(':scope > button')!);
      } else await click(s, 'Next search result');
      await s.settleNavigation(); expect(s.documentName()).toBe('B.md'); dirty(s, buffer, false);
      if (route === 'search origin') {
        await click(s, 'Return to origin'); expect(s.documentName()).toBe('A.md'); dirty(s, buffer, true);
        expect(buffer.snapshot().savedVersion).toBe(savedA); return;
      }
    }
    await s.switchChapter('A.md'); dirty(s, buffer, true);
    expect(buffer.snapshot().savedVersion).toBe(savedA);
  } finally { s.unmount(); }
});

it.each(['cancel', 'failure', 'stale success', 'stale failure'] as const)('Save As %s cannot advance a retained A baseline', async outcome => {
  const { s, buffer } = await setup(); const held = deferred<void>();
  const original = s.desktop.api.saveDocumentAs;
  const save = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockImplementationOnce(async payload => { await held.promise; return original(payload); });
  try {
    await edit(s); const oldId = id(), before = buffer.snapshot();
    s.desktop.saveAsDialogResult = outcome === 'cancel' ? null : '/SavedA.md';
    s.desktop.failures.saveAs = outcome.includes('failure');
    await s.save();
    if (outcome.startsWith('stale')) { await s.switchChapter('B.md'); dirty(s, buffer, false); }
    await act(async () => held.resolve());
    if (outcome.startsWith('stale')) { dirty(s, buffer, false); await s.switchChapter('A.md'); }
    expect(id()).toBe(oldId); expect(buffer.snapshot().text).toBe(before.text);
    expect(buffer.snapshot().savedVersion).toBe(before.savedVersion); dirty(s, buffer, true);
    await s.switchChapter('B.md'); await s.switchChapter('A.md'); dirty(s, buffer, true);
  } finally { s.unmount(); save.mockRestore(); }
});

it.each([false, true])('Save As collision preserves origin baseline on return (newer edits=%s)', async newer => {
  const { s, buffer } = await setup();
  try {
    await s.switchChapter('C.md'); await edit(s); const retainedC = buffer.snapshot();
    await s.switchChapter('B.md'); s.desktop.saveAsDialogResult = '/Target.md'; await s.save();
    const targetId = id();
    await edit(s); // Displaced B has a dirty baseline which must not be inherited.
    await s.switchChapter('A.md'); await s.enterMode('Write'); await s.appendToEditor(' origin');
    const baseline = buffer.snapshot().savedVersion;
    const held = deferred<void>(), original = s.desktop.api.saveDocumentAs;
    const save = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockImplementationOnce(async payload => { await held.promise; return original(payload); });
    await s.save(); if (newer) await s.appendToEditor(' newer');
    await act(async () => held.resolve()); save.mockRestore();
    expect(id()).toBe(targetId); expect(s.chapterNames()).toEqual(['Target.md', 'C.md']);
    const accepted = buffer.snapshot(); dirty(s, buffer, newer);
    if (newer) expect(accepted.savedVersion).toBe(baseline);
    await s.switchChapter('C.md'); dirty(s, buffer, true);
    expect(buffer.snapshot().text).toBe(retainedC.text);
    expect(buffer.snapshot().savedVersion).toBe(retainedC.savedVersion);
    await s.switchChapter('Target.md'); dirty(s, buffer, newer);
    expect(buffer.snapshot().text).toBe(accepted.text);
    if (newer) expect(buffer.snapshot().savedVersion).toBe(baseline);
    else expect(buffer.snapshot().savedVersion).toBe(buffer.snapshot().version);
  } finally { s.unmount(); }
});

it.each(['success', 'failure', 'newer edit', 'departed'] as const)('direct Save %s preserves the appropriate baseline through later activation', async outcome => {
  const { s, buffer } = await setup();
  try {
    s.desktop.saveAsDialogResult = '/SavedA.md'; await s.save();
    await s.enterMode('Write'); await s.appendToEditor(' first'); const baseline = buffer.snapshot().savedVersion;
    const held = deferred<void>(), original = s.desktop.api.saveOpenedDocument;
    const save = vi.spyOn(s.desktop.api, 'saveOpenedDocument').mockImplementationOnce(async payload => { await held.promise; return original(payload); });
    s.desktop.failures.save = outcome === 'failure'; await s.save();
    if (outcome === 'newer edit') await s.appendToEditor(' newer');
    if (outcome === 'departed') await s.switchChapter('B.md');
    await act(async () => held.resolve()); save.mockRestore();
    if (outcome === 'departed') { dirty(s, buffer, false); await s.switchChapter('SavedA.md'); }
    dirty(s, buffer, outcome !== 'success');
    await s.switchChapter('B.md'); dirty(s, buffer, false);
    await s.switchChapter('SavedA.md'); dirty(s, buffer, outcome !== 'success');
    if (outcome !== 'success') expect(buffer.snapshot().savedVersion).toBe(baseline);
  } finally { s.unmount(); }
});

it('recovery restore retains the active baseline through departure and close refusal', async () => {
  const { s, buffer } = await setup(true);
  try {
    const a = id();
    await s.switchChapter('B.md');
    s.desktop.recoveryLatest.set(a, { documentId: a, version: 99, source: '# Restored A', savedAt: '2026-01-01' });
    await s.switchChapter('A.md'); const baseline = buffer.snapshot().savedVersion;
    await s.restoreRecovery(); dirty(s, buffer, true);
    expect(buffer.snapshot().savedVersion).toBe(baseline);
    await s.switchChapter('B.md'); dirty(s, buffer, false); await s.switchChapter('A.md');
    expect(buffer.snapshot().text).toBe('# Restored A'); dirty(s, buffer, true);
    await click(s, 'Close document'); expect(s.status()).toBe('Save your changes before closing this document.');
    dirty(s, buffer, true);
  } finally { s.unmount(); }
});

it.each([false, true])('external reload establishes a clean baseline retained on return (conflict=%s)', async conflict => {
  const { s, buffer } = await setup();
  try {
    s.desktop.saveAsDialogResult = '/SavedA.md'; await s.save();
    if (conflict) await edit(s);
    const before = buffer.snapshot();
    await act(async () => s.desktop.emitExternalChange('# Disk replacement'));
    if (conflict) {
      expect(buffer.snapshot()).toEqual(before); dirty(s, buffer, true); await s.reloadFromDisk();
    }
    expect(buffer.snapshot().text).toBe('# Disk replacement'); dirty(s, buffer, false);
    expect(buffer.snapshot().version).toBe(before.version + 1);
    await s.switchChapter('B.md'); await s.switchChapter('SavedA.md');
    expect(buffer.snapshot().text).toBe('# Disk replacement'); dirty(s, buffer, false);
  } finally { s.unmount(); }
});

it('close flush failure and native close cancellation leave inactive dirty baselines intact', async () => {
  const { s, buffer } = await setup(true);
  try {
    await edit(s); const a = buffer.snapshot(); await s.switchChapter('B.md');
    const save = vi.spyOn(s.desktop.api, 'saveDocumentState').mockRejectedValueOnce(new Error('flush failed'));
    await click(s, 'Close document'); save.mockRestore();
    expect(s.status()).toBe('Reader state could not be saved. The document is still open.');
    dirty(s, buffer, false);
    await s.switchChapter('A.md'); dirty(s, buffer, true);
    await act(async () => {
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      s.desktop.closeDecisionListener?.({ id: 'cancel', choice: 'cancel' });
    });
    await s.switchChapter('B.md'); await s.switchChapter('A.md');
    expect(buffer.snapshot().text).toBe(a.text); expect(buffer.snapshot().savedVersion).toBe(a.savedVersion);
    dirty(s, buffer, true);
  } finally { s.unmount(); }
});

it('A→B→A rejects an obsolete Save As without clearing the retained A baseline', async () => {
  const { s, buffer } = await setup(true);
  const held = deferred<void>(), original = s.desktop.api.saveDocumentAs;
  const save = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockImplementationOnce(async payload => { await held.promise; return original(payload); });
  try {
    await edit(s); const before = buffer.snapshot(), originalId = id();
    s.desktop.saveAsDialogResult = '/Obsolete.md'; await s.save();
    await s.switchChapter('B.md'); await s.switchChapter('A.md');
    const returned = buffer.snapshot();
    expect(returned.version).toBe(before.version + 2);
    await act(async () => held.resolve());
    expect(id()).toBe(originalId); expect(buffer.snapshot()).toEqual(returned); dirty(s, buffer, true);
    await s.switchChapter('B.md'); await s.switchChapter('A.md');
    expect(buffer.snapshot().savedVersion).toBe(before.savedVersion); dirty(s, buffer, true);
  } finally { s.unmount(); save.mockRestore(); }
});

it.each(['browser file', 'native open', 'recent open'] as const)('%s establishes a fresh clean baseline after a dirty collection', async route => {
  const desktop = new FakeDesktop().addFile('/Fresh.md', '# Fresh');
  desktop.recents = ['/Fresh.md'];
  const { s, buffer } = await setup(false, desktop);
  try {
    await edit(s); await s.switchChapter('B.md'); await edit(s);
    const previousVersion = buffer.snapshot().version;
    if (route === 'browser file') {
      await s.user.upload(document.querySelector<HTMLInputElement>('input[type=file]:not([multiple])')!, files()[0]); await s.settle();
    } else {
      s.desktop.addFile('/Fresh.md', '# Fresh');
      if (route === 'native open') { s.desktop.openDialogResult = '/Fresh.md'; await s.openDocument(); }
      else {
        s.desktop.recents = ['/Fresh.md'];
        // The command action is the same existing Recent Open route as the UI.
        await click(s, 'Show command palette');
        await s.user.type(await screen.findByRole('textbox', { name: 'Search commands' }), 'recent');
        await s.user.click(screen.getByRole('button', { name: /Open Recent: Fresh.md/ })); await s.settle();
      }
    }
    expect(buffer.snapshot().version).toBe(previousVersion + 1); dirty(s, buffer, false);
    expect(buffer.snapshot().savedVersion).toBe(buffer.snapshot().version);
    expect(buffer.snapshot().text).toBe(route === 'browser file' ? aSource : '# Fresh');
  } finally { s.unmount(); }
});

it('successful close disposes baseline custody before a new same-ID collection is opened', async () => {
  const { s, buffer } = await setup(true);
  try {
    await edit(s); s.desktop.saveAsDialogResult = '/SavedA.md'; await s.save();
    await s.switchChapter('B.md'); await click(s, 'Close document');
    expect(screen.getByText('No document open')).toBeInTheDocument();
    const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
    await s.user.upload(document.querySelector<HTMLInputElement>('input[type=file]')!, files()[0]); await s.settle();
    const next = reads.mock.contexts.at(-1); reads.mockRestore();
    expect(next).not.toBe(buffer);
    if (!(next instanceof DocumentBuffer)) throw new Error('Expected replacement workspace buffer');
    dirty(s, next, false);
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle();
    await s.switchChapter('B.md'); await s.switchChapter('A.md'); dirty(s, next, false);
  } finally { s.unmount(); }
});
