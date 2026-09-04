# Accessible Markdown Reader & Editor
# Data and Application State Model Specification

**Document type:** Application architecture and state specification  
**Status:** Working specification  
**Purpose:** Define the major runtime and persisted state domains for the desktop Markdown reader/editor, how they relate, what is canonical versus derived, and how state should move between Electron, React, the semantic document model, reader/editor modes, search, book mode, accessibility systems, and persistence.

---

# 1. Purpose

This application will eventually manage several different kinds of state at once:

- open documents,
- Markdown source,
- parsed semantic structure,
- rendered reader state,
- editor caret and selection,
- search state,
- pagination state,
- reading position,
- bookmarks,
- navigation history,
- multi-file book context,
- accessibility preferences,
- user interface layout,
- filesystem metadata,
- application settings.

Without a clear state model, these concerns can easily become tangled.

The purpose of this document is to define:

- what state exists,
- where it belongs,
- which values are authoritative,
- which values are derived,
- what gets persisted,
- what is temporary,
- what may live in React,
- what belongs in Electron main/preload,
- what should be recomputed instead of stored.

The guiding rule is:

> **Store authoritative state. Derive what can be derived. Persist only what should survive.**

---

# 2. State Domains

The application should conceptually separate state into these domains:

```text
Application State
├── Platform / Electron State
├── Workspace / Window State
├── Document State
│   ├── Source State
│   ├── Semantic Model
│   ├── Reader State
│   ├── Editor State
│   ├── Search State
│   ├── Pagination State
│   ├── Navigation State
│   └── Diagnostics State
├── Collection / Book State
├── User Preferences
├── Accessibility Preferences
└── Persistence Metadata
```

---

# 3. Canonical vs Derived State

A major design rule:

```text
Canonical state
-> should be stored

Derived state
-> should be recomputed
```

Examples:

## Canonical

```text
Markdown source
active document ID
reader semantic position
editor caret
selected reading mode
user font size
bookmarks
custom key bindings
```

## Derived

```text
rendered HTML
section summary
search grouping
page count
current page from semantic position
document word count
outline tree
accessibility findings
```

Derived state may be cached for performance but should be reproducible from canonical inputs.

---

# 4. Source of Truth Hierarchy

For an open editable document:

```text
Editor Buffer / Source Text
        |
        v
Semantic Document Model
        |
        +--> Rendered Reader
        +--> Search Index
        +--> Accessibility Analysis
        +--> Outline
        +--> Pagination
```

The rendered UI must not become the source of truth for Markdown content.

---

# 5. Electron Main Process State

The main process should own privileged platform state.

Examples:

```text
open file handles/path access
native dialogs
application lifecycle
OS file associations
window creation
recent-file integration
external URL launching
secure settings storage location
```

Conceptual:

```ts
interface MainProcessState {
  windows: Map<string, WindowDescriptor>;

  appReady: boolean;

  filePermissions: FilePermissionState;

  recentFiles?: string[];
}
```

Do not expose this entire state to the renderer.

---

# 6. Renderer State

The renderer should own user-interface and document interaction state.

Examples:

```text
active document
reader position
search panel
outline state
editor state
layout mode
accessibility preferences
```

The renderer should request privileged actions through a narrow preload API.

---

# 7. Preload State

The preload layer should contain minimal state.

Prefer:

```text
stateless capability bridge
```

rather than a second application-state store.

If temporary request tracking is needed, keep it narrow.

---

# 8. Root Application State

Conceptual:

```ts
interface AppState {
  session: SessionState;

  documents: Record<string, OpenDocumentState>;

  activeDocumentId?: string;

  collections: Record<string, CollectionState>;

  preferences: UserPreferences;

  accessibility: AccessibilityPreferences;

  ui: UiState;
}
```

Exact implementation may differ.

---

# 9. Session State

Session state represents runtime application context.

Conceptual:

```ts
interface SessionState {
  startedAt: string;

  openDocumentIds: string[];

  activeWindowId?: string;

  activeDocumentId?: string;

  lastCommandId?: string;
}
```

Most session state is not necessarily persisted permanently.

---

# 10. Open Document State

Conceptual:

