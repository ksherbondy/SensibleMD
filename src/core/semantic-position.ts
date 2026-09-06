import type { SemanticDocument, SemanticNode } from './semantic-document'

export interface SemanticPosition {
  nodeId?: string
  nodeFingerprint?: string
  headingPath?: string[]
  textAnchor?: { exact: string; prefix: string; suffix: string }
}

export interface PositionResolution { node: SemanticNode | null; confidence: 'exact' | 'high' | 'medium' | 'fallback'; strategy: string }

function normalizedText(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim()
}

function fingerprint(node: SemanticNode) {
  return `${node.type}:${normalizedText(node.text).slice(0, 120)}`
}

function headingPath(document: SemanticDocument, node: SemanticNode) {
  return document.headings.filter((heading) => heading.range.start <= node.range.start).map((heading) => heading.text)
}

function sectionHeading(document: SemanticDocument, node: SemanticNode) {
  return [...document.headings].reverse().find((heading) => heading.range.start <= node.range.start)?.text
}

function preferSavedSection(document: SemanticDocument, candidates: SemanticNode[], position: SemanticPosition) {
  const savedSection = position.headingPath?.at(-1)
  const sectionMatch = candidates.find((node) => sectionHeading(document, node) === savedSection)
  if (savedSection && document.headings.some((heading) => heading.text === savedSection)) return sectionMatch
  return candidates.length === 1 ? candidates[0] : undefined
}

export function createSemanticPosition(document: SemanticDocument, nodeId: string): SemanticPosition | null {
  const node = document.navigableNodes.find((item) => item.id === nodeId)
  if (!node) return null
  const text = normalizedText(node.text)
  const exact = text.slice(0, 80).replace(/[.,;:!?]+$/, '')
  return { nodeId: node.id, nodeFingerprint: fingerprint(node), headingPath: headingPath(document, node), textAnchor: { exact, prefix: text.slice(0, 24), suffix: text.slice(-24) } }
}

export function resolveSemanticPosition(document: SemanticDocument, position: SemanticPosition | undefined): PositionResolution {
  if (!position) return { node: document.navigableNodes[0] ?? null, confidence: 'fallback', strategy: 'document-start' }
  const exact = position.nodeId && document.navigableNodes.find((node) => node.id === position.nodeId)
  if (exact && (!position.nodeFingerprint || fingerprint(exact) === position.nodeFingerprint)) return { node: exact, confidence: 'exact', strategy: 'node-id' }
  const fingerprintCandidates = position.nodeFingerprint ? document.navigableNodes.filter((node) => fingerprint(node) === position.nodeFingerprint) : []
  const fingerprintMatch = preferSavedSection(document, fingerprintCandidates, position)
  if (fingerprintMatch) return { node: fingerprintMatch, confidence: 'high', strategy: 'node-fingerprint' }
  const textCandidates = position.textAnchor?.exact ? document.navigableNodes.filter((node) => normalizedText(node.text).includes(position.textAnchor?.exact ?? '')) : []
  const textMatch = preferSavedSection(document, textCandidates, position)
  if (textMatch) return { node: textMatch, confidence: 'medium', strategy: 'text-anchor' }
  const section = position.headingPath?.at(-1) && document.headings.find((heading) => heading.text === position.headingPath?.at(-1))
  if (section) return { node: section, confidence: 'medium', strategy: 'section-heading' }
  return { node: document.navigableNodes[0] ?? null, confidence: 'fallback', strategy: 'document-start' }
}