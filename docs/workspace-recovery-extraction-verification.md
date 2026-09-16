# Step 12 recovery extraction verification

Status: **Step 12 remains paused pending explicit authorization.** The separate recovery-notice lifetime repair is accepted and committed as `5c4f7f6bbc2be1476bf9bcedac8e8582ce11859a`. See [repair verification](recovery-notice-lifetime-repair-verification.md). Its final checks pass: 47 targeted tests, 313 full-suite tests with 70 TODO, build and diff check. **32 warnings is the accepted lint baseline for subsequent Step 12 work** (14 refs, 8 exhaustive-deps, 6 set-state-in-effect, 3 no-unused-vars, 1 no-unused-expressions). Step 13 has not begun.

The sections below preserve the historical extraction attempt and pre-repair evidence. Their failing-test totals, uncommitted state, and unchanged-production statements describe that earlier checkpoint, not the accepted repair. The notice-scoping blocker described below has been repaired; extraction itself is still unauthorized.

Production baseline: `9cbe3fe` (accepted Step 11). Characterization commit: `3e1a752`. No extraction commit was made. The uncommitted production extraction was removed after the additional notice-scoping case failed; `src/App.tsx` is byte-for-byte equal to the production baseline, and `src/core/use-workspace-recovery.ts` is absent.

## Blocking evidence

The original Step 12 gate requires recovery notice state to remain scoped to the correct document. The new case `does not retain A recovery notice after activating B without recovery` reproduces the contrary on unchanged production:

1. Open native A with persisted recovery whose source differs from A's disk text.
2. Observe A's recovery notice.
3. Open native B, which has no recovery.
4. Confirm the active identity is B and the live persisted renderer source is `# Disk B`.
5. A's recovery notice, including Restore and Discard controls, remains visible. The assertion that the notice is absent fails.

The failure was reproduced both in the temporary extraction and again after removing all production changes. It is an existing defect, not evidence that extraction changed behavior. Log: `/private/tmp/step12-baseline-notice-scope.log` (six passing cases, one failing case).

Source-backed cause: the layout effect replaces `recoveryContext.current` on identity change but does not reset `recoverySnapshot`. The load effect sets the notice only for a truthy, differing snapshot; B's null response does not clear A's existing notice. Native activation updates the existing workspace. Thus stale-response guards protect future load completions but do not invalidate an already-visible notice.

Source-backed risk: Restore reads the retained snapshot and writes it into the currently active buffer/document; Discard uses the currently active document ID. These actions can therefore refer to different document identities than the stale notice. The reproduction stops before clicking those controls; no disk overwrite is claimed.

This is a behavior correction, outside a behavior-preserving extraction. No reset, identity guard, status change, or test weakening was introduced to force Step 12 through. Review a separately scoped notice-lifetime repair before resuming extraction.

## Characterization completed and remaining

Committed in `3e1a752`:

- Six new cases in `src/test/workspace-recovery.test.tsx`: initial same-source suppression; comparison with live text after edits during a held load; successful direct-save clear invalidating an earlier load; A→B→A obsolete-load rejection within one workspace; Save As cleanup of the captured old identity preserving the new active notice; StrictMode setup/cleanup/setup, actual unmount/remount, and switch while old loads remain held.
- Opt-in StrictMode rendering in `src/test/scenario.tsx`.
- Exact full cleanup-failure status assertion in `src/test/recovery-clear.test.tsx`.
- This verification report.

Existing document-notices tests establish held A load after B activation, load failure without source mutation, and discard failure/retry with exact status. Existing recovery-clear, close-document, window-close, Save As and identity suites retain their lifecycle coverage.

The first StrictMode draft expected B activation to remount the workspace. Unchanged production instead updates it, adding one load. The expected total was corrected from six to five while retaining every obsolete-response assertion; each initial StrictMode mount still asserts two loads.

The already-visible-notice transition was missed in the initial characterization pass and added during the final gate audit. That gap is now captured by the failing test, left uncommitted for review rather than reporting a complete characterization gate. The only pending changes are that regression test and this report.

## Approved two-hook boundary and ordering

The user accepted the original ordering stop and authorized two top-level hooks in one module:

- `useWorkspaceRecovery({ activeDocumentId, setAppStatus })` at the original context/state location (`App.tsx:288`). Owns the sole context ref, reset layout effect, notice state, and clear/saved-cleanup/discard helpers; returns the context, notice/setter, and three operations.
- `useWorkspaceRecoveryLoad({ activeDocumentId, recoveryContext, setRecoverySnapshot, readCurrentSource, setAppStatus })` at the original recovery-load location (`App.tsx:623`). Owns only the existing passive load effect. The temporary implementation retained existing narrow preload lookups at their original execution times.

The temporary extraction preserved both call positions and left intervening effects in place, but it is not retained or claimed complete. In the final working tree, all effect ordering, the shared live context used by window-close, and the 1,500 ms write debounce remain literally unchanged because there are no production edits.

The buffer, dirty authority, active identity, save/Save As, restore mutation, navigation, activation, close lifecycle, `windowDiscard`, write suppression, preload and main remain workspace-owned or in their original modules. No runtime dependencies, lint suppressions, or lint configuration were added.

## Verification

Before discovering the missing gate case, both unchanged production and the temporary extraction passed 45 targeted tests across seven files and 311 full-suite tests with 70 TODO across 52 files. Builds passed. Both lint runs exited 0 with the same 31-warning category counts. These passes do **not** establish completion of Step 12.

Final runs with the failing notice-scoping regression retained and original production restored:

- Targeted recovery/notice/close/window-close/Save As/identity: 45 passed, 1 failed.
- Full `npm test`: 311 passed, 1 failed, 70 TODO.
- `npm run build`: PASS.
- `npm run lint`: exit 0; 31 warnings, unchanged categories: 14 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 5 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`.
- `git diff --check`: PASS.
- Packaged verification: NOT RUN. The bridge harness reproduces the blocker without a native dependency.

Logs: `/private/tmp/step12-final-{targeted,tests,build,lint}.log`.

Intended observable behavior change remains none; production behavior is unchanged. Step 13 is not ready to begin: Step 12's notice-scoping gate requires review and resolution first.
