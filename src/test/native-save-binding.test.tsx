import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import { FakeDesktop } from './electron-double';
import { startScenario, type Scenario } from './scenario';
import { deferred } from './scheduler';

const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;
const session = () => document.querySelector('.app-shell')!.getAttribute('data-session-id')!;
const aSource = '# A\n\nneedle A\n\n[Go to B](B.md)';
const bSource = '# B\n\nneedle B\n\n[Go to A](NativeA.md)';
const files = () => [new File([aSource], 'A.md', { lastModified: 1 }), new File([bSource], 'B.md', { lastModified: 1 })];
const click = async (s: Scenario, name: string) => { await s.user.click(screen.getByRole('button', { name })); await s.settle(); };
async function setup(strictMode = false, nativeB = false) {
  const desktop = new FakeDesktop().addFile('/Fresh.md', '# Fresh'); desktop.recents = ['/Fresh.md'];
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ strictMode, desktop });
  const buffer = reads.mock.contexts.at(-1); reads.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected buffer');
  await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle();
  if (nativeB) await s.switchChapter('B.md');
  desktop.saveAsDialogResult = nativeB ? '/NativeB.md' : '/NativeA.md'; await s.save();
  return { s, buffer, desktop };
}
async function search(s: Scenario) {
  await s.user.type(screen.getByRole('textbox', { name: 'Search document' }), 'needle');
  await click(s, 'All chapters');
}
async function link(s: Scenario, name: string) {
  await s.user.click(screen.getByRole('link', { name })); await s.settle();
}

const routes = ['collection selection', 'next chapter', 'previous chapter', 'internal link', 'history', 'history forward', 'search', 'search cycle', 'search origin', 'browser file', 'browser collection', 'same-ID browser reimport'] as const;
it.each(routes.flatMap(route => [false, true].map(strict => ({ route, strict }))))('revokes the native binding on $route (StrictMode=$strict)', async ({ route, strict }) => {
  const { s, buffer, desktop } = await setup(strict, route === 'previous chapter');
  const direct = vi.spyOn(desktop.api, 'saveOpenedDocument'), saveAs = vi.spyOn(desktop.api, 'saveDocumentAs');
  try {
    if (route === 'history') {
      await s.switchChapter('B.md'); await link(s, 'Go to A'); await s.save();
    }
    if (route === 'history forward') {
      await link(s, 'Go to B'); await click(s, 'Go back'); await s.save();
    }
    if (route === 'search origin') {
      await s.switchChapter('B.md'); await search(s); await click(s, 'Next search result');
      expect(s.documentName()).toBe('NativeA.md'); await s.save();
    }
    const fromId = id(), fromSession = session(), nativePath = desktop.authorizedPath!;
    const diskBefore = desktop.diskContents(nativePath);
    expect(fromSession).not.toBe(''); expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    if (route === 'collection selection') await s.switchChapter('B.md');
    if (route === 'next chapter') await click(s, 'Next chapter');
    if (route === 'previous chapter') await click(s, 'Previous chapter');
    if (route === 'internal link') await link(s, 'Go to B');
    if (route === 'history') await click(s, 'Go back');
    if (route === 'history forward') await click(s, 'Go forward');
    if (route === 'search' || route === 'search cycle') {
      await search(s);
      if (route === 'search') {
        const target = [...screen.getByRole('region', { name: 'Search results' }).querySelectorAll<HTMLButtonElement>(':scope > button')].find(row => row.textContent?.includes('B.md'))!;
        await s.user.click(target);
      } else { await click(s, 'Next search result'); expect(session()).toBe(fromSession); await click(s, 'Next search result'); }
      await s.settleNavigation();
    }
    if (route === 'search origin') await click(s, 'Return to origin');
    if (route === 'browser file') await s.user.upload(document.querySelector<HTMLInputElement>('input[type=file]:not([multiple])')!, files()[1]);
    if (route === 'browser collection' || route === 'same-ID browser reimport') {
      await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle();
      if (route === 'same-ID browser reimport') {
        const browserId = id();
        await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle(); expect(id()).toBe(browserId);
      }
    }
    await s.settle(); expect(id()).not.toBe(fromId); expect(session()).toBe('');
    expect(buffer.snapshot().isDirty).toBe(false); expect(s.isDirty()).toBe(false);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await s.enterMode('Write'); await s.appendToEditor(' edited target');
    const before = buffer.snapshot(); direct.mockClear(); saveAs.mockClear(); desktop.saveAsDialogResult = null;
    await s.save();
    expect(direct).not.toHaveBeenCalled();
    expect(saveAs).toHaveBeenCalledExactlyOnceWith({ name: s.documentName(), source: before.text });
    expect(buffer.snapshot()).toEqual(before); expect(s.isDirty()).toBe(true);
    expect(desktop.diskContents(nativePath)).toBe(diskBefore);
  } finally { s.unmount(); direct.mockRestore(); saveAs.mockRestore(); }
});

