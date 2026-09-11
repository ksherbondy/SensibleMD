import { paginateTestDocument as paginateDocument } from "../test/pagination-geometry";
import { describe, expect, it } from "vitest";
import { pageIndexAfter } from "./pagination";
import { parseSemanticDocument } from "./semantic-document";
import { locationForPage, pageForLocation } from "./navigation-location";

describe("DOG-008 whole-block pagination", () => {
  it("preserves every whole block and exact paragraph whitespace/Markdown", () => {
    const source =
      "# Heading\n\nA **long paragraph** with  double spaces  \nand a hard break. ".repeat(
        1,
      ) +
      "word ".repeat(100) +
      "\n\n```text\n" +
      "code\n".repeat(40) +
      "```\n\n- one\n- two\n\n> Quote\n\n---";
    const model = parseSemanticDocument(source, 0);
    const pages = paginateDocument(model);
    const blocks = pages.flatMap((page) => page.fragments);
    expect(blocks.map((block) => block.nodeId)).toEqual(
      model.nodes.map((node) => node.id),
    );
    for (const [index, block] of blocks.entries()) {
      expect(block.source).toBe(
        source.slice(
          model.nodes[index].range.start,
          model.nodes[index].range.end,
        ),
      );
      expect(block.fragmentCount).toBe(1);
      expect(block.continuesOnNext).toBe(false);
    }
  });
  it("does not allocate blank pages for definitions, comments, or empty source", () => {
    for (const source of [
      "",
      "  \n",
      "[link]: https://example.com",
      "<!-- comment -->",
    ]) {
      expect(paginateDocument(parseSemanticDocument(source, 0))).toEqual([]);
    }
  });
  it("keeps oversized content with its heading and produces no empty pages", () => {
    const pages = paginateDocument(
      parseSemanticDocument("# Big\n\n" + "word ".repeat(300), 0),
    );
    expect(pages).toHaveLength(1);
    expect(pages[0].fragments).toHaveLength(2);
    expect(pages[0].estimatedWords).toBeGreaterThan(10);
  });
  it("keeps consecutive headings with the following whole block, including trailing headings", () => {
    const source =
      "Preamble.\n\n# One\n\n## Two\n\n### Three\n\n" +
      "word ".repeat(20) +
      "\n\n# Trailing\n\n## Last";
    const model = parseSemanticDocument(source, 0);
    const pages = paginateDocument(model);
    expect(
      pages.map((page) => page.fragments.map((block) => block.nodeId)),
    ).toEqual([
      [model.nodes[0].id],
      model.nodes.slice(1, 5).map((node) => node.id),
      model.nodes.slice(5).map((node) => node.id),
    ]);
    expect(
      pages.flatMap((page) => page.fragments).map((block) => block.source),
    ).toEqual(
      model.nodes.map((node) => source.slice(node.range.start, node.range.end)),
    );
  });
  it.each([5, 6])(
    "visits every page in single and spread traversal (%i pages)",
    (count) => {
      const model = parseSemanticDocument(
        Array.from(
          { length: count },
          (_, i) => `# Section ${i}\n\n${"word ".repeat(12)}`,
        ).join("\n\n"),
        0,
      );
      const pages = paginateDocument(model);
      expect(pages).toHaveLength(count);
      for (const step of [1, 2]) {
        const seen = new Set<number>();
        let index = 0;
        while (true) {
          for (let p = index; p < Math.min(index + step, pages.length); p++)
            seen.add(p);
          expect(pages[index].fragments.length).toBeGreaterThan(0);
          expect(pageForLocation(pages, locationForPage(pages, index)!)).toBe(
            index,
          );
          if (index + step >= pages.length) break;
          index = pageIndexAfter(index, pages.length, "next", step);
        }
        expect([...seen]).toEqual(Array.from({ length: count }, (_, i) => i));
        while (index > 0)
          index = pageIndexAfter(index, pages.length, "previous", step);
        expect(index).toBe(0);
      }
    },
  );
});
