# Accessible Markdown Reader & Editor
# Reading Position and Navigation State Specification

**Document type:** State and navigation architecture specification  
**Status:** Working specification  
**Purpose:** Define how the application represents, preserves, restores, and navigates a user's semantic position across reading modes, searches, links, bookmarks, chapters, edits, repagination, application restarts, and file changes.

---

# 1. Purpose

Preserving the user's place is a core product requirement.

The application must not treat reading location as only:

- a scroll offset,
- a page number,
- a DOM element,
- an editor line number,
- or a temporary focus position.

Instead, the application should maintain a semantic reading position that can survive:

- closing and reopening a file,
- changing font size,
- resizing the window,
- switching between continuous and paginated reading,
- switching between one-page and two-page layouts,
- following links,
- performing searches,
- navigating through an outline,
- editing nearby content,
- external file changes.

The guiding rule is:

> **The application should preserve what the user was reading, not merely where pixels happened to be.**

---

# 2. State Concepts

The application should distinguish several related but different concepts:

```text
Semantic Reading Position
Visual Viewport Position
Keyboard Focus
Screen-Reader Cursor
Editor Caret
Structural Selection
Navigation Origin
Navigation History
Bookmark Position
```

These values may coincide, but they must not be treated as identical.

---

# 3. Semantic Reading Position

A semantic reading position describes the user's current location in document meaning.

Conceptual:

```ts
interface SemanticPosition {
  documentId: string;

  nodeId?: string;
  nodeFingerprint?: string;

  headingPath?: string[];

  sectionId?: string;

  blockIndexHint?: number;
  sentenceIndex?: number;
  characterOffset?: number;

  textAnchor?: TextAnchor;

  documentProgressHint?: number;
  scrollRatioFallback?: number;
}
```

Not every field must always be populated.

---

# 4. Why Multiple Anchors Are Necessary

A single anchor mechanism is insufficient.

Examples:

## Node ID only

Fails if a reparse creates a new identity.

## Heading path only

Fails if headings are renamed or duplicated.

## Text anchor only

Fails if text is rewritten.

## Scroll offset only

Fails after reflow.

Therefore, persisted position should use multiple clues and a recovery strategy.

---

# 5. Position Precision Levels

The application should support several levels of precision.

## Level 1 — Document

```text
document
```

## Level 2 — Section

```text
document + heading path
```

## Level 3 — Block

```text
section + paragraph/code/table node
```

## Level 4 — Sentence

```text
block + sentence index
```

## Level 5 — Character

```text
block + character offset
```

Reader mode may commonly use block or sentence precision.

Editor synchronization may use character precision.

---

# 6. Current Reader State

Conceptual:

```ts
interface ReaderState {
  documentId: string;

  currentPosition: SemanticPosition;

  readingMode:
    | "continuous"
    | "single-page"
    | "spread";

  currentPage?: number;

  activeSectionId?: string;

  visualViewport?: ViewportState;
}
```

---

# 7. Visual Viewport State

Visual state may be useful as a secondary aid.

Conceptual:

```ts
interface ViewportState {
  scrollTop?: number;
  scrollRatio?: number;

  pageNumber?: number;

  viewportWidth?: number;
  viewportHeight?: number;
}
```

Viewport state should not be the authoritative reading location.

---

# 8. Editor State

Conceptual:

```ts
interface EditorPositionState {
  documentId: string;

  sourceOffset: number;
  sourceSelectionStart?: number;
  sourceSelectionEnd?: number;

  semanticPosition?: SemanticPosition;
}
```

The editor should maintain source precision while also mapping into semantic context.

---

# 9. Reading Cursor

The application should maintain an internal semantic reading cursor.

The reading cursor answers:

```text
What sentence/paragraph/section is the reader currently at?
```

It may be updated by:

- scrolling,
- page turns,
- semantic navigation commands,
- search result navigation,
- outline navigation,
- speech playback,
- link navigation.

---

# 10. Focus Is Not Reading Position

Example:

User is reading paragraph 8.

They open Settings.

Keyboard focus is now in Settings.

The reading position should remain:

```text
paragraph 8
```

When Settings closes, reading context should still be recoverable.