```ts
interface OpenDocumentState {
  identity: DocumentIdentity;

  source: SourceState;

  semantic: SemanticDocumentState;

  reader: ReaderState;

  editor: EditorState;

  search: SearchState;

  pagination: PaginationState;

  navigation: NavigationState;

  diagnostics: DiagnosticsState;

  dirty: boolean;

  externalChangeState: ExternalChangeState;
}
```

---

# 11. Document Identity State

Conceptual:

```ts
interface DocumentIdentity {
  documentId: string;

  path: string;

  displayName: string;

  collectionId?: string;

  contentHash?: string;

  fileMetadata?: {
    modifiedTime?: number;
    size?: number;
  };
}
```

The internal document ID should not need to be written into Markdown source.

---

# 12. Source State

Conceptual:

```ts
interface SourceState {
  text: string;

  encoding: string;

  lineEnding:
    | "lf"
    | "crlf"
    | "mixed"
    | "unknown";

  savedVersion: number;

  editVersion: number;
}
```

Source state is authoritative for unsaved editing.

---

# 13. Dirty State

A document is dirty when current source differs from the last saved source version.

Conceptual:

```text
editVersion != savedVersion
```

Do not infer dirty state from UI events alone.

---

# 14. Saved Snapshot Metadata

To detect external conflicts, retain information about the last known disk version.

Possible fields:

```ts
interface SavedFileSnapshot {
  contentHash?: string;
  modifiedTime?: number;
  size?: number;
}
```

---

# 15. Semantic Document State

Conceptual:

```ts
interface SemanticDocumentState {
  modelVersion: number;

  documentModel: DocumentModel;

  parseVersion: number;

  parseStatus:
    | "ready"
    | "parsing"
    | "error";

  diagnostics: ParseDiagnostic[];
}
```

---

# 16. Semantic Model Lifetime

The semantic model should be regenerated after source changes.

Optimizations may preserve/reconcile node identities.

Conceptual:

```text
source version 42
-> semantic model version 42
```

Derived layers should know which source/model version they correspond to.

---

# 17. Version Coupling

Use version numbers to prevent stale derived state.

Example:

```text
source.editVersion = 42
semantic.parseVersion = 42
search.indexVersion = 42
pagination.modelVersion = 42
```

If:

```text
search.indexVersion != source.editVersion
```

search results may be stale and should update.

---

# 18. Reader State

Conceptual:

```ts
interface ReaderState {
  currentPosition: SemanticPosition;

  stableReadingPosition: SemanticPosition;

  readingMode:
    | "continuous"
    | "single-page"
    | "spread";

  currentPage?: number;

  activeSectionId?: string;

  selection?: ReaderSelection;

  speech?: SpeechState;
}
```

---

# 19. Stable Reading Position

The stable reading position represents:

```text
where the user is genuinely reading
```

It should not be overwritten by every temporary search/outline jump.

This state is important enough to persist.

---

# 20. Reader Selection State

Conceptual:

```ts
interface ReaderSelection {
  kind:
    | "text"
    | "word"
    | "sentence"
    | "paragraph"
    | "section"
    | "codeBlock";

  sourceRange?: SourceRange;

  nodeIds?: string[];
}
```

This is session state and usually not persisted.

---

# 21. Editor State

Conceptual:

```ts
interface EditorState {
  mode:
    | "raw"
    | "rendered"
    | "split";

  caretOffset: number;

  selectionStart: number;
  selectionEnd: number;

  currentSemanticNodeId?: string;

  structuralSelection?: StructuralSelection;

  focusedPane:
    | "source"
    | "preview";
}
```

---

# 22. Separate Reader and Editor Positions

Keep:

```text
lastReaderPosition
lastEditorPosition
```

separate.

A user may:

- edit one part of a file,
- read another part.

The application should not assume these are always the same.

---

# 23. Split View State

Conceptual:

```ts
interface SplitViewState {
  sourcePaneRatio: number;
  previewPaneRatio: number;

  sourceScrollAnchor?: number;
  previewSemanticAnchor?: SemanticPosition;
}
```

Pane ratios may be persisted as user preferences.

---

# 24. Search State

Conceptual:

