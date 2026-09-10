import { EventEmitter } from 'node:events'
import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'
const require = createRequire(import.meta.url)
const { installFileOpenLifecycle, markdownArgument } = require('./file-open-lifecycle.cjs')

function setup(platform = 'darwin', argv = ['app'], lock = true) {
  let release!: () => void
  const app = Object.assign(new EventEmitter(), { isPackaged: true, requestSingleInstanceLock: () => lock, quit: vi.fn(), whenReady: () => new Promise<void>((resolve) => { release = resolve }) })
  const ipcMain = Object.assign(new EventEmitter(), { handle: (name: string, handler: Function) => handlers.set(name, handler) })
  const handlers = new Map<string, Function>()
  let nextContentsId = 0
  const windows: ReturnType<typeof makeWindow>[] = []
  const makeWindow = () => Object.assign(new EventEmitter(), { isDestroyed: vi.fn(() => false), isMinimized: () => true, restore: vi.fn(), show: vi.fn(), focus: vi.fn(), webContents: { id: ++nextContentsId, isDestroyed: vi.fn(() => false), send: vi.fn() } })
  const createWindow = vi.fn(() => { const window = makeWindow(); windows.push(window); return window })
  const openDocument = vi.fn(async (_event, filePath) => ({ source: filePath }))
  installFileOpenLifecycle({ app, ipcMain, createWindow, openDocument, platform, argv, cwd: '/launch' })
  const ready = async () => { release(); await Promise.resolve(); await Promise.resolve() }
  const sender = () => ({ sender: windows.at(-1)!.webContents })
  const rendererReady = () => ipcMain.emit('document:os-ready', sender())
  return { app, ipcMain, handlers, windows, createWindow, openDocument, ready, sender, rendererReady }
}

describe('OS file-open lifecycle', () => {
  it('normal launch creates Home without opening a file; macOS activation recreates Home', async () => {
    const test = setup()
    await test.ready(); test.rendererReady()
    expect(test.createWindow).toHaveBeenCalledTimes(1)
    expect(test.openDocument).not.toHaveBeenCalled()
    expect(test.windows[0].webContents.send).not.toHaveBeenCalled()
    test.windows[0].emit('closed'); test.app.emit('window-all-closed')
    expect(test.app.quit).not.toHaveBeenCalled()
    test.app.emit('activate')
    expect(test.createWindow).toHaveBeenCalledTimes(2)
    expect(test.openDocument).not.toHaveBeenCalled()
  })
  it('queues an early macOS open-file until renderer readiness and explicit acceptance', async () => {
    const test = setup()
    const event = { preventDefault: vi.fn() }
    test.app.emit('open-file', event, '/notes/Specific.md')
    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(test.createWindow).not.toHaveBeenCalled()
    await test.ready()
    expect(test.openDocument).not.toHaveBeenCalled()
    test.rendererReady()
    const request = test.windows[0].webContents.send.mock.calls[0][1]
    await test.handlers.get('document:os-open')!(test.sender(), request.id)
    expect(test.openDocument).toHaveBeenCalledWith(test.sender(), '/notes/Specific.md')
  })
  it.each(['win32', 'linux'])('handles launch args and second-instance while reusing the window on %s', async (platform) => {
    const test = setup(platform, ['app', '/notes/First.md'])
    await test.ready(); test.rendererReady()
    const request = test.windows[0].webContents.send.mock.calls[0][1]
    await test.handlers.get('document:os-open')!(test.sender(), request.id)
    test.ipcMain.emit('document:os-complete', test.sender(), request.id)
    test.app.emit('second-instance', {}, ['app', '/notes/Second.md'], '/launch')
    expect(test.createWindow).toHaveBeenCalledTimes(1)
    expect(test.windows[0].focus).toHaveBeenCalledTimes(2)
    expect(test.windows[0].restore).toHaveBeenCalledTimes(2)
    expect(test.windows[0].webContents.send.mock.calls.at(-1)![1].name).toBe('Second.md')
    test.app.emit('window-all-closed')
    expect(test.app.quit).toHaveBeenCalledOnce()
  })
  it.each(['window', 'webContents'] as const)('does not send when %s is destroyed during activation before closed fires', async (target) => {
    const test = setup()
    await test.ready(); test.rendererReady()
    const window = test.windows[0]
    window.focus.mockImplementationOnce(() => {
      const destroyed = target === 'window' ? window : window.webContents
      destroyed.isDestroyed.mockReturnValue(true)
      window.webContents.send.mockImplementation(() => { throw new Error('Object has been destroyed') })
    })
    expect(() => test.app.emit('open-file', { preventDefault: vi.fn() }, '/notes/Specific.md')).not.toThrow()
    expect(window.webContents.send).not.toHaveBeenCalled()
    expect(test.openDocument).not.toHaveBeenCalled()
    expect(test.createWindow).toHaveBeenCalledTimes(1)
  })
  it('quits a second process when it cannot acquire the instance lock', () => {
    const test = setup('linux', ['app'], false)
    expect(test.app.quit).toHaveBeenCalledOnce()
    expect(test.createWindow).not.toHaveBeenCalled()
  })
  it('accepts .md only and resolves relative arguments using the requesting process directory', () => {
    expect(markdownArgument(['app', 'file.md'], '/work', 'linux', true)).toBe('/work/file.md')
    expect(markdownArgument(['app', 'main.js', '--dev', 'file.md'], '/work', 'linux', false)).toBe('/work/file.md')
    expect(markdownArgument(['app', 'file.markdown', 'file.mdown'], '/work', 'linux', true)).toBeNull()
    expect(markdownArgument(['app.exe', 'file.md'], 'C:\\Work', 'win32', true)).toBe('C:\\Work\\file.md')
  })
})
