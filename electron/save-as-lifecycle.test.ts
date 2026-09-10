import { readFileSync } from 'node:fs'
import * as fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'

it('Save As adopts real path identity, closes the old watcher, watches new content, and preserves old lifecycle on failure', async () => {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'saveas-'))
  const oldPath = path.join(dir, 'Original.md'), newPath = path.join(dir, 'New.md')
  const mainPath = path.resolve('electron/main.cjs'), nativeRequire = createRequire(mainPath)
  const handlers = new Map<string, Function>()
  const watchers: Array<{ filePath: string; notify: (event?: string, filename?: string) => Promise<void>; close: ReturnType<typeof vi.fn> }> = []
  let destination: string | null = newPath, failWatch = false
  const sender = { id: 1, isDestroyed: () => false, send: vi.fn() }
  runInNewContext(readFileSync(mainPath, 'utf8'), {
    require: (name: string) => name === 'electron' ? {
      app: { getPath: () => dir }, ipcMain: { handle: (channel: string, handler: Function) => handlers.set(channel, handler) },
      dialog: { showOpenDialog: async () => ({ filePaths: [oldPath] }), showSaveDialog: async () => ({ canceled: !destination, filePath: destination }) },
    } : name === 'node:fs' ? { watch: (filePath: string, notify: (event?: string, filename?: string) => Promise<void>) => {
      if (failWatch) throw Error('Watcher unavailable')
      const watcher = { filePath, notify, close: vi.fn() }; watchers.push(watcher); return watcher
    } } : name === './file-open-lifecycle.cjs' ? { installFileOpenLifecycle: () => {} } : nativeRequire(name),
    process, console, __dirname: path.dirname(mainPath), setTimeout, clearTimeout,
  })
  const invoke = (channel: string, payload?: unknown) => handlers.get(channel)!({ sender }, payload)
  try {
    await fs.writeFile(oldPath, '# Original')
    const old = await invoke('document:open')
    const adopted = await invoke('document:save-as', { name: 'Original.md', source: '# Copy' })
    expect(adopted.documentId).toBe(await nativeRequire('./document-identity.cjs').deriveDocumentId(newPath))
    expect(adopted.documentId).not.toBe(old.documentId)
    expect(adopted.sessionId).not.toBe(old.sessionId)
    expect(watchers[0].close).toHaveBeenCalledOnce()
    expect(watchers[1].filePath).toBe(path.dirname(newPath))
    await invoke('document:save-opened', { source: '# Later Save' })
    expect(await fs.readFile(newPath, 'utf8')).toBe('# Later Save')
    expect(await fs.readFile(oldPath, 'utf8')).toBe('# Original')
    await watchers[0].notify(); expect(sender.send).not.toHaveBeenCalled()
    await watchers[1].notify('change', 'Original.md'); expect(sender.send).not.toHaveBeenCalled()
    await fs.writeFile(newPath, '# External')
    await watchers[1].notify('rename', 'New.md')
    expect(sender.send).toHaveBeenCalledWith('document:external-change', { source: '# External' })
    const recents = await fs.readFile(path.join(dir, 'recent-files.json'), 'utf8')
    expect(JSON.parse(recents).items[0].path).toBe(newPath)
    destination = null
    expect(await invoke('document:save-as', { name: 'x.md', source: 'cancel' })).toBeNull()
    destination = path.join(dir, 'missing-directory', 'fail.md')
    await expect(invoke('document:save-as', { name: 'x.md', source: 'fail' })).rejects.toThrow()
    destination = path.join(dir, 'watch-fails.md'); failWatch = true
    await expect(invoke('document:save-as', { name: 'x.md', source: 'fail' })).rejects.toThrow('Watcher unavailable')
    expect(await fs.readFile(path.join(dir, 'recent-files.json'), 'utf8')).toBe(recents)
    expect(watchers[1].close).not.toHaveBeenCalled()
    await invoke('document:save-opened', { source: '# Still active' })
    expect(await fs.readFile(newPath, 'utf8')).toBe('# Still active')
  } finally { await fs.rm(dir, { recursive: true, force: true }) }
})