Do not overwrite semantic reading position merely because focus temporarily enters application controls.

---

# 11. Screen Reader Cursor Independence

Screen readers may maintain their own virtual/browse cursor.

The application cannot fully control that cursor.

However, the application should:

- expose correct semantic structure,
- avoid unnecessary DOM replacement,
- preserve stable content where possible,
- restore application semantic context,
- avoid stealing focus.

The app's semantic reading cursor should not pretend to be the screen reader's cursor.

---

# 12. Navigation Origin

Temporary navigation should preserve an origin.

Examples:

- search,
- footnote,
- internal link,
- outline exploration,
- accessibility finding.

Conceptual:

```ts
interface NavigationOrigin {
  position: SemanticPosition;
  reason:
    | "search"
    | "link"
    | "footnote"
    | "outline"
    | "finding"
    | "bookmark-preview";
}
```

---

# 13. Return to Reading Position

The application should expose:

```text
history.returnToReadingPosition
```

This should restore the most relevant preserved origin.

Example:

```text
Start at paragraph 12
Search -> result paragraph 94
Open another result -> paragraph 130
Return to Reading Position
-> paragraph 12
```

---

# 14. Back / Forward History

Navigation history should behave similarly to browser history, but store semantic positions.

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
    | "chapter"
    | "manual";
}
```

State:

```ts
interface NavigationHistory {
  entries: NavigationEntry[];
  currentIndex: number;
}
```

---

# 15. History Rules

## HIST-001

Normal reading scroll should not create a history entry every few pixels.

## HIST-002

Meaningful jumps should create history entries.

Examples:

- link activation,
- search result,
- outline jump,
- bookmark jump,
- chapter navigation.

## HIST-003

Back should return to the prior meaningful semantic location.

## HIST-004

Forward should restore locations after Back.

## HIST-005

Creating a new branch of navigation after Back should discard or branch forward history according to defined behavior.

Default should mirror browser-style history.

---

# 16. Search Origin

Search should create a stable search origin when the user begins navigating results.

Conceptual:

```ts
interface SearchNavigationState {
  query: string;
  origin: SemanticPosition;
  currentResultIndex: number;
  resultIds: string[];
}
```

The origin should remain unchanged while the user cycles through results.

---

# 17. Search Return

`search.returnToOrigin` should restore the captured origin.

Closing the search UI should not necessarily imply returning to origin.

These are separate actions.

---

# 18. Outline Navigation

Selecting a heading in the outline is a meaningful jump.

Behavior:

1. save current semantic position to history,
2. navigate to selected heading,
3. update semantic reading cursor,
4. preserve ability to go Back.

---

# 19. Bookmark Position

Bookmarks should store semantic positions.

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

Page number may be displayed but is derived.

---

# 20. Bookmark Recovery

If bookmarked content changes, use the same recovery resolver as reading positions.

Possible outcomes:

```text
exact
high-confidence approximate
section fallback
document fallback
unresolved
```

The UI should distinguish approximate recovery from exact recovery when useful.

---

# 21. Position Resolver

Restoration should use a ranked recovery process.

Suggested order:

```text
1. Exact stable node ID
2. Matching node fingerprint
3. Heading path + node type + relative location
4. Text anchor exact match
5. Text anchor fuzzy/near match
6. Nearest sibling under matching section
7. Section start
8. Relative document progress
9. Scroll ratio fallback
10. Document start
```

---

# 22. Resolution Result

Conceptual:

```ts
interface PositionResolution {
  resolvedPosition: SemanticPosition;

  confidence:
    | "exact"
    | "high"
    | "medium"
    | "low"
    | "fallback";

  strategy: string;
}
```

This is useful for:

- debugging,
- tests,
- possibly user messaging.

---

# 23. Exact vs Approximate Restoration

The application should not claim:

```text
Returned to exact position
```

if it only recovered:

```text
nearest section start
```

Most of the time this distinction can remain internal, but it should be available for diagnostics and edge cases.

---

# 24. Reopen Behavior

When a file opens:

```text
load document
parse semantic model
load saved position
resolve position
restore reading mode
render
move view to resolved anchor
```

The user should not briefly land at the top and then visibly jump if that can be avoided.

---

# 25. Last-Read Position Persistence

Persist positions:

- on meaningful reading movement,
- on document close,
- on application close,
- periodically/debounced during long sessions.

Do not write persistence storage on every pixel scroll event.

---

# 26. Debounced Position Save

Example:

```text
reader moves
   |
