/**
 * Identity types and renderer-side identity derivation.
 *
 * Stable identity (`DocumentId`) keys everything that must survive a restart:
 * bookmarks, reading position and recovery snapshots. Ephemeral identity
 * (`SessionId`) keys one opened document in one window and is never persisted.
 *
 * Desktop documents receive their `DocumentId` from the main process, which owns
 * filesystem identity. See specs/document-identity.md.
 */

declare const identityBrand: unique symbol

type Branded<T, B extends string> = T & { readonly [identityBrand]: B }

export type DocumentId = Branded<string, 'DocumentId'>
export type SessionId = Branded<string, 'SessionId'>
export type SemanticNodeId = Branded<string, 'SemanticNodeId'>
export type BookmarkId = Branded<string, 'BookmarkId'>

/** Matches the identifier shape the main process accepts as a filename component. */
export const DOCUMENT_ID_PATTERN = /^[a-z0-9-]{1,80}$/

export function isDocumentId(value: string): value is DocumentId {
  return DOCUMENT_ID_PATTERN.test(value)
}

export function asDocumentId(value: string): DocumentId {
  if (!isDocumentId(value)) throw new Error(`Invalid document identifier: ${JSON.stringify(value)}`)
  return value as DocumentId
}

export function asSessionId(value: string): SessionId {
  return value as SessionId
}

/** The bundled sample document, which has no file backing it. */
export const WELCOME_DOCUMENT_ID = 'welcome-document' as DocumentId

function fnv1a(bytes: Uint8Array, offsetBasis: number) {
  let hash = offsetBasis >>> 0
  for (const byte of bytes) {
    hash ^= byte
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash >>> 0
}

/**
 * Deterministic 64-bit digest of the NFC-normalized UTF-8 bytes of `value`.
 * Not a security primitive; it only has to be stable and locale-independent.
 */
export function identityDigest(value: string) {
  const bytes = new TextEncoder().encode(value.normalize('NFC'))
  const high = fnv1a(bytes, 0x9dc5811c)
  const low = fnv1a(bytes, 0x811c9dc5)
  return `${high.toString(16).padStart(8, '0')}${low.toString(16).padStart(8, '0')}`
}

export interface BrowserFileIdentity { name: string; size?: number; lastModified?: number }

/**
 * Identity for a file chosen through the browser file input, which exposes no path.
 * Stable across sessions for an unmodified file, but two identical copies in
 * different directories are indistinguishable here.
 */
export function browserDocumentId(file: BrowserFileIdentity): DocumentId {
  return `doc-b-${identityDigest(`${file.name}\u0000${file.size ?? ''}\u0000${file.lastModified ?? ''}`)}` as DocumentId
}

/** Identity for a source string with no file behind it at all. */
export function inMemoryDocumentId(document: { name: string; source: string }): DocumentId {
  return `doc-m-${identityDigest(`${document.name}\u0000${document.source}`)}` as DocumentId
}
