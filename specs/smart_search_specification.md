# Accessible Markdown Reader & Editor
# Smart Search Specification

**Document type:** Search and information retrieval architecture specification  
**Status:** Working specification  
**Purpose:** Define the end-state behavior of document search, semantic grouping, structural scoping, contextual result presentation, accessibility, cross-file search, navigation history, performance, and search-state persistence.

---

# 1. Purpose

Search in this application should do more than locate matching character sequences.

The application should understand where a match occurs in document structure.

A search result should be able to answer:

```text
What matched?
Where is it?
What section is it in?
What kind of content is it?
What surrounds it?
Which file/chapter contains it?
How do I return to where I was reading before I searched?
```

The guiding principle is:

> **Search should preserve document context rather than flattening the document into a list of text matches.**

---

# 2. Product Goal

A developer reading a 4,000-line README should not have to cycle through dozens of anonymous matches such as:

```text
1 of 34
2 of 34
3 of 34
```

without knowing where each result belongs.

Instead, search should support output conceptually like:

```text
memory

Memory Management
  Virtual Memory
    3 matches

Memory Management
  Heap
    2 matches

Performance
  Memory Usage
    4 matches
```

This structure benefits:

- developers,
- blind readers,
- keyboard-only users,
- people navigating long manuals,
- readers using multi-file Markdown books,
- authors searching large documents.

---

# 3. Search Modes

The application should support several search modes.

## 3.1 Standard Text Search

Traditional Find behavior:

```text
Ctrl/Cmd+F
```

Features:

- search current document,
- highlight matches,
- next result,
- previous result,
- result count.

## 3.2 Semantic Search Grouping

Matches grouped by semantic context:

- heading,
- section,
- chapter,
- file.

## 3.3 Structural Search Scope

Limit search to specific node types:

- headings,
- paragraphs,
- links,
- code blocks,
- tables,
- current section.

## 3.4 Collection Search

Search across:

- linked Markdown files,
- books,
- documentation collections.

## 3.5 Editor Search and Replace

Editing mode adds:

- replace current,
- replace next,
- replace all,
- scoped replacement.

---

# 4. Search Architecture

Conceptual flow:

```text
Semantic Document Model
        |
        v
Search Index
        |
        v
Query Engine
        |
        v
Semantic Search Results
        |
        +--> Reader Highlighting
        +--> Search Panel
        +--> Screen Reader Output
        +--> Navigation History
```

Search should index semantic nodes rather than treating the entire document as one giant anonymous string.

---

# 5. Search Record Model

Conceptual:

```ts
interface SearchRecord {
  documentId: string;
  nodeId: string;

  sectionId?: string;
  headingPath: string[];

  nodeType:
    | "heading"
    | "paragraph"
    | "link"
    | "image"
    | "listItem"
    | "tableCell"
    | "codeBlock"
    | "blockquote"
    | "other";

  text: string;

  sourceRange?: SourceRange;
}
```

---

# 6. Search Result Model

Conceptual:

```ts
interface SearchResult {
  id: string;

  documentId: string;
  nodeId: string;
  sectionId?: string;

  headingPath: string[];

  nodeType: string;

  matchStart: number;
  matchEnd: number;

  excerpt: string;

  sourceRange?: SourceRange;

  score?: number;
}
```

---

# 7. Search Group Model

Conceptual:

```ts
interface SearchResultGroup {
  id: string;

  label: string;

  documentId?: string;
  sectionId?: string;

  headingPath?: string[];

  resultIds: string[];
}
```

Possible grouping levels:

```text
Collection
  File
    Section
      Subsection
        Result
```

---

# 8. Basic Search Behavior

Search should support:

```text
query text
next match
previous match
match count
case sensitivity
whole-word matching
```

Optional advanced behavior may include:

```text
regular expressions
```

if safely and clearly implemented.

---

# 9. Search Input

The search input should:

- be keyboard accessible,
- have a clear accessible name,
- expose active search scope,
- expose current result count,
- avoid moving document focus while the user is typing.

---

# 10. Opening Search

Default:

```text
Ctrl/Cmd+F
```

Opening search should:

1. preserve current semantic reading position,
2. place keyboard focus in search input,
3. not alter stable reading position.

---

# 11. Closing Search

Closing the search UI should not automatically mean:

```text
return to search origin
```

These are separate behaviors.

The user may intentionally want to remain at the current result.

---

# 12. Search Origin

When a search session starts:

