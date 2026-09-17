# Step 12 recovery extraction verification

Status: **Step 12 complete**. Dedicated extraction commit: `6930c04`. Step 13 has not begun and requires explicit authorization.

Accepted starting point: characterization `3e1a752`, separate notice-lifetime repair `5c4f7f6bbc2be1476bf9bcedac8e8582ce11859a`, and report commit `70a0941`. The initial ordering stop led to the approved two-hook design. The existing notice-scoping defect found during characterization was fixed separately; its accepted behavior is preserved here. See [repair verification](recovery-notice-lifetime-repair-verification.md).

## Files and interfaces

Changed production files: `src/App.tsx`, `src/core/use-workspace-recovery.ts`. This report records the final evidence. No accepted tests were modified and no new direct hook tests were needed: existing tests exercise the production hooks through the workspace.

`useWorkspaceRecovery({ activeDocumentId, setAppStatus })` accepts a document ID string and a status callback. It returns:

- `recoveryContext`: the sole ref containing `{ documentId, revision }`.
- `recoverySnapshot` and `setRecoverySnapshot`: the existing nullable `{ source, savedAt }` notice state and setter.
- `clearRecovery(documentId): Promise<void>`.
- `clearSavedRecovery(documentId): Promise<void>`.
- `discardRecovery(): Promise<void>`.

It owns the context ref, notice state, existing context/notice reset layout effect, and the three clear/discard helpers. The state declaration remains before the reset effect, retaining the accepted repair.

`useWorkspaceRecoveryLoad({ activeDocumentId, recoveryContext, setRecoverySnapshot, readCurrentSource, setAppStatus }): void` owns only the existing passive load effect. Inputs are the same shared context ref, typed notice setter, live source reader, document ID and status callback. It creates no additional context authority. Both hooks retain the existing narrow `window.sensibleMD` operation lookups at their original execution times; neither receives a bridge object or owns filesystem authority.

The workspace retains active identity/session, DocumentBuffer, dirty authority, save/Save As and pending-save tracking, restore mutation, navigation, activation, external changes, reader persistence, Close Document, window-close, `windowDiscard`, and the recovery write debounce. The status state also remains in the workspace.

## Registration points and source proof

At the accepted baseline, the recovery ref/state/reset block started at `App.tsx:288`; it is replaced in place by `useWorkspaceRecovery` at `App.tsx:289` (the added import shifts the line). The hook calls ref, state, and layout effect in exactly the same sequence as the repaired baseline.

The original load effect at `App.tsx:624` is replaced in place by `useWorkspaceRecoveryLoad` at `App.tsx:617`, immediately after the untouched write debounce and before the existing external-change subscription. Line-number shifts reflect extraction, not effect reordering.

An executable source comparison against `70a0941:src/App.tsx` passed. It established:

1. The original context/state/reset block appears verbatim in the early hook.
2. The original clear, saved-cleanup and discard helper block appears verbatim in that hook.
3. The original load effect appears verbatim except for `buffer.snapshot().text` becoming `readCurrentSource()`.
4. The entire resulting App equals the baseline with only the new import, two in-place hook substitutions, and removal of the moved helper definitions.
5. The module contains exactly one `useRef` call.

Consequently, all intervening layout/passive effects remain byte-for-byte in their existing relative order. The 1,500 ms recovery-write effect remains at its original effective registration point, with dirty check, snapshot capture, timer, ID/version suppression and error handling unchanged. Window-close still reads the same live `recoveryContext.current.documentId` after clear completes; no captured-ID replacement or duplicated authority was introduced. Save, close, restore, status, and all unrelated App code are unchanged.

## Behavior and lifetime evidence

The unchanged accepted suites establish:

- Stale A notice disappears when B becomes active with no recovery.
- A notice remains gone while B's recovery response is held; valid B recovery subsequently appears and restores B text under B's identity.
- Same-source recovery is suppressed, including comparison with live buffer text edited while loading. The App callback reads `buffer.snapshot().text` when completion executes; no render-time snapshot or React source replaces it.
- A held response from A after B activation cannot surface A's notice.
- A→B→A rejects the obsolete first A response within the same mounted workspace and restores only the current A response.
- Successful save cleanup invalidates an earlier held recovery load through the unchanged context/revision protocol.
- Save As cleanup targets the captured old document identity and cannot remove the new active notice.
- StrictMode setup/cleanup/setup, actual unmount/remount, and document switching with held loads do not permit stale/duplicate recovery application. Releasing all obsolete responses after the current response still restores only the current document's recovery.
- Explicit discard failure retains the prompt for retry and preserves the exact status; successful retry removes it.
- Existing recovery-clear, Close Document, window-close, Save As lifecycle and identity cases continue to pass.

Clear still increments revision only when the requested document matches the live context, throws on unavailable/failing clear, and clears visible state only if context identity, document and revision still match after completion. Load still captures context/revision, uses the same lifetime cleanup flag and checks the live source before showing a notice. Its dependency array remains `[activeDocumentId]`.

Status/error boundaries are verbatim: load failure reports `Recovery check is temporarily unavailable.` only while its effect lifetime is current; saved-cleanup catches clear failures and reports `Saved, but recovery data could not be cleared. It may appear again when you reopen the document.`; explicit discard catches failures and reports `Recovery could not be discarded. Please try again.` Direct `clearRecovery` still rejects to its caller. No catches were merged or error semantics changed.

## Verification

Both before and after extraction:

| Check | Result |
| --- | --- |
| Targeted recovery/notice/close/window-close/Save As/identity, seven files | 47 passed |
| Full `npm test`, 52 files | 313 passed, 70 TODO |
| `npm run build` | PASS |
| `npm run lint` | Exit 0; 32 warnings |
| `git diff --check` | PASS |

Logs: `/private/tmp/step12-resume-{before,after}-{targeted,tests,build,lint}.log`.

Lint category counts are exactly the accepted 32-warning baseline:

| Category | Before | After |
| --- | ---: | ---: |
| `react(refs)` | 14 | 14 |
| `react-hooks(exhaustive-deps)` | 8 | 8 |
| `react(set-state-in-effect)` | 6 | 6 |
| `eslint(no-unused-vars)` | 3 | 3 |
| `eslint(no-unused-expressions)` | 1 | 1 |

The accepted notice-reset warning relocates to the new hook. The existing recovery-load exhaustive-deps warning also relocates: it now names `recoveryContext`, `readCurrentSource`, `setRecoverySnapshot`, and `setAppStatus` instead of the App-local `buffer`. Dependency behavior is deliberately unchanged. No new warning category, increase, suppression, configuration change, dummy reference, or lint cleanup was introduced.

Packaged verification: **NOT RUN**. No native/main/preload behavior changed; the existing bridge harness establishes these renderer lifecycle cases. No manual platform or accessibility validation is claimed.

Intended observable behavior change: **none**, relative to the accepted notice-lifetime repair. No newly discovered coupling or deviation: the two registration points and shared window-close context are the previously reviewed boundaries.

Step 13 appears ready for its own bounded characterization/review because the remaining write debounce is intact and the Step 12 gate passes. It has not been started and remains unauthorized until explicitly approved.
