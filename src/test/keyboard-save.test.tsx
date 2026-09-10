import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FakeDesktop } from './electron-double'
import { startScenario } from './scenario'

async function setup(platform = 'darwin') {
  const desktop = new FakeDesktop({ platform }).addFile('/Original.md', '# Original')
  const s = await startScenario({ desktop })
  desktop.openDialogResult = '/Original.md'
  await s.openDocument(); await s.enterMode('Write')
  await s.appendToEditor('\n\nLatest edit')
  return s
}
async function press(options: KeyboardEventInit = { metaKey: true }) {
  const event = new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true, ...options })
  await act(async () => { (document.activeElement ?? window).dispatchEvent(event) })
  return event
}

describe('keyboard Save dispatcher', () => {
  it.each(['Write', 'Split', 'Read', 'control'] as const)('Cmd+S saves exactly once from %s with current source and prevents Save Page', async mode => {
    const s = await setup()
    try {
      if (mode === 'Read') await s.enterMode('Read')
      else if (mode === 'control') await s.user.click(screen.getByRole('textbox', { name: 'Search document' }))
      else {
        await s.enterMode(mode)
        await s.moveEditorCursorToLine(3)
        expect(document.activeElement).toHaveClass('cm-content')
      }
      const before = s.desktop.writes.length
      expect((await press()).defaultPrevented).toBe(true)
      expect(s.desktop.writes).toHaveLength(before + 1)
      expect(s.desktop.diskContents('/Original.md')).toBe('# Original\n\nLatest edit')
      expect(s.isDirty()).toBe(false)
      expect((await press({ metaKey: true, repeat: true })).defaultPrevented).toBe(true)
      expect(s.desktop.writes).toHaveLength(before + 1)
    } finally { s.unmount() }
  })
  it.each(['win32', 'linux'])('Ctrl+S saves on %s', async platform => {
    const s = await setup(platform)
    try {
      expect((await press({ ctrlKey: true })).defaultPrevented).toBe(true)
      expect(s.desktop.writes).toHaveLength(1)
      expect(s.desktop.diskContents('/Original.md')).toContain('Latest edit')
    } finally { s.unmount() }
  })
  it('does not handle unrelated or already-consumed S events', async () => {
    const s = await setup()
    try {
      for (const modifiers of [{}, { altKey: true }, { metaKey: true, shiftKey: true }, { ctrlKey: true, shiftKey: true }, { metaKey: true, altKey: true }, { metaKey: true, isComposing: true }]) {
        expect((await press(modifiers)).defaultPrevented).toBe(false)
      }
      const input = screen.getByRole('textbox', { name: 'Search document' })
      await s.user.click(input)
      const consume = (event: Event) => event.preventDefault()
      input.addEventListener('keydown', consume)
      await press()
      input.removeEventListener('keydown', consume)
      expect(s.desktop.writes).toHaveLength(0)
    } finally { s.unmount() }
  })
  it('retains dirty state and recovery after a failed keyboard Save', async () => {
    const s = await setup()
    try {
      const documentId = s.desktop.documentIdFor('/Original.md')
      await s.desktop.api.saveRecoverySnapshot({ documentId, source: s.editorSource(), version: 1 })
      s.desktop.failures.save = true
      await press()
      expect(s.isDirty()).toBe(true)
      expect(s.desktop.recoveryLatest.has(documentId)).toBe(true)
      expect(s.desktop.diskContents('/Original.md')).toBe('# Original')
    } finally { s.unmount() }
  })
  it('retains newer edits during an asynchronous keyboard Save and uses them on the next press', async () => {
    const s = await setup()
    try {
      s.scheduler.useManualOrder()
      await press()
      expect(s.scheduler.pending('document:save-opened')).toHaveLength(1)
      await s.appendToEditor('\n\nNewer edit')
      await act(async () => s.scheduler.useAutomaticOrder())
      expect(s.isDirty()).toBe(true)
      expect(s.desktop.diskContents('/Original.md')).not.toContain('Newer edit')
      await press()
      expect(s.desktop.diskContents('/Original.md')).toBe(s.editorSource())
      expect(s.desktop.writes).toHaveLength(2)
    } finally { s.unmount() }
  })
})