```ts
interface SearchSession {
  query: string;

  origin: SemanticPosition;

  currentResultIndex: number;

  scope: SearchScope;

  resultIds: string[];
}
```

The origin remains stable while the user explores results.

---

# 13. Return to Search Origin

Command:

```text
search.returnToOrigin
```

Behavior:

- restore semantic position captured before search exploration,
- preserve document/book context,
- work even after repagination.

---

# 14. Search Navigation

Commands:

```text
search.nextResult
search.previousResult
search.nextResultGroup
search.previousResultGroup
```

Navigation should not require mouse use.

---

# 15. Search Result Context

Each result should provide enough context to distinguish it from similar matches.

Example:

```text
Memory Management > Virtual Memory

"...virtual memory allows a process to..."
```

rather than:

```text
"...memory allows..."
```

---

# 16. Context Window

Search excerpts should include a bounded amount of surrounding text.

Conceptual:

```text
prefix
MATCH
suffix
```

The excerpt should:

- avoid dumping huge paragraphs,
- preserve enough context to understand relevance,
- respect sentence/word boundaries where practical.

---

# 17. Heading Path

Every search result should include semantic heading context when available.

Example:

```text
Installation > Windows > Environment Variables
```

This is especially valuable for:

- long technical documents,
- screen readers,
- repeated terms.

---

# 18. Search by Current Section

Scope:

```text
search.scopeCurrentSection
```

Only records inside the active semantic section are searched.

This supports user goals like:

```text
Find "allocation" only in this chapter.
```

---

# 19. Search Headings Only

Scope:

```text
headings
```

Useful for:

- finding section titles,
- navigating documentation,
- locating chapters.

---

# 20. Search Links Only

Scope:

```text
links
```

Possible searchable fields:

- link label,
- link destination.

UI should distinguish which field matched.

---

# 21. Search Code Only

Scope:

```text
code
```

Useful for:

- APIs,
- variable names,
- function names,
- technical README files.

Search result should identify:

```text
code block
language if known
section context
```

---

# 22. Search Tables

Optional structural scope:

```text
tables
```

Results should identify:

```text
table
row/column
header context
```

where semantic table data is available.

---

# 23. Search Images

Potential search fields:

- alt text,
- title,
- filename/path.

Search UI should distinguish:

```text
match in alt text
```

from:

```text
match in file path
```

---

# 24. Search Across a Book / Collection

Collection search should operate over all indexed Markdown files in the active collection.

Conceptual output:

```text
Query: thread

Chapter 2 — Concurrency
  Race Conditions
    4 results

Chapter 5 — Synchronization
  Threads and Locks
    7 results
```

---

# 25. Collection Result Context

Cross-file results should expose:

```text
file/chapter
heading path
node type
excerpt
```

A screen-reader user should not need to activate the result merely to learn which chapter it belongs to.

---

# 26. Cross-File Navigation

Activating a cross-file result should:

1. preserve search origin,
2. open target file internally,
3. resolve result semantic node,
4. navigate to result,
5. update current collection context.

---

# 27. Search and Navigation History

Search-result activation may create meaningful history entries.

However, cycling through every next match should not flood Back history unnecessarily.

Possible policy:

```text
search session has its own result history
global navigation gets meaningful committed jumps
```

Exact behavior should remain predictable.

---

# 28. Committed vs Preview Search Navigation

Potential model:

```text
preview result
```

temporarily shows a result while search panel remains active.

```text
open result
```

commits navigation.

This may reduce history pollution.

Whether both modes are needed should be user-tested.

---

# 29. Result Group Ordering

Default ordering should follow document order.

For collection search:

```text
collection chapter order
then source order
```

Optional future ranking may exist but must not destroy predictable document-order navigation.

---

# 30. Relevance Ranking

For ordinary literal search, source order is usually preferable.

Potential semantic ranking should be conservative.

Possible weights:

```text
heading match > paragraph match
exact phrase > partial token
current section > distant section
```

If relevance ranking exists, users should be able to switch to document order.

---

# 31. Search Highlighting

Visual highlights must:

- be clearly visible,
- not rely on color alone where state matters,
- remain distinguishable in dark/high-contrast themes,
- not alter source content.

Current result should be distinguishable from other matches.

---

# 32. Screen Reader Search Results

Search results should expose:

- result position,
- group/section,
- excerpt,
- file/chapter,
- node type where useful.

Example:

