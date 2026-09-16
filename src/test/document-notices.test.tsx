import { act, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { FakeDesktop } from './electron-double';
import { deferred } from './scheduler';

const savedAt = '2026-01-02T03:04:05Z';
const makeDesktop = () => {
  const desktop = new FakeDesktop().addFile('/A.md', '# Disk A').addFile('/B.md', '# Disk B');
  const documentId = desktop.documentIdFor('/A.md');
  desktop.recoveryLatest.set(documentId, { documentId, version: 1, source: '# Recovered A', savedAt });
  desktop.openDialogResult = '/A.md';
  return desktop;
};
const source = () => localStorage.getItem('sensiblemd-document');

it('preserves both alert DOMs, timestamp, control order and independent Keep/Restore/Reload semantics', async () => {
  const desktop = makeDesktop();
  const s = await startScenario({ desktop, home: true });
  try {
    await s.openDocument();
    const recovery = document.querySelector<HTMLElement>('.recovery-notice')!;
    expect(recovery).toHaveAttribute('role', 'alert');
    expect(recovery).not.toHaveAttribute('aria-live');
    expect(recovery.querySelector('strong')).toHaveTextContent('Unsaved changes are available.');
    expect(recovery.querySelector('p')).toHaveTextContent(`A recovery snapshot from ${new Date(savedAt).toLocaleString()} differs from this document.`);
    expect(source()).toBe('# Disk A');
    await s.enterMode('Write');
    await s.appendToEditor('\nUnsaved edit.');
    await act(async () => desktop.emitExternalChange('# New disk A'));
    const external = document.querySelector<HTMLElement>('.external-change-notice')!;
    expect(external.nextElementSibling).toBe(recovery);
    expect(external.previousElementSibling).toHaveClass('reader-toolbar');
    expect(external.parentElement).toHaveClass('main-area');
    expect(recovery.parentElement).toBe(external.parentElement);
    expect(recovery.compareDocumentPosition(document.querySelector('.editor-layout')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(external).toHaveAttribute('role', 'alert');
    expect(external).not.toHaveAttribute('aria-live');
    expect(external.querySelector('strong')).toHaveTextContent('This file changed outside SensibleMD.');
    expect(external.querySelector('p')).toHaveTextContent('Your unsaved edits are still intact. Choose which version to keep.');
    for (const [notice, names] of [[external, ['Keep editing', 'Reload from disk']], [recovery, ['Discard recovery', 'Restore changes']]] as const) {
      expect([...notice.children].map(e => e.tagName)).toEqual(['STRONG', 'P', 'DIV']);
      const buttons = within(notice).getAllByRole('button');
      expect(buttons.map(b => b.textContent)).toEqual(names);
      for (const button of buttons) { expect(button).toHaveAttribute('type', 'button'); expect(button).toBeEnabled(); }
    }
    const originalStatus = s.status();
    await s.user.click(within(external).getByRole('button', { name: 'Keep editing' }));
    expect(external).not.toBeInTheDocument();
    expect(recovery).toBeInTheDocument();
    expect(source()).toBe('# Disk A\nUnsaved edit.');
    expect(s.isDirty()).toBe(true);
    expect(s.status()).toBe(originalStatus);
    await act(async () => desktop.emitExternalChange('# New disk A'));
    await s.restoreRecovery();
    expect(recovery).not.toBeInTheDocument();
    expect(document.querySelector('.external-change-notice')).not.toBeNull();
    expect(source()).toBe('# Recovered A');
    expect(s.isDirty()).toBe(true);
    expect(s.status()).toBe('Recovered unsaved changes. Save when ready.');
    await s.reloadFromDisk();
    expect(document.querySelector('.external-change-notice')).toBeNull();
    expect(source()).toBe('# New disk A');
    expect(s.isDirty()).toBe(false);
    expect(s.currentMode()).toBe('Write');
    expect(s.status()).toBe('Recovered unsaved changes. Save when ready.'); // Reload does not replace status.
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', desktop.documentIdFor('/A.md'));
    expect(desktop.writes).toHaveLength(0);
  } finally { s.unmount(); }
});

it('retains recovery alert and enabled actions on failed discard, then removes it on successful retry without clearing status', async () => {
  const desktop = makeDesktop();
  const s = await startScenario({ desktop, home: true });
  try {
    await s.openDocument();
    desktop.failures.recovery = true;
    await s.discardRecovery();
    expect(s.status()).toBe('Recovery could not be discarded. Please try again.');
    expect(screen.getByRole('button', { name: 'Discard recovery' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Restore changes' })).toBeEnabled();
    desktop.failures.recovery = false;
    await s.discardRecovery();
    expect(document.querySelector('.recovery-notice')).toBeNull();
    expect(source()).toBe('# Disk A');
    expect(s.isDirty()).toBe(false);
    expect(s.status()).toBe('Recovery could not be discarded. Please try again.');
    expect(desktop.recoveryLatest.has(desktop.documentIdFor('/A.md'))).toBe(false);
  } finally { s.unmount(); }
});

it('applies clean external changes without a notice and ignores events for the previous native file', async () => {
  const desktop = new FakeDesktop().addFile('/A.md', '# A').addFile('/B.md', '# B');
  desktop.openDialogResult = '/A.md';
  const s = await startScenario({ desktop, home: true });
  try {
    await s.openDocument();
    const status = s.status();
    await act(async () => desktop.emitExternalChange('# A'));
    expect(document.querySelector('.external-change-notice')).toBeNull();
    await act(async () => desktop.emitExternalChange('# Changed A'));
    expect(source()).toBe('# Changed A');
    expect(s.isDirty()).toBe(false);
    expect(document.querySelector('.external-change-notice')).toBeNull();
    expect(s.status()).toBe(status);
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    await act(async () => desktop.emitExternalChange('# Old A event', '/A.md'));
    expect(source()).toBe('# B');
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', desktop.documentIdFor('/B.md'));
    expect(document.querySelector('.external-change-notice')).toBeNull();
  } finally { s.unmount(); }
});

it('does not surface a late recovery response after switching the active native document', async () => {
  const desktop = makeDesktop();
  const late = deferred<{ documentId: string; version: number; source: string; savedAt: string } | null>();
  const load = vi.spyOn(desktop.api, 'loadRecoverySnapshot').mockImplementationOnce(() => late.promise);
  const s = await startScenario({ desktop, home: true });
  try {
    await s.openDocument();
    desktop.openDialogResult = '/B.md'; await s.openDocument();
    await act(async () => late.resolve({ documentId: desktop.documentIdFor('/A.md'), version: 1, source: '# Late A', savedAt }));
    expect(document.querySelector('.recovery-notice')).toBeNull();
    expect(source()).toBe('# Disk B');
    expect(s.isDirty()).toBe(false);
  } finally { load.mockRestore(); s.unmount(); }
});

it('reports a failed recovery check without displaying a recovery notice', async () => {
  const desktop = makeDesktop(); desktop.failures.recovery = true;
  const s = await startScenario({ desktop, home: true });
  try {
    await s.openDocument();
    expect(s.status()).toBe('Recovery check is temporarily unavailable.');
    expect(document.querySelector('.recovery-notice')).toBeNull();
    expect(source()).toBe('# Disk A');
  } finally { s.unmount(); }
});
