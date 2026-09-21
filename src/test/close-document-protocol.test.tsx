import { act, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import * as commands from '../core/workspace-commands';
import { WELCOME_DOCUMENT_ID } from '../core/identity';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';
import { startScenario } from './scenario';

// Observe the real workspace action passed to the existing command catalog.
// Nothing substitutes its implementation or adds a production test interface.
async function setup(options: Parameters<typeof startScenario>[0] = {}) {
  const catalog = vi.spyOn(commands, 'createWorkspaceCommands');
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ storage: { 'sensiblemd-document': '# A\n\n## Second' }, ...options });
  const buffer = reads.mock.contexts.find(value => value instanceof DocumentBuffer);
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  reads.mockRestore();
  const close = () => catalog.mock.lastCall![0].actions.closeDocument as unknown as (completed?: () => void) => Promise<boolean>;
  return { s, buffer, close, restore: () => { s.unmount(); catalog.mockRestore(); } };
}

it.each(['buffer only', 'React only'] as const)('refuses dirty state from %s without writing or closing', async owner => {
  const { s, buffer, close, restore } = await setup();
  const save = vi.spyOn(s.desktop.api, 'saveDocumentState');
  const clear = vi.spyOn(s.desktop.api, 'clearRecoverySnapshot');
  try {
    if (owner === 'buffer only') { buffer.replace('# Buffer edit', 'programmatic'); expect(s.isDirty()).toBe(false); }
    else { await s.enterMode('Write'); await s.appendToEditor(' edit'); buffer.markSaved(); expect(buffer.snapshot().isDirty).toBe(false); }
    let result: boolean | undefined;
    await act(async () => { result = await close()(); });
    expect(result).toBe(false);
    expect(s.status()).toBe('Save your changes before closing this document.');
    expect(save).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled();
    expect(screen.queryByText('No document open')).toBeNull();
  } finally { restore(); save.mockRestore(); clear.mockRestore(); }
});

it('rejects a second close immediately through closingRef and completes the first callback exactly once', async () => {
  const { s, close, restore } = await setup();
  const flush = deferred<SensibleDocumentState>(); const completed = vi.fn();
  const save = vi.spyOn(s.desktop.api, 'saveDocumentState').mockReturnValueOnce(flush.promise);
  try {
    let first!: Promise<boolean>, second!: Promise<boolean>;
    await act(async () => { const action = close(); first = action(completed); second = action(completed); });
    expect(await second).toBe(false); expect(completed).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Close document' })).toBeDisabled();
    await act(async () => flush.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 }));
    expect(await first).toBe(true); expect(completed).toHaveBeenCalledTimes(1);
    // Optional completion callback is also used by prepareOpen; it need not unmount.
    expect(screen.getByRole('button', { name: 'Close document' })).toBeEnabled();
    expect(screen.queryByText('No document open')).toBeNull();
  } finally { restore(); save.mockRestore(); }
});