update in-memory semantic position
   |
debounce
   |
persist
```

This balances durability and storage overhead.

---

# 27. Position Storage

Persisted state should live in application data, not in Markdown source.

Possible record:

```json
{
  "documentId": "abc123",
  "position": {
    "headingPath": ["Memory Management", "Virtual Memory"],
    "nodeFingerprint": "f82a...",
    "sentenceIndex": 2,
    "documentProgressHint": 0.43
  }
}
```

---

# 28. Document Identity and File Moves

If a file moves, path-only identity may break.

Possible recovery clues:

- previous path,
- filename,
- content hash,
- persisted internal document ID,
- collection membership.

The application should avoid writing hidden IDs into source unless explicitly requested.

---

# 29. Duplicate Files

Two different files may have identical content.

Content hash alone should not determine document identity.

Use a combination of:

- internal app ID,
- known path,
- file metadata,
- content fingerprint.

---

# 30. Rename Handling

If a file is renamed inside the application:

- preserve document ID,
- preserve bookmarks,
- preserve reading position,
- update recent-file path.

If renamed externally, attempt to reconcile when practical.

---

# 31. Deleted Anchor Behavior

If the exact paragraph is deleted:

Preferred fallback:

1. next surviving nearby semantic node,
2. previous surviving sibling,
3. current section heading,
4. nearest ancestor section,
5. document progress fallback.

The app should avoid dumping the user at the start if a better contextual fallback exists.

---

# 32. Moved Section Behavior

If a section moves but retains semantic identity/fingerprint:

- saved bookmark should follow the section,
- reading position should follow the content.

This is why structural identity is preferable to line number.

---

# 33. Edited Paragraph Behavior

If paragraph text changes slightly:

- fingerprint/text-anchor reconciliation should attempt to retain the same semantic position.

If sentence boundaries change, character/text anchor may provide better precision.

---

# 34. Heading Rename Behavior

If:

```text
Virtual Memory
```

becomes:

```text
Virtual Addressing
```

the heading path changes.

Resolver should use:

- node identity,
- source proximity,
- child-content fingerprints,
- surrounding context.

---

# 35. Duplicate Headings

Example:

```text
## Setup
...
## Setup
```

Heading text alone cannot identify location.

Use:

- ancestor path,
- occurrence index,
- sibling fingerprint,
- block proximity.

---

# 36. Reflow Behavior

When layout changes:

```text
capture semantic position
change presentation
repaginate/reflow
resolve semantic anchor in new layout
restore view
```

Do not save old page number as canonical location.

---

# 37. Continuous to Paginated

When switching:

```text
continuous -> paginated
```

1. identify current semantic anchor,
2. paginate,
3. find page containing anchor,
4. display that page.

---

# 38. Paginated to Continuous

When switching:

```text
paginated -> continuous
```

scroll to the semantic anchor represented by current reading position.

---

# 39. Single Page to Spread

Current semantic anchor should remain visible in the resulting spread.

If anchor lies on:

```text
page 27
```

spread may display:

```text
26 + 27
```

or:

```text
27 + 28
```

depending on spread convention.

The app should choose a stable convention.

---

# 40. Font Size Change

Changing font size:

- does not create navigation history entry,
- does not change semantic position,
- may change page number.

---

# 41. Theme Change

Theme changes should not alter reading position.

---

# 42. Spacing Change

Line, paragraph, letter, and word spacing changes should not alter semantic position.

---

# 43. Window Resize

Window resize should not alter semantic position.

---

# 44. Search Result Navigation

When a search result is activated:

1. preserve search origin if not already captured,
2. optionally add result jump to history,
3. navigate to result node,
4. update semantic cursor,
5. expose section context.

---

# 45. Link Navigation

Internal link:

```text
source position
   |
history push
   |
