import type { SemanticDocument } from './semantic-document'

export interface PageFragment { nodeId: string; source: string; fragmentIndex: number; fragmentCount: number; continuesOnNext: boolean }
export interface BookPage { pageNumber: number; fragments: PageFragment[]; estimatedWords: number }

export function paginateDocument(document: SemanticDocument, wordsPerPage = 220): BookPage[] {
  const pages: BookPage[] = []
  let fragments: PageFragment[] = []
  let wordCount = 0
  const pushPage = () => {
    if (fragments.length) pages.push({ pageNumber: pages.length + 1, fragments, estimatedWords: wordCount })
    fragments = []
    wordCount = 0
  }
  // Only blocks represented by the sanitized Markdown renderer own pages.
  // Definitions remain in the full render source; raw HTML is not rendered.
  const blocks = document.nodes.filter((node) => ['heading', 'paragraph', 'code', 'blockquote', 'list', 'table', 'thematicBreak'].includes(node.type))
  for (let index = 0; index < blocks.length;) {
    const group = [blocks[index++]]
    // Keep heading runs with their next block, even when that block overflows
    // capacity. Capacity is a grouping estimate, never a clipping boundary.
    while (group.at(-1)?.type === 'heading' && index < blocks.length) group.push(blocks[index++])
    const complete = group.map((node) => ({ nodeId: node.id, source: document.source.slice(node.range.start, node.range.end), fragmentIndex: 0, fragmentCount: 1, continuesOnNext: false }))
    const groupWords = complete.reduce((total, block) => total + block.source.trim().split(/\s+/).filter(Boolean).length, 0)
    if (fragments.length && wordCount + groupWords > wordsPerPage) pushPage()
    fragments.push(...complete)
    wordCount += groupWords
  }
  pushPage()
  return pages
}

export function pageSource(page: BookPage) {
  return page.fragments.map((fragment) => fragment.source).join('\n\n')
}

export function pageIndexAfter(index: number, pageCount: number, direction: 'next' | 'previous', step = 1) {
  if (!pageCount) return 0
  return Math.max(0, Math.min(pageCount - 1, index + (direction === 'next' ? step : -step)))
}

export function pageIndexForNode(pages: BookPage[], nodeId: string) {
  const pageIndex = pages.findIndex((page) => page.fragments.some((fragment) => fragment.nodeId === nodeId))
  return pageIndex < 0 ? 0 : pageIndex
}