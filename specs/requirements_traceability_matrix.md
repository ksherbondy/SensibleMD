# Accessible Markdown Reader & Editor
# Requirements Traceability Matrix

**Document type:** Systems engineering / requirements traceability specification  
**Status:** Working specification  
**Purpose:** Trace user needs and product goals into implementable requirements, semantic capabilities, commands, state domains, verification procedures, and source specifications.

---

# 1. Purpose

This document provides traceability across the project.

The intended relationship is:

```text
User Story / User Need
        |
        v
Product Requirement
        |
        v
Semantic Capability
        |
        v
Command / Interaction
        |
        v
Application State / Component Domain
        |
        v
Verification / Test
```

The matrix is intended to make it easier to answer questions such as:

- Which user need does this feature satisfy?
- Which specification defines the feature?
- What semantic capability is required?
- Which command invokes it?
- Which state domains does it affect?
- How will we verify it?
- If a requirement changes, what else must be reviewed?
- If a test fails, which product requirements are at risk?

This document is not a version roadmap.

It describes traceability for the intended end-state product.

---

# 2. Traceability Identifier Scheme

The project should use stable identifiers.

Recommended categories:

```text
USR-*   User story / user need
PRD-*   Product requirement
ACC-*   Accessibility requirement
SEM-*   Semantic-model capability
NAV-*   Navigation / position requirement
CMD-*   Command requirement
SRCH-*  Search requirement
PAGE-*  Pagination / book-mode requirement
AUTH-*  Accessible-authoring requirement
SEC-*   Security requirement
STATE-* Application-state requirement
HCI-*   Interaction-design requirement
TEST-*  Verification requirement
```

Existing rule/test IDs defined in other specifications should remain stable.

Examples already in use include:

```text
IMG-003
HEAD-001
PAGE-004
POS-T-006
SEARCH-A11Y-002
SEC-IPC-003
```

---

# 3. Traceability Status

Each matrix row may eventually have an implementation status:

```text
Specified
Designed
Implemented
Verified
Blocked
Deprecated
```

This document currently focuses on specification traceability, not implementation status.

---

# 4. Core User-Need Traceability Matrix

