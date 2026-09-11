import { useWindowClose } from "./core/use-window-close";
import { NoDocument, type OpenedReaderDocument } from "./components/NoDocument";
import { rehypeBookPage } from "./core/page-render";
import { usePageStep } from "./core/use-page-step";
import { useNavigationWork } from "./core/use-navigation-work";
import { useReadingObservation } from "./core/use-reading-observation";
//Framework and third-party packages
import {
  type ReactNode,
  createContext,
  createElement,
  lazy,
  Suspense,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import {
  Bookmark,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  Download,
  FileText,
  FolderOpen,
  Search,
  Save,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

//UI components
const MarkdownEditor = lazy(() =>
  import("./components/MarkdownEditor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((module) => ({
    default: module.CommandPalette,
  })),
);

//Core document model
import {
  locationForPage,
  pageForLocation,
  type NavigationAnchor,
} from "./core/navigation-location";
import { DocumentBuffer } from "./core/document-buffer";
import {
  parseSemanticDocument,
  type SemanticNode,
} from "./core/semantic-document";
import {
  pageIndexAfter,
  paginateDocument,
  type BookPage,
} from "./core/pagination";

//Core commands and navigation
import { changeHeadingLevel } from "./core/structural-commands";
import {
  analyzeAccessibility,
  type FindingSeverity,
} from "./core/accessibility-diagnostics";
import {
  adjacentHeading,
  adjacentNavigableNode,
  bookmarkedHeadings,
} from "./core/reader-navigation";
import type { CommandDefinition } from "./core/commands";
import {
  NavigationHistory,
  type NavigationReason,
} from "./core/navigation-history";

//Collections and search
import {
  adjacentCollectionDocument,
  createCollection,
  replaceCollectionDocument,
  type CollectionDocument,
} from "./core/document-collection";
import {
  asDocumentId,
  asSessionId,
  browserDocumentId,
  WELCOME_DOCUMENT_ID,
  type DocumentId,
  type SessionId,
} from "./core/identity";
import {
  searchCollection,
  searchResultIndexAfter,
  type SearchScope,
} from "./core/collection-search";

//Reader utilities
import {
  defaultReaderPreferences,
  normalizeReaderPreferences,
} from "./core/reader-preferences";
import { summarizeSection } from "./core/section-summary";
import { resolveInternalMarkdownLink } from "./core/internal-links";
import { sourceForNode } from "./core/reader-copy";
import {
  createSemanticPosition,
  resolveSemanticPosition,
  type SemanticPosition,
} from "./core/semantic-position";

//Styles
import "./App.css";

type ViewMode = "read" | "write" | "split";
type ReadingMode = "continuous" | "single" | "spread";
type Heading = { id: string; level: number; text: string; line: number };
type SearchOrigin = { documentId: DocumentId; headingId: string };
type ReaderMemory = {
  bookmarks: string[];
  activeHeading: string;
  position?: SemanticPosition;
};

export const starterDocument = `# A quieter way to read Markdown

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

This is an editable sample. Try changing a heading, adding a paragraph, or opening your own file.`;

// Parser positions, rather than displayed text, distinguish duplicate/formatted headings.
const ReaderNodeContext = createContext<SemanticNode[]>([]);
const readerBlockComponents: Components = Object.fromEntries(
  (
    [
      ["p", "paragraph"],
      ["pre", "code"],
      ["blockquote", "blockquote"],
      ["table", "table"],
      ["ul", "list"],
      ["ol", "list"],
    ] as const
  ).map(([tag, type]) => [
    tag,
    function ReaderBlock({
      node,
      children,
    }: ExtraProps & { children?: ReactNode }) {
      const nodes = useContext(ReaderNodeContext);
      const target = nodes.find(
        (item) =>
          item.type === type &&
          item.range.start === node?.position?.start.offset,
      );
      return createElement(
        tag,
        { id: target ? readerNodeId(target.id) : undefined },
        children,
      );
    },
  ]),
);
const HeadingContext = createContext<Heading[]>([]);
const semanticHeadingComponents: Components = (() => {
  const components: Components = {};
  for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
    components[tag] = function SemanticHeading({ node, children, ...props }) {
      const headings = useContext(HeadingContext);
      return createElement(
        tag,
        {
          ...props,
          id:
            headings.find(
              (heading) => heading.line === node?.position?.start.line,
            )?.id ?? props.id,
        },
        children,
      );
    };
  }
  return components;
})();

function readerNodeId(nodeId: string) {
  return `reader-node-${nodeId}`;
}

// The bundled sample and any document restored from browser storage share one fixed
// identity; neither has a file behind it.
function restoredDocument() {
  return createCollection([
    {
      id: WELCOME_DOCUMENT_ID,
      name: localStorage.getItem("sensiblemd-name") ?? "Welcome.md",
      source: localStorage.getItem("sensiblemd-document") ?? starterDocument,
    },
  ]);
}

function ReaderSurface({
  source,
  headings,
  navigableNodes,
  blocks,
  mode,
  pages,
  pageIndex,
  pageStep,
  onPageIndex,
  onInternalLink,
}: {
  source: string;
  headings: Heading[];
  navigableNodes: SemanticNode[];
  blocks: SemanticNode[];
  pageStep: number;
  mode: ReadingMode;
  pages: BookPage[];
  pageIndex: number;
  onPageIndex: (index: number) => void;
  onInternalLink: (href: string) => boolean;
}) {
  const navigationId = (type: string, offset: number | undefined) => {
    const node = navigableNodes.find(
      (item) => item.type === type && item.range.start === offset,
    );
    return node ? readerNodeId(node.id) : undefined;
  };
  const renderMarkdown = (page?: BookPage) => (
    <ReaderNodeContext.Provider value={navigableNodes}>
      <HeadingContext.Provider value={headings}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={
            page
              ? [
                  rehypeSanitize,
                  [
                    rehypeBookPage,
                    {
                      ranges: blocks
                        .filter((block) =>
                          page.fragments.some(
                            (fragment) => fragment.nodeId === block.id,
                          ),
                        )
                        .map((block) => block.range),
                      lastPage: page.pageNumber === pages.length,
                    },
                  ],
                ]
              : [rehypeSanitize]
          }
          components={{
            a: ({ href, children, node, ...props }) => {
              const isHttps = href?.startsWith("https://") ?? false;

              return (
                <a
                  {...props}
                  id={
                    navigationId("link", node?.position?.start.offset) ??
                    props.id
                  }
                  href={href}
                  target={isHttps ? "_blank" : undefined}
                  rel={isHttps ? "noreferrer noopener" : undefined}
                  onClick={(event) => {
                    if (!href) {
                      event.preventDefault();
                      return;
                    }

                    if (onInternalLink(href)) {
                      event.preventDefault();
                      return;
                    }

                    if (!isHttps) {
                      event.preventDefault();
                    }
                  }}
                >
                  {children}
                </a>
              );
            },
            img: ({ node, ...props }) => (
              <img
                id={navigationId("image", node?.position?.start.offset)}
                {...props}
              />
            ),
            ...readerBlockComponents,
            ...semanticHeadingComponents,
          }}
        >
          {source}
        </ReactMarkdown>
      </HeadingContext.Provider>
    </ReaderNodeContext.Provider>
  );
  if (mode === "continuous")
    return <article className="document-reader">{renderMarkdown()}</article>;
  const visiblePages = pages.slice(pageIndex, pageIndex + pageStep);
  return (
    <section
      className={`book-reader ${mode}`}
      data-columns={pageStep}
      aria-label={`${mode === "spread" ? "Two-page" : "Single-page"} reading mode`}
    >
      <div className="book-pages">
        {!pages.length && <p>No readable content.</p>}
        {visiblePages.map((page) => (
          <article
            className="book-page"
            tabIndex={0}
            key={page.pageNumber}
            aria-label={`Page ${page.pageNumber}`}
          >
            {renderMarkdown(page)}
            <footer>Page {page.pageNumber}</footer>
          </article>
        ))}
      </div>
      <div className="page-controls">
        <button
          type="button"
          className="icon-button"
          onClick={() => onPageIndex(Math.max(0, pageIndex - pageStep))}
          disabled={pageIndex === 0}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Page {pages.length ? pageIndex + 1 : 0} of {pages.length}
        </span>
        <button
          type="button"
          className="icon-button"
          onClick={() =>
            onPageIndex(
              Math.min(Math.max(0, pages.length - 1), pageIndex + pageStep),
            )
          }
          disabled={pageIndex + pageStep >= pages.length}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function PreviewSurface({
  source,
  headings,
  navigableNodes,
}: {
  source: string;
  headings: Heading[];
  navigableNodes: SemanticNode[];
}) {
  return (
    <article
      className="authoring-preview"
      aria-label="Rendered Markdown preview"
    >
      <ReaderNodeContext.Provider value={navigableNodes}>
        <HeadingContext.Provider value={headings}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeSanitize]}
            components={{
              ...readerBlockComponents,
              ...semanticHeadingComponents,
            }}
          >
            {source}
          </ReactMarkdown>
        </HeadingContext.Provider>
      </ReaderNodeContext.Provider>
    </article>
  );
}