```text
Result 3 of 11.
Virtual Memory.
Paragraph.
"...page table maps virtual addresses..."
```

Verbosity should be configurable.

---

# 33. Result Count Announcements

When query changes:

```text
11 results
```

may be announced.

Avoid:

- announcement on every single keystroke if search is still rapidly changing,
- excessive live-region chatter.

Use debouncing.

---

# 34. No Results

Accessible feedback:

```text
No results for "foobar".
```

Should not steal focus unnecessarily.

---

# 35. Search Group Accessibility

Grouped result UI must expose:

- group heading/name,
- result count,
- expanded/collapsed state.

Example:

```text
Virtual Memory, 4 results, expanded.
```

---

# 36. Keyboard Result Navigation

Users should be able to:

- move through groups,
- enter group,
- move through results,
- activate result,
- return to search input,
- return to reading origin.

No pointer required.

---

# 37. Search Focus Contract

Opening search:

```text
focus -> query input
```

Navigating result list:

```text
focus -> result item
```

Activating result:

Depending on mode:

- focus may remain search panel while previewing,
- or move to reader/editor target when committed.

Behavior must be consistent and documented.

---

# 38. Search Panel Persistence

The panel may remain open while the user inspects results.

It should not cover focused content entirely.

High zoom must not make the search UI unusable.

---

# 39. Search Current Result State

Conceptual:

```ts
interface SearchState {
  sessionId: string;

  query: string;
  scope: SearchScope;

  results: SearchResult[];
  groups: SearchResultGroup[];

  currentResultId?: string;
  currentGroupId?: string;

  origin: SemanticPosition;
}
```

---

# 40. Search Scope Model

Conceptual:

```ts
type SearchScope =
  | { kind: "document" }
  | { kind: "section"; sectionId: string }
  | { kind: "headings" }
  | { kind: "links" }
  | { kind: "code" }
  | { kind: "tables" }
  | { kind: "collection"; collectionId: string };
```

---

# 41. Query Options

Conceptual:

```ts
interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  regex?: boolean;
}
```

---

# 42. Case Sensitivity

Default may be case-insensitive.

Users should be able to enable case-sensitive matching.

---

# 43. Whole Word Search

Should respect Unicode-aware word boundaries where practical.

Avoid naïve ASCII-only assumptions.

---

# 44. Unicode Search

Search should support:

- Unicode text,
- accented characters,
- non-Latin scripts,
- emoji.

Normalization behavior should be deliberate.

Potential normalization:

```text
NFC
```

Avoid changing semantic distinctions unexpectedly.

---

# 45. Diacritic Matching

Possible user option:

```text
accent-sensitive
accent-insensitive
```

This is optional and should be researched before implementation.

---

# 46. Regex Search

If regex is supported:

- make it explicitly opt-in,
- detect invalid expressions,
- avoid catastrophic backtracking,
- use time/resource limits where practical.

Regex should not be necessary for normal search.

---

# 47. Fuzzy Search

Fuzzy search is optional.

If implemented, distinguish clearly from literal search.

Potential use:

```text
heading lookup
command-like search
```

Do not silently fuzzy-match ordinary Ctrl/Cmd+F queries.

---

# 48. Search-as-You-Type

Search may update as the user types.

Requirements:

- debounce expensive searches,
- maintain typing responsiveness,
- avoid announcement spam,
- cancel stale queries.

---

# 49. Search Cancellation

If a new query begins while an old large collection search is running:

```text
cancel/ignore stale query
```

Do not let older results replace newer query state.

---

# 50. Large Document Performance

Search should remain responsive on documents with:

- thousands of lines,
- thousands of semantic nodes,
- large code blocks,
- large tables.

The search index should avoid repeated full DOM traversal.

---

# 51. Search Index Construction

Possible approach:

```text
parse document
   |
semantic nodes
   |
build normalized SearchRecord[]
```

Index can be updated incrementally after edits.

---

# 52. Incremental Indexing

If paragraph changes:

```text
remove old record
add updated record
```

Unrelated document records should remain unchanged.

---

# 53. Collection Indexing

A book/collection may maintain:

```text
collection search index
```

derived from member document indexes.

Index should invalidate when:

- source file changes,
- document added/removed,
- heading structure changes.

---

# 54. Persisted Search Index

The index does not necessarily need persistence.

Reasons to recompute:

- avoid stale content,
- avoid storing sensitive document text.

If persistence is later used, privacy implications must be considered.

---

