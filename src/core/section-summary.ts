import type {
  SemanticDocument,
  SemanticHeading,
  SemanticNode,
} from "./semantic-document";

export interface SectionSummary {
  heading: string;
  wordCount: number;
  counts: Record<string, number>;
}

function sectionNodes(
  document: SemanticDocument,
  heading: SemanticHeading | undefined,
) {
  if (!heading) return document.nodes;
  const headingIndex = document.nodes.findIndex(
    (node) => node.id === heading.id,
  );
  const nextSectionIndex = document.nodes.findIndex(
    (node, index) =>
      index > headingIndex &&
      node.type === "heading" &&
      (node as SemanticHeading).level <= heading.level,
  );
  return document.nodes.slice(
    headingIndex,
    nextSectionIndex < 0 ? undefined : nextSectionIndex,
  );
}

export function summarizeSection(
  document: SemanticDocument,
  activeHeadingId: string,
): SectionSummary {
  const heading = document.headings.find((item) => item.id === activeHeadingId);
  const nodes = sectionNodes(document, heading);
  const counts: Record<string, number> = {};
  nodes.forEach((node: SemanticNode) => {
    counts[node.type] = (counts[node.type] ?? 0) + 1;
  });
  const sectionSource = nodes
    .map((node) => document.source.slice(node.range.start, node.range.end))
    .join("\n");
  const images = [...sectionSource.matchAll(/!\[[^\]]*\]\([^)]+\)/g)].length;
  const links = [...sectionSource.matchAll(/(?<!!)\[[^\]]+\]\([^)]+\)/g)]
    .length;
  if (images) counts.image = images;
  if (links) counts.link = links;
  const wordCount = nodes
    .map((node) => node.text)
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return { heading: heading?.text ?? "Document", wordCount, counts };
}
