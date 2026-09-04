# Accessible Markdown Reader & Editor
# Semantic Document Model Specification

**Document type:** Core architecture specification  
**Status:** Working specification  
**Purpose:** Define the canonical semantic representation of Markdown content used by reading, navigation, pagination, search, accessibility, editing, persistence, and analysis.

---

## 1. Purpose

The Semantic Document Model is the architectural foundation of the application.

The application must not treat a Markdown document as only:

- a source string,
- a rendered HTML tree,
- a scrollable page,
- or a collection of editor lines.

Instead, the application should maintain a structured semantic representation that answers questions such as:

- What section is the reader in?
- What paragraph is currently active?
- What heading owns this paragraph?
- What images, tables, links, or code blocks occur in this section?
- Where should the reader return after a search?
- What should “copy current paragraph” mean?
- What should “move this section down” mean?
- What should a screen reader be told about the current context?
- What remains stable when layout, pagination, or font size changes?
- How can a saved reading position survive edits?
- How can accessibility checks inspect the document structurally?

This document defines the model that makes those features possible.

---

# 2. Architectural Principle

The canonical flow should conceptually be:

```text
Markdown Source
      |
      v
Parser
      |
      v
Semantic Document Model
      |
      +--> Rendered Reader
      +--> Editor Context
      +--> Pagination
      +--> Search
      +--> Outline
      +--> Accessibility Navigation
      +--> Reading Position
      +--> Bookmarks
      +--> Structural Editing
      +--> Accessibility Analysis
      +--> Export
```

The semantic model is not identical to the rendered DOM.

The semantic model is not identical to the editor text buffer.

The semantic model is the shared interpretation of the Markdown document.

---

# 3. Design Goals

The model should be:

## 3.1 Semantic

Nodes represent meaningful document concepts such as:

- heading,
- paragraph,
- list,
- list item,
- table,
- code block,
- link,
- image,
- section.

## 3.2 Source-aware

Every node should retain enough source-location information to connect semantic content back to Markdown source.

## 3.3 Stable enough for persistence

The model should provide identities and anchors useful for:

- saved reading position,
- bookmarks,
- navigation history,
- cross-mode synchronization.

## 3.4 Layout-independent

Semantic location must not depend on:

- pixel coordinates,
- scroll offsets,
- current page number,
- window size.

## 3.5 Accessible

The model should contain the information required to expose meaningful structure to assistive technology.

## 3.6 Editable

The model should support safe structural operations such as:

- move section,
- promote heading,
- select paragraph,
- copy code block.

## 3.7 Incrementally maintainable

The application should not require reparsing and reconstructing unrelated document structure after every small edit if a more localized update is practical.

## 3.8 Extensible

The model should allow optional syntax extensions such as:

- front matter,
- footnotes,
- math,
- diagrams,
- embedded HTML,
- custom attributes.

---

# 4. Canonical Document Structure

Conceptually:

```text
Document
├── Metadata
├── Block[]
│   ├── Heading
│   ├── Paragraph
│   ├── List
│   ├── BlockQuote
│   ├── CodeBlock
│   ├── Table
│   ├── ImageBlock
│   ├── HorizontalRule
│   └── ExtensionBlock
└── SectionTree
    ├── Section
    │   ├── Heading
    │   ├── Block[]
    │   └── Section[]
    └── ...
```

The source-order block list and hierarchical section tree may coexist.

They serve different purposes:

- source order is useful for rendering and editing,
- section hierarchy is useful for navigation, search grouping, overview, and book-like reading.

---

# 5. Core Node Interface

Every semantic node should conceptually expose a common base structure.

Example:

```ts
interface SemanticNode {
  id: NodeId;
  type: NodeType;

  sourceRange: SourceRange;

  parentId: NodeId | null;
  childIds: NodeId[];

  textContent: string;

  fingerprint?: string;

  attributes?: Record<string, unknown>;
}
```

This is conceptual, not a final TypeScript contract.

---

# 6. Node Identity

Node identity is critical because reading position and bookmarks depend on it.

A node ID should not simply be:

```text
paragraph-47
```

because inserting a paragraph above it would change the ordinal.

The system should support more durable identity.

