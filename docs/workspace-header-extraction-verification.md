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

## Extraction and interface

Characterization commit: `e767f1e`. Production changes are limited to `src/App.tsx` and new `src/components/workspace/WorkspaceHeader.tsx`; this report records the results.

Moved exactly the existing `<header className="topbar">` (brand, document title/status, six action buttons and single-file input) plus its following collection input. A React fragment preserves the DOM without adding a wrapper. A source comparison against the characterization commit confirms identical JSX after substituting only callback names and the close-disabled prop. App changes outside that range are the component import and removal of header-only icon imports.

The explicit 16-prop interface contains:

- Five display/control facts: `documentName`, `isDirty`, `closeDisabled`, `saveEnabled`, `settingsOpen`.
- Three parent-owned refs: `fileInput`, `collectionInput` (input refs) and `settingsTrigger` (button ref).
- Eight callbacks: `onOpenDocument`, `onCloseDocument`, `onSave`, `onDownloadCopy`, `onToggleSettings`, `onShowCommandPalette`, `onFileChange`, `onCollectionChange`. File changes use React's typed input change handler; button actions take no arguments.

DocumentWorkspace retains all state, refs, actions, file reading/reset logic, keyboard listeners and native/browser decisions. Existing inline close/settings/palette callback bodies remain at the parent call site. WorkspaceHeader owns no state, effects, refs, Electron APIs or lifecycle logic. CSS, command factory, lazy boundaries, main and preload are unchanged.

No newly discovered coupling required a design change. The existing imperative input activation and settings focus-restoration dependencies cross the boundary through their original refs. Search remains outside the header.

## Post-extraction evidence

- Full `npm test`: **260 passed, 70 TODO, 39 files**, matching characterization baseline. This includes save/Save As, download-state, close-document, identity/open, transient UI, command catalog and keyboard-save coverage.
- `npm run build`: **PASS** (TypeScript and Vite).
- `npm run lint`: **33 warnings**, unchanged category counts: 14 refs, 8 exhaustive dependencies, 5 set-state-in-effect, 3 unused variables, 2 immutability, 1 unused expression. No lint cleanup or new suppression.
- Exact moved-JSX comparison: **PASS**; `git diff --check`: **PASS**.
- Packaged verification: **NOT RUN**, for the bounded rationale above. No newly revealed native/layout dependency required it. Manual assistive-technology and platform verification remain **NOT TESTED** in this step.

Intended observable behavior change: **none**. Deviations: **none**. No stop condition was encountered. Step 4 appears ready for its own authorized characterization and bounded implementation; it has **not begun**.
