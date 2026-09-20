import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';
import { WELCOME_DOCUMENT_ID } from '../core/identity';
import { parseSemanticDocument } from '../core/semantic-document';

const source = '# First\n\nFirst paragraph.\n\n## Second\n\nSecond paragraph.';
const model = parseSemanticDocument(source, 0);
const first = model.headings[0].id;
const second = model.headings[1].id;
const close = async (user: Awaited<ReturnType<typeof startScenario>>['user']) => {
  await user.click(screen.getByRole('button', { name: 'Close document' }));
};

it('builds equal debounce/final payloads after heading, ordered bookmark and preference changes', async () => {
  const desktop = new FakeDesktop();
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('Second');
    await s.user.click(screen.getByRole('button', { name: 'Bookmark' }));
    await s.clickOutlineHeading('First');
    await s.user.click(screen.getByRole('button', { name: 'Bookmark' }));
    await s.user.click(screen.getByRole('button', { name: 'Reading settings' }));
    for (const [i, value] of ['125', '2.1', '900'].entries()) fireEvent.change(screen.getAllByRole('slider')[i], { target: { value } });
    await s.user.click(screen.getByRole('checkbox', { name: 'Reduce motion' }));
    await waitFor(() => expect(save.mock.lastCall?.[0]).toMatchObject({ bookmarks: [second, first], fontScale: 125, lineHeight: 2.1, contentWidth: 900, reducedMotion: true }), { timeout: 1500 });
    const debounced = save.mock.lastCall![0];
    expect(Object.keys(debounced)).toEqual(['documentId', 'bookmarks', 'activeHeading', 'position', 'fontScale', 'lineHeight', 'contentWidth', 'reducedMotion']);
    expect(debounced).toStrictEqual({
      documentId: s.welcomeDocumentId, bookmarks: [second, first], activeHeading: first,
      position: { nodeId: first, nodeFingerprint: 'heading:first', headingPath: ['First'], textAnchor: { exact: 'first', prefix: 'first', suffix: 'first' } },
      fontScale: 125, lineHeight: 2.1, contentWidth: 900, reducedMotion: true,
    });
    const count = save.mock.calls.length;
    await close(s.user);
    expect(screen.getByText('No document open')).toBeInTheDocument();
    expect(save.mock.calls).toHaveLength(count + 1);
    expect(save.mock.lastCall![0]).toStrictEqual(debounced);
  } finally { save.mockRestore(); s.unmount(); }
});

it('retains paragraph position independently of its heading and scopes switched-document payloads', async () => {
  const desktop = new FakeDesktop().addFile('/B.md', source);
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop });
  try {
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    await s.enterMode('Write'); await s.moveEditorCursorToLine(7); await s.enterMode('Read');
    const paragraph = model.navigableNodes.find(n => n.type === 'paragraph' && n.range.line === 7)!;
    await waitFor(() => expect(save.mock.lastCall?.[0].position?.nodeId).toBe(paragraph.id), { timeout: 1500 });
    const debounced = save.mock.lastCall![0];
    expect(debounced.documentId).toBe(desktop.documentIdFor('/B.md'));
    expect(debounced.activeHeading).toBe(second);
    expect(debounced.position).toStrictEqual({ nodeId: paragraph.id, nodeFingerprint: 'paragraph:second paragraph.', headingPath: ['First', 'Second'], textAnchor: { exact: 'second paragraph', prefix: 'second paragraph.', suffix: 'second paragraph.' } });
    await close(s.user);
    expect(save.mock.lastCall![0]).toStrictEqual(debounced);
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { save.mockRestore(); s.unmount(); }
});

