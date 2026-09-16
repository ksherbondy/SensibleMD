# Workspace search extraction — Step 5

Scope: accepted Phase 1 Step 5, C10/C13, Phase 1.5's unchanged renderer search boundary, and accepted Steps 1–4. Expected observable behavior change: **none**. Step 6 is not authorized.

## Characterization baseline

Accepted commit: `50c005d`. The working tree already had edits in `AuthoringChecks.tsx`, `MarkdownEditor.tsx`, `reader-surfaces.tsx` and `workspace/WorkspaceHeader.tsx`. These files are outside Step 5 and are left untouched and uncommitted by this work. Checks below use that working tree, not an assertion that it is identical to the accepted commit.

Added five scenarios in `src/test/workspace-search.test.tsx` before changing production JSX:

- Panel/main-area/toolbar relationships, exact header/session/row order, button types, scope group, row document/section/text/line fields and keyboard tab order. Ten result blocks with eleven matches establish the eight-row display limit, Previous from no selection choosing the tenth result, forward wrap and cycling to the ninth with no visible selected row. Escape restores input focus and retains query, selected index and origin across reopen; Return clears the session index/origin.
- Empty query produces no panel even when search is open; a nonempty unmatched query produces an empty panel with disabled Previous/Next/Return. Query changes and scope changes reset index/origin; reselecting the same scope also resets them through the existing explicit handler.
- Direct selection of the second duplicate formatted heading in Write preserves mode and focuses CodeMirror at the correct source line, without creating an origin. Cycling then captures that heading, another direct selection retains the origin, and Return restores it without dirtying source.
- Collection ordering and document-only filtering; direct cross-document selection changes identity and forces Read without establishing an origin. Cycling captures the destination document, changes back to the first document, and Return restores the correct document identity despite identical formatted heading labels/IDs.
- A queued cross-document result callback delivered after a source edit cannot apply its obsolete heading/scroll or replace edited source/mode.

During test authoring, corrected an initial focus expectation: Write-mode result navigation focuses CodeMirror rather than retaining result-button focus. This agrees with existing editor navigation behavior and does not contradict Phase 1. No production code or existing regression assertion was changed to establish the gate.

Existing core collection-search tests cover ordering/filtering/cycle-index behavior; transient-ui covers dismissal and retained scope/query; navigation-red/stale, position-continuity and identity cover the existing navigation machinery; workspace command scenarios cover command-driven search cycling/origin. These remain in the full-suite gate. Search still chooses a preceding heading, not an exact match-text offset; this extraction does not change that protocol.

Pre-extraction checks: full `npm test` **269 passed, 70 TODO, 41 files**; TypeScript/Vite build **PASS**; lint **exit 0, 33 warnings**, matching accepted category counts (14 refs, 8 exhaustive dependencies, 5 set-state-in-effect, 3 unused variables, 2 immutability, 1 unused expression).

Packaged verification is **NOT RUN** unless extraction reveals a native/layout dependency. The proposed move adds no CSS, native behavior or layout wrapper. Automated DOM/focus evidence is not physical keyboard, geometry, assistive-technology or cross-platform certification.
