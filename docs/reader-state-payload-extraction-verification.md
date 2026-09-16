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

## Helper extraction

Characterization commit: `b451361`. Production changes are confined to `src/App.tsx` and new `src/core/reader-state-payload.ts`. Added `src/core/reader-state-payload.test.ts` for direct helper contracts; the original scenario characterization is unchanged.

`createReaderStatePayload(input)` accepts nine explicitly supplied inputs: documentId, bookmarks, activeHeading, semanticDocument, activeNodeId, fontScale, lineHeight, contentWidth and reducedMotion. It returns the existing `Omit<SensibleDocumentState, "schemaVersion">` type. The serialized type is used only at compile time; there is no runtime Electron dependency.

The two removed object expressions were identical: document identity, original bookmarks array, active heading, `createSemanticPosition(semanticDocument, activeNodeId || activeHeading) ?? undefined`, then the four raw preference values. The helper retains that field order, the bookmark array reference/order, raw values, explicit undefined position and exact truthy-node/heading selection. It does not call the semantic resolver or invent a fallback for a nonempty invalid node ID.

All call sites (exactly two):

1. Inside the existing 500 ms debounce callback, as the argument to the captured `saveState` function. Construction still happens when the timer fires, with the original effect closure; catch handling and pendingReaderWrites tracking are unchanged.
2. Inside `closeDocument`, as the argument to optional `saveDocumentState`, after draining earlier writes and the first identity/version/dirty guard, before the second guard and completion. Optional-call short-circuiting, final-write waiting and close ordering are unchanged.

The helper has no window/localStorage access, React imports, refs, timers, persistence actions, buffer, implicit workspace capture or navigation ownership. Its only runtime dependency is the existing pure `createSemanticPosition` utility. No hydration, readerStateReady, effect dependencies, pending tracking, close guard or error string moved.

Three direct helper tests establish: frozen-input nonmutation and fresh returned objects with unchanged bookmark alias/order and raw preferences; node precedence versus empty-ID heading fallback versus invalid nonempty-ID undefined position; empty-model explicit undefined without schema/session additions.

No newly discovered construction differences or extra coupling required a design change. The pre-existing distinction between raw persisted values and normalized displayed values, and between hydration's field guards, is preserved explicitly.

## Final evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Targeted suites | 61 passed, 7 files | 64 passed, 8 files (three new helper tests) |
| Full `npm test` | 283 passed, 70 TODO, 44 files | 286 passed, 70 TODO, 45 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 warnings | Exit 0, identical normalized warning multiset |
| Packaged verification | NOT RUN | NOT RUN; no runtime/native dependency revealed |

Lint matches both the immediate baseline and accepted Step 7/Wave A after normalizing line numbers, output order and dependency-list order. Exact source comparison proves App changed only at the two object expressions and new import; all timing, effect/close sequencing, tracking, guards and errors are byte-identical. `git diff --check`: **PASS**. No new suppression, dependency or unrelated cleanup.

Payload equivalence is established for the characterized states at both existing paths; pure edge cases additionally protect the original construction rules. This does not claim that hydration concurrency or general persistence durability has been repaired. Physical platform, packaged/native and assistive-technology behavior were not newly tested. Existing Step 6 findings remain untouched.

Intended observable behavior change: **none**. Deviations: **none**. No extraction stop condition was encountered.

Step 8 is complete for review. Step 9 (bounded source-update action extraction) appears ready for its own C09 source-echo/dirty characterization gate. **Step 9 has not begun and requires explicit authorization.**
