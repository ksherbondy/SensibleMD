//Framework and third-party packages
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeSanitize from 'rehype-sanitize'
import { Bookmark, BookOpen, Check, ChevronLeft, ChevronRight, Command, Download, FileText, FolderOpen, Search, Settings2, Sparkles, X } from 'lucide-react'

//UI components
const MarkdownEditor = lazy(() => import('./components/MarkdownEditor').then((module) => ({ default: module.MarkdownEditor })))
const CommandPalette = lazy(() => import('./components/CommandPalette').then((module) => ({ default: module.CommandPalette })))

//Core document model
import { DocumentBuffer } from './core/document-buffer'
import { parseSemanticDocument, type SemanticNode } from './core/semantic-document'
import { pageIndexAfter, pageIndexForNode, pageSource, paginateDocument, type BookPage } from './core/pagination'

//Core commands and navigation
import { changeHeadingLevel } from './core/structural-commands'
import { analyzeAccessibility, type FindingSeverity } from './core/accessibility-diagnostics'
import { adjacentHeading, adjacentNavigableNode, bookmarkedHeadings } from './core/reader-navigation'
import type { CommandDefinition } from './core/commands'
import { NavigationHistory, type NavigationReason } from './core/navigation-history'

//Collections and search
import { adjacentCollectionDocument, createCollection, replaceCollectionDocument, type CollectionDocument } from './core/document-collection'
import { searchCollection, searchResultIndexAfter, type SearchScope } from './core/collection-search'

//Reader utilities
import { defaultReaderPreferences, normalizeReaderPreferences } from './core/reader-preferences'
import { summarizeSection } from './core/section-summary'
import { resolveInternalMarkdownLink } from './core/internal-links'
import { sourceForNode } from './core/reader-copy'
import { createSemanticPosition, resolveSemanticPosition, type SemanticPosition } from './core/semantic-position'

//Styles
import './App.css'

type ViewMode = 'read' | 'write' | 'split'
type ReadingMode = 'continuous' | 'single' | 'spread'
type Heading = { id: string; level: number; text: string; line: number }
type SearchOrigin = { documentId: string; headingId: string }
type ReaderMemory = { bookmarks: string[]; activeHeading: string; position?: SemanticPosition }

const starterDocument = `# A quieter way to read Markdown

SensibleMD is a focused reader and authoring space for documents that deserve attention.

## Start where you are

Open a local Markdown file, or use this sample to explore the reading controls. Your document stays local to this device.

![Screenshot](sensiblemd.png)

### Reading with structure

Use the outline to move between sections. Search finds words in the current document, and the reading position returns when you reopen this prototype.

## Accessible authoring

Good Markdown has a useful heading hierarchy, clear links, and meaningful image descriptions. SensibleMD notices likely issues while you write.

[Click here](https://example.com) for more information.

### A final note

This is an editable sample. Try changing a heading, adding a paragraph, or opening your own file.`

function headingId(text: string, line: number) {
  return `heading-${line}-${text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`
}

function readerNodeId(nodeId: string) {
  return `reader-node-${nodeId}`
}

function ReaderSurface({ source, headings, navigableNodes, mode, pages, pageIndex, onPageIndex, onInternalLink }: { source: string; headings: Heading[]; navigableNodes: SemanticNode[]; mode: ReadingMode; pages: BookPage[]; pageIndex: number; onPageIndex: (index: number) => void; onInternalLink: (href: string) => boolean }) {
  const navigationId = (type: string, offset: number | undefined) => {
    const node = navigableNodes.find((item) => item.type === type && item.range.start === offset)
    return node ? readerNodeId(node.id) : undefined
  }
  const renderMarkdown = (markdown: string) => <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{ a: ({ href, children, node }) => <a id={navigationId('link', node?.position?.start.offset)} href={href} target="_blank" rel="noreferrer" onClick={(event) => { if (href && onInternalLink(href)) event.preventDefault() }}>{children}</a>, img: ({ node, ...props }) => <img id={navigationId('image', node?.position?.start.offset)} {...props} />, p: ({ node, children }) => <p id={navigationId('paragraph', node?.position?.start.offset)}>{children}</p>, ul: ({ node, children }) => <ul id={navigationId('list', node?.position?.start.offset)}>{children}</ul>, ol: ({ node, children }) => <ol id={navigationId('list', node?.position?.start.offset)}>{children}</ol>, table: ({ node, children }) => <table id={navigationId('table', node?.position?.start.offset)}>{children}</table>, pre: ({ node, children }) => <pre id={navigationId('code', node?.position?.start.offset)}>{children}</pre>, blockquote: ({ node, children }) => <blockquote id={navigationId('blockquote', node?.position?.start.offset)}>{children}</blockquote>, h1: ({ children }) => <h1 id={headingId(String(children), headings.find((item) => item.text === String(children))?.line ?? 0)}>{children}</h1>, h2: ({ children }) => <h2 id={headingId(String(children), headings.find((item) => item.text === String(children))?.line ?? 0)}>{children}</h2>, h3: ({ children }) => <h3 id={headingId(String(children), headings.find((item) => item.text === String(children))?.line ?? 0)}>{children}</h3> }}>{markdown}</ReactMarkdown>
  if (mode === 'continuous') return <article className="document-reader">{renderMarkdown(source)}</article>
  const visiblePages = pages.slice(pageIndex, pageIndex + (mode === 'spread' ? 2 : 1))
  return <section className={`book-reader ${mode}`} aria-label={`${mode === 'spread' ? 'Two-page' : 'Single-page'} reading mode`}><div className="book-pages">{visiblePages.map((page) => <article className="book-page" key={page.pageNumber} aria-label={`Page ${page.pageNumber}`}>{renderMarkdown(pageSource(page))}<footer>Page {page.pageNumber}</footer></article>)}</div><div className="page-controls"><button type="button" className="icon-button" onClick={() => onPageIndex(Math.max(0, pageIndex - (mode === 'spread' ? 2 : 1)))} disabled={pageIndex === 0} aria-label="Previous page"><ChevronLeft size={18} /></button><span>Page {pageIndex + 1} of {pages.length}</span><button type="button" className="icon-button" onClick={() => onPageIndex(Math.min(Math.max(0, pages.length - 1), pageIndex + (mode === 'spread' ? 2 : 1)))} disabled={pageIndex >= pages.length - 1} aria-label="Next page"><ChevronRight size={18} /></button></div></section>
}

function PreviewSurface({ source, headings }: { source: string; headings: Heading[] }) {
  return <article className="authoring-preview" aria-label="Rendered Markdown preview"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={{ h1: ({ children }) => <h1 id={headingId(String(children), headings.find((item) => item.text === String(children))?.line ?? 0)}>{children}</h1>, h2: ({ children }) => <h2 id={headingId(String(children), headings.find((item) => item.text === String(children))?.line ?? 0)}>{children}</h2>, h3: ({ children }) => <h3 id={headingId(String(children), headings.find((item) => item.text === String(children))?.line ?? 0)}>{children}</h3> }}>{source}</ReactMarkdown></article>
}