target semantic position
```

External web link:

- should not alter internal reading history unless app intentionally changes context.

---

# 46. Footnote Navigation

Footnote interaction should preserve origin separately enough that:

```text
go to footnote
return
```

is easy.

Do not force users to search backward manually.

---

# 47. Accessibility Finding Navigation

When author opens a finding:

1. preserve findings-panel navigation state,
2. move editor/source to finding,
3. allow Return to Findings.

This is analogous to search origin.

---

# 48. Editor / Reader Synchronization

When switching from editor to reader:

```text
editor source offset
   |
semantic node mapping
   |
reader semantic position
```

When switching reader to editor:

```text
reader semantic position
   |
source range
   |
editor caret
```

Exact character mapping is ideal but block-level fallback is acceptable.

---

# 49. Split View Synchronization

Source and preview should synchronize semantically.

Avoid naïve:

```text
editor scroll percentage = preview scroll percentage
```

because rendered and source document heights differ.

Preferred:

```text
editor caret/source range
   |
semantic node
   |
preview target node
```

---

# 50. Scroll-Driven Position Updates

In continuous mode, user may scroll without explicit semantic commands.

The app should determine the active semantic anchor.

Possible policy:

- first substantially visible paragraph,
- paragraph nearest viewport reading focus line,
- last explicitly navigated node until another node dominates viewport.

Exact policy should be usability-tested.

---

# 51. Viewport Anchor Line

A useful concept is a reading anchor line within the viewport.

Example:

```text
30% from top
```

The semantic node intersecting that line may become the current reading node during passive scrolling.

This avoids treating barely visible top-edge content as current.

---

# 52. Pointer Selection and Position

Selecting text should not necessarily overwrite saved reading position.

Example:

User selects a quotation above current paragraph to copy it.

After copying, reading position should remain stable unless user explicitly navigated.

---

# 53. Copy Commands and Position

Commands such as:

```text
copy current paragraph
copy current section
```

must not move semantic position.

---

# 54. Speech Playback Position

Built-in speech may update reading position as speech advances.

Conceptual:

```ts
interface SpeechState {
  active: boolean;
  position: SemanticPosition;
}
```

When speech stops, app may optionally adopt current speech position as reader position.

User preference may affect this.

---

# 55. Screen Reader vs Built-In Speech

The application must avoid assuming that external screen-reader speech exposes playback position to the app.

Internal semantic state should remain independent.

---

# 56. Navigation Stack Types

It may be useful to distinguish:

```text
history stack
search origin
footnote origin
findings origin
reading resume point
```

Do not force every temporary navigation feature into one global stack if doing so makes Back behavior confusing.

---

# 57. Reading Resume Point

The app should maintain:

```text
lastStableReadingPosition
```

This is the place the user was genuinely reading before temporary exploration.

Temporary search/outline/finding navigation should not immediately overwrite this resume point.

---

# 58. Stable vs Temporary Position

Conceptual:

```ts
interface ReaderPositionState {
  activePosition: SemanticPosition;
  stableReadingPosition: SemanticPosition;
}
```

Examples:

Reading paragraph 12:

```text
active = 12
stable = 12
```

Search result paragraph 90:

```text
active = 90
stable = 12
```

Choose Return to Reading Position:

```text
active = 12
stable = 12
```

---

# 59. When Stable Position Updates

Update stable position when:

- user resumes normal reading,
- explicitly chooses a navigation target and continues reading,
- page-turns normally,
- navigates paragraphs/headings during reading.

Do not immediately update it for:

- transient search preview,
- footnote peek,
- accessibility finding inspection,
- temporary outline exploration.

Exact transition policy may require usability testing.

---

# 60. Navigation Intent

The application may classify navigation as:

```text
reading
exploration
editing
temporary
```

This helps decide whether to replace stable reading position.

---

# 61. History Deduplication

Do not create duplicate history entries for nearly identical semantic positions.

Example:

```text
paragraph 4 sentence 1
paragraph 4 sentence 2
```

may not need separate browser-style history entries unless produced by meaningful jumps.

---

# 62. History Capacity

Navigation history should be bounded.

Example:

```text
last 100 or 500 meaningful entries
```

Exact limit can be configurable/internal.

Bookmarks are not subject to the same transient limit.

---

# 63. Cross-Document History

History should support:

```text
chapter1.md paragraph 4
-> chapter2.md heading Setup
-> chapter3.md table
```

Back should cross files.

---

# 64. Collection Context

When navigating across a book:

```ts
interface CollectionNavigationContext {
  collectionId: string;
  documentId: string;
  position: SemanticPosition;
}
```

This preserves chapter context.

---

# 65. Reading Progress

Progress should be derived from current semantic position.

Possible metrics:

```text
word progress
block progress
section progress
chapter progress
current-layout page progress
```

Persist semantic progress hints, not only page percentage.

---

# 66. Progress After Edits

If document grows/shrinks, percentage may change while semantic anchor remains correct.

This is expected.

---

# 67. Application Restart State

Persist enough to restore:

- active document(s),
- active semantic position,
- reader mode,
- book/collection context,
- bookmarks,
- history if desired,
- stable reading position.

Restoring every temporary panel state is optional.

---

# 68. Crash Recovery

The app should periodically persist stable reading position so an unexpected shutdown does not lose an entire session.

Avoid writing on every keystroke/scroll tick.

---

# 69. Privacy

Reading history may reveal sensitive filenames and topics.

State remains local by default.

If future sync exists, reading-history sync should be explicit.

---

# 70. Recent Files vs Reading History

These are distinct.

```text
Recent files:
Which files did I open?