```ts
interface SearchState {
  open: boolean;

  mode:
    | "rendered"
    | "source"
    | "collection";

  query: string;

  options: SearchOptions;

  scope: SearchScope;

  origin?: SemanticPosition;

  resultIds: string[];

  currentResultId?: string;

  currentGroupId?: string;

  status:
    | "idle"
    | "searching"
    | "ready"
    | "error";
}
```

---

# 25. Search Index State

Conceptual:

```ts
interface SearchIndexState {
  sourceVersion: number;

  records: SearchRecord[];

  collectionVersion?: number;
}
```

This is derived state.

It may be cached but should be discardable.

---

# 26. Pagination State

Conceptual:

```ts
interface PaginationState {
  enabled: boolean;

  layoutMode:
    | "single"
    | "spread";

  layoutSignature?: string;

  sourceVersion?: number;

  pageMap?: PageLayoutMap;

  currentPage?: number;

  status:
    | "idle"
    | "measuring"
    | "paginating"
    | "ready"
    | "error";
}
```

The page map is derived.

---

# 27. Layout Signature Inputs

Derived from:

```text
viewport size
font
font size
line spacing
word spacing
letter spacing
paragraph spacing
margins
content width
theme metrics
```

If any layout-affecting value changes:

```text
pageMap invalid
```

---

# 28. Navigation State

Conceptual:

```ts
interface NavigationState {
  history: NavigationHistory;

  searchOrigin?: SemanticPosition;

  footnoteOriginStack?: SemanticPosition[];

  findingsOrigin?: FindingsNavigationOrigin;

  stableReadingPosition: SemanticPosition;
}
```

---

# 29. Bookmark State

Bookmarks are persistent document-related user state.

Conceptual:

```ts
interface BookmarkState {
  items: Bookmark[];
}
```

Bookmarks should not be embedded into Markdown by default.

---

# 30. Diagnostics State

Conceptual:

```ts
interface DiagnosticsState {
  accessibilityFindings: AccessibilityFinding[];

  currentFindingId?: string;

  filters: {
    severity?: string[];
    category?: string[];
  };

  analysisVersion?: number;
}
```

Findings are derived from source/model state.

Ignore/suppression decisions are persistent user settings.

---

# 31. Accessibility Analysis Versioning

Example:

```text
sourceVersion 42
analysisVersion 42
```

If source changes, findings become stale until recomputed.

---

# 32. UI State

Conceptual:

```ts
interface UiState {
  outlineOpen: boolean;
  searchPanelOpen: boolean;
  diagnosticsPanelOpen: boolean;

  settingsOpen: boolean;

  distractionFree: boolean;

  fullScreen: boolean;

  commandPaletteOpen: boolean;
}
```

Most UI state is session-local.

---

# 33. Window State

Potential persisted window preferences:

```text
width
height
x/y position
maximized
```

Use platform conventions carefully.

Do not restore windows off-screen after monitor configuration changes.

---

# 34. Focus State

Focus is important but usually should not become global persistent application state.

Session-level focus tracking may include:

```ts
interface FocusState {
  activeRegion:
    | "reader"
    | "editor"
    | "outline"
    | "search"
    | "diagnostics"
    | "dialog";

  lastFocusByRegion?: Record<string, string>;
}
```

Useful for logical focus restoration.

---

# 35. Accessibility Preferences

Conceptual:

```ts
interface AccessibilityPreferences {
  reducedMotion: boolean;

  paragraphFocus: boolean;
  sentenceFocus: boolean;

  announcementVerbosity:
    | "minimal"
    | "standard"
    | "detailed";

  sectionSummaryVerbosity:
    | "minimal"
    | "standard"
    | "detailed";

  highContrastOverrides?: boolean;

  screenReaderOptimizedMode?: boolean;
}
```

Avoid a setting that creates a reduced-feature "accessible version."

---

# 36. Reader Presentation Preferences

Conceptual:

```ts
interface ReaderPresentationPreferences {
  fontFamily: string;
  fontSize: number;

  lineHeight: number;
  paragraphSpacing: number;
  wordSpacing: number;
  letterSpacing: number;

  contentWidth: number | "auto";
  pageMargins: number;

  foreground: string;
  background: string;

  preferredReadingMode:
    | "continuous"
    | "single-page"
    | "spread"
    | "automatic";
}
```

---

# 37. Theme State

Distinguish:

```text
application theme
reader theme
document CSS
```

