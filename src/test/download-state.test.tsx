import { act, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DocumentBuffer } from '../core/document-buffer'
import { startScenario } from './scenario'

async function browserScenario() {
  const s = await startScenario()
  // Retain recovery APIs to prove export does not clear them, but remove native saving.
  Reflect.deleteProperty(s.desktop.api, 'saveOpenedDocument')
  Reflect.deleteProperty(s.desktop.api, 'saveDocumentAs')
  await s.enterMode('Write')
  return s
}

describe('Download copy state', () => {
  it('preserves edited source, identity, saved baseline, dirty state and recovery', async () => {
    const snapshots = vi.spyOn(DocumentBuffer.prototype, 'snapshot')
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const s = await browserScenario()
    try {
      await s.appendToEditor('\n\nUnsaved export edits.')
      const buffer = snapshots.mock.contexts.at(-1)!
      if (!(buffer instanceof DocumentBuffer)) throw new Error("Active document buffer was not observed")
      const before = buffer.snapshot()
      const shell = document.querySelector('.app-shell')!
      const identity = shell.getAttribute('data-document-id')
      const session = shell.getAttribute('data-session-id')
      const name = s.documentName()
      const path = s.desktop.authorizedPath
      await s.desktop.api.saveRecoverySnapshot({ documentId: identity!, version: before.version, source: before.text })
      const recovery = s.desktop.recoveryLatest.get(identity!)
      const button = screen.getByRole('button', { name: 'Download copy' })
      expect(button).toHaveAttribute('title', 'Download copy')
      expect(button.querySelector('.lucide-download')).toBeInTheDocument()
      await s.user.click(button)
      expect(click).toHaveBeenCalledOnce()
      expect(buffer.snapshot()).toEqual(before)
      expect(s.editorSource()).toBe(before.text)
      expect(s.isDirty()).toBe(true)
      expect(shell.getAttribute('data-document-id')).toBe(identity)
      expect(shell.getAttribute('data-session-id')).toBe(session)
      expect(s.documentName()).toBe(name)
      expect(s.desktop.authorizedPath).toBe(path)
      expect(s.desktop.recoveryLatest.get(identity!)).toEqual(recovery)
      expect(s.desktop.recoveryRequests.some(r => r.operation === 'clear')).toBe(false)
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      expect(s.status()).toBe('Download requested. The original file is unchanged.')
    } finally { s.unmount(); snapshots.mockRestore(); click.mockRestore() }
  })
  it('leaves a clean document clean after Download', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const s = await browserScenario()
    try {
      await s.user.click(screen.getByRole('button', { name: 'Download copy' }))
      expect(s.isDirty()).toBe(false)
      expect(screen.getByText('No unsaved changes')).toBeInTheDocument()
    } finally { s.unmount(); click.mockRestore() }
  })
  it('uses a save icon for native Save and updates status after saving', async () => {
    const s = await startScenario()
    try {
      s.desktop.addFile('/Native.md', '# Original')
      s.desktop.openDialogResult = '/Native.md'
      await s.openDocument()
      const button = screen.getByRole('button', { name: 'Save' })
      expect(button).toHaveAttribute('title', 'Save')
      expect(button.querySelector('.lucide-save')).toBeInTheDocument()
      expect(button).toBeDisabled()
      const download = screen.getByRole('button', { name: 'Download copy' })
      expect(download).toHaveAttribute('title', 'Download copy')
      expect(download.querySelector('.lucide-download')).toBeInTheDocument()
      expect(download).toBeEnabled()
      await s.enterMode('Write'); await s.appendToEditor('\n\nEdit')
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      await s.save()
      expect(screen.getByText('No unsaved changes')).toBeInTheDocument()
      expect(s.isDirty()).toBe(false)
    } finally { s.unmount() }
  })
})


it('Download copy from a native dirty document preserves disk, identity, dirty state and recovery', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const s = await startScenario();
  try {
    s.desktop.addFile('/Original.md', '# Original');
    s.desktop.openDialogResult = '/Original.md';
    await s.openDocument(); await s.enterMode('Write'); await s.appendToEditor(' edited');
    const id = s.desktop.documentIdFor('/Original.md');
    const session = document.querySelector('.app-shell')!.getAttribute('data-session-id');
    await s.desktop.api.saveRecoverySnapshot({ documentId: id, version: 1, source: s.editorSource() });
    const recovery = s.desktop.recoveryLatest.get(id);
    await s.user.click(screen.getByRole('button', { name: 'Download copy' }));
    expect(click).toHaveBeenCalledOnce();
    expect(s.desktop.diskContents('/Original.md')).toBe('# Original');
    expect(s.desktop.authorizedPath).toBe('/Original.md');
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', id);
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-session-id', session);
    expect(s.isDirty()).toBe(true);
    expect(s.desktop.recoveryLatest.get(id)).toEqual(recovery);
    expect(s.desktop.recoveryRequests.some(r => r.operation === 'clear')).toBe(false);
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await s.save();
    expect(s.desktop.diskContents('/Original.md')).toBe('# Original edited');
    expect(s.isDirty()).toBe(false);
  } finally { s.unmount(); click.mockRestore(); }
});

it('Save without native support stays distinct and Cmd+S never downloads a copy', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const s = await browserScenario();
  try {
    await s.appendToEditor(' edited');
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    expect(save).toHaveAttribute('title', 'Save');
    expect(save.querySelector('.lucide-save')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download copy' })).toBeEnabled();
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', metaKey: true, bubbles: true, cancelable: true })));
    expect(click).not.toHaveBeenCalled();
    expect(s.isDirty()).toBe(true);
    expect(s.status()).toMatch(/Saving is unavailable/);
  } finally { s.unmount(); click.mockRestore(); }
});

it('palette has separate Save and Download copy commands with the shortcut only on Save', async () => {
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  const s = await startScenario();
  try {
    await s.enterMode('Write'); await s.appendToEditor(' edited');
    await s.user.click(screen.getByRole('button', { name: 'Show command palette' }));
    const palette = within(await screen.findByRole('dialog', { name: 'Command palette' }));
    const save = palette.getByRole('button', { name: /Save\s*file\.save/ });
    const download = palette.getByRole('button', { name: /Download copy\s*file\.downloadCopy/ });
    expect(save.querySelector('strong')).toHaveTextContent(/^Save$/);
    expect(save.querySelector('kbd')).toHaveTextContent('Cmd/Ctrl+S');
    expect(download.querySelector('kbd')).toBeNull();
    await s.user.click(download);
    expect(click).toHaveBeenCalledOnce();
    expect(s.isDirty()).toBe(true);
    expect(s.desktop.writes).toHaveLength(0);
    s.desktop.saveAsDialogResult = '/Saved.md';
    await s.user.click(screen.getByRole('button', { name: 'Show command palette' }));
    await s.user.click(within(await screen.findByRole('dialog', { name: 'Command palette' })).getByRole('button', { name: /Save\s*file\.save/ }));
    await s.settle();
    expect(s.desktop.authorizedPath).toBe('/Saved.md');
    expect(s.isDirty()).toBe(false);
    expect(click).toHaveBeenCalledOnce();
  } finally { s.unmount(); click.mockRestore(); }
});