Reading history:
Where did I navigate within them?
```

Do not conflate them.

---

# 71. Navigation Events

Potential internal event types:

```text
POSITION_CHANGED
STABLE_POSITION_CHANGED
HISTORY_PUSHED
HISTORY_BACK
HISTORY_FORWARD
SEARCH_ORIGIN_CAPTURED
SEARCH_ORIGIN_RESTORED
BOOKMARK_OPENED
DOCUMENT_RESTORED
POSITION_RESOLVED
```

This may simplify testing/debugging.

---

# 72. Position Change Reason

Whenever position changes, track reason.

Conceptual:

```ts
type PositionChangeReason =
  | "scroll"
  | "page-turn"
  | "heading-navigation"
  | "paragraph-navigation"
  | "search"
  | "link"
  | "outline"
  | "bookmark"
  | "history"
  | "restore"
  | "speech"
  | "editor-sync";
```

This helps decide:

- whether history is updated,
- whether stable position changes,
- whether announcements occur.

---

# 73. Position Manager

Conceptual module:

```ts
class PositionManager {
  getCurrent(): SemanticPosition;
  setCurrent(position, reason): void;

  getStableReadingPosition(): SemanticPosition;

  resolve(savedPosition, document): PositionResolution;

  save(documentId): Promise<void>;
  restore(documentId): Promise<PositionResolution>;
}
```

---

# 74. Navigation Manager

Conceptual:

```ts
class NavigationManager {
  navigateTo(position, reason): void;

  back(): void;
  forward(): void;

