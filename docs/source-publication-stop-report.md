# Active-document source publication — defect stop

Status: **STOPPED after reproducing wrong-document source publication. No production changes.** The complete timing characterization is unfinished under the requested stop condition.

## Reproduced defect

The structural-heading action queues a collection update that combines the invocation's captured document ID with a later live read of the shared buffer. If another document becomes active before that updater runs, the previous document's collection source is overwritten with the new document's text.

The regression runs the real DocumentWorkspace, DocumentBuffer, structural action, collection activation and React state updates. It does not substitute a setter, change production callbacks, or mock buffer contents. It observes collection state through the existing searchCollection input.

Sequence:

1. Import A.md containing `# A` and B.md containing `# B`.
2. Enter Write mode in A, with the cursor on line 1.
3. Within one React `act` batch, click Demote heading, then select B.
4. Immediately after demotion, the actual buffer contains `## A`.
5. B activation replaces the buffer with `# B` before React completes collection publication.
6. A's queued collection updater uses A's ID but reads `buffer.snapshot().text === '# B'`.
7. After commit, both collection entries contain `# B`.
8. Return to A: its buffer and React/browser-persisted source become `# B`, not the structurally edited `## A`.

Normal and StrictMode batched cases both fail. Normal and StrictMode sequential controls, using awaited user actions, both pass.

This establishes a real deferred-publication failure under explicitly batched handler execution. It does **not** establish that ordinary separately dispatched physical clicks always batch this way, or reproduce packaged user-input scheduling. No real document file was saved or overwritten by these tests.

## Timing trace of the failure

| Point | Active buffer | React source publication | Collection publication | Dirty/baseline |
| --- | --- | --- | --- | --- |
| Imported A | `# A` | `# A` | A=`# A`, B=`# B` | Clean |
| Demote A synchronously | `## A` | Enqueue `## A` | Enqueue update for A; text is **not captured** | Buffer advances; enqueue dirty=true |
| Activate B before commit | `# B` | Enqueue `# B` | Read target B's retained source | B receives its clean baseline; A's dirty baseline is retained |
| React processes collection updater | `# B` | Final active source is B | Update **A** with the live buffer's **B text** | Source corruption does not change the ledger's baseline metadata |
| Return to A | `# B`, copied from corrupted A entry | `# B` | A still contains `# B` | A remains dirty, but its edited text is no longer in its collection entry |

The baseline repair preserves dirty ownership; the native-save binding repair preserves write authorization. Neither owns this deferred text publication. No claim is made that either repair prevents or caused this separate source corruption.

## Exact cause

`src/core/workspace-source-actions.ts`, `applyWorkspaceStructuralHeadingChange`:

```ts
const updated = buffer.apply(/* structural transaction */);
setCollection(documents =>
  replaceCollectionDocument(documents, activeDocumentId, buffer.snapshot().text),
);
setSource(buffer.snapshot().text);
setIsDirty(updated.isDirty);
```

- The transaction changes the buffer synchronously.
- activeDocumentId is captured from the action invocation.
- The collection callback's text read occurs when React evaluates the updater; it is not tied to the transaction result or document identity.
- The React source read occurs immediately after enqueueing the collection updater.
- Dirty comes from the apply result captured synchronously.

Thus the action publishes one transaction's dirty state, an immediate live text read to React, and potentially another document's later live text to the collection. A functional updater should receive the latest collection container; that does not justify reading mutable external document content during its execution.

The existing core structural characterization explicitly asserts the deferred live-read behavior. That assertion records the implementation's timing; it is not evidence that cross-document content substitution is intended. It was left unchanged in this task.

## Source inspection completed before the stop

These are source-derived contracts, not a completed end-to-end matrix for every scheduling interleaving:

| Operation | Buffer mutation | React source | Collection source | Version/dirty publication |
| --- | --- | --- | --- | --- |
| Ordinary editor change | Synchronous replace from CodeMirror's emitted text; identical current text is a no-op | Captured nextSource | Functional updater captures document ID and nextSource; container is evaluated later | One replacement increment; dirty from returned snapshot |
| Undo/redo | CodeMirror history emits a document change through the same onChange path | Same as ordinary editing | Same as ordinary editing | Uses existing editor-origin replacement; returning to saved text does not reset revision dirty |
| Structural heading edit | Edit is computed from captured React source/editor line, applied against the current buffer version | Immediate live buffer read | **Deferred live buffer read with captured document ID** | Dirty from synchronous apply result; reproduced unsafe publication |
| Recovery restore | Replace with rendered recoverySnapshot.source | Captured recovery source | Functional updater uses captured active ID and recovery snapshot source | One replacement increment; current saved marker retained; dirty from returned snapshot |
| Clean external reload | Replace with event diskSource, then markSaved | Captured diskSource | Functional updater captures active ID and diskSource | Replacement increment followed by clean projection; event gate uses effect-captured isDirty |
| Explicit conflict reload | Replace with rendered externalChange, then markSaved | Captured externalChange | Functional updater captures active ID and externalChange | Replacement increment followed by clean projection |
| Dirty external notification | No active text mutation | Unchanged | Unchanged | Records conflict source only |
| Retained-document activation | Synchronous replaceForActivation from selected collection entry | Returned activation snapshot text | Does not republish source; relies on retained entry correctness | Monotonic increment; dirty derived from target baseline |
| Fresh import/open | Replace with loaded source, markSaved; replace collection incarnation | Captured loaded source | New collection array from loaded sources | Clean projection |
| Save As adoption/remap | No text replacement; reads current snapshot at accepted completion | No source setter; existing live source remains | Functional updater closes over the completion-time snapshot's current.text, with existing collision/remap rules | No replacement increment; existing version comparison controls markSaved; otherwise retains dirty baseline |

CodeMirror's prop-to-editor effect dispatches a document replacement when the editor differs from React value. Its update listener feeds resulting text back through onChange; the workspace's equal-buffer-text check normally suppresses an identical echo. Further scheduling/stale-closure interleavings of that feedback, structural edit planning, recovery, external reload and Save As were not characterized after the defect stop.

Some timing distinctions are intentional: editor transactions are synchronous, React publication is queued, activation consumes retained source, and Save As retains completion-time live edits while its native write used invocation source. None of those requires the structural collection updater to read another document's buffer later.

## Tests and scope

Added:

- `src/test/source-publication.test.tsx`: four cases; **2 passed sequential controls, 2 failed batched safety regressions**.
- This report.

The failing assertions check A's collection source immediately after B activation, then the buffer and persisted React source after returning to A. The original A/B input sources and expected demoted A text are explicit. Existing production/test files were not modified.

Command: `npm test -- src/test/source-publication.test.tsx`.

Log: `/private/tmp/source-publication-characterization.log`.

Diff whitespace check: PASS. Full suite, build, lint and packaged verification were not rerun after this stop. The new failing regressions mean the full suite must not be described as currently green. Existing uncommitted repairs, their tests/reports and user-owned files remain intact.

## Smallest correctness-oriented recommendation

Authorize a separate bounded structural-publication correction: capture the successful transaction's immutable result and publish **that result's text** to both React and the captured document's collection entry. Retain the functional updater for the latest collection container, but remove its deferred live buffer read.

This addresses the reproduced mismatch without changing buffer ownership, baseline policy, native binding, navigation, or collection shape. The existing implementation-timing assertion would need an explicitly reviewed update to express transaction-specific publication rather than later live text.

Do not introduce a general runtime owner/source store, or require all mutation kinds to share one operation yet. Fix this demonstrated publication boundary, then resume characterization of the remaining source/timing differences before deciding whether a small reusable publication function is warranted.