| ID | User need / story | Product requirement | Core semantic capability | Commands / interaction | State / subsystem | Verification | Primary specs |
|---|---|---|---|---|---|---|---|
| USR-READ-001 | As a reader, I only want to see the rendered version. | Opening Markdown defaults to rendered reading rather than raw source, subject to explicit user preference. | Document semantic model → rendered reader projection. | `editor.enterRenderedMode`, reader-mode controls. | Document, Reader, UI state. | READ-001, READ-002. | Product Spec; Semantic Model; State Model |
| USR-READ-002 | As a reader, I want to easily copy text without entering edit mode. | Rendered reading mode supports text selection and semantic copy operations. | Paragraph/sentence/section/code-block identity and readable-text projection. | `reader.copyCurrentSentence`, `reader.copyCurrentParagraph`, `reader.copyCurrentSection`, `reader.copyCurrentCodeBlock`. | Reader selection, clipboard boundary. | READ-003, VO-READ-008, CODE-COPY-001, KEY-E2E-001. | Product Spec; Commands; HCI |
| USR-POS-001 | As a blind reader, I want to resume at the paragraph where I stopped. | Persist semantic reading position and restore it on reopen. | `SemanticPosition`, node identity, heading path, text anchor, resolver. | `history.returnToReadingPosition`, reopen behavior. | Reader state, Navigation state, Persistence. | POS-001, POS-T-001, POS-A11Y-001. | Semantic Model; Position State; State Model |
| USR-POS-002 | As a reader, I want to pick up where I left off after closing a file. | Last stable reading position persists across app/file close. | Stable semantic anchor independent of presentation. | Open/reopen flow. | Persisted document state. | POS-001, POS-T-012. | Position State; State Model |
| USR-LV-001 | As a low-vision reader, I want to enlarge text and change spacing without breaking pagination. | Reader typography is customizable and repagination preserves semantic position. | Layout-independent semantic position + page-fragment mapping. | `view.increaseTextSize`, spacing controls, reading-mode controls. | Reader preferences, Pagination state. | POS-002, BOOK-004, LV-001–LV-005, PAGE-A11Y-003. | Pagination; Position State; Accessibility Matrix |
| USR-KEY-001 | As a keyboard-only user, I want to navigate headings, paragraphs, links, search results, and pages without a mouse. | All core navigation has keyboard-accessible semantic commands. | Semantic traversal by node type and search-result identity. | `reader.nextHeading`, `reader.nextParagraph`, `reader.nextLink`, `search.nextResult`, `book.nextPage`, etc. | Command registry, Reader/Search/Book state. | KEY-E2E-001, SEARCH-A11Y-001, BOOK-001. | Commands; Accessibility Matrix; Manual Tests |
| USR-SRCH-001 | As a developer reading a 4,000-line README, I want search results grouped by section. | Search results preserve heading/section context and may be grouped semantically. | Search records reference section and heading path. | `search.open`, `search.nextResultGroup`, structural scope commands. | Search index/state, Semantic model. | SEARCH-002, SEARCH-T-007, SEARCH-PERF-001. | Smart Search; Semantic Model |
| USR-EDIT-SR-001 | As a screen-reader user editing Markdown, I want my current document structure announced. | Editor caret resolves to semantic context that can be queried nonvisually. | Source range ↔ semantic-node mapping, heading path, node type. | `accessibility.showCurrentContext`, `reader.describeCurrentPosition` or editor equivalent. | Editor state, Semantic model, announcement service. | EDIT-SR-005, EDIT-SR-006. | Semantic Model; Commands; Accessibility Matrix |
| USR-AUTH-001 | As an author, I want warnings when I create inaccessible document structures. | Rule engine analyzes semantic/rendered structures and produces actionable findings. | Accessibility finding model linked to semantic nodes/source ranges. | `diagnostics.openAccessibilityPanel`, `diagnostics.nextFinding`, source-jump interactions. | Diagnostics state, Rule engine. | A11Y-FIND-001–005. | Authoring Rules; Accessibility Matrix; State Model |
| USR-BOOK-001 | As someone reading a Markdown book, I want linked `.md` files to behave like chapters without proprietary conversion. | Ordinary local Markdown links support internal cross-file navigation and collection context. | `DocumentCollection`, resolved local Markdown links, collection positions. | `book.nextChapter`, `book.previousChapter`, link activation, `history.back`. | Collection state, Navigation state. | BOOK-XF-001–004, PAGE-007. | Product Spec; Semantic Model; Pagination; Position State |
| USR-OVR-001 | As a blind reader, I want a section breakdown before entering a new section. | Section summaries expose structural information without moving the reader. | Section tree + computed `SectionSummary`. | `reader.describeUpcomingSection`, `reader.describeCurrentSection`, `accessibility.showSectionSummary`. | Semantic model, Reader context. | VO-READ-004, COG-003. | Semantic Model; Commands; HCI |
| USR-BOOK-002 | As a reader, I want a Mac Books-like Markdown reading experience. | Support continuous, single-page, and responsive two-page book layouts while preserving semantics. | Page map derived from semantic nodes; presentation independent of identity. | `book.useSinglePageMode`, `book.useSpreadMode`, page-turn commands. | Pagination state, Reader state. | BOOK-001–007, PAGE-001–008. | Pagination; HCI |
| USR-STRUCT-001 | As an author/developer, I want simple commands to select/move/copy/delete document structures. | Structural editing operates on semantic units rather than manual line surgery. | `StructuralSelection`, section/list/code source ranges. | `selection.currentParagraph`, `structure.moveSectionDown`, `structure.deleteListItem`, etc. | Editor, Semantic model, Command registry, Undo state. | STRUCT-001–005, KEY-E2E-002. | Semantic Model; Commands; HCI |
| USR-SR-001 | As a screen-reader reader, I want efficient access to headings, links, tables, images, code, sections, and current location. | Rendered output exposes native semantics and app-native structural commands supplement AT navigation. | Accessible semantic projection + reader context. | Reader structural commands and current-context commands. | Reader, Semantic model, accessibility tree. | VO/NVDA/Narrator/Orca reader suites. | Accessibility Matrix; Semantic Model; Manual Tests |
| USR-COPY-001 | As a technical reader, I want to copy a whole code block even when it spans pages. | Semantic copy operates on complete code-node identity independent of page fragments. | `CodeBlockNode` + page fragments referencing same node. | `reader.copyCurrentCodeBlock`. | Reader selection, Pagination. | BOOK-006, CODE-COPY-001. | Semantic Model; Pagination; Commands |