Conceptual:

```ts
interface ThemeState {
  appTheme:
    | "system"
    | "light"
    | "dark";

  readerThemeId?: string;

  customReaderStyle?: ReaderStyle;

  documentCssEnabled: boolean;
}
```

---

# 38. Keyboard Shortcut State

Conceptual:

```ts
interface ShortcutState {
  profileId: string;

  customBindings: KeyBinding[];
}
```

Persistent.

---

# 39. Voice Command State

If supported:

```ts
interface VoiceCommandPreferences {
  enabled: boolean;

  customAliases?: Record<string, string[]>;
}
```

Persistent only if feature exists.

---

# 40. Collection / Book State

Conceptual:

```ts
interface CollectionState {
  collectionId: string;

  title?: string;

  rootPath?: string;

  documentIds: string[];

  orderedDocumentIds?: string[];

  activeDocumentId?: string;

  currentPosition?: CollectionPosition;

  searchState?: CollectionSearchState;
}
```

---

# 41. Collection Membership

Membership may derive from:

- explicit user-defined collection,
- trusted root,
- linked-document graph.

Do not assume all neighboring files belong to the same book.

---

# 42. Book Progress State

Conceptual:

```ts
interface CollectionProgress {
  currentDocumentId: string;

  currentChapterIndex?: number;

  overallSemanticProgress?: number;
}
```

Derived from collection and document positions.

---

# 43. Recent Files State

Conceptual:

```ts
interface RecentFilesState {
  entries: {
    documentId?: string;
    path: string;
    lastOpenedAt: string;
  }[];
}
```

Persistent but privacy-sensitive.

---

# 44. Persistence Domains

Persistent state should be grouped deliberately.

Possible stores:

```text
app-settings.json
document-state.json
bookmarks.json
recent-files.json
keybindings.json
```

Exact physical layout may differ.

---

# 45. Do Not Persist Everything

Do not persist:

- full semantic AST unless strong reason,
- page maps,
- temporary search results,
- accessibility findings,
- rendered DOM,
- temporary focus state.

These are derived or ephemeral.

---

# 46. Persisted Document State

Conceptual:

```ts
interface PersistedDocumentState {
  schemaVersion: number;

  documentId: string;

  lastKnownPath: string;

  lastReaderPosition?: SemanticPosition;

  stableReadingPosition?: SemanticPosition;

  lastEditorPosition?: EditorPositionState;

  bookmarks?: Bookmark[];

  readerPreferencesOverride?: Partial<ReaderPresentationPreferences>;
}
```

---

# 47. Settings Scope

Support:

```text
global preferences
document-specific overrides
collection-specific overrides
```

Resolution:

```text
document override
-> collection override
-> global default
```

Only where meaningful.

---

# 48. Preference Inheritance

Example:

Global:

```text
font size 18
```

Collection override:

```text
font size 20
```

Specific document override:

```text
font size 24
```

Resolved document value:

```text
24
```

Keep inheritance understandable.

---

# 49. State Normalization

Avoid deeply duplicated state.

Bad:

```text
activeDocument stored in:
app.active
tab.active
reader.active
editor.active
search.active
```

Preferred:

```text
activeDocumentId
```

with consumers deriving their context.

---

# 50. Document Registry

Maintain documents by ID.

Conceptual:

```ts
documents: Record<DocumentId, OpenDocumentState>
```

This avoids repeated object copies and enables multi-tab/multi-file behavior.

---

# 51. Derived Selectors

Use selectors/functions for values such as:

```text
current semantic section
current page
current heading path
current accessibility finding count
current search group
```

Do not store the same derived value in multiple places unless performance requires a cache.

---

# 52. State Mutation Rules

State changes should be explicit.

Examples:

```text
DOCUMENT_OPENED
SOURCE_CHANGED
PARSE_COMPLETED
READER_POSITION_CHANGED
SEARCH_STARTED
SEARCH_RESULTS_UPDATED
PAGINATION_COMPLETED
BOOKMARK_ADDED
```

Whether implemented with Redux-style events, hooks, stores, or another approach is an implementation decision.

---

# 53. Transactional Updates

Some operations affect multiple state domains.

Example:

```text
Move Section Down
```

may update:

