import { act, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { EditorView } from '@codemirror/view';
import { Transaction } from '@codemirror/state';
import { undo, redo } from '@codemirror/commands';
import { expect, it, vi } from 'vitest';
import type { MarkdownEditor } from '../components/MarkdownEditor';
import type { EditorMutationOrigin } from '../core/editor-mutation-ownership';
import { DocumentBuffer } from '../core/document-buffer';
import * as collection from '../core/document-collection';
import { startScenario, type Scenario } from './scenario';
import { deferred } from './scheduler';
import { FakeDesktop } from './electron-double';

type Props = ComponentProps<typeof MarkdownEditor>;
const captured = vi.hoisted(() => ({ props: null as Props | null, origin: null as EditorMutationOrigin | null }));
vi.mock('../components/MarkdownEditor', async importOriginal => {
  const actual = await importOriginal<typeof import('../components/MarkdownEditor')>();
  return { MarkdownEditor: (props: Props) => {
    captured.props = props;
    return <actual.MarkdownEditor {...props} onChange={(text, origin) => {
      captured.origin = origin;
      props.onChange(text, origin);
    }} />;
  } };
});

const aText = '# A\n\nneedle A\n\n[Go B](B.md)';
const bText = '# B\n\nneedle B\n\n[Go A](A.md)';
const files = () => [new File([aText], 'A.md', { lastModified: 1 }), new File([bText], 'B.md', { lastModified: 1 })];
const editor = () => EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
const click = async (s: Scenario, name: string) => { await s.user.click(screen.getByRole('button', { name })); await s.settle(); };
const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!;
async function setup(strictMode = false) {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const desktop = new FakeDesktop().addFile('/Native.md', '# Native');
  desktop.recents = ['/Native.md'];
  const s = await startScenario({ strictMode, desktop });
  const buffer = reads.mock.contexts.at(-1); reads.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected buffer');
  await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, files()); await s.settle();
  return { s, buffer };
}
async function capture(s: Scenario) {
  await s.enterMode('Write');
  // A real identical CodeMirror transaction obtains the real instance lease
  // without changing the workspace source, version or undo history.
  const view = editor();
  act(() => view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: view.state.doc.toString() },
    annotations: Transaction.addToHistory.of(false),
  }));
  return { props: captured.props!, origin: captured.origin!, view };
}
function reject(old: Awaited<ReturnType<typeof capture>>, buffer: DocumentBuffer) {
  const before = buffer.snapshot();
  old.props.onChange('# Obsolete source', old.origin);
  old.props.onPromoteHeading(old.origin);
  old.props.onDemoteHeading(old.origin);
  expect(buffer.snapshot()).toEqual(before);
}
async function search(s: Scenario) {
  await s.user.type(screen.getByRole('textbox', { name: 'Search document' }), 'needle');
  await click(s, 'All chapters');
}

