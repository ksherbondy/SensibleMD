import { readFileSync } from 'node:fs'
import { mkdtemp, rm, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { expect, it } from 'vitest'

it('main clear deletes only A, survives restart, and cannot be undone by an earlier recovery write', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'sensible-recovery-'))
  const mainPath = path.resolve('electron/main.cjs')
  const nativeRequire = createRequire(mainPath)
  const launch = () => {
    const handlers = new Map<string, Function>()
    runInNewContext(readFileSync(mainPath, 'utf8'), {
      require: (name: string) => name === 'electron' ? {
        app: { getPath: () => directory }, ipcMain: { handle: (channel: string, handler: Function) => handlers.set(channel, handler) },
      } : name === './file-open-lifecycle.cjs' ? { installFileOpenLifecycle: () => {} } : nativeRequire(name),
      process, console, __dirname: path.dirname(mainPath), setTimeout, clearTimeout,
    })
    return (channel: string, payload: unknown) => handlers.get(channel)!({}, payload)
  }
  try {
    const invoke = launch()
    await invoke('recovery:save', { documentId: 'B', version: 1, source: 'keep B' })
    await invoke('recovery:save', { documentId: 'A', version: 1, source: 'old A' })
    const write = invoke('recovery:save', { documentId: 'A', version: 2, source: 'new A' })
    const clear = invoke('recovery:clear', 'A')
    await Promise.all([write, clear])
    for (const name of ['latest', 'previous']) await expect(access(path.join(directory, 'recovery', 'A', `${name}.json`))).rejects.toThrow()
    const restarted = launch()
    expect(await restarted('recovery:load', 'A')).toBeNull()
    expect((await restarted('recovery:load', 'B')).source).toBe('keep B')
    await restarted('recovery:clear', 'A') // Missing records are harmless.
    expect(() => restarted('recovery:clear', '../B')).toThrow('Invalid document identifier')
  } finally { await rm(directory, { recursive: true, force: true }) }
})
