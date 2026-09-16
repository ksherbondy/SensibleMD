import {
  type ReactNode,
  createContext,
  createElement,
  useContext,
} from "react";
import ReactMarkdown, {
  type Components,
  type ExtraProps,
} from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { rehypeBookPage, rehypeMeasurementIds } from "../core/page-render";
import type { SemanticNode } from "../core/semantic-document";
import type { BookPage } from "../core/pagination";

export type ReadingMode = "continuous" | "single" | "spread";
export type Heading = { id: string; level: number; text: string; line: number };

// Parser positions, rather than displayed text, distinguish duplicate/formatted headings.
const ReaderIdPrefix = createContext("");
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
      ["hr", "thematicBreak"],
    ] as const
  ).map(([tag, type]) => [
    tag,
    function ReaderBlock({
      node,
      children,
    }: ExtraProps & { children?: ReactNode }) {
      const nodes = useContext(ReaderNodeContext);
      const prefix = useContext(ReaderIdPrefix);
      const target = nodes.find(
        (item) =>
          item.type === type &&
          item.range.start === node?.position?.start.offset,
      );
      return createElement(
        tag,
        { id: target ? prefix + readerNodeId(target.id) : undefined },
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
      const prefix = useContext(ReaderIdPrefix);
      const id = headings.find(
        (heading) => heading.line === node?.position?.start.line,
      )?.id;
      return createElement(
        tag,
        {
          ...props,
          id: id ? prefix + id : props.id,
        },
        children,
      );
    };
  }
  return components;
})();

// Navigation callers share this module's DOM ID contract.
// oxlint-disable-next-line react/only-export-components
export function readerNodeId(nodeId: string) {
  return `reader-node-${nodeId}`;
}

export function ReaderSurface({
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
  viewportRef,
  measurementRef,
  pagesReady,
}: {
  source: string;
  headings: Heading[];
  navigableNodes: SemanticNode[];
  blocks: SemanticNode[];
  viewportRef: React.RefObject<HTMLDivElement | null>;
  measurementRef: React.RefObject<HTMLElement | null>;
  pagesReady: boolean;
  pageStep: number;
  mode: ReadingMode;
  pages: BookPage[];
  pageIndex: number;
  onPageIndex: (index: number) => void;
  onInternalLink: (href: string) => boolean;
}) {
  const navigationId = (
    type: string,
    offset: number | undefined,
    prefix = "",
  ) => {
    const node = navigableNodes.find(
      (item) => item.type === type && item.range.start === offset,
    );
    return node ? prefix + readerNodeId(node.id) : undefined;
  };
  const renderMarkdown = (page?: BookPage, measuring = false) => (
    <ReaderIdPrefix.Provider value={measuring ? "measure-" : ""}>
      <ReaderNodeContext.Provider value={blocks}>
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
                : measuring
                  ? [rehypeSanitize, rehypeMeasurementIds]
                  : [rehypeSanitize]
            }
            components={{
              a: ({ href, children, node, ...props }) => {
                const isHttps = href?.startsWith("https://") ?? false;

                return (
                  <a
                    {...props}
                    id={
                      navigationId(
                        "link",
                        node?.position?.start.offset,
                        measuring ? "measure-" : "",
                      ) ?? props.id
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
                  id={navigationId(
                    "image",
                    node?.position?.start.offset,
                    measuring ? "measure-" : "",
                  )}
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
    </ReaderIdPrefix.Provider>
  );
  if (mode === "continuous")
    return (
      <section className="scroll-reader" aria-label="Scroll reading mode">
        <article
          className="document-reader rendered-markdown"
          tabIndex={0}
          aria-label="Document"
        >
          <div className="reading-column">{renderMarkdown()}</div>
        </article>
      </section>
    );
  const visiblePages = pages.slice(pageIndex, pageIndex + pageStep);
  return (
    <section
      className={`book-reader ${mode}`}
      data-columns={pageStep}
      aria-label={`${mode === "spread" ? "Two-page" : "Single-page"} reading mode`}
    >
      <div className="book-pages" ref={viewportRef} aria-busy={!pagesReady}>
        {!pagesReady ? (
          <p role="status">Preparing pages…</p>
        ) : (
          !pages.length && <p>No readable content.</p>
        )}
        {visiblePages.map((page) => (
          <article
            className="book-page rendered-markdown"
            key={page.pageNumber}
            aria-label={`Page ${page.pageNumber}`}
          >
            <div
              className={`page-content${page.oversized ? " oversized-block" : ""}`}
              tabIndex={page.oversized ? 0 : undefined}
              role={page.oversized ? "region" : undefined}
              aria-label={
                page.oversized ? "Scrollable oversized content" : undefined
              }
            >
              {renderMarkdown(page)}
            </div>
          </article>
        ))}
      </div>
      <article
        className="book-page pagination-measurement rendered-markdown"
        ref={measurementRef}
        aria-hidden="true"
        inert
      >
        <div className="page-content">{renderMarkdown(undefined, true)}</div>
      </article>
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

export function PreviewSurface({
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
      className="authoring-preview rendered-markdown"
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
