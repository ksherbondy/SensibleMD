# ADR-001: Markdown Parsing and Semantic Normalization

**Status:** Proposed  
**Date:** 2026-09-03  
**Decision owners:** Project maintainers  
**Scope:** Markdown parsing, syntax support, source locations, semantic-model input  
**Related specifications:** Semantic Document Model, Accessible Authoring Rules, Smart Search, Reading Position, Source Fidelity, Test Strategy

---

## 1. Context

The application needs to understand Markdown once and reuse that understanding across:

- rendered reading,
- editor synchronization,
- search,
- outline generation,
- reading-position persistence,
- structural editing,
- accessible-authoring diagnostics,
- pagination,
- multi-file navigation.

The parser therefore cannot be selected solely on rendering quality.

The application requires:

1. CommonMark-compatible parsing.
2. GitHub Flavored Markdown support.
3. Accurate source positions, preferably including byte/string offsets.
4. An AST suitable for structural analysis.
5. Extensibility for front matter and future syntax.
6. Browser/Electron compatibility.
7. TypeScript support.
8. A maintained ecosystem.
9. No requirement that parser-specific node shapes become application-wide contracts.
10. Preservation of unsupported source syntax where practical.

---

## 2. Decision

Use the **unified / remark / mdast ecosystem** as the initial Markdown parsing layer.

Initial parser stack:

```text
unified
remark-parse
remark-gfm
optional narrowly selected remark extensions
```

Parser output will **not** become the application's public semantic model.

Instead:

```text
Markdown source
    |
    v
remark-parse / mdast
    |
    v
Parser Adapter / Normalizer
    |
    v
Application Semantic Document Model
```

The parser adapter is a mandatory architectural boundary.

---

## 3. Why This Direction

### 3.1 Structured Markdown AST

remark operates on Markdown as structured AST data rather than only producing rendered HTML.

That fits requirements such as:

```text
HeadingNode
ParagraphNode
LinkNode
ImageNode
ListNode
CodeBlockNode
TableNode
```

The application needs these structures long before rendering.

### 3.2 CommonMark and GFM

`remark-parse` supports CommonMark by default.

`remark-gfm` adds GitHub Flavored Markdown features including:

- autolink literals,
- footnotes,
- strikethrough,
- tables,
- task lists.

These features represent a practical baseline for modern Markdown documents.

### 3.3 Source Positions

unist/mdast nodes can carry positional information containing:

```text
line
column
offset
```

This is important for:

- editor source synchronization,
- accessibility findings,
- structural transformations,
- semantic-position reconciliation,
- highlighting source ranges.

### 3.4 Extensible Ecosystem

The unified ecosystem supports optional syntax through plugins.

That allows the application to add support deliberately rather than implementing one monolithic custom parser.

### 3.5 Parser Independence

Even though remark/mdast is the proposed parser, application code should depend on:

```text
SemanticDocument
SemanticNode
SourceRange
HeadingPath
```

rather than importing mdast types throughout reader/search/editor code.

This preserves the ability to replace or augment the parser later.

---

## 4. Parser Boundary

The parser subsystem should expose something conceptually similar to:

```ts
interface MarkdownParser {
  parse(source: string): ParsedMarkdownDocument;
}
```

The normalization layer:

```ts
interface SemanticNormalizer {
  normalize(
    parsed: ParsedMarkdownDocument,
    source: string
  ): SemanticDocument;
}
```

Most application subsystems consume only:

```ts
SemanticDocument
```

---

## 5. Parser-Specific Types

Parser-specific types may exist inside:

```text
semantic/parser/
```

They should not leak into:

```text
reader/
search/
pagination/
commands/
state/
diagnostics UI/
```

If application code repeatedly checks mdast-specific fields outside the adapter, the boundary has failed.

---

## 6. Source Position Requirements

The adapter should preserve the best available positional data.

Conceptual normalized form:

```ts
interface SourcePoint {
  line: number;
  column: number;
  offset: number;
}

interface SourceRange {
  start: SourcePoint;
  end: SourcePoint;
}
```

Offsets are particularly important because editor engines frequently operate in character offsets rather than line/column pairs.

---

## 7. Position Validation

Parser position data must be tested against:

- LF,
- CRLF,
- Unicode,
- combining characters,
- nested structures,
- fenced code,
- tables,
- embedded HTML.

The application should not assume source positions are correct without regression fixtures.

---

## 8. GFM Baseline

Enable GFM features through `remark-gfm`.

Expected semantic support:

```text
tables
task lists
strikethrough
autolink literals
footnotes
```

Each should normalize into application-level semantic nodes or extension nodes.

---

## 9. Front Matter

Front matter support should be added through a dedicated plugin only when the application implements its semantic behavior.

Potential forms:

```text
YAML
TOML
```

Front matter should normally remain hidden from reader prose while remaining available to:

- metadata,
- editor,
- search policy if explicitly enabled,
- source preservation.

---

## 10. Raw HTML

The Markdown parser may recognize raw HTML nodes.

However:

> Parsing raw HTML does not mean trusting or directly inserting it into the DOM.

Raw HTML handling is governed by ADR-002.

The semantic model should preserve enough information to:

- render safely,
- expose fallback/source,
- retain original syntax.

---

## 11. Unsupported Syntax

Unknown syntax must not automatically be discarded.

If the parser represents syntax as:

- raw text,
- HTML,
- extension node,
- unknown node,

the normalizer should preserve:

```text
source range
raw source
known semantic fallback
```

where practical.

The source file remains authoritative.

---

## 12. Serialization Policy

The project should **not** use full AST reserialization as the default editing strategy.

Reason:

A serializer may normalize:

- list markers,
- whitespace,
- heading style,
- fences,
- line endings,
- link style.

