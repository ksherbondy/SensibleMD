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

## Action extraction

Characterization commit: `61aca88`. Production files changed: `src/App.tsx` and new `src/core/workspace-source-actions.ts`. Added `src/core/workspace-source-actions.test.ts` for three direct action cases. Scenario tests remain unchanged after extraction.

`updateWorkspaceSource(nextSource, inputs)` receives only:

- `buffer`: the same existing buffer object, typed through its `snapshot` and `replace` methods.
- `activeDocumentId`: the render's branded DocumentId.
- `setCollection`: the existing functional collection-update callback.
- `setSource`: the existing string state setter.
- `setIsDirty`: the existing boolean state setter.

The module imports the existing `replaceCollectionDocument` helper. It does not accept or access session, navigation, semantic model, Electron, recovery or save systems. It creates no state, store, timer or subscription. App retains its per-render `updateSource(nextSource)` closure and passes these five explicit inputs when that callback runs; the editor's `onChange` wiring is unchanged. There is one production caller and no factory/memoization.

The original action body is moved verbatim apart from indentation:

1. Compare nextSource with the current buffer snapshot text; return immediately on equality.
2. Replace that buffer with origin `editor`.
3. Enqueue the same functional collection updater using activeDocumentId and nextSource.
4. Set React source to nextSource.
5. Set React dirty to true.

This preserves the original call ordering, including React's ownership of when the functional updater executes. It does not force eager collection evaluation or claim React commits each setter separately. No-op returns before all writes. Structural edits, recovery, reload, switching/opening, links/search and save remain separate and untouched.

Direct tests verify clean/dirty identical-source no-ops, unchanged buffer snapshots, exact action call sequence and editor origin, version increment, source/dirty arguments, and deferred collection application against a newer collection while preserving the unrelated entry and avoiding input mutation. The real-editor scenarios continue to establish caret/undo/redo, echo suppression, mode, direct-save and identity behavior.

No new coupling required an architectural change. Current mounted-editor callback refresh remains in MarkdownEditor; existing guarded navigation/source-observation work remains in its owners. Arbitrary stale source callback invocation has no new guard, and the action has not become a document-switch protocol.

## Final evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Targeted suites | 77 passed, 8 files | 80 passed, 9 files |
| Full `npm test` | 289 passed, 70 TODO, 46 files | 292 passed, 70 TODO, 47 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 warnings | Exit 0, identical normalized warning multiset |
| Packaged verification | NOT RUN | NOT RUN; no new runtime/layout dependency revealed |

Source comparison against `61aca88` confirms the helper body is identical to the original action after indentation and App is byte-identical outside the updateSource wrapper/new import. Lint matches both the immediate baseline and accepted Step 8 after normalizing line numbers, output order and dependency-list order. `git diff --check`: **PASS**. No existing test was weakened, no new lint suppression/dependency was added and editor, CSS, Electron and other source mutation paths were not edited.

Intended observable behavior change: **none**. Deviations: **none**. No production regression or extraction stop condition was encountered. Automated real-CodeMirror transaction evidence is not packaged physical-input, viewport or accessibility evidence. Existing dirty/activation and Step 6 limitations remain out of scope.

Step 9 is complete for review. Step 10 (separate structural-heading edit action) appears ready for its own C09 structural undo/caret characterization; **Step 10 has not begun and requires explicit authorization**.