- source text,
- semantic model,
- editor caret,
- dirty state,
- search index,
- diagnostics,
- pagination,
- reader preview.

Treat such operations as coherent transactions conceptually.

---

# 54. Structural Edit Transaction

Flow:

```text
command
   |
source transformation
   |
source version++
   |
semantic reparse/reconcile
   |
editor position reconcile
   |
search index invalidate/update
   |
diagnostics invalidate/update
   |
pagination invalidate/update
```

---

# 55. Stale Derived State

Every derived subsystem should know whether it corresponds to the current source version.

Possible status:

```text
ready
stale
rebuilding
error
```

Avoid displaying stale data as authoritative.

---

# 56. Async State

Asynchronous processes include:

- file open,
- file save,
- parse,
- search,
- collection search,
- pagination,
- accessibility analysis,
- image loading.

Each should expose:

```text
idle
loading
ready
error
```

where useful.

---

# 57. Cancellation

Long-running async tasks should be cancellable or supersedable.

Example:

```text
query "mem"
query "memo"
query "memory"
```

Older search operations should not overwrite the newest results.

Use request/version IDs.

---

# 58. Race Condition Prevention

Potential race:

```text
source version 41 search finishes
after source version 42 already exists
```

Result should be discarded because it is stale.

Conceptual check:

```text
if result.sourceVersion !== currentSourceVersion:
    ignore
```

---

# 59. File Open State Machine

Conceptual:

```text
CLOSED
  |
OPENING
  |
LOADING_SOURCE
  |
PARSING
  |
READY
```

Failure states:

```text
OPEN_ERROR
PARSE_WARNING
```

Malformed Markdown should still often reach READY with diagnostics.

---

# 60. Save State Machine

Conceptual:

```text
CLEAN
  |
EDIT
  v
DIRTY
  |
SAVE_REQUESTED
  v
SAVING
  |
  +--> CLEAN
  |
  +--> SAVE_ERROR
```

External conflict may introduce:

```text
CONFLICT
```

---

# 61. External Change State

Conceptual:

```ts
type ExternalChangeState =
  | { kind: "none" }
  | { kind: "disk-changed" }
  | { kind: "conflict" }
  | { kind: "missing" };
```

---

# 62. Reader Mode State Machine

Conceptual:

```text
CONTINUOUS
SINGLE_PAGE
SPREAD
```

Mode switching should preserve semantic position.

---

# 63. Search State Machine

Conceptual:

```text
CLOSED
  |
OPEN
  |
QUERYING
  |
RESULTS
```

No-results is still a valid results state.

---

# 64. Diagnostics State Machine

Conceptual:

```text
IDLE
ANALYZING
READY
STALE
ERROR
```

---

# 65. Accessibility Announcement State

Avoid storing a giant announcement queue in global state unless necessary.

A small service/event layer may be better.

Potential:

```ts
interface Announcement {
  id: string;
  priority:
    | "polite"
    | "assertive";

  text: string;
}
```

Use carefully to avoid duplicate speech.

---

# 66. Speech State

If built-in TTS exists:

```ts
interface SpeechState {
  status:
    | "idle"
    | "speaking"
    | "paused";

  position?: SemanticPosition;

  rate?: number;
  voiceId?: string;
}
```

---

# 67. State and Screen Readers

Do not assume application state automatically maps to accessibility state.

For each meaningful UI state change:

```text
state update
-> rendered semantic change
-> accessibility tree update / status message
```

Must be verified separately.

---

# 68. State Persistence Frequency

Different state needs different persistence cadence.

## Immediately / soon

```text
bookmark creation
settings changes
key binding changes
```

## Debounced

```text
reading position
window geometry
recent file state
```

## On save

```text
document source
```

---

# 69. Persistence Failure

If settings persistence fails:

- document editing should continue,
- user should be informed if important,
- Markdown source must not be corrupted.

---

# 70. Schema Versioning

Each persistent store should have a schema version.

Example:

```json
{
  "schemaVersion": 1
}
```

Migrations should be explicit and testable.

---

# 71. Corrupt Persisted State

On invalid state:

- validate,
- reject malformed fields,
- use safe defaults,
- preserve recoverable data.

Do not use unsafe object deserialization.

---

# 72. Migration Strategy