---

# 5. Product Requirement Traceability

## PRD-001 — Filesystem-first Markdown

**Requirement**

The application shall open and edit ordinary Markdown files directly without mandatory import into a proprietary database or format.

**Derived capabilities**

```text
DocumentIdentity
source fidelity
local-file navigation
safe file open/save
collection roots
```

**Security dependencies**

```text
SEC file-read boundary
SEC path normalization
SEC safe save
```

**Verification**

- Open standalone `.md`.
- Save and reopen with another Markdown tool.
- Verify no proprietary metadata was injected without explicit user action.

**Source specifications**

- Product Specification
- Threat Model
- Semantic Document Model

---

## PRD-002 — Reader-first default

**Requirement**

The application shall support a rendered reader as a first-class/default consumption experience.

**Capabilities**

```text
semantic render projection
reader state
semantic reading cursor
reader copy/search/navigation
```

**Tests**

```text
READ-001
READ-002
READ-003
```

---

## PRD-003 — Reader interactivity without editing

**Requirement**

Users shall be able to search, navigate, follow links, bookmark, select, and copy in rendered mode without entering editing mode.

**Commands**

```text
search.*
reader.next*
reader.copy*
bookmark.*
history.*
```

**Tests**

```text
READ-003
KEY-E2E-001
VO-READ-008
```

---

## PRD-004 — Multiple reading presentations

**Requirement**

The reader shall support continuous, single-page, and two-page/spread presentations.

**Dependencies**

```text
SemanticPosition
PageLayoutMap
ReaderState.readingMode
```

**Tests**

```text
BOOK-001
BOOK-002
BOOK-003
PAGE-001
PAGE-002
```

---

## PRD-005 — Semantic position persistence

**Requirement**

Reading location shall persist semantically across close/reopen and presentation changes.

**Dependencies**

```text
NodeIdentity
NodeFingerprint
HeadingPath
TextAnchor
PositionResolver
PersistedDocumentState
```

**Tests**

```text
POS-001
POS-002
POS-T-001
POS-T-002
POS-T-010
```

---

## PRD-006 — Semantic navigation

**Requirement**

Users shall be able to navigate document structures such as headings, paragraphs, sections, links, tables, images, and code blocks.

**Commands**

```text
reader.nextHeading
reader.previousHeading
reader.nextParagraph
reader.previousParagraph
reader.nextLink
reader.nextImage
reader.nextTable
reader.nextCodeBlock
```

**Verification**

Screen-reader suites and keyboard end-to-end tests.

---

## PRD-007 — Structural authoring

**Requirement**

The editor shall support semantic selection and structural transformations.

**Dependencies**

```text
SourceRange
StructuralSelection
SectionTree
node reconciliation
undo/redo integration
```

**Tests**

```text
STRUCT-001
STRUCT-002
STRUCT-003
STRUCT-004
STRUCT-005
```

---

## PRD-008 — Accessible authoring assistance

**Requirement**

The editor shall identify supported accessibility problems, distinguish high-confidence failures from heuristics, and provide explanations/remediation.

**Dependencies**

```text
AccessibilityRule
AccessibilityFinding
SemanticNode
SourceRange
rendered-DOM analysis
```

**Tests**

```text
A11Y-FIND-001–005
IMG-AUTH-001
rule fixtures
```

---

## PRD-009 — Multi-file Markdown books

**Requirement**

Linked Markdown files shall support chapter-like navigation without converting source.

**Dependencies**

```text
DocumentCollection
CrossFileLinkGraph
CollectionPosition
cross-document history
```