# 55. Search Result Identity

Result IDs should derive from:

```text
documentId
nodeId
match range
query/session
```

They should not depend on current page number.

---

# 56. Results After Reflow

Changing font or pagination should not invalidate results.

Search results point to semantic nodes, not pages.

---

# 57. Results After Edit

If source changes while search panel is open:

- update or invalidate affected results,
- preserve query,
- preserve current result where possible.

If a current match disappears, choose nearest remaining result predictably.

---

# 58. Results After External File Change

Cross-file/collection search should reindex changed files.

Do not show stale results indefinitely.

---

# 59. Search Result Activation

Activation flow:

```text
result
 |
resolve SemanticPosition
 |
navigation manager
 |
render/view target
```

Search should not directly manipulate DOM scroll position without semantic resolution.

---

# 60. Search in Raw Editor

Editor search may highlight raw Markdown source.

The application should distinguish:

```text
reader semantic search
```

from:

```text
editor source search
```

because source may include Markdown syntax not visible in rendered output.

---

# 61. Reader Search vs Source Search

Example:

Source:

```md
**memory**
```

Rendered search for:

```text
memory
```

should match visible text.

Source search may additionally find:

```text
**
```

These are different user intents.

---

# 62. Search Mode Indicator

UI should clearly indicate whether searching:

```text
Rendered Document
Markdown Source
Collection
```

Avoid ambiguous results.

---

# 63. Search and Replace

Replace is editor-only.

Commands:

```text
search.replaceCurrent
search.replaceNext
search.replaceAll
```

---

# 64. Replace Scope

Replace should support:

- whole source document,
- current section,
- selected source range.

Replacing across an entire collection should be considered high-risk and require strong confirmation if ever supported.

---

# 65. Replace Preview

Large replace operation should ideally show:

```text
37 replacements
```

before applying.

For structural/sensitive changes, preview may show affected sections.

---

# 66. Replace Undo

Replace All should be one coherent undo operation where practical.

---

# 67. Replace Accessibility

Screen-reader users should receive concise outcome:

```text
37 replacements made.
```

Do not announce every individual replacement.

---

# 68. Search History

Potential optional feature:

```text
recent search queries
```

Privacy considerations:

- search terms may be sensitive,
- keep local,
- allow clearing,
- optional persistence.

---

# 69. Search Suggestions

Not required.

If implemented:

- should not leak document content remotely,
- should not distract from direct text search.

---

# 70. Section Summary Integration

Search results may display section summary on demand.

Example:

```text
Virtual Memory
3 matches
Section has 12 paragraphs, 1 table, 2 code blocks.
```

This can help a blind reader decide whether to enter the section.

---

# 71. Result Preview

A user may preview a result without committing navigation.

Preview could expose:

- heading path,
- excerpt,
- node type,
- nearby structural summary.

Must not destroy search origin.

---

# 72. Current Section Priority

Optional preference:

```text
show matches in current section first
```

Default should probably preserve document order unless user chooses relevance.

---

# 73. Search Within Selection

Editor-only optional scope:

```text
current source selection
```

Useful for replace operations.

---

# 74. Search Across Open Documents

Optional scope:

```text
open documents
```

Distinct from collection search.

---

# 75. Search Collection Boundaries

Collection search should only search:

- explicit collection members,
- trusted collection root,
- or files deliberately added.

Do not recursively search arbitrary filesystem directories without user intent.

---

# 76. Search Security

Search must not:

- execute regex unsafely,
- fetch remote content,
- follow links automatically,
- expand arbitrary filesystem paths.

Search indexes text already available through authorized documents.

---

# 77. Search Privacy

Search terms and excerpts should not be transmitted externally.

If future AI semantic search exists:

- make it optional,
- disclose network use,
- require explicit consent,
- preserve local search as core functionality.

---

# 78. Smart Search Without AI

The core "smart" search should not require machine learning.

Semantic intelligence already comes from:

```text
document structure
heading hierarchy
node types
section relationships
collection context
```

This keeps search:

- deterministic,
- fast,
- offline,
- privacy-preserving.

---

# 79. Semantic Query Filters

Future advanced syntax may support filters.

Example:

```text
type:heading memory
type:code malloc
section:"Virtual Memory" page
```

This is optional.

A graphical/accessible scope UI should remain available.

---

# 80. Search Result Formatting

Visual result:

```text
Virtual Memory
Paragraph

"...the operating system maps virtual memory..."
```