function App() {
  const [source, setSource] = useState(() => localStorage.getItem('sensiblemd-document') ?? starterDocument)
  const [documentName, setDocumentName] = useState(() => localStorage.getItem('sensiblemd-name') ?? 'Welcome.md')
  const [collection, setCollection] = useState<CollectionDocument[]>(() => createCollection([{ name: localStorage.getItem('sensiblemd-name') ?? 'Welcome.md', source: localStorage.getItem('sensiblemd-document') ?? starterDocument }]))
  const [activeDocumentId, setActiveDocumentId] = useState(() => createCollection([{ name: localStorage.getItem('sensiblemd-name') ?? 'Welcome.md', source: localStorage.getItem('sensiblemd-document') ?? starterDocument }])[0].id)
  const [isDirty, setIsDirty] = useState(false)
  const [canSaveDirectly, setCanSaveDirectly] = useState(false)
  const [externalChange, setExternalChange] = useState<string | null>(null)
  const [sectionSummaryOpen, setSectionSummaryOpen] = useState(false)
  const [view, setView] = useState<ViewMode>('read')
  const [query, setQuery] = useState('')
  const [searchScope, setSearchScope] = useState<SearchScope>('document')
  const [searchIndex, setSearchIndex] = useState(-1)
  const [searchOrigin, setSearchOrigin] = useState<SearchOrigin | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [fontScale, setFontScale] = useState(() => Number(localStorage.getItem('sensiblemd-font-scale')) || defaultReaderPreferences.fontScale)
  const [lineHeight, setLineHeight] = useState(() => Number(localStorage.getItem('sensiblemd-line-height')) || defaultReaderPreferences.lineHeight)
  const [contentWidth, setContentWidth] = useState(() => Number(localStorage.getItem('sensiblemd-content-width')) || defaultReaderPreferences.contentWidth)
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem('sensiblemd-reduced-motion') === 'true')
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => { const saved = localStorage.getItem('sensiblemd-reading-mode'); return saved === 'single' || saved === 'spread' ? saved : 'continuous' })
  const [pageIndex, setPageIndex] = useState(0)
    const [editorLine, setEditorLine] = useState(1)
  const [diagnosticLine, setDiagnosticLine] = useState<number | null>(null)
  const [bookmarksOpen, setBookmarksOpen] = useState(false)
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [bookmarks, setBookmarks] = useState<string[]>(() => JSON.parse(localStorage.getItem('sensiblemd-bookmarks') ?? '[]'))
  const [activeHeading, setActiveHeading] = useState(() => localStorage.getItem('sensiblemd-position') ?? '')
  const [activeNodeId, setActiveNodeId] = useState('')
  const [copyStatus, setCopyStatus] = useState('')
  const [appStatus, setAppStatus] = useState('')
  const [recoverySnapshot, setRecoverySnapshot] = useState<{ source: string; savedAt: string } | null>(null)
  const [recentDocuments, setRecentDocuments] = useState<Array<{ index: number; name: string }>>([])
  const [findingFilter, setFindingFilter] = useState<FindingSeverity | 'all'>('all')
  const [readerMemory, setReaderMemory] = useState<Record<string, ReaderMemory>>(() => JSON.parse(localStorage.getItem('sensiblemd-reader-memory') ?? '{}'))
  const fileInput = useRef<HTMLInputElement>(null)
  const collectionInput = useRef<HTMLInputElement>(null)
  const bufferRef = useRef<DocumentBuffer | null>(null)
  const historyRef = useRef(new NavigationHistory())
  if (bufferRef.current === null) bufferRef.current = new DocumentBuffer('active-document', source)
  const buffer = bufferRef.current
  const semanticDocument = parseSemanticDocument(source, buffer.snapshot().version)
  const headings: Heading[] = semanticDocument.headings.map((heading) => ({ ...heading, line: heading.range.line }))
  const allFindings = analyzeAccessibility(source)
  const findings = findingFilter === 'all' ? allFindings : allFindings.filter((finding) => finding.severity === findingFilter)
  const wordCount = semanticDocument.wordCount
  const searchResults = searchCollection(collection, activeDocumentId, query, searchScope)
  const matches = searchResults.reduce((total, result) => total + result.occurrences, 0)
  const pages = paginateDocument(semanticDocument, readingMode === 'spread' ? 52 : 76)
  const chapterIndex = collection.findIndex((document) => document.id === activeDocumentId)
  const collectionWordCount = collection.reduce((total, document) => total + parseSemanticDocument(document.source, 0).wordCount, 0)
  const savedHeadings = bookmarkedHeadings(semanticDocument.headings, bookmarks).map((heading) => headings.find((item) => item.id === heading.id)).filter((heading): heading is Heading => Boolean(heading))
  const sectionSummary = summarizeSection(semanticDocument, activeHeading)

  useEffect(() => {
    localStorage.setItem('sensiblemd-document', source)
    localStorage.setItem('sensiblemd-name', documentName)
    localStorage.setItem('sensiblemd-bookmarks', JSON.stringify(bookmarks))
    localStorage.setItem('sensiblemd-position', activeHeading)
    localStorage.setItem('sensiblemd-font-scale', String(fontScale))
    localStorage.setItem('sensiblemd-line-height', String(lineHeight))
    localStorage.setItem('sensiblemd-content-width', String(contentWidth))
    localStorage.setItem('sensiblemd-reduced-motion', String(reducedMotion))
    localStorage.setItem('sensiblemd-reading-mode', readingMode)
    localStorage.setItem('sensiblemd-reader-memory', JSON.stringify(readerMemory))
  }, [source, documentName, bookmarks, activeHeading, fontScale, lineHeight, contentWidth, reducedMotion, readingMode])

  useEffect(() => {
    const position = createSemanticPosition(semanticDocument, activeNodeId || activeHeading) ?? undefined
    setReaderMemory((memory) => ({ ...memory, [activeDocumentId]: { bookmarks, activeHeading, position } }))
  }, [activeDocumentId, activeHeading, activeNodeId, bookmarks, source])

  useEffect(() => {
    localStorage.setItem('sensiblemd-reader-memory', JSON.stringify(readerMemory))
  }, [readerMemory])

  const refreshRecentDocuments = () => {
    const listRecentDocuments = window.sensibleMD?.listRecentDocuments
    if (typeof listRecentDocuments !== 'function') return
    void listRecentDocuments().then(setRecentDocuments).catch(() => setAppStatus('Recent files are temporarily unavailable.'))
  }

  useEffect(() => { refreshRecentDocuments() }, [])

  useEffect(() => {
    const remembered = readerMemory[activeDocumentId]?.position
    if (!remembered) return
    const resolved = resolveSemanticPosition(semanticDocument, remembered)
    if (!resolved.node) return
    const owningHeading = [...semanticDocument.headings].reverse().find((heading) => heading.range.start <= resolved.node!.range.start)
    setActiveNodeId(resolved.node.id)
    setActiveHeading(owningHeading?.id ?? '')
    requestAnimationFrame(() => document.getElementById(readerNodeId(resolved.node!.id))?.scrollIntoView({ behavior: 'auto', block: 'center' }))
  }, [])

  useEffect(() => {
    const loadState = window.sensibleMD?.loadDocumentState
    if (typeof loadState !== 'function') return
    loadState(activeDocumentId).then((state) => {
      if (!state) return
      setBookmarks(state.bookmarks)
      setActiveHeading(state.activeHeading)
      if (state.position) {
        const resolved = resolveSemanticPosition(semanticDocument, state.position)
        setActiveNodeId(resolved.node?.id ?? '')
      }
      setFontScale(state.fontScale)
      setLineHeight(state.lineHeight ?? defaultReaderPreferences.lineHeight)
      setContentWidth(state.contentWidth ?? defaultReaderPreferences.contentWidth)
      setReducedMotion(state.reducedMotion ?? defaultReaderPreferences.reducedMotion)
    }).catch(() => setAppStatus('Desktop settings are temporarily unavailable. Restart the desktop app to reconnect.'))
  }, [activeDocumentId])

  useEffect(() => {
    const saveState = window.sensibleMD?.saveDocumentState
    if (typeof saveState !== 'function') return
    const timer = window.setTimeout(() => {
      void saveState({ documentId: activeDocumentId, bookmarks, activeHeading, position: createSemanticPosition(semanticDocument, activeNodeId || activeHeading) ?? undefined, fontScale, lineHeight, contentWidth, reducedMotion }).catch(() => setAppStatus('Desktop settings could not be saved. Your document remains open.'))
    }, 500)
    return () => window.clearTimeout(timer)
  }, [activeDocumentId, activeHeading, activeNodeId, bookmarks, fontScale, lineHeight, contentWidth, reducedMotion, source])

  useEffect(() => {
    const saveRecoverySnapshot = window.sensibleMD?.saveRecoverySnapshot
    if (!isDirty || typeof saveRecoverySnapshot !== 'function') return
    const snapshot = buffer.snapshot()
    const timer = window.setTimeout(() => {
      void saveRecoverySnapshot({ documentId: activeDocumentId, version: snapshot.version, source: snapshot.text }).catch(() => setAppStatus('Recovery snapshot could not be saved. Your document remains open.'))
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [activeDocumentId, buffer, isDirty, source])

  useEffect(() => {
    const loadRecoverySnapshot = window.sensibleMD?.loadRecoverySnapshot
    if (typeof loadRecoverySnapshot !== 'function') return
    void loadRecoverySnapshot(activeDocumentId).then((snapshot) => {
      if (snapshot?.source && snapshot.source !== buffer.snapshot().text) setRecoverySnapshot(snapshot)
    }).catch(() => setAppStatus('Recovery check is temporarily unavailable.'))
  }, [activeDocumentId])

  useEffect(() => {
    const subscribe = window.sensibleMD?.onExternalDocumentChange
    if (typeof subscribe !== 'function') return
    return subscribe(({ source: diskSource }) => {
      if (diskSource === buffer.snapshot().text) return
      if (isDirty) { setExternalChange(diskSource); return }
      buffer.replace(diskSource, 'external-reload')
      buffer.markSaved()
      setCollection((documents) => replaceCollectionDocument(documents, activeDocumentId, diskSource))
      setSource(diskSource)
    })
  }, [activeDocumentId, buffer, isDirty])

  useEffect(() => {
    setSearchIndex(-1)
    setSearchOrigin(null)
  }, [query, searchScope])

  useEffect(() => {
    if (readingMode === 'continuous' || !activeNodeId && !activeHeading) return
    const presentationPages = paginateDocument(semanticDocument, readingMode === 'spread' ? 52 : 76)
    const nextPageIndex = pageIndexForNode(presentationPages, activeNodeId || activeHeading)
    setPageIndex((currentIndex) => currentIndex === nextPageIndex ? currentIndex : nextPageIndex)
  }, [activeHeading, activeNodeId, readingMode, source])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') { event.preventDefault(); setView((current) => current === 'read' ? 'write' : 'read') }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandPaletteOpen(true) }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') { event.preventDefault(); document.getElementById('document-search')?.focus() }
      if (view === 'read' && event.altKey && event.key === 'ArrowDown') { event.preventDefault(); navigateHeading('next') }
      if (view === 'read' && event.altKey && event.key === 'ArrowUp') { event.preventDefault(); navigateHeading('previous') }
      const target = event.target
      const editingTarget = target instanceof Element && target.closest('input, textarea, [contenteditable="true"]')
      if (view === 'read' && readingMode !== 'continuous' && !editingTarget) {
        if (event.key === 'ArrowRight') { event.preventDefault(); turnPage('next') }
        if (event.key === 'ArrowLeft') { event.preventDefault(); turnPage('previous') }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeHeading, headings, readingMode, view])

  const goToHeading = (heading: Heading, reason: NavigationReason = 'manual', recordHistory = true) => {
    if (recordHistory) historyRef.current.visit({ documentId: activeDocumentId, headingId: heading.id, reason })
    setActiveHeading(heading.id)
    setActiveNodeId(heading.id)
    setView('read')
    requestAnimationFrame(() => document.getElementById(heading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const navigateHeading = (direction: 'next' | 'previous') => {
    const target = adjacentHeading(semanticDocument.headings, activeHeading, direction)
    const heading = target && headings.find((item) => item.id === target.id)
    if (heading) goToHeading(heading)
  }
  const goToNode = (node: SemanticNode) => {
    const owningHeading = [...semanticDocument.headings].reverse().find((heading) => heading.range.start <= node.range.start)
    setActiveNodeId(node.id)
    setActiveHeading(owningHeading?.id ?? '')
    setView('read')
    requestAnimationFrame(() => document.getElementById(readerNodeId(node.id))?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const navigateStructure = (type: 'paragraph' | 'link' | 'image' | 'table' | 'code', direction: 'next' | 'previous') => {
    const target = adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, type, direction)
    if (target) goToNode(target)
  }
  const copyCurrentNode = (type: 'paragraph' | 'code') => {
    const current = semanticDocument.navigableNodes.find((node) => node.id === activeNodeId && node.type === type)
      ?? adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, type, 'next')
    const sourceToCopy = sourceForNode(semanticDocument, current)
    if (!sourceToCopy) { setCopyStatus(`No ${type === 'code' ? 'code block' : 'paragraph'} is available to copy.`); return }
    void navigator.clipboard.writeText(sourceToCopy).then(() => setCopyStatus(`${type === 'code' ? 'Code block' : 'Paragraph'} copied.`)).catch(() => setCopyStatus('Copy was blocked by this browser.'))
  }
  const setPageAndContext = (nextIndex: number) => {
    setPageIndex(nextIndex)
    const headingFragment = pages[nextIndex]?.fragments.find((fragment) => semanticDocument.headings.some((heading) => heading.id === fragment.nodeId))
    const heading = headingFragment && headings.find((item) => item.id === headingFragment.nodeId)
    if (heading) setActiveHeading(heading.id)
  }
  const turnPage = (direction: 'next' | 'previous') => {
    const step = readingMode === 'spread' ? 2 : 1
    setPageAndContext(pageIndexAfter(pageIndex, pages.length, direction, step))
  }
  const goThroughHistory = (direction: 'back' | 'forward') => {
    const entry = direction === 'back' ? historyRef.current.back() : historyRef.current.forward()
    const targetDocument = entry?.documentId && collection.find((document) => document.id === entry.documentId)
    if (entry && targetDocument && targetDocument.id !== activeDocumentId) {
      buffer.replace(targetDocument.source, 'programmatic')
      setActiveDocumentId(targetDocument.id)
      setSource(targetDocument.source)
      setDocumentName(targetDocument.name)
      const targetHeading = parseSemanticDocument(targetDocument.source, buffer.snapshot().version).headings.find((heading) => heading.id === entry.headingId)
      setActiveHeading(targetHeading?.id ?? '')
      if (targetHeading) requestAnimationFrame(() => document.getElementById(targetHeading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
      return
    }
    const heading = entry && headings.find((item) => item.id === entry.headingId)
    if (heading) goToHeading(heading, 'history', false)
  }
  const followInternalLink = (href: string) => {
    const target = resolveInternalMarkdownLink(collection, activeDocumentId, href)
    if (!target) return false
    const targetDocument = collection.find((document) => document.id === target.documentId)
    if (!targetDocument) return false
    const targetHeadings = parseSemanticDocument(targetDocument.source, buffer.snapshot().version).headings
    const targetHeading = target.headingId ? targetHeadings.find((heading) => heading.id === target.headingId) : targetHeadings[0]
    if (targetDocument.id === activeDocumentId) {
      const heading = targetHeading && headings.find((item) => item.id === targetHeading.id)
      if (heading) goToHeading(heading, 'link')
      return true
    }
    const originHeadingId = activeHeading || headings[0]?.id
    if (originHeadingId) historyRef.current.visit({ documentId: activeDocumentId, headingId: originHeadingId, reason: 'manual' })
    buffer.replace(targetDocument.source, 'programmatic')
    setActiveDocumentId(targetDocument.id)
    setSource(targetDocument.source)
    setDocumentName(targetDocument.name)
    setActiveHeading(targetHeading?.id ?? '')
    setView('read')
    if (targetHeading) historyRef.current.visit({ documentId: targetDocument.id, headingId: targetHeading.id, reason: 'link' })
    requestAnimationFrame(() => targetHeading && document.getElementById(targetHeading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    return true
  }
  const updateSource = (nextSource: string) => {
    if (nextSource === buffer.snapshot().text) return
    buffer.replace(nextSource, 'editor')
    setCollection((documents) => replaceCollectionDocument(documents, activeDocumentId, nextSource))
    setSource(nextSource)
    setIsDirty(true)
  }
  const changeCurrentHeading = (direction: 'promote' | 'demote') => {
    const edit = changeHeadingLevel(source, editorLine, direction)
    if (!edit) return
    buffer.apply({ origin: 'structural-command', baseVersion: buffer.snapshot().version, edits: [edit] })
    setCollection((documents) => replaceCollectionDocument(documents, activeDocumentId, buffer.snapshot().text))
    setSource(buffer.snapshot().text)
    setIsDirty(true)
  }
  const goToSearchResult = (line: number, recordHistory = true) => {
    const heading = [...headings].reverse().find((item) => item.line <= line) ?? headings[0]
    if (heading) goToHeading(heading, 'search', recordHistory)
  }
  const goToCollectionSearchResult = (result: typeof searchResults[number], recordHistory = true) => {
    const targetDocument = collection.find((document) => document.id === result.documentId)
    if (!targetDocument) return
    if (targetDocument.id !== activeDocumentId) {
      buffer.replace(targetDocument.source, 'programmatic')
      setActiveDocumentId(targetDocument.id)
      setSource(targetDocument.source)
      setDocumentName(targetDocument.name)
      setActiveHeading('')
      setView('read')
      const targetHeadings = parseSemanticDocument(targetDocument.source, buffer.snapshot().version).headings
      const targetHeading = [...targetHeadings].reverse().find((heading) => heading.range.line <= result.line) ?? targetHeadings[0]
      if (targetHeading) requestAnimationFrame(() => { setActiveHeading(targetHeading.id); document.getElementById(targetHeading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) })
      return
    }
    goToSearchResult(result.line, recordHistory)
  }
  const navigateSearchResults = (direction: 'next' | 'previous') => {
    const nextIndex = searchResultIndexAfter(searchIndex, searchResults.length, direction)
    if (nextIndex < 0) return
    if (!searchOrigin) {
      const headingId = activeHeading || headings[0]?.id
      if (headingId) setSearchOrigin({ documentId: activeDocumentId, headingId })
    }
    setSearchIndex(nextIndex)
    goToCollectionSearchResult(searchResults[nextIndex], false)
  }
  const returnToSearchOrigin = () => {
    if (!searchOrigin) return
    const originDocument = collection.find((document) => document.id === searchOrigin.documentId)
    if (!originDocument) return
    if (originDocument.id === activeDocumentId) {
      const heading = headings.find((item) => item.id === searchOrigin.headingId)
      if (heading) goToHeading(heading, 'history', false)
    } else {
      buffer.replace(originDocument.source, 'programmatic')
      setActiveDocumentId(originDocument.id)
      setSource(originDocument.source)
      setDocumentName(originDocument.name)
      setActiveHeading(searchOrigin.headingId)
      setView('read')
      requestAnimationFrame(() => document.getElementById(searchOrigin.headingId)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    }
    setSearchOrigin(null)
    setSearchIndex(-1)
  }
  const openFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const fileReader = new FileReader()
    fileReader.onload = () => { const source = String(fileReader.result); const documents = createCollection([{ name: file.name, source }]); buffer.replace(source, 'programmatic'); buffer.markSaved(); setCollection(documents); setActiveDocumentId(documents[0].id); setSource(source); setDocumentName(file.name); setCanSaveDirectly(false); setIsDirty(false); setActiveHeading(''); setActiveNodeId(''); setView('read') }
    fileReader.readAsText(file)
    event.target.value = ''
  }
  const openCollection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return
    Promise.all(files.map((file) => file.text().then((source) => ({ name: file.name, source })))).then((filesWithSource) => {
      const documents = createCollection(filesWithSource.sort((left, right) => left.name.localeCompare(right.name)))
      const active = documents[0]
      setCollection(documents)
      setActiveDocumentId(active.id)
      buffer.replace(active.source, 'programmatic')
      buffer.markSaved()
      setSource(active.source)
      setDocumentName(active.name)
      setCanSaveDirectly(false)
      setIsDirty(false)
      setActiveHeading('')
      setView('read')
    })
    event.target.value = ''
  }
  const switchDocument = (collectionDocument: CollectionDocument) => {
    if (collectionDocument.id === activeDocumentId) return
    const currentPosition = createSemanticPosition(semanticDocument, activeNodeId || activeHeading) ?? undefined
    setReaderMemory((memory) => ({ ...memory, [activeDocumentId]: { bookmarks, activeHeading, position: currentPosition } }))
    const remembered = readerMemory[collectionDocument.id]
    const targetModel = parseSemanticDocument(collectionDocument.source, buffer.snapshot().version)
    const headingIds = new Set(targetModel.headings.map((heading) => heading.id))
    const resolved = resolveSemanticPosition(targetModel, remembered?.position)
    const owningHeading = resolved.node && [...targetModel.headings].reverse().find((heading) => heading.range.start <= resolved.node!.range.start)
    buffer.replace(collectionDocument.source, 'programmatic')
    setActiveDocumentId(collectionDocument.id)
    setSource(collectionDocument.source)
    setDocumentName(collectionDocument.name)
    setCanSaveDirectly(false)
    setIsDirty(false)
    setBookmarks(remembered?.bookmarks.filter((bookmark) => headingIds.has(bookmark)) ?? [])
    setActiveNodeId(resolved.node?.id ?? '')
    setActiveHeading(owningHeading?.id ?? (remembered && headingIds.has(remembered.activeHeading) ? remembered.activeHeading : ''))
    setView('read')
    if (resolved.node) requestAnimationFrame(() => document.getElementById(readerNodeId(resolved.node!.id))?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }
  const navigateChapter = (direction: 'next' | 'previous') => {
    const targetDocument = adjacentCollectionDocument(collection, activeDocumentId, direction)
    if (!targetDocument) return
    const originHeadingId = activeHeading || headings[0]?.id
    if (originHeadingId) historyRef.current.visit({ documentId: activeDocumentId, headingId: originHeadingId, reason: 'manual' })
    buffer.replace(targetDocument.source, 'programmatic')
    const targetHeading = parseSemanticDocument(targetDocument.source, buffer.snapshot().version).headings[0]
    setActiveDocumentId(targetDocument.id)
    setSource(targetDocument.source)
    setDocumentName(targetDocument.name)
    setActiveHeading(targetHeading?.id ?? '')
    setCanSaveDirectly(false)
    setIsDirty(false)
    setView('read')
    if (targetHeading) historyRef.current.visit({ documentId: targetDocument.id, headingId: targetHeading.id, reason: 'manual' })
    requestAnimationFrame(() => targetHeading && document.getElementById(targetHeading.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }
  const openDocument = async () => {
    const openNativeDocument = window.sensibleMD?.openDocument
    if (typeof openNativeDocument !== 'function') { fileInput.current?.click(); return }
    const file = await openNativeDocument().catch(() => { setAppStatus('The Markdown file could not be opened.'); return null })
    if (!file) return
    const documents = createCollection([{ name: file.name, source: file.source }])
    buffer.replace(file.source, 'programmatic')
    buffer.markSaved()
    setCollection(documents)
    setActiveDocumentId(documents[0].id)
    setSource(file.source)
    setDocumentName(file.name)
    setCanSaveDirectly(true)
    setIsDirty(false)
    setActiveHeading('')
    setActiveNodeId('')
    setView('read')
    refreshRecentDocuments()
  }
  const openRecentDocument = async (index: number) => {
    const openRecent = window.sensibleMD?.openRecentDocument
    if (typeof openRecent !== 'function') return
    const file = await openRecent(index).catch(() => { setAppStatus('The recent file could not be opened.'); return null })
    if (!file) { setAppStatus('That recent file is no longer available.'); return }
    const documents = createCollection([{ name: file.name, source: file.source }])
    buffer.replace(file.source, 'programmatic')
    buffer.markSaved()
    setCollection(documents)
    setActiveDocumentId(documents[0].id)
    setSource(file.source)
    setDocumentName(file.name)
    setCanSaveDirectly(true)
    setIsDirty(false)
    setActiveHeading('')
    setActiveNodeId('')
    setView('read')
    refreshRecentDocuments()
  }
  const saveFile = () => {
    const saveOpenedDocument = window.sensibleMD?.saveOpenedDocument
    if (canSaveDirectly && typeof saveOpenedDocument === 'function') {
      void saveOpenedDocument({ source }).then(() => { buffer.markSaved(); setIsDirty(false); setAppStatus('Saved.') }).catch(() => setAppStatus('The file could not be saved. Your edits are still open.'))
      return
    }
    const saveNativeDocument = window.sensibleMD?.saveDocumentAs
    if (typeof saveNativeDocument === 'function') {
      void saveNativeDocument({ name: documentName, source }).then((file) => {
        if (file) { setDocumentName(file.name); buffer.markSaved(); setIsDirty(false); setAppStatus('Saved.') }
      }).catch(() => setAppStatus('The file could not be saved. Your edits are still open.'))
      return
    }
    const blob = new Blob([source], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = documentName.endsWith('.md') ? documentName : `${documentName}.md`
    link.click()
    URL.revokeObjectURL(url)
    buffer.markSaved()
    setIsDirty(false)
    setAppStatus('Download started.')
  }
  const reloadExternalChange = () => {
    if (externalChange === null) return
    buffer.replace(externalChange, 'external-reload')
    buffer.markSaved()
    setCollection((documents) => replaceCollectionDocument(documents, activeDocumentId, externalChange))
    setSource(externalChange)
    setIsDirty(false)
    setExternalChange(null)
  }
  const restoreRecoverySnapshot = () => {
    if (!recoverySnapshot) return
    buffer.replace(recoverySnapshot.source, 'recovery')
    setCollection((documents) => replaceCollectionDocument(documents, activeDocumentId, recoverySnapshot.source))
    setSource(recoverySnapshot.source)
    setIsDirty(true)
    setRecoverySnapshot(null)
    setAppStatus('Recovered unsaved changes. Save when ready.')
  }
  const toggleBookmark = () => activeHeading && setBookmarks((items) => items.includes(activeHeading) ? items.filter((item) => item !== activeHeading) : [...items, activeHeading])
  const commands: CommandDefinition[] = [
    { id: 'app.openFile', title: 'Open Markdown File', keywords: ['document', 'file'], shortcut: 'Cmd/Ctrl+O', scope: 'global', enabled: true, execute: () => void openDocument() },
    ...recentDocuments.map((recent) => ({ id: `app.openRecent.${recent.index}`, title: `Open Recent: ${recent.name}`, keywords: ['recent', 'document', 'file'], scope: 'global' as const, enabled: true, execute: () => void openRecentDocument(recent.index) })),
    { id: 'app.openCollection', title: 'Open Markdown Collection', keywords: ['chapters', 'book', 'multiple files'], scope: 'global', enabled: true, execute: () => collectionInput.current?.click() },
    { id: 'file.save', title: 'Save Markdown File', keywords: ['document', 'download'], shortcut: 'Cmd/Ctrl+S', scope: 'global', enabled: true, execute: saveFile },
    { id: 'reader.nextHeading', title: 'Next Heading', keywords: ['navigate', 'forward', 'section'], shortcut: 'Alt+Down', scope: 'reader', enabled: view === 'read' && Boolean(adjacentHeading(semanticDocument.headings, activeHeading, 'next')), disabledReason: 'No next heading is available.', execute: () => navigateHeading('next') },
    { id: 'reader.previousHeading', title: 'Previous Heading', keywords: ['navigate', 'back', 'section'], shortcut: 'Alt+Up', scope: 'reader', enabled: view === 'read' && Boolean(adjacentHeading(semanticDocument.headings, activeHeading, 'previous')), disabledReason: 'No previous heading is available.', execute: () => navigateHeading('previous') },
    { id: 'reader.nextParagraph', title: 'Next Paragraph', keywords: ['navigate', 'forward', 'text'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'paragraph', 'next')), disabledReason: 'No next paragraph is available.', execute: () => navigateStructure('paragraph', 'next') },
    { id: 'reader.previousParagraph', title: 'Previous Paragraph', keywords: ['navigate', 'back', 'text'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'paragraph', 'previous')), disabledReason: 'No previous paragraph is available.', execute: () => navigateStructure('paragraph', 'previous') },
    { id: 'reader.nextLink', title: 'Next Link', keywords: ['navigate', 'forward'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'link', 'next')), disabledReason: 'No next link is available.', execute: () => navigateStructure('link', 'next') },
    { id: 'reader.nextImage', title: 'Next Image', keywords: ['navigate', 'forward'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'image', 'next')), disabledReason: 'No next image is available.', execute: () => navigateStructure('image', 'next') },
    { id: 'reader.nextTable', title: 'Next Table', keywords: ['navigate', 'forward'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'table', 'next')), disabledReason: 'No next table is available.', execute: () => navigateStructure('table', 'next') },
    { id: 'reader.nextCodeBlock', title: 'Next Code Block', keywords: ['navigate', 'forward'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'code', 'next')), disabledReason: 'No next code block is available.', execute: () => navigateStructure('code', 'next') },
    { id: 'reader.copyCurrentParagraph', title: 'Copy Current Paragraph', keywords: ['reader', 'clipboard', 'text'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'paragraph', 'next')), disabledReason: 'No paragraph is available to copy.', execute: () => copyCurrentNode('paragraph') },
    { id: 'reader.copyCurrentCodeBlock', title: 'Copy Current Code Block', keywords: ['reader', 'clipboard', 'code'], scope: 'reader', enabled: view === 'read' && Boolean(adjacentNavigableNode(semanticDocument.navigableNodes, activeNodeId || activeHeading, 'code', 'next')), disabledReason: 'No code block is available to copy.', execute: () => copyCurrentNode('code') },
    { id: 'history.back', title: 'Go Back', keywords: ['history', 'previous location'], scope: 'reader', enabled: historyRef.current.canGoBack(), disabledReason: 'No previous reading location is available.', execute: () => goThroughHistory('back') },
    { id: 'history.forward', title: 'Go Forward', keywords: ['history', 'next location'], scope: 'reader', enabled: historyRef.current.canGoForward(), disabledReason: 'No forward reading location is available.', execute: () => goThroughHistory('forward') },
    { id: 'book.nextPage', title: 'Next Page', keywords: ['book', 'forward', 'turn'], shortcut: 'Right Arrow', scope: 'book', enabled: view === 'read' && readingMode !== 'continuous' && pageIndex < pages.length - 1, disabledReason: 'No next page is available.', execute: () => turnPage('next') },
    { id: 'book.previousPage', title: 'Previous Page', keywords: ['book', 'back', 'turn'], shortcut: 'Left Arrow', scope: 'book', enabled: view === 'read' && readingMode !== 'continuous' && pageIndex > 0, disabledReason: 'No previous page is available.', execute: () => turnPage('previous') },
    { id: 'book.nextChapter', title: 'Next Chapter', keywords: ['book', 'collection', 'forward'], scope: 'book', enabled: view === 'read' && Boolean(adjacentCollectionDocument(collection, activeDocumentId, 'next')), disabledReason: 'No next chapter is available.', execute: () => navigateChapter('next') },
    { id: 'book.previousChapter', title: 'Previous Chapter', keywords: ['book', 'collection', 'back'], scope: 'book', enabled: view === 'read' && Boolean(adjacentCollectionDocument(collection, activeDocumentId, 'previous')), disabledReason: 'No previous chapter is available.', execute: () => navigateChapter('previous') },
    { id: 'search.nextResult', title: 'Next Search Result', keywords: ['find', 'forward', 'match'], scope: 'search', enabled: searchResults.length > 0, disabledReason: 'Enter a search query with results first.', execute: () => navigateSearchResults('next') },
    { id: 'search.previousResult', title: 'Previous Search Result', keywords: ['find', 'back', 'match'], scope: 'search', enabled: searchResults.length > 0, disabledReason: 'Enter a search query with results first.', execute: () => navigateSearchResults('previous') },
    { id: 'search.returnToOrigin', title: 'Return to Search Origin', keywords: ['find', 'back', 'reading position'], scope: 'search', enabled: searchOrigin !== null, disabledReason: 'Search result navigation has not moved from a reading position.', execute: returnToSearchOrigin },
    { id: 'bookmark.addCurrentPosition', title: 'Toggle Current Bookmark', keywords: ['save', 'section'], scope: 'reader', enabled: view === 'read' && Boolean(activeHeading), disabledReason: 'Navigate to a heading before bookmarking it.', execute: toggleBookmark },
    { id: 'accessibility.showCurrentContext', title: 'Show Current Section Context', keywords: ['accessibility', 'summary', 'describe', 'section'], scope: 'reader', enabled: view === 'read', execute: () => setSectionSummaryOpen(true) },
    { id: 'editor.enterRawMode', title: 'Enter Writing Mode', keywords: ['edit', 'source'], shortcut: 'Cmd/Ctrl+E', scope: 'global', enabled: view !== 'write', disabledReason: 'Already in writing mode.', execute: () => setView('write') },
    { id: 'editor.enterSplitMode', title: 'Enter Split Preview', keywords: ['edit', 'source', 'rendered', 'side by side'], scope: 'global', enabled: view !== 'split', disabledReason: 'Already in split preview.', execute: () => setView('split') },
    { id: 'reader.enterRenderedMode', title: 'Enter Reading Mode', keywords: ['preview', 'rendered'], shortcut: 'Cmd/Ctrl+E', scope: 'global', enabled: view !== 'read', disabledReason: 'Already in reading mode.', execute: () => setView('read') },
    { id: 'accessibility.openFindings', title: 'Show Authoring Checks', keywords: ['accessibility', 'diagnostics', 'issues'], scope: 'editor', enabled: true, execute: () => setView('write') },
    { id: 'diagnostics.showErrors', title: 'Show Diagnostic Errors', keywords: ['accessibility', 'findings', 'filter'], scope: 'editor', enabled: true, execute: () => { setFindingFilter('error'); setView('write') } },
    { id: 'diagnostics.showWarnings', title: 'Show Diagnostic Warnings', keywords: ['accessibility', 'findings', 'filter'], scope: 'editor', enabled: true, execute: () => { setFindingFilter('warning'); setView('write') } },
    { id: 'diagnostics.showAll', title: 'Show All Diagnostics', keywords: ['accessibility', 'findings', 'filter'], scope: 'editor', enabled: true, execute: () => { setFindingFilter('all'); setView('write') } },
    { id: 'settings.show', title: 'Show Reading Settings', keywords: ['text', 'size', 'preferences'], scope: 'global', enabled: true, execute: () => setSettingsOpen(true) },
  ]

  const preferences = normalizeReaderPreferences({ fontScale, lineHeight, contentWidth, reducedMotion })
  return <div className={preferences.reducedMotion ? 'app-shell reduced-motion' : 'app-shell'} data-dirty={isDirty} style={{ '--reader-scale': `${preferences.fontScale}%`, '--reader-line-height': String(preferences.lineHeight), '--reader-width': `${preferences.contentWidth}px` } as React.CSSProperties}>
    <header className="topbar"><div className="brand" aria-label="SensibleMD"><span className="brand-mark"><BookOpen size={20} /></span><span>SensibleMD</span></div><div className="document-title"><FileText size={16} /><span>{documentName}</span><span className="saved"><Check size={14} /> Saved locally</span></div><div className="topbar-actions"><button className="icon-button" type="button" onClick={openDocument} aria-label="Open Markdown file" title="Open Markdown file"><FolderOpen size={18} /></button><button className="icon-button" type="button" onClick={saveFile} aria-label="Save Markdown file" title="Save Markdown file"><Download size={18} /></button><button className="icon-button" type="button" onClick={() => setSettingsOpen((open) => !open)} aria-label="Reading settings" aria-expanded={settingsOpen} title="Reading settings"><Settings2 size={18} /></button><button className="icon-button" type="button" onClick={() => setCommandPaletteOpen(true)} aria-label="Show command palette" title="Show command palette (Cmd/Ctrl+K)"><Command size={18} /></button></div><input ref={fileInput} className="visually-hidden" type="file" accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain" onChange={openFile} /></header>
    <input ref={collectionInput} className="visually-hidden" type="file" multiple accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain" onChange={openCollection} />
    {commandPaletteOpen && <Suspense fallback={null}><CommandPalette commands={commands} onClose={() => setCommandPaletteOpen(false)} /></Suspense>}
    <div className={`workspace ${outlineOpen ? '' : 'outline-closed'}`}><aside className={`outline-panel ${outlineOpen ? '' : 'collapsed'}`} aria-label="Document outline"><div className="panel-heading"><span>{collection.length > 1 ? `Chapters · ${collection.length}` : 'Outline'}</span><button type="button" className="icon-button small" onClick={() => setOutlineOpen(false)} aria-label="Close outline"><X size={16} /></button></div>{collection.length > 1 && <nav className="chapter-list" aria-label="Collection chapters">{collection.map((document, index) => <button type="button" key={document.id} onClick={() => switchDocument(document)} className={document.id === activeDocumentId ? 'active' : ''}><small>{String(index + 1).padStart(2, '0')}</small>{document.name}</button>)}</nav>}<nav>{headings.length ? headings.map((heading) => <button type="button" key={heading.id} onClick={() => goToHeading(heading, 'outline')} className={`outline-item level-${heading.level} ${activeHeading === heading.id ? 'active' : ''}`}>{heading.text}</button>) : <p className="empty-state">Headings will appear here.</p>}</nav><div className="outline-footer"><span>{wordCount.toLocaleString()} words</span><span>{headings.length} sections</span></div></aside>
      <main className="main-area"><div className="reader-toolbar">{!outlineOpen && <button type="button" className="icon-button" onClick={() => setOutlineOpen(true)} aria-label="Open outline"><ChevronRight size={18} /></button>}<div className="mode-switch" role="group" aria-label="Document mode"><button type="button" className={view === 'read' ? 'selected' : ''} onClick={() => setView('read')}>Read</button><button type="button" className={view === 'write' ? 'selected' : ''} onClick={() => setView('write')}>Write</button><button type="button" className={view === 'split' ? 'selected' : ''} onClick={() => setView('split')}>Split</button></div>{view === 'read' && <div className="mode-switch layout-switch" role="group" aria-label="Reading layout"><button type="button" className={readingMode === 'continuous' ? 'selected' : ''} onClick={() => setReadingMode('continuous')}>Scroll</button><button type="button" className={readingMode === 'single' ? 'selected' : ''} onClick={() => { setReadingMode('single'); setPageIndex(0) }}>Page</button><button type="button" className={readingMode === 'spread' ? 'selected' : ''} onClick={() => { setReadingMode('spread'); setPageIndex(0) }}>Spread</button></div>}<label className="search-field"><Search size={16} /><input id="document-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search document" aria-label="Search document" />{query && <span>{matches}</span>}</label><button type="button" className={`bookmark-button ${activeHeading && bookmarks.includes(activeHeading) ? 'saved-bookmark' : ''}`} onClick={toggleBookmark} disabled={!activeHeading}><Bookmark size={16} fill={activeHeading && bookmarks.includes(activeHeading) ? 'currentColor' : 'none'} /> Bookmark</button></div>
        {query && <section className="search-results" aria-label="Search results"><header><span>{searchIndex >= 0 ? `${searchIndex + 1} of ${searchResults.length} results` : `${matches} matches in ${searchResults.length} document blocks`}</span><div role="group" aria-label="Search scope"><button type="button" className={searchScope === 'document' ? 'selected' : ''} onClick={() => { setSearchScope('document'); setSearchIndex(-1); setSearchOrigin(null) }}>This file</button><button type="button" className={searchScope === 'collection' ? 'selected' : ''} onClick={() => { setSearchScope('collection'); setSearchIndex(-1); setSearchOrigin(null) }}>All chapters</button></div></header><div className="search-session-controls"><button type="button" onClick={() => navigateSearchResults('previous')} disabled={!searchResults.length} aria-label="Previous search result"><ChevronLeft size={15} /></button><button type="button" onClick={() => navigateSearchResults('next')} disabled={!searchResults.length} aria-label="Next search result"><ChevronRight size={15} /></button><button type="button" onClick={returnToSearchOrigin} disabled={!searchOrigin}>Return to origin</button></div>{searchResults.slice(0, 8).map((result, index) => <button type="button" key={`${result.documentId}-${result.nodeId}`} className={searchIndex === index ? 'selected-result' : ''} onClick={() => { setSearchIndex(index); goToCollectionSearchResult(result) }}><strong>{result.documentName} · {result.section}</strong><span>{result.text || result.section}</span><small>Line {result.line}</small></button>)}</section>}
        {settingsOpen && <section className="settings-popover" aria-label="Reading settings"><label>Text size <output>{preferences.fontScale}%</output><input type="range" min="85" max="150" value={preferences.fontScale} onChange={(event) => setFontScale(Number(event.target.value))} /></label><label>Line spacing <output>{preferences.lineHeight.toFixed(2)}</output><input type="range" min="1.3" max="2.4" step="0.05" value={preferences.lineHeight} onChange={(event) => setLineHeight(Number(event.target.value))} /></label><label>Content width <output>{preferences.contentWidth}px</output><input type="range" min="480" max="1040" step="20" value={preferences.contentWidth} onChange={(event) => setContentWidth(Number(event.target.value))} /></label><label className="toggle-setting"><input type="checkbox" checked={preferences.reducedMotion} onChange={(event) => setReducedMotion(event.target.checked)} /> Reduce motion</label></section>}
        {externalChange !== null && <section className="external-change-notice" role="alert"><strong>This file changed outside SensibleMD.</strong><p>Your unsaved edits are still intact. Choose which version to keep.</p><div><button type="button" onClick={() => setExternalChange(null)}>Keep editing</button><button type="button" onClick={reloadExternalChange}>Reload from disk</button></div></section>}
        {recoverySnapshot !== null && <section className="recovery-notice" role="alert"><strong>Unsaved changes are available.</strong><p>A recovery snapshot from {new Date(recoverySnapshot.savedAt).toLocaleString()} differs from this document.</p><div><button type="button" onClick={() => setRecoverySnapshot(null)}>Discard recovery</button><button type="button" onClick={restoreRecoverySnapshot}>Restore changes</button></div></section>}
        {view === 'read' && sectionSummaryOpen && <section className="section-summary" role="status" aria-label="Current section context"><header><strong>{sectionSummary.heading}</strong><button type="button" className="icon-button small" onClick={() => setSectionSummaryOpen(false)} aria-label="Close section context"><X size={15} /></button></header><p>{sectionSummary.wordCount} words in this section.</p><ul>{Object.entries(sectionSummary.counts).filter(([type]) => type !== 'heading').map(([type, count]) => <li key={type}>{count} {type}{count === 1 ? '' : 's'}</li>)}</ul></section>}
        {view === 'read' && <nav className="reader-navigation" aria-label="Reader navigation"><button type="button" className="icon-button" onClick={() => navigateHeading('previous')} disabled={!adjacentHeading(semanticDocument.headings, activeHeading, 'previous')} aria-label="Previous heading" title="Previous heading (Alt+Up)"><ChevronLeft size={18} /></button><span aria-live="polite">{headings.find((heading) => heading.id === activeHeading)?.text ?? 'Start of document'}</span><button type="button" className="icon-button" onClick={() => navigateHeading('next')} disabled={!adjacentHeading(semanticDocument.headings, activeHeading, 'next')} aria-label="Next heading" title="Next heading (Alt+Down)"><ChevronRight size={18} /></button><button type="button" className="reader-bookmark-list" onClick={() => setBookmarksOpen((open) => !open)} aria-expanded={bookmarksOpen}><Bookmark size={15} /> {savedHeadings.length} saved</button></nav>}
        {bookmarksOpen && <section className="bookmarks-popover" aria-label="Saved bookmarks"><header><span>Saved sections</span><button type="button" className="icon-button small" onClick={() => setBookmarksOpen(false)} aria-label="Close saved bookmarks"><X size={15} /></button></header>{savedHeadings.length ? savedHeadings.map((heading) => <button type="button" key={heading.id} onClick={() => { goToHeading(heading, 'bookmark'); setBookmarksOpen(false) }}>{heading.text}</button>) : <p>Bookmark a heading to keep it here.</p>}</section>}
        {view === 'read' && <nav className="history-navigation" aria-label="Navigation history"><button type="button" className="icon-button" onClick={() => goThroughHistory('back')} disabled={!historyRef.current.canGoBack()} aria-label="Go back" title="Go back"><ChevronLeft size={17} /></button><button type="button" className="icon-button" onClick={() => goThroughHistory('forward')} disabled={!historyRef.current.canGoForward()} aria-label="Go forward" title="Go forward"><ChevronRight size={17} /></button></nav>}
        {view === 'read' && collection.length > 1 && <nav className="chapter-navigation" aria-label="Collection navigation"><button type="button" className="icon-button" onClick={() => navigateChapter('previous')} disabled={!adjacentCollectionDocument(collection, activeDocumentId, 'previous')} aria-label="Previous chapter"><ChevronLeft size={17} /></button><span aria-live="polite">Chapter {chapterIndex + 1} of {collection.length} · {collectionWordCount.toLocaleString()} words</span><button type="button" className="icon-button" onClick={() => navigateChapter('next')} disabled={!adjacentCollectionDocument(collection, activeDocumentId, 'next')} aria-label="Next chapter"><ChevronRight size={17} /></button></nav>}
        {view === 'read' && <button type="button" className="section-context-button" onClick={() => setSectionSummaryOpen((open) => !open)} aria-expanded={sectionSummaryOpen}>Section context</button>}
        <p className="copy-status" aria-live="polite">{copyStatus}</p>
        <p className="app-status" aria-live="polite">{appStatus}</p>
        {view !== 'read' && <nav className="diagnostics-filter" aria-label="Diagnostic severity filter"><button type="button" className={findingFilter === 'all' ? 'selected' : ''} onClick={() => setFindingFilter('all')}>All</button><button type="button" className={findingFilter === 'error' ? 'selected' : ''} onClick={() => setFindingFilter('error')}>Errors</button><button type="button" className={findingFilter === 'warning' ? 'selected' : ''} onClick={() => setFindingFilter('warning')}>Warnings</button></nav>}
        {view === 'read' ? <ReaderSurface source={source} headings={headings} navigableNodes={semanticDocument.navigableNodes} mode={readingMode} pages={pages} pageIndex={pageIndex} onPageIndex={setPageAndContext} onInternalLink={followInternalLink} /> : <section className={`editor-layout ${view === 'split' ? 'split-layout' : ''}`} aria-label="Markdown authoring"><Suspense fallback={<p className="editor-loading">Loading source editor...</p>}><MarkdownEditor value={source} onChange={updateSource} cursorLine={editorLine} onCursorLineChange={setEditorLine} onPromoteHeading={() => changeCurrentHeading('promote')} onDemoteHeading={() => changeCurrentHeading('demote')} jumpToLine={diagnosticLine} /></Suspense>{view === 'split' && <PreviewSurface source={source} headings={headings} />}<aside className="findings-panel"><div className="findings-heading"><Sparkles size={17} /><span>Authoring checks</span><strong>{findings.length}</strong></div>{findings.length ? findings.map((finding) => <button type="button" key={finding.id} className={`finding ${finding.severity}`} onClick={() => setDiagnosticLine(finding.line)}><span>{finding.ruleId} · {finding.confidence}</span><p>{finding.title}</p><small>Line {finding.line}</small></button>) : <div className="all-clear"><Check size={22} /><p>No structural issues found.</p></div>}</aside></section>}</main></div>
    <footer className="statusbar"><span><span className="status-dot" /> Local prototype</span><span>Cmd/Ctrl + E: switch mode</span><span>Cmd/Ctrl + F: search</span></footer>
  </div>
}

export default App