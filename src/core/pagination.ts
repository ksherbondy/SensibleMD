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
  const words = (value: string) => value.trim().split(/\s+/).filter(Boolean)
  for (const [index, node] of document.nodes.entries()) {
    const source = document.source.slice(node.range.start, node.range.end)
    const nodeWords = words(source)
    const nextNode = document.nodes[index + 1]
    const nextSource = nextNode ? document.source.slice(nextNode.range.start, nextNode.range.end) : ''
    const headingWithFollowingWords = node.type === 'heading' ? nodeWords.length + words(nextSource).length : nodeWords.length
    if (node.type === 'heading' && fragments.length && wordCount + headingWithFollowingWords > wordsPerPage) {
      pushPage()
    }
    if (nodeWords.length <= wordsPerPage - wordCount || node.type !== 'paragraph') {
      if (fragments.length && wordCount + nodeWords.length > wordsPerPage) pushPage()
      fragments.push({ nodeId: node.id, source, fragmentIndex: 0, fragmentCount: 1, continuesOnNext: false })
      wordCount += nodeWords.length
      continue
    }
    if (fragments.length && wordsPerPage - wordCount < Math.min(12, nodeWords.length)) pushPage()
    const createdFragments: PageFragment[] = []
    let wordIndex = 0
    while (wordIndex < nodeWords.length) {
      const capacity = Math.max(1, wordsPerPage - wordCount)
      const take = Math.min(capacity, nodeWords.length - wordIndex)
      const fragment: PageFragment = { nodeId: node.id, source: nodeWords.slice(wordIndex, wordIndex + take).join(' '), fragmentIndex: createdFragments.length, fragmentCount: 0, continuesOnNext: wordIndex + take < nodeWords.length }
      fragments.push(fragment)
      createdFragments.push(fragment)
      wordCount += take
      wordIndex += take
      if (wordIndex < nodeWords.length) pushPage()
    }
    createdFragments.forEach((fragment) => { fragment.fragmentCount = createdFragments.length })
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