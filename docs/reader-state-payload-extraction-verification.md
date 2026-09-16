# Reader-state payload extraction — Step 8

Scope: accepted Phase 1 Step 8, C06/C07 payload equality only, supplemented by Phase 1.5 and accepted Wave A. Intended observable behavior change: **none**. Step 9 is not authorized.

## Characterization baseline

Production baseline: `a0db296`; working tree initially clean. Both existing expressions construct the same eight fields in the same order: documentId, bookmarks, activeHeading, position, fontScale, lineHeight, contentWidth, reducedMotion. Position is an own property even when its value is undefined. The inputs use raw preference state, not normalized UI display values.

Added six scenarios in `src/test/reader-state-payload.test.tsx` before changing production construction:

- Exact payload after heading selection, ordered bookmarks and all preference changes; strict equality of the normal debounced write and successful final close write.
- A paragraph node distinct from its owning heading after native document switching; exact identity/heading/semantic-position fields and final-write equality.
- Empty model: explicit own undefined position and raw out-of-range preferences, preserved by both paths.
- Delayed hydration: normal debounce writes before readiness; Close remains blocked. Later hydration updates bookmarks/preferences while its stale location cannot overwrite newer navigation; resulting debounce and final payloads match.
- Pending reader write: Close waits for the earlier debounce write before issuing its equal final payload, then waits for that final write before Home.
- Stale persisted semantic position resolves through the existing hydration fallback to document start; both persistence paths record the same resolved state.

Initial new-test text-anchor expectations were corrected to match the existing pure utility: prefix/suffix contain the normalized node text slices, not empty strings. No existing assertion or production code was modified to establish the gate.

Normal and close payloads are **proven strictly equivalent for equivalent workspace state in these scenarios**. No construction difference was discovered. Differences in hydration/readiness/timer/draining control flow remain deliberate and untouched; equivalence of payloads is not equivalence of those protocols or certification of broader persistence safety.

Before extraction: **61 targeted tests passed, 7 files** (reader-state-payload, close-document, position-continuity, reader-settings, identity, navigation-stale, document-core); full suite **283 passed, 70 TODO, 44 files**; TypeScript/Vite build **PASS**; lint **exit 0, same 33 categories/counts as accepted Wave A**.

Packaged verification: **NOT RUN for Step 8** unless extraction reveals a runtime/native dependency. This boundary constructs values only. Existing close failure, navigation and identity tests remain applicable; this work does not certify native durability or modify persistence protocols.