Screen-reader equivalent should expose the same information programmatically.

---

# 81. Search Result Collapse

Users may collapse section groups.

Collapse state should be keyboard and screen-reader accessible.

---

# 82. Empty Groups

Do not display semantic groups with zero results.

---

# 83. Match Within Heading

If query matches heading itself:

```text
Heading match
```

should be distinguishable from a paragraph beneath that heading.

---

# 84. Match Within Link

Expose:

```text
Link text match
```

or:

```text
Link destination match
```

when relevant.

---

# 85. Match Within Code

Result excerpt should preserve whitespace enough to remain meaningful.

Potential output:

```text
Code block, JavaScript
function allocateMemory(size) {
```

---

# 86. Match Within Table

Potential output:

```text
Table: Memory Types
Row 4, column "Allocation"
```

where headers are known.

---

# 87. Match Within Image Alt Text

Potential output:

```text
Image alternative text
"Diagram of virtual-memory paging"
```

---

# 88. Search Highlight and Accessibility Tree

Visual `<mark>` or equivalent should not create awkward screen-reader repetition.

Screen-reader behavior should be tested with VoiceOver/NVDA.

---

# 89. Search Landmark

Search panel should have a clear accessible region name.

Example:

```text
Search
```

---

# 90. Status Messages

Status examples:

```text
Searching...
14 results.
No results.
Search cancelled.
```

Use accessible status semantics without stealing focus.

---

# 91. Search Result Limit

Do not arbitrarily truncate without telling the user.

For extremely large match sets:

```text
Showing first 1,000 of 43,000 results
```

if a practical cap is required.

Prefer streaming/virtualized results when possible.

---

# 92. Result Virtualization

Large result lists may be virtualized.

If so:

- screen-reader access must remain usable,
- result counts must remain accurate,
- keyboard navigation must not skip inaccessible items.

---

# 93. Highlight Virtualization

Only visible results may need DOM highlights.

Semantic result list remains authoritative.

---

# 94. Search State Persistence

Potentially persist:

```text
last query per session
last scope
case/whole-word preference
```

Do not require persistence.

Search origin is session/navigation state.

---

# 95. Opening a New Document During Search

If searching current document and user opens another file:

Options:

- close old search session,
- maintain search panel with new document context.

Behavior should be explicit.

Collection search may remain active across chapter navigation.

---

# 96. Search Tab / Pane Context

If multiple tabs exist, each tab may maintain independent document search state.

Collection search can be shared at collection level.

---

# 97. Search Result Announcements

Potential concise default:

```text
Result 4 of 12.
Virtual Memory.
```

On-demand detail:

```text
Paragraph.
"...memory is allocated..."
```

Avoid announcing entire long excerpts automatically.

---

# 98. Search and Built-In Speech

Built-in speech may:

- read current result,
- read excerpt,
- begin reading from activated result.

Speech action should be separate from result navigation.

---

# 99. Book Mode Search

In paginated mode:

1. search finds semantic result,
2. pagination map locates page,
3. page displays,
4. result highlighted,
5. semantic position updated.

Page number is derived.

---

# 100. Continuous Mode Search

Navigate to semantic node and align viewport reasonably.

Avoid unnecessarily placing result at extreme edge of viewport.

---

# 101. Result Alignment

Potential visual alignment:

```text
target around 25-35% from top
```

to provide surrounding context.

In paginated mode, page layout determines placement.

---

# 102. Search Result Return Stack

Search UI should preserve:

```text
query
scope
group expansion
current result
scroll position in result list
focus location
```

when jumping to document and returning.

---

# 103. Search Errors

Potential errors:

- invalid regex,
- collection file unreadable,
- index unavailable,
- file changed during search.

Errors should:

- be understandable,
- not clear query unnecessarily,
- preserve user state.

---

# 104. Search Index Diagnostics

Developer mode may expose:

```text
records indexed
query duration
groups generated
documents searched
index build time
```

No need in user-facing UI.

---

# 105. Search Performance Tests

## SEARCH-PERF-001

4,000-line README, common term.

Expected:

- results appear quickly,
- typing remains responsive.

## SEARCH-PERF-002

10,000-line document, hundreds of matches.

Expected:

- result panel remains usable.

## SEARCH-PERF-003

Multi-file book, 100 chapters.

Expected:

- collection search remains responsive,
- stale query cancellation works.

## SEARCH-PERF-004

Large code-heavy file.

Expected:

