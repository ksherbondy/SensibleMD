import { describe, expect, it } from 'vitest'
import { DocumentBuffer } from './document-buffer'
import { parseSemanticDocument, searchDocument } from './semantic-document'
import { pageIndexAfter, pageIndexForNode, paginateDocument } from './pagination'
import { changeHeadingLevel } from './structural-commands'
import { analyzeAccessibility } from './accessibility-diagnostics'
import { adjacentHeading, adjacentNavigableNode, bookmarkedHeadings } from './reader-navigation'
import { matchCommands, type CommandDefinition } from './commands'
import { NavigationHistory } from './navigation-history'
import { adjacentCollectionDocument, createCollection, replaceCollectionDocument } from './document-collection'
import { searchCollection, searchResultIndexAfter } from './collection-search'
import { normalizeReaderPreferences } from './reader-preferences'
import { summarizeSection } from './section-summary'
import { resolveInternalMarkdownLink } from './internal-links'
import { sourceForNode } from './reader-copy'
import { createSemanticPosition, resolveSemanticPosition } from './semantic-position'

describe('DocumentBuffer', () => {
  it('rejects transactions created against stale source', () => {
    const buffer = new DocumentBuffer('example', '# Title')
    buffer.replace('# Changed', 'editor')
    expect(() => buffer.apply({ origin: 'editor', baseVersion: 0, edits: [{ from: 0, to: 0, insert: 'Old ' }] })).toThrow('Stale transaction')
  })

  it('tracks dirty and saved versions', () => {
    const buffer = new DocumentBuffer('example', 'text')
    expect(buffer.snapshot().isDirty).toBe(false)
    buffer.replace('changed', 'editor')
    expect(buffer.snapshot().isDirty).toBe(true)
    buffer.markSaved()
    expect(buffer.snapshot().isDirty).toBe(false)
  })
})

describe('semantic documents', () => {
  it('preserves headings and groups search results by section', () => {
    const document = parseSemanticDocument('# Getting started\n\nUse Markdown.\n\n## Search\n\nSearch works here.', 4)
    expect(document.version).toBe(4)
    expect(document.headings.map((heading) => heading.text)).toEqual(['Getting started', 'Search'])
    expect(searchDocument(document, 'search')[0]).toMatchObject({ section: 'Search', occurrences: 1 })
  })
})

describe('pagination', () => {
  it('groups complete semantic blocks without changing their source', () => {
    const source = '# First\n\nOne two three.\n\n## Second\n\nFour five six.'
    const document = parseSemanticDocument(source, 1)
    const pages = paginateDocument(document, 6)
    expect(pages).toHaveLength(2)
    expect(pages[0].fragments[0].source).toBe('# First')
    expect(pages[1].fragments.map((fragment) => fragment.source).join('\n\n')).toContain('## Second')
  })

  it('keeps a heading with its whole oversized paragraph', () => {
    const source = '# First\n\nOne two three four five six seven eight.\n\n## Second\n\nNine ten.'
    const document = parseSemanticDocument(source, 1)
    const pages = paginateDocument(document, 6)
    expect(pages[0].fragments.some((fragment) => fragment.source.startsWith('# First'))).toBe(true)
    expect(pages.flatMap((page) => page.fragments).filter((fragment) => fragment.nodeId === document.nodes[1].id)).toHaveLength(1)
    expect(pages[1].fragments.some((fragment) => fragment.source.startsWith('## Second'))).toBe(true)
  })

  it('keeps page turns within the current page map', () => {
    expect(pageIndexAfter(0, 3, 'previous')).toBe(0)
    expect(pageIndexAfter(0, 3, 'next', 2)).toBe(2)
    expect(pageIndexAfter(2, 3, 'next')).toBe(2)
  })

  it('finds the presentation page containing a semantic node', () => {
    const document = parseSemanticDocument('# One\n\nFirst words.\n\n# Two\n\nSecond words.', 1)
    const pages = paginateDocument(document, 4)
    const secondHeading = document.headings[1]
    expect(pageIndexForNode(pages, secondHeading.id)).toBe(1)
  })
})

describe('structural heading commands', () => {
  it('promotes and demotes only a heading at the requested line', () => {
    const source = '# Title\n\n### Detail\n\nPlain text'
    expect(changeHeadingLevel(source, 3, 'promote')).toEqual({ from: 9, to: 12, insert: '##' })
    expect(changeHeadingLevel(source, 3, 'demote')).toEqual({ from: 9, to: 12, insert: '####' })
    expect(changeHeadingLevel(source, 5, 'promote')).toBeNull()
  })
})

