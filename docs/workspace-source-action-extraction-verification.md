# Workspace source-update action — Step 9

Scope: accepted Phase 1 Step 9/C09 only, supplemented by Phase 1.5 and accepted Steps 1–8. Intended observable behavior change: **none**. Step 10 is not authorized.

## Characterization baseline

Production baseline: `f44d68e`; working tree initially clean.

Added three cases in `src/test/workspace-source-actions.test.tsx`. The tests wrap the existing lazy editor boundary to capture its current props while still rendering and exercising the real CodeMirror editor; no private App setter is exported.

- Write and Split (two cases): identical callback echoes in both clean and dirty states produce no buffer replace or collection update, do not change buffer version/React dirty/editor state, and leave clean native Save disabled. A real editor transaction increments the same buffer's version exactly once with the existing `editor` origin, updates active collection/source/React editor value, marks dirty, retains document/session IDs and view, and preserves the selected heading. The editor instance and undo history survive Write↔Split; undo/redo restores expected text and redo caret; direct save still writes the authorized native document without identity changes.
- Collection editing changes only the active entry, preserves the other entry's object identity/source, and edits B through the current mounted callback after switching from A, retaining A's edited source.

New-test authoring corrections: the existing mode projection moves the caret to the selected heading (offset zero in this fixture), rather than retaining the end-of-edit offset across Write↔Split. Vitest's untyped spy context needed a DocumentBuffer cast plus runtime instance assertion for TypeScript. Neither correction changed production or existing tests. Undo to saved text intentionally retains current React dirty=true semantics; no dirty-authority consolidation is implied.

Existing navigation-stale and Split tests cover guarded delayed projection/source observations. MarkdownEditor's layout effect refreshes current callbacks and its effect cleanup destroys the old editor. This extraction does not add a stale-source callback guard to updateSource, which currently has none; it does not claim arbitrary manually retained callback invocation is safe. Existing lifecycle/activation limitations remain separate from C09's mounted-editor behavior.

Before extraction: **77 targeted tests passed, 8 files** (workspace-source-actions, document-core, navigation-stale, identity, split-layout, save-as-lifecycle, keyboard-save, workspace-commands); full suite **289 passed, 70 TODO, 46 files**; TypeScript/Vite build **PASS**; lint **exit 0**, compared with the accepted 33-warning baseline before the production gate.

Packaged verification is **NOT RUN for Step 9** unless extraction reveals a runtime dependency. The new cases execute real CodeMirror transactions/selection/history under jsdom; they do not establish physical input, viewport reachability or platform accessibility. No editor internals/configuration or geometry change is proposed.
