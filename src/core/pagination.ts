import type { SemanticDocument } from "./semantic-document";

export interface PageFragment {
  nodeId: string;
  source: string;
  fragmentIndex: number;
  fragmentCount: number;
  continuesOnNext: boolean;
}
export interface BookPage {
  pageNumber: number;
  fragments: PageFragment[];
  estimatedWords: number;
}

export interface BlockGeometry {
  height: number;
  marginTop: number;
  marginBottom: number;
}
export interface PageGeometry {
  availableHeight: number;
  blocks: Record<string, BlockGeometry>;
  /** Generated endnotes stay with the last source block, measured in the same flow. */
  trailingHeight?: number;
}
export const paginationBlocks = (document: SemanticDocument) => document.nodes.filter(node =>
  ["heading", "paragraph", "code", "blockquote", "list", "table", "thematicBreak"].includes(node.type),
);
export const consumedHeight = (block: BlockGeometry) => block.height + block.marginTop + block.marginBottom;

export function paginateDocument(document: SemanticDocument, geometry: PageGeometry): BookPage[] {
  const blocks = paginationBlocks(document);
  if (!(geometry.availableHeight > 0) || !Number.isFinite(geometry.availableHeight) || blocks.some(node => {
    const block = geometry.blocks[node.id];
    return !block || ![block.height, block.marginTop, block.marginBottom].every(Number.isFinite) || block.height < 0;
  })) return [];
  const pages: BookPage[] = [];
  let fragments: PageFragment[] = [];
  let wordCount = 0;
  let usedHeight = 0;
  const pushPage = () => {
    if (fragments.length)
      pages.push({
        pageNumber: pages.length + 1,
        fragments,
        estimatedWords: wordCount,
      });
    fragments = [];
    wordCount = 0;
    usedHeight = 0;
  };
  for (let index = 0; index < blocks.length; ) {
    const group = [blocks[index++]];
    // Keep heading runs with their next block, even when that block overflows
    // the page. The entire atomic group remains reachable by scrolling.
    while (group.at(-1)?.type === "heading" && index < blocks.length)
      group.push(blocks[index++]);
    const complete = group.map((node) => ({
      nodeId: node.id,
      source: document.source.slice(node.range.start, node.range.end),
      fragmentIndex: 0,
      fragmentCount: 1,
      continuesOnNext: false,
    }));
    const groupWords = complete.reduce(
      (total, block) =>
        total + block.source.trim().split(/\s+/).filter(Boolean).length,
      0,
    );
    const groupHeight = group.reduce((total, node) => total + consumedHeight(geometry.blocks[node.id]), 0)
      + (index === blocks.length ? geometry.trailingHeight ?? 0 : 0);
    if (fragments.length && usedHeight + groupHeight > geometry.availableHeight) pushPage();
    usedHeight += groupHeight;
    fragments.push(...complete);
    wordCount += groupWords;
  }
  pushPage();
  return pages;
}

export function pageSource(page: BookPage) {
  return page.fragments.map((fragment) => fragment.source).join("\n\n");
}

export function pageIndexAfter(
  index: number,
  pageCount: number,
  direction: "next" | "previous",
  step = 1,
) {
  if (!pageCount) return 0;
  return Math.max(
    0,
    Math.min(pageCount - 1, index + (direction === "next" ? step : -step)),
  );
}

export function pageIndexForNode(pages: BookPage[], nodeId: string) {
  const pageIndex = pages.findIndex((page) =>
    page.fragments.some((fragment) => fragment.nodeId === nodeId),
  );
  return pageIndex < 0 ? 0 : pageIndex;
}