const routes = ['selection', 'next chapter', 'previous chapter', 'history back', 'history forward', 'link', 'search', 'search cycle', 'search origin', 'browser file', 'browser collection', 'same-ID collection', 'same-ID file', 'native', 'recent', 'same-ID native'] as const;
it.each(routes)('revokes before buffer handoff and rejects retained editor operations: %s', async route => {
  const { s, buffer } = await setup(true);
  let unsubscribe = () => {};
  try {
    s.desktop.addFile('/Native.md', '# Native'); s.desktop.recents = ['/Native.md'];
    if (route === 'previous chapter' || route === 'history back') {
      await s.user.click(screen.getByRole('link', { name: 'Go B' })); await s.settle();
    }
    if (route === 'history forward') {
      await s.user.click(screen.getByRole('link', { name: 'Go B' })); await s.settle(); await click(s, 'Go back');
    }
    if (route === 'same-ID file') {
      await s.user.upload(document.querySelector<HTMLInputElement>('input[type=file]:not([multiple])')!, files()[0]); await s.settle();
    }
    if (route === 'same-ID native') { s.desktop.openDialogResult = '/Native.md'; await s.openDocument(); }
    if (route === 'search origin') {
      await s.switchChapter('B.md'); await search(s); await click(s, 'Next search result');
      expect(s.documentName()).toBe('A.md');
    }
    if (route === 'search' || route === 'search cycle') await search(s);
    const oldId = id(), old = await capture(s);
    const publications = vi.spyOn(collection, 'replaceCollectionDocument');
    let notified = 0;
    unsubscribe = buffer.subscribe(() => {
      notified++;
      expect(old.props.isActivationCurrent(old.origin.activation)).toBe(false);
      reject(old, buffer);
    });
    if (route === 'selection') await s.switchChapter('B.md');
    if (route === 'next chapter') { await s.enterMode('Read'); await click(s, 'Next chapter'); }
    if (route === 'previous chapter') { await s.enterMode('Read'); await click(s, 'Previous chapter'); }
    if (route === 'history back' || route === 'history forward') {
      await click(s, 'Show command palette');
      const command = route === 'history back' ? 'Go Back' : 'Go Forward';
      await s.user.type(await screen.findByRole('textbox', { name: 'Search commands' }), command);
      await s.user.click(screen.getByRole('button', { name: new RegExp(command, 'i') })); await s.settle();
      expect(editor()).toBe(old.view);
    }
    if (route === 'link') {
      await s.enterMode('Read'); await s.user.click(screen.getByRole('link', { name: 'Go B' })); await s.settle();
    }
    if (route === 'search') {
      const result = [...screen.getByRole('region', { name: 'Search results' }).querySelectorAll<HTMLButtonElement>(':scope > button')].find(row => row.textContent?.includes('B.md'))!;
      await s.user.click(result); await s.settle();
    }
    if (route === 'search cycle') { await click(s, 'Next search result'); await click(s, 'Next search result'); }
    if (route === 'search origin') await click(s, 'Return to origin');
    if (route === 'browser file' || route === 'same-ID file') {
      await s.user.upload(document.querySelector<HTMLInputElement>('input[type=file]:not([multiple])')!, files()[route === 'browser file' ? 1 : 0]); await s.settle();
    }
    if (route === 'browser collection' || route === 'same-ID collection') {
      const imported = route === 'browser collection' ? [files()[1]] : files();
      await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, imported); await s.settle();
    }
    if (route === 'native' || route === 'same-ID native') { s.desktop.openDialogResult = '/Native.md'; await s.openDocument(); }
    if (route === 'recent') {
      // Refresh the existing recent list through the normal native-open action.
      s.desktop.openDialogResult = null; await s.openDocument();
      await click(s, 'Show command palette');
      await s.user.type(await screen.findByRole('textbox', { name: 'Search commands' }), 'recent');
      await s.user.click(screen.getByRole('button', { name: /Open Recent: Native.md/ })); await s.settle();
    }
    expect(notified).toBeGreaterThan(0); unsubscribe();
    const after = buffer.snapshot(), status = s.status(), recovery = s.desktop.recoveryRequests.length;
    act(() => reject(old, buffer)); await s.settle();
    expect(buffer.snapshot()).toEqual(after); expect(localStorage.getItem('sensiblemd-document')).toBe(after.text);
    expect(s.isDirty()).toBe(after.isDirty); expect(s.status()).toBe(status);
    expect(s.desktop.recoveryRequests.length).toBe(recovery); expect(s.desktop.writes).toHaveLength(0);
    expect(publications).not.toHaveBeenCalled(); publications.mockRestore();
    if (route.startsWith('same-ID')) expect(id()).toBe(oldId);
    await s.enterMode('Write'); await s.appendToEditor(' fresh');
    expect(buffer.snapshot().text).toBe(after.text + ' fresh'); expect(s.isDirty()).toBe(true);
  } finally { unsubscribe(); s.unmount(); vi.restoreAllMocks(); }
});

it.each([false, true])('A→B→A never revives an old callback (StrictMode=%s)', async strict => {
  const { s, buffer } = await setup(strict);
  try {
    const old = await capture(s), a = id();
    await s.switchChapter('B.md'); await s.switchChapter('A.md');
    expect(id()).toBe(a); act(() => reject(old, buffer));
    const fresh = await capture(s);
    expect(fresh.origin.activation).not.toBe(old.origin.activation);
    act(() => reject(old, buffer));
    await s.appendToEditor(' current'); expect(buffer.snapshot().text).toBe(aText + ' current');
  } finally { s.unmount(); }
});

it.each([false, true])('batched native A→B→A rejects A callbacks before the replacement commit (StrictMode=%s)', async strict => {
  const { s, buffer } = await setup(strict);
  try {
    s.desktop.openDialogResult = '/Native.md'; await s.openDocument();
    const old = await capture(s), a = id();
    const bResult = deferred<SensibleOpenedDocument | null>(), aResult = deferred<SensibleOpenedDocument | null>();
    vi.spyOn(s.desktop.api, 'openDocument').mockReturnValueOnce(bResult.promise).mockReturnValueOnce(aResult.promise);
    await s.openDocument(); await s.openDocument();
    await act(async () => {
      bResult.resolve({ documentId: 'doc-b', sessionId: 'session-b', name: 'B.md', source: '# B' });
      await Promise.resolve(); await Promise.resolve();
      expect(buffer.snapshot().text).toBe('# B'); reject(old, buffer);
      aResult.resolve({ documentId: a, sessionId: 'session-new-a', name: 'Native.md', source: '# Native' });
      await Promise.resolve(); await Promise.resolve();
      expect(buffer.snapshot().text).toBe('# Native');
      expect(old.origin.lease.live).toBe(true); // React has not committed Read/unmounted A yet.
      reject(old, buffer);
    });
    expect(id()).toBe(a); expect(s.isDirty()).toBe(false);
    await s.enterMode('Write'); await s.appendToEditor(' new lifetime');
    expect(buffer.snapshot().text).toBe('# Native new lifetime');
  } finally { s.unmount(); vi.restoreAllMocks(); }
});

