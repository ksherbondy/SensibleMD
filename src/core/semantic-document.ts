import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import { toString } from 'mdast-util-to-string'
import type { Content, Root } from 'mdast'

export interface SourceRange { start: number; end: number; line: number }
export interface SemanticNode { id: string; type: string; text: string; range: SourceRange; level?: number }
export interface SemanticHeading extends SemanticNode { type: 'heading'; level: number }
export interface SemanticDocument { version: number; source: string; nodes: SemanticNode[]; headings: SemanticHeading[]; wordCount: number }

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

export function parseSemanticDocument(source: string, version: number): SemanticDocument {
  const tree = parser.parse(source) as Root
  const nodes = tree.children.map((node, index) => ({ id: nodeId(node, index), type: node.type, text: toString(node), range: range(node), ...(node.type === 'heading' ? { level: node.depth } : {}) }))
  const headings = tree.children.flatMap((node, index) => node.type === 'heading' ? [{ id: nodeId(node, index), type: 'heading' as const, text: toString(node), range: range(node), level: node.depth }] : [])
  return { version, source, nodes, headings, wordCount: source.trim() ? source.trim().split(/\s+/).length : 0 }
}

export interface SearchResult { nodeId: string; section: string; text: string; line: number; occurrences: number }

export function searchDocument(document: SemanticDocument, query: string): SearchResult[] {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return []
  let section = 'Document'
  return document.nodes.flatMap((node) => {
    if (node.type === 'heading') section = node.text || section
    const occurrences = node.text.toLocaleLowerCase().split(normalizedQuery).length - 1
    return occurrences ? [{ nodeId: node.id, section, text: node.text, line: node.range.line, occurrences }] : []
  })
}