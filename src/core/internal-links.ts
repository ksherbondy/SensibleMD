import type { CollectionDocument } from './document-collection'
import { parseSemanticDocument } from './semantic-document'

export interface InternalLinkTarget { documentId: string; headingId?: string }

function slugify(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export function resolveInternalMarkdownLink(documents: CollectionDocument[], activeDocumentId: string, href: string): InternalLinkTarget | null {
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return null
  const [filePart, anchorPart] = href.split('#', 2)
  const targetDocument = filePart ? documents.find((document) => document.name.toLocaleLowerCase() === filePart.split('/').pop()?.toLocaleLowerCase()) : documents.find((document) => document.id === activeDocumentId)
  if (!targetDocument) return null
  const heading = anchorPart ? parseSemanticDocument(targetDocument.source, 0).headings.find((item) => slugify(item.text) === slugify(anchorPart)) : undefined
  if (anchorPart && !heading) return null
  return { documentId: targetDocument.id, headingId: heading?.id }
}