it('permits close with no desktop metadata API and still returns true', async () => {
  const { s, close, restore } = await setup();
  const save = s.desktop.api.saveDocumentState;
  try {
    Reflect.deleteProperty(s.desktop.api, 'saveDocumentState');
    let result: boolean | undefined;
    await act(async () => { result = await close()(); });
    expect(result).toBe(true); expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { s.desktop.api.saveDocumentState = save; restore(); }
});

it('catches a synchronous final-flush exception, resets closing, and succeeds on retry', async () => {
  const { s, close, restore } = await setup();
  const save = vi.spyOn(s.desktop.api, 'saveDocumentState').mockImplementationOnce(() => { throw new Error('sync failure'); });
  try {
    let result: boolean | undefined;
    await act(async () => { result = await close()(); });
    expect(result).toBe(false);
    expect(s.status()).toBe('Reader state could not be saved. The document is still open.');
    expect(screen.getByRole('button', { name: 'Close document' })).toBeEnabled();
    await act(async () => { result = await close()(); });
    expect(result).toBe(true); expect(save).toHaveBeenCalledTimes(2);
    expect(screen.getByText('No document open')).toBeInTheDocument();
  } finally { restore(); save.mockRestore(); }
});

it.each([false, true])('closes to Home without deleting recovery or reader memory and mounts a fresh next buffer (StrictMode=%s)', async strictMode => {
  const desktop = new FakeDesktop().addFile('/B.md', '# B');
  const recovery = { documentId: WELCOME_DOCUMENT_ID, version: 1, source: '# Recover A', savedAt: '2026-01-01T00:00:00Z' };
  desktop.recoveryLatest.set(WELCOME_DOCUMENT_ID, recovery);
  const clear = vi.spyOn(desktop.api, 'clearRecoverySnapshot');
  const save = vi.spyOn(desktop.api, 'saveDocumentState');
  const { s, buffer, close, restore } = await setup({ desktop, strictMode, storage: { 'sensiblemd-document': '# A\n\n## Second' } });
  try {
    await s.clickOutlineHeading('Second');
    expect(screen.getByRole('button', { name: 'Restore changes' })).toBeInTheDocument();
    const memory = localStorage.getItem('sensiblemd-reader-memory');
    const source = localStorage.getItem('sensiblemd-document');
    let result: boolean | undefined;
    await act(async () => { result = await close()(); });
    expect(result).toBe(true); expect(screen.getByText('No document open')).toBeInTheDocument();
    expect(document.querySelector('.app-shell')).not.toHaveAttribute('data-document-id');
    expect(screen.queryByRole('group', { name: 'Document mode' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Restore changes' })).toBeNull();
    expect(desktop.closeDecisionListener).toBeUndefined();
    expect(clear).not.toHaveBeenCalled(); expect(desktop.recoveryLatest.get(WELCOME_DOCUMENT_ID)).toEqual(recovery);
    expect(localStorage.getItem('sensiblemd-reader-memory')).toBe(memory);
    expect(localStorage.getItem('sensiblemd-document')).toBe(source);
    expect(save.mock.lastCall![0].documentId).toBe(WELCOME_DOCUMENT_ID);
    expect(save.mock.lastCall![0].activeHeading).toBeTruthy();
    desktop.emitExternalChange('# Obsolete external update'); await s.settle();
    expect(screen.getByText('No document open')).toBeInTheDocument();
    const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
    try {
      desktop.openDialogResult = '/B.md'; await s.openDocument();
      const next = reads.mock.contexts.find(value => value instanceof DocumentBuffer);
      expect(next).toBeInstanceOf(DocumentBuffer); expect(next).not.toBe(buffer);
      expect(s.documentName()).toBe('B.md'); expect(s.isDirty()).toBe(false);
      expect(desktop.closeDecisionListener).toBeTypeOf('function');
      expect(screen.queryByRole('button', { name: 'Restore changes' })).toBeNull();
      await s.enterMode('Write'); expect(s.editorSource()).toBe('# B');
    } finally { reads.mockRestore(); }
  } finally { restore(); clear.mockRestore(); save.mockRestore(); }
});

it.each(['drain', 'final flush'] as const)('unmount during %s invalidates the pending close without closing a remounted workspace', async phase => {
  const desktop = new FakeDesktop(); const held = deferred<SensibleDocumentState>();
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockReturnValueOnce(held.promise);
  const { s, close, restore } = await setup({ desktop, strictMode: true });
  let pending!: Promise<boolean>; const completed = vi.fn();
  if (phase === 'drain') await waitFor(() => expect(save).toHaveBeenCalledTimes(1), { timeout: 1500 });
  await act(async () => { pending = close()(completed); });
  expect(save).toHaveBeenCalledTimes(1);
  restore();
  const b = await startScenario({ desktop, strictMode: true, storage: { 'sensiblemd-document': '# B', 'sensiblemd-name': 'B.md' } });
  try {
    const status = b.status();
    await act(async () => held.resolve({ ...save.mock.calls[0][0], schemaVersion: 1 }));
    expect(await pending).toBe(false); expect(completed).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalledTimes(1); expect(b.documentName()).toBe('B.md'); expect(b.status()).toBe(status);
    expect(screen.queryByText('No document open')).toBeNull();
    expect(s.desktop).toBe(desktop);
  } finally { b.unmount(); save.mockRestore(); }
});

it('does not authorize an OS replacement until close preparation flush succeeds, and retries after failure', async () => {
  const desktop = new FakeDesktop().addFile('/B.md', '# B');
  const flush = deferred<SensibleDocumentState>();
  const save = vi.spyOn(desktop.api, 'saveDocumentState').mockReturnValueOnce(flush.promise);
  const open = vi.spyOn(desktop.api, 'openOsDocument');
  const ack = vi.spyOn(desktop.api, 'completeOsOpen');
  const { s, restore } = await setup({ desktop });
  try {
    await act(async () => desktop.emitOsOpen('/B.md'));
    expect(open).not.toHaveBeenCalled(); expect(ack).not.toHaveBeenCalled();
    expect(screen.queryByText('No document open')).toBeNull();
    await act(async () => flush.reject(new Error('flush failure')));
    expect(s.status()).toBe('Reader state could not be saved. The document is still open.');
    expect(open).not.toHaveBeenCalled(); expect(ack).toHaveBeenCalledTimes(1);
    await act(async () => desktop.emitOsOpen('/B.md'));
    await s.settle();
    expect(open).toHaveBeenCalledTimes(1); expect(ack).toHaveBeenCalledTimes(2);
    expect(s.documentName()).toBe('B.md'); expect(s.isDirty()).toBe(false);
  } finally { restore(); save.mockRestore(); open.mockRestore(); ack.mockRestore(); }
});
