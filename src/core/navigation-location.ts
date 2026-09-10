import type { BookPage } from './pagination'

// Keep the existing anchor shape; old word offsets resolve to their whole block.
export interface NavigationAnchor { nodeId: string; wordOffset: number }

export function locationForPage(pages: BookPage[], index: number): NavigationAnchor | undefined {
  const first = pages[index]?.fragments[0]
  return first ? { nodeId: first.nodeId, wordOffset: 0 } : undefined
}

export function pageForLocation(pages: BookPage[], anchor: NavigationAnchor): number {
  const index = pages.findIndex((page) => page.fragments.some((block) => block.nodeId === anchor.nodeId))
  return Math.max(0, index)
}