function DocumentWorkspace({
  initialDocument,
  onClose,
  prepareOpen,
}: {
  initialDocument?: OpenedReaderDocument;
  onClose: () => void;
  prepareOpen: React.RefObject<(() => Promise<boolean>) | null>;
}) {
  const initialCollection = () =>
    initialDocument ? createCollection([initialDocument]) : restoredDocument();
  const initialMemory: ReaderMemory | undefined =
    initialDocument &&
    JSON.parse(localStorage.getItem("sensiblemd-reader-memory") ?? "{}")[
      initialDocument.id
    ];
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);
  const pendingSaves = useRef(new Set<Promise<unknown>>());
  const pendingReaderWrites = useRef(new Set<Promise<unknown>>());
  const [readerStateReady, setReaderStateReady] = useState(false);
  const trackSave = (promise: Promise<unknown>) => {
    pendingSaves.current.add(promise);
    void promise.finally(() => pendingSaves.current.delete(promise));
  };
  const [source, setSource] = useState(
    () =>
      initialDocument?.source ??
      localStorage.getItem("sensiblemd-document") ??
      starterDocument,
  );
  const [documentName, setDocumentName] = useState(
    () =>
      initialDocument?.name ??
      localStorage.getItem("sensiblemd-name") ??
      "Welcome.md",
  );
  const [collection, setCollection] =
    useState<CollectionDocument[]>(initialCollection);
  const [activeDocumentId, setActiveDocumentId] = useState<DocumentId>(
    () => initialCollection()[0].id,
  );
  const [activeSessionId, setActiveSessionId] = useState<SessionId | null>(
    initialDocument?.sessionId ?? null,
  );
  const [isDirty, setIsDirty] = useState(false);
  const [canSaveDirectly, setCanSaveDirectly] = useState(
    initialDocument?.canSaveDirectly ?? false,
  );
  const [externalChange, setExternalChange] = useState<string | null>(null);
  const [sectionSummaryOpen, setSectionSummaryOpen] = useState(false);
  const [view, setView] = useState<ViewMode>("read");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const settingsPanel = useRef<HTMLElement>(null);
  const settingsTrigger = useRef<HTMLButtonElement>(null);
  const [searchScope, setSearchScope] = useState<SearchScope>("document");
  const [searchIndex, setSearchIndex] = useState(-1);
  const [searchOrigin, setSearchOrigin] = useState<SearchOrigin | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fontScale, setFontScale] = useState(
    () =>
      Number(localStorage.getItem("sensiblemd-font-scale")) ||
      defaultReaderPreferences.fontScale,
  );
  const [lineHeight, setLineHeight] = useState(
    () =>
      Number(localStorage.getItem("sensiblemd-line-height")) ||
      defaultReaderPreferences.lineHeight,
  );
  const [contentWidth, setContentWidth] = useState(
    () =>
      Number(localStorage.getItem("sensiblemd-content-width")) ||
      defaultReaderPreferences.contentWidth,
  );
  const [reducedMotion, setReducedMotion] = useState(
    () => localStorage.getItem("sensiblemd-reduced-motion") === "true",
  );
  const [readingMode, setReadingMode] = useState<ReadingMode>(() => {
    const saved = localStorage.getItem("sensiblemd-reading-mode");
    return saved === "single" || saved === "spread" ? saved : "continuous";
  });
  const [editorLine, setEditorLine] = useState(1);
  const [diagnosticJump, setDiagnosticJump] = useState<{
    line: number;
    isCurrent: () => boolean;
  } | null>(null);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>(() =>
    initialDocument
      ? (initialMemory?.bookmarks ?? [])
      : JSON.parse(localStorage.getItem("sensiblemd-bookmarks") ?? "[]"),
  );
  const [navigationAnchor, setNavigationAnchor] = useState<NavigationAnchor>(
    () => ({
      nodeId: initialDocument
        ? (initialMemory?.activeHeading ?? "")
        : (localStorage.getItem("sensiblemd-position") ?? ""),
      wordOffset: 0,
    }),
  );
  const navigationWork = useNavigationWork(activeDocumentId, source);
  const queueNavigation = (
    callback: () => void,
    documentId = activeDocumentId,
    targetSource = source,
  ) => navigationWork.schedule(callback, { documentId, source: targetSource });
  const [outlineJump, setOutlineJump] = useState<{
    line: number;
    isCurrent: () => boolean;
  } | null>(null);
  const [observationRevision, setObservationRevision] = useState(0);
  const setNavigationNode = (nodeId: string) => {
    navigationWork.invalidate();
    setObservationRevision((revision) => revision + 1);
    setNavigationAnchor({ nodeId, wordOffset: 0 });
    setOutlineJump(null);
  };
  const activeNodeId = navigationAnchor.nodeId;
  const [copyStatus, setCopyStatus] = useState("");
  const [appStatus, setAppStatus] = useState("");
  const windowDiscard = useRef<{ documentId: string; version: number } | null>(null);
  const recoveryContext = useRef({ documentId: activeDocumentId, revision: 0 });
  useLayoutEffect(() => {
    recoveryContext.current = { documentId: activeDocumentId, revision: 0 };
  }, [activeDocumentId]);
  const [recoverySnapshot, setRecoverySnapshot] = useState<{
    source: string;
    savedAt: string;
  } | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<
    Array<{ index: number; name: string }>
  >([]);
  const [findingFilter, setFindingFilter] = useState<FindingSeverity | "all">(
    "all",
  );
  const [readerMemory, setReaderMemory] = useState<
    Record<string, ReaderMemory>
  >(() => JSON.parse(localStorage.getItem("sensiblemd-reader-memory") ?? "{}"));
  const fileInput = useRef<HTMLInputElement>(null);
  const collectionInput = useRef<HTMLInputElement>(null);
  const bufferRef = useRef<DocumentBuffer | null>(null);
  const historyRef = useRef(new NavigationHistory());
  if (bufferRef.current === null)
    bufferRef.current = new DocumentBuffer("active-document", source);
  const buffer = bufferRef.current;
  const semanticDocument = parseSemanticDocument(
    source,
    buffer.snapshot().version,
  );
  const activeNode = semanticDocument.navigableNodes.find(
    (node) => node.id === activeNodeId,
  );
  const activeHeading = activeNode
    ? ([...semanticDocument.headings]
        .reverse()
        .find((heading) => heading.range.start <= activeNode.range.start)?.id ??
      "")
    : "";
  const headings: Heading[] = semanticDocument.headings.map((heading) => ({
    ...heading,
    line: heading.range.line,
  }));
  const observeNode = (nodeId: string) => {
    setNavigationAnchor((current) =>
      current.nodeId === nodeId ? current : { nodeId, wordOffset: 0 },
    );
  };
  useReadingObservation({
    documentId: activeDocumentId,
    source,
    enabled: view === "read" && readingMode === "continuous",
    revision: observationRevision,
    onObserve: observeNode,
    work: navigationWork,
  });
  const observeEditorCursor = (offset: number, observedSource: string) => {
    if (observedSource !== source || view === "read") return;
    const node = [...semanticDocument.nodes]
      .reverse()
      .find((item) => item.range.start <= offset);
    if (node) {
      navigationWork.interruptCurrentContext();
      observeNode(node.id);
    }
  };
  const allFindings = analyzeAccessibility(source);
  const findings =
    findingFilter === "all"
      ? allFindings
      : allFindings.filter((finding) => finding.severity === findingFilter);
  const wordCount = semanticDocument.wordCount;
  const searchResults = searchCollection(
    collection,
    activeDocumentId,
    query,
    searchScope,
  );
  const matches = searchResults.reduce(
    (total, result) => total + result.occurrences,
    0,
  );
  const pages = paginateDocument(
    semanticDocument,
    readingMode === "spread" ? 52 : 76,
  );
  const pageStep = usePageStep(readingMode === "spread");
  const pageIndex =
    Math.floor(pageForLocation(pages, navigationAnchor) / pageStep) * pageStep;
  const presentation = useRef({ view, readingMode });
  const projectionLine = activeNode?.range.line;
  useLayoutEffect(() => {
    if (
      presentation.current.view === view &&
      presentation.current.readingMode === readingMode
    )
      return;
    const destination = { view, readingMode };
    presentation.current = destination;
    if (!activeNodeId || projectionLine === undefined) return;
    // Presentation interprets the current anchor; it never writes a location.
    // Both navigation freshness and the surface lifetime guard deferred work.
    const currentNavigation = navigationWork.capture();
    const isCurrent = () =>
      presentation.current === destination && currentNavigation();
    if (view !== "read") setOutlineJump({ line: projectionLine, isCurrent });
    navigationWork.schedule(
      () => {
        if (!isCurrent() || view === "write") return;
        const surface = document.querySelector(
          view === "split"
            ? ".authoring-preview"
            : ".document-reader, .book-reader",
        );
        const target =
          surface &&
          Array.from(surface.querySelectorAll("[id]")).find(
            (element) =>
              element.id === activeNodeId ||
              element.id === readerNodeId(activeNodeId),
          );
        target?.scrollIntoView({ behavior: "auto", block: "start" });
      },
      { documentId: activeDocumentId, source },
    );
  }, [
    view,
    readingMode,
    activeNodeId,
    projectionLine,
    activeDocumentId,
    source,
    navigationWork,
  ]);
  const chapterIndex = collection.findIndex(
    (document) => document.id === activeDocumentId,
  );
  const collectionWordCount = collection.reduce(
    (total, document) =>
      total + parseSemanticDocument(document.source, 0).wordCount,
    0,
  );
  const savedHeadings = bookmarkedHeadings(semanticDocument.headings, bookmarks)
    .map((heading) => headings.find((item) => item.id === heading.id))
    .filter((heading): heading is Heading => Boolean(heading));
  const sectionSummary = summarizeSection(semanticDocument, activeHeading);

  useEffect(() => {
    localStorage.setItem("sensiblemd-document", source);
    localStorage.setItem("sensiblemd-name", documentName);
    localStorage.setItem("sensiblemd-bookmarks", JSON.stringify(bookmarks));
    localStorage.setItem("sensiblemd-position", activeHeading);
    localStorage.setItem("sensiblemd-font-scale", String(fontScale));
    localStorage.setItem("sensiblemd-line-height", String(lineHeight));
    localStorage.setItem("sensiblemd-content-width", String(contentWidth));
    localStorage.setItem("sensiblemd-reduced-motion", String(reducedMotion));
    localStorage.setItem("sensiblemd-reading-mode", readingMode);
    localStorage.setItem(
      "sensiblemd-reader-memory",
      JSON.stringify(readerMemory),
    );
  }, [
    source,
    documentName,
    bookmarks,
    activeHeading,
    fontScale,
    lineHeight,
    contentWidth,
    reducedMotion,
    readingMode,
  ]);

  useEffect(() => {
    const position =
      createSemanticPosition(semanticDocument, activeNodeId || activeHeading) ??
      undefined;
    setReaderMemory((memory) => ({
      ...memory,
      [activeDocumentId]: { bookmarks, activeHeading, position },
    }));
  }, [activeDocumentId, activeHeading, activeNodeId, bookmarks, source]);

  useEffect(() => {
    localStorage.setItem(
      "sensiblemd-reader-memory",
      JSON.stringify(readerMemory),
    );
  }, [readerMemory]);

  const refreshRecentDocuments = () => {
    const listRecentDocuments = window.sensibleMD?.listRecentDocuments;
    if (typeof listRecentDocuments !== "function") return;
    void listRecentDocuments()
      .then(setRecentDocuments)
      .catch(() => setAppStatus("Recent files are temporarily unavailable."));
  };

  useEffect(() => {
    refreshRecentDocuments();
  }, []);

  useEffect(() => {
    const remembered = readerMemory[activeDocumentId]?.position;
    if (!remembered) return;
    const resolved = resolveSemanticPosition(semanticDocument, remembered);
    if (!resolved.node) return;
    setNavigationNode(resolved.node.id);
    queueNavigation(() =>
      document
        .getElementById(readerNodeId(resolved.node!.id))
        ?.scrollIntoView({ behavior: "auto", block: "center" }),
    );
  }, []);

  useEffect(() => {
    const loadState = window.sensibleMD?.loadDocumentState;
    if (typeof loadState !== "function") {
      setReaderStateReady(true);
      return;
    }
    let current = true;
    setReaderStateReady(false);
    const navigationIsCurrent = navigationWork.capture();
    loadState(activeDocumentId)
      .then((state) => {
        if (!current || !state) return;
        setBookmarks(state.bookmarks);
        if (navigationIsCurrent()) {
          const resolved =
            state.position &&
            resolveSemanticPosition(semanticDocument, state.position);
          const nodeId = resolved
            ? (resolved.node?.id ?? "")
            : state.activeHeading;
          setNavigationNode(nodeId);
          queueNavigation(() =>
            (
              document.getElementById(nodeId) ??
              document.getElementById(readerNodeId(nodeId))
            )?.scrollIntoView({ behavior: "auto", block: "start" }),
          );
        }
        setFontScale(state.fontScale);
        setLineHeight(state.lineHeight ?? defaultReaderPreferences.lineHeight);
        setContentWidth(
          state.contentWidth ?? defaultReaderPreferences.contentWidth,
        );
        setReducedMotion(
          state.reducedMotion ?? defaultReaderPreferences.reducedMotion,
        );
      })
      .catch(() => {
        if (current)
          setAppStatus(
            "Desktop settings are temporarily unavailable. Restart the desktop app to reconnect.",
          );
      })
      .finally(() => {
        if (current) setReaderStateReady(true);
      });
    return () => {
      current = false;
    };
  }, [activeDocumentId]);

  useEffect(() => {
    const saveState = window.sensibleMD?.saveDocumentState;
    if (closing || typeof saveState !== "function") return;
    const timer = window.setTimeout(() => {
      const write = saveState({
        documentId: activeDocumentId,
        bookmarks,
        activeHeading,
        position:
          createSemanticPosition(
            semanticDocument,
            activeNodeId || activeHeading,
          ) ?? undefined,
        fontScale,
        lineHeight,
        contentWidth,
        reducedMotion,
      }).catch(() =>
        setAppStatus(
          "Desktop settings could not be saved. Your document remains open.",
        ),
      );
      pendingReaderWrites.current.add(write);
      void write.finally(() => pendingReaderWrites.current.delete(write));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    activeDocumentId,
    activeHeading,
    activeNodeId,
    bookmarks,
    fontScale,
    lineHeight,
    contentWidth,
    reducedMotion,
    source,
    closing,
  ]);

  useEffect(() => {
    const saveRecoverySnapshot = window.sensibleMD?.saveRecoverySnapshot;
    if (!isDirty || typeof saveRecoverySnapshot !== "function") return;
    const snapshot = buffer.snapshot();
    const timer = window.setTimeout(() => {
      if (windowDiscard.current?.documentId === activeDocumentId && windowDiscard.current.version === snapshot.version) return;
      void saveRecoverySnapshot({
        documentId: activeDocumentId,
        version: snapshot.version,
        source: snapshot.text,
      }).catch(() =>
        setAppStatus(
          "Recovery snapshot could not be saved. Your document remains open.",
        ),
      );
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [activeDocumentId, buffer, isDirty, source]);

  useEffect(() => {
    const loadRecoverySnapshot = window.sensibleMD?.loadRecoverySnapshot;
    if (typeof loadRecoverySnapshot !== "function") return;
    const context = recoveryContext.current;
    const revision = context.revision;
    let current = true;
    void loadRecoverySnapshot(activeDocumentId)
      .then((snapshot) => {
        if (current && recoveryContext.current === context && context.revision === revision && snapshot?.source && snapshot.source !== buffer.snapshot().text)
          setRecoverySnapshot(snapshot);
      })
      .catch(() => { if (current) setAppStatus("Recovery check is temporarily unavailable."); });
    return () => { current = false; };
  }, [activeDocumentId]);

  useEffect(() => {
    const subscribe = window.sensibleMD?.onExternalDocumentChange;
    if (typeof subscribe !== "function") return;
    return subscribe(({ source: diskSource }) => {
      if (diskSource === buffer.snapshot().text) return;
      if (isDirty) {
        setExternalChange(diskSource);
        return;
      }
      buffer.replace(diskSource, "external-reload");
      buffer.markSaved();
      setCollection((documents) =>
        replaceCollectionDocument(documents, activeDocumentId, diskSource),
      );
      setSource(diskSource);
    });
  }, [activeDocumentId, buffer, isDirty]);

  useEffect(() => {
    setSearchIndex(-1);
    setSearchOrigin(null);
  }, [query, searchScope]);

  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || commandPaletteOpen) return;
      if (settingsOpen) {
        setSettingsOpen(false);
        settingsTrigger.current?.focus();
      } else if (searchOpen) {
        document.getElementById("document-search")?.focus();
        setSearchOpen(false);
      }
    };
    const clickAway = (event: PointerEvent) => {
      if (
        settingsOpen &&
        event.target instanceof Node &&
        !settingsPanel.current?.contains(event.target) &&
        !settingsTrigger.current?.contains(event.target)
      )
        setSettingsOpen(false);
    };
    window.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", clickAway);
    return () => {
      window.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", clickAway);
    };
  }, [commandPaletteOpen, settingsOpen, searchOpen]);

  const keyboardSave = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "s" && event.metaKey !== event.ctrlKey &&
        !event.shiftKey && !event.altKey && !event.isComposing && !event.defaultPrevented
      ) {
        event.preventDefault();
        if (!event.repeat) keyboardSave.current?.();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        setView((current) => (current === "read" ? "write" : "read"));
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setSearchOpen(true);
        document.getElementById("document-search")?.focus();
      }
      if (view === "read" && event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        navigateHeading("next");
      }
      if (view === "read" && event.altKey && event.key === "ArrowUp") {
        event.preventDefault();
        navigateHeading("previous");
      }
      const target = event.target;
      const editingTarget =
        target instanceof Element &&
        target.closest('input, textarea, [contenteditable="true"]');
      if (view === "read" && readingMode !== "continuous" && !editingTarget) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          turnPage("next");
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          turnPage("previous");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeHeading, headings, readingMode, view]);

  const goToHeading = (
    heading: Heading,
    reason: NavigationReason = "manual",
    recordHistory = true,
  ) => {
    if (recordHistory)
      historyRef.current.visit({
        documentId: activeDocumentId,
        headingId: heading.id,
        reason,
      });
    setNavigationNode(heading.id);
    if (view !== "read")
      setOutlineJump({
        line: heading.line,
        isCurrent: navigationWork.capture(),
      });
    queueNavigation(() => {
      const surface = document.querySelector(
        view === "split"
          ? ".authoring-preview"
          : ".document-reader, .book-reader",
      );
      surface
        ?.querySelector(`[id="${heading.id}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };
  const navigateHeading = (direction: "next" | "previous") => {
    const target = adjacentHeading(
      semanticDocument.headings,
      activeHeading,
      direction,
    );
    const heading = target && headings.find((item) => item.id === target.id);
    if (heading) goToHeading(heading);
  };
  const goToNode = (node: SemanticNode) => {
    setNavigationNode(node.id);
    setView("read");
    queueNavigation(() =>
      document
        .getElementById(readerNodeId(node.id))
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  };
  const navigateStructure = (
    type: "paragraph" | "link" | "image" | "table" | "code",
    direction: "next" | "previous",
  ) => {
    const target = adjacentNavigableNode(
      semanticDocument.navigableNodes,
      activeNodeId || activeHeading,
      type,
      direction,
    );
    if (target) goToNode(target);
  };
  const copyCurrentNode = (type: "paragraph" | "code") => {
    const current =
      semanticDocument.navigableNodes.find(
        (node) => node.id === activeNodeId && node.type === type,
      ) ??
      adjacentNavigableNode(
        semanticDocument.navigableNodes,
        activeNodeId || activeHeading,
        type,
        "next",
      );
    const sourceToCopy = sourceForNode(semanticDocument, current);
    if (!sourceToCopy) {
      setCopyStatus(
        `No ${type === "code" ? "code block" : "paragraph"} is available to copy.`,
      );
      return;
    }
    void navigator.clipboard
      .writeText(sourceToCopy)
      .then(() =>
        setCopyStatus(
          `${type === "code" ? "Code block" : "Paragraph"} copied.`,
        ),
      )
      .catch(() => setCopyStatus("Copy was blocked by this browser."));
  };
  const setPageAndContext = (nextIndex: number) => {
    const anchor = locationForPage(pages, nextIndex);
    if (anchor) {
      navigationWork.invalidate();
      setNavigationAnchor(anchor);
    }
  };
  const turnPage = (direction: "next" | "previous") => {
    setPageAndContext(
      pageIndexAfter(pageIndex, pages.length, direction, pageStep),
    );
  };
  const goThroughHistory = (direction: "back" | "forward") => {
    const entry =
      direction === "back"
        ? historyRef.current.back()
        : historyRef.current.forward();
    const targetDocument =
      entry?.documentId &&
      collection.find((document) => document.id === entry.documentId);
    if (entry && targetDocument && targetDocument.id !== activeDocumentId) {
      buffer.replace(targetDocument.source, "programmatic");
      setActiveDocumentId(targetDocument.id);
      setSource(targetDocument.source);
      setDocumentName(targetDocument.name);
      const targetHeading = parseSemanticDocument(
        targetDocument.source,
        buffer.snapshot().version,
      ).headings.find((heading) => heading.id === entry.headingId);
      setNavigationNode(targetHeading?.id ?? "");
      if (targetHeading)
        queueNavigation(
          () =>
            document
              .getElementById(targetHeading.id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" }),
          targetDocument.id,
          targetDocument.source,
        );
      return;
    }
    const heading =
      entry && headings.find((item) => item.id === entry.headingId);
    if (heading) goToHeading(heading, "history", false);
  };
  const followInternalLink = (href: string) => {
    const target = resolveInternalMarkdownLink(
      collection,
      activeDocumentId,
      href,
    );
    if (!target) return false;
    const targetDocument = collection.find(
      (document) => document.id === target.documentId,
    );
    if (!targetDocument) return false;
    const targetHeadings = parseSemanticDocument(
      targetDocument.source,
      buffer.snapshot().version,
    ).headings;
    const targetHeading = target.headingId
      ? targetHeadings.find((heading) => heading.id === target.headingId)
      : targetHeadings[0];
    if (targetDocument.id === activeDocumentId) {
      const heading =
        targetHeading && headings.find((item) => item.id === targetHeading.id);
      if (heading) goToHeading(heading, "link");
      return true;
    }
    const originHeadingId = activeHeading || headings[0]?.id;
    if (originHeadingId)
      historyRef.current.visit({
        documentId: activeDocumentId,
        headingId: originHeadingId,
        reason: "manual",
      });
    buffer.replace(targetDocument.source, "programmatic");
    setActiveDocumentId(targetDocument.id);
    setSource(targetDocument.source);
    setDocumentName(targetDocument.name);
    setNavigationNode(targetHeading?.id ?? "");
    setView("read");
    if (targetHeading)
      historyRef.current.visit({
        documentId: targetDocument.id,
        headingId: targetHeading.id,
        reason: "link",
      });
    queueNavigation(
      () =>
        targetHeading &&
        document
          .getElementById(targetHeading.id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      targetDocument.id,
      targetDocument.source,
    );
    return true;
  };
  const updateSource = (nextSource: string) => {
    if (nextSource === buffer.snapshot().text) return;
    buffer.replace(nextSource, "editor");
    setCollection((documents) =>
      replaceCollectionDocument(documents, activeDocumentId, nextSource),
    );
    setSource(nextSource);
    setIsDirty(true);
  };
  const changeCurrentHeading = (direction: "promote" | "demote") => {
    const edit = changeHeadingLevel(source, editorLine, direction);
    if (!edit) return;
    buffer.apply({
      origin: "structural-command",
      baseVersion: buffer.snapshot().version,
      edits: [edit],
    });
    setCollection((documents) =>
      replaceCollectionDocument(
        documents,
        activeDocumentId,
        buffer.snapshot().text,
      ),
    );
    setSource(buffer.snapshot().text);
    setIsDirty(true);
  };
  const goToSearchResult = (line: number, recordHistory = true) => {
    const heading =
      [...headings].reverse().find((item) => item.line <= line) ?? headings[0];
    if (heading) goToHeading(heading, "search", recordHistory);
  };
  const goToCollectionSearchResult = (
    result: (typeof searchResults)[number],
    recordHistory = true,
  ) => {
    const targetDocument = collection.find(
      (document) => document.id === result.documentId,
    );
    if (!targetDocument) return;
    if (targetDocument.id !== activeDocumentId) {
      buffer.replace(targetDocument.source, "programmatic");
      setActiveDocumentId(targetDocument.id);
      setSource(targetDocument.source);
      setDocumentName(targetDocument.name);
      setNavigationNode("");
      setView("read");
      const targetHeadings = parseSemanticDocument(
        targetDocument.source,
        buffer.snapshot().version,
      ).headings;
      const targetHeading =
        [...targetHeadings]
          .reverse()
          .find((heading) => heading.range.line <= result.line) ??
        targetHeadings[0];
      if (targetHeading)
        queueNavigation(
          () => {
            setNavigationNode(targetHeading.id);
            document
              .getElementById(targetHeading.id)
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          },
          targetDocument.id,
          targetDocument.source,
        );
      return;
    }
    goToSearchResult(result.line, recordHistory);
  };
  const navigateSearchResults = (direction: "next" | "previous") => {
    const nextIndex = searchResultIndexAfter(
      searchIndex,
      searchResults.length,
      direction,
    );
    if (nextIndex < 0) return;
    if (!searchOrigin) {
      const headingId = activeHeading || headings[0]?.id;
      if (headingId)
        setSearchOrigin({ documentId: activeDocumentId, headingId });
    }
    setSearchIndex(nextIndex);
    goToCollectionSearchResult(searchResults[nextIndex], false);
  };
  const returnToSearchOrigin = () => {
    if (!searchOrigin) return;
    const originDocument = collection.find(
      (document) => document.id === searchOrigin.documentId,
    );
    if (!originDocument) return;
    if (originDocument.id === activeDocumentId) {
      const heading = headings.find(
        (item) => item.id === searchOrigin.headingId,
      );
      if (heading) goToHeading(heading, "history", false);
    } else {
      buffer.replace(originDocument.source, "programmatic");
      setActiveDocumentId(originDocument.id);
      setSource(originDocument.source);
      setDocumentName(originDocument.name);
      setNavigationNode(searchOrigin.headingId);
      setView("read");
      queueNavigation(
        () =>
          document
            .getElementById(searchOrigin.headingId)
            ?.scrollIntoView({ behavior: "smooth", block: "start" }),
        originDocument.id,
        originDocument.source,
      );
    }
    setSearchOrigin(null);
    setSearchIndex(-1);
  };
  const openFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const source = String(fileReader.result);
      const documents = createCollection([
        { id: browserDocumentId(file), name: file.name, source },
      ]);
      buffer.replace(source, "programmatic");
      buffer.markSaved();
      setCollection(documents);
      setActiveDocumentId(documents[0].id);
      setActiveSessionId(null);
      setSource(source);
      setDocumentName(file.name);
      setCanSaveDirectly(false);
      setIsDirty(false);
      setNavigationNode("");
      setView("read");
    };
    fileReader.readAsText(file);
    event.target.value = "";
  };
  const openCollection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    Promise.all(
      files.map((file) =>
        file.text().then((source) => ({
          id: browserDocumentId(file),
          name: file.name,
          source,
        })),
      ),
    ).then((filesWithSource) => {
      const documents = createCollection(
        filesWithSource.sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      const active = documents[0];
      setCollection(documents);
      setActiveDocumentId(active.id);
      setActiveSessionId(null);
      buffer.replace(active.source, "programmatic");
      buffer.markSaved();
      setSource(active.source);
      setDocumentName(active.name);
      setCanSaveDirectly(false);
      setIsDirty(false);
      setNavigationNode("");
      setView("read");
    });
    event.target.value = "";
  };
  const switchDocument = (collectionDocument: CollectionDocument) => {
    if (collectionDocument.id === activeDocumentId) return;
    const currentPosition =
      createSemanticPosition(semanticDocument, activeNodeId || activeHeading) ??
      undefined;
    setReaderMemory((memory) => ({
      ...memory,
      [activeDocumentId]: {
        bookmarks,
        activeHeading,
        position: currentPosition,
      },
    }));
    const remembered = readerMemory[collectionDocument.id];
    const targetModel = parseSemanticDocument(
      collectionDocument.source,
      buffer.snapshot().version,
    );
    const headingIds = new Set(
      targetModel.headings.map((heading) => heading.id),
    );
    const resolved = resolveSemanticPosition(targetModel, remembered?.position);
    buffer.replace(collectionDocument.source, "programmatic");
    setActiveDocumentId(collectionDocument.id);
    setSource(collectionDocument.source);
    setDocumentName(collectionDocument.name);
    setCanSaveDirectly(false);
    setIsDirty(false);
    setBookmarks(
      remembered?.bookmarks.filter((bookmark) => headingIds.has(bookmark)) ??
        [],
    );
    setNavigationNode(
      resolved.node?.id ??
        (remembered && headingIds.has(remembered.activeHeading)
          ? remembered.activeHeading
          : ""),
    );
    setView("read");
    if (resolved.node)
      queueNavigation(
        () =>
          document
            .getElementById(readerNodeId(resolved.node!.id))
            ?.scrollIntoView({ behavior: "smooth", block: "center" }),
        collectionDocument.id,
        collectionDocument.source,
      );
  };
  const navigateChapter = (direction: "next" | "previous") => {
    const targetDocument = adjacentCollectionDocument(
      collection,
      activeDocumentId,
      direction,
    );
    if (!targetDocument) return;
    const originHeadingId = activeHeading || headings[0]?.id;
    if (originHeadingId)
      historyRef.current.visit({
        documentId: activeDocumentId,
        headingId: originHeadingId,
        reason: "manual",
      });
    buffer.replace(targetDocument.source, "programmatic");
    const targetHeading = parseSemanticDocument(
      targetDocument.source,
      buffer.snapshot().version,
    ).headings[0];
    setActiveDocumentId(targetDocument.id);
    setSource(targetDocument.source);
    setDocumentName(targetDocument.name);
    setNavigationNode(targetHeading?.id ?? "");
    setCanSaveDirectly(false);
    setIsDirty(false);
    setView("read");
    if (targetHeading)
      historyRef.current.visit({
        documentId: targetDocument.id,
        headingId: targetHeading.id,
        reason: "manual",
      });
    queueNavigation(
      () =>
        targetHeading &&
        document
          .getElementById(targetHeading.id)
          ?.scrollIntoView({ behavior: "smooth", block: "start" }),
      targetDocument.id,
      targetDocument.source,
    );
  };
  const openDocument = async () => {
    const openNativeDocument = window.sensibleMD?.openDocument;
    if (typeof openNativeDocument !== "function") {
      fileInput.current?.click();
      return;
    }
    const file = await openNativeDocument().catch(() => {
      setAppStatus("The Markdown file could not be opened.");
      return null;
    });
    if (!file) return;
    const documents = createCollection([
      {
        id: asDocumentId(file.documentId),
        name: file.name,
        source: file.source,
      },
    ]);
    buffer.replace(file.source, "programmatic");
    buffer.markSaved();
    setCollection(documents);
    setActiveDocumentId(documents[0].id);
    setActiveSessionId(asSessionId(file.sessionId));
    setSource(file.source);
    setDocumentName(file.name);
    setCanSaveDirectly(true);
    setIsDirty(false);
    setNavigationNode("");
    setView("read");
    refreshRecentDocuments();
  };
  const openRecentDocument = async (index: number) => {
    const openRecent = window.sensibleMD?.openRecentDocument;
    if (typeof openRecent !== "function") return;
    const file = await openRecent(index).catch(() => {
      setAppStatus("The recent file could not be opened.");
      return null;
    });
    if (!file) {
      setAppStatus("That recent file is no longer available.");
      return;
    }
    const documents = createCollection([
      {
        id: asDocumentId(file.documentId),
        name: file.name,
        source: file.source,
      },
    ]);
    buffer.replace(file.source, "programmatic");
    buffer.markSaved();
    setCollection(documents);
    setActiveDocumentId(documents[0].id);
    setActiveSessionId(asSessionId(file.sessionId));
    setSource(file.source);
    setDocumentName(file.name);
    setCanSaveDirectly(true);
    setIsDirty(false);
    setNavigationNode("");
    setView("read");
    refreshRecentDocuments();
  };
  const clearRecovery = async (documentId: string) => {
    const context = recoveryContext.current;
    const revision = context.documentId === documentId ? ++context.revision : context.revision;
    if (!window.sensibleMD?.clearRecoverySnapshot) throw new Error("Recovery clearing unavailable");
    await window.sensibleMD.clearRecoverySnapshot(documentId);
    if (recoveryContext.current === context && context.documentId === documentId && context.revision === revision) setRecoverySnapshot(null);
  };
  const clearSavedRecovery = async (documentId: string) => {
    try {
      await clearRecovery(documentId);
    } catch {
      setAppStatus("Saved, but recovery data could not be cleared. It may appear again when you reopen the document.");
    }
  };
  const discardRecovery = async () => {
    try {
      await clearRecovery(activeDocumentId);
    } catch {
      setAppStatus("Recovery could not be discarded. Please try again.");
    }
  };
  const downloadOnly =
    !(canSaveDirectly && typeof window.sensibleMD?.saveOpenedDocument === "function") &&
    typeof window.sensibleMD?.saveDocumentAs !== "function";
  const saveActionLabel = downloadOnly ? "Download copy" : "Save Markdown file";
  const saveFile = () => {
    const savedDocumentId = activeDocumentId;
    const savedVersion = buffer.snapshot().version;
    const saveOpenedDocument = window.sensibleMD?.saveOpenedDocument;
    if (canSaveDirectly && typeof saveOpenedDocument === "function") {
      trackSave(
        saveOpenedDocument({ source })
          .then(async () => {
            if (buffer.snapshot().version !== savedVersion) {
              setAppStatus(
                "Saved the earlier version. Newer changes remain open.",
              );
              return;
            }
            buffer.markSaved();
            setIsDirty(false);
            setAppStatus("Saved.");
            await clearSavedRecovery(savedDocumentId);
          })
          .catch(() =>
            setAppStatus(
              "The file could not be saved. Your edits are still open.",
            ),
          ),
      );
      return;
    }
    const saveNativeDocument = window.sensibleMD?.saveDocumentAs;
    if (typeof saveNativeDocument === "function") {
      trackSave(
        saveNativeDocument({ name: documentName, source })
          .then(async (file) => {
            if (!file) return;
            const newId = asDocumentId(file.documentId);
            const current = buffer.snapshot();
            const clean = current.version === savedVersion;
            setCollection((documents) => documents
              .filter((document) => document.id !== newId || document.id === savedDocumentId)
              .map((document) => document.id === savedDocumentId
                ? { ...document, id: newId, name: file.name, source: current.text }
                : document));
            setActiveDocumentId(newId);
            setActiveSessionId(asSessionId(file.sessionId));
            setCanSaveDirectly(true);
            setDocumentName(file.name);
            if (clean) buffer.markSaved();
            setIsDirty(!clean);
            setRecoverySnapshot(null);
            refreshRecentDocuments();
            setAppStatus(clean ? "Saved." : "Saved the earlier version. Newer changes remain open.");
            // The normal debounce writes recovery under newId only when dirty.
            await clearSavedRecovery(savedDocumentId);
          })
          .catch(() =>
            setAppStatus(
              "The file could not be saved. Your edits are still open.",
            ),
          ),
      );
      return;
    }
    const blob = new Blob([source], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = documentName.endsWith(".md")
      ? documentName
      : `${documentName}.md`;
    link.click();
    URL.revokeObjectURL(url);
    setAppStatus("Download requested. The original file is unchanged.");
  };
  // Keep the existing listener connected to the latest committed save lifecycle.
  useLayoutEffect(() => { keyboardSave.current = saveFile; });
  useWindowClose({
    snapshot: () => ({ documentId: activeDocumentId, ...buffer.snapshot() }),
    saving: () => pendingSaves.current.size > 0,
    save: async () => {
      if (!pendingSaves.current.size) saveFile();
      await Promise.allSettled([...pendingSaves.current]);
    },
    discard: async (snapshot) => {
      windowDiscard.current = snapshot;
      try {
        await clearRecovery(snapshot.documentId);
        if (recoveryContext.current.documentId !== snapshot.documentId) {
          windowDiscard.current = null;
          return false;
        }
        const current = buffer.snapshot();
        if (current.version !== snapshot.version) {
          windowDiscard.current = null;
          await window.sensibleMD?.saveRecoverySnapshot({ documentId: activeDocumentId, version: current.version, source: current.text });
          setAppStatus("Newer changes remain open. Try closing again.");
          return false;
        }
        return true;
      } catch {
        windowDiscard.current = null;
        setAppStatus("Recovery could not be discarded. Your edits are still open. Please try again.");
        return false;
      }
    },
    status: setAppStatus,
  });
  const closeDocument = async (completed = onClose): Promise<boolean> => {
    if (isDirty || buffer.snapshot().isDirty) {
      setAppStatus("Save your changes before closing this document.");
      return false;
    }
    if (pendingSaves.current.size) {
      setAppStatus(
        "A save is still in progress. Close the document when it finishes.",
      );
      return false;
    }
    if (!readerStateReady) {
      setAppStatus(
        "Reader state is still loading. Try closing again when it finishes.",
      );
      return false;
    }
    if (closingRef.current) return false;
    closingRef.current = true;
    setClosing(true);
    const isCurrent = navigationWork.capture();
    const version = buffer.snapshot().version;
    try {
      // Drain earlier reader writes before flushing the final position. Closing
      // unmounts the workspace, cancelling its timers/listeners without writing
      // an empty document over reader memory or recovery snapshots.
      await Promise.allSettled([...pendingReaderWrites.current]);
      if (
        !isCurrent() ||
        buffer.snapshot().version !== version ||
        buffer.snapshot().isDirty
      )
        return false;
      await window.sensibleMD?.saveDocumentState?.({
        documentId: activeDocumentId,
        bookmarks,
        activeHeading,
        position:
          createSemanticPosition(
            semanticDocument,
            activeNodeId || activeHeading,
          ) ?? undefined,
        fontScale,
        lineHeight,
        contentWidth,
        reducedMotion,
      });
      if (
        !isCurrent() ||
        buffer.snapshot().version !== version ||
        buffer.snapshot().isDirty
      )
        return false;
      completed();
      return true;
    } catch {
      setAppStatus(
        "Reader state could not be saved. The document is still open.",
      );
      return false;
    } finally {
      closingRef.current = false;
      setClosing(false);
    }
  };
  useImperativeHandle(prepareOpen, () => () => closeDocument(() => {}));
  const reloadExternalChange = () => {
    if (externalChange === null) return;
    buffer.replace(externalChange, "external-reload");
    buffer.markSaved();
    setCollection((documents) =>
      replaceCollectionDocument(documents, activeDocumentId, externalChange),
    );
    setSource(externalChange);
    setIsDirty(false);
    setExternalChange(null);
  };
  const restoreRecoverySnapshot = () => {
    if (!recoverySnapshot) return;
    buffer.replace(recoverySnapshot.source, "recovery");
    setCollection((documents) =>
      replaceCollectionDocument(
        documents,
        activeDocumentId,
        recoverySnapshot.source,
      ),
    );
    setSource(recoverySnapshot.source);
    setIsDirty(true);
    setRecoverySnapshot(null);
    setAppStatus("Recovered unsaved changes. Save when ready.");
  };
  const toggleBookmark = () =>
    activeHeading &&
    setBookmarks((items) =>
      items.includes(activeHeading)
        ? items.filter((item) => item !== activeHeading)
        : [...items, activeHeading],
    );
  const commands: CommandDefinition[] = [
    {
      id: "app.openFile",
      title: "Open Markdown File",
      keywords: ["document", "file"],
      shortcut: "Cmd/Ctrl+O",
      scope: "global",
      enabled: true,
      execute: () => void openDocument(),
    },
    ...recentDocuments.map((recent) => ({
      id: `app.openRecent.${recent.index}`,
      title: `Open Recent: ${recent.name}`,
      keywords: ["recent", "document", "file"],
      scope: "global" as const,
      enabled: true,
      execute: () => void openRecentDocument(recent.index),
    })),
    {
      id: "app.openCollection",
      title: "Open Markdown Collection",
      keywords: ["chapters", "book", "multiple files"],
      scope: "global",
      enabled: true,
      execute: () => collectionInput.current?.click(),
    },
    {
      id: "file.close",
      title: "Close Document",
      keywords: ["document", "close"],
      scope: "global",
      enabled: !closing,
      execute: () => void closeDocument(),
    },
    {
      id: "file.save",
      title: downloadOnly ? "Download copy" : "Save Markdown File",
      keywords: ["document", "download"],
      shortcut: "Cmd/Ctrl+S",
      scope: "global",
      enabled: true,
      execute: saveFile,
    },
    {
      id: "reader.nextHeading",
      title: "Next Heading",
      keywords: ["navigate", "forward", "section"],
      shortcut: "Alt+Down",
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentHeading(semanticDocument.headings, activeHeading, "next"),
        ),
      disabledReason: "No next heading is available.",
      execute: () => navigateHeading("next"),
    },
    {
      id: "reader.previousHeading",
      title: "Previous Heading",
      keywords: ["navigate", "back", "section"],
      shortcut: "Alt+Up",
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentHeading(semanticDocument.headings, activeHeading, "previous"),
        ),
      disabledReason: "No previous heading is available.",
      execute: () => navigateHeading("previous"),
    },
    {
      id: "reader.nextParagraph",
      title: "Next Paragraph",
      keywords: ["navigate", "forward", "text"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "paragraph",
            "next",
          ),
        ),
      disabledReason: "No next paragraph is available.",
      execute: () => navigateStructure("paragraph", "next"),
    },
    {
      id: "reader.previousParagraph",
      title: "Previous Paragraph",
      keywords: ["navigate", "back", "text"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "paragraph",
            "previous",
          ),
        ),
      disabledReason: "No previous paragraph is available.",
      execute: () => navigateStructure("paragraph", "previous"),
    },
    {
      id: "reader.nextLink",
      title: "Next Link",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "link",
            "next",
          ),
        ),
      disabledReason: "No next link is available.",
      execute: () => navigateStructure("link", "next"),
    },
    {
      id: "reader.nextImage",
      title: "Next Image",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "image",
            "next",
          ),
        ),
      disabledReason: "No next image is available.",
      execute: () => navigateStructure("image", "next"),
    },
    {
      id: "reader.nextTable",
      title: "Next Table",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "table",
            "next",
          ),
        ),
      disabledReason: "No next table is available.",
      execute: () => navigateStructure("table", "next"),
    },
    {
      id: "reader.nextCodeBlock",
      title: "Next Code Block",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "code",
            "next",
          ),
        ),
      disabledReason: "No next code block is available.",
      execute: () => navigateStructure("code", "next"),
    },
    {
      id: "reader.copyCurrentParagraph",
      title: "Copy Current Paragraph",
      keywords: ["reader", "clipboard", "text"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "paragraph",
            "next",
          ),
        ),
      disabledReason: "No paragraph is available to copy.",
      execute: () => copyCurrentNode("paragraph"),
    },
    {
      id: "reader.copyCurrentCodeBlock",
      title: "Copy Current Code Block",
      keywords: ["reader", "clipboard", "code"],
      scope: "reader",
      enabled:
        view === "read" &&
        Boolean(
          adjacentNavigableNode(
            semanticDocument.navigableNodes,
            activeNodeId || activeHeading,
            "code",
            "next",
          ),
        ),
      disabledReason: "No code block is available to copy.",
      execute: () => copyCurrentNode("code"),
    },
    {
      id: "history.back",
      title: "Go Back",
      keywords: ["history", "previous location"],
      scope: "reader",
      enabled: historyRef.current.canGoBack(),
      disabledReason: "No previous reading location is available.",
      execute: () => goThroughHistory("back"),
    },
    {
      id: "history.forward",
      title: "Go Forward",
      keywords: ["history", "next location"],
      scope: "reader",
      enabled: historyRef.current.canGoForward(),
      disabledReason: "No forward reading location is available.",
      execute: () => goThroughHistory("forward"),
    },
    {
      id: "book.nextPage",
      title: "Next Page",
      keywords: ["book", "forward", "turn"],
      shortcut: "Right Arrow",
      scope: "book",
      enabled:
        view === "read" &&
        readingMode !== "continuous" &&
        pageIndex + pageStep < pages.length,
      disabledReason: "No next page is available.",
      execute: () => turnPage("next"),
    },
    {
      id: "book.previousPage",
      title: "Previous Page",
      keywords: ["book", "back", "turn"],
      shortcut: "Left Arrow",
      scope: "book",
      enabled: view === "read" && readingMode !== "continuous" && pageIndex > 0,
      disabledReason: "No previous page is available.",
      execute: () => turnPage("previous"),
    },
    {
      id: "book.nextChapter",
      title: "Next Chapter",
      keywords: ["book", "collection", "forward"],
      scope: "book",
      enabled:
        view === "read" &&
        Boolean(
          adjacentCollectionDocument(collection, activeDocumentId, "next"),
        ),
      disabledReason: "No next chapter is available.",
      execute: () => navigateChapter("next"),
    },
    {
      id: "book.previousChapter",
      title: "Previous Chapter",
      keywords: ["book", "collection", "back"],
      scope: "book",
      enabled:
        view === "read" &&
        Boolean(
          adjacentCollectionDocument(collection, activeDocumentId, "previous"),
        ),
      disabledReason: "No previous chapter is available.",
      execute: () => navigateChapter("previous"),
    },
    {
      id: "search.nextResult",
      title: "Next Search Result",
      keywords: ["find", "forward", "match"],
      scope: "search",
      enabled: searchResults.length > 0,
      disabledReason: "Enter a search query with results first.",
      execute: () => navigateSearchResults("next"),
    },
    {
      id: "search.previousResult",
      title: "Previous Search Result",
      keywords: ["find", "back", "match"],
      scope: "search",
      enabled: searchResults.length > 0,
      disabledReason: "Enter a search query with results first.",
      execute: () => navigateSearchResults("previous"),
    },
    {
      id: "search.returnToOrigin",
      title: "Return to Search Origin",
      keywords: ["find", "back", "reading position"],
      scope: "search",
      enabled: searchOrigin !== null,
      disabledReason:
        "Search result navigation has not moved from a reading position.",
      execute: returnToSearchOrigin,
    },
    {
      id: "bookmark.addCurrentPosition",
      title: "Toggle Current Bookmark",
      keywords: ["save", "section"],
      scope: "reader",
      enabled: view === "read" && Boolean(activeHeading),
      disabledReason: "Navigate to a heading before bookmarking it.",
      execute: toggleBookmark,
    },
    {
      id: "accessibility.showCurrentContext",
      title: "Show Current Section Context",
      keywords: ["accessibility", "summary", "describe", "section"],
      scope: "reader",
      enabled: view === "read",
      execute: () => setSectionSummaryOpen(true),
    },
    {
      id: "editor.enterRawMode",
      title: "Enter Writing Mode",
      keywords: ["edit", "source"],
      shortcut: "Cmd/Ctrl+E",
      scope: "global",
      enabled: view !== "write",
      disabledReason: "Already in writing mode.",
      execute: () => setView("write"),
    },
    {
      id: "editor.enterSplitMode",
      title: "Enter Split Preview",
      keywords: ["edit", "source", "rendered", "side by side"],
      scope: "global",
      enabled: view !== "split",
      disabledReason: "Already in split preview.",
      execute: () => setView("split"),
    },
    {
      id: "reader.enterRenderedMode",
      title: "Enter Reading Mode",
      keywords: ["preview", "rendered"],
      shortcut: "Cmd/Ctrl+E",
      scope: "global",
      enabled: view !== "read",
      disabledReason: "Already in reading mode.",
      execute: () => setView("read"),
    },
    {
      id: "accessibility.openFindings",
      title: "Show Authoring Checks",
      keywords: ["accessibility", "diagnostics", "issues"],
      scope: "editor",
      enabled: true,
      execute: () => setView("write"),
    },
    {
      id: "diagnostics.showErrors",
      title: "Show Diagnostic Errors",
      keywords: ["accessibility", "findings", "filter"],
      scope: "editor",
      enabled: true,
      execute: () => {
        setFindingFilter("error");
        setView("write");
      },
    },
    {
      id: "diagnostics.showWarnings",
      title: "Show Diagnostic Warnings",
      keywords: ["accessibility", "findings", "filter"],
      scope: "editor",
      enabled: true,
      execute: () => {
        setFindingFilter("warning");
        setView("write");
      },
    },
    {
      id: "diagnostics.showAll",
      title: "Show All Diagnostics",
      keywords: ["accessibility", "findings", "filter"],
      scope: "editor",
      enabled: true,
      execute: () => {
        setFindingFilter("all");
        setView("write");
      },
    },
    {
      id: "settings.show",
      title: "Show Reading Settings",
      keywords: ["text", "size", "preferences"],
      scope: "global",
      enabled: true,
      execute: () => setSettingsOpen(true),
    },
  ];

  const preferences = normalizeReaderPreferences({
    fontScale,
    lineHeight,
    contentWidth,
    reducedMotion,
  });
  return (
    <div
      className={
        preferences.reducedMotion ? "app-shell reduced-motion" : "app-shell"
      }
      data-dirty={isDirty}
      data-document-id={activeDocumentId}
      data-session-id={activeSessionId ?? ""}
      style={
        {
          "--reader-scale": `${preferences.fontScale}%`,
          "--reader-line-height": String(preferences.lineHeight),
          "--reader-width": `${preferences.contentWidth}px`,
        } as React.CSSProperties
      }
    >
      <header className="topbar">
        <div className="brand" aria-label="SensibleMD">
          <span className="brand-mark">
            <BookOpen size={20} />
          </span>
          <span>SensibleMD</span>
        </div>
        <div className="document-title">
          <FileText size={16} />
          <span>{documentName}</span>
          <span className="saved">
            {!isDirty && <Check size={14} />}
            {isDirty ? "Unsaved changes" : "No unsaved changes"}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            onClick={openDocument}
            aria-label="Open Markdown file"
            title="Open Markdown file"
          >
            <FolderOpen size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => void closeDocument()}
            disabled={closing}
            aria-label="Close document"
            title="Close document"
          >
            <X size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={saveFile}
            aria-label={saveActionLabel}
            title={saveActionLabel}
          >
            {downloadOnly ? <Download size={18} /> : <Save size={18} />}
          </button>
          <button
            className="icon-button"
            type="button"
            ref={settingsTrigger}
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="Reading settings"
            aria-expanded={settingsOpen}
            title="Reading settings"
          >
            <Settings2 size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label="Show command palette"
            title="Show command palette (Cmd/Ctrl+K)"
          >
            <Command size={18} />
          </button>
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
          onChange={openFile}
        />
      </header>
      <input
        ref={collectionInput}
        className="visually-hidden"
        type="file"
        multiple
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        onChange={openCollection}
      />
      {commandPaletteOpen && (
        <Suspense fallback={null}>
          <CommandPalette
            query={commandQuery}
            onQueryChange={setCommandQuery}
            commands={commands}
            onClose={() => setCommandPaletteOpen(false)}
          />
        </Suspense>
      )}
      <div className={`workspace ${outlineOpen ? "" : "outline-closed"}`}>
        <aside
          className={`outline-panel ${outlineOpen ? "" : "collapsed"}`}
          aria-label="Document outline"
        >
          <div className="panel-heading">
            <span>
              {collection.length > 1
                ? `Chapters · ${collection.length}`
                : "Outline"}
            </span>
            <button
              type="button"
              className="icon-button small"
              onClick={() => setOutlineOpen(false)}
              aria-label="Close outline"
            >
              <X size={16} />
            </button>
          </div>
          {collection.length > 1 && (
            <nav className="chapter-list" aria-label="Collection chapters">
              {collection.map((document, index) => (
                <button
                  type="button"
                  key={document.id}
                  onClick={() => switchDocument(document)}
                  className={document.id === activeDocumentId ? "active" : ""}
                >
                  <small>{String(index + 1).padStart(2, "0")}</small>
                  {document.name}
                </button>
              ))}
            </nav>
          )}
          <nav>
            {headings.length ? (
              headings.map((heading) => (
                <button
                  type="button"
                  key={heading.id}
                  onClick={() => goToHeading(heading, "outline")}
                  aria-current={
                    activeHeading === heading.id ? "location" : undefined
                  }
                  className={`outline-item level-${heading.level} ${activeHeading === heading.id ? "active" : ""}`}
                >
                  {heading.text}
                </button>
              ))
            ) : (
              <p className="empty-state">Headings will appear here.</p>
            )}
          </nav>
          <div className="outline-footer">
            <span>{wordCount.toLocaleString()} words</span>
            <span>{headings.length} sections</span>
          </div>
        </aside>
        <main className="main-area">
          <div className="reader-toolbar">
            {!outlineOpen && (
              <button
                type="button"
                className="icon-button"
                onClick={() => setOutlineOpen(true)}
                aria-label="Open outline"
              >
                <ChevronRight size={18} />
              </button>
            )}
            <div
              className="mode-switch"
              role="group"
              aria-label="Document mode"
            >
              <button
                type="button"
                className={view === "read" ? "selected" : ""}
                onClick={() => setView("read")}
              >
                Read
              </button>
              <button
                type="button"
                className={view === "write" ? "selected" : ""}
                onClick={() => setView("write")}
              >
                Write
              </button>
              <button
                type="button"
                className={view === "split" ? "selected" : ""}
                onClick={() => setView("split")}
              >
                Split
              </button>
            </div>
            {view === "read" && (
              <div
                className="mode-switch layout-switch"
                role="group"
                aria-label="Reading layout"
              >
                <button
                  type="button"
                  className={readingMode === "continuous" ? "selected" : ""}
                  onClick={() => setReadingMode("continuous")}
                >
                  Scroll
                </button>
                <button
                  type="button"
                  className={readingMode === "single" ? "selected" : ""}
                  onClick={() => setReadingMode("single")}
                >
                  Page
                </button>
                <button
                  type="button"
                  className={readingMode === "spread" ? "selected" : ""}
                  onClick={() => setReadingMode("spread")}
                >
                  Spread
                </button>
              </div>
            )}
            <label className="search-field">
              <Search size={16} />
              <input
                id="document-search"
                value={query}
                onFocus={() => setSearchOpen(true)}
                onClick={() => setSearchOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setSearchOpen(true);
                }}
                placeholder="Search document"
                aria-label="Search document"
              />
              {query && <span>{matches}</span>}
            </label>
            <button
              type="button"
              className={`bookmark-button ${activeHeading && bookmarks.includes(activeHeading) ? "saved-bookmark" : ""}`}
              onClick={toggleBookmark}
              disabled={!activeHeading}
            >
              <Bookmark
                size={16}
                fill={
                  activeHeading && bookmarks.includes(activeHeading)
                    ? "currentColor"
                    : "none"
                }
              />{" "}
              Bookmark
            </button>
          </div>
          {searchOpen && query && (
            <section className="search-results" aria-label="Search results">
              <header>
                <span>
                  {searchIndex >= 0
                    ? `${searchIndex + 1} of ${searchResults.length} results`
                    : `${matches} matches in ${searchResults.length} document blocks`}
                </span>
                <div role="group" aria-label="Search scope">
                  <button
                    type="button"
                    className={searchScope === "document" ? "selected" : ""}
                    onClick={() => {
                      setSearchScope("document");
                      setSearchIndex(-1);
                      setSearchOrigin(null);
                    }}
                  >
                    This file
                  </button>
                  <button
                    type="button"
                    className={searchScope === "collection" ? "selected" : ""}
                    onClick={() => {
                      setSearchScope("collection");
                      setSearchIndex(-1);
                      setSearchOrigin(null);
                    }}
                  >
                    All chapters
                  </button>
                </div>
              </header>
              <div className="search-session-controls">
                <button
                  type="button"
                  onClick={() => navigateSearchResults("previous")}
                  disabled={!searchResults.length}
                  aria-label="Previous search result"
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => navigateSearchResults("next")}
                  disabled={!searchResults.length}
                  aria-label="Next search result"
                >
                  <ChevronRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={returnToSearchOrigin}
                  disabled={!searchOrigin}
                >
                  Return to origin
                </button>
              </div>
              {searchResults.slice(0, 8).map((result, index) => (
                <button
                  type="button"
                  key={`${result.documentId}-${result.nodeId}`}
                  className={searchIndex === index ? "selected-result" : ""}
                  onClick={() => {
                    setSearchIndex(index);
                    goToCollectionSearchResult(result);
                  }}
                >
                  <strong>
                    {result.documentName} · {result.section}
                  </strong>
                  <span>{result.text || result.section}</span>
                  <small>Line {result.line}</small>
                </button>
              ))}
            </section>
          )}
          {settingsOpen && (
            <section
              ref={settingsPanel}
              className="settings-popover"
              aria-label="Reading settings"
            >
              <label>
                Text size <output>{preferences.fontScale}%</output>
                <input
                  type="range"
                  min="85"
                  max="150"
                  value={preferences.fontScale}
                  onChange={(event) => setFontScale(Number(event.target.value))}
                />
              </label>
              <label>
                Line spacing{" "}
                <output>{preferences.lineHeight.toFixed(2)}</output>
                <input
                  type="range"
                  min="1.3"
                  max="2.4"
                  step="0.05"
                  value={preferences.lineHeight}
                  onChange={(event) =>
                    setLineHeight(Number(event.target.value))
                  }
                />
              </label>
              <label>
                Content width <output>{preferences.contentWidth}px</output>
                <input
                  type="range"
                  min="480"
                  max="1040"
                  step="20"
                  value={preferences.contentWidth}
                  onChange={(event) =>
                    setContentWidth(Number(event.target.value))
                  }
                />
              </label>
              <label className="toggle-setting">
                <input
                  type="checkbox"
                  checked={preferences.reducedMotion}
                  onChange={(event) => setReducedMotion(event.target.checked)}
                />{" "}
                Reduce motion
              </label>
            </section>
          )}
          {externalChange !== null && (
            <section className="external-change-notice" role="alert">
              <strong>This file changed outside SensibleMD.</strong>
              <p>
                Your unsaved edits are still intact. Choose which version to
                keep.
              </p>
              <div>
                <button type="button" onClick={() => setExternalChange(null)}>
                  Keep editing
                </button>
                <button type="button" onClick={reloadExternalChange}>
                  Reload from disk
                </button>
              </div>
            </section>
          )}
          {recoverySnapshot !== null && (
            <section className="recovery-notice" role="alert">
              <strong>Unsaved changes are available.</strong>
              <p>
                A recovery snapshot from{" "}
                {new Date(recoverySnapshot.savedAt).toLocaleString()} differs
                from this document.
              </p>
              <div>
                <button type="button" onClick={() => void discardRecovery()}>
                  Discard recovery
                </button>
                <button type="button" onClick={restoreRecoverySnapshot}>
                  Restore changes
                </button>
              </div>
            </section>
          )}
          {view === "read" && sectionSummaryOpen && (
            <section
              className="section-summary"
              role="status"
              aria-label="Current section context"
            >
              <header>
                <strong>{sectionSummary.heading}</strong>
                <button
                  type="button"
                  className="icon-button small"
                  onClick={() => setSectionSummaryOpen(false)}
                  aria-label="Close section context"
                >
                  <X size={15} />
                </button>
              </header>
              <p>{sectionSummary.wordCount} words in this section.</p>
              <ul>
                {Object.entries(sectionSummary.counts)
                  .filter(([type]) => type !== "heading")
                  .map(([type, count]) => (
                    <li key={type}>
                      {count} {type}
                      {count === 1 ? "" : "s"}
                    </li>
                  ))}
              </ul>
            </section>
          )}
          {view === "read" && (
            <nav className="reader-navigation" aria-label="Reader navigation">
              <button
                type="button"
                className="icon-button"
                onClick={() => navigateHeading("previous")}
                disabled={
                  !adjacentHeading(
                    semanticDocument.headings,
                    activeHeading,
                    "previous",
                  )
                }
                aria-label="Previous heading"
                title="Previous heading (Alt+Up)"
              >
                <ChevronLeft size={18} />
              </button>
              <span aria-live="polite">
                {headings.find((heading) => heading.id === activeHeading)
                  ?.text ?? "Start of document"}
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => navigateHeading("next")}
                disabled={
                  !adjacentHeading(
                    semanticDocument.headings,
                    activeHeading,
                    "next",
                  )
                }
                aria-label="Next heading"
                title="Next heading (Alt+Down)"
              >
                <ChevronRight size={18} />
              </button>
              <button
                type="button"
                className="reader-bookmark-list"
                onClick={() => setBookmarksOpen((open) => !open)}
                aria-expanded={bookmarksOpen}
              >
                <Bookmark size={15} /> {savedHeadings.length} saved
              </button>
            </nav>
          )}
          {bookmarksOpen && (
            <section className="bookmarks-popover" aria-label="Saved bookmarks">
              <header>
                <span>Saved sections</span>
                <button
                  type="button"
                  className="icon-button small"
                  onClick={() => setBookmarksOpen(false)}
                  aria-label="Close saved bookmarks"
                >
                  <X size={15} />
                </button>
              </header>
              {savedHeadings.length ? (
                savedHeadings.map((heading) => (
                  <button
                    type="button"
                    key={heading.id}
                    onClick={() => {
                      goToHeading(heading, "bookmark");
                      setBookmarksOpen(false);
                    }}
                  >
                    {heading.text}
                  </button>
                ))
              ) : (
                <p>Bookmark a heading to keep it here.</p>
              )}
            </section>
          )}
          {view === "read" && (
            <nav className="history-navigation" aria-label="Navigation history">
              <button
                type="button"
                className="icon-button"
                onClick={() => goThroughHistory("back")}
                disabled={!historyRef.current.canGoBack()}
                aria-label="Go back"
                title="Go back"
              >
                <ChevronLeft size={17} />
              </button>
              <button
                type="button"
                className="icon-button"
                onClick={() => goThroughHistory("forward")}
                disabled={!historyRef.current.canGoForward()}
                aria-label="Go forward"
                title="Go forward"
              >
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
          {view === "read" && collection.length > 1 && (
            <nav
              className="chapter-navigation"
              aria-label="Collection navigation"
            >
              <button
                type="button"
                className="icon-button"
                onClick={() => navigateChapter("previous")}
                disabled={
                  !adjacentCollectionDocument(
                    collection,
                    activeDocumentId,
                    "previous",
                  )
                }
                aria-label="Previous chapter"
              >
                <ChevronLeft size={17} />
              </button>
              <span aria-live="polite">
                Chapter {chapterIndex + 1} of {collection.length} ·{" "}
                {collectionWordCount.toLocaleString()} words
              </span>
              <button
                type="button"
                className="icon-button"
                onClick={() => navigateChapter("next")}
                disabled={
                  !adjacentCollectionDocument(
                    collection,
                    activeDocumentId,
                    "next",
                  )
                }
                aria-label="Next chapter"
              >
                <ChevronRight size={17} />
              </button>
            </nav>
          )}
          {view === "read" && (
            <button
              type="button"
              className="section-context-button"
              onClick={() => setSectionSummaryOpen((open) => !open)}
              aria-expanded={sectionSummaryOpen}
            >
              Section context
            </button>
          )}
          <p className="copy-status" aria-live="polite">
            {copyStatus}
          </p>
          <p className="app-status" aria-live="polite">
            {appStatus}
          </p>
          {view !== "read" && (
            <nav
              className="diagnostics-filter"
              aria-label="Diagnostic severity filter"
            >
              <button
                type="button"
                className={findingFilter === "all" ? "selected" : ""}
                onClick={() => setFindingFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={findingFilter === "error" ? "selected" : ""}
                onClick={() => setFindingFilter("error")}
              >
                Errors
              </button>
              <button
                type="button"
                className={findingFilter === "warning" ? "selected" : ""}
                onClick={() => setFindingFilter("warning")}
              >
                Warnings
              </button>
            </nav>
          )}
          {view === "read" ? (
            <ReaderSurface
              source={source}
              headings={headings}
              navigableNodes={semanticDocument.navigableNodes}
              blocks={semanticDocument.nodes}
              pageStep={pageStep}
              mode={readingMode}
              pages={pages}
              pageIndex={pageIndex}
              onPageIndex={setPageAndContext}
              onInternalLink={followInternalLink}
            />
          ) : (
            <section
              className={`editor-layout ${view === "split" ? "split-layout" : ""}`}
              aria-label="Markdown authoring"
            >
              <Suspense
                fallback={
                  <p className="editor-loading">Loading source editor...</p>
                }
              >
                <MarkdownEditor
                  value={source}
                  onChange={updateSource}
                  cursorLine={editorLine}
                  onCursorLineChange={setEditorLine}
                  onObserveCursor={observeEditorCursor}
                  onPromoteHeading={() => changeCurrentHeading("promote")}
                  onDemoteHeading={() => changeCurrentHeading("demote")}
                  jumpToLine={diagnosticJump?.line ?? null}
                  jumpIsCurrent={diagnosticJump?.isCurrent}
                  navigationJump={outlineJump}
                />
              </Suspense>
              {view === "split" && (
                <PreviewSurface
                  source={source}
                  headings={headings}
                  navigableNodes={semanticDocument.navigableNodes}
                />
              )}
              <aside className="findings-panel">
                <div className="findings-heading">
                  <Sparkles size={17} />
                  <span>Authoring checks</span>
                  <strong>{findings.length}</strong>
                </div>
                {findings.length ? (
                  findings.map((finding) => (
                    <button
                      type="button"
                      key={finding.id}
                      className={`finding ${finding.severity}`}
                      onClick={() => {
                        navigationWork.invalidate();
                        setDiagnosticJump({
                          line: finding.line,
                          isCurrent: navigationWork.capture(),
                        });
                      }}
                    >
                      <span>
                        {finding.ruleId} · {finding.confidence}
                      </span>
                      <p>{finding.title}</p>
                      <small>Line {finding.line}</small>
                    </button>
                  ))
                ) : (
                  <div className="all-clear">
                    <Check size={22} />
                    <p>No structural issues found.</p>
                  </div>
                )}
              </aside>
            </section>
          )}
        </main>
      </div>
      <footer className="statusbar">
        <span>
          <span className="status-dot" /> Local prototype
        </span>
        <span>Cmd/Ctrl + E: switch mode</span>
        <span>Cmd/Ctrl + F: search</span>
      </footer>
    </div>
  );
}

function App({ initialDocument }: { initialDocument?: OpenedReaderDocument }) {
  const [opened, setOpened] = useState<OpenedReaderDocument | null>(
    initialDocument ?? null,
  );
  const acknowledge = useRef<string | null>(null);
  const [osStatus, setOsStatus] = useState("");
  const prepareOpen = useRef<(() => Promise<boolean>) | null>(null);
  useEffect(() => {
    const api = window.sensibleMD;
    return api?.onOsOpenRequest?.((request) => {
      void (async () => {
        try {
          if (prepareOpen.current && !(await prepareOpen.current())) {
            api.completeOsOpen?.(request.id);
            return;
          }
          if (!api.openOsDocument) {
            api.completeOsOpen?.(request.id);
            return;
          }
          const file = await api.openOsDocument(request.id);
          setOsStatus("");
          setOpened({
            id: asDocumentId(file.documentId),
            sessionId: asSessionId(file.sessionId),
            source: file.source,
            name: file.name,
            canSaveDirectly: true,
          });
          acknowledge.current = request.id;
        } catch {
          setOsStatus(`Could not open ${request.name}.`);
          api.completeOsOpen?.(request.id);
        }
      })();
    });
  }, []);
  // Acknowledge only after the replacement workspace has committed its guard.
  // The main process then delivers the next queued OS request.
  useEffect(() => {
    if (acknowledge.current) {
      window.sensibleMD?.completeOsOpen?.(acknowledge.current);
      acknowledge.current = null;
    }
  }, [opened]);
  return (
    <>
      {opened === null ? (
        <NoDocument onOpen={setOpened} />
      ) : (
        <DocumentWorkspace
          key={opened.sessionId ?? opened.id}
          initialDocument={opened}
          prepareOpen={prepareOpen}
          onClose={() => setOpened(null)}
        />
      )}
      {osStatus && <p role="alert">{osStatus}</p>}
    </>
  );
}

export default App;
