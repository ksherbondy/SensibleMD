# Step 15 Save As characterization — existing defect blocks extraction

Status: **STOPPED before production extraction** under the explicit existing-bug stop condition. Characterization commit: `3e3bfb0`. No extraction commit exists. Step 16 has not begun.

Accepted production baseline remains Step 14 `5e9f5f9` (report `31f4022`). No production source was changed, no extraction experiment was attempted, and no repair was made. The accepted direct-save action remains untouched.

## Reproduced defect

A held Save As completion for collection chapter A can overwrite the active identity/session/name after the reader switches to chapter B. It also replaces A's collection source with B's live text.

`src/test/save-as-stale-completion.test.tsx` reproduces the issue in normal and StrictMode runs against unchanged production:

1. Import collection chapters A (`# A`) and B (`# B`).
2. Invoke Save As for A. Assert the native API receives exactly `{ name: 'A.md', source: '# A' }`, then hold its renderer completion.
3. Switch to B and edit it to `# B newer edits`. Verify B's identity, name and collection membership before delivery.
4. Deliver A's successful Save As response with the returned SavedA identity/session/name.
5. Observe that B's text remains dirty, but active identity/session/name now refer to SavedA rather than B.
6. The collection contains SavedA and B. Switch away and back to SavedA: its in-memory source is now `# B newer edits`, not A's original text.

The tests use soft assertions to retain evidence for all four incorrect results in each run: active document ID, active session, document name, and saved-A collection source. Both tests intentionally remain failing, with no TODO/skip or weakened expectations. They are preserved in the characterization commit as requested.

This is an existing renderer lifetime/ownership defect, not an extraction regression. The buffer is not incorrectly marked clean in this reproduction: version mismatch preserves dirty state. That version check does not protect identity adoption or prevent copying the newly active document's text into the saved document entry.

## Source-backed cause and native boundary

In the current Save As `.then` callback in `src/App.tsx`, `savedDocumentId` and `savedVersion` are captured from A. After completion, `buffer.snapshot()` reads the live shared workspace buffer, which now belongs to B. The collection updater finds A by captured ID but writes `current.text` from B. The callback then unconditionally assigns the returned active document ID, session, direct-save capability and name. No current workspace/document ownership check precedes those operations. Recovery cleanup still targets captured A; the reproduced error is identity adoption and collection content association, not a retargeted cleanup call.

Main-process Save As in `electron/main.cjs` checks whether the authorized native session remains current. A native file activation during the operation can invalidate that guard. The final reproduction deliberately uses renderer collection chapter switching, which changes active renderer identity/buffer without changing the native authorization map. That native session guard therefore does not establish renderer document continuity for this scenario.

The harness holds only the API completion and supplies a valid response shape. It does not claim to reproduce native dialog timing, disk overwrite, or main-process authorization behavior. The established evidence is incorrect renderer identity and in-memory collection content; loss or overwrite on a subsequent save is a data-integrity risk, not a tested disk outcome.

## Verification

| Check | Result |
| --- | --- |
| Targeted eleven suites | 74 passed, 2 failed (new defect reproductions) |
| Full `npm test`, 55 files | 331 passed, 2 failed, 70 TODO |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, 30 warnings; accepted categories unchanged |
| `git diff --check` | PASS |
| Packaged Save As verification | NOT RUN; stopped at the pre-extraction defect gate |

Lint: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No suppression or configuration change.

Logs: `/private/tmp/step15-targeted.log`, `/private/tmp/step15-tests.log`, `/private/tmp/step15-build.log`, `/private/tmp/step15-lint.log`. The isolated reproduction is also recorded in `/private/tmp/step15-stale-baseline.log` (before the additional collection-source assertion).

Changed files: the new stale-completion characterization test and this report only. Existing Save As, direct-save, keyboard, recovery, close and identity tests remain unchanged and pass. No final action interface, extraction source comparison, or packaged equivalence claim is made because extraction did not begin.

## Scope and next decision

Step 15's complete characterization gate is not satisfied. Collision behavior, full unmount/remount completion behavior, and the remaining new Save As cases were not pursued after establishing this blocker. Existing coverage passing is not a substitute for those gates.

A separately authorized repair must define how a successful old Save As result is handled after renderer ownership changes, including collection/source association and returned native identity/session. The native save may already have completed; this cannot safely be reduced to a generic latest-state getter. No repair design or broader lifecycle restructuring is implemented here.

The intended extraction behavior change remains none; current production behavior is unchanged. Step 15 remains paused for defect review. Step 16 is not ready to start and remains unauthorized.