Conceptual:

```text
v1
 -> migrate
v2
 -> migrate
v3 current
```

Tests should verify preservation of:

- bookmarks,
- reading positions,
- key bindings,
- accessibility settings.

---

# 73. State Privacy

Persisted state can reveal:

- filenames,
- reading habits,
- search terms,
- bookmarks.

Core state should remain local.

Do not upload without explicit future feature/consent.

---

# 74. Search Query Persistence

Search terms may be sensitive.

Default recommendation:

```text
do not persist query history globally
```

unless user explicitly enables such behavior.

---

# 75. Crash Recovery State

Potential persisted recovery state:

```text
unsaved source snapshot
last stable reading position
open document IDs/paths
```

Recovery files may contain sensitive source content.

Store locally and clean them appropriately.

---

# 76. Autosave State

If autosave exists:

```ts
interface AutosavePreferences {
  enabled: boolean;
  delayMs?: number;
}
```

Autosave should not erase external modifications silently.

---

# 77. Undo / Redo State

Editor undo history is session state.

Potentially handled by editor engine.

Structural commands should integrate with the same undo model where possible.

Do not persist full undo history unless intentionally designed.

---

# 78. Command State

The command registry should derive availability from application state.

Example:

```text
structure.moveSectionDown enabled?
```

depends on:

```text
active editor
current section exists
next sibling exists
document writable
```

Do not maintain manually duplicated enable/disable flags where selectors can derive them.

---

# 79. UI Panels

Panel visibility is ordinary UI state.

Panel contents may derive from document state.

Example:

```text
outlineOpen = true
```

but:

```text
outline entries
```

derive from semantic model.

---

# 80. Outline State

Potential session state:

```ts
interface OutlineUiState {
  expandedSectionIds: string[];
  selectedSectionId?: string;
}
```

Persisting expanded nodes is optional.

---

# 81. Findings Panel State

Potential:

```ts
interface FindingsUiState {
  selectedFindingId?: string;
  expandedCategories: string[];
}
```

Finding data itself is derived.

---

# 82. Collection Search State

Collection-level search should not be duplicated into every document.

Conceptual:

```ts
interface CollectionSearchState {
  query: string;
  resultIds: string[];
  currentResultId?: string;
  origin?: CollectionPosition;
}
```

---

# 83. Tab State

If tabs are supported:

```ts
interface TabState {
  tabId: string;
  documentId: string;
  active: boolean;
}
```

Tab state references document state rather than owning a duplicate copy.

---

# 84. Multiple Window State

Each window may have:

```text
active tab
UI layout
session positions
```

Persistent document state remains shared by document ID.

Concurrency rules are needed if same document is edited in two windows.

---

# 85. Document Edit Locking

Potential policy:

- permit multiple read views,
- one active editable buffer per document,
- or support synchronized buffers.

This is an open architecture decision.

Avoid silent divergent edits.

---

# 86. Derived Document Statistics

Do not store permanently:

```text
word count
heading count
table count
reading time
```

Derive from semantic model.

Cache if expensive.

---

# 87. Section Summary State

Section summaries are derived.

They may be memoized by:

```text
sectionId + modelVersion
```

---

# 88. Accessibility Findings Suppressions

Suppressions are persistent user decisions.

Conceptual:

```ts
interface FindingSuppression {
  ruleId: string;
  documentId?: string;
  nodeFingerprint?: string;
}
```

Avoid storing mutable node IDs alone if suppressions need to survive reparsing.

---

# 89. Suppression Scope

Potential scopes:

```text
occurrence
document
collection
global rule
```

Global disabling of strong rules should be explicit.

---

# 90. Settings Resolution Service

A settings resolver can provide final values:

```text
global
 + profile
 + collection
 + document override
 = resolved settings
```

Centralize this logic.

---

# 91. Accessibility Profile State

Profiles should be stored as named preference bundles.

Example:

```ts
interface AccessibilityProfile {
  id: string;
  name: string;

  readerOverrides?: Partial<ReaderPresentationPreferences>;
  accessibilityOverrides?: Partial<AccessibilityPreferences>;
  shortcutProfileId?: string;
}
```

Profiles must not remove features.

---

# 92. State Ownership Rules

Recommended ownership:

## Electron main

```text
filesystem permissions
windows
native integration
```

## Renderer application store

```text
open docs
reader/editor/search/navigation state
preferences
```

## Semantic subsystem

```text
document model
derived semantic metadata
```

## Editor engine

```text
caret
text selection
undo/redo internals
```

## Persistence service

```text
schema validation
load/save app state
```

---

# 93. React State Guidance

Not every value should be React component-local state.

Component-local state is appropriate for:

```text
temporary hover
popover visibility
input draft
```

Shared application state belongs in a centralized state layer or shared context/store.

Exact library is an ADR decision.

---

# 94. Avoid Prop Drilling for Core State

Core state such as:

```text
active document
current semantic position
reader settings
```

should not require passing through many unrelated components.

Use an intentional shared state mechanism.

---

# 95. Avoid One Giant Store Without Boundaries

A single global store can still be modular.

Prefer domain slices/modules:

```text
documents
reader
editor
search
navigation
collections
preferences
ui
```

---

# 96. State Selectors

Examples:

```text
selectActiveDocument()
selectCurrentSection()
selectCurrentReaderPosition()
selectResolvedReaderSettings()
selectSearchResultsForActiveDocument()
selectAccessibilityFindings()
```

Selectors reduce duplicated derivation.

---

# 97. State Commands / Actions

Examples:

```text
openDocument
closeDocument
updateSource
setReaderPosition
startSearch
setSearchResults
switchReadingMode
addBookmark
applyProfile
```

These should align with semantic command execution.

---

# 98. Event Flow Example — Open File

```text
User command: app.openFile
    |
preload/main dialog
    |
path returned
    |
document source loaded
    |
OpenDocumentState created
    |
parse semantic model
    |
restore persisted reader position
    |
reader renders
```

---

# 99. Event Flow Example — Edit Text

```text
editor input
    |
SourceState.text update
editVersion++
dirty=true
    |
semantic parse/reconcile
    |
search index stale/update
diagnostics stale/update
pagination stale/update
preview rerender
```

---

# 100. Event Flow Example — Increase Font Size

```text
view.increaseTextSize
    |
preference update
    |
resolved reader settings update
    |
pagination invalidated
    |
capture semantic position
    |
repaginate
    |
restore semantic position
```

Source does not change.

---

# 101. Event Flow Example — Search

```text
search.open
    |
capture search origin
    |
query update
    |
search semantic index
    |
results/grouping update
    |
current result navigation
```

Stable reading position remains intact during temporary exploration.

---

# 102. Event Flow Example — Save

```text
file.save
    |
validate disk state
    |
conflict check
    |
main process write
    |
savedVersion = editVersion
dirty=false
update disk metadata
```

Reader/editor position unchanged.

---

# 103. Event Flow Example — External File Change

```text
filesystem watcher
    |
external change detected
    |
if document clean:
  reload/reconcile
else:
  conflict state
```

Do not silently overwrite local edits.

---

# 104. Performance Considerations

State updates should avoid causing full-application rerenders.

Examples:

- typing in editor should not rerender unrelated settings panels,
- page turn should not rebuild accessibility rules,
- search query should not reparse Markdown.

Use domain-specific subscriptions/memoization.

---

# 105. Large Document Memory

Avoid retaining multiple full copies of:

```text
source
AST
rendered HTML
search text
page text
```

unless necessary.

Prefer references/node IDs and derived structures.

---

# 106. Worker State

Heavy tasks may run in workers:

```text
parse
search indexing
accessibility analysis
pagination calculations
```

Workers should receive versioned snapshots and return version-tagged results.

---

# 107. Worker Result Validation

Example:

```text
worker parsed source version 31
current source version 33
```

Discard result 31.

---

# 108. Serialization Boundaries

Only serializable state should cross:

- Electron IPC,
- worker messaging,
- persistence.

Avoid passing complex class instances across boundaries.

---

# 109. Security Boundaries

Never place privileged capabilities in ordinary state.

Bad:

```ts
state.fs = require("fs")
```

State should contain data, not privileged Node handles.

---

# 110. State Debugging

Development tools should expose state safely.

Useful debugging views:

```text
active document ID
source version
semantic version
search version
pagination version
current semantic position
stable reading position
dirty state
navigation history
```