  captureTemporaryOrigin(kind): void;
  returnToOrigin(kind): void;
}
```

---

# 75. Persistence Manager

Conceptual responsibilities:

```text
save reading position
save bookmarks
save history
save collection position
load persisted state
validate schema
migrate versions
```

---

# 76. Schema Versioning

Persisted position format should be versioned.

Example:

```json
{
  "schemaVersion": 1,
  "documents": {}
}
```

Future migrations should preserve bookmarks/positions where possible.

---

# 77. Corrupt State

If saved state is invalid:

- ignore unsafe data,
- recover defaults,
- do not crash,
- do not overwrite Markdown.

---

# 78. Removed File

If saved recent document no longer exists:

- show it as unavailable or remove gracefully,
- do not search arbitrary filesystem paths.

---

# 79. Position Resolution Performance

Opening a large document should not perform expensive fuzzy matching across every character if exact anchors succeed.

Use staged resolution:

```text
cheap exact checks
-> structural checks
-> text anchor
-> fuzzy fallback
```

---

# 80. Fuzzy Matching Safety

Fuzzy matching should be bounded.

Avoid pathological O(n²) behavior on very large documents.

---

# 81. Text Anchor Normalization

Text-anchor matching may normalize:

- whitespace,
- Markdown inline syntax,
- Unicode normalization where appropriate.

Do not normalize meaning-changing text excessively.

---

# 82. Source vs Rendered Text

Text anchors should likely use semantic/rendered text content rather than raw Markdown punctuation for reader positions.

Editor-specific anchors may use source offsets.

---

# 83. Accessibility Announcements

Restoration may optionally announce:

```text
Resumed at Virtual Memory, paragraph 4.
```

This should be concise and configurable.

Do not announce every routine internal position update.

---

# 84. Position Query Commands

Commands:

```text
reader.describeCurrentPosition
reader.describeCurrentSection
history.returnToReadingPosition
```

should read state without mutating it except the explicit return command.

---

# 85. Focus Restoration

When returning from UI:

- dialog -> invoking control or prior meaningful focus,
- search -> search or reader depending on action,
- reader navigation -> content context,
- editor finding -> source target.

Semantic position and DOM focus should be coordinated but not collapsed.

---

# 86. Accessibility Finding Return Stack

Example:

```text
findings list item 8
-> open source
-> inspect edit
-> return to findings
```

Preserve:

- finding ID,
- panel selection,
- editor source location.

---

# 87. Search Result Return Stack

Example:

```text
search result 4
-> document result
-> return to search
```

Preserve:

- query,
- result group,
- result index,
- search panel focus.

---

# 88. Footnote Return Stack

A footnote should remember its exact reference location.

Multiple nested footnote/link jumps should be handled predictably.

---

# 89. Link History and Stable Reading Position

If a user follows a chapter link and then spends meaningful time reading the new chapter, stable reading position should eventually move to the new chapter.

The system should not permanently consider the old chapter the resume point.

This transition may be triggered by:

- page turn,
- paragraph navigation,
- time/read activity,
- explicit "continue reading".

Exact policy should be tested.

---

# 90. Idle Time Is Not Position

Do not infer that user is reading a location solely because the app sat there for N seconds.

User may have walked away.

Prefer actual navigation/read interaction signals.

---

# 91. User-Controlled Resume

Potential future controls:

```text
Set as current reading position
Return to last reading position
Clear saved position
```

These can help resolve ambiguous workflows.

---

# 92. Multiple Windows

If same document is open in multiple windows:

Questions:

- one shared reading position?
- one position per window?
- last-closed wins?

Recommended conceptual distinction:

```text
documentResumePosition
windowSessionPosition
```

The global resume point may update only from active reading activity.

---

# 93. Multiple Tabs

Each open tab should maintain its own current session position.

Persistent resume position is document-level.

---

# 94. Read-Only vs Editing Position

Editing a document should not automatically overwrite the last reading position with the editor caret unless the user actually switches back into reading there.

Keep:

```text
lastReaderPosition
lastEditorPosition
```

separately.

---

# 95. Reader and Editor Position Records

Conceptual:

```ts
interface DocumentSessionState {
  lastReaderPosition?: SemanticPosition;
  lastEditorPosition?: EditorPositionState;