describe('accessibility diagnostics', () => {
  it('distinguishes structural errors from intent-dependent warnings', () => {
    const findings = analyzeAccessibility('### Start\n\n[](https://example.com)\n\n[Click here]()\n\n![Image of a dog](dog.png)\n\n```')
    expect(findings.map((item) => item.ruleId)).toEqual(expect.arrayContaining(['HEAD-006', 'LINK-001', 'LINK-002', 'LINK-003', 'IMG-004', 'CODE-001']))
    expect(findings.find((item) => item.ruleId === 'LINK-001')).toMatchObject({ severity: 'error', confidence: 'high', line: 3 })
    expect(findings.find((item) => item.ruleId === 'LINK-003')).toMatchObject({ severity: 'warning', confidence: 'medium' })
  })

  it('finds empty list items and table header quality issues', () => {
    const findings = analyzeAccessibility('# Data\n\n- Complete\n-\n\n| Name | | Name |\n| --- | --- | --- |\n| A | B | C |')
    expect(findings.map((item) => item.ruleId)).toEqual(expect.arrayContaining(['LIST-002', 'TABLE-002', 'TABLE-003']))
    expect(findings.find((item) => item.ruleId === 'TABLE-002')).toMatchObject({ line: 6, severity: 'warning' })
  })
})

describe('reader navigation', () => {
  it('moves only between semantic headings and resolves bookmarks by ID', () => {
    const headings = parseSemanticDocument('# First\n\nText\n\n## Second\n\nText', 1).headings
    expect(adjacentHeading(headings, headings[0].id, 'next')?.text).toBe('Second')
    expect(adjacentHeading(headings, headings[1].id, 'next')).toBeNull()
    expect(adjacentHeading(headings, '', 'previous')?.text).toBe('Second')
    expect(bookmarkedHeadings(headings, [headings[1].id]).map((heading) => heading.text)).toEqual(['Second'])
  })

  it('traverses source-ordered reader node types without changing source blocks', () => {
    const document = parseSemanticDocument('# First\n\nParagraph.\n\n[Guide](guide.md)\n\n![Diagram](diagram.png)\n\n```ts\nconst value = 1\n```', 1)
    const paragraph = adjacentNavigableNode(document.navigableNodes, '', 'paragraph', 'next')
    expect(paragraph?.text).toBe('Paragraph.')
    expect(adjacentNavigableNode(document.navigableNodes, paragraph?.id ?? '', 'link', 'next')?.text).toBe('Guide')
    expect(adjacentNavigableNode(document.navigableNodes, '', 'image', 'next')?.text).toBe('Diagram')
    expect(adjacentNavigableNode(document.navigableNodes, '', 'code', 'next')?.text).toContain('const value')
  })
})

describe('command palette matching', () => {
  it('finds commands through titles and semantic keywords', () => {
    const commands: CommandDefinition[] = [{ id: 'reader.nextHeading', title: 'Next Heading', keywords: ['navigate', 'forward'], scope: 'reader', enabled: true, execute: () => {} }, { id: 'file.save', title: 'Save Document', keywords: ['write'], scope: 'global', enabled: true, execute: () => {} }]
    expect(matchCommands(commands, 'forward heading').map((command) => command.id)).toEqual(['reader.nextHeading'])
    expect(matchCommands(commands, 'save').map((command) => command.id)).toEqual(['file.save'])
  })
})

describe('semantic navigation history', () => {
  it('moves back and forward and discards forward history on a new branch', () => {
    const history = new NavigationHistory()
    history.visit({ headingId: 'intro', reason: 'outline' })
    history.visit({ headingId: 'setup', reason: 'search' })
    history.visit({ headingId: 'advanced', reason: 'manual' })
    expect(history.back()).toMatchObject({ headingId: 'setup' })
    expect(history.forward()).toMatchObject({ headingId: 'advanced' })
    history.back()
    history.visit({ headingId: 'reference', reason: 'bookmark' })
    expect(history.canGoForward()).toBe(false)
    expect(history.back()).toMatchObject({ headingId: 'setup' })
  })
})

describe('document collections', () => {
  it('keeps each selected Markdown file as an independently addressable chapter', () => {
    const collection = createCollection([{ name: '01 Intro.md', source: '# Intro' }, { name: '02 Guide.md', source: '# Guide' }])
    expect(new Set(collection.map((document) => document.id)).size).toBe(2)
    expect(replaceCollectionDocument(collection, collection[1].id, '# Updated')[1].source).toBe('# Updated')
    expect(collection[0].source).toBe('# Intro')
    expect(adjacentCollectionDocument(collection, collection[0].id, 'next')?.name).toBe('02 Guide.md')
    expect(adjacentCollectionDocument(collection, collection[0].id, 'previous')).toBeNull()
  })
})

describe('collection search', () => {
  it('preserves document and section context across collection results', () => {
    const collection = createCollection([{ name: 'Intro.md', source: '# Intro\n\nFind this.' }, { name: 'Guide.md', source: '# Guide\n\nFind that.' }])
    expect(searchCollection(collection, collection[0].id, 'find', 'document')).toHaveLength(1)
    expect(searchCollection(collection, collection[0].id, 'find', 'collection')).toEqual(expect.arrayContaining([expect.objectContaining({ documentName: 'Guide.md', section: 'Guide' })]))
    expect(searchCollection(collection, collection[0].id, 'intro', 'headings')[0]).toMatchObject({ nodeType: 'heading' })
  })

  it('cycles result selection predictably without invalid indexes', () => {
    expect(searchResultIndexAfter(-1, 3, 'next')).toBe(0)
    expect(searchResultIndexAfter(2, 3, 'next')).toBe(0)
    expect(searchResultIndexAfter(0, 3, 'previous')).toBe(2)
    expect(searchResultIndexAfter(0, 0, 'next')).toBe(-1)
  })
})

