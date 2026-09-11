import type { Element, Root } from "hast";
import type { SourceRange } from "./semantic-document";

// Run after sanitization on the full-document tree. Reference definitions and
// inline syntax are resolved before choosing complete top-level rendered blocks.
export function rehypeBookPage({
  ranges,
  lastPage,
}: {
  ranges: SourceRange[];
  lastPage: boolean;
}) {
  return (tree: Root) => {
    // Sanitization prefixes IDs for DOM-clobbering protection without updating
    // generated footnote href/ARIA references. Resolve against the sanitized
    // full tree before page filtering; never weaken the sanitizer's ID policy.
    const elements: Element[] = [];
    const collect = (parent: Root | Element) => {
      for (const child of parent.children)
        if (child.type === "element") {
          elements.push(child);
          collect(child);
        }
    };
    collect(tree);
    const ids = new Set(
      elements
        .map((node) => node.properties.id)
        .filter((id): id is string => typeof id === "string"),
    );
    const resolve = (id: string) =>
      ids.has(id)
        ? id
        : ids.has(`user-content-${id}`)
          ? `user-content-${id}`
          : id;
    for (const node of elements) {
      if (
        node.properties.dataFootnoteRef === undefined &&
        node.properties.dataFootnoteBackref === undefined
      )
        continue;
      const href = node.properties.href;
      if (typeof href === "string" && href.startsWith("#"))
        node.properties.href = `#${resolve(href.slice(1))}`;
      const describedBy = node.properties.ariaDescribedBy;
      if (Array.isArray(describedBy))
        node.properties.ariaDescribedBy = describedBy.map((id) =>
          resolve(String(id)),
        );
    }
    tree.children = tree.children.filter((node) => {
      const offset = node.position?.start.offset;
      if (offset !== undefined)
        return ranges.some(
          (range) => range.start <= offset && offset < range.end,
        );
      // Generated footnote endnotes have no original top-level source position.
      return (
        node.type === "element" &&
        lastPage &&
        node.properties.dataFootnotes !== undefined
      );
    });
  };
}

// A measurement render must not collide with visible headings or generated note IDs.
export function rehypeMeasurementIds() {
  return (tree: Root) => {
    const visit = (parent: Root | Element) => {
      for (const child of parent.children) {
        if (child.type !== 'element') continue;
        if (typeof child.properties.id === 'string') child.properties.id = `measure-${child.properties.id}`;
        if (typeof child.properties.href === 'string' && child.properties.href.startsWith('#')) child.properties.href = `#measure-${child.properties.href.slice(1)}`;
        if (Array.isArray(child.properties.ariaDescribedBy)) child.properties.ariaDescribedBy = child.properties.ariaDescribedBy.map(id => `measure-${id}`);
        visit(child);
      }
    };
    visit(tree);
  };
}