**Tests**

```text
BOOK-XF-001–004
PAGE-007
```

---

## PRD-010 — Offline-first / privacy-preserving core

**Requirement**

Core reading, editing, searching, navigation, and accessibility functionality shall operate locally without a required account or cloud service.

**Dependencies**

```text
local search index
local persistence
remote-content policy
```

**Security tests**

```text
SEC-T-007
remote-resource fixtures
```

---

# 6. Semantic Capability Traceability

| Semantic capability | Enables | Related commands/features | Verification |
|---|---|---|---|
| `DocumentIdentity` | persistence, bookmarks, linked books | open/reopen, collection navigation | POS-T-001, BOOK-XF-* |
| `SourceRange` | editor sync, diagnostics, structural edits | jump to finding, move section | EDIT-SR-005, STRUCT-* |
| `NodeId` / stable identity | bookmarks, position, result identity | all semantic navigation | POS-T-* |
| `NodeFingerprint` | recovery after edits | reopen/bookmark resolution | POS-T-005–009 |
| `HeadingPath` | section context, search grouping, orientation | describe position, grouped search | SEARCH-T-007, VO-READ-004 |
| `SectionTree` | outline, section summary, move section | outline navigation, structural edit | STRUCT-003, SEARCH-002 |
| `SentenceBoundary` | next/repeat sentence | `reader.nextSentence`, repeat sentence | VO-READ-005 |
| `LinkNode` + target resolution | internal/cross-file navigation | open link, history back | BOOK-XF-* |
| `TableNode` | table navigation/accessibility analysis | describe/navigate table | TABLE-SR-* |
| `CodeBlockNode` | code navigation/copy/pagination | copy code block | BOOK-006, CODE-COPY-001 |
| `SectionSummary` | nonvisual overview | describe current/upcoming section | VO-READ-004, COG-003 |
| `SemanticPosition` | resume, history, search return, pagination | history/search/book commands | POS-* |
| `SearchRecord` | grouped/scoped search | `search.*` | SEARCH-* |
| `PageFragment` | book layout without identity loss | page turns, copy whole block | PAGE-* |
| `AccessibilityFinding` | authoring diagnostics | diagnostics commands | A11Y-FIND-* |

---

# 7. Command-to-Requirement Traceability

| Command | Primary requirement | Semantic target/state | Expected position behavior | Primary verification |
|---|---|---|---|---|
| `reader.nextHeading` | PRD-006 | next HeadingNode | moves semantic reader cursor | VO/NVDA heading navigation |
| `reader.nextParagraph` | PRD-006 | next ParagraphNode | moves semantic cursor | KEY-E2E-001 |
| `reader.repeatCurrentSentence` | nonvisual reading efficiency | SentenceBoundary | no movement | VO-READ-005 |
| `reader.describeCurrentSection` | orientation / overview | SectionSummary | no movement | VO-READ-004 |
| `reader.copyCurrentParagraph` | PRD-003 | ParagraphNode | no movement | VO-READ-008 |
| `reader.copyCurrentCodeBlock` | PRD-003 | CodeBlockNode | no movement | CODE-COPY-001 |
| `book.nextPage` | PRD-004 | PageLayoutMap | updates active semantic context | BOOK-001 |
| `book.useSpreadMode` | PRD-004 | reader presentation | preserve semantic position | BOOK-002/003 |
| `search.open` | smart search | SearchSession | capture origin, focus input | SEARCH-001 |
| `search.nextResult` | smart search | SearchResult | temporary/committed semantic jump | SEARCH-003 |
| `search.returnToOrigin` | PRD-005 / recoverability | saved search origin | restore semantic position | SEARCH-006 |
| `history.back` | navigation recoverability | NavigationHistory | restore prior semantic entry | POS-006 |
| `selection.currentSection` | PRD-007 | Section source range | selection only | STRUCT-002 |
| `structure.moveSectionDown` | PRD-007 | SectionNode/source range | remain in moved section | STRUCT-003 |
| `structure.promoteHeading` | PRD-007 | HeadingNode/section | preserve editor context | STRUCT-004 |
| `diagnostics.openAccessibilityPanel` | PRD-008 | findings set | reading/editor position preserved | A11Y-FIND-001 |
| `diagnostics.nextFinding` | PRD-008 | next finding | panel/source context predictable | A11Y-FIND-001/002 |
| `view.increaseTextSize` | low-vision support | presentation preferences | semantic position unchanged | LV-001, POS-002 |