it.each(['native Open', 'Recent Open', 'same-ID native reopen'] as const)('%s installs the returned document/session and uses it for direct Save', async route => {
  const { s, buffer, desktop } = await setup(true);
  const direct = vi.spyOn(desktop.api, 'saveOpenedDocument');
  try {
    const oldSession = session(), oldId = id();
    if (route === 'Recent Open') {
      await click(s, 'Show command palette');
      await s.user.type(await screen.findByRole('textbox', { name: 'Search commands' }), 'recent');
      await s.user.click(screen.getByRole('button', { name: /Open Recent: Fresh.md/ })); await s.settle();
    } else { desktop.openDialogResult = route === 'native Open' ? '/Fresh.md' : '/NativeA.md'; await s.openDocument(); }
    const accepted = desktop.sessions.at(-1)!;
    expect(id()).toBe(accepted.documentId); expect(session()).toBe(accepted.sessionId); expect(session()).not.toBe(oldSession);
    if (route === 'same-ID native reopen') expect(id()).toBe(oldId);
    expect(buffer.snapshot().isDirty).toBe(false);
    await s.enterMode('Write'); await s.appendToEditor(' edited'); await s.save();
    expect(direct).toHaveBeenCalledExactlyOnceWith({ documentId: accepted.documentId, sessionId: accepted.sessionId, source: buffer.snapshot().text });
    expect(desktop.diskContents(accepted.filePath)).toBe(buffer.snapshot().text); expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); direct.mockRestore(); }
});

it('same-document navigation and editing preserve the binding', async () => {
  const { s, desktop } = await setup();
  try {
    const before = session(); await s.clickOutlineHeading('A'); await search(s); await click(s, 'Next search result');
    expect(session()).toBe(before);
    await s.enterMode('Write'); await s.appendToEditor(' edited'); expect(session()).toBe(before);
    await s.save(); expect(session()).toBe(before); expect(desktop.diskContents('/NativeA.md')).toContain('edited');
  } finally { s.unmount(); }
});

it('main binding mismatch revokes only current renderer authority; explicit retry enters Save As', async () => {
  const { s, buffer, desktop } = await setup();
  const direct = vi.spyOn(desktop.api, 'saveOpenedDocument'), saveAs = vi.spyOn(desktop.api, 'saveDocumentAs');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edits'); const before = buffer.snapshot();
    // Main changed authorization, but its response has not been adopted by this renderer.
    desktop.openDialogResult = '/Fresh.md'; await desktop.api.openDocument();
    await s.save();
    expect(session()).toBe(''); expect(buffer.snapshot()).toEqual(before); expect(s.isDirty()).toBe(true);
    expect(s.status()).toBe('The file could not be saved. Your edits are still open.');
    expect(desktop.diskContents('/Fresh.md')).toBe('# Fresh'); expect(desktop.diskContents('/NativeA.md')).toBe(aSource);
    expect(saveAs).not.toHaveBeenCalled(); expect(desktop.recoveryRequests.filter(r => r.operation === 'clear').length).toBe(1); // Initial Save As only.
    desktop.saveAsDialogResult = '/Retry.md'; await s.save();
    expect(direct).toHaveBeenCalledTimes(1); expect(saveAs).toHaveBeenCalledTimes(1);
    expect(session()).toBe(desktop.sessions.at(-1)!.sessionId); expect(desktop.diskContents('/Retry.md')).toBe(before.text);
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); direct.mockRestore(); saveAs.mockRestore(); }
});

