# ADR-006: Document Buffer and Source Synchronization

**Status:** Proposed  
**Date:** 2026-09-03  
**Decision owners:** Project maintainers  
**Scope:** Live Markdown source ownership, editor synchronization, parsing, structural edits, preview updates, autosave, external file changes, undo/redo boundaries  
**Related specifications:** Data and Application State Model, Semantic Document Model, Reading Position, Command System, Test Strategy, Performance Budget, ADR-003, ADR-004, ADR-005

---

## 1. Context

The application has several systems that need to interact with the current Markdown source:

```text
CodeMirror editor
Semantic parser
Rendered reader / preview
Structural editing commands
Search indexing
Accessibility analysis
Autosave / save
External file-change detection
Crash recovery
Undo / redo
```

If each subsystem keeps its own writable copy of the Markdown text, the application risks:

- lost edits,
- stale previews,
- race conditions,
- out-of-order parser results,
- structural edits applied to obsolete text,
- autosave writing the wrong version,
- external file changes overwriting local work.

The project therefore needs one explicit live-source ownership model.

---

## 2. Decision

Introduce a dedicated **Document Buffer** abstraction as the single authoritative in-memory source representation for each open Markdown document.

Conceptually:

```text
                     +------------------+
                     |   CodeMirror     |
                     | editor view      |
                     +--------+---------+
                              |
                              | source transactions
                              v
+-------------+      +--------+---------+      +----------------+
| Structural  |----->| Document Buffer  |----->| Parser /       |
| Commands    |      | AUTHORITATIVE    |      | Semantic Model |
+-------------+      | LIVE SOURCE      |      +----------------+
                     +--------+---------+
                              |
                              +--> Search
                              +--> Accessibility Analysis
                              +--> Preview / Reader
                              +--> Save / Autosave
                              +--> Crash Recovery
```

There must be **one writable current source authority**.

CodeMirror may maintain its own internal immutable editor state, but it must synchronize through the Document Buffer contract rather than becoming a second independent source authority.

---

## 3. Core Rule

> **Every source mutation must pass through one versioned document-buffer transaction path.**

No subsystem should directly mutate:

- a separate Markdown string,
- rendered HTML,
- the semantic AST,
- an on-disk file,

and then expect the rest of the application to "catch up."

---

## 4. Document Buffer Model

Conceptual:

```ts
interface DocumentBuffer {
  documentId: string;

  getText(): string;

  getVersion(): number;

  getSavedVersion(): number;

  isDirty(): boolean;

  applyTransaction(
    transaction: SourceTransaction
  ): SourceTransactionResult;

  subscribe(
    listener: DocumentBufferListener
  ): Unsubscribe;
}
```

---

## 5. Source Transaction

Conceptual:

```ts
interface SourceTransaction {
  origin:
    | "editor"
    | "structural-command"
    | "external-reload"
    | "undo"
    | "redo"
    | "recovery"
    | "programmatic";

  baseVersion: number;

  edits: SourceEdit[];

  selectionIntent?: SelectionIntent;

  metadata?: Record<string, unknown>;
}
```

---

## 6. Source Edit

Conceptual:

```ts
interface SourceEdit {
  from: number;
  to: number;
  insert: string;
}
```

Offsets refer to the source version specified by:

```text
baseVersion
```

---

## 7. Versioning

Every accepted transaction increments:

```text
bufferVersion
```

Example:

```text
version 41
editor inserts "x"
-> version 42
```

All derived work must record the version it represents.

---

## 8. Version Invariant

If:

```text
SemanticModel.version = 42
SearchIndex.version = 42
AccessibilityAnalysis.version = 42
```

they correspond to:

```text
DocumentBuffer.version = 42
```

If the document moves to version 43, results for 42 are stale unless explicitly still useful as historical data.

---

## 9. Stale Transaction Rejection

A source transaction created against an old version must not apply blindly.

Example:

```text
buffer = 52
structural command computed against 51
```

Expected:

```text
reject
re-resolve
or recompute transaction
```

Do not apply old offsets to new source.

---

## 10. Editor Ownership