Possible identity components:

```text
document identity
+
node type
+
structural path
+
source fingerprint
+
nearby textual fingerprint
```

Example conceptual ID:

```text
doc:memory.md
section:virtual-memory
paragraph:f82a19c4
```

Exact implementation may vary.

The system should distinguish:

- ephemeral runtime IDs,
- stable semantic fingerprints,
- persisted anchors.

These do not need to be the same value.

---

# 7. Source Range Model

Every node should retain its source span.

Example:

```ts
interface SourcePosition {
  offset: number;
  line: number;
  column: number;
}

interface SourceRange {
  start: SourcePosition;
  end: SourcePosition;
}
```

Source ranges support:

- editor synchronization,
- issue highlighting,
- structural editing,
- search context,
- source/preview mapping,
- accessibility diagnostics.

Offsets should refer to source text, not rendered HTML.

---

# 8. Text Anchors

Because source ranges may shift after edits, persistent reading locations should also use text anchors.

A text anchor may include:

```ts
interface TextAnchor {
  prefix?: string;
  exact: string;
  suffix?: string;
}
```

Example:

```text
prefix: "Virtual memory allows"
exact: "a process to use an address space"
suffix: "larger than physical memory"
```

This allows the application to relocate content after nearby edits.

Text anchors should be short enough for efficiency but specific enough to avoid ambiguity.

---

# 9. Document Identity

A document needs a stable identity separate from display name.

Possible inputs:

- normalized file path,
- filesystem metadata,
- optional persistent internal UUID stored in app settings,
- content fingerprint fallback.

Do not write proprietary IDs into the Markdown file unless the user explicitly chooses such behavior.

Conceptual:

```ts
interface DocumentIdentity {
  internalId: string;
  path: string;
  contentHash?: string;
}
```

The internal ID lives in application state, not document source.

---

# 10. Node Types

The base model should support at minimum:

```text
document
frontMatter
heading
paragraph
text
emphasis
strong
strikethrough
inlineCode
link
image
list
listItem
taskListItem
blockquote
codeBlock
table
tableRow
tableCell
horizontalRule
htmlBlock
footnoteDefinition
footnoteReference
mathBlock
mathInline
diagramBlock
extensionBlock
```

Not every parser will expose exactly these node names. The application should normalize parser output into its own semantic vocabulary.

---

# 11. Heading Model

A heading node should include:

```ts
interface HeadingNode extends SemanticNode {
  type: "heading";
  level: 1 | 2 | 3 | 4 | 5 | 6;
  textContent: string;
  slug: string;
}
```

The slug should correspond to internal anchor behavior where possible.

The application should also track heading ancestry.

Example:

```text
Document
└── H1 Memory Management
    └── H2 Virtual Memory
        └── H3 Page Tables
```

For a paragraph beneath `Page Tables`, the heading path is:

```text
Memory Management
Virtual Memory
Page Tables
```

This is useful for:

- current-location announcements,
- bookmarks,
- search context,
- navigation history,
- accessibility findings,
- persistence.

---

# 12. Section Model

A section is a semantic construct derived from headings.

It may not exist directly in Markdown syntax, but the reader should model it.

Example:

```ts
interface SectionNode {
  id: SectionId;
  headingId: NodeId | null;
  level: number;
  parentSectionId: SectionId | null;
  childSectionIds: SectionId[];
  blockIds: NodeId[];
  sourceRange: SourceRange;
}
```

A section begins at its heading and continues until the next heading of equal or higher level.

Example:

```markdown
## Heap

Paragraph A.

### Allocation

Paragraph B.

## Stack
```

`Heap` includes:

- Paragraph A,
- Allocation subsection,
- Paragraph B.

It ends immediately before `## Stack`.

---

# 13. Root / Preamble Section

Markdown may contain content before the first heading.

The model should represent this as a root or preamble section rather than leaving it structurally homeless.

Example:

```text
Document
├── Preamble
│   ├── Paragraph
│   └── Image
└── H1 Chapter One
```

This matters for:

- search grouping,
- reading progress,
- accessibility summaries,
- bookmarks.

---

# 14. Paragraph Model

A paragraph should be a first-class node.