That conflicts with source-fidelity goals.

Structural edits should prefer targeted source-range transformations.

---

## 13. Structural Editing

Example:

```text
Move Section Down
```

should:

1. resolve section source range from semantic model,
2. transform the source substring,
3. reparse,
4. reconcile semantic identities.

It should not:

```text
modify AST
-> stringify entire document
```

unless a future ADR explicitly changes this policy.

---

## 14. Parser Error Behavior

Markdown is permissive.

Most malformed Markdown should still produce a usable semantic model.

Parser failures should:

- never destroy source,
- return diagnostics where possible,
- permit raw-source editing,
- permit fallback reader behavior where possible.

---

## 15. Performance

Parsing must eventually satisfy the Performance Budget.

The architecture should permit moving parsing to:

```text
Web Worker
Electron utility process
worker_threads
```

without changing semantic consumers.

The first implementation may parse synchronously if measurements show this is acceptable for normal files.

---

## 16. Incremental Parsing

This ADR does not require an incremental parser initially.

The architecture should nonetheless avoid making full reparsing a permanent assumption.

Source/model versioning should allow later incremental reconciliation.

---

## 17. Identity Reconciliation

Parser AST node identities must not be treated as persisted application identities.

After each parse, semantic normalization/reconciliation should generate or recover application-level:

```text
nodeId
fingerprint
headingPath
source range
```

Persisted reading positions should therefore survive parser recreation.

---

## 18. Search Integration

Search indexes:

```text
SemanticDocument
```

not raw mdast.

This ensures search behavior remains stable if parser implementation changes.

---

## 19. Accessibility Analysis Integration

Accessible-authoring rules should primarily inspect:

```text
SemanticDocument
```

Some specialized rules may inspect:

- raw source,
- rendered DOM,
- parser extension metadata.

Those dependencies should be explicit.

---

## 20. Pagination Integration

Pagination consumes rendered semantic blocks.

It must not understand remark/mdast internals.

---

## 21. Alternatives Considered

### Alternative A — markdown-it

Strengths:

- mature,
- performant,
- extensible,
- common in editors.

Concern:

Its token stream is highly useful for rendering, but the proposed application places unusually heavy emphasis on AST semantics, source relationships, and structural transformations.

It remains a viable fallback candidate if benchmarks or parser correctness reveal problems.

### Alternative B — micromark directly

Strengths:

- lower-level parser,
- foundation beneath much of unified's Markdown tooling,
- precise syntax control.

Concern:

It would require the application to build more AST/semantic machinery itself.

Using remark/mdast provides a higher-level structure while preserving access to the unified ecosystem.

### Alternative C — Custom parser

Rejected for initial implementation.

Reasons:

- Markdown parsing is deceptively complex.
- CommonMark compatibility is expensive to reproduce.
- Security and malformed-input burden would increase.
- Engineering effort is better spent on the application's distinctive semantic reader.

### Alternative D — DOM/HTML-first parsing

Rejected.

Reason:

Rendered HTML loses or complicates source fidelity and editor source relationships.

The application needs semantic understanding before rendering.

---

## 22. Consequences

### Positive

- Strong structured-data model.
- Source-position support.
- GFM support.
- Large ecosystem.
- TypeScript-friendly.
- Parser can be isolated behind adapter.
- Fits diagnostics/search/navigation architecture.

### Negative

- ESM-only packages may influence build/test configuration.
- Plugin ecosystem requires dependency discipline.
- AST transformations can tempt contributors toward whole-document serialization.
- Source positions and edge cases still require application testing.
- Some extensions may require custom normalization.

---

## 23. Risks

### RISK-001 — Parser leakage

Application becomes coupled to mdast.

Mitigation:

```text
strict adapter boundary
lint/import rules if necessary
```

### RISK-002 — Plugin sprawl

Many syntax plugins create compatibility/security complexity.

Mitigation:

```text
extensions require explicit product need
```

### RISK-003 — Source normalization

Contributors stringify AST after edits.

Mitigation:

```text
source-fidelity tests
engineering guide
targeted transforms
```

### RISK-004 — Performance

Full parse may become expensive on huge documents.

Mitigation:

```text
performance benchmarks
workers
future incremental strategy
```

---

## 24. Verification

Before accepting this ADR, build a parser spike against the torture corpus.

Minimum tests:

```text
CommonMark basics
GFM tables
task lists
footnotes
duplicate headings
deep sections
code fences
front matter
raw HTML
Unicode
CRLF
source positions
10k-line file
malformed Markdown
```

Measure:

```text
parse time
semantic-normalization time
memory
source-position accuracy
```

---

## 25. Acceptance Criteria

ADR may move from Proposed to Accepted when:

- parser spike succeeds on baseline corpus,
- GFM support behaves correctly,
- source offsets are reliable enough for editor mapping,
- 10k-line performance is within or near budget,
- adapter successfully prevents parser-specific types from leaking,
- no major source-fidelity blocker is discovered.

---

## 26. Research Basis

Reviewed on 2026-09-03:

- remark: https://github.com/remarkjs/remark
- remark-parse: https://github.com/remarkjs/remark/tree/main/packages/remark-parse
- remark-gfm: https://github.com/remarkjs/remark-gfm
- unist position utility: https://github.com/syntax-tree/unist-util-position

Current first-party documentation describes remark as an AST-based Markdown ecosystem, `remark-parse` as CommonMark-capable by default, and `remark-gfm` as providing GFM features such as tables, task lists, footnotes, strikethrough, and autolinks.

---

## 27. Final Decision Rule

> **Use a mature Markdown parser for syntax, but make the application's semantic model—not the parser's AST—the contract the rest of the product depends on.**