---

# 8. Accessibility Requirement Traceability

The dedicated Accessibility Requirements and Verification Matrix remains authoritative for detailed `ACC-*` requirements. This traceability document connects those requirements to product subsystems.

| Accessibility area | Product capability | Implementation dependency | Verification family |
|---|---|---|---|
| Semantics | Render correct heading/list/link/table/code structure | Semantic model + native HTML projection | VO/NVDA/Narrator/Orca reader tests |
| Keyboard | Core workflows pointer-independent | Command registry + focus management | KEY-E2E-* |
| Focus | Predictable focus and restoration | UI state + focus contract per command | UI-A11Y-* |
| Orientation | Current position and section summary | SemanticPosition + SectionSummary | VO-READ-004/007 |
| Low vision | Reflow, spacing, contrast, large text | Reader preferences + pagination | LV-* |
| Reduced motion | Functional navigation without animation | presentation preferences | RM-* / BOOK-005 |
| Search accessibility | grouped context, keyboard operation, origin recovery | Smart Search + Navigation state | SEARCH-A11Y-* |
| Structural editing | non-pointer semantic transformations | Semantic model + command system | STRUCT-* |
| Accessible authoring | actionable diagnostics | Rule engine + findings UI | A11Y-FIND-* |
| Book accessibility | logical order despite visual spreads | Page map + semantic DOM order | PAGE-A11Y-* |

---

# 9. Accessible Authoring Rule Traceability

| Rule family | Semantic/rendered dependency | User value | Verification |
|---|---|---|---|
| `IMG-*` | ImageNode / rendered image semantics | useful text alternatives | image fixtures, IMG-AUTH-001 |
| `HEAD-*` | heading hierarchy / SectionTree | navigable document structure | rule fixtures + screen-reader heading tests |
| `LINK-*` | LinkNode + resolved target | meaningful and functioning links | rule fixtures + BOOK-XF-* |
| `TABLE-*` | TableNode + rendered table semantics | understandable cell relationships | TABLE-SR-* |
| `LIST-*` | ListNode hierarchy | meaningful list structure | rule fixtures |
| `READ-*` | paragraph/section statistics | cognitive/readability advisories | rule fixtures |
| `CODE-*` | CodeBlockNode | usable technical content | CODE-SR-* |
| `STYLE-*` | computed/rendered CSS | contrast/focus integrity | CSS-A11Y-* |
| `HTML-*` | sanitized/rendered HTML semantics | prevent inaccessible custom HTML | security + authoring fixtures |
| `BOOK-*` | resolved cross-file links | usable document collections | BOOK-XF-* |

---

# 10. Pagination Requirement Traceability

| Requirement | Semantic dependency | State dependency | Verification |
|---|---|---|---|
| Continuous mode | ordered semantic blocks | ReaderState | READ-* |
| Single-page mode | PageLayoutMap | PaginationState | BOOK-001 |
| Spread mode | ordered pages + logical semantic order | PaginationState | BOOK-002 |
| Responsive switch | semantic anchor + layout signature | Reader/Preferences/Pagination | BOOK-003 |
| Font-change repagination | SemanticPosition | Preferences + Pagination | BOOK-004, POS-002 |
| Heading widow/orphan handling | HeadingNode + following block | Page layout | pagination fixture tests |
| Long code split | CodeBlockNode + PageFragments | Page layout | BOOK-006 |
| Wide table handling | TableNode | Pagination/Local scroll | BOOK-007 |
| Cross-file chapter page navigation | CollectionPosition | Collection + Navigation | PAGE-007 |

---

# 11. Search Requirement Traceability