it('same-document navigation and cancelled Open retain the current editor token', async () => {
  const { s, buffer } = await setup(true);
  try {
    const old = await capture(s);
    await s.clickOutlineHeading('A'); s.desktop.openDialogResult = null; await s.openDocument();
    expect(captured.props!.activation).toBe(old.origin.activation);
    expect(old.origin.lease.live).toBe(true);
    act(() => old.props.onChange(aText + ' accepted', old.origin));
    expect(buffer.snapshot().text).toBe(aText + ' accepted');
  } finally { s.unmount(); }
});

it.each(['undo', 'redo', 'heading keyboard', 'heading toolbar'] as const)('rejects outgoing real editor %s before React commits', async operation => {
  const { s, buffer } = await setup(true);
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edit');
    const view = editor();
    if (operation === 'redo') act(() => { undo(view); });
    const b = within(screen.getByRole('navigation', { name: 'Collection chapters' })).getByRole('button', { name: /B.md/ });
    const demote = screen.getByRole('button', { name: 'Demote heading' });
    act(() => {
      b.click(); const before = buffer.snapshot();
      if (operation === 'undo') expect(undo(view)).toBe(true);
      if (operation === 'redo') expect(redo(view)).toBe(true);
      if (operation === 'heading toolbar') demote.click();
      if (operation === 'heading keyboard') view.contentDOM.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', ctrlKey: true, altKey: true, bubbles: true }));
      expect(buffer.snapshot()).toEqual(before);
    });
    expect(buffer.snapshot().text).toBe(bText); expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); }
});

it.each(['remap', 'same ID', 'collision', 'newer edit', 'cancel', 'failure', 'stale'] as const)('preserves editor ownership across Save As %s', async outcome => {
  const { s, buffer } = await setup(true);
  const held = deferred<SensibleOpenedDocument | null>();
  const save = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(held.promise);
  try {
    let target = 'saved-id';
    if (outcome === 'collision') { await s.switchChapter('B.md'); target = id(); await s.switchChapter('A.md'); }
    const old = await capture(s);
    if (outcome === 'same ID') target = id();
    await s.save();
    if (outcome === 'newer edit') await s.appendToEditor(' newer');
    if (outcome === 'stale') { await s.switchChapter('B.md'); await s.enterMode('Write'); }
    const before = buffer.snapshot();
    await act(async () => {
      if (outcome === 'failure') held.reject(new Error('save failed'));
      else held.resolve(outcome === 'cancel' ? null : { documentId: target, sessionId: 'saved-session', name: 'Saved.md', source: aText });
    });
    expect(buffer.snapshot().text).toBe(before.text); expect(buffer.snapshot().version).toBe(before.version);
    if (outcome === 'cancel' || outcome === 'failure') {
      expect(old.props.isActivationCurrent(old.origin.activation)).toBe(true);
      act(() => old.props.onChange(before.text + ' retry', old.origin));
      expect(buffer.snapshot().text).toBe(before.text + ' retry');
    } else {
      act(() => reject(old, buffer));
      if (outcome === 'newer edit') expect(s.isDirty()).toBe(true);
    }
    await s.appendToEditor(' fresh'); expect(buffer.snapshot().text).toContain(' fresh');
  } finally { s.unmount(); save.mockRestore(); }
});

it.each([false, true])('revokes old EditorView leases on mode and workspace remount (StrictMode=%s)', async strict => {
  const { s, buffer } = await setup(strict);
  const old = await capture(s);
  await s.enterMode('Read'); expect(old.origin.lease.live).toBe(false);
  const fresh = await capture(s);
  expect(fresh.origin.activation).toBe(old.origin.activation); expect(fresh.origin.lease).not.toBe(old.origin.lease);
  act(() => reject(old, buffer)); await s.appendToEditor(' fresh');
  s.unmount(); expect(fresh.origin.lease.live).toBe(false);
  const next = await setup(strict);
  try {
    const before = next.buffer.snapshot();
    act(() => { reject(old, buffer); reject(fresh, buffer); });
    expect(next.buffer.snapshot()).toEqual(before);
    await next.s.enterMode('Write'); await next.s.appendToEditor(' remounted');
    expect(next.buffer.snapshot().text).toBe(aText + ' remounted');
  } finally { next.s.unmount(); }
});

