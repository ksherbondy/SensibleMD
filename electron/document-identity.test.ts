import { mkdtemp, mkdir, rm, symlink, link, writeFile, rename, access } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const require = createRequire(import.meta.url)
const { deriveDocumentId, canonicalDocumentPath, createSessionId, IDENTITY_SCHEME } = require('./document-identity.cjs') as {
  deriveDocumentId: (filePath: string) => Promise<string>
  canonicalDocumentPath: (filePath: string) => Promise<string>
  createSessionId: () => string
  IDENTITY_SCHEME: number
}

let root = ''

beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'sensiblemd-identity-'))
  await mkdir(path.join(root, 'project-a'), { recursive: true })
  await mkdir(path.join(root, 'project-b'), { recursive: true })
  await writeFile(path.join(root, 'project-a', 'notes.md'), '# A')
  await writeFile(path.join(root, 'project-b', 'notes.md'), '# B')
})

afterAll(async () => {
  await rm(root, { recursive: true, force: true })
})

const idFor = (...segments: string[]) => deriveDocumentId(path.join(root, ...segments))

describe('document identity', () => {
  it('produces an opaque identifier the main process can use as a filename', async () => {
    const documentId = await idFor('project-a', 'notes.md')
    expect(documentId).toMatch(/^doc-[0-9a-f]{32}$/)
  })

  it('is stable for the same file across repeated derivations', async () => {
    expect(await idFor('project-a', 'notes.md')).toBe(await idFor('project-a', 'notes.md'))
  })

  it('distinguishes same-named files in different directories', async () => {
    expect(await idFor('project-a', 'notes.md')).not.toBe(await idFor('project-b', 'notes.md'))
  })

  it('ignores relative path spelling', async () => {
    const direct = await idFor('project-a', 'notes.md')
    const indirect = await deriveDocumentId(path.join(root, 'project-b', '..', 'project-a', 'notes.md'))
    expect(indirect).toBe(direct)
  })

  it('does not depend on the process working directory for absolute paths', async () => {
    expect(await canonicalDocumentPath(path.join(root, 'project-a', 'notes.md'))).toBe(path.join(await canonicalDocumentPath(root), 'project-a', 'notes.md'))
  })

  it('issues a distinct ephemeral session identifier per open', () => {
    expect(createSessionId()).not.toBe(createSessionId())
    expect(IDENTITY_SCHEME).toBeGreaterThanOrEqual(2)
  })
})

describe('document identity: rename, move and link matrix', () => {
  it('treats a symlink and its target as the same document', async () => {
    const target = path.join(root, 'project-a', 'notes.md')
    const linkPath = path.join(root, 'link-to-notes.md')
    await symlink(target, linkPath)
    expect(await deriveDocumentId(linkPath)).toBe(await deriveDocumentId(target))
  })

  it('treats a file reached through a symlinked directory as the same document', async () => {
    const linkedDirectory = path.join(root, 'link-to-project-a')
    await symlink(path.join(root, 'project-a'), linkedDirectory)
    expect(await deriveDocumentId(path.join(linkedDirectory, 'notes.md'))).toBe(await idFor('project-a', 'notes.md'))
  })

  it('treats a hard link as a separate document, because it is a separate path', async () => {
    const hardLink = path.join(root, 'project-a', 'notes-hardlink.md')
    await link(path.join(root, 'project-a', 'notes.md'), hardLink)
    expect(await deriveDocumentId(hardLink)).not.toBe(await idFor('project-a', 'notes.md'))
  })

  // Known v0.1 limitation: renaming orphans the document's saved state. Recorded here so
  // that changing it is a deliberate decision rather than an accident.
  it('changes identity when a file is renamed', async () => {
    const before = path.join(root, 'project-a', 'renamed-before.md')
    const after = path.join(root, 'project-a', 'renamed-after.md')
    await writeFile(before, '# Renamed')
    const originalId = await deriveDocumentId(before)
    await rename(before, after)
    expect(await deriveDocumentId(after)).not.toBe(originalId)
  })

  // Same limitation for a move between directories on the same volume.
  it('changes identity when a file is moved to another directory', async () => {
    const before = path.join(root, 'project-a', 'moved.md')
    const after = path.join(root, 'project-b', 'moved.md')
    await writeFile(before, '# Moved')
    const originalId = await deriveDocumentId(before)
    await rename(before, after)
    expect(await deriveDocumentId(after)).not.toBe(originalId)
  })

  it('resolves case-only spellings to one identity on a case-insensitive volume', async () => {
    const exact = path.join(root, 'project-a', 'CaseTest.md')
    await writeFile(exact, '# Case')
    const lower = path.join(root, 'project-a', 'casetest.md')
    const sameFile = await access(lower).then(() => true).catch(() => false)
    if (!sameFile) {
      expect(await deriveDocumentId(lower)).not.toBe(await deriveDocumentId(exact))
      return
    }
    expect(await deriveDocumentId(lower)).toBe(await deriveDocumentId(exact))
  })
})
