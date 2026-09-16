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