Conceptually:

```ts
interface ParagraphNode extends SemanticNode {
  type: "paragraph";
  inlineIds: NodeId[];
  sentenceBoundaries?: SentenceBoundary[];
}
```

The paragraph node is important because users want commands such as:

- next paragraph,
- previous paragraph,
- repeat paragraph,
- copy paragraph,
- select paragraph.

---

# 15. Sentence Model

Markdown parsers normally do not provide sentence nodes.

Sentence segmentation should therefore be treated as a derived layer.

Conceptually:

```ts
interface SentenceBoundary {
  index: number;
  startOffsetInParagraph: number;
  endOffsetInParagraph: number;
  text: string;
}
```

Sentence segmentation must account for edge cases such as:

- abbreviations,
- decimal numbers,
- URLs,
- code spans,
- initials,
- ellipses.

Sentence boundaries should not be assumed perfectly reliable.

Features based on sentence segmentation should degrade gracefully.

---

# 16. Inline Nodes

Inline content may include:

- text,
- emphasis,
- strong,
- strikethrough,
- links,
- images,
- inline code,
- footnote references,
- inline math.

For reading-position persistence, the application may not need to persist identity for every inline text fragment.

However, links, images, and other interactive semantic objects should have stable node identities.

---

# 17. Link Model

Conceptual:

```ts
interface LinkNode extends SemanticNode {
  type: "link";
  label: string;
  href: string;
  title?: string;
  linkKind:
    | "external"
    | "local-file"
    | "local-markdown"
    | "internal-anchor"
    | "unknown";
}
```

Local Markdown links should additionally support resolved targets:

```ts
interface ResolvedLinkTarget {
  documentId: string;
  nodeId?: string;
  headingSlug?: string;
}
```

The link model supports:

- internal navigation,
- back/forward history,
- broken-link detection,
- accessible link announcements,
- cross-file book mode.

---

# 18. Image Model

Conceptual:

```ts
interface ImageNode extends SemanticNode {
  type: "image";
  src: string;
  alt: string;
  title?: string;
  resolvedPath?: string;
}
```

Accessibility analysis should be able to distinguish:

- missing alt attribute/syntax,
- explicitly empty alt text,
- nonempty alt text.

These states have different meanings.

---

# 19. List Model

Conceptual:

```ts
interface ListNode extends SemanticNode {
  type: "list";
  ordered: boolean;
  start?: number;
  itemIds: NodeId[];
}
```

List items:

```ts
interface ListItemNode extends SemanticNode {
  type: "listItem";
  checked?: boolean;
  childIds: NodeId[];
}
```

The model must preserve nesting.

This supports:

- structural editing,
- screen-reader list context,
- list-item position,
- navigation.

---

# 20. Code Block Model

Conceptual:

```ts
interface CodeBlockNode extends SemanticNode {
  type: "codeBlock";
  language?: string;
  code: string;
  fenced: boolean;
}
```

The model should preserve:

- original fence style if needed for source fidelity,
- language identifier,
- source range.

This supports:

- syntax highlighting,
- copy code block,
- accessible code identification,
- pagination behavior.

---

# 21. Table Model

Conceptually:

```ts
interface TableNode extends SemanticNode {
  type: "table";
  rowIds: NodeId[];
  columnCount: number;
  alignment?: ("left" | "center" | "right" | null)[];
}
```

Rows:

```ts
interface TableRowNode extends SemanticNode {
  type: "tableRow";
  cellIds: NodeId[];
  header: boolean;
}
```

Cells:

```ts
interface TableCellNode extends SemanticNode {
  type: "tableCell";
  rowIndex: number;
  columnIndex: number;
  header: boolean;
}
```

This enables:

- accessible table navigation,
- header association,
- table diagnostics,
- pagination strategies.

---

# 22. Blockquote Model

A blockquote should preserve child structure rather than flattening content into one string.

Example:

```text
BlockQuote
├── Paragraph
└── List
```

This allows nested semantic navigation.

---

# 23. Front Matter

Front matter should be modeled separately from reader-visible prose.

Conceptual:

```ts
interface FrontMatterNode extends SemanticNode {
  type: "frontMatter";
  format: "yaml" | "toml" | "json" | "unknown";
  raw: string;
  parsed?: Record<string, unknown>;
}
```

Reader behavior may hide front matter by default while editor and metadata tools retain access.

---

# 24. HTML Blocks

Embedded HTML should be represented as source-preserved semantic extension nodes.

The parser/model should distinguish:

- trusted semantic interpretation,
- raw source,
- sanitized rendered output.

The semantic model must not equate raw HTML with safe DOM.

Conceptual:

```ts
interface HtmlBlockNode extends SemanticNode {
  type: "htmlBlock";
  rawHtml: string;
  sanitizedRepresentation?: unknown;
}
```

---

# 25. Extension Nodes

The model must support syntax the core application does not fully understand.

Conceptual:

```ts
interface ExtensionBlockNode extends SemanticNode {
  type: "extensionBlock";
  extensionName?: string;
  rawSource: string;
  parsedPayload?: unknown;
}
```

Unsupported extensions should remain source-preserved.

---

# 26. Semantic Position

A semantic reading position should represent where the user is in document meaning, not layout.

Conceptual:

```ts
interface SemanticPosition {
  documentId: string;

  nodeId?: string;
  nodeFingerprint?: string;

  headingPath?: string[];

  blockIndexHint?: number;

  sentenceIndex?: number;
  characterOffset?: number;

  textAnchor?: TextAnchor;

  fallbackScrollRatio?: number;
}
```

The implementation may evolve, but the model should support multiple recovery strategies.

---

# 27. Position Resolution Strategy

When restoring a saved position, use progressively weaker methods.

Suggested order:

```text
1. Exact stable node ID
2. Node fingerprint match
3. Heading-path + node type + relative block position
4. Text-anchor match
5. Nearby textual similarity
6. Relative document progress
7. Scroll ratio fallback
8. Start of nearest resolved section
```

The application should never silently pretend an approximate recovery is exact.

---

# 28. Node Fingerprints

A node fingerprint should help find the same content after edits.

Possible inputs:

- node type,
- normalized text,
- parent heading path,
- nearby siblings,
- source prefix/suffix.

Example conceptual fingerprint:

```text
sha256(
  "paragraph" +
  normalize(text) +
  normalize(parentHeadingPath)
)
```

Do not use a whole-document line number as the sole fingerprint.

---

# 29. Heading Path Persistence

Heading paths are especially useful anchors.

Example:

```text
[
  "Memory Management",
  "Virtual Memory",
  "Page Tables"
]
```

If the paragraph text changes but remains under the same section, heading path still provides useful recovery context.

Duplicate headings require additional disambiguation.

Possible disambiguators:

- occurrence number,
- parent section,
- sibling fingerprint,
- source proximity.

---

# 30. Search Index Model

Search should index semantic nodes rather than only a giant text string.

Conceptually:

```ts
interface SearchRecord {
  nodeId: NodeId;
  documentId: string;
  sectionId: SectionId | null;
  headingPath: string[];
  nodeType: NodeType;
  text: string;
}
```

This enables:

- search grouped by section,
- search scoped to headings,
- search scoped to code,
- cross-file book search,
- accessible context.

---

# 31. Document Outline Model

The outline should derive from the section tree.

Conceptually:

```ts
interface OutlineEntry {
  sectionId: SectionId;
  headingId: NodeId;
  level: number;
  text: string;
  childIds: SectionId[];
}
```

The outline should not independently parse source.

There should be one authoritative heading hierarchy.

---

# 32. Section Summary Model

A section should expose computed metadata.

Conceptual:

```ts
interface SectionSummary {
  sectionId: SectionId;

  heading: string;
  level: number;

  wordCount: number;
  paragraphCount: number;
  subheadingCount: number;

  linkCount: number;
  imageCount: number;
  tableCount: number;
  listCount: number;
  codeBlockCount: number;

  estimatedReadingSeconds?: number;
}
```

This supports the nonvisual section-preview feature.

---

# 33. Reading Progress Model

Progress should be based primarily on semantic/content position.

Possible metrics:

- block position,
- word position,
- section position,
- chapter position,
- page position.

Conceptually:

