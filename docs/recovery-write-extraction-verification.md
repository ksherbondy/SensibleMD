# Step 13 recovery-write extraction — complete

Status: **Step 13 complete**. Production extraction commit: `ecaeb43c6f7744e921f5e5ecfdd880a8cd4daf61`. Characterization commit: `2c5e086`. The natural lint reduction is reviewed and accepted; **30 warnings is the baseline for subsequent work**. Step 14 remains unauthorized and has not begun.

Starting baseline: accepted Step 12 extraction `6930c04` and report `931559b`. The production extraction is independently revertible and separate from characterization.

## Characterization

`src/test/recovery-write.test.tsx` adds 11 cases against the unchanged production effect. A selective test clock controls only `window.setTimeout` calls requesting 1,500 ms; other workspace/editor/user-event timers use their real scheduler. Production timing is not modified.

Evidence covers:

- Clean gating, dirty scheduling, no call at 1,499 ms and one call at exactly 1,500 ms.
- Later edits cancel the old timer and restart the delay with the new version/source.
- A deliberate buffer-only advancement without React rerender proves that an already scheduled write uses its captured snapshot, not a later buffer read. Ordinary edit/reschedule behavior is tested separately.
- Switching from dirty A to clean B cancels A's timer; editing B independently schedules B's ID/version/source.
- Matching discard ID/version suppresses a write; differing version does not; differing document does not. An additional case isolates differing ID with the same version by invoking the existing workspace discard consumer with a held clear response; no production ref is exposed or replaced.
- Held recovery writes do not enter normal save tracking: the existing window-close discard flow can finish while a recovery write remains unresolved.
- Write failure reports the exact existing status, leaves dirty source intact, performs no normal file save, and preserves an already-visible recovery notice.
- StrictMode mounts do not duplicate writes; actual unmount clears the pending timer, and a remounted clean workspace schedules only after becoming dirty.

Existing recovery-clear, workspace-recovery, document-notices, window-close, close-document, Save As, and identity suites also run. No accepted tests were weakened. During test development, build caught browser/Node timer overload typing and spy-context typing issues; the helper now declares the browser timer surface and checks the buffer instance. Those corrections pass build and the tests before production extraction.

## Final boundary

Production changes are limited to `src/App.tsx` and `src/core/use-workspace-recovery.ts`.

The module gains a third top-level hook, `useWorkspaceRecoveryWrite`, called in place of the old write effect. This preserves its position between reader metadata persistence and recovery loading; neither previously accepted recovery hook moves.

Inputs:

- `activeDocumentId: string`
- `isDirty: boolean`
- `source: string`, retained as the edit-driven dependency
- `readRecoverySnapshot: () => { text: string; version: number }`
- `windowDiscard: RefObject<{ documentId: string; version: number } | null>`
- `setAppStatus: (status: string) => void`

App supplies `useCallback(() => buffer.snapshot(), [buffer])` as the snapshot reader. The hook never owns or receives DocumentBuffer. The callback is invoked inside effect setup, not render or timer completion. `windowDiscard` remains the original workspace-owned ref, read live at timer completion. Window-close ownership is unchanged.

The old dependencies `[activeDocumentId, buffer, isDirty, source]` map to `[activeDocumentId, readRecoverySnapshot, isDirty, source, windowDiscard, setAppStatus]`. The reader's identity depends only on the same buffer identity; the added ref and React state setter have stable workspace-lifetime identities. Thus edits, identity/dirty changes, cleanup and re-registration retain their existing behavior; fresh callback identity is not introduced on each render. Mutating `windowDiscard.current` does not trigger rescheduling.

## Source comparison

An executable comparison against characterization commit `2c5e086` passed:

1. The effect body is verbatim except `buffer.snapshot()` becomes `readRecoverySnapshot()` and the dependency mapping described above.
2. Dirty/API availability checks, synchronous snapshot capture during effect execution, 1,500 ms delay, captured ID/version/text payload, live discard predicate, exact error string, and `clearTimeout` cleanup are unchanged.
3. App equals the baseline after only adding imports and replacing the write effect at its existing location with the memoized reader and hook call.
4. The prior recovery module is a byte-for-byte unchanged prefix of the extended module; load/context/revision/clear/notice behavior is untouched.
5. All save, Save As, pending-save tracking, close, window-close, identity, navigation, metadata, and restore code is unchanged. No Step 14 code moved. No preload/main/schema/storage changes occurred.

Recovery writes remain fire-and-forget outside normal pending-save tracking. The error remains `Recovery snapshot could not be saved. Your document remains open.` No new cancellation or pending-write abstraction was introduced.

## Verification

Before extraction: eight targeted suites **58 passed**; full suite **324 passed, 70 TODO, 53 files**; build PASS after test helper typing corrections; lint exits 0 with 32 warnings. The final corrected test helper separately passed all 11 cases.

After extraction: eight targeted suites **58 passed**; full suite **324 passed, 70 TODO, 53 files**; build PASS; lint exits 0 with 30 warnings; `git diff --check` PASS.

Final verification immediately before committing reproduced **58 targeted passes; 324 full-suite passes, 70 TODO, 53 files; build PASS; lint exit 0 with exactly the accepted 30 warnings; diff check PASS**. Source comparison was also rerun successfully. Final logs: `/private/tmp/step13-final-{targeted,tests,build,lint}.log`. Earlier evidence: `/private/tmp/step13-{before,after}-{targeted,tests,build,lint}.log` and `/private/tmp/step13-final-characterization.log`.

Packaged verification: **NOT RUN**. No native dependency was exposed; the bridge harness and controlled recovery timers establish the scoped protocol. No manual platform claims are made.

## Accepted lint baseline

| Category | Previous baseline | Accepted Step 13 baseline |
| --- | ---: | ---: |
| `react(refs)` | 14 | 12 |
| `react-hooks(exhaustive-deps)` | 8 | 8 |
| `react(set-state-in-effect)` | 6 | 6 |
| `eslint(no-unused-vars)` | 3 | 3 |
| `eslint(no-unused-expressions)` | 1 | 1 |
| Total | 32 | 30 |

The two removed diagnostics were attached to the original write effect dependency array at baseline `src/App.tsx:615`, columns 25 and 6. That array directly included `buffer`, derived from `bufferRef.current`. After extraction the effect depends on the narrow memoized reader, and those two render-ref diagnostics disappear. The underlying buffer ownership and capture timing are unchanged; this is a natural diagnostic change at the boundary, not a separate ref-correctness repair. All other category counts are unchanged; there is no new category or warning increase.

No lint suppression, configuration change, dummy reference, warning-count restoration, or unrelated cleanup was used. The user explicitly accepted the 30-warning result as the new baseline. No removed diagnostic was artificially recreated.

Intended observable behavior change: **none**. The only boundary detail beyond the moved effect is stable snapshot-reader identity replacing buffer identity in dependencies. No broader lifecycle coupling was discovered.

Step 14 has not begun and remains unauthorized. It appears ready for its own bounded direct-save characterization and review now that Step 13 is complete; this does not establish its gates or authorize implementation.
