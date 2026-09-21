# Step 17 Close Document extraction verification

Status: **Step 17 complete**. Dedicated extraction commit: `f943d91`. Step 18 has not begun and remains unauthorized.

Accepted characterization: `7904281` ([report](close-document-characterization-verification.md)). Starting production baseline: Step 16 `0155329`. No characterization tests or packaged harness were changed for extraction.

## Files and action interface

- `src/core/workspace-close-action.ts`: new named `closeWorkspaceDocument` async action.
- `src/App.tsx`: replaces the local protocol body with a narrow workspace wrapper; swaps the payload-builder import for the action import.
- This report.

The action returns `Promise<boolean>` and accepts explicit `CloseDocumentInputs`:

| Input | Type / role |
| --- | --- |
| activeDocumentId | string; captured reader metadata identity |
| isDirty | boolean; existing React dirty capture |
| readerStateReady | boolean; existing readiness capture |
| readCurrentSnapshot | `() => { version: number; isDirty: boolean }`; reads the live workspace buffer at each original read point |
| captureNavigation | `() => () => boolean`; captures the existing navigation/lifetime validity at its original point |
| pendingSaves | `RefObject<Set<Promise<unknown>>>`; same workspace pending saves |
| pendingReaderWrites | `RefObject<Set<Promise<unknown>>>`; same workspace pending reader writes |
| closingRef | `RefObject<boolean>`; same synchronous workspace reentrancy lock |
| setClosing | `(closing: boolean) => void`; existing workspace setter |
| setAppStatus | `(status: string) => void`; existing workspace status setter |
| completed | `() => void`; resolved optional completion callback |
| bookmarks, activeHeading, semanticDocument, activeNodeId, fontScale, lineHeight, contentWidth, reducedMotion | Existing captured reader payload inputs, typed through `Omit<ReaderStatePayloadInput, "documentId">` |

No state/ref ownership moved. No whole buffer, navigation manager or workspace object is passed. The action owns only the previously local async protocol; there is no lifecycle manager, scheduler or new hook.

## Wrapper and lifetime ownership

The workspace retains `closeDocument(completed = onClose): Promise<boolean>`. It passes the existing captures and live operations into the action and returns that action's promise directly. The wrapper is not an extra async layer; the single async boundary moved to the action. Its body executes synchronously up to the original first await, including setting `closingRef.current = true`.

The existing `useImperativeHandle(prepareOpen, () => () => closeDocument(() => {}))` remains byte-for-byte unchanged at the same position. Outer onClose still sets opened to null. No-op prepare completion still validates/flushes without first unmounting to Home. Command and toolbar call sites remain unchanged.

Reader loading/hydration, ordinary metadata persistence, pending-write ownership, recovery, navigation, Save/Save As, native window-close and all effects remain where they were. The extracted action registers no effects.

## Exact preserved protocol

1. React dirty or live buffer dirty refusal.
2. Pending Save/Save As refusal, including save-owned recovery cleanup.
3. Reader-state-not-ready refusal.
4. Synchronous duplicate-close refusal through closingRef.
5. Set closing ref/state, capture navigation validity, then capture live buffer version.
6. Drain the current pending reader-write set with `Promise.allSettled`.
7. First navigation/version/dirty validity check, retaining short-circuit order and separate live snapshot reads.
8. Look up the optional desktop save API at this same point, construct the same final payload with the existing helper, and await its result.
9. Second identical validity check.
10. Invoke completed and return true.
11. Catch with the same failure status and return false.
12. Finally clear closing ref/state.

All false/true return paths and exact statuses are unchanged:

- `Save your changes before closing this document.`
- `A save is still in progress. Close the document when it finishes.`
- `Reader state is still loading. Try closing again when it finishes.`
- `Reader state could not be saved. The document is still open.`

The optional API invocation expression is unchanged, including lookup after the drain/first check, optional-call argument evaluation and existing method call binding. No synchronous flush, early payload construction or captured native function was introduced.

Recovery retention is unchanged: Close Document does not clear snapshots. Save cleanup is still included in pending saves, and close refuses while that cleanup is pending. Successful close unmounts the workspace while retaining stored recovery and reader memory.

## Executable source comparison

PASS against `0155329` (also the production source at accepted characterization `7904281`):

- Extracted the original complete async body from `git show 0155329:src/App.tsx`.
- Compared it with the new action body after indentation normalization and only two inverse substitutions: `readCurrentSnapshot()` → `buffer.snapshot()` and `captureNavigation()` → `navigationWork.capture()`.
- Bodies matched exactly, including comments, refusal ordering, ref mutations, both checks, native optional call, payload, catch/finally and return values.
- Replaced the new App wrapper with the original body and reversed the one import substitution. The entire App file then matched baseline byte-for-byte.

The wrapper forwards each original render capture directly. Live reads remain callbacks to the same workspace objects. This establishes unchanged read/capture points, effect registration, imperative handle, outer completion and adjacent behavior. No Step 18 code moved or broader lifecycle ownership was required.

## Verification and behavior evidence

| Check | Result |
| --- | --- |
| Targeted 17 suites | **147 passed** |
| Full `npm test`, 59 files | **388 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged category counts |
| `git diff --check` | PASS |
| Packaged metadata restoration / save-close smoke | PASS, 12 checks |

Targeted suites: close-document-protocol, close-document, reader-metadata, reader-state-payload, reader-settings, window-close, recovery-write, workspace-recovery, recovery-clear, direct-save, save-as-completion, identity, position-continuity, navigation-stale, navigation-red, navigation-observation and os-open.

Unchanged characterization confirms both independent dirty authorities; pending save/cleanup and readiness refusals; duplicate calls in the same act; optional API absence; held-write drain and exact pending settlement; latest final payload; independent navigation/dirty/clean-version invalidation before and after flush; synchronous/asynchronous failure with retry; no-op prepare completion; recovery-preserving Home reset and fresh next buffer; StrictMode; unmount during drain/final flush; and OS replacement waiting for successful close preparation.

Lint remains 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No suppression, configuration change, warning restoration or unrelated cleanup.

Logs: `/private/tmp/step17-extract-{targeted,tests,build,lint,package,packaged}.log`.

## Packaged scope and conclusion

PASS using a fresh local macOS arm64 package. `npx electron-builder --mac --dir --arm64` and `node scripts/test-window-close-packaged.mjs` both exited 0. The unchanged harness passed all 12 checks: file:// launch, reader metadata persistence/restoration after Close Document/reopen with browser storage cleared, and all Save As/direct-save/download/native-close/discard checks.

The package is unsigned local macOS arm64. Physical dialogs, assistive technology and Windows/Linux are NOT TESTED. The metadata gate verifies document reopening within the running process, not full process restart. No release-readiness claim.

Intended observable behavior change: **none**. No production defect, behavioral deviation or broader lifecycle requirement was found. Step 18 has not begun and remains unauthorized.
