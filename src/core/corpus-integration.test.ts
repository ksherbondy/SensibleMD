import { paginateTestDocument as paginateDocument } from "../test/pagination-geometry";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeAccessibility } from "./accessibility-diagnostics";
import { createCollection } from "./document-collection";
import { resolveInternalMarkdownLink } from "./internal-links";
import { searchDocument, parseSemanticDocument } from "./semantic-document";

const corpus = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), "test-corpus", relativePath), "utf8");

describe("Markdown regression corpus", () => {
  it("parses standard and empty documents without losing semantic structure", () => {
    expect(
      parseSemanticDocument(corpus("baseline/basic.md"), 1).headings,
    ).toHaveLength(2);
    expect(parseSemanticDocument(corpus("baseline/empty.md"), 1)).toMatchObject(
      { wordCount: 0, nodes: [] },
    );
  });

  it("reports authoring issues declared by the semantic and accessibility fixtures", () => {
    expect(
      analyzeAccessibility(corpus("semantic/skipped-headings.md")).map(
        (finding) => finding.ruleId,
      ),
    ).toContain("HEAD-001");
    expect(
      analyzeAccessibility(corpus("accessibility/authoring-errors.md")).map(
        (finding) => finding.ruleId,
      ),
    ).toEqual(
      expect.arrayContaining([
        "HEAD-006",
        "LINK-001",
        "LINK-002",
        "LINK-003",
        "IMG-004",
        "CODE-001",
      ]),
    );
    expect(
      analyzeAccessibility(corpus("accessibility/table-list-errors.md")).map(
        (finding) => finding.ruleId,
      ),
    ).toEqual(expect.arrayContaining(["LIST-002", "TABLE-002", "TABLE-003"]));
  });

  it("resolves collection links and keeps repeated-content search pageable", () => {
    const collection = createCollection([
      { name: "chapter-01.md", source: corpus("navigation/chapter-01.md") },
      { name: "chapter-02.md", source: corpus("navigation/chapter-02.md") },
    ]);
    expect(
      resolveInternalMarkdownLink(
        collection,
        collection[0].id,
        "chapter-02.md#installation",
      ),
    ).toMatchObject({ documentId: collection[1].id });
    const document = parseSemanticDocument(
      corpus("performance/repeated-content.md"),
      1,
    );
    expect(searchDocument(document, "searchable").length).toBeGreaterThan(4);
    expect(paginateDocument(document).length).toBeGreaterThan(1);
  });

  it("parses hostile and malformed Markdown without resolving dangerous navigation", () => {
    const hostile = corpus("security/hostile-markdown.md");
    expect(parseSemanticDocument(hostile, 1).wordCount).toBeGreaterThan(0);
    const collection = createCollection([
      { name: "hostile.md", source: hostile },
    ]);
    expect(
      resolveInternalMarkdownLink(
        collection,
        collection[0].id,
        "javascript:alert(1)",
      ),
    ).toBeNull();
    expect(
      resolveInternalMarkdownLink(
        collection,
        collection[0].id,
        "file:///etc/passwd",
      ),
    ).toBeNull();
    expect(
      parseSemanticDocument(corpus("malformed/odd-markdown.md"), 1).nodes
        .length,
    ).toBeGreaterThan(0);
  });
});
