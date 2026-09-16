# Document notices extraction — Step 7

Scope: accepted Phase 1 Step 7, final Wave A controlled UI extraction, supplemented by Phase 1.5 and accepted Steps 1–6. Intended observable behavior change: **none**. Step 8/Wave B is not authorized.

## Characterization baseline

Production baseline: `64101a3`. Working tree was clean.

Added five cases in `src/test/document-notices.test.tsx` before changing production JSX:

- Recovery timestamp using the existing locale formatter, exact text, role=alert (no explicit aria-live), direct main-area placement before the reader/editor, external-before-recovery ordering, nested strong/paragraph/button-container structure, button labels/order/types/enabled states. Both notices can coexist. Keep editing dismisses only external notice; Restore replaces source, sets dirty and its success status while leaving the external notice; Reload then replaces source, clears dirty/external notice, preserves mode/identity and leaves the prior status unchanged.
- Failed Discard retains the alert and enabled controls with its exact failure status. Successful retry removes the notice and persisted A recovery, leaves source clean and retains the prior status text.
- A clean document ignores same-source external events and applies changed disk source without displaying a notice. Switching to another native document prevents an event for the old path from reaching that active document through the existing fake desktop authorization boundary.
- A late recovery load for A after native activation of B cannot surface an A notice or overwrite B.
- Failed recovery loading reports its existing status without displaying a notice or changing source.

Existing recovery-clear covers pending deletion, per-document isolation, restart, save/Save As cleanup/failure and edits during save. Existing close-document covers old recovery after unmount/reopen and old external events; identity and save-as tests cover related identities. Navigation-stale and transient-ui remain in the targeted gate. No existing test was changed or weakened, and the new tests passed against the original App-local notices.

Evidence limits: the old-native-path external test checks the faithful fake boundary; it does not assert that the renderer's source-only external payload has a universal document/version guard. Phase 1's existing stale external/activation risks remain separate deferred work. Recovery actions likewise retain their existing semantics rather than gaining a new safety protocol.

Before extraction: targeted **52 passed, 8 files** (document-notices, recovery-clear, save-as-lifecycle, close-document, window-close, identity, transient-ui, navigation-stale); full suite **277 passed, 70 TODO, 43 files**; build **PASS**; lint **exit 0, 33 warnings**, unchanged accepted categories/counts.

Packaged verification: **NOT RUN for Step 7**. Characterization revealed no new native/layout dependency for this controlled JSX move. No CSS, native subscription or Electron behavior is changed. Physical screen-reader/keyboard and packaged platform validation are not newly established. The Step 6 slider-name limitation and intermittent initial Scroll visibility finding remain out of scope and were not investigated or repaired.

## Extraction and interface

Characterization commit: `952d2c0`. Production changes: `src/App.tsx` and new `src/components/workspace/DocumentNotices.tsx`; this report is the only other extraction-commit change. The five characterization tests remain unchanged after extraction.

Moved exactly the two existing conditional blocks: external-change alert followed by recovery alert, including their strong/paragraph/button-container markup. A React fragment adds no DOM wrapper. Settings remain before the notices and section context/reader/editor content remains after them. Status text remains in the existing App status surface, not in DocumentNotices.

The six-prop interface contains:

- `hasExternalChange: boolean`, computed by the original `externalChange !== null` condition. No disk source is passed.
- `recoveryNotice: { savedAt: string } | null`, derived with the original snapshot-null condition and only its timestamp. No recovery source, version, document ID or context is passed. The exact `new Date(...).toLocaleString()` formatting remains in the notice JSX.
- Four no-argument callbacks: `onKeepEditing`, `onReload`, `onDiscard`, `onRestore`. The parent retains the existing null-setting closure, direct reload action, `() => void discardRecovery()` wrapper, and direct restore action, respectively.

The component owns no state, hooks, refs, recovery loading/clearing, revision tracking, source/buffer/collection mutation, dirty/status ownership, subscription, persistence or Electron API. Conditional rendering remains a direct view of parent facts. No actions were combined, no async boundary was introduced, and no messages are cleared on mount.

No new lifecycle coupling required a design change. Existing simultaneous notices and retained status messages are explicitly characterized rather than normalized. Full lifecycle authority and source-only external-event limitations remain outside this controlled view boundary.

## Final evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Eight targeted suites | 52 passed | 52 passed |
| Full `npm test` | 277 passed, 70 TODO, 43 files | 277 passed, 70 TODO, 43 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 warnings | Exit 0, identical normalized warning multiset |
| Packaged verification | NOT RUN | NOT RUN; no new native/layout dependency |

Lint matches both the immediate baseline and accepted Step 6 after normalizing line numbers, output order and dependency-list order. Source comparison against `952d2c0` confirms identical moved JSX after indentation and prop/handler substitutions; App outside the replaced blocks and new import is byte-identical. `git diff --check`: **PASS**. No existing test was weakened, no new lint suppression or dependency was added, and no CSS or Electron code was touched.

Intended observable behavior change: **none**. Deviations: **none**. No stop condition was encountered. Native filesystem adversarial cases, physical assistive technology and packaged platform behavior were not newly tested; this does not certify recovery/save integrity beyond the stated cases.

Wave A's authorized controlled UI extractions are complete for review. Step 8 appears ready for its own C06/C07 payload-equality characterization and bounded pure reader-state payload construction, preserving timer/guard ownership. **Step 8 and Wave B have not begun and require explicit authorization.**