CodeMirror owns editor UI mechanics:

```text
caret
selection
composition
viewport
editor undo history
```

The Document Buffer owns:

```text
current Markdown source
source version
saved-version relationship
```

These responsibilities must remain distinct.

---

## 11. Editor-to-Buffer Flow

Conceptual:

```text
CodeMirror transaction
       |
       v
translate to SourceTransaction
       |
       v
DocumentBuffer.applyTransaction
       |
       v
new buffer version
       |
       +--> parser
       +--> preview
       +--> search
       +--> diagnostics
```

---

## 12. Buffer-to-Editor Flow

Programmatic edits must also update CodeMirror.

Examples:

```text
move section
apply accessibility fix
external reload
recovery restore
```

Flow:

```text
application source transaction
       |
       v
Document Buffer
       |
       v
CodeMirror transaction
```

The editor must not discover these changes only by replacing its full document asynchronously after the fact.

---

## 13. Loop Prevention

Bidirectional synchronization must prevent feedback loops.

Example risk:

```text
CodeMirror -> Buffer
Buffer -> CodeMirror
CodeMirror -> Buffer
...
```

Each transaction should carry:

```text
origin
transaction ID
buffer version
```

The editor adapter can recognize transactions it already originated.

---

## 14. Source Transaction ID

Conceptual:

```ts
interface SourceTransactionResult {
  transactionId: string;
  previousVersion: number;
  newVersion: number;
}
```

This supports:

- debugging,
- synchronization,
- regression testing.

---

## 15. Structural Editing

Structural commands should produce normal source transactions.

Example:

```text
structure.moveSectionDown
```

Flow:

```text
SemanticDocument version 24
     |
resolve section source range
     |
create SourceTransaction(baseVersion=24)
     |
DocumentBuffer
     |
CodeMirror/history integration
     |
version 25
```

No special side-channel source mutation.

---

## 16. Structural Command Safety

Before applying a structural transaction:

```text
semantic model version
```

must correspond to:

```text
buffer version
```

If not:

```text
reparse/re-resolve command target
```

This prevents manipulating stale source ranges.

---

## 17. Undo and Redo

Undo/redo should be coordinated with CodeMirror when the editor engine is active.

The preferred behavior:

```text
structural edit
-> one coherent editor transaction
-> one Undo restores it
```

The buffer itself should not independently maintain a competing text-undo stack.

---

## 18. Buffer History

The Document Buffer may retain limited technical history such as:

```text
recent transaction metadata
version lineage
```

for debugging/reconciliation.

This is not the user-facing undo stack.

---

## 19. Reader-Only Documents

A document may be opened and read without mounting CodeMirror.

In that case:

```text
Document Buffer
```

still owns source.

The semantic model, reader, search, and pagination must not depend on an active editor instance.

---

## 20. Lazy Editor Mount

CodeMirror may be mounted only when:

```text
user enters edit mode
```

When mounted:

```text
editor initial document = current DocumentBuffer text
```

and begins synchronization from the current buffer version.

---

## 21. Lazy Editor Unmount

Leaving editor mode must not discard unsaved source.

The buffer remains alive independently from CodeMirror.

---

## 22. Parser Flow

The parser receives a stable source snapshot:

```ts
{
  documentId,
  version,
  text
}
```

It returns:

```ts
{
  documentId,
  version,
  semanticDocument
}
```

If:

```text
returned version != current buffer version
```

the semantic result is stale and should not replace current semantic state.

---

## 23. Worker Parsing

If parsing runs in a worker:

```text
buffer version 81
-> worker
```

while user types:

```text
buffer version 82
```

worker result 81 may be discarded.

No blocking synchronization is required.

---

## 24. Parse Debouncing

During rapid editing:

```text
keypress
keypress
keypress
```

the application may debounce expensive full parsing.

However:

```text
DocumentBuffer
```

must update immediately.

The source authority must never lag behind user input.

---

## 25. Preview Synchronization

Preview renders:

```text
SemanticDocument(version N)
```

It should not claim to represent newer source version:

```text
N+1
```

while parsing is pending.

Internal state may expose:

```text
previewVersion
sourceVersion
```

for debugging.

---

## 26. Preview Lag

Short preview lag is acceptable.

Source lag is not.

Priority:

```text
1. input/source update
2. caret/selection
3. semantic parse
4. preview
5. diagnostics/pagination
```

---

## 27. Search Index Synchronization

Search index records:

```text
sourceVersion
```

If source changes:

```text
index -> stale
```

The search subsystem may:

- incrementally update,
- rebuild,
- temporarily search source directly,

but must not present stale matches as current without indication.

---

## 28. Accessibility Analysis Synchronization

Findings must carry:

```text
analysisVersion
```

A finding against version 44 should not be applied automatically to version 48 by raw offsets.

It must:

- be reconciled semantically,
- or be recalculated.

---

## 29. Pagination Synchronization

Page maps record:

```text
semantic model version
layout signature
```

Source changes invalidate relevant pagination.

The buffer itself remains independent of page state.

---

## 30. Save Flow

Save operates on an explicit buffer snapshot.

Conceptual:

```text
save requested
    |
capture:
  documentId
  bufferVersion
  source text
    |
conflict check
    |
write disk
    |
if successful:
  savedVersion = captured bufferVersion
```

---

## 31. Save During Continued Editing

Suppose:

```text
save captures version 50
user types -> version 51
disk write of version 50 completes
```

Expected:

```text
savedVersion = 50
bufferVersion = 51
dirty = true
```

Do not mark document clean merely because a save completed.

---

## 32. Save Failure

If disk write fails:

```text
buffer remains unchanged
savedVersion remains old
dirty remains true
```

Never roll back in-memory source because save failed.

---

## 33. Atomic Save

The main-process file service should perform atomic-write strategy where practical.

The Document Buffer supplies source but does not write files itself.

---

## 34. Autosave

Autosave captures a buffer version just like manual save.

Do not autosave every transaction synchronously.

Use configured debounce/idle policy.

---

## 35. Crash Recovery

Crash recovery may periodically snapshot:

```text
document ID
buffer version
source text
last known disk version
```

Recovery storage is separate from normal metadata persistence.

On restart, recovery is reconciled with current disk state.

---

## 36. External File Changes

Filesystem watcher may report that the on-disk file changed.

Behavior depends on dirty state.

### Clean Buffer

If:

```text
bufferVersion == savedVersion
```

the application may reload disk content.

### Dirty Buffer

If local unsaved changes exist:

```text
CONFLICT
```

Do not automatically replace buffer.

---

## 37. Clean External Reload

Flow:

```text
external disk text
      |
SourceTransaction(origin="external-reload")
      |
DocumentBuffer
      |
new version
      |
reparse/re-render
```

The reload remains a normal versioned source transition.

---

## 38. Position Preservation During Reload

Before external reload:

```text
capture semantic position
```

After reparse:

```text
resolve semantic anchor
```

Do not preserve location through raw pixel scroll alone.

---

## 39. Conflict State

Conflict state should preserve:

```text
local buffer
disk version
last common saved version metadata
```

No data is discarded until the user chooses a resolution.

---

## 40. Conflict Resolution

Potential actions:

```text
keep local
reload disk
compare/merge
save local as new file
```

Detailed merge UI is outside this ADR.

The buffer architecture must support applying the chosen resolution as a transaction.

---

## 41. File Rename / Move

File identity/path metadata may change without changing source.

This should not require a source transaction.

Document identity/state updates occur separately.

---

## 42. Encoding

The buffer should represent source internally as JavaScript strings.

File service owns:

```text
byte decoding
encoding detection policy
encoding on save
```

The application should preserve known source encoding when practical.

Exact encoding policy may require a future small specification.

---

## 43. Line Endings

Line ending style is metadata associated with source.

Edits should avoid normalizing the whole document unintentionally.

The buffer stores exact current text.

Structural commands should preserve existing line endings.

---

## 44. Source Snapshots

Avoid unnecessary full-string copies.

However, parser workers or save operations may require immutable snapshots.

Optimization should be measured rather than guessed.

---

## 45. Large Files