```ts
interface ReadingProgress {
  documentPercent: number;
  sectionPercent?: number;

  currentSection?: SectionId;

  currentPage?: number;
  totalPages?: number;

  currentChapter?: number;
  totalChapters?: number;
}
```

Page-based progress is presentation-specific.

Word/block-based progress is more durable.

---

# 34. Bookmark Model

Conceptual:

```ts
interface Bookmark {
  id: string;
  documentId: string;
  position: SemanticPosition;
  label?: string;
  createdAt: string;
}
```

Bookmarks should not depend only on page number.

---

# 35. Navigation History Model

Conceptual:

```ts
interface NavigationEntry {
  documentId: string;
  position: SemanticPosition;
  reason:
    | "link"
    | "search"
    | "outline"
    | "bookmark"
    | "history"
    | "manual";
}
```

Back/Forward behavior should operate on semantic navigation entries.

---

# 36. Multi-File Document Model

A book/document set should conceptually be:

```ts
interface DocumentCollection {
  id: string;
  title?: string;

  documentIds: string[];

  order?: string[];

  rootDocumentId?: string;
}
```

This collection exists in application state and should not require proprietary conversion of Markdown files.

---

# 37. Cross-File Link Graph

The application may maintain a graph:

```text
chapter-01.md
   |
   +--> chapter-02.md
   |
   +--> glossary.md

chapter-02.md
   |
   +--> chapter-03.md
```

This supports:

- broken-link checks,
- book navigation,
- cross-file search,
- relationship visualization if ever desired.

The graph should be derived from ordinary Markdown links.

---

# 38. Structural Selection Model

Selection should support semantic units.

Conceptually:

```ts
interface StructuralSelection {
  kind:
    | "word"
    | "sentence"
    | "paragraph"
    | "section"
    | "listItem"
    | "list"
    | "table"
    | "codeBlock";

  nodeIds: NodeId[];
  sourceRange: SourceRange;
}
```

This supports commands such as:

- copy paragraph,
- delete section,
- move list item,
- duplicate code block.

---

# 39. Structural Command Model

Commands should operate against semantic targets.

Conceptual:

```ts
interface SemanticCommand {
  id: string;
  target?: StructuralSelection;
  payload?: unknown;
}
```

Examples:

```text
reader.nextHeading
reader.previousParagraph
reader.repeatSentence
reader.copySection

editor.selectParagraph
editor.moveSectionDown
editor.promoteHeading
editor.deleteListItem
```

Keyboard shortcuts should invoke commands.

Voice commands should invoke commands.

Menus should invoke commands.

The command is the semantic action; input methods are bindings.

---

# 40. Structural Edit Operations

Structural editing should ultimately transform source while preserving valid Markdown.

Example operation:

```text
Move section "Virtual Memory" below "Heap"
```

The system should identify the section source range, including all child subsections, then move that range as a unit.

Operations should not manipulate rendered DOM and attempt to reverse-engineer Markdown afterward.

Preferred direction:

```text
semantic target
    |
    v
source transformation
    |
    v
updated Markdown
    |
    v
reparse semantic model
```

---

# 41. Editing Synchronization

The editor's text buffer remains the source of truth for unsaved user edits.

During editing:

```text
Editor Buffer
    |
    v
Parser
    |
    v
Semantic Model
    |
    v
Preview / Navigation / Analysis
```

The rendered preview should never become the sole canonical representation of the document.

---

# 42. Incremental Parsing

For performance, the implementation may eventually use incremental parsing.

The semantic specification does not mandate a specific parser.

Requirements:

- edits should update affected structure correctly,
- node identity should remain stable where possible,
- unrelated sections should not churn IDs unnecessarily,
- parsing failures must preserve source.

---

# 43. Parse Error Model

Malformed Markdown generally still renders as text, but extensions may fail.

The model should support parse diagnostics.

Conceptually:

```ts
interface ParseDiagnostic {
  severity: "info" | "warning" | "error";
  message: string;
  sourceRange?: SourceRange;
  extension?: string;
}
```

A parse diagnostic must not cause source deletion.

---

# 44. Accessibility Analysis Model

Accessibility findings should reference semantic nodes.

