# Step 17 Close Document characterization

Status: **Step 17 characterization complete**. Characterization commit: `7904281`. **No production behavior changed or extraction began.** Step 18 remains unauthorized.

Accepted production baseline: Step 16 `0155329`, including hydration repair `f330461`. Accepted starting verification: 378 passed, 70 TODO, build PASS, 30 lint warnings, packaged smoke PASS.

## Files and test approach

- `src/test/close-document-protocol.test.tsx`: ten new characterization tests.
- This report.

The new tests observe the actual `closeDocument` function passed into `createWorkspaceCommands`; the spy calls the original catalog and does not replace the close implementation. This makes the returned boolean, optional completion callback and immediate reentrancy guard observable without adding a production test interface. Other tests invoke the actual toolbar and OS-open entry points.

No existing tests were weakened or rewritten. App, core modules, Electron and the packaged harness have no diff against `0155329`.

## Current protocol, in source order

1. Refuse if React dirty state **or** the live buffer is dirty; return false with `Save your changes before closing this document.`
2. Refuse if normal saves are pending, including their recovery cleanup; return false with `A save is still in progress. Close the document when it finishes.`
3. Refuse if reader state is not ready; return false with `Reader state is still loading. Try closing again when it finishes.`
4. Refuse a duplicate invocation while the synchronous `closingRef` is set, without starting a second close.
5. Set closing ref/state; capture navigation validity and live buffer version.
6. Await all currently pending reader writes through `Promise.allSettled`.
7. Recheck navigation/lifetime freshness, version equality and live dirty state. Return false if invalid.
8. Build and await the final reader payload through the current optional desktop API.
9. Repeat the same validity checks. Return false if invalid.
10. Call the completion callback and return true.
11. On caught failure report `Reader state could not be saved. The document is still open.` and return false.
12. Finally reset closing ref/state, including failure and invalidation paths.

Default completion calls the outer App's `onClose`, setting its opened document to null and unmounting the workspace. The `prepareOpen` imperative handle invokes the same protocol with a no-op completion callback, allowing validated OS replacement without first displaying Home. That handle and outer replacement remain outside any proposed close-action extraction.

## Evidence by boundary

| Boundary | Executable evidence |
| --- | --- |
| Dirty refusal | New cases separately isolate a dirty buffer with clean React state and dirty React state with a buffer marked saved. Both return false with the exact status, do not flush metadata or clear recovery, and leave the document open. Existing close tests retain edited source across failed/cancelled saves. |
| Pending Save refusal | Accepted direct-save test holds recovery cleanup after disk success and buffer clean. Close reports the exact pending-save refusal until cleanup settles. |
| Pending Save As refusal | Accepted normal/StrictMode completion cases hold native Save As on a clean document, then separately hold old-ID recovery cleanup after adoption. Both phases block Close Document with the exact status. Newer edits remain dirty. |
| Reader readiness refusal | Accepted metadata tests hold hydration in normal/StrictMode, invoke Close Document and verify the exact loading status. No ordinary metadata writes occur during the hold. A→B readiness gating remains covered. |
| Pending reader drain | Accepted metadata cases hold the dispatched ordinary promise, start close and verify no final write races ahead. Both resolve and reject remove the exact tracked promise; only then may final flushing proceed. |
| First validity check | Accepted metadata cases independently navigate, edit source/dirty state, or advance buffer version while keeping it clean during the held drain. No final flush begins, the document remains open and closing resets. |
| Final payload | Accepted metadata cases change heading/node, bookmarks and all preferences after the ordinary payload was dispatched. The final write equals the current `createReaderStatePayload` output and differs from the old ordinary payload. Native-ID/paragraph-position cases remain covered. |
| Second validity check | The same three independent invalidators run while final flushing is held. Its later settlement cannot close the document; current text/location survives and closing resets. |
| Reentrant close | New case invokes the same real action twice in one act before a React commit. Second result is immediately false, only one flush starts, first callback is called exactly once after settlement and first result is true. Optional completion may leave the workspace mounted, as prepareOpen does. |
| Optional desktop API | New case removes the optional metadata save API and proves clean close still returns true and reaches Home under current behavior. |
| Failure/retry | Existing asynchronous final rejection and new synchronous API exception both preserve the exact final-flush failure status, reset closing and allow a successful later retry. |
| Actual close/reset | New normal/StrictMode cases start with visible recovery and a selected heading. Successful close returns true, removes active identity/editor controls/recovery notice, releases the window-close listener and displays Home. Reopening B creates a different DocumentBuffer, clean B source and a fresh listener. |
| Recovery ownership | New close/reset cases explicitly prove **no clearRecoverySnapshot call** and preservation of the persisted recovery record. Source and reader memory in localStorage also remain intact; final metadata retains the outgoing identity/heading. |
| Late work after Home | New and existing cases deliver an external change or delayed recovery response after the prior workspace closes; no stale document is recreated and the new document is not contaminated. |
| Unmount/lifetime | New StrictMode cases unmount during reader drain or final flush, then mount B. Old close returns false after held success, never calls its completion callback, never advances from drain to final flush, and cannot close or change the new workspace status/name. |
| OS preparation | New case holds the final flush during an OS request: no native open or acknowledgement happens early, and Home is not shown. Flush rejection leaves A open, acknowledges the request without authorizing B, and a later request retries successfully. Existing OS-open cases verify dirty refusal and reader location restoration. |

