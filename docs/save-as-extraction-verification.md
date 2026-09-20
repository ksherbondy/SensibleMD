# Step 15 Save As extraction verification

Status: **Step 15 complete**. Dedicated extraction commit: `690d248`. Step 16 has not begun and remains unauthorized.

Accepted characterization: `149c0e5` (93 targeted tests). Accepted ownership repair: `0680730`, with original stale characterization `3e3bfb0` and additional repair characterization `2f24983`. See [characterization evidence](save-as-characterization-verification.md) and [ownership repair evidence](save-as-ownership-repair-verification.md). The historical pre-repair defect report remains in this file's Git history.

## Files and final action interface

- `src/core/workspace-save-actions.ts`: adds `saveWorkspaceDocumentAs`; existing direct-save interface and function remain byte-for-byte unchanged.
- `src/App.tsx`: imports the action and replaces only the Save As promise chain with explicit inputs.
- `docs/save-as-extraction-verification.md`: this report.

The action returns `Promise<void>` and accepts the following `SaveAsInputs`:

| Input | Type / purpose |
| --- | --- |
| `savedDocumentId` | `DocumentId`; invocation's old document identity |
| `savedVersion` | `number`; invocation's buffer version |
| `documentName`, `source` | `string`; name/source from the invoked workspace save closure |
| `saveNativeDocument` | `({ name: string, source: string }) => Promise<{ documentId: string, sessionId: string, name: string } \| null>`; narrow native operation |
| `ownsActivation` | `() => boolean`; workspace authority for the captured activation lifetime |
| `readCurrentSnapshot` | `() => { text: string, version: number }`; live buffer read |
| `setCollection` | `((documents: CollectionDocument[]) => CollectionDocument[]) => void`; existing functional collection updater |
| `setActiveDocumentId` | `(documentId: DocumentId) => void`; existing generation-aware workspace setter |
| `setActiveSessionId` | `(sessionId: SessionId) => void` |
| `setCanSaveDirectly` | `(canSave: boolean) => void` |
| `setDocumentName` | `(name: string) => void` |
| `markSaved` | `() => void`; existing buffer mark operation |
| `setIsDirty` | `(dirty: boolean) => void` |
| `clearRecoveryNotice` | `() => void`; existing `setRecoverySnapshot(null)` |
| `refreshRecentDocuments` | `() => void`; existing workspace callback |
| `setAppStatus` | `(status: string) => void` |
| `clearSavedRecovery` | `(documentId: string) => Promise<void>`; awaited cleanup for captured old ID |

The action uses existing `asDocumentId`/`asSessionId` conversions. It receives no bridge object, DocumentBuffer, workspace object, generic setter bag, ownership ref or lifecycle manager. It introduces no state, effects, queue, cancellation, serialization or deduplication. It is not an async wrapper: native invocation and synchronous exception propagation retain the existing boundary.

## Capture, authority and protocol

Workspace save-path selection and the existing ID/version capture statements remain unchanged. The call passes invocation name/source values and the selected native function. Generation is still captured in App immediately before tracking; `ownsActivation` still reads the workspace ref's live mounted flag and compares its live generation with that captured generation. All activation call sites and the ownership layout effect remain unchanged.

The action invokes the native operation with the captured name/source. Only after it resolves does `.then` check `if (!file || !ownsActivation()) return;`. This precedes ID conversion, live buffer reading and every renderer mutation. The live values are the returned native ID/session/name, ownership validity and buffer text/version. A stale rejection also checks `ownsActivation()` before reporting status.

For an authorized result the unchanged order is:

1. Convert returned document ID.
2. Read live buffer snapshot; compare its version with captured `savedVersion`.
3. Apply the existing collection filter/map.
4. Adopt active document ID, session ID, direct-save capability and filename, in that order.
5. Mark saved only when clean; set dirty to `!clean`.
6. Clear the visible recovery notice, refresh recents and report the existing status, in that order.
7. Await `clearSavedRecovery(savedDocumentId)` for the captured old identity.
8. Settle the original `.then(async ...).catch(...)` chain passed to workspace `trackSave`.

Recovery cleanup remains inside the tracked promise. The workspace pending-save set, its final removal, keyboard listener wiring, Close Document and `useWindowClose` are unchanged. Recovery writes remain in their existing separate debounce hook.

## Executable comparison against `149c0e5`

PASS. A Python comparison read baseline files through `git show 149c0e5:<path>` and compared the entire original Save As expression with the new returned expression after whitespace normalization and exactly these three inverse substitutions:

- `readCurrentSnapshot()` → `buffer.snapshot()`
- `markSaved()` → `buffer.markSaved()`
- `clearRecoveryNotice()` → `setRecoverySnapshot(null)`

The expressions matched, including comments, native payload, guard, collection filter/map, mutation sequence, strings, awaited cleanup and catch. Separate assertions verified guard-before-snapshot-before-collection ordering and the guarded rejection.

Replacing the new App action call with the baseline expression and reverting only the import yielded a byte-for-byte match of the **entire App file**. The existing direct-save module body also matched byte-for-byte. This proves invocation captures, ownership generation, all activation call sites, effect registration, tracking, direct Save, keyboard, close wiring and Step 16 metadata code did not move or change. Tests, packaged harness and Electron files have no diff against the characterization baseline. No accepted tests were rewritten or weakened.

