const fs = require('node:fs/promises')
const path = require('node:path')

const { IDENTITY_SCHEME } = require('./document-identity.cjs')

const STATE_FOLDERS = ['documents', 'recovery']

/**
 * Per-document state written under an older identity scheme belongs to identifiers we can
 * no longer derive. It is moved aside rather than removed, so a later release can offer to
 * reconnect it. Failure leaves everything in place and is retried on the next launch.
 */
async function archiveStateFromPreviousIdentityScheme(userDataPath) {
  const markerPath = path.join(userDataPath, 'identity-scheme.json')
  try {
    const marker = JSON.parse(await fs.readFile(markerPath, 'utf8'))
    if (Number(marker?.scheme) >= IDENTITY_SCHEME) return { archived: [], alreadyCurrent: true }
  } catch {}

  const archiveRoot = path.join(userDataPath, 'legacy-state', new Date().toISOString().replace(/[:.]/g, '-'))
  const archived = []
  for (const folder of STATE_FOLDERS) {
    const source = path.join(userDataPath, folder)
    try { await fs.access(source) } catch { continue }
    await fs.mkdir(archiveRoot, { recursive: true })
    await fs.rename(source, path.join(archiveRoot, folder))
    archived.push(folder)
  }

  await fs.mkdir(userDataPath, { recursive: true })
  await fs.writeFile(markerPath, JSON.stringify({ schemaVersion: 1, scheme: IDENTITY_SCHEME, archivedAt: new Date().toISOString(), archived }, null, 2), 'utf8')
  return { archived, alreadyCurrent: false, archiveRoot: archived.length ? archiveRoot : undefined }
}

module.exports = { archiveStateFromPreviousIdentityScheme }
