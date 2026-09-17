# Step 14 direct-save extraction verification

Status: **Step 14 complete**. Characterization commit: `2158b5c`. Dedicated extraction commit: `5e9f5f9`. Starting production baseline: Step 13 `ecaeb43c6f7744e921f5e5ecfdd880a8cd4daf61` (report `da4ccd3`). Step 15 / Save As has not begun and remains unauthorized.

## Files and boundary

- `src/test/direct-save.test.tsx`: seven new characterization cases committed before production extraction.
- `src/core/workspace-save-actions.ts`: new named direct-save action.
- `src/App.tsx`: import and replacement of only the direct-save promise chain with the action call.
- This verification report.

`saveWorkspaceDocumentDirectly` returns `Promise<void>` and accepts these explicit ports:

| Input | Type / capture contract |
| --- | --- |
| `savedDocumentId` | string; workspace captures active ID when Save is invoked |
| `savedVersion` | number; workspace captures buffer version when Save is invoked |
| `source` | string; existing render-captured source from the invoked save closure |
| `saveOpenedDocument` | `(payload: { source: string }) => Promise<unknown>`; existing direct-save API operation |
| `readCurrentVersion` | `() => number`; reads the same live buffer at completion |
| `markSaved` | `() => void`; commits the existing buffer saved baseline |
| `setIsDirty` | `(dirty: boolean) => void`; existing workspace setter |
| `setAppStatus` | `(status: string) => void`; existing workspace setter |
| `clearSavedRecovery` | `(documentId: string) => Promise<void>`; existing cleanup helper |

The action owns no state, refs, identity, buffer, tracking set, navigation, or bridge object. It is deliberately not declared `async`: the original API call still executes synchronously and any synchronous exception retains its existing propagation boundary. The returned promise is the original `.then(async ...).catch(...)` chain, with no extra queue, cancellation, deduplication, or serialization.

## Capture and settlement semantics

App still captures document ID and buffer version at the same two statements at entry to `saveFile`. `source` remains the render closure's value; it is not replaced by a buffer snapshot or latest-source getter. The eligibility condition and API lookup remain unchanged.

The workspace still calls `trackSave` with the entire returned chain. Its `pendingSaves` set and `.finally` removal are unchanged. Successful unchanged completion retains this order:

1. Direct disk-save operation resolves.
2. Compare the live buffer version with the invocation version.
3. Mark the buffer saved.
4. Set dirty false.
5. Report `Saved.`.
6. Await saved recovery cleanup for the invocation document ID.
7. Settle the tracked chain; existing workspace tracking removes it.

If the version differs, the action reports `Saved the earlier version. Newer changes remain open.` and returns without marking saved, setting dirty false, or clearing recovery. Rejection retains `The file could not be saved. Your edits are still open.` and leaves the saved baseline and source untouched. Cleanup's own existing warning/catch behavior remains in the recovery hook; it was not merged with Save As or rewritten.

## Characterization evidence

Seven new tests run against production before and after extraction:

- Exact direct-save payload; no mark/clear before disk completion; buffer marked saved before cleanup; exact clean/status result. A held cleanup keeps Close Document blocked and native-window save-close waiting, without dispatching another save, until cleanup settles.
- Edit during pending save writes earlier source, leaves newer editor/buffer dirty, does not advance saved baseline, preserves recovery, and reports the exact newer-edit message.
- Save failure retains editor text, dirty state, saved baseline and recovery. Subsequent save-close succeeds, demonstrating failed tracking was removed.
- A held old A completion delivered after activation and editing of B cannot mark B saved or clear recovery. The source/version identity guard is tested via the actual workspace buffer.
- Cleanup already started for A continues targeting only the captured A ID after B activation; B edits remain dirty.
- Two direct saves overlap without added serialization. The controlled harness delivers the newer completion first, then the older one. Existing behavior remains: the older completion emits the newer-edit message, does not mark/clear again, and does not set dirty back to true after the newer save already cleared it. The fake disk records writes in controlled completion order. This characterizes renderer behavior under a forced schedule, not a claim that native filesystem writes complete in that order; no concurrency repair was bundled into this extraction.
- A deliberate buffer-only advancement without React source update isolates the mixed capture contract: keyboard Save sends the render source but captures the current invocation version and checks the live version at completion. This artificial probe is separate from normal editor-update scenarios and prevents replacing the explicit captures with a generic latest-state getter.

The identity-transition completion test holds the renderer API promise directly because FakeDesktop resolves its authorized path when its scheduled operation is released. It does not use that fake's cross-document disk behavior as evidence about native filesystem authorization.

Existing keyboard-save and workspace-keyboard suites verify Cmd/Ctrl+S, latest committed save closure, repeat/modifier behavior, and successive saves after editing. Existing recovery-clear/write, window-close, Close Document, Save As and identity suites remain unchanged and pass.

## Source comparison

An executable source comparison against `2158b5c:src/App.tsx` passed:

- App equals the baseline with only the import and direct-save promise-chain replacement.
- Ignoring indentation, the moved chain differs only in `buffer.snapshot().version` becoming `readCurrentVersion()` and `buffer.markSaved()` becoming `markSaved()`.
- The live version check stays inside the completion callback, and the cleanup remains awaited inside the tracked chain.
- Invocation ID/version capture statements, render source use, `trackSave`, keyboard save layout assignment, and Save As are otherwise byte-for-byte unchanged.
- Recovery hooks, Download copy, save eligibility, close protocols, metadata, identity ownership, preload/main, IPC and filesystem implementation were not modified.

No new lifecycle ownership or broader coupling was introduced. The explicit render/invocation/live capture distinction and cleanup-inclusive promise settlement are the intended crossing dependencies.

## Verification

| Check | Before extraction | After extraction |
| --- | --- | --- |
| Targeted nine suites | 66 passed | 66 passed |
| Full `npm test`, 54 files | 331 passed, 70 TODO | 331 passed, 70 TODO |
| `npm run build` | PASS | PASS |
| `npm run lint` | Exit 0; 30 warnings | Exit 0; 30 warnings |
| `git diff --check` | PASS | PASS |
| Packaged macOS arm64 save/close smoke | PASS | PASS |

Lint counts remain exactly the accepted baseline: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No new category, suppression, configuration change, or lint cleanup occurred.

Logs: `/private/tmp/step14-{before,after}-{targeted,tests,build,lint}.log`.

## Packaged verification scope

The accepted Phase 1 Step 14 roadmap requires packaged close evidence. Before and after extraction, the current build was packaged with `electron-builder --mac --dir --arm64` and tested with the unchanged `scripts/test-window-close-packaged.mjs`:

- Packaged `file://` launch without a dev server.
- Separate Save / Download copy controls and expected enabled states.
- Real export preserves the original and dirty state.
- Toolbar direct Save writes the native file and marks clean.
- Dirty native BrowserWindow close, Cancel, and duplicate close request handling.
- Save through existing IPC followed by final native close.
- Clean close without dialog.
- Discard closes, preserves disk, and clears recovery.

Logs: `/private/tmp/step14-{before,after}-package.log` and `/private/tmp/step14-{before,after}-packaged-close.log`. The initial sandbox package attempt failed on GitHub DNS; the permitted retry succeeded. Local packages are unsigned because no signing identity is installed. The test injects dialog responses and uses a temporary profile. Physical OS dialog interaction, assistive technology, Windows, and Linux were not tested; no public-release readiness claim is made.

Intended observable behavior change: **none**. Step 15 appears ready for its separately authorized Save As characterization and extraction; none of that work has begun.