Conceptually:

```ts
interface AccessibilityFinding {
  id: string;
  ruleId: string;

  severity:
    | "info"
    | "warning"
    | "error";

  nodeId?: NodeId;
  sourceRange?: SourceRange;

  message: string;
  rationale: string;
  remediation?: string;
}
```

Examples:

- image node missing alt text,
- heading level skip,
- ambiguous link,
- table missing usable header structure.

---

# 45. Document Statistics

The model should support computed statistics such as:

- total word count,
- total paragraphs,
- total headings,
- total sections,
- total links,
- total images,
- total tables,
- total code blocks,
- estimated reading time.

These should be derived from semantic nodes, not independently rescanned from rendered HTML.

---

# 46. Render Model

The reader rendering layer should consume semantic nodes.

Conceptually:

```text
SemanticNode
    |
    +--> React renderer component
```

Examples:

```text
HeadingNode   -> <HeadingRenderer />
ParagraphNode -> <ParagraphRenderer />
TableNode     -> <TableRenderer />
CodeBlockNode -> <CodeRenderer />
```

The renderer may produce semantic HTML but should not define document meaning independently.

---

# 47. Accessibility Tree Mapping

The rendering layer should preserve semantic meaning in the accessibility tree.

Example mappings:

```text
HeadingNode   -> h1...h6
ParagraphNode -> p
ListNode      -> ul / ol
ListItemNode  -> li
LinkNode      -> a
ImageNode     -> img with alt
TableNode     -> table
CodeBlockNode -> pre + code
```

Native semantics should be preferred over ARIA recreation.

---

# 48. Pagination Integration

Pagination should consume rendered block measurements but reference semantic node IDs.

Conceptually:

```ts
interface PageLayoutEntry {
  pageNumber: number;
  nodeFragments: PageNodeFragment[];
}
```

A fragment might represent part of a long block split across pages.

The important rule:

```text
semantic node identity survives pagination
```

Changing page layout must not change the underlying document model.

---

# 49. Page Fragment Model

Conceptual:

```ts
interface PageNodeFragment {
  nodeId: NodeId;

  fragmentIndex: number;
  fragmentCount: number;

  startOffset?: number;
  endOffset?: number;
}
```

This is useful when:

- a paragraph spans pages,
- a code block spans pages,
- a table spans pages.

---

# 50. Search Result Model

Conceptual:

```ts
interface SearchResult {
  documentId: string;
  nodeId: NodeId;
  sectionId?: SectionId;

  headingPath: string[];

  matchRangeInNode: {
    start: number;
    end: number;
  };

  excerpt: string;
}
```

This supports grouped search without losing semantic context.

---

# 51. Current Reader Context

The application should maintain a current semantic context separate from DOM focus.

Conceptually:

```ts
interface ReaderContext {
  documentId: string;
  position: SemanticPosition;

  currentNodeId?: NodeId;
  currentSectionId?: SectionId;

  readingMode:
    | "continuous"
    | "singlePage"
    | "spread";
}
```

The semantic reader cursor may differ from keyboard focus.

This distinction is important for accessibility.

---

# 52. Current Editor Context

Conceptually:

```ts
interface EditorContext {
  documentId: string;

  sourceSelection: SourceRange;

  currentNodeId?: NodeId;
  currentSectionId?: SectionId;

  structuralSelection?: StructuralSelection;
}
```

This allows the editor to answer:

- "What am I editing?"
- "What heading am I under?"
- "What paragraph is this?"
- "What structural command should apply?"

---

# 53. Document Mutation and Identity Preservation

After edits, the system should attempt to preserve node identity for unchanged semantic nodes.

Example:

Before:

```text
Paragraph A
Paragraph B
Paragraph C
```

User edits Paragraph B.

After reparse:

```text
Paragraph A -> same identity
Paragraph B -> updated/reconciled identity
Paragraph C -> same identity
```

The model should avoid generating entirely new IDs for the whole document after every keystroke.

---

# 54. Node Reconciliation

A reconciliation process may match new parser nodes against previous nodes.

Potential matching factors:

- node type,
- source overlap,
- normalized text similarity,
- heading path,
- sibling order,
- fingerprint.

