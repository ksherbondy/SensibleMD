import { browserDocumentId, inMemoryDocumentId, type DocumentId } from './identity'

export interface CollectionDocument { id: DocumentId; name: string; source: string }
export interface CollectionInput { id?: DocumentId; name: string; source: string; size?: number; lastModified?: number }

function derivedId(file: CollectionInput): DocumentId {
  if (file.id) return file.id
  if (file.size !== undefined || file.lastModified !== undefined) return browserDocumentId(file)
  return inMemoryDocumentId(file)
}

/**
 * Identifiers come from whichever layer knows where the document came from: the main
 * process for desktop files, file metadata for browser uploads. Genuine duplicates are
 * suffixed, so adding an unrelated document never changes another document's identity.
 */
export function createCollection(files: CollectionInput[]): CollectionDocument[] {
  const used = new Map<string, number>()
  return files.map((file) => {
    const base = derivedId(file)
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return { id: (seen === 0 ? base : `${base}-${seen + 1}`) as DocumentId, name: file.name, source: file.source }
  })
}

export function replaceCollectionDocument(documents: CollectionDocument[], id: DocumentId, source: string) {
  return documents.map((document) => document.id === id ? { ...document, source } : document)
}

export function adjacentCollectionDocument(documents: CollectionDocument[], activeId: DocumentId, direction: 'next' | 'previous') {
  const index = documents.findIndex((document) => document.id === activeId)
  if (index < 0) return null
  return documents[index + (direction === 'next' ? 1 : -1)] ?? null
}