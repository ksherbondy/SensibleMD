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

## Extraction and interface

Characterization commit: `0ec7c8f`. Production changes are limited to `src/App.tsx` and new `src/components/workspace/WorkspaceSearch.tsx`, plus this verification report. The five characterization cases remain unchanged after extraction.

Moved exactly the existing `<section className="search-results" aria-label="Search results">` through its closing tag: count header, scope group/buttons, Previous/Next/Return session controls, and first eight result rows. No wrapper was added. The `searchOpen && query` rendering condition and the toolbar's search input stay in App. The same DOM ancestry, element order, text fallback, row keys, class names, attributes and disabled expressions are preserved.

Ten narrowly typed props cross the boundary:

| Prop | Contract |
|---|---|
| `searchScope` | Existing `SearchScope` type; type-only import, no search-helper execution |
| `searchResults` | Existing ordered array viewed through readonly document ID/name, node ID, section, text and line fields |
| `searchIndex` | Existing selected index, including `-1` and indices beyond the visible eight |
| `matches` | Existing parent-computed total occurrence count |
| `hasOrigin` | Boolean availability only; no origin document/heading object |
| `onSelectScope` | `document` or `collection`; parent performs scope, index and origin updates in original order |
| `onPrevious`, `onNext` | Separate no-argument callbacks to existing cycling action |
| `onReturnToOrigin` | Original parent return action |
| `onSelectResult` | Visible result index; parent sets index then invokes the existing direct action with its render's result |

The original results array is passed without a new mapping/cache; `.slice(0, 8)` stays in the moved JSX. Cycling still reads the full result set in DocumentWorkspace. The direct callback resolves the row index synchronously in that same render's array and retains its original default history behavior; it never invokes the cycling action or creates an origin. The scope callback preserves explicit reset even when the chosen scope has not changed. Query/scope effects, Escape/focus handling, search computation, source/version guards, history, document activation and origin remain parent-owned.

WorkspaceSearch has no state, hooks, refs, persistence, parsing, runtime search-helper imports or Electron access. CSS, input behavior, command factory, internal links, main/preload and lazy boundaries remain unchanged. No memoization or search optimization was added.

No new architectural coupling or Phase 1 contradiction was discovered. The Write-mode editor focus behavior noted above refines the test expectation only. The existing heading-level search targeting and direct/cycle differences remain intact; broader search/navigation semantics and activation safety are not repaired by this step.

## Post-extraction evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Full `npm test` | 269 passed, 70 TODO, 41 files | 269 passed, 70 TODO, 41 files |
| `npm run build` | PASS | PASS |
| `npm run lint` | Exit 0, 33 warnings | Exit 0, identical warning multiset |
| Packaged verification | NOT RUN | NOT RUN; no new native/layout dependency revealed |

Lint was compared both to the immediate baseline and accepted Step 4 output, normalizing line numbers, output order and dependency-list order. No new suppression or unrelated lint fix was introduced.

Source comparison against `0ec7c8f` confirms identical moved JSX after indentation, callback substitutions and the origin-availability prop substitution. App outside the replaced section/import is byte-identical. `git diff --check`: **PASS**. The four pre-existing edited files' diffs are byte-identical to their pre-task snapshot and are excluded from both commits.

The full suite includes core collection-search, transient UI, navigation-red/stale, position/identity and command-driven search coverage. Physical keyboard, real geometry, VoiceOver/Narrator/Orca and packaged cross-platform behavior remain **NOT TESTED in this step**. Prior packaged evidence is not reported as a new PASS.

Intended observable behavior change: **none**. Deviations: **none**. No production regression or extraction stop condition was encountered.

Step 5 is complete for review. Step 6 (controlled reader settings) appears ready for its own C13 focus/containment and preference-geometry gates, including the roadmap's packaged preference verification. **Step 6 has not begun and requires explicit authorization.**