Conceptually:

```text
old model
   |
new parse
   |
reconciler
   |
stable semantic model
```

This will be important for:

- bookmarks during editing,
- preview synchronization,
- screen-reader context,
- performance.

---

# 55. Source Fidelity

The semantic model should not unnecessarily normalize source.

For example:

```markdown
- item
```

and:

```markdown
* item
```

may represent the same semantic list but differ in source representation.

If the user is not intentionally reformatting, structural editing should preserve source style where practical.

Source fidelity considerations include:

- list markers,
- heading style,
- code fences,
- blank lines,
- line endings,
- indentation,
- optional syntax variants.

---

# 56. Unsupported Syntax Preservation

If a parser extension is unavailable:

```text
source
   |
unrecognized syntax
   |
ExtensionNode(rawSource)
```

The application should preserve it.

Reader behavior may display:

- fallback source,
- neutral unsupported-content placeholder,
- extension source preview.

Saving must not silently erase it.

---

# 57. Semantic Versioning of the Model

Because collaborators may eventually build features against this model, changes to its public internal contracts should be documented.

Consider maintaining a model schema version:

```ts
interface DocumentModel {
  schemaVersion: number;
}
```

This is especially important if persisted reading anchors or plugin interfaces later depend on model structure.

---

# 58. Serialization

The full semantic model does not necessarily need to be persisted.

Likely persistent data:

- document internal ID,
- semantic position,
- bookmarks,
- reading history,
- user settings.

Likely recomputed data:

- full AST,
- section summaries,
- search index,
- pagination map.

Persistence strategy should favor avoiding stale derived state.

---

# 59. Book / Collection Semantic Context

When reading a multi-file book, semantic context may include:

```ts
interface CollectionPosition {
  collectionId: string;
  documentId: string;
  documentPosition: SemanticPosition;
}
```

This supports:

- chapter progress,
- cross-file bookmarks,
- overall reading progress.

---

# 60. Semantic Reading Time

Reading-time estimates should be derived from semantic text content.

The algorithm should avoid counting:

- hidden metadata,
- Markdown punctuation,
- raw syntax markers,
- duplicated rendered content.

Code blocks may optionally use a different reading-rate estimate.

Any estimate should be clearly presented as approximate.

---

# 61. Structural Complexity Summary

The model should support a nonvisual structural summary.

Example:

```text
Section "Virtual Memory"

8 paragraphs
2 subsections
1 table
3 links
1 code block
```

This information should come directly from the section subtree.

---

# 62. Semantic Diff Potential

Although not required initially, the model should not prevent future semantic diffing.

Potential future comparison:

```text
heading renamed
paragraph inserted
section moved
code block changed
image alt text added
```

This could be useful for:

- external file conflicts,
- accessible change review,
- Git integration.

---

# 63. User Story Traceability

The semantic model exists to support user stories such as:

```text
As a reader, I want to reopen where I stopped.
```

Requires:

- DocumentIdentity
- SemanticPosition
- NodeIdentity
- PositionResolver

```text
As a blind reader, I want a section breakdown.
```

Requires:

- SectionTree
- SectionSummary
- structural node counts

```text
As a developer, I want search results grouped by section.
```

Requires:

- SearchRecord
- SectionId
- HeadingPath

```text
As an author, I want to move a section.
```

Requires:

- Section source range
- StructuralSelection
- source transformation

```text
As a screen-reader user, I want my current structure announced.
```

Requires:

- EditorContext
- Node type
- HeadingPath
- section relationships
```

---

# 64. Invariants

The following should be treated as model invariants.

## INV-001

Every semantic node belongs to exactly one document.

## INV-002

Every source-backed node has a valid source range.

## INV-003

A child's source range must normally fall within its parent's source range.

## INV-004

Heading hierarchy is derived consistently from source order.

## INV-005

Section boundaries must be deterministic for a given parsed document.

## INV-006

Semantic IDs must be unique within a document model instance.

## INV-007

Reader pagination must not mutate semantic document structure.

## INV-008

Rendering must not mutate source or semantic structure.

## INV-009

Accessibility analysis must not mutate source.

## INV-010

Search indexing must not mutate source.

## INV-011

Structural editing may mutate source only through explicit user action.

## INV-012

Unsupported syntax must not disappear solely because it cannot be interpreted.

---

# 65. Example

Source:

```markdown
# Memory Management