Avoid dumping full sensitive document source unless explicitly requested.

---

# 111. State Invariants

## STATE-INV-001

Every open document ID maps to one canonical OpenDocumentState.

## STATE-INV-002

Derived semantic/search/pagination state must declare the source/model version it represents.

## STATE-INV-003

Rendered reader state must not mutate Markdown source.

## STATE-INV-004

Search must not mutate Markdown source.

## STATE-INV-005

Accessibility analysis must not mutate Markdown source.

## STATE-INV-006

Reader presentation changes must not change source.

## STATE-INV-007

Saving must not alter semantic reading position.

## STATE-INV-008

Temporary focus changes must not overwrite stable reading position.

## STATE-INV-009

Page number must not be the sole persisted reading location.

## STATE-INV-010

Persistent user settings must be schema validated.

---

# 112. State Test Cases

## STATE-T-001 — Open document

Expected:

- one document state created,
- source loaded,
- semantic version matches source,
- reader state initialized.

## STATE-T-002 — Edit

Expected:

- source version increments,
- dirty true,
- derived states invalidate/update.

## STATE-T-003 — Save

Expected:

- dirty false,
- saved version catches up,
- reader/editor position unchanged.

## STATE-T-004 — Font change

Expected:

- source unchanged,
- reader settings changed,
- pagination invalidated,
- semantic position preserved.

## STATE-T-005 — Search

Expected:

- search state changes,
- source/semantic model unchanged.

## STATE-T-006 — Accessibility analysis

Expected:

- findings change,
- source unchanged.

## STATE-T-007 — App restart

Expected persisted:

- reading position,
- bookmarks,
- preferences.

Expected recomputed:

- semantic AST,
- search index,
- page map.

---

# 113. Persistence Test Cases

## PERSIST-T-001

Corrupt settings JSON.

Expected:

- app starts with safe defaults,
- user documents unaffected.

## PERSIST-T-002

Old schema version.

Expected:

- migration succeeds,
- bookmarks preserved.

## PERSIST-T-003

Missing document path.

Expected:

- document marked unavailable,
- no arbitrary filesystem search.

---

# 114. Contributor Checklist

When adding new state:

- [ ] Is this canonical or derived?
- [ ] Who owns it?
- [ ] Does it need persistence?
- [ ] Does it contain sensitive data?
- [ ] Does it need schema versioning?
- [ ] Can it become stale?
- [ ] What source/model version does it correspond to?
- [ ] Can it be recomputed?
- [ ] Does it duplicate another value?
- [ ] Does it affect focus?
- [ ] Does it affect semantic reading position?
- [ ] Does it cross Electron/worker boundaries?
- [ ] Does it need regression tests?

---

# 115. Open Architecture Questions

1. Which React state-management library, if any, best fits the project?
2. Should document state use a centralized store or per-document domain objects?
3. How much parsing/search work should move to workers?
4. Should open-document source text live entirely in editor engine state or mirrored in application state?
5. How should undo/redo integrate with structural commands?
6. How should multiple windows share document state?
7. Should navigation history persist across restarts?
8. Should recent files and bookmarks share one persistence database or separate stores?
9. Should SQLite, JSON files, or another local store be used for app metadata?
10. How should document-specific reader settings be keyed if a file moves?
11. How should conflict state behave when filesystem watchers produce repeated events?
12. How should accessibility finding suppressions survive large edits?
13. What derived state should be memoized versus recomputed?
14. How aggressively should worker tasks be cancelled?
15. What is the right persistence cadence for stable reading position?

---

# 116. Definition of Done

The application state architecture should eventually be considered mature when:

- document source has one clear authority,
- semantic state derives from source,
- reader/editor/search/pagination state are separate,
- stable reading position is not confused with focus,
- search/pagination/diagnostics can be invalidated independently,
- derived data is versioned against source/model state,
- settings are layered predictably,
- persistent state is schema-versioned,
- corrupt state fails safely,
- Electron privilege is kept outside ordinary renderer state,
- multi-document state does not duplicate document content unnecessarily,
- contributors can identify where new state belongs.

---

# 117. Core Architectural Rule

> **The application should always be able to answer: what is the authoritative value, what is derived from it, and who owns that state?**
