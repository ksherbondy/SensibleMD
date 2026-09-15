# Workspace header extraction — Step 3

Scope: accepted Phase 1 Step 3 and its C13 characterization, preserving Phase 1.5 platform boundaries and Steps 1/2. Expected observable behavior change: **none**. Step 4 is not authorized.

## Characterization baseline

Production baseline: `1c21103` (accepted command factory extraction).

Added four tests in `src/test/workspace-header.test.tsx` before changing production JSX:

- Direct shell/header/brand/title/actions/file-input relationships, control order, labels/titles/button types, keyboard focus order, saved/dirty text and icon, settings expanded state and settings/palette focus restoration.
- Native Open versus browser fallback picker invocation, native clean Save disabled versus browser Save As enabled, file-input reset and selection of the same File after editing, with input DOM identity retained.
- Collection input remains the header's next sibling, uses its original accepted types/multiple attribute, receives the palette's picker action, resets and accepts the same files again after a chapter switch.
- Header Close becomes disabled while the parent close action holds its final reader-state write, then reaches Home after completion.

Existing save/Save As, download-state, close-document, identity, transient-ui, command catalog and keyboard-save suites remain the action-level baseline. Search is in the reader toolbar, not this header; the test explicitly preserves that boundary. There is no new search prop or moved search state.

Before extraction: full suite **260 passed, 70 TODO, 39 files**; TypeScript/Vite build **PASS**; lint **exit 0, unchanged 33-warning multiset**. All four new tests pass against the original App-local header. No characterization contradicted the accepted architecture.

Packaged verification is **NOT RUN for Step 3**: this controlled JSX move introduces no native behavior or CSS/layout changes, and the targeted DOM/ref/focus tests plus existing action suites establish the scoped contracts. Existing packaged evidence remains historical; physical native dialogs, assistive technology, Windows and Linux are not newly verified.
