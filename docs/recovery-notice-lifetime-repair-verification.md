# Recovery notice lifetime repair — accepted and complete

Status: **repair accepted, verified, and committed**. Repair commit: `5c4f7f6bbc2be1476bf9bcedac8e8582ce11859a`. Separate characterization commit: `3e1a752`. Step 12 extraction remains paused and Step 13 has not begun. The accepted lint baseline for subsequent Step 12 work is **32 warnings**.

## Root cause and correction

On active-document identity change, the existing layout effect resets the recovery context but leaves `recoverySnapshot` intact. When the new document has no recovery, the load effect does not replace that state, so the previous document's notice remains visible.

The production diff adds exactly `setRecoverySnapshot(null);` immediately after the existing context reset in the same layout effect. The notice state declaration now sits immediately after the recovery context ref and before this layout effect, as explicitly authorized in the follow-up review. The state hook crossed the layout-effect declaration; no other hook or effect moved. Its dependency remains `[activeDocumentId]`; context identity/revision initialization is unchanged. Notice lifetime now ends at the same document transition that invalidates old recovery work, before the later passive recovery load runs. A valid load for the new context can establish its own notice. The existing lifetime/context/revision guards continue rejecting obsolete completions.

No effect was relocated. No save, Save As, restore, close, identity ownership, status string, preload/main, recovery format, debounce, write timing, or suppression code changed. The shared context used by window-close is unchanged. No extraction hook was added.

## Tests and evidence

The original failing regression remains unchanged. A second test holds B's valid recovery response, confirms A's notice disappears while B loads, then releases B's response and restores exactly B's recovered source under B's identity.

Before the fix, both notice-lifetime tests failed against unchanged production, with six existing characterization cases passing (`/private/tmp/recovery-notice-before.log`). After the one-line fix:

- A notice disappears when B has no recovery: PASS.
- A notice disappears while B recovery is pending; valid B notice subsequently appears and restores B text: PASS.
- Same-source suppression and live-buffer comparison: PASS.
- Successful clear invalidates held load: PASS.
- Held A response after B and A→B→A obsolete-response protection: PASS.
- Save As cleanup targets captured old identity without removing the new notice: PASS.
- StrictMode setup/cleanup/setup, actual unmount/remount, and held-load switch: PASS.
- Discard failure/retry, recovery-clear, Close Document, window-close, Save As, and identity suites: PASS.

Targeted seven suites: **47 passed**. Full `npm test`: **313 passed, 70 TODO, 52 files**. `npm run build`: PASS. `git diff --check`: PASS. Packaged verification: NOT RUN; the existing bridge harness establishes these renderer lifetime cases, with no native changes.

Final pre-commit rerun logs: `/private/tmp/recovery-notice-accepted-{targeted,tests,build,lint}.log`. All totals above were reproduced in these runs after acceptance of the lint delta.

## Effect-ordering proof

An executable source comparison against `3e1a752:src/App.tsx` passed: the entire current App equals that baseline with exactly two edits—moving the notice state declaration from immediately after the context-reset layout effect to immediately before it, and adding the notice reset inside that effect. All remaining source is byte-for-byte identical.

Thus the reset layout effect remains before the same downstream split-sync, observation, pagination, and presentation effects. The later recovery-load effect and 1,500 ms write debounce retain their original registration positions and bodies. Window-close reads the same live recovery context. No status, save, close, or active-identity code changed. StrictMode and all lifecycle characterization pass after the state-hook ordering adjustment.

## Accepted lint baseline

Lint exits 0 with **32 warnings**, explicitly accepted by the user for this repair and subsequent Step 12 work:

| Category | Previous baseline | Accepted repair baseline |
| --- | ---: | ---: |
| `react(refs)` | 14 | 14 |
| `react-hooks(exhaustive-deps)` | 8 | 8 |
| `react(set-state-in-effect)` | 5 | 6 |
| `eslint(no-unused-vars)` | 3 | 3 |
| `eslint(no-unused-expressions)` | 1 | 1 |
| `react(immutability)` | 0 | 0 |

The authorized move removes the forward-declaration immutability warning. With the setter declared first, lint instead reports the direct `setRecoverySnapshot(null)` in the layout effect as an additional `react(set-state-in-effect)` warning. No new category exists relative to the baseline, but the warning count increases in an existing category. The user explicitly accepted this delta because the warning corresponds directly to the intentional, tested notice reset. Do not contort the implementation to restore 31 warnings.

No suppression, configuration change, dummy reference, callback indirection, or unrelated cleanup was added. The 32-warning result is now the accepted baseline; no new lint category remains.

## Files and scope

Files changed are `src/App.tsx` (notice reset plus authorized declaration move), `src/test/workspace-recovery.test.tsx` (original regression plus new delayed-B test), this report, and the Step 12 report updated to point to this separate repair. The prior characterization commit remains separate.

Intended observable behavior change: the previous document's recovery notice disappears on document activation; valid recovery for the newly active document can still appear. No other observable behavior change is intended.

The previously failing Step 12 notice-scoping case and committed characterization now pass. The repair and lint baseline are accepted, and the behavioral characterization gate passes. This does not authorize or complete Step 12 extraction. The production repair and regression tests are in the dedicated repair commit above; this documentation update records its final hash separately.
