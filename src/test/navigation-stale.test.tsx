import { act, fireEvent, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useNavigationWork } from '../core/use-navigation-work'
import { startScenario } from './scenario'
import { ControlledIntersectionObserver as Observer, scrollRequests } from './dom-polyfills'

const source = '# Alpha\n\nFirst.\n\n## Beta\n\nSecond.'
const start = () => startScenario({ storage: { 'sensiblemd-document': source } })
const active = () => document.querySelector('.outline-item[aria-current="location"]')?.textContent
function holdFrames() {
  const callbacks: FrameRequestCallback[] = []
  const spy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => { callbacks.push(callback); return callbacks.length })
  return { callbacks, restore: () => spy.mockRestore(), run: async (callback: FrameRequestCallback) => { await act(async () => callback(performance.now())) } }
}

describe('N05 stale navigation work', () => {
  it('rejects an older explicit RAF delivered after the newer destination projects', async () => {
    const scenario = await start()
    const frames = holdFrames()
    try {
      await scenario.clickOutlineHeading('Alpha')
      const old = frames.callbacks.at(-1)!
      await scenario.clickOutlineHeading('Beta')
      await frames.run(frames.callbacks.at(-1)!)
      const count = scrollRequests.length
      expect(scenario.lastScrollRequest()?.element).toBe(screen.getByRole('heading', { name: 'Beta' }))
      await frames.run(old)
      expect(scrollRequests).toHaveLength(count)
      expect(active()).toBe('Beta')
    } finally { scenario.unmount(); frames.restore() }
  })

  it('rejects an old-document RAF despite identical source and rendered IDs', async () => {
    const scenario = await start()
    const frames = holdFrames()
    try {
      await scenario.clickOutlineHeading('Alpha')
      const old = frames.callbacks.at(-1)!
      scenario.desktop.addFile('/B.md', source)
      scenario.desktop.openDialogResult = '/B.md'
      await scenario.openDocument()
      await scenario.clickOutlineHeading('Beta')
      const count = scrollRequests.length
      await frames.run(old)
      expect(scrollRequests).toHaveLength(count)
      expect(active()).toBe('Beta')
    } finally { scenario.unmount(); frames.restore() }
  })

  it('rejects a queued RAF after source edits even when its heading ID still exists', async () => {
    const scenario = await start()
    const frames = holdFrames()
    try {
      await scenario.clickOutlineHeading('Alpha')
      const old = frames.callbacks.at(-1)!
      await scenario.enterMode('Write')
      await scenario.appendToEditor('\n\nChanged source.')
      await scenario.enterMode('Read')
      const count = scrollRequests.length
      await frames.run(old)
      expect(scrollRequests).toHaveLength(count)
    } finally { scenario.unmount(); frames.restore() }
  })

  it('does not replay an obsolete editor jump on remount after a source change', async () => {
    const scenario = await start()
    try {
      await scenario.enterMode('Write')
      await scenario.clickOutlineHeading('Beta')
      expect(scenario.editorCursorLine()).toBe(5)
      await scenario.appendToEditor('\n\nChanged source.')
      await scenario.enterMode('Read')
      await scenario.enterMode('Write')
      expect(scenario.editorCursorLine()).toBe(1)
      expect(scenario.editorSource()).toBe(source + '\n\nChanged source.')
      expect(scenario.isDirty()).toBe(true)
    } finally { scenario.unmount() }
  })

  it('user reader interaction invalidates pending explicit projection', async () => {
    const scenario = await start()
    const frames = holdFrames()
    try {
      await scenario.clickOutlineHeading('Alpha')
      const old = frames.callbacks.at(-1)!
      fireEvent.wheel(document.querySelector('.document-reader')!)
      fireEvent.scroll(document)
      const current = Observer.instances.findLast((item) => item.targets.size > 0)!
      await act(async () => current.emit([screen.getByRole('heading', { name: 'Beta' })]))
      const count = scrollRequests.length
      await frames.run(old)
      expect(active()).toBe('Beta')
      expect(scrollRequests).toHaveLength(count)
    } finally { scenario.unmount(); frames.restore() }
  })

  it('permits the intended cross-document projection after its destination commits', async () => {
    const hook = renderHook(({ documentId, text }) => useNavigationWork(documentId, text), { initialProps: { documentId: 'A', text: source } })
    const frames = holdFrames()
    try {
      const projected = vi.fn()
      hook.result.current.invalidate()
      hook.result.current.schedule(projected, { documentId: 'B', source: 'New source' })
      hook.rerender({ documentId: 'B', text: 'New source' })
      await frames.run(frames.callbacks[0])
      expect(projected).toHaveBeenCalledOnce()
    } finally { hook.unmount(); frames.restore() }
  })

  it('does not revive a request when source changes away and then returns', async () => {
    const hook = renderHook(({ text }) => useNavigationWork('A', text), { initialProps: { text: source } })
    const frames = holdFrames()
    try {
      const projected = vi.fn()
      const editorIsCurrent = hook.result.current.capture()
      hook.result.current.schedule(projected, { documentId: 'A', source })
      hook.rerender({ text: 'Changed' })
      hook.rerender({ text: source })
      await frames.run(frames.callbacks[0])
      expect(projected).not.toHaveBeenCalled()
      expect(editorIsCurrent()).toBe(false)
    } finally { hook.unmount(); frames.restore() }
  })

  it('an intermediate document commit cannot cancel a newer destination projection', async () => {
    const hook = renderHook(({ documentId }) => useNavigationWork(documentId, source), { initialProps: { documentId: 'A' } })
    const frames = holdFrames()
    try {
      const older = vi.fn()
      const newer = vi.fn()
      hook.result.current.invalidate()
      hook.result.current.schedule(older, { documentId: 'B', source })
      hook.result.current.invalidate()
      hook.result.current.schedule(newer, { documentId: 'C', source })
      hook.rerender({ documentId: 'B' })
      hook.rerender({ documentId: 'C' })
      await frames.run(frames.callbacks[1])
      await frames.run(frames.callbacks[0])
      expect(newer).toHaveBeenCalledOnce()
      expect(older).not.toHaveBeenCalled()
    } finally { hook.unmount(); frames.restore() }
  })

  it('executes a current editor jump, including repeating the same target after cursor movement', async () => {
    const scenario = await start()
    try {
      await scenario.enterMode('Write')
      await scenario.moveEditorCursorToLine(3)
      await scenario.clickOutlineHeading('Beta')
      expect(scenario.editorCursorLine()).toBe(5)
      await scenario.moveEditorCursorToLine(3)
      await scenario.clickOutlineHeading('Beta')
      expect(scenario.editorCursorLine()).toBe(5)
      expect(scenario.currentMode()).toBe('Write')
      expect(scenario.editorSource()).toBe(source)
      expect(scenario.isDirty()).toBe(false)
    } finally { scenario.unmount() }
  })

  it('passive ownership cancels current-context projection but preserves a pending other-document projection', async () => {
    const hook = renderHook(({ documentId }) => useNavigationWork(documentId, source), { initialProps: { documentId: 'A' } })
    const frames = holdFrames()
    try {
      const current = vi.fn()
      const destination = vi.fn()
      hook.result.current.schedule(current, { documentId: 'A', source })
      hook.result.current.schedule(destination, { documentId: 'B', source })
      const oldEditorJump = hook.result.current.capture()
      hook.result.current.interruptCurrentContext()
      const validEditorJump = hook.result.current.capture()
      expect(oldEditorJump()).toBe(false)
      expect(validEditorJump()).toBe(true)
      await frames.run(frames.callbacks[0])
      hook.rerender({ documentId: 'B' })
      await frames.run(frames.callbacks[1])
      expect(current).not.toHaveBeenCalled()
      expect(destination).toHaveBeenCalledOnce()
    } finally { hook.unmount(); frames.restore() }
  })

})