it('includes an own undefined position for an empty model and preserves raw out-of-range preferences', async () => {
  const desktop = new FakeDesktop(); const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': '', 'sensiblemd-font-scale': '190', 'sensiblemd-line-height': '0.9', 'sensiblemd-content-width': '1200' } });
  try {
    await waitFor(() => expect(save).toHaveBeenCalled(), { timeout: 1500 });
    const debounced = save.mock.lastCall![0];
    expect(debounced).toStrictEqual({ documentId: s.welcomeDocumentId, bookmarks: [], activeHeading: '', position: undefined, fontScale: 190, lineHeight: 0.9, contentWidth: 1200, reducedMotion: false });
    expect(Object.hasOwn(debounced, 'position')).toBe(true);
    await close(s.user);
    expect(save.mock.lastCall![0]).toStrictEqual(debounced);
  } finally { save.mockRestore(); s.unmount(); }
});

it('waits for hydration, then preserves independent location and preference hydration in the final payload', async () => {
  const desktop = new FakeDesktop();
  const pending = deferred<SensibleDocumentState | null>();
  const load = vi.spyOn(desktop.api, 'loadDocumentState').mockImplementationOnce(() => pending.promise);
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('Second');
    await s.user.click(screen.getByRole('button', { name: 'Bookmark' }));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 550)); });
    expect(save).not.toHaveBeenCalled();
    const before = save.mock.calls.length;
    await close(s.user);
    expect(s.status()).toBe('Reader state is still loading. Try closing again when it finishes.');
    expect(save.mock.calls).toHaveLength(before);
    await act(async () => pending.resolve({ schemaVersion: 1, documentId: s.welcomeDocumentId, bookmarks: [first], activeHeading: first, fontScale: 140, lineHeight: 2, contentWidth: 880, reducedMotion: true }));
    await waitFor(() => expect(save.mock.lastCall?.[0]).toMatchObject({ activeHeading: second, bookmarks: [first], fontScale: 140, lineHeight: 2, contentWidth: 880, reducedMotion: true }), { timeout: 1500 });
    const debounced = save.mock.lastCall![0];
    expect(debounced.position?.nodeId).toBe(second);
    await close(s.user);
    expect(save.mock.lastCall![0]).toStrictEqual(debounced);
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { load.mockRestore(); save.mockRestore(); s.unmount(); }
});

it('drains a pending debounce write before constructing the equivalent final close payload', async () => {
  const desktop = new FakeDesktop(); const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    desktop.scheduler.useManualOrder();
    await s.clickOutlineHeading('Second');
    await waitFor(() => expect(desktop.scheduler.pending('state:save')).toHaveLength(1), { timeout: 1500 });
    const count = save.mock.calls.length;
    const debounced = save.mock.lastCall![0];
    await close(s.user);
    expect(save.mock.calls).toHaveLength(count);
    expect(screen.getByRole('button', { name: 'Close document' })).toBeDisabled();
    await act(async () => desktop.scheduler.release('state:save'));
    expect(save.mock.calls).toHaveLength(count + 1);
    expect(save.mock.lastCall![0]).toStrictEqual(debounced);
    expect(screen.queryByText('No document open')).toBeNull();
    await act(async () => desktop.scheduler.release('state:save'));
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { desktop.scheduler.useAutomaticOrder(); save.mockRestore(); s.unmount(); }
});

it('persists the existing resolved document-start fallback after stale-position hydration in both paths', async () => {
  const desktop = new FakeDesktop();
  desktop.documentState.set(WELCOME_DOCUMENT_ID, {
    schemaVersion: 1, documentId: WELCOME_DOCUMENT_ID, bookmarks: [], activeHeading: 'missing-heading',
    position: { nodeId: 'missing-node', nodeFingerprint: 'paragraph:missing', headingPath: ['Gone'], textAnchor: { exact: 'missing', prefix: '', suffix: '' } },
    fontScale: 100, lineHeight: 1.72, contentWidth: 760, reducedMotion: false,
  });
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const s = await startScenario({ desktop, storage: { 'sensiblemd-document': source } });
  try {
    await waitFor(() => expect(save.mock.lastCall?.[0].position?.nodeId).toBe(first), { timeout: 1500 });
    const debounced = save.mock.lastCall![0];
    expect(debounced.activeHeading).toBe(first);
    await close(s.user);
    expect(save.mock.lastCall![0]).toStrictEqual(debounced);
  } finally { save.mockRestore(); s.unmount(); }
});
