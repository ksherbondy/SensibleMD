import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { toString } from 'mdast-util-to-string'
import type { Content, Root } from 'mdast'

export interface SourceRange { start: number; end: number; line: number }
export interface SemanticNode { id: string; type: string; text: string; range: SourceRange; level?: number }
export interface SemanticHeading extends SemanticNode { type: 'heading'; level: number }
export type NavigableNodeType = 'heading' | 'paragraph' | 'list' | 'table' | 'code' | 'blockquote' | 'link' | 'image'
export interface SemanticDocument { version: number; source: string; nodes: SemanticNode[]; headings: SemanticHeading[]; navigableNodes: SemanticNode[]; wordCount: number }

const parser = unified().use(remarkParse).use(remarkGfm)

function range(node: Content): SourceRange {
  const start = node.position?.start.offset ?? 0
  const end = node.position?.end.offset ?? start
  return { start, end, line: node.position?.start.line ?? 1 }
}

function nodeId(node: Content, index: number) {
  const location = range(node)
  return `${node.type}-${location.start}-${index}`
}

function lineAtOffset(source: string, offset: number) {
  return source.slice(0, offset).split('\n').length
}

export function parseSemanticDocument(source: string, version: number): SemanticDocument {
  const tree = parser.parse(source) as Root
  const nodes = tree.children.map((node, index) => ({ id: nodeId(node, index), type: node.type, text: toString(node), range: range(node), ...(node.type === 'heading' ? { level: node.depth } : {}) }))
  const headings = tree.children.flatMap((node, index) => node.type === 'heading' ? [{ id: nodeId(node, index), type: 'heading' as const, text: toString(node), range: range(node), level: node.depth }] : [])
  const navigableNodes: SemanticNode[] = nodes.filter((node) => ['heading', 'paragraph', 'list', 'table', 'code', 'blockquote'].includes(node.type))
  const inlineNodes: SemanticNode[] = [...source.matchAll(/(!?)\[([^\]]*)\]\(([^)]+)\)/g)].map((match, index) => {
    const offset = match.index ?? 0
    const type = match[1] ? 'image' : 'link'
    return { id: `${type}-${offset}-${index}`, type, text: match[2] || match[3], range: { start: offset, end: offset + match[0].length, line: lineAtOffset(source, offset) } }
  })
  navigableNodes.push(...inlineNodes)
  navigableNodes.sort((left, right) => left.range.start - right.range.start)
  return { version, source, nodes, headings, navigableNodes, wordCount: source.trim() ? source.trim().split(/\s+/).length : 0 }
}

export interface SearchResult { nodeId: string; nodeType: string; section: string; text: string; line: number; occurrences: number }

export function searchDocument(document: SemanticDocument, query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []
  let section = 'Document'
  return document.nodes.flatMap((node) => {
    if (node.type === 'heading') section = node.text || section
    const occurrences = node.text.toLocaleLowerCase().split(normalizedQuery).length - 1
    return occurrences ? [{ nodeId: node.id, nodeType: node.type, section, text: node.text, line: node.range.line, occurrences }] : []
  })
}