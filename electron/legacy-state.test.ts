import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { archiveStateFromPreviousIdentityScheme } = require('./legacy-state.cjs') as {
  archiveStateFromPreviousIdentityScheme: (userDataPath: string) => Promise<{ archived: string[]; alreadyCurrent: boolean; archiveRoot?: string }>
}

let userData = ''

beforeEach(async () => {
  userData = await mkdtemp(path.join(tmpdir(), 'sensiblemd-userdata-'))
})

afterEach(async () => {
  await rm(userData, { recursive: true, force: true })
})

async function seedPreviousSchemeState() {
  await mkdir(path.join(userData, 'documents'), { recursive: true })
  await mkdir(path.join(userData, 'recovery', 'notes-md-0'), { recursive: true })
  await writeFile(path.join(userData, 'documents', 'notes-md-0.json'), '{"schemaVersion":1,"documentId":"notes-md-0"}')
  await writeFile(path.join(userData, 'recovery', 'notes-md-0', 'latest.json'), '{"source":"unsaved work"}')
}

describe('state from a previous identity scheme', () => {
  it('preserves the previous state instead of deleting it', async () => {
    await seedPreviousSchemeState()

    const result = await archiveStateFromPreviousIdentityScheme(userData)

    expect(result.archived).toEqual(['documents', 'recovery'])
    expect(await readFile(path.join(result.archiveRoot!, 'documents', 'notes-md-0.json'), 'utf8')).toContain('notes-md-0')
    expect(await readFile(path.join(result.archiveRoot!, 'recovery', 'notes-md-0', 'latest.json'), 'utf8')).toContain('unsaved work')
  })

  it('leaves no state behind under the identifiers it can no longer derive', async () => {
    await seedPreviousSchemeState()
    await archiveStateFromPreviousIdentityScheme(userData)

    await expect(readdir(path.join(userData, 'documents'))).rejects.toThrow()
    await expect(readdir(path.join(userData, 'recovery'))).rejects.toThrow()
  })

  it('runs once and then leaves current state alone', async () => {
    await seedPreviousSchemeState()
    await archiveStateFromPreviousIdentityScheme(userData)

    await mkdir(path.join(userData, 'documents'), { recursive: true })
    await writeFile(path.join(userData, 'documents', 'doc-abc.json'), '{"schemaVersion":1}')

    const second = await archiveStateFromPreviousIdentityScheme(userData)

    expect(second.alreadyCurrent).toBe(true)
    expect(await readFile(path.join(userData, 'documents', 'doc-abc.json'), 'utf8')).toContain('schemaVersion')
  })

  it('is a no-op on a first launch with no previous state', async () => {
    const result = await archiveStateFromPreviousIdentityScheme(userData)
    expect(result.archived).toEqual([])
    expect(JSON.parse(await readFile(path.join(userData, 'identity-scheme.json'), 'utf8')).scheme).toBeGreaterThanOrEqual(2)
  })
})