it('ordinary disk failure retains its binding for direct-save retry', async () => {
  const { s, desktop } = await setup(); const direct = vi.spyOn(desktop.api, 'saveOpenedDocument');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edits'); const before = session();
    desktop.failures.save = true; await s.save(); expect(session()).toBe(before); expect(s.isDirty()).toBe(true);
    desktop.failures.save = false; await s.save(); expect(session()).toBe(before); expect(s.isDirty()).toBe(false);
    expect(direct).toHaveBeenCalledTimes(2);
  } finally { s.unmount(); direct.mockRestore(); }
});

it.each(['success', 'mismatch', 'failure'] as const)('old direct-save %s cannot mutate a replacement binding/baseline', async outcome => {
  const { s, buffer, desktop } = await setup(true);
  const held = deferred<{ name: string } | { error: 'binding-mismatch' }>();
  const save = vi.spyOn(desktop.api, 'saveOpenedDocument').mockReturnValueOnce(held.promise);
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' A edits'); await s.save();
    desktop.openDialogResult = '/Fresh.md'; await s.openDocument();
    await s.enterMode('Write'); await s.appendToEditor(' B edits');
    const binding = session(), before = buffer.snapshot();
    await act(async () => {
      if (outcome === 'failure') held.reject(new Error('old failure'));
      else held.resolve(outcome === 'mismatch' ? { error: 'binding-mismatch' } : { name: 'NativeA.md' });
    });
    expect(session()).toBe(binding); expect(buffer.snapshot()).toEqual(before); expect(s.isDirty()).toBe(true);
    expect(clear).not.toHaveBeenCalled();
    await s.save(); expect(desktop.diskContents('/Fresh.md')).toBe(before.text); expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); save.mockRestore(); clear.mockRestore(); }
});

it.each(['success', 'mismatch', 'failure'] as const)('unmounted direct-save %s cannot publish a saved baseline or clear recovery', async outcome => {
  const { s, buffer, desktop } = await setup(true);
  const held = deferred<{ name: string } | { error: 'binding-mismatch' }>();
  const save = vi.spyOn(desktop.api, 'saveOpenedDocument').mockReturnValueOnce(held.promise);
  const mark = vi.spyOn(buffer, 'markSaved'), clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  await s.enterMode('Write'); await s.appendToEditor(' edits'); await s.save(); s.unmount();
  try {
    await act(async () => {
      if (outcome === 'failure') held.reject(new Error('old failure'));
      else held.resolve(outcome === 'mismatch' ? { error: 'binding-mismatch' } : { name: 'NativeA.md' });
    });
    expect(mark).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled(); expect(buffer.snapshot().isDirty).toBe(true);
  } finally { save.mockRestore(); mark.mockRestore(); clear.mockRestore(); }
});

it('A→B→A rejects an obsolete direct-save completion after a fresh same-ID native binding', async () => {
  const { s, buffer, desktop } = await setup(true);
  const held = deferred<{ name: string }>();
  const save = vi.spyOn(desktop.api, 'saveOpenedDocument').mockReturnValueOnce(held.promise);
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  try {
    await s.enterMode('Write'); await s.appendToEditor(' old edit'); await s.save();
    const oldId = id(), oldSession = session();
    desktop.openDialogResult = '/Fresh.md'; await s.openDocument();
    desktop.openDialogResult = '/NativeA.md'; await s.openDocument();
    await s.enterMode('Write'); await s.appendToEditor(' current edit');
    const before = buffer.snapshot(), currentSession = session();
    expect(id()).toBe(oldId); expect(currentSession).not.toBe(oldSession);
    await act(async () => held.resolve({ name: 'NativeA.md' }));
    expect(buffer.snapshot()).toEqual(before); expect(session()).toBe(currentSession); expect(clear).not.toHaveBeenCalled();
    await s.save(); expect(desktop.diskContents('/NativeA.md')).toBe(before.text);
  } finally { s.unmount(); save.mockRestore(); clear.mockRestore(); }
});