| Search requirement | Semantic dependency | Command/state | Verification |
|---|---|---|---|
| Basic literal find | SearchRecord.text | SearchState | SEARCH-T-001 |
| Case sensitivity | query options | SearchState.options | SEARCH-T-002 |
| Whole word | Unicode-aware matcher | SearchState.options | SEARCH-T-003 |
| Heading-only search | node type | scope `headings` | SEARCH-T-004 |
| Current section | SectionTree | section scope | SEARCH-T-005 |
| Code search | CodeBlockNode | code scope | SEARCH-T-006 |
| Group by section | HeadingPath/SectionId | result groups | SEARCH-T-007 |
| Cross-file search | DocumentCollection | collection search state | SEARCH-T-008 |
| Return to origin | SemanticPosition | SearchSession.origin | SEARCH-T-009 |
| Edit invalidation | model/source versions | index versioning | SEARCH-T-010 |
| AT grouped results | structured result UI | focus/status contract | SEARCH-A11Y-* |
| Long-document responsiveness | semantic index | worker/cancellation strategy | SEARCH-PERF-* |

---

# 12. Reading Position Traceability

| Position behavior | Required anchor data | State | Verification |
|---|---|---|---|
| Reopen same paragraph | node ID/fingerprint/heading/text anchor | persisted stable position | POS-T-001 |
| Reflow preservation | semantic position | Reader/Pagination | POS-T-002 |
| Search return | search origin | Navigation/Search | POS-T-003 |
| Link Back | navigation history | Navigation | POS-T-004 |
| Insert content before target | fingerprint/text anchor | Position resolver | POS-T-005 |
| Modify target | fuzzy reconciliation | Position resolver | POS-T-006 |
| Delete target | sibling/section fallback | Position resolver | POS-T-007 |
| Rename heading | alternate anchor mechanisms | Position resolver | POS-T-008 |
| Duplicate heading | ancestry + occurrence/sibling context | Semantic model | POS-T-009 |
| Repagination | semantic position → page map | Pagination | POS-T-010 |
| Reader/editor switch | source↔semantic mapping | Reader/Editor | POS-T-011 |
| Crash restart | persisted stable position | Persistence | POS-T-012 |

---

# 13. Security Traceability

| Security requirement | Product feature affected | Verification |
|---|---|---|
| `nodeIntegration: false` / no renderer Node privileges | all rendered Markdown | SEC-T-008 |
| Narrow preload API | file/save/external link | SEC-T-009, SEC-T-010 |
| IPC argument validation | all privileged renderer requests | unit/integration IPC tests |
| HTML sanitization | raw HTML Markdown | SEC-T-001, 003, 013 |
| Unsafe scheme blocking | links | SEC-T-002, 006 |
| Local path boundary | images/local linked assets | SEC-T-004, 005 |
| Remote content policy | remote images/CSS | SEC-T-007, 014 |
| Document CSS isolation | custom CSS/theme | CSS-A11Y-002, SEC threat fixtures |
| Conflict-safe save | editing | SEC-T-015, EXT-002 |
| Resource limits | huge/pathological Markdown | SEC-T-012, PERF-A11Y-* |

---

# 14. Application-State Traceability

| State domain | Authority | Derived consumers | Persist? |
|---|---|---|---|
| Markdown source | SourceState/editor buffer | parser, preview, search, diagnostics | file itself |
| Semantic model | derived from source | reader, search, outline, accessibility, pagination | normally no |
| Reader current position | ReaderState | view, current context | session |
| Stable reading position | Navigation/Reader state | resume | yes |
| Editor caret/selection | editor engine | semantic editor context | optionally last position |
| Search results | derived index/query | search UI/navigation | no |
| Pagination page map | derived layout | book reader | no |
| Bookmarks | user data | navigation | yes |
| Navigation history | session navigation | Back/Forward | optional |
| Accessibility findings | derived analysis | diagnostics UI | no |
| Finding suppressions | user decision | rule engine | yes |
| User/accessibility preferences | settings | reader/UI/commands | yes |
| Window/UI panel state | UI session | layout | selective |

---

# 15. HCI Principle Traceability

