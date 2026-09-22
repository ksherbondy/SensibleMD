# Resumed source-publication characterization — stale editor callback stop

Status: **STOPPED after reproducing wrong-document source publication. No production changes.** Baseline is accepted repair commit `0519d87469ac667da47b7cf15e051e210345c736`.

## Reproduced defect

An outgoing editor callback can mutate the newly active document's shared buffer before React commits the activation. The ordinary source action captures the outgoing document ID for its collection update, but does not verify that the shared buffer still belongs to that activation.

Reproduction in the real renderer:

1. Import A.md (`# A`) and B.md (`# B`). Enter Write in A.
2. In one React `act` batch, click B's collection button.
3. Confirm synchronously that the workspace buffer now contains `# B`, while the still-mounted CodeMirror editor contains `# A`.
4. Dispatch a document change through that real A EditorView, appending ` pending A edit`, before React commits/unmounts it.
5. Let React settle.

Observed result:

- Active document identity/name: **B**.
- Buffer text: **`# A pending A edit`**, incorrect for B.
- React source, observed through its existing localStorage persistence effect: **`# A pending A edit`**, incorrect for B.
- B's collection entry source: **`# B`**, unchanged.
- Buffer and React dirty: **true**, although B received no edit of its own.

The reverse order—edit A first, then activate B in the same batch—passes: A's edited source is retained, B stays clean and aligned, and returning to A restores the edited source with dirty=true.

Both orders are tested in normal and StrictMode execution: **2 failing stale-callback regressions, 2 passing controls**.

## Timing and cause

`MarkdownEditor` stores workspace callbacks in a ref and refreshes them in a layout effect after React commits. Its CodeMirror update listener calls the currently committed onChange callback synchronously for a document change.

Collection activation changes the workspace buffer synchronously, then enqueues React identity/source/mode updates. Until commit, the outgoing editor can still exist with its outgoing callback.

`updateWorkspaceSource` performs:

1. Compare incoming text to the current shared buffer text.
2. Replace that buffer immediately.
3. Enqueue a collection update using captured activeDocumentId and captured nextSource.
4. Enqueue React source and dirty from the replacement.

The text inequality check is not a document/activation ownership check. A's callback sees B's live buffer text, finds that A's incoming text differs, and replaces the shared buffer even though B already owns it.

| Moment | Shared buffer | React publication | Collection publication |
| --- | --- | --- | --- |
| A editor committed | A text | A text | A and B retain their respective text |
| B activation, before commit | B text, clean baseline | B identity/source and Read mode queued | Existing B entry supplies activation text |
| Outgoing A editor update | **A edited text replaces B's buffer** | A edited text and dirty=true queued after B's source update | A's captured ID receives A edited text |
| Commit | Active B buffer contains A edited text | B identity with A edited source | B entry still contains B text |

The collection updater captures immutable text correctly in this path. There is no deferred live-text read inside that updater. The defect is **stale mutation ownership before publication**, distinct from the repaired structural updater defect.

The structural fix does not address this callback lifetime and remains intact. The saved-baseline ledger and native-save binding also do not authorize editor source mutations; no change to those systems was made here.

## Evidence and limits

Added only:

- `src/test/editor-source-publication.test.tsx` — four cases using the actual DocumentWorkspace, DocumentBuffer, EditorView dispatch and collection-button handler.
- This report.

The tests do not replace the editor callbacks, mutate buffer contents directly, intercept the React setter, or supply a fake source action. A spy observes existing searchCollection inputs to inspect collection state; it leaves the real implementation intact.

The test deliberately orders the two operations before a React commit. It establishes a reproducible callback-lifetime failure under that scheduling condition. It does not establish that ordinary separately processed physical clicks/keystrokes always have this ordering. Packaged input scheduling and physical input methods were not tested, and no real document file was saved.

Command: `npm test -- src/test/editor-source-publication.test.tsx`.

Result: **2 passed, 2 failed** at the intended buffer/source/dirty safety assertions.

Log: `/private/tmp/editor-source-publication.log`.

Diff whitespace check: PASS. Full suite/build/lint/package verification was not rerun after the stop. With the deliberate failing regressions present, the full working-tree suite must not be described as green.

## Remaining characterization

Recovery restore, clean external reload, explicit conflict reload, Save As completion interleavings, and additional prop-to-CodeMirror echo/undo-redo scheduling were not pursued after this stop. Existing tests for settled behavior are not substitutes for completing those interleavings.

Source inspection confirms undo/redo and prop-driven CodeMirror replacements use the same document-change listener. That identifies a shared boundary to characterize later; it is not a claim that separate defects were reproduced for each of those paths.

## Smallest correctness-oriented recommendation

Review a bounded editor-callback ownership guard before any mutation of the shared buffer, collection or React source. An outgoing editor update must not be allowed to mutate the new activation. The check needs activation lifetime as well as document identity so A→B→A cannot make an obsolete callback current again.

Preserve edits accepted before departure, as covered by the passing controls. Define and test rejection of callbacks from a departed activation before implementing it; do not silently retarget them to the newly active document.

A common source-publication helper alone cannot fix this defect: publication could be internally consistent while still publishing the wrong editor's text under a new document. The evidence supports an explicit mutation-ownership check, not a general source store or runtime owner. No architectural “no further change needed” conclusion is justified while this defect and the remaining characterization are unresolved.