For very large documents, repeated full-text serialization/copying can become expensive.

The architecture should permit future implementation using:

```text
rope
piece table
CodeMirror Text
other persistent text structure
```

behind the Document Buffer interface.

The interface must not require callers to know the internal text representation.

---

## 46. Initial Internal Representation

Initial implementation may use:

```text
CodeMirror Text / immutable document representation
```

when editor is active and expose string snapshots only when required.

For reader-only documents, a simpler text representation may be used.

The exact internal representation should be chosen during prototype measurement.

---

## 47. One Authority Despite Multiple Representations

It is acceptable to have:

```text
buffer data structure
parser snapshot string
disk bytes
```

simultaneously.

What is forbidden is multiple independently writable "current sources."

There must be one authoritative version lineage.

---

## 48. Selection Intent

Programmatic edits should be able to express what should remain selected.

Example:

```text
move section down
```

selection intent:

```text
remain inside moved section at equivalent semantic position
```

The editor adapter resolves this after the source update.

---

## 49. Semantic Position Reconciliation

A source transaction may affect:

```text
reader position
editor caret
bookmark anchors
search result anchors
```

The transaction pipeline should trigger semantic reconciliation after parsing.

---

## 50. Transaction Metadata

Useful metadata:

```ts
{
  commandId?: string;
  semanticTargetId?: string;
  undoGroup?: string;
  description?: string;
}
```

This improves debugging and undo grouping.

---

## 51. Command-to-Transaction Traceability

Example:

```text
structure.moveSectionDown
transactionId=tx-892
version 67 -> 68
semanticTarget=section-installation
```

This can be surfaced in development logs.

---

## 52. Persistence Boundary

ADR-005 persists:

```text
reading positions
bookmarks
preferences
```

It does not persist the live buffer on every edit.

Unsaved recovery source uses a dedicated recovery mechanism.

---

## 53. State Store Boundary

ADR-003's Zustand store should not contain redundant full writable source if the Document Buffer already owns it.

Store may contain:

```text
buffer version
dirty state
saved version
status
```

and a reference/ID to the document buffer.

---

## 54. Thread / Worker Safety

Workers receive immutable source snapshots or serialized edit data.

Workers do not mutate the buffer.

All accepted mutations return through the main renderer/application transaction path.

---

## 55. Error Handling

A source transaction may fail because:

```text
stale base version
invalid range
document closed
read-only state
conflict state
```

Failure must be explicit.

Do not partially apply multi-edit transactions.

---

## 56. Multi-Edit Atomicity

A transaction containing several edits is applied atomically.

Either:

```text
all edits
```

or:

```text
none
```

This is especially important for structural transformations.

---

## 57. Edit Ordering

Multiple source edits in one transaction should have deterministic ordering.

Implementation should normalize ranges before application.

Overlapping edits should be rejected unless the transaction type explicitly defines their behavior.

---

## 58. Read-Only Documents

A document buffer may be marked:

```text
readOnly
```

Reader functionality still works.

Mutation transactions fail predictably.

---

## 59. Multiple Tabs

Tabs reference the same open document buffer when they represent the same document instance.

Do not create divergent writable copies merely because two UI views exist.

---

## 60. Multiple Windows

If the same document is open across windows, the application needs one coordinated buffer authority or explicit conflict policy.

Initial implementation may restrict editing to one window.

If multi-window editing is later supported, a follow-up ADR may define cross-window buffer synchronization.

---

## 61. Collaboration / Sync

Real-time multi-user collaboration is out of scope.

The buffer interface should not pretend to solve CRDT/OT synchronization.

If collaboration is added, it requires a new architecture decision.

---

## 62. Testing Strategy

Unit tests:

```text
version increments
stale transaction rejection
atomic multi-edit
dirty state
save-version behavior
```

Integration tests:

```text
CodeMirror -> Buffer
Buffer -> CodeMirror
Buffer -> Parser
Structural command -> Undo
External reload
```

E2E:

```text
edit -> preview
edit -> save
edit during save
dirty + external change
crash recovery
```

---

## 63. Required Test Cases

### BUF-T-001 — Editor typing

