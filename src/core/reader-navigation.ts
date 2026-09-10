import type {
  NavigableNodeType,
  SemanticHeading,
  SemanticNode,
} from "./semantic-document";

export function adjacentHeading(
  headings: SemanticHeading[],
  activeId: string,
  direction: "next" | "previous",
): SemanticHeading | null {
  if (!headings.length) return null;
  const activeIndex = headings.findIndex((heading) => heading.id === activeId);
  if (activeIndex < 0)
    return direction === "next" ? headings[0] : headings[headings.length - 1];
  const targetIndex = activeIndex + (direction === "next" ? 1 : -1);
  return headings[targetIndex] ?? null;
}

export function bookmarkedHeadings(
  headings: SemanticHeading[],
  bookmarks: string[],
) {
  const bookmarkSet = new Set(bookmarks);
  return headings.filter((heading) => bookmarkSet.has(heading.id));
}

export function adjacentNavigableNode(
  nodes: SemanticNode[],
  activeId: string,
  type: NavigableNodeType,
  direction: "next" | "previous",
) {
  const typedNodes = nodes.filter((node) => node.type === type);
  if (!typedNodes.length) return null;
  const activeIndex = typedNodes.findIndex((node) => node.id === activeId);
  if (activeIndex < 0)
    return direction === "next"
      ? typedNodes[0]
      : typedNodes[typedNodes.length - 1];
  return typedNodes[activeIndex + (direction === "next" ? 1 : -1)] ?? null;
}
