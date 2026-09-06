const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')

/**
 * Bump when the derivation below changes. The main process archives existing
 * per-document state when it sees an older scheme, so stale state is never applied
 * to a document under a new identifier.
 */
const IDENTITY_SCHEME = 2

/**
 * v0.1 canonicalisation: absolute path with symlinks resolved.
 *
 * Resolving symlinks means a link and its target are the same document, which
 * matches save behaviour (a write through the link lands on the target). It also
 * means identity depends on filesystem state at open time. See
 * specs/document-identity.md for the full matrix and the known limitations.
 */
async function canonicalDocumentPath(filePath) {
  const absolute = path.resolve(filePath)
  try {
    return await fs.realpath(absolute)
  } catch {
    return absolute
  }
}

/**
 * Single seam for document identity. Callers must not assume the derivation; a later
 * release may key identity on something more durable than the path without changing
 * this signature.
 */
async function deriveDocumentId(filePath) {
  const canonical = await canonicalDocumentPath(filePath)
  return `doc-${crypto.createHash('sha256').update(canonical, 'utf8').digest('hex').slice(0, 32)}`
}

/** Ephemeral identity for one opened document in one window. Never persisted. */
function createSessionId() {
  return crypto.randomUUID()
}

module.exports = { IDENTITY_SCHEME, canonicalDocumentPath, deriveDocumentId, createSessionId }
