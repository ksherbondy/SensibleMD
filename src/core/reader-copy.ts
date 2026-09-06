import type { SemanticDocument, SemanticNode } from './semantic-document'

export function sourceForNode(document: SemanticDocument, node: SemanticNode | null | undefined) {
  if (!node) return null
  return document.source.slice(node.range.start, node.range.end)
}