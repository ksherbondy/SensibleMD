# Ordinary reader metadata hydration-gate repair

Status: **repair complete**, dedicated production commit `f330461`. Step 16 extraction remains paused. Step 17 remains unauthorized.

## Root cause and exact correction

Accepted production `690d248` scheduled ordinary reader metadata persistence while its load was unresolved. The write effect checked closing/API availability, but neither checked `readerStateReady` nor depended on it. Default or otherwise unhydrated values could therefore be dispatched at 500 ms. Initial characterization `4deba49` reproduced this in normal and StrictMode runs.

The production repair changes only two lines in the existing App effect:

```diff
- if (closing || typeof saveState !== "function") return;
+ if (!readerStateReady || closing || typeof saveState !== "function") return;
```

and adds `readerStateReady` to its dependency array.

Readiness retains its existing meaning: loading starts not-ready; the existing current-load `.finally` sets ready after success (including null) or failure. The ordinary effect is now eligible only when ready, not closing and the API exists. Eligibility starts the same **500 ms** debounce with the current rendered values. Completion does not synchronously flush, add a timer type or create a pending-hydration abstraction.

## Lifecycle and payload evidence

| Case | Evidence |
| --- | --- |
| Held hydration | Original normal/StrictMode assertions retained: no write at 499 ms or 500 ms. Strengthened with another 5,000 ms held interval and still no write. Close Document reports the unchanged loading status. |
| Hydration completion | In normal and StrictMode cases, hydration is held for 2,000 ms before release. One timer is then pending, with no immediate save; 499 ms produces none, the next millisecond produces exactly one write, and another 1,000 ms produces no duplicate. |
| Hydrated values | First write equals `createReaderStatePayload` for loaded bookmarks, second heading/active node and semantic model, fontScale 125, lineHeight 2.1, contentWidth 900 and reducedMotion true. The visible selected heading is Second, and the document remains clean. |
| A→B | A's timer is pending at 400 ms. Native open activates B and holds B hydration. No ordinary timer remains after effects settle; another 5,000 ms produces no write. B's loaded values then produce exactly one B payload at 500 ms, never an A payload relabeled as B. |
| Fast hydration | Null load resolves after 100 ms. No write occurs at the original 500 ms boundary or at 499 ms after readiness. Exactly one occurs 500 ms after readiness, without later duplicate. This isolates readiness from other hydrated-state changes. |
| Load failure | Held load rejects after 100 ms. Exact status remains `Desktop settings are temporarily unavailable. Restart the desktop app to reconnect.` Existing finally enables one ordinary write at 500 ms after readiness. Dirty stays false and subsequent Close Document succeeds; no permanent lockout. |
| StrictMode/unmount | Held and completed loads are exercised with lifecycle replay. No duplicate post-hydration writes. Actual unmount at 499 ms cancels the eligible timer in normal and StrictMode runs; advancing time afterward produces no write. |
| User navigation during hydration | Existing payload case still proves newer navigation to Second is retained while loaded bookmarks/preferences apply independently. Only its expectation of a premature write was changed for this authorized repair; final payload and close-flush equality assertions remain. |

The additional characterization was committed **before production changes** as `160ea9f`. Against unchanged production, the two metadata/payload suites had **7 passed, 8 failed**. Failures showed premature writes, B retaining an ungated timer, and fast/failing hydration using the old timer boundary. Both new unmount cases already passed before repair. After repair, all **15 tests** in those two files pass.

The older payload test explicitly characterized the buggy pre-hydration write. Its pre-hydration expectation was updated to assert no write after a real 550 ms wait. This is an intentional test contract change for the authorized repair, not removal of its navigation/bookmark/preference/close assertions. The initial failing normal/StrictMode regression tests remain.

## Ordering and retained ownership

Executable comparison against `690d248` constructed the expected App file with only the guard replacement and dependency insertion and asserted exact equality with the working file. PASS. No other production file changed.

The metadata effect remains after loading and before recovery write, recovery load and external-change subscription. On a document change, the unchanged load effect sets readiness false. The dependency update causes ordinary-effect cleanup to cancel any timer from the preceding render; the A→B test proves no timer survives the settled not-ready transition. B's current load completing makes its ordinary write eligible. No load restructuring or new identity/lifetime authority was necessary.

All other dependencies remain unchanged: activeDocumentId, activeHeading, activeNodeId, bookmarks, fontScale, lineHeight, contentWidth, reducedMotion, source and closing. API lookup remains at setup; payload creation remains inside the timer. The payload format, pending-reader-write add/remove operations, failure catch and exact ordinary-save error string remain byte-for-byte unchanged.

`closeDocument` is unchanged: it refuses not-ready state with `Reader state is still loading. Try closing again when it finishes.`, drains earlier pending reader writes, rechecks navigation/version/dirty validity, explicitly flushes final metadata, rechecks validity and then completes. Closing still cancels ordinary scheduling. Its existing held-write and final-flush tests pass.

Save/Save As, recovery, window-close, buffer, navigation, identity/session, native code, IPC, commands and persistence formats remain unchanged. No hook/module extraction, state/ref move, scheduler, queue, suppression or configuration change occurred.

## Files and commits

- `src/test/reader-metadata.test.tsx`: strengthened held-hydration cases and seven additional completion/switch/fast/failure/unmount cases.
- `src/test/reader-state-payload.test.tsx`: adjusts the one expectation tied to the now-authorized behavior change; keeps resulting-state and final-flush checks.
- `src/App.tsx`: readiness guard and dependency only.
- This report and the historical Step 16 report's current-status pointer.

Initial characterization: `4deba49`. Additional repair characterization: `160ea9f`. Dedicated production repair: `f330461`.

## Verification

| Check | Result |
| --- | --- |
| Metadata/payload focused gate | 15 passed |
| Targeted 12 suites | 91 passed |
| Full `npm test`, 58 files | 359 passed, 70 TODO |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, 30 warnings |
| `git diff --check` | PASS |
| Source comparison | Only the two authorized App changes |
| Packaged macOS arm64 regression smoke | PASS, 11 checks |

Targeted suites: reader metadata, reader-state payload, reader settings, Close Document, window-close, recovery-write, workspace-recovery, identity, position continuity and navigation stale/red/observation. Normal and StrictMode cases run within this gate.

Lint categories exactly match the accepted baseline: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`.

Logs: `/private/tmp/metadata-repair-{before,after,targeted,tests,build,lint}.log`.

Packaged regression verification used `npx electron-builder --mac --dir --arm64` followed by the unchanged `node scripts/test-window-close-packaged.mjs`. Both exited 0. All 11 existing checks passed, including file:// launch, Save As cancellation and newer-edit adoption, subsequent direct Save, native save-close, download, clean close and discard/recovery. Logs: `/private/tmp/metadata-repair-package.log` and `/private/tmp/metadata-repair-packaged.log`.

This smoke is regression evidence for the existing native save/close workflows, **not** a packaged held-hydration or reader-metadata close/reopen test. The specific readiness/timing evidence is from renderer characterization. The package is unsigned; physical native dialogs, assistive technology and Windows/Linux were not tested. No harness changes or release-readiness claim.

## Scope and next gate

Intended observable behavior change: ordinary desktop reader metadata is no longer written while active-document hydration is unresolved; it resumes 500 ms after readiness with the resulting current state. Load failure still permits persistence once the existing finally marks ready. No other observable behavior change is intended.

The repaired baseline is ready for review and, once explicitly authorized, continuation of the **full Step 16 characterization gate**. This repair does not claim that gate is complete. Step 16 extraction remains paused, and Step 17 has not begun.
