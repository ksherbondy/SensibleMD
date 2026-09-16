# Step 12 recovery extraction verification

Status: two-hook boundary approved after ordering review; characterization passes against unchanged production. Extraction pending. Step 13 has not begun.

Production baseline: `9cbe3fe` (accepted Step 11). Accepted lint baseline: 31 warnings. Production, lint configuration, preload, and main-process code remain unchanged at the characterization gate.

## Source-backed ordering constraint

The current Step 12 instruction says: “If extraction changes effect ordering, stop.” Inspection of the baseline establishes two distinct registration points in `src/App.tsx`:

1. Lines 288–296: recovery context ref, context-reset layout effect, and recovery notice state.
2. Lines 623–637: recovery-load passive effect, after reader state hydration, reader state persistence, and the 1,500 ms recovery-write effect (lines 604–621).

Between these points, split synchronization, reading observation, page-step measurement, measured pagination, and presentation projection register layout effects. Reader persistence and hydration also register passive effects.

A single ordinary hook call containing both recovery effects cannot retain both registration points. Calling it at the original context location advances recovery loading ahead of the intervening passive effects. Calling it at the original load location delays context reset until after the intervening layout effects. This establishes an ordering change, not an observed runtime defect; no claim is made that either relocation necessarily changes user-visible behavior.

The roadmap requires the recovery layout effect to precede recovery consumers. The current instruction additionally requires preserving the existing effect sequence. Tests passing after relocation would not by themselves authorize relaxing that explicit constraint.

## Proposed bounded resolution for review

Use two top-level hook calls, implemented in the same `src/core/use-workspace-recovery.ts` module:

- `useWorkspaceRecovery` at the original context/state location owns the context ref, reset layout effect, notice state, and clear/saved-cleanup/discard operations.
- `useWorkspaceRecoveryLoad` at the original load-effect location registers the unchanged loading effect using that same context and notice setter, plus the active ID, live-buffer read capability, and status setter.

This retains both effect registration points without moving other effects or taking ownership of the buffer, save, close, identity, navigation, or debounce. The shared context must also remain readable by the existing window-close discard consumer (`App.tsx:1318`); its current document comparison must be preserved, not replaced by a captured ID. No returned function would dynamically invoke hooks.

This two-call boundary is a proposal only. It has not been implemented. Once reviewed, C05/C15 characterization must precede production extraction, followed by the requested targeted/full tests, build, lint comparison, and diff check.

## Verification and limits

- Source inspection: completed for the ordering constraint and window-close context dependency.
- New characterization, targeted suites, full tests, build, and lint: not run during this paused Step 12 attempt; prior Step 11 results are not claimed as Step 12 validation.
- Packaged verification: not run.
- Recovery debounce, live-buffer comparison, context/revision guards, status strings, error handling, and StrictMode behavior: unchanged because production code is untouched; extraction equivalence remains unverified.
- Intended observable behavior change: none.
- Step 13 readiness: not established; Step 12 must first be implemented and accepted.

## Accepted ordering resolution and characterization gate

The user approved the two top-level hooks at the original registration points. The stop above records the initial review, not a remaining blocker.

New `src/test/workspace-recovery.test.tsx` coverage (six cases): same-source suppression; live-buffer comparison after edits during a held load; successful direct-save clear invalidating an earlier held load; A→B→A within one mounted workspace; Save As cleanup of the captured old ID preserving the new active notice; StrictMode setup/cleanup/setup, actual unmount/remount, and switch while old loads remain held. The latter releases all obsolete responses after the current response and restores exactly the current recovery.

`scenario.tsx` adds opt-in Testing Library StrictMode rendering. `recovery-clear.test.tsx` strengthens the cleanup-failure assertion to the complete existing warning. Existing document-notices cases establish A→B stale response rejection, load failure without source mutation, and exact discard-failure status with successful retry. Existing recovery-clear, close-document, window-close, Save As and identity suites retain their lifecycle coverage.

The first StrictMode test draft incorrectly expected activation of B to remount the workspace. Inspection and the unchanged baseline show that this path updates the mounted workspace, adding one load; the expected call count was corrected from six to five while retaining all obsolete-response rejection assertions. Initial mounts each still assert the two StrictMode load calls. This was a test assumption correction before production edits, not a production regression.

Before extraction: targeted seven suites **45 passed**; full suite **311 passed, 70 TODO, 52 files**; build PASS; lint exits 0 with **31 warnings**. Logs: `/private/tmp/step12-before-{targeted,tests,build,lint}.log`. Packaged verification not run: this extraction uses the existing bridge harness and changes no native behavior.
