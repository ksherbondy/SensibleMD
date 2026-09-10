import { screen } from '@testing-library/react'
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
      const button = screen.getByRole('button', { name: 'Save Markdown file' })
      expect(button).toHaveAttribute('title', 'Save Markdown file')
      expect(button.querySelector('.lucide-save')).toBeInTheDocument()
      await s.enterMode('Write'); await s.appendToEditor('\n\nEdit')
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
      await s.save()
      expect(screen.getByText('No unsaved changes')).toBeInTheDocument()
      expect(s.isDirty()).toBe(false)
    } finally { s.unmount() }
  })
})