## Recovery cleanup distinction

Close Document itself does **not** delete recovery. Recovery cleanup belongs to the existing save completion paths and explicit recovery discard/window-close decisions. Close refuses while a tracked save's cleanup is pending. Once allowed to close, persisted recovery is retained, and workspace unmount cancels its timers/listeners. This is intentional preservation of current behavior, not a missing cleanup step added to the protocol.

The separate native window-close protocol remains unchanged and is exercised by its own tests and the packaged smoke. It must not be folded into a future Close Document extraction.

## Verification

| Check | Result |
| --- | --- |
| New protocol file | 10 passed |
| Targeted 17 suites | **147 passed** |
| Full `npm test`, 59 files | **388 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged categories |
| `git diff --check` | PASS |
| Production/harness comparison against `0155329` | No diff |
| Packaged existing metadata restoration/save-close smoke | PASS, 12 checks |

Targeted suites: close-document-protocol, close-document, reader-metadata, reader-state-payload, reader-settings, window-close, recovery-write, workspace-recovery, recovery-clear, direct-save, save-as-completion, identity, position-continuity, navigation-stale, navigation-red, navigation-observation and os-open. Existing normal/StrictMode save, metadata and recovery cases run within this gate.

Lint counts: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No suppression or configuration change.

Logs: `/private/tmp/step17-{new,targeted,tests,build,lint,package,packaged}.log`.

Packaged verification used a fresh macOS arm64 build via `npx electron-builder --mac --dir --arm64` and the unchanged `node scripts/test-window-close-packaged.mjs`; both exited 0. All 12 checks passed, including Close Document/metadata restoration after browser storage clearing and all native Save As/save/download/close/discard checks. This uses an unsigned local package with injected native dialog responses. It does not establish physical dialog, full process restart, assistive-technology or Windows/Linux behavior.

## Limits and extraction assessment

The clean-version test in the accepted metadata suite uses a test-only buffer mutation to isolate version freshness from navigation and dirty state. UI edits naturally exercise overlapping guards. The new close-action observation is not a production API and adds no lifecycle owner.

This gate does not claim exhaustive OS-open queue concurrency, every native dialog interaction, or cross-platform/accessibility validation. Those remain separate scopes. Current characterization proves the specific captured validity, metadata drain/flush, recovery retention and completion relationships described above.

No production defect was observed. A bounded Close Document action extraction appears safe to authorize if it preserves refusal ordering, synchronous closing-ref locking, both live validity checks, the shared pending sets, exact payload/status behavior, optional completion and boolean results. Keep `prepareOpen`, onClose ownership, reader hydration, recovery, navigation, window-close and effect registration in their current owners.

Step 17 characterization is complete. **Extraction has not begun and requires explicit authorization. Step 18 has not begun.** Intended observable behavior change: none.
