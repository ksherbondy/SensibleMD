import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startScenario } from './scenario'

const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id')!
const session = () => document.querySelector('.app-shell')!.getAttribute('data-session-id')
const debounce = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 1600)) }) }

async function setup(native = false) {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# Original', 'sensiblemd-name': 'Original.md' } })
  s.desktop.addFile('/Original.md', '# Original')
  if (native) { s.desktop.openDialogResult = '/Original.md'; await s.openDocument() }
  await s.enterMode('Write'); await s.appendToEditor('\n\nSaved copy')
  const oldId = id()
  await s.desktop.api.saveRecoverySnapshot({ documentId: oldId, version: 1, source: s.editorSource() })
  s.desktop.saveAsDialogResult = '/New.md'
  return { s, oldId }
}

describe('Save As adoption', () => {
  it('adopts identity, session, collection name, Recents and direct saving without creating clean recovery', async () => {
    const { s, oldId } = await setup()
    try {
      await s.save()
      const newId = s.desktop.documentIdFor('/New.md')
      expect(id()).toBe(newId)
      expect(session()).toBe(s.desktop.sessions.at(-1)!.sessionId)
      expect(s.documentName()).toBe('New.md')
      expect(s.desktop.authorizedPath).toBe('/New.md')
      expect(s.desktop.recents[0]).toBe('/New.md')
      expect(s.desktop.recoveryLatest.has(oldId)).toBe(false)
      expect(s.isDirty()).toBe(false)
      await debounce()
      expect(s.desktop.recoveryLatest.has(newId)).toBe(false)
      expect(s.desktop.recoveryRequests.some(r => r.operation === 'save' && r.documentId === newId)).toBe(false)
      await s.appendToEditor('\n\nNewer editing')
      await debounce()
      expect(s.desktop.recoveryLatest.get(newId)?.source).toBe(s.editorSource())
      // Cancel any further Save As dialog: only direct Save can succeed now.
      s.desktop.saveAsDialogResult = null
      await s.save()
      expect(s.desktop.diskContents('/New.md')).toBe(s.editorSource())
      expect(s.desktop.diskContents('/Original.md')).toBe('# Original')
      expect(s.isDirty()).toBe(false)
      expect(s.desktop.recoveryLatest.has(newId)).toBe(false)
      s.desktop.emitExternalChange('# External new', '/New.md'); await s.settle()
      expect(s.editorSource()).toBe('# External new')
    } finally { s.unmount() }
  })
  it('adopts the new path while retaining edits made during Save As and recovering them under its identity', async () => {
    const { s, oldId } = await setup()
    try {
      const captured = s.editorSource()
      s.scheduler.useManualOrder()
      await s.save()
      await s.appendToEditor('\n\nWhile saving')
      await act(async () => s.scheduler.useAutomaticOrder())
      expect(id()).toBe(s.desktop.documentIdFor('/New.md'))
      expect(s.desktop.diskContents('/New.md')).toBe(captured)
      expect(s.editorSource()).toContain('While saving')
      expect(s.isDirty()).toBe(true)
      expect(s.desktop.recoveryLatest.has(oldId)).toBe(false)
      await debounce()
      expect(s.desktop.recoveryLatest.get(id())?.source).toBe(s.editorSource())
      await s.save()
      expect(s.desktop.diskContents('/New.md')).toBe(s.editorSource())
    } finally { s.unmount() }
  })
  it.each(['cancel', 'fail'] as const)('%s preserves the old native identity, authorization, dirty state, recovery and Recents', async outcome => {
    const { s, oldId } = await setup(true)
    const saveOpened = s.desktop.api.saveOpenedDocument
    try {
      // Exercise the existing dispatcher fallback without adding a new Save As UI.
      Reflect.deleteProperty(s.desktop.api, 'saveOpenedDocument')
      const oldSession = session(), recents = [...s.desktop.recents]
      if (outcome === 'cancel') s.desktop.saveAsDialogResult = null
      else s.desktop.failures.saveAs = true
      await s.save()
      expect(id()).toBe(oldId)
      expect(session()).toBe(oldSession)
      expect(s.desktop.authorizedPath).toBe('/Original.md')
      expect(s.desktop.recents).toEqual(recents)
      expect(s.desktop.recoveryLatest.has(oldId)).toBe(true)
      expect(s.isDirty()).toBe(true)
      expect(s.desktop.diskContents('/Original.md')).toBe('# Original')
    } finally { s.desktop.api.saveOpenedDocument = saveOpened; s.unmount() }
  })
})
