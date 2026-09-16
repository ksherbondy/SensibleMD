# Structural-heading action extraction — Step 10

Scope: accepted Phase 1 Step 10/C09 structural portion, Phase 1.5 and accepted Steps 1–9. Intended observable behavior change: **none**. Step 11 is not authorized.

## Characterization baseline

Production baseline: `87c8f86`; working tree initially clean.

Added four scenarios in `src/test/structural-heading-action.test.tsx` before modifying production:

- Write and Split (two cases): Demote/Promote target editor line 3 rather than the first heading. Assert exact edit offsets/insertions, structural-command origin, current baseVersion, single apply/version increment, buffer/collection/editor/React source synchronization, dirty=true, unchanged mode/document/session IDs, existing CodeMirror instance, Undo/Redo text/caret and direct native save behavior.
- Invalid H1 promotion, H6 demotion and nonheading-line commands are true no-ops in both clean and dirty states: no apply/collection call, identical buffer snapshot/editor state, unchanged dirty flag.
- Existing Ctrl+Alt+Down editor shortcut updates only the active collection entry and preserves the other document object/source and active identity.

Baseline caret observations: after demotion the downstream projection places the caret at offset 0 in this fixture; Undo restores the prior line-3 caret; Redo restores the changed text with caret at the end. Initial test-authoring expectations were corrected to these observed values before extraction. No existing regression assertion or production behavior was changed. The helper must not take over or normalize these navigation/editor consequences.

Catalog scope clarification: there is no Promote/Demote entry in the current workspace command catalog. Structural commands are exposed by editor toolbar buttons and CodeMirror key bindings, which are exercised above. Catalog structural execution is therefore **N/A: no such entry exists**. The existing workspace-command suite remains in the gate to preserve the catalog; no command was added to satisfy an inapplicable test path.

Before extraction: **81 targeted tests passed, 9 files** (structural-heading-action, document-core, workspace-commands, workspace-source-actions scenarios, split-layout, navigation-stale, identity, save-as-lifecycle, keyboard-save); full suite **296 passed, 70 TODO, 48 files**; TypeScript/Vite build **PASS**; lint **exit 0, 33 warnings**, matching accepted Step 9 categories/counts.

Packaged verification: **NOT RUN for Step 10** unless extraction reveals a new runtime dependency. Real CodeMirror transactions, caret, history and shortcut dispatch are tested under jsdom. This is not physical-keyboard, packaged geometry, platform or assistive-technology certification. No editor/navigation implementation change is proposed.

## Structural action extraction

Characterization commit: `e93f1a0`. Production changes: `src/App.tsx` and existing `src/core/workspace-source-actions.ts`. Added `src/core/workspace-structural-heading.test.ts` with three direct tests. This report records final results; the four scenario cases were unchanged after extraction.

The separate function `applyWorkspaceStructuralHeadingChange(direction, inputs)` receives the promote/demote direction and seven explicit inputs: render source string, current editorLine, the existing buffer typed through snapshot/apply, branded activeDocumentId, functional setCollection, setSource and setIsDirty. It imports the existing pure changeHeadingLevel and collection replacement helpers. There is one production caller: the retained per-render changeCurrentHeading wrapper in DocumentWorkspace, still used by the same editor props/toolbar/key bindings.

The original action body moved verbatim apart from indentation:

1. Compute `changeHeadingLevel(source, editorLine, direction)` and return on null.
2. `buffer.apply` with structural-command origin, current `buffer.snapshot().version` and `[edit]`.
3. Enqueue the existing functional collection updater, reading `buffer.snapshot().text` inside that updater when React executes it.
4. Set React source from its own existing buffer snapshot read.
5. Set React dirty true.

No snapshot was added, removed, cached or reordered. In particular, collection text is not replaced with the apply return value or the earlier source snapshot. Direct tests defer the collection updater, change the buffer's current text, then verify the updater performs the original live snapshot read while preserving unrelated collection entries. They also assert exact edit/origin/baseVersion, state-callback order and no buffer reads or writes for invalid commands.

The ordinary `updateWorkspaceSource` function from Step 9 is unchanged. The structural action never calls it, never uses replace, and does not share a generic mutation pipeline. No navigation, editor history, dirty authority, session, recovery, save, Electron or activation ownership moved. No state, timer, subscription or memoization was introduced.

No new runtime coupling required a design change. The existing source-to-editor echo and downstream caret projection are captured by the scenario tests, not reimplemented in the helper. The absent palette structural entries and baseline caret details above are characterization clarifications, not behavior changes.

## Final evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Targeted suites | 81 passed, 9 files | 84 passed, 10 files |
| Full `npm test` | 296 passed, 70 TODO, 48 files | 299 passed, 70 TODO, 49 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 warnings | Exit 0, identical normalized warning multiset |
| Packaged verification | NOT RUN | NOT RUN; no new physical-editor/runtime dependency revealed |

Source comparison against `e93f1a0` confirms the structural body is identical after indentation, App is unchanged outside the wrapper/imports, and the ordinary source action is unchanged. Lint matches both the immediate baseline and accepted Step 9 after normalizing line numbers, output order and dependency-list order. `git diff --check`: **PASS**. No existing tests were weakened and no new lint suppression, dependency, CSS, editor internals or unrelated formatting was introduced.

Intended observable behavior change: **none**. Deviations: **none**. No production regression or extraction stop condition was encountered. Automated CodeMirror caret/history/key-dispatch evidence is not physical platform or assistive-technology certification; existing Step 6 and broader lifecycle limitations remain untouched.

Step 10 is complete for review. Step 11 appears ready for its own keyboard listener/callback-lifetime characterization, with Phase 1.5's renderer/native shortcut boundary retained. **Step 11 has not begun and requires explicit authorization.**
