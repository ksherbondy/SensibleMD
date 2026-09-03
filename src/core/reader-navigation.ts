import type { SemanticHeading } from './semantic-document'

export function adjacentHeading(headings: SemanticHeading[], activeId: string, direction: 'next' | 'previous'): SemanticHeading | null {
  if (!headings.length) return null
  const activeIndex = headings.findIndex((heading) => heading.id === activeId)
  if (activeIndex < 0) return direction === 'next' ? headings[0] : headings[headings.length - 1]
  const targetIndex = activeIndex + (direction === 'next' ? 1 : -1)
  return headings[targetIndex] ?? null
}

export function bookmarkedHeadings(headings: SemanticHeading[], bookmarks: string[]) {
  const bookmarkSet = new Set(bookmarks)
  return headings.filter((heading) => bookmarkSet.has(heading.id))
}