| HCI principle | Concrete requirement examples | Verification |
|---|---|---|
| Never unexpectedly move the user | resize/font/theme/panel changes preserve semantic position | POS-002/003, COG-004 |
| Semantic over pixel | bookmarks/history/search use semantic anchors | POS-* |
| Overview before traversal | section/document summaries | VO-READ-004, COG-003 |
| Equal capability, different paths | pointer, keyboard, menu, voice use same command | KEY-E2E-*, command tests |
| Recognition over recall | command palette/menus expose capabilities | command-palette accessibility tests |
| Reader/editor separation | copy/search/navigation available in reader | READ-003 |
| Predictable focus | dialogs/panels restore focus | UI-A11Y-* |
| Reversible navigation | Back and Return to Reading Position | POS-006, SEARCH-006 |
| Reversible editing | structural edits integrate undo | STRUCT-* |
| Graceful degradation | pagination failure falls back to continuous | pagination fallback tests |

---

# 16. Verification Layers

Each requirement should be verified at the lowest practical layer and again at the user-workflow layer where necessary.

## 16.1 Unit Verification

Examples:

```text
heading hierarchy construction
node fingerprinting
position resolution
search grouping
rule evaluation
command enabled state
path validation
```

## 16.2 Integration Verification

Examples:

```text
source edit -> semantic reconcile -> preview
search result -> navigation manager -> reader position
font change -> pagination -> semantic anchor restore
command -> source transformation -> undo
```

## 16.3 End-to-End Verification

Examples:

```text
open -> read -> search -> return -> close -> reopen
open -> edit -> accessibility finding -> fix -> save
book chapter -> link -> back -> bookmark
```

## 16.4 Assistive Technology Verification

Examples:

```text
VoiceOver
NVDA
Narrator
Orca
JAWS when available
```

---

# 17. Requirement Change Impact Rules

When changing a requirement, review all traced artifacts.

Examples:

## Change to semantic node identity

Review:

```text
reading positions
bookmarks
search result IDs
navigation history
finding suppressions
structural selection
```

## Change to pagination strategy

Review:

```text
reading-position restoration
screen-reader order
code/table fragmentation
book tests
performance budget
```

## Change to command IDs

Review:

```text
keyboard mappings
menus
voice aliases
tests
documentation
future plugin compatibility
```

## Change to search grouping

Review:

```text
screen-reader result presentation
current-section scope
navigation origin
collection search
```

---

# 18. Requirement-to-Test Minimum Rule

No critical end-state requirement should be considered fully specified until it has at least one identified verification path.

Preferred:

```text
Requirement
-> unit/integration test
-> manual workflow where human interaction matters
```

Accessibility requirements usually need both automated and manual verification.

---

# 19. Untraceable Requirement Rule

If a requirement cannot answer:

```text
Which user need does this serve?
How will we verify it?
```

it should be reviewed before becoming a core product requirement.

This does not mean every low-level implementation detail needs its own user story.

It means core product behavior should have an explainable purpose and test path.

---

# 20. Orphan Test Rule

A test with no mapped requirement may still be valuable, especially regression/security tests.

However, unexplained test suites should be reviewed so contributors understand what invariant they protect.

---

# 21. Traceability for Contributor Pull Requests

A significant feature PR should eventually identify:

```text
User story / requirement IDs
Commands added/changed
State domains affected
Tests added/changed
Accessibility verification
Security considerations
```

Example:

```text
Implements:
USR-POS-001
PRD-005

Touches:
SemanticPosition
PositionResolver
ReaderState

Tests:
POS-T-001
POS-A11Y-001
```

---

# 22. Example End-to-End Trace

## Blind reader resume position

```text
USR-POS-001
"As a blind reader, I want to resume at the paragraph where I stopped."
        |
        v
PRD-005
Persist semantic reading position.
        |
        v
SEM
DocumentIdentity
SemanticPosition
NodeFingerprint
HeadingPath
TextAnchor
        |
        v
NAV
PositionResolver
StableReadingPosition
        |
        v
STATE
PersistedDocumentState
ReaderState
NavigationState
        |
        v
INTERACTION
Open document / reopen
reader.describeCurrentPosition
        |
        v
TEST
POS-001
POS-T-001
POS-A11Y-001
```

