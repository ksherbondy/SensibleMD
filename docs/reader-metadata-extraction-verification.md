# Step 16 reader metadata characterization — hydration gate conflict

Current status: hydration repair `f330461` is accepted and the remaining Step 16 characterization gate is complete in `83325f8`: 110 targeted passes, 378 full-suite passes (70 TODO), build/diff check PASS, 30 unchanged lint warnings, and packaged metadata restoration plus save/close PASS. See [completed characterization report](reader-metadata-characterization-verification.md). Step 16 extraction remains paused pending explicit authorization; Step 17 remains unauthorized.

The following is the historical pre-repair stop report for characterization `4deba49`; production was unchanged from `690d248` when this evidence was recorded.

## Blocking observation

The authorization requires both no observable behavior change and no ordinary metadata persistence before reader hydration is ready. Existing production does not have that ordinary-write readiness gate. The Phase 1 audit already records this under its risk register: “Desktop metadata debounce does not wait for hydration readiness; fields have different hydration guards” (`docs/app-refactor-phase-1.md`). This is an existing behavior mismatch with the requested gate, not an extraction regression.

The current ordinary effect in `src/App.tsx` looks up `saveDocumentState` during setup and returns only when `closing` is true or the API is unavailable. It schedules a **500 ms** timer. `readerStateReady` is neither checked nor present in its dependency array. It therefore dispatches a metadata payload while the separate load promise is unresolved. By contrast, Close Document explicitly checks readiness and refuses to close during the same unresolved load.

A held-load reproduction against unchanged production proves:

1. Reader-state loading begins and its promise remains unresolved.
2. Close Document reports exactly `Reader state is still loading. Try closing again when it finishes.`
3. At 499 ms, no ordinary save has fired.
4. At 500 ms, one save fires, in both normal and StrictMode runs.
5. Its payload contains `documentId: 'welcome-document'`, empty bookmarks/active heading, undefined position and current default preferences (100, 1.72, 760, false).

The two new tests assert the requested absence of writes and fail for exactly this one premature save. They are not skipped, marked TODO or weakened. The selective timer harness controls only the 500 ms timer; hydration is held through the existing fake API, and all other timers remain real. Cleanup unmounts before resolving the held promise.

Writing current unhydrated values can threaten saved reader metadata. This reproduction proves premature dispatch, not a packaged on-disk loss scenario or every possible load/write race.

## Files and verification

- `src/test/reader-metadata.test.tsx`: two failing hydration-gate reproductions, normal and StrictMode.
- `docs/reader-metadata-extraction-verification.md`: this report.

| Check | Result |
| --- | --- |
| Isolated new characterization | 2 failed, expected mismatch reproduced |
| Targeted 12 suites | 82 passed, 2 failed |
| Full `npm test`, 58 files | 350 passed, 2 failed, 70 TODO |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, 30 warnings, unchanged categories |
| `git diff --check` | PASS |
| Production comparison with `690d248` | No diff in App, core, Electron or scripts |
| Packaged verification | NOT RUN: stopped at pre-extraction gate |

Targeted coverage includes reader metadata, reader-state payload, reader settings, Close Document, window-close, recovery-write, workspace-recovery, identity, position continuity, navigation stale/red/observation. All existing cases passed.

Lint remains 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No suppression or configuration change.

Logs: `/private/tmp/step16-hydration-gate.log` and `/private/tmp/step16-gate-{targeted,tests,build,lint}.log`.

## Preserved scope and outstanding work

No hook/module interface was created. No state or ref moved. `pendingReaderWrites`, readiness, closing state, hydration and the final Close Document flush all remain in the workspace. Ordinary metadata still precedes recovery write, recovery load and external-change subscription. No effect, dependency, payload, error string, tracking operation, save/close protocol or source behavior was changed.

The existing dependency list remains: activeDocumentId, activeHeading, activeNodeId, bookmarks, fontScale, lineHeight, contentWidth, reducedMotion, source, closing. The existing timer constructs the payload through `createReaderStatePayload`, catches failure with `Desktop settings could not be saved. Your document remains open.`, adds the caught promise to the pending set and removes it in finally. Close Document still drains that set, rechecks validity, flushes the final payload and rechecks validity again. These are source observations, not a claim that the remaining requested Step 16 characterization has been completed.

Remaining debounce restart/unmount, dependency matrix, held-write settlement, document-switch hydration, final-flush races and remount cases were not added after finding this blocker. Packaged metadata close/reopen verification was not attempted. The existing packaged native-close script does not establish the full requested reader-state restoration gate, and no harness expansion was made.

There is no extraction commit or extraction equivalence claim. Intended extraction behavior change remains none; production behavior is unchanged. Step 16 requires review of this conflict before proceeding: preserving current behavior would mean accepting the absence of an ordinary hydration gate, while adding the requested gate requires a separately authorized behavioral repair. No repair was attempted. Step 17 is not ready to begin and remains unauthorized.
