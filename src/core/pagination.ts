import type { SemanticDocument } from './semantic-document'

export interface PageFragment { nodeId: string; source: string }
export interface BookPage { pageNumber: number; fragments: PageFragment[]; estimatedWords: number }

export function paginateDocument(document: SemanticDocument, wordsPerPage = 220): BookPage[] {
  const pages: BookPage[] = []
  let fragments: PageFragment[] = []
  let wordCount = 0
  for (const node of document.nodes) {
    const source = document.source.slice(node.range.start, node.range.end)
    const nodeWords = source.trim().split(/\s+/).filter(Boolean).length
    if (fragments.length && wordCount + nodeWords > wordsPerPage) {
      pages.push({ pageNumber: pages.length + 1, fragments, estimatedWords: wordCount })
      fragments = []
      wordCount = 0
    }
    fragments.push({ nodeId: node.id, source })
    wordCount += nodeWords
  }
  if (fragments.length) pages.push({ pageNumber: pages.length + 1, fragments, estimatedWords: wordCount })
  return pages
}

export function pageSource(page: BookPage) {
  return page.fragments.map((fragment) => fragment.source).join('\n\n')
}

export function pageIndexAfter(index: number, pageCount: number, direction: 'next' | 'previous', step = 1) {
  if (!pageCount) return 0
  return Math.max(0, Math.min(pageCount - 1, index + (direction === 'next' ? step : -step)))
}