it.each(['dirty refusal', 'flush failure', 'success'] as const)('preserves or revokes editor ownership at Close Document %s', async outcome => {
  const { s, buffer } = await setup(true);
  try {
    const old = await capture(s);
    if (outcome === 'dirty refusal') await s.appendToEditor(' dirty');
    if (outcome === 'flush failure') s.desktop.failures.state = true;
    await click(s, 'Close document');
    if (outcome === 'success') {
      expect(screen.getByRole('heading', { name: 'No document open' })).toBeInTheDocument();
      act(() => reject(old, buffer)); expect(old.origin.lease.live).toBe(false);
    } else {
      expect(old.props.isActivationCurrent(old.origin.activation)).toBe(true);
      await s.appendToEditor(' still open'); expect(buffer.snapshot().text).toContain(' still open');
    }
  } finally { s.unmount(); }
});

it.each(['recovery', 'clean reload', 'conflict reload'] as const)('%s projects into CodeMirror without a second source publication', async operation => {
  const { s, buffer } = await setup(true);
  try {
    if (operation === 'recovery') {
      const a = id();
      s.desktop.recoveryLatest.set(a, { documentId: a, version: 77, source: '# Replacement', savedAt: '2026-01-01' });
      await s.switchChapter('B.md'); await s.switchChapter('A.md');
    } else { s.desktop.saveAsDialogResult = '/Saved.md'; await s.save(); }
    const old = await capture(s);
    if (operation === 'conflict reload') await s.appendToEditor(' dirty');
    const before = buffer.snapshot();
    const replace = vi.spyOn(buffer, 'replace');
    const publish = vi.spyOn(collection, 'replaceCollectionDocument');
    if (operation === 'recovery') await s.restoreRecovery();
    else {
      await act(async () => s.desktop.emitExternalChange('# Replacement'));
      if (operation === 'conflict reload') {
        expect(buffer.snapshot()).toEqual(before); await s.reloadFromDisk();
      }
    }
    expect(replace).toHaveBeenCalledExactlyOnceWith('# Replacement', operation === 'recovery' ? 'recovery' : 'external-reload');
    expect(buffer.snapshot().version).toBe(before.version + 1);
    expect(buffer.snapshot().isDirty).toBe(operation === 'recovery');
    expect(s.isDirty()).toBe(operation === 'recovery');
    expect(s.editorSource()).toBe('# Replacement'); expect(captured.props!.value).toBe('# Replacement');
    expect(publish.mock.calls.every(call => call[1] === id() && call[2] === '# Replacement')).toBe(true);
    expect(publish.mock.calls.length).toBeGreaterThan(0); // StrictMode may replay the pure updater.
    expect(captured.props!.activation).toBe(old.origin.activation);
    replace.mockRestore(); publish.mockRestore();
    await s.appendToEditor(' fresh'); expect(buffer.snapshot().text).toBe('# Replacement fresh');
  } finally { s.unmount(); vi.restoreAllMocks(); }
});

it.each(['pending Save As', 'reader not ready', 'OS preflight failure', 'window cancel'] as const)('%s leaves the current editor usable', async operation => {
  const { s, buffer } = await setup(true);
  const heldSave = deferred<SensibleOpenedDocument | null>();
  const heldReader = deferred<SensibleDocumentState | null>();
  try {
    if (operation === 'reader not ready') {
      vi.spyOn(s.desktop.api, 'loadDocumentState').mockReturnValueOnce(heldReader.promise);
      s.desktop.openDialogResult = '/Native.md'; await s.openDocument();
    }
    const old = await capture(s);
    if (operation === 'pending Save As') {
      vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(heldSave.promise); await s.save();
    }
    if (operation === 'OS preflight failure') {
      vi.spyOn(s.desktop.api, 'openOsDocument').mockRejectedValueOnce(new Error('open failed'));
      await act(async () => s.desktop.emitOsOpen('/Native.md'));
      expect(screen.getByRole('alert')).toHaveTextContent('Could not open');
    } else if (operation === 'window cancel') {
      await s.appendToEditor(' dirty');
      await act(async () => {
        const event = new Event('beforeunload', { cancelable: true }); window.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        s.desktop.closeDecisionListener?.({ id: 'cancel-editor', choice: 'cancel' });
      });
      expect(s.desktop.closeResults.at(-1)?.allow).toBe(false);
    } else {
      await click(s, 'Close document');
      expect(s.status()).toBe(operation === 'pending Save As'
        ? 'A save is still in progress. Close the document when it finishes.'
        : 'Reader state is still loading. Try closing again when it finishes.');
    }
    expect(old.props.isActivationCurrent(old.origin.activation)).toBe(true);
    await s.appendToEditor(' accepted'); expect(buffer.snapshot().text).toContain(' accepted');
    await act(async () => { heldSave.resolve(null); heldReader.resolve(null); });
  } finally { s.unmount(); vi.restoreAllMocks(); }
});
