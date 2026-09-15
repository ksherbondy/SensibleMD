# Workspace outline extraction — Step 4

Scope: accepted Phase 1 Step 4 (C01 sidebar switching and C13 DOM/focus), Phase 1.5's unchanged renderer ownership, and accepted Steps 1–3. Expected observable behavior change: **none**. Step 5 is not authorized.

## Characterization baseline

Production baseline: `68ad408` (accepted controlled header extraction).

Added `src/test/workspace-outline.test.tsx` before changing production JSX, with four executable cases:

- Single-document sidebar DOM, direct workspace/main-area siblings, heading order/text/levels 1–6 including formatted text, no-active-heading preamble, active class/ARIA state, control types and keyboard focus/Enter activation. Close/reopen preserves the existing collapsed/sidebar-shell classes, mounted element identity and selection; the Open control remains in the reader toolbar. Footer words/sections remain unchanged.
- Headingless empty state; headings and current selection update after source edits in Write, then disappear when replaced with prose. The sidebar remains the same DOM element.
- Clean and dirty collection sidebar switching (two cases): uploaded collection order/numbering/labels, active-document classes and identity, same-document no-op, keyboard chapter selection/focus, headingless destination, Read mode/reset dirty/Save availability, restoration of the outgoing source, heading and bookmark on return, and unchanged back/forward destinations (sidebar selection adds no history visits).

Existing evidence remains applicable:

| Contract | Existing executable coverage |
|---|---|
| Document identity/open and scoped state requests | `identity.test.tsx`, header open/collection scenarios |
| Heading selection preserves Write/Split and exact duplicate/formatted/h4–h6 targets | `navigation-red.test.tsx` |
| Deferred callbacks, source edits and old document work remain harmless | `navigation-stale.test.tsx` |
| Observed active selection and semantic reading continuity | `navigation-observation.test.tsx`, `position-continuity.test.tsx` |
| Collection ordering/navigation, semantic navigation/history helpers | Existing core collection/navigation suites |
| Command and transient UI behavior | `workspace-commands.test.tsx`, `transient-ui.test.tsx` |

During test authoring, corrected the footer fixture's word-count expectation: the existing semantic model counts whitespace-separated source tokens, including heading markers. Removed an unsupported `exact` role-query option caught by TypeScript; string role names already match exactly. These were new-test authoring corrections before establishing the gate; no production code or existing assertion was changed.

Pre-extraction full checks: **264 passed, 70 TODO, 40 files**; TypeScript/Vite build **PASS**; lint **exit 0, 33 warnings**, same categories/counts as accepted Step 3 (14 refs, 8 exhaustive dependencies, 5 set-state-in-effect, 3 unused variables, 2 immutability, 1 unused expression).

The dirty sidebar case deliberately preserves the documented activation protocol, including reset of React dirty state. It does not certify the deferred save/recovery/activation safety work identified in Phase 1. No navigation or lifecycle repair is included here.

Packaged verification is **NOT RUN for Step 4** unless subsequent extraction reveals a native/layout dependency. These tests establish DOM relationships, attributes, callback effects and jsdom focus, not real geometry or physical assistive-technology behavior. No new native behavior or CSS change is proposed. Prior packaged evidence remains historical; manual platform/AT checks are not newly verified.

## Extraction and boundary

Characterization commit: `c88cbd6`. Production files changed: `src/App.tsx` and new `src/components/workspace/WorkspaceOutline.tsx`. This report is the only other extraction-commit change; the characterization tests are unchanged after extraction.

Moved exactly the existing `<aside className={...outline-panel...}>` through its closing tag: panel title/Close control, conditional collection chapter navigation, heading navigation or empty-state paragraph, and words/sections footer. No wrapper was added. The workspace container and its `outline-closed` class remain in App, as do the main area and toolbar's Open outline control.

The component has nine explicitly typed props:

| Prop | Contract |
|---|---|
| `collection` | Readonly array viewed through `{ id, name }` |
| `headings` | Readonly array viewed through `{ id, level, text }` |
| `activeDocumentId` | Current document ID string |
| `activeHeading` | Current heading ID string, including existing empty-string case |
| `outlineOpen` | Parent-owned open-state boolean |
| `wordCount` | Existing model-derived count; existing locale formatting stays in JSX |
| `onClose` | No-argument callback |
| `onSelectDocument` | Document ID callback |
| `onSelectHeading` | Heading ID callback |

The existing collection/headings arrays are passed unchanged (no mapping, memoization or cached derivation). The component's structural types expose only rendering fields; it neither reads document source nor accepts model/navigation/buffer controllers. No refs cross this boundary.

Parent callbacks resolve the selected ID in their render's collection/headings, then synchronously invoke the unchanged `switchDocument(document)` or `goToHeading(heading, "outline")`. This keeps full source and heading-line access at the action owner. Collection IDs are unique through existing collection creation; heading IDs come from the existing semantic model. No async step, new navigation reason, history visit, state authority or activation protocol was introduced by this adapter. Close invokes the original parent state update.

DocumentWorkspace still owns navigation, history, deferred work, reader memory, bookmark restoration, document switching and outline open state. WorkspaceOutline has no hooks, state, refs, parsing, persistence or Electron access. CSS, shortcuts, command catalog, search, chapter controls, internal links and lazy boundaries are unchanged.

No newly discovered coupling required a design change. The existing relationship between `outlineOpen`, the ancestor workspace class and the toolbar reopen control remains explicit. Sidebar document switching and heading navigation retain their different mode/history/memory semantics.

## Post-extraction evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Full `npm test` | 264 passed, 70 TODO, 40 files | 264 passed, 70 TODO, 40 files |
| `npm run build` | PASS | PASS |
| `npm run lint` | Exit 0, 33 warnings | Exit 0, identical warning multiset after normalizing line numbers, output order and dependency-list order |
| Packaged verification | NOT RUN | NOT RUN; no new layout/native dependency revealed |

A source comparison against `c88cbd6` confirms the moved JSX is identical after indentation and the three callback substitutions. App outside the replaced JSX/import is byte-identical. `git diff --check`: **PASS**. No new lint suppression, dependency or test weakening was needed.

The full suite includes the navigation-red/stale/observation, position-continuity, identity/open, core collection/navigation, command catalog and transient UI evidence above. Real geometry, physical keyboard behavior, VoiceOver/Narrator/Orca and packaged Windows/Linux behavior remain **NOT TESTED in this step**; automated DOM focus evidence is narrower.

Intended observable behavior change: **none**. Deviations: **none**; the ID callback adapters keep the requested display-only boundary. No production regression or extraction stop condition was encountered. The previously documented dirty-activation safety limitations remain deferred and are not claimed fixed.

Step 4 is complete for review. Step 5 (controlled search results UI) appears ready for its own C10/C13 characterization gate, including the direct-click/cycling distinction and retained query. **Step 5 has not begun and requires explicit authorization.**