  stableReadingPosition?: SemanticPosition;
}
```

---

# 96. Save Does Not Move Position

Saving should not alter reader/editor position.

---

# 97. Reload Does Not Reset Position

File reload should:

1. capture semantic position,
2. reload/reparse,
3. resolve,
4. restore.

---

# 98. Parser Change / App Upgrade

A parser upgrade may change node IDs.

Persisted anchors should rely on multiple mechanisms so positions can survive implementation changes.

Schema migrations should be tested.

---

# 99. Semantic Model Version Change

If model schema changes:

- migrate position records,
- preserve heading/text anchors,
- fall back safely.

---

# 100. Position Debug Tool

Development builds should support inspecting:

```text
documentId
nodeId
headingPath
sentenceIndex
fingerprint
text anchor
resolution strategy
confidence
history state
stable reading position
```

This will be critical for debugging "lost my place" bugs.

---

# 101. Test Cases

## POS-T-001 — Exact reopen

Read paragraph, close, reopen.

Expected: exact semantic position.

## POS-T-002 — Reflow

Resize and increase font.

Expected: same semantic anchor.

## POS-T-003 — Search return

Search distant result, return.

Expected: origin restored.

## POS-T-004 — Link back

Follow cross-file link, Back.

Expected: source position restored.

## POS-T-005 — Edited preceding content

Insert paragraphs before saved position.

Expected: anchor follows original content.

## POS-T-006 — Edited target paragraph

Modify target slightly.

Expected: high-confidence recovery.

## POS-T-007 — Deleted target paragraph

Delete saved paragraph.

Expected: nearby semantic fallback.

## POS-T-008 — Heading rename

Rename parent heading.

Expected: position resolved through other anchors.

## POS-T-009 — Duplicate heading

Two identical section headings.

Expected: correct occurrence resolved.

## POS-T-010 — Repagination

Change 16px -> 28px font.

Expected: page number changes, semantic location does not.

## POS-T-011 — Reader/editor switch

Switch both directions.

Expected: semantic mapping remains sensible.

## POS-T-012 — App crash simulation

Persist stable position, terminate, restart.

Expected: recent reading position survives.

---

# 102. Accessibility Test Cases

## POS-A11Y-001

VoiceOver reopen long document.

Expected:

- restored position,
- useful context,
- no toolbar focus surprise.

## POS-A11Y-002

NVDA search-return workflow.

Expected:

- search context preserved,
- reader origin restored.

## POS-A11Y-003

Low-vision font enlargement.

Expected:

- same paragraph,
- repagination safe.

## POS-A11Y-004

Keyboard-only outline jump + Back.

Expected:

- no mouse,
- exact semantic return.

---

# 103. Failure Categories

Position bugs should be classified:

```text
LOST_POSITION
WRONG_SECTION
WRONG_PARAGRAPH
WRONG_SENTENCE
FOCUS_DESYNC
PAGE_DESYNC
HISTORY_CORRUPTION
SEARCH_ORIGIN_LOST
BOOKMARK_DRIFT
CROSS_FILE_MISMATCH
```

This helps regression tracking.

---

# 104. Contributor Checklist

Before implementing any navigation feature:

- [ ] What is the semantic target?
- [ ] Does this create history?
- [ ] Does this alter stable reading position?
- [ ] Does it preserve a temporary origin?
- [ ] What happens to keyboard focus?
- [ ] What happens after repagination?
- [ ] What happens after file edit?
- [ ] What happens across linked files?
- [ ] Is the position persisted?
- [ ] Is return/back behavior defined?
- [ ] Is screen-reader behavior considered?
- [ ] Is there a regression test?

---

# 105. Open Research Questions

1. What exact viewport rule should update semantic position during passive scrolling?
2. Should stable reading position update immediately after a page turn?
3. How long should temporary search origin remain available?
4. Should Back and Return to Reading Position be separate commands? Likely yes, but usability testing should confirm.
5. What is the best node fingerprint strategy for edited Markdown?
6. What fuzzy matching algorithm is sufficiently robust and bounded?
7. Should reading position be stored at sentence or paragraph granularity by default?
8. How should positions behave when users dramatically restructure a document?
9. Should history persist across application restarts?
10. How should multiple windows editing/reading the same file update global resume position?
11. How should external file renames be reconciled?
12. Should users be notified when a position was only approximately recovered?
13. How should screen-reader users perceive restored position without duplicate verbosity?
14. Should built-in speech automatically update stable reading position?
15. What interaction best distinguishes exploration from resumed reading?

---

# 106. Definition of Done

The reading-position system should eventually be considered mature when:

- closing/reopening restores semantic position,
- resizing preserves position,
- font changes preserve position,
- spacing changes preserve position,
- pagination changes preserve position,
- reader/editor switching maps positions,
- search can return to origin,
- internal links support Back,
- cross-file links support Back,
- bookmarks survive repagination,
- positions survive reasonable edits,
- deleted anchors degrade gracefully,
- screen-reader context remains meaningful,
- state survives restart,
- persistence is local and schema-versioned,
- history and stable reading position are distinct.

---

# 107. Core Architectural Rule

> **A reader should never have to rediscover where they were simply because the application changed how the document was displayed.**
