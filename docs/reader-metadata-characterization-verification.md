# Step 16 reader metadata characterization gate

Status: **remaining characterization gate complete**; reader metadata extraction remains paused pending explicit authorization. Step 17 remains unauthorized. Dedicated characterization commit: `83325f8`.

Accepted production is hydration repair `f330461`, preceded by initial hydration characterization `4deba49` and repair characterization `160ea9f`. No production source changed during this gate. See [accepted repair evidence](reader-metadata-hydration-repair-verification.md).

## Files changed

- `src/test/reader-metadata.test.tsx`: 19 additional tests; file now has 28 tests. The two phase-based close tests each exercise three independent invalidators in fresh workspaces.
- `scripts/test-window-close-packaged.mjs`: 25-line metadata persistence/restoration sequence using existing renderer/native debugger, temporary profile and polling helpers. Existing save/close checks remain.
- This report and the current-status pointer in `docs/reader-metadata-extraction-verification.md`.

No `use-reader-metadata.ts` was created. No effect, ref, state, payload builder, hydration, close flush or pending-write operation moved. A comparison with `f330461` shows no production diff in App, core or Electron.

## Dependency and debounce matrix

The unchanged ordinary-write dependency array is activeDocumentId, activeHeading, activeNodeId, bookmarks, fontScale, lineHeight, contentWidth, reducedMotion, source, closing, readerStateReady.

| Dependency | Executable evidence |
| --- | --- |
| activeDocumentId | Accepted A→B held-hydration case cancels A's pending timer, blocks B and then writes B at its own 500 ms boundary. New dispatched-A case completes A after B already persisted and checks both distinct stored payloads/IDs. |
| activeHeading | First→Second before expiry cancels the old handle and saves Second only. |
| activeNodeId | Moving the editor to the first paragraph changes the semantic position while active heading stays First. It restarts the timer and persists the paragraph node. |
| bookmarks | Bookmarking First cancels the old handle and persists `[first]` once. |
| fontScale | Changing to 130 restarts the timer and persists 130 once. |
| lineHeight | Changing to 2.2 restarts the timer and persists 2.2 once. |
| contentWidth | Changing to 920 restarts the timer and persists 920 once. |
| reducedMotion | Toggling true restarts the timer and persists true once. |
| source | An external source update changes First to Other while the heading/node ID stays the same. The restarted write projects the new `heading:other` fingerprint through the existing payload helper. |
| closing | Close cancels a pending ordinary timer, schedules no ordinary write while draining or flushing, and resets scheduling on failure. |
| readerStateReady | Accepted held/fast/success/null/failure and StrictMode cases remain unchanged and pass: no unresolved-load writes; one fresh 500 ms timer after readiness. |

For each of the eight restart cases, the prior timer is advanced 400 ms, the dependency changes, and the old timer handle disappears. There is one replacement timer, no write at the old boundary, no write at 499 ms after the change, exactly one at 500 ms, and no duplicate after another 1,000 ms. No production timing or dependencies were adjusted for testing.

## Pending writes and close protocol

Two resolve/reject tests observe the exact promise returned by the existing ordinary `.catch` and its Set registration. It is registered in one set, remains present while held, and is removed after settlement. It is not registered a second time in normal `pendingSaves`. Rejecting reports exactly `Desktop settings could not be saved. Your document remains open.`

Separate held-write close cases, for both resolution and rejection, prove:

1. The ordinary timer dispatches one write, which remains held.
2. Navigation, bookmarks and every reader preference are changed before close.
3. Close disables the Close Document control and cancels the newly pending ordinary timer. It does not report the normal pending-save refusal.
4. Advancing time cannot dispatch another ordinary write or prematurely flush.
5. Once the old write settles, one final flush is invoked with the latest payload, not the old ordinary payload.
6. The workspace remains open while that final flush is held; advancing time creates no duplicate.
7. Final settlement completes close only when validity remains current.

The explicit final payload equals `createReaderStatePayload` for the current document ID, `[second]` bookmarks, Second heading/node/semantic position, 125 font scale, 2.1 line height, 900 content width and reduced motion true. It differs from the held ordinary payload. Existing switched-document payload tests also verify native document identity and paragraph position in both ordinary/final paths.

## Validity checks, failures and lifetimes

