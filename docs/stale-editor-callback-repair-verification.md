# Stale editor callback ownership repair

Status: **implemented and verified; uncommitted for review**. This completes the bounded repair approved in [the design](stale-editor-callback-repair-design.md). The [earlier stop report](editor-source-publication-stop-report.md) records the original two failing regressions and their scheduling limits; those unchanged regressions now pass.

## Correction and ownership

An editor source mutation must carry both its originating document activation token and its concrete EditorView setup lease. The workspace accepts it only if the lease is live, the workspace is mounted, the event token equals the callback's captured render token and the workspace's synchronous current token, and the captured document ID agrees.

Rejection happens before the ordinary or structural source action runs. It does not replace the buffer, increment its version, change its saved baseline, enqueue collection/source/dirty updates, publish status, or invoke save/recovery. CodeMirror may have received an outgoing edit locally; it cannot publish that edit into the active workspace.

`EditorMutationOwnership` is workspace-local authorization bookkeeping only. It stores no source, buffer, collection, navigation, session, save capability, or persistence data. Its token is independent of Save As generation and buffer version. Each real activation receives a fresh object, including same-ID reopen/reimport and accepted Save As adoption. A→B→A cannot revive the first A token.

The outgoing token is invalidated before each existing active-buffer handoff. Existing operation ordering within baseline, buffer, identity, binding and navigation code remains intact. The existing identity setter publishes the fresh token into React state, so identical document IDs still deliver a new credential to the editor. Routes covered: collection selection, next/previous chapter, history back/forward, internal link, collection search/result cycling, return to search origin, browser file/collection open, native Open/Recent, and accepted Save As adoption.

Ordinary edits, undo/redo, and editor toolbar/keyboard structural commands use the guarded entry points. Accepted pre-departure edits still publish captured text to the captured collection document when React evaluates the existing functional updater later. There is no second ownership check inside that updater and no deferred live-buffer text read added.

## Editor provenance and lifecycle

- Every actual EditorView setup creates a new lease. Cleanup permanently revokes it before unregistering the scroll adapter and destroying the view. StrictMode replacement setup gets a different lease, even with the same activation token.
- Callback-ref refresh remains in its existing layout effect. It does not retag the text still present in CodeMirror.
- The existing value-projection passive effect now depends on `value` and the activation token. It validates currentness, projects source, and adopts the token even when identical text requires no dispatch.
- Projection dispatches carry a local source-projection annotation. The listener updates editor-local source but does not echo projection back as a new source mutation. Later real typing and undo/redo still publish normally.
- No editor remount key, undo-history reset, history-exclusion rule, or navigation redesign was introduced.
- Workspace liveness is updated at the existing workspace layout-effect registration point. Its dependency list changes from `[]` to `[editorOwnership]`, where ownership is a stable lazy state instance. No effect moved, and the Save As generation/mounted transitions remain unchanged.
- Successful actual Close Document invalidates editor authority before its default completion queues workspace removal. Refusal/failure and the no-op `prepareOpen` completion leave authority intact. Workspace teardown rejects retained callbacks. Native window-close logic is unchanged.

## Files

Production changes:

1. `src/core/editor-mutation-ownership.ts` — narrow activation/lease types and workspace authorization checks.
2. `src/App.tsx` — token publication, pre-handoff invalidation, mutation guards, and successful actual-close invalidation.
3. `src/components/MarkdownEditor.tsx` — per-view leases, content provenance, structural callback origins, and projection annotation.

Tests and verification:

- `src/core/editor-mutation-ownership.test.ts` — activation identity and lifetime checks.
- `src/test/editor-mutation-ownership.test.tsx` — 44 workspace acceptance cases, using actual CodeMirror plus retained callbacks carrying actual emitted origins.
- `src/test/editor-provenance.test.tsx` — 6 focused actual-EditorView commit/projection/StrictMode cases.
- `src/test/workspace-source-actions.test.tsx` — two existing direct callback invocations now supply the required origin argument. All assertions remain unchanged, including identical-text no-op and undo/redo assertions.
- `scripts/test-window-close-packaged.mjs` — four additional editor ownership checks; existing eighteen packaged checks remain.
- This report.

