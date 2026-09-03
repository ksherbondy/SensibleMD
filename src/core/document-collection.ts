export interface CollectionDocument { id: string; name: string; source: string }

export function documentId(name: string, index: number) {
  return `${name.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'document'}-${index}`
}

export function createCollection(files: Array<{ name: string; source: string }>): CollectionDocument[] {
  return files.map((file, index) => ({ id: documentId(file.name, index), name: file.name, source: file.source }))
}

export function replaceCollectionDocument(documents: CollectionDocument[], id: string, source: string) {
  return documents.map((document) => document.id === id ? { ...document, source } : document)
}

export function adjacentCollectionDocument(documents: CollectionDocument[], activeId: string, direction: 'next' | 'previous') {
  const index = documents.findIndex((document) => document.id === activeId)
  if (index < 0) return null
  return documents[index + (direction === 'next' ? 1 : -1)] ?? null
}