---

# 23. Example End-to-End Trace

## Search grouped by section

```text
USR-SRCH-001
        |
        v
Smart Search requirement
        |
        v
SearchRecord
SectionId
HeadingPath
        |
        v
search.open
search.nextResultGroup
search.nextResult
        |
        v
SearchState
NavigationState
        |
        v
SEARCH-T-007
SEARCH-A11Y-001
SEARCH-A11Y-002
SEARCH-PERF-001
```

---

# 24. Example End-to-End Trace

## Structural move section

```text
USR-STRUCT-001
        |
        v
PRD-007
        |
        v
SectionTree
SourceRange
StructuralSelection
        |
        v
structure.moveSectionDown
        |
        v
Source transformation
Semantic reconcile
Editor position reconcile
Undo state
        |
        v
STRUCT-003
KEY-E2E-002
```

---

# 25. Example End-to-End Trace

## Low-vision repagination

```text
USR-LV-001
        |
        v
Reader customization + semantic position preservation
        |
        v
ReaderPresentationPreferences
SemanticPosition
PageLayoutMap
        |
        v
view.increaseTextSize
        |
        v
Pagination invalidation
Repagination
Position resolution
        |
        v
LV-001
BOOK-004
PAGE-A11Y-003
POS-T-010
```

---

# 26. Source Document Registry

The following project specifications currently contribute to traceability:

```text
accessible_markdown_reader_editor_spec.md
accessible_markdown_reader_editor_user_stories.md
accessibility_requirements_and_verification_matrix.md
semantic_document_model_specification.md
pagination_and_book_mode_specification.md
accessible_authoring_rules_catalog.md
accessibility_manual_test_scripts.md
threat_model_and_security_requirements.md
command_and_shortcut_system_specification.md
reading_position_and_navigation_state_specification.md
smart_search_specification.md
data_and_application_state_model_specification.md
hci_and_interaction_design_principles.md
```

---

# 27. Future Traceability Extensions

As implementation proceeds, extend rows with:

```text
Architecture Decision Record
source module
React component
Electron handler
unit test file
integration test file
manual AT result
GitHub issue
pull request
implementation status
```

Possible future columns:

```text
ADR
Module
Owner
Status
Last Verified
Platform
```

---

# 28. Suggested Machine-Readable Form

A future machine-readable trace file may complement this Markdown document.

Example:

```json
{
  "id": "USR-POS-001",
  "requires": ["PRD-005"],
  "capabilities": [
    "SemanticPosition",
    "NodeFingerprint",
    "PositionResolver"
  ],
  "commands": [
    "history.returnToReadingPosition"
  ],
  "tests": [
    "POS-001",
    "POS-T-001",
    "POS-A11Y-001"
  ]
}
```

This could support tooling that detects:

- requirements with no tests,
- tests referencing unknown requirements,
- renamed command IDs,
- missing verification coverage.

The Markdown document remains the human-readable system view.

---

# 29. Traceability Quality Gates

A mature feature should satisfy:

- [ ] User need identified.
- [ ] Product requirement identified.
- [ ] Semantic/state dependencies identified.
- [ ] Interaction/command path identified.
- [ ] Accessibility implications identified.
- [ ] Security implications identified where applicable.
- [ ] Verification path identified.
- [ ] Relevant source specification identified.

---

# 30. Definition of Done

The traceability system should eventually be considered mature when:

- every major user story maps to requirements,
- every major requirement maps to semantic/state capabilities,
- core interactions map to stable command IDs,
- critical requirements have verification paths,
- accessibility requirements map to manual AT tests,
- security requirements map to security tests,
- implementation changes can be impact-analyzed from IDs,
- contributors can trace a feature from user need to test without reverse-engineering the entire codebase.

---

# 31. Core Systems Engineering Rule

> **A requirement should never disappear between "this would help the user" and "we wrote some code."**

Traceability exists to preserve the reason, design intent, implementation contract, and proof of behavior all the way through the system.