Memory allows programs to store working data.

## Stack

The stack stores local variables.

```js
function example() {
  const x = 10;
}
```

## Heap

The heap stores dynamically allocated data.

[Read more](heap.md)
```

Possible semantic structure:

```text
Document
├── Section: Memory Management
│   ├── Heading H1: Memory Management
│   ├── Paragraph
│   ├── Section: Stack
│   │   ├── Heading H2: Stack
│   │   ├── Paragraph
│   │   └── CodeBlock(language=js)
│   └── Section: Heap
│       ├── Heading H2: Heap
│       ├── Paragraph
│       └── Link(local-markdown -> heap.md)
```

The reader can now answer:

```text
Current section:
Stack

Current paragraph:
"The stack stores local variables."

Section contains:
1 paragraph
1 code block
```

Search for `stores` can return:

```text
Memory Management > Stack
"The stack stores local variables."

Memory Management > Heap
"The heap stores dynamically allocated data."
```

---

# 66. Reference Implementation Shape

A possible module layout:

```text
src/
  document/
    parser/
      parseMarkdown.ts
      normalizeAst.ts

    model/
      DocumentModel.ts
      SemanticNode.ts
      SectionTree.ts
      SemanticPosition.ts
      TextAnchor.ts

    reconcile/
      reconcileNodes.ts
      fingerprintNode.ts

    navigation/
      locatePosition.ts
      nextHeading.ts
      nextParagraph.ts

    search/
      buildSearchIndex.ts
      searchDocument.ts

    analysis/
      buildSectionSummary.ts
      accessibilityRules/

    editing/
      structuralSelection.ts
      structuralTransforms.ts
```

This is illustrative, not mandatory.

---

# 67. Parser Selection Criteria

The future Markdown parser should be evaluated on:

- CommonMark correctness,
- GFM support,
- source-position/range information,
- AST quality,
- extension ecosystem,
- preservation of raw source where needed,
- performance on large documents,
- incremental parsing potential,
- handling of malformed content,
- browser/Electron compatibility,
- TypeScript support,
- maintenance health.

Parser choice should be captured in an Architecture Decision Record.

---

# 68. Open Research Questions

Before freezing implementation details, investigate:

1. Which Markdown AST library provides the best source-range fidelity?
2. Should sentence segmentation use `Intl.Segmenter`, a specialized library, or both?
3. How stable can node identity remain during rapid live editing?
4. What is the best text-anchor recovery strategy after substantial edits?
5. How should duplicate headings be disambiguated?
6. How should semantic positions behave when the exact paragraph is deleted?
7. How much AST detail should be exposed to React components?
8. Should section nodes be materialized or derived on demand?
9. How should huge documents be indexed without unnecessary memory overhead?
10. How should extension/plugin nodes participate in semantic navigation?
11. How should embedded HTML be represented without conflating source semantics and sanitized DOM?
12. How should table fragments map back to source during pagination?
13. Should reading position anchor to block start, nearest character, or sentence?
14. How should bookmarks recover after major source reorganization?

---

# 69. Definition of Done for the Semantic Model

The semantic-model architecture should eventually be considered mature when it can reliably support all of the following from the same underlying document interpretation:

- rendered reading,
- raw editing,
- split preview,
- heading outline,
- section hierarchy,
- smart search,
- persistent reading position,
- bookmarks,
- navigation history,
- internal Markdown links,
- cross-file navigation,
- book mode,
- pagination,
- section preview,
- screen-reader context,
- low-vision reflow without position loss,
- copy current paragraph,
- repeat current sentence,
- structural selection,
- move section,
- accessible authoring checks.

If one of these features requires building an unrelated second interpretation of Markdown, the model should be reconsidered.

---

# 70. Core Architectural Rule

> The application should understand the document once and reuse that understanding everywhere.

The reader, editor, search engine, accessibility system, pagination engine, and navigation system should not each invent their own incompatible definition of what a Markdown document contains.
