import { parseSemanticDocument, searchDocument } from './semantic-document'
import type { CollectionDocument } from './document-collection'

export type SearchScope = 'document' | 'collection' | 'section' | 'headings' | 'links' | 'code'
export interface CollectionSearchResult { documentId: string; documentName: string; nodeId: string; nodeType: string; section: string; text: string; line: number; occurrences: number }

export function searchCollection(documents: CollectionDocument[], activeDocumentId: string, query: string, scope: SearchScope, activeSection?: string): CollectionSearchResult[] {
  const searchable = scope === 'collection' ? documents : documents.filter((document) => document.id === activeDocumentId)
  return searchable.flatMap((document) => searchDocument(parseSemanticDocument(document.source, 0), query)
    .filter((result) => scope === 'headings' ? result.nodeType === 'heading' : scope === 'links' ? result.nodeType === 'link' : scope === 'code' ? result.nodeType === 'code' : scope === 'section' ? result.section === activeSection : true)
    .map((result) => ({ ...result, documentId: document.id, documentName: document.name })))
}

export function searchResultIndexAfter(index: number, resultCount: number, direction: 'next' | 'previous') {
  if (!resultCount) return -1
  if (index < 0) return direction === 'next' ? 0 : resultCount - 1
  return (index + (direction === 'next' ? 1 : resultCount - 1)) % resultCount
}