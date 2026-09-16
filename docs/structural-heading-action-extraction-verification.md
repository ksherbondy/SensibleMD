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