describe('reader preferences', () => {
  it('uses safe defaults and bounds layout-affecting values', () => {
    expect(normalizeReaderPreferences({})).toMatchObject({ fontScale: 100, lineHeight: 1.72, reducedMotion: false })
    expect(normalizeReaderPreferences({ fontScale: 200, lineHeight: 1, contentWidth: 200 })).toMatchObject({ fontScale: 150, lineHeight: 1.3, contentWidth: 480 })
  })
})

describe('section summaries', () => {
  it('counts semantic content only until the next peer heading', () => {
    const document = parseSemanticDocument('# Intro\n\n[Guide](guide.md)\n\n![Diagram](diagram.png)\n\n## Detail\n\n- One\n\n# Next\n\nText', 1)
    const summary = summarizeSection(document, document.headings[0].id)
    expect(summary).toMatchObject({ heading: 'Intro', counts: { heading: 2, paragraph: 2, list: 1, image: 1, link: 1 } })
  })
})

describe('internal Markdown links', () => {
  it('resolves an open collection chapter and heading anchor without accepting web URLs', () => {
    const collection = createCollection([{ name: 'intro.md', source: '# Intro' }, { name: 'guide.md', source: '# Install Guide\n\nText' }])
    expect(resolveInternalMarkdownLink(collection, collection[0].id, 'guide.md#install-guide')).toMatchObject({ documentId: collection[1].id })
    expect(resolveInternalMarkdownLink(collection, collection[0].id, 'https://example.com')).toBeNull()
    expect(resolveInternalMarkdownLink(collection, collection[0].id, '#intro')).toMatchObject({ documentId: collection[0].id })
  })
})

describe('reader copy', () => {
  it('copies a complete semantic source range rather than a rendered fragment', () => {
    const document = parseSemanticDocument('# Title\n\nParagraph with **formatting**.\n\n```ts\nconst value = 1\n```', 1)
    expect(sourceForNode(document, document.navigableNodes.find((node) => node.type === 'paragraph'))).toBe('Paragraph with **formatting**.')
    expect(sourceForNode(document, document.navigableNodes.find((node) => node.type === 'code'))).toContain('const value = 1')
  })
})

describe('semantic positions', () => {
  it('restores an exact node and recovers by fingerprint after nearby source changes', () => {
    const original = parseSemanticDocument('# Title\n\nKeep this paragraph.\n\n## Next\n\nOther text.', 1)
    const paragraph = original.navigableNodes.find((node) => node.type === 'paragraph')
    const position = createSemanticPosition(original, paragraph?.id ?? '') ?? undefined
    expect(resolveSemanticPosition(original, position)).toMatchObject({ confidence: 'exact', strategy: 'node-id' })
    const edited = parseSemanticDocument('# Title\n\nNew paragraph first.\n\nKeep this paragraph.\n\n## Next\n\nOther text.', 2)
    expect(resolveSemanticPosition(edited, position)).toMatchObject({ confidence: 'high', strategy: 'node-fingerprint', node: expect.objectContaining({ text: 'Keep this paragraph.' }) })
  })

  it('prefers the saved section for duplicate paragraphs and falls back to it after deletion', () => {
    const original = parseSemanticDocument('# First\n\nRepeated text.\n\n# Second\n\nRepeated text.', 1)
    const target = original.navigableNodes.filter((node) => node.type === 'paragraph')[1]
    const position = createSemanticPosition(original, target.id) ?? undefined
    const moved = parseSemanticDocument('# First\n\nRepeated text.\n\n# Second\n\nOther text.\n\nRepeated text.', 2)
    expect(resolveSemanticPosition(moved, position)).toMatchObject({ confidence: 'high', node: expect.objectContaining({ range: expect.objectContaining({ line: 9 }) }) })
    const deleted = parseSemanticDocument('# First\n\nRepeated text.\n\n# Second\n\nOther text.', 3)
    expect(resolveSemanticPosition(deleted, position)).toMatchObject({ strategy: 'section-heading', node: expect.objectContaining({ text: 'Second' }) })
  })

  it('uses a text anchor when a paragraph is lightly edited', () => {
    const original = parseSemanticDocument('# Setup\n\nInstall the package with npm.', 1)
    const position = createSemanticPosition(original, original.navigableNodes.find((node) => node.type === 'paragraph')?.id ?? '') ?? undefined
    const edited = parseSemanticDocument('# Setup\n\nInstall the package with npm today.', 2)
    expect(resolveSemanticPosition(edited, position)).toMatchObject({ strategy: 'text-anchor', confidence: 'medium' })
  })
})