- code scope search does not require full DOM traversal.

---

# 106. Accessibility Test Cases

## SEARCH-A11Y-001 — Keyboard-only

1. Open search.
2. Type query.
3. Move through groups/results.
4. Activate result.
5. Return to origin.

Expected:

- no pointer required.

## SEARCH-A11Y-002 — VoiceOver

Expected:

- query input named,
- result count announced,
- group context available,
- result excerpt understandable,
- return command works.

## SEARCH-A11Y-003 — NVDA

Repeat grouped result workflow.

Expected:

- no duplicate live-region chatter,
- focus stays predictable.

## SEARCH-A11Y-004 — Large text

Search panel remains usable at high zoom and spacing.

---

# 107. Functional Test Cases

## SEARCH-T-001 — Basic literal

Search:

```text
memory
```

Expected all matching semantic text nodes.

## SEARCH-T-002 — Case sensitivity

Query:

```text
Memory
```

with case-sensitive enabled.

Expected only exact case.

## SEARCH-T-003 — Whole word

Query:

```text
heap
```

should not match:

```text
heapsort
```

when whole-word enabled.

## SEARCH-T-004 — Heading scope

Only heading nodes searched.

## SEARCH-T-005 — Current section

No results outside active section.

## SEARCH-T-006 — Code scope

Only code records searched.

## SEARCH-T-007 — Grouping

Repeated term in multiple sections groups correctly.

## SEARCH-T-008 — Cross-file

Results identify correct chapters.

## SEARCH-T-009 — Return origin

Original semantic position restored.

## SEARCH-T-010 — Edit invalidation

Edit current match away.

Expected result set updates predictably.

---

# 108. Search Failure Categories

Suggested bug labels:

```text
SEARCH_MISSING_RESULT
SEARCH_FALSE_RESULT
SEARCH_WRONG_GROUP
SEARCH_WRONG_CONTEXT
SEARCH_POSITION_LOST
SEARCH_ORIGIN_LOST
SEARCH_FOCUS_LOST
SEARCH_STALE_INDEX
SEARCH_WRONG_FILE
SEARCH_A11Y_ANNOUNCEMENT
SEARCH_PERFORMANCE
```

---

# 109. Contributor Checklist

Before changing search behavior:

- [ ] Does search operate on semantic nodes?
- [ ] Is heading/section context preserved?
- [ ] Does search capture origin?
- [ ] Can user return to origin?
- [ ] Is keyboard navigation defined?
- [ ] Is screen-reader output defined?
- [ ] Is current result state exposed?
- [ ] Does reflow preserve result identity?
- [ ] Are large documents considered?
- [ ] Is collection boundary respected?
- [ ] Are stale searches cancellable?
- [ ] Does result activation use semantic navigation?
- [ ] Are tests included?

---

# 110. Open Research Questions

1. How much context should each search result expose by default?
2. Should results default to section grouping or flat document order?
3. Should grouping collapse automatically for large result sets?
4. How should code-block excerpts be formatted accessibly?
5. Should search result previews be separate from committed navigation?
6. Should regex search be included at all in the primary application?
7. Should heading matches receive higher relevance than body matches?
8. Should current-section matches appear first?
9. What result-list behavior works best with VoiceOver/NVDA?
10. Should collection search index files lazily or eagerly?
11. What is the right result virtualization approach for screen readers?
12. How should search behave during live editing?
13. Should search history persist across sessions?
14. What semantic filter syntax, if any, would benefit power users?
15. How should table-cell matches expose header context?
16. Should image-alt matches be included in default document search?
17. How should footnotes participate in search?
18. Should hidden front matter be searched by default?
19. Should rendered text and source text have clearly separate search commands?
20. What local-only indexing strategy gives the best speed/privacy balance?

---

# 111. Definition of Done

The Smart Search system should eventually be considered mature when:

- Ctrl/Cmd+F works normally,
- matches are semantic rather than DOM-dependent,
- results can be grouped by heading/section,
- current-section search works,
- heading/link/code scopes work,
- collection search works across linked Markdown files,
- results expose useful context,
- keyboard-only navigation works,
- screen readers receive group/result context,
- search preserves a stable origin,
- Return to Reading Position works,
- result identities survive pagination changes,
- search updates after edits,
- large documents remain responsive,
- search remains local/offline by default.

---

# 112. Core Product Rule

> **Finding text is not enough; the application should help the user understand where that text lives in the document.**