`src/test/editor-source-publication.test.tsx` is unchanged: its two original stale-editor regressions and two pre-departure controls remain. The accepted structural source-publication tests and production source-action implementation are unchanged. Existing design/audit/stop documents and `currentTree.md` were not edited.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| Original stale A callback cannot overwrite B | Both original normal/StrictMode regression cases pass unchanged; packaged real EditorView dispatch after B selection also passes. |
| Edits accepted before departure remain accepted | Both original inverse-order controls pass, retaining A source and dirty state on return. Structural publication controls also pass. |
| Invalidation precedes active-buffer handoff | Route tests subscribe to the real buffer and assert old activation is already invalid during synchronous notification; retained ordinary/promote/demote callbacks leave the snapshot unchanged. |
| A→B→A does not revive callbacks | Across committed activations and two native open completions batched before replacement commit, in normal and StrictMode. Batched tests assert the old view lease is still live while its activation token is rejected. |
| Same-ID replacement gets fresh authority | Browser file, collection and native reopen cases; same-ID accepted Save As; equal-text token adoption without a CodeMirror transaction. Packaged same-ID collection reimport accepts fresh typing. |
| Commit-window provenance | A sibling layout-effect probe dispatches into outgoing A content after B callback props commit but before B's passive source projection. No mutation callback is emitted. Fresh B typing then succeeds. Tested with different and identical source. |
| Surviving EditorView | History back/forward retains the actual EditorView while replacing its activation and source. Packaged history also verifies instance identity and saved A content. |
| Undo/redo | Existing ordinary Write/Split controls; outgoing real undo/redo before activation commit cannot mutate B; projection is not echoed but subsequent undo/redo remains a normal mutation. Packaged typing/undo/redo saves the expected bytes. |
| Recovery and reload | Recovery restore, clean external reload and explicit conflict reload each replace the workspace buffer once, project matching source to CodeMirror, retain their dirty/clean semantics, and permit subsequent typing. |
| Save As | Remap, collision, same ID, newer edits, cancellation, failure and stale completion; accepted results reject old credentials, failed/cancelled results preserve current ones. Existing save/binding/baseline suites pass. |
| Structural mutation guard | Outgoing editor toolbar and keyboard commands cannot mutate the new activation; retained structural callbacks reject across all route tests. Accepted transaction publication remains unchanged. |
| StrictMode and teardown | Concrete first-setup lease is permanently revoked during replay; second setup accepts events. Read/Write remount retains activation but changes view lease. Full workspace remount rejects old callbacks. |
| Close behavior | Dirty, pending Save As and reader-not-ready refusals; final-flush failure; successful close; OS prepare-open success followed by open failure; window-close cancellation. Current editor stays usable when departure did not occur. Existing complete close/window-close suites pass. |
| Same-document no-op | Outline navigation and cancelled Open retain the current token and accept editor mutations. |

No changes to DocumentBuffer, collection runtime fields, saved-baseline custody, native-save binding, IPC, recovery protocol, save-version checks, or normal pending-save tracking were required.

## Verification results

| Check | Final result |
| --- | --- |
| Targeted gate, 24 suites | **233 passed** |
| Full `npm test`, 71 suites | **551 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged categories/counts |
| `git diff --check` | PASS |
| Packaged smoke script syntax | PASS |
| Local macOS arm64 package | PASS |
| Packaged smoke, actual file:// application | **22 checks passed**, exit 0 |

Lint counts: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No suppression, configuration change, dummy reference or warning-count workaround was added.

The original accepted full-suite baseline was 496 passed/70 TODO. The final count includes the four prior source-publication characterization cases and 51 new ownership/provenance cases. No TODO was removed.

One full run concurrent with targeted tests/build hit the pre-existing identical-echo test's EditorState object-identity assertion in Split mode: only CodeMirror's internal state-field computation status differed, while text/mutation assertions passed. The assertion was not weakened. The final standalone full run passed all 551 tests. This timing-sensitive test observation remains a verification limitation, not evidence of a document-source defect.

Commands for packaging and packaged verification:

```sh
npx electron-builder --mac --dir --arm64 -c.electronDist=node_modules/electron/dist
node scripts/test-window-close-packaged.mjs
```

Logs: `/private/tmp/editor-ownership-{targeted,full,build,lint,package,packaged}.log`.

The packaged harness uses an isolated temporary profile/files, injected dialog responses, real renderer CodeMirror dispatch and keyboard transactions, and real IPC/filesystem saves. Its stale-editor test dispatches synchronously after chapter activation in one renderer evaluation. The GUI run required leaving the execution sandbox. Harness iteration corrected synthetic key input, file-fixture retention, newline serialization and a command input selector; no production changes were needed for packaged verification.

## Scope and limitations

Intended observable correction: an editor operation from a departed document activation or disposed editor instance can no longer mutate the active workspace; prop-driven source projection cannot echo as a fresh editor mutation. Edits accepted before departure retain their existing publication and saved-baseline behavior.

This is an unsigned local macOS arm64 packaged verification, not a release/signing or cross-platform claim. Windows, Linux, manual physical-input/IME scheduling and assistive-technology checks were not run. Deterministic batched tests do not establish the frequency of that scheduling in ordinary physical input.

No general runtime owner/source store, universal activation controller, navigation redesign, or undo-history redesign was introduced. This repair does not claim completion of the previously paused broader source-publication audit or solve hypothetical same-activation stale full-text transactions. No broader ownership change was required by the completed repair.