| Contract | Evidence |
| --- | --- |
| First validity check | While close drains an ordinary write, independently change navigation, edit source so it becomes dirty, or advance the buffer version while marking it clean. Releasing the old write does not dispatch a final flush; the document stays open and closing resets. |
| Second validity check | Repeat each independent invalidator while the final flush is held. Releasing it cannot close; newer location/text survives and the close control is enabled again. |
| Clean-version isolation | Test-only direct buffer replace with identical text followed by markSaved advances the version without React source/navigation or dirty changes, specifically exercising the version comparison. No production buffer behavior changed. |
| Final-flush failure | Exact `Reader state could not be saved. The document is still open.` status, enabled close control, resumed ordinary scheduling, and successful later close retry. |
| Ordinary failure interaction | A direct disk save is independently held while source is dirty and recovery exists. Close first reports its dirty refusal; metadata rejection then reports its exact existing status, preserving dirty text and recovery. Disk completion subsequently reports Saved and permits close. This characterizes existing shared-status ordering; it does not introduce isolated status ownership. |
| Dispatched A after B | Delay the actual fake persistence of A's captured payload, activate B and persist B, then release A. Both stored entries retain their own exact payload/ID and B remains active and clean. |
| Unmount/remount | For both old success and old rejection, unmount after dispatch and mount a fresh StrictMode workspace with B text/name. Old settlement does not change B status/text/name/dirty state. The new lifecycle dispatches exactly once at its own 500 ms boundary. |
| StrictMode | Existing unresolved/completed hydration and timer-unmount cases remain; remount cases additionally show replay does not duplicate writes. |

The dirty-source cases naturally invalidate more than one guard. The clean-version case separately proves that the version check still rejects a clean buffer version change. The remount cases exercise a new workspace lifetime even when using the same welcome identity, while the A→B case independently establishes distinct document-ID association.

The tests do not cancel already-dispatched writes on document switch or unmount. Existing writes may settle; captured payload identity and old component state ownership are preserved. No queue, serialization or new stale-response mechanism was introduced.

## Packaged metadata persistence/restoration

PASS on a newly packaged local macOS arm64 build, with the existing script extended narrowly:

1. Launches the actual packaged app from `file://`, without a dev server.
2. Opens the native fixture and selects/bookmarks its heading.
3. Sets reader scale 135, line height 2.05, width 880 and reduced motion true through the existing controls.
4. Polls the real `userData/documents/<documentId>.json` until ordinary persistence records all values, bookmark and semantic position. Verifies document ID and position/heading/bookmark agreement **before close**.
5. Uses Close Document to return Home, clears browser localStorage in the temporary profile, and reopens the same native file.
6. Verifies restored identity, all preferences, selected heading and bookmark from native persistence. Clearing browser storage prevents it from substituting for native restoration.
7. Runs every existing Save As, download, direct-save, native close/cancel/duplicate, clean-close and discard/recovery check unchanged.

Commands: `npx electron-builder --mac --dir --arm64`, then `node scripts/test-window-close-packaged.mjs`. Both exit 0; **12 PASS checks**. The 45-second deadline and existing infrastructure remain unchanged. No production IPC or persistence was mocked; native dialog responses remain injected as in the existing harness.

Limits: this establishes document close/reopen restoration in the same running app, not full process restart recovery. It does not reproduce held hydration in the packaged app. Physical dialogs, assistive technology and Windows/Linux are NOT TESTED. The package is unsigned and is not release certification. No packaged restoration defect was observed.

## Final verification

| Check | Result |
| --- | --- |
| Reader metadata file | 28 passed |
| Targeted 12 suites | **110 passed** |
| Full `npm test`, 58 files | **378 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0; **30 warnings**, unchanged categories |
| `node --check scripts/test-window-close-packaged.mjs` | PASS |
| `git diff --check` | PASS |
| Packaged metadata + existing save/close smoke | PASS, 12 checks |
| Production compared with `f330461` | Unchanged |

Targeted suites: reader metadata, reader-state payload, reader settings, Close Document, window-close, recovery-write, workspace-recovery, identity, position continuity, navigation stale/red/observation. StrictMode and lifecycle cases are included.

Lint: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No new category, suppression or configuration change.

Logs: `/private/tmp/step16-complete-{new,targeted,tests,build,lint,package,packaged}.log`.

## Authorization boundary

The requested Step 16 characterization gate is complete on the accepted hydration-repair baseline. No pending-write, close-flush, stale-association, hydration, lifecycle or packaged restoration defect was observed in these cases. Source comparison and characterization support authorizing a bounded reader metadata extraction that preserves the current dependency list, setup-time API lookup, timer-time payload construction, tracking settlement and existing final close protocol.

This is evidence for an authorization decision, not verification of an extraction. Production observable behavior change: **none**. Reader metadata extraction remains paused until explicitly authorized. Step 17 has not begun and remains unauthorized.
