import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startScenario } from './scenario'
import { FakeDesktop } from './electron-double'

async function setup() {
  const desktop = new FakeDesktop().addFile('/A.md', '# Disk A').addFile('/B.md', '# Disk B')
  const id = desktop.documentIdFor('/A.md')
  const b = desktop.documentIdFor('/B.md')
  for (const documentId of [id, b]) {
    const record = { documentId, version: 1, source: '# Recovered edits', savedAt: new Date().toISOString() }
    desktop.recoveryLatest.set(documentId, record)
    desktop.recoveryPrevious.set(documentId, record)
  }
  const s = await startScenario({ desktop, home: true })
  desktop.openDialogResult = '/A.md'
  await s.openDocument(); await s.settle()
  return { s, desktop, id, b }
}

describe('persisted recovery deletion', () => {
  it('Discard removes both snapshots for A, preserves B, and stays discarded after restart', async () => {
    const { s, desktop, id, b } = await setup()
    try {
      expect(screen.getByRole('button', { name: 'Discard recovery' })).toBeInTheDocument()
      await s.discardRecovery()
      expect(desktop.recoveryLatest.has(id)).toBe(false)
      expect(desktop.recoveryPrevious.has(id)).toBe(false)
      expect(desktop.recoveryLatest.has(b)).toBe(true)
      expect(desktop.recoveryPrevious.has(b)).toBe(true)
      expect(screen.queryByRole('button', { name: 'Discard recovery' })).not.toBeInTheDocument()
    } finally { s.unmount() }
    // A new renderer and bridge retain only the fake desktop's persisted records.
    localStorage.clear()
    const restarted = await startScenario({ desktop, home: true })
    try {
      desktop.openDialogResult = '/A.md'; await restarted.openDocument()
      expect(screen.queryByRole('button', { name: 'Discard recovery' })).not.toBeInTheDocument()
    } finally { restarted.unmount() }
  })
  it('successful direct Save deletes recovery without affecting B', async () => {
    const { s, desktop, id, b } = await setup()
    try {
      await s.restoreRecovery(); await s.save()
      expect(desktop.recoveryLatest.has(id)).toBe(false)
      expect(desktop.recoveryPrevious.has(id)).toBe(false)
      expect(desktop.recoveryLatest.has(b)).toBe(true)
      expect(s.isDirty()).toBe(false)
    } finally { s.unmount() }
  })
  it('Save As clears recovery only when the dialog succeeds', async () => {
    const s = await startScenario()
    try {
      const id = s.welcomeDocumentId
      await s.desktop.api.saveRecoverySnapshot({ documentId: id, version: 1, source: '# Unsaved' })
      await s.save()
      expect(s.desktop.recoveryLatest.has(id)).toBe(true)
      s.desktop.saveAsDialogResult = '/Saved.md'
      await s.save()
      expect(s.desktop.recoveryLatest.has(id)).toBe(false)
    } finally { s.unmount() }
  })
  it('keeps the prompt until deletion succeeds and retains it on failure', async () => {
    const { s, desktop, id } = await setup()
    try {
      desktop.scheduler.useManualOrder()
      await s.discardRecovery()
      expect(screen.getByRole('button', { name: 'Discard recovery' })).toBeInTheDocument()
      desktop.failures.recovery = true
      await act(async () => desktop.scheduler.release('recovery:clear'))
      expect(desktop.recoveryLatest.has(id)).toBe(true)
      expect(screen.getByRole('button', { name: 'Discard recovery' })).toBeInTheDocument()
      expect(s.status()).toContain('could not be discarded')
    } finally { s.unmount() }
  })
  it('failed Save preserves recovery', async () => {
    const { s, desktop, id } = await setup()
    try {
      await s.restoreRecovery()
      desktop.failures.save = true
      await s.save()
      expect(desktop.recoveryLatest.has(id)).toBe(true)
      expect(s.isDirty()).toBe(true)
    } finally { s.unmount() }
  })
  it('retains newer unsaved recovery when edits arrive during Save', async () => {
    const { s, desktop, id } = await setup()
    try {
      await s.restoreRecovery()
      await s.enterMode('Write')
      desktop.scheduler.useManualOrder()
      await s.save()
      await s.appendToEditor(' newer edits')
      await act(async () => desktop.scheduler.useAutomaticOrder())
      expect(desktop.recoveryLatest.has(id)).toBe(true)
      expect(s.isDirty()).toBe(true)
      expect(desktop.recoveryRequests.some(r => r.operation === 'clear')).toBe(false)
    } finally { s.unmount() }
  })
  it('reports cleanup failure separately from successful file saving', async () => {
    const { s, desktop, id } = await setup()
    try {
      await s.restoreRecovery()
      desktop.failures.recovery = true
      await s.save()
      expect(s.isDirty()).toBe(false)
      expect(desktop.recoveryLatest.has(id)).toBe(true)
      expect(s.status()).toContain('Saved, but recovery data could not be cleared')
    } finally { s.unmount() }
  })

})