Expected:

```text
buffer updates immediately
version increments
```

### BUF-T-002 — Stale parser result

Expected:

```text
discarded
```

### BUF-T-003 — Structural transaction

Expected:

```text
one atomic source update
```

### BUF-T-004 — Undo

Expected:

```text
structural transaction reversed coherently
```

### BUF-T-005 — Save while editing

Expected:

```text
savedVersion < currentVersion
dirty remains true
```

### BUF-T-006 — External clean reload

Expected:

```text
buffer updates
semantic position reconciles
```

### BUF-T-007 — External dirty conflict

Expected:

```text
local buffer preserved
```

### BUF-T-008 — Lazy editor mount

Expected:

```text
editor displays current buffer exactly
```

### BUF-T-009 — Lazy editor unmount

Expected:

```text
source remains available
```

### BUF-T-010 — Multi-edit failure

Expected:

```text
no partial mutation
```

---

## 64. Performance Tests

Measure:

```text
typing transaction latency
full-string snapshot cost
10k-line structural edit
parser snapshot cost
memory duplication
```

Against Performance Budget fixtures.

---

## 65. Alternatives Considered

### Alternative A — CodeMirror Is the Source of Truth

Simple while editor is mounted.

Rejected as whole-product architecture because:

- reader may run without editor,
- CodeMirror may be lazily mounted,
- future renderer/editor modes should not determine document ownership,
- application services need editor-independent source access.

### Alternative B — Zustand Store Holds the Markdown String

Rejected.

Reasons:

- frequent full-string updates may cause broad state pressure,
- application store is coordination state, not text-buffer engine,
- editor history and text structures should not be duplicated.

### Alternative C — Semantic AST Is the Source of Truth

Rejected.

Reasons:

- source fidelity,
- unsupported syntax,
- serializer normalization,
- Markdown remains authoritative user data.

### Alternative D — Disk File Is the Only Source of Truth

Rejected for editing sessions.

Unsaved edits require authoritative in-memory state.

---

## 66. Consequences

### Positive

- one explicit live-source authority,
- stale async work becomes detectable,
- editor can mount/unmount safely,
- structural edits and typing share one mutation path,
- save races are understandable,
- external conflicts are manageable.

### Negative

- requires an adapter between CodeMirror and application buffer,
- source versioning must be handled consistently,
- transactions add architectural ceremony,
- multi-window editing remains a future complexity.

---

## 67. Risks

### RISK-001 — Two writable copies emerge

Mitigation:

```text
Document Buffer interface is mandatory
code review
```

### RISK-002 — Full-string copying hurts large documents

Mitigation:

```text
abstract internal representation
benchmark
```

### RISK-003 — Editor transactions and app transactions drift

Mitigation:

```text
single adapter
transaction IDs
integration tests
```

### RISK-004 — Undo doesn't include structural edits

Mitigation:

```text
all editor-visible source mutations use editor transaction/history integration
```

### RISK-005 — External reload destroys orientation

Mitigation:

```text
semantic position capture/reconciliation
```

---

## 68. Acceptance Criteria

Move ADR to Accepted when a prototype demonstrates:

1. reader works with no editor mounted,
2. CodeMirror mounts from current buffer state,
3. typing updates buffer once,
4. buffer programmatic edit updates CodeMirror once,
5. no synchronization feedback loop,
6. parser results are version-checked,
7. structural edits integrate with Undo,
8. save-while-editing preserves dirty state correctly,
9. external dirty changes produce conflict rather than overwrite,
10. 10k-line fixture stays within typing/source-update performance targets.

---

## 69. Implementation Sketch

Conceptually:

```text
DocumentRepository
    |
    +--> DocumentBuffer
            |
            +--> EditorAdapter
            +--> ParseCoordinator
            +--> SaveCoordinator
            +--> RecoveryCoordinator
            +--> DerivedStateCoordinator
```

The Document Buffer should remain small and deterministic.

It should not absorb every document-related subsystem.

---

## 70. Final Decision Rule

> **There may be many views, parses, indexes, and snapshots of a document, but there must be exactly one authoritative live source version.**