## Behavior evidence

| Contract | Unchanged evidence after extraction |
| --- | --- |
| Clean Save As | Normal and StrictMode cases adopt returned ID/session/name, mark the unchanged buffer saved, clear dirty and report exactly `Saved.`. Subsequent Save writes directly to the adopted native file. |
| Newer edits in A | Native file receives invocation source. Collection receives live newer text; saved baseline does not advance, dirty stays true, and status is exactly `Saved the earlier version. Newer changes remain open.` Old-ID cleanup still runs and the unchanged debounce later writes recovery under the new ID. |
| Collision | Existing returned-ID entry is filtered out; captured source entry is remapped with live text. Target.md and unrelated C.md retain characterized ordering/cardinality, and C's source is unchanged. |
| Cancellation | Null result changes no identity/session/name/collection/baseline/dirty/notice/recents/cleanup/status. Tracking settles, demonstrated by successful later native save-close retry. |
| Failure | Current ownership reports exactly `The file could not be saved. Your edits are still open.` without adopting identity or changing buffer/recovery state. Retry remains possible. |
| Stale completion | A→B, A→B→A, same-ID reimport and unmount/remount reject obsolete results before live read/mutation. No identity adoption, collection remap, recents refresh or recovery clear. Stale rejection cannot overwrite current status. |
| Recovery notice | Valid success clears the visible notice; cancellation/failure retain it; stale A completion preserves B's notice. |
| Cleanup and recents | Valid completion refreshes recents once before awaiting old-ID cleanup. Held cleanup retains the old persisted snapshot until release and keeps the same save promise pending. |
| Keyboard | Unchanged Cmd+S and Ctrl+S tests invoke Save As with the latest committed source/name; existing direct-save and workspace keyboard suites pass. |
| Close Document / native close | Close Document blocks while native save or cleanup is pending. Native save-close waits through cleanup, including when close starts after adoption. Clean completion permits close; newer dirty edits veto it. |
| StrictMode / lifetime | Normal and StrictMode clean/newer successes and stale ownership cases pass; actual unmount/remount protection remains covered. No hooks were added or moved. |

## Verification

| Check | Before extraction | After extraction |
| --- | --- | --- |
| Targeted 13 suites | 93 passed | 93 passed |
| Full `npm test`, 57 files | 350 passed, 70 TODO | 350 passed, 70 TODO on rerun; initial transient failure below |
| `npm run build` | PASS | PASS |
| `npm run lint` | 30 warnings, exit 0 | 30 warnings, exit 0 |
| `git diff --check` | Accepted baseline clean | PASS |
| Packaged macOS arm64 smoke | Accepted characterization PASS | PASS, 11 checks |

Targeted suites: save-as-completion, save-as-stale-completion, save-as-ownership, save-as-lifecycle, direct-save, keyboard-save, workspace-keyboard, recovery-clear, recovery-write, workspace-recovery, window-close, close-document and identity. Existing tests are unchanged.

The first post-extraction full run, concurrent with targeted tests and build, had 349 passes and one failure: the Split case in `workspace-source-actions.test.tsx:43` observed a different CodeMirror EditorState object across an identical-source echo. That assertion occurs before any save invocation. The isolated full-suite rerun passed all 350 tests without edits. Timing under concurrent load is a hypothesis, not an established root cause; no test change or unrelated fix was made. This transient verification failure is retained here rather than omitted from the evidence.

Lint category counts are unchanged: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No new category, suppression, configuration change, dummy reference or unrelated cleanup.

Logs: `/private/tmp/step15-extract-before.log`, `/private/tmp/step15-extract-before-{tests,build,lint}.log`, `/private/tmp/step15-extract-after-{targeted,tests,tests-rerun,build,lint}.log`.

## Packaged scope and authorization boundary

PASS using a newly packaged macOS arm64 application and the unchanged accepted harness:

- Packaged `file://` launch without a development server.
- Browser-imported document without direct-save capability; Save As cancellation preserves identity/source/dirty state.
- Held Save As during native close; edits made while pending; native disk gets invocation source while returned ID/session/name are adopted and newer dirty source remains open.
- Subsequent direct Save and native Save-close use the adopted file.
- Existing toolbar Save/Download, real export, duplicate/cancel close, save-close, clean close and discard/recovery checks all pass.

Commands: `npx electron-builder --mac --dir --arm64`, then `node scripts/test-window-close-packaged.mjs`. Logs: `/private/tmp/step15-extract-package.log` and `/private/tmp/step15-extract-packaged.log`. Both exit 0; harness reports 11 PASS checks. Native dialogs are injected; native save IPC and filesystem writes are real. This is an unsigned local package. Physical dialog interaction, assistive technology and Windows/Linux are NOT TESTED; this is not release certification.

Intended observable behavior change: **none**. No new production coupling or semantic deviation was discovered; the explicit interface preserves the characterized cross-boundary dependencies. The transient test observation above is the only verification deviation.

Step 16 has not begun and remains unauthorized. With Step 15 complete, Step 16 appears ready for its separately authorized characterization and scope review. No Step 16 implementation or readiness testing was performed.
