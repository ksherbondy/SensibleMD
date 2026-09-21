# Active-document authority characterization — stop report

Status: **STOPPED on a reproduced existing defect**, before production changes or an ownership migration proposal. Starting production: `f943d91`. Reference: [state ownership audit](state-ownership-coupling-audit.md).

## Separate defect: clean collection activation manufactures buffer dirty state

Observed through the running React application against unchanged production:

1. Import A.md (`# A`) and B.md (`# B`) as a browser collection.
2. A is active. No edits have been made; both React and buffer report clean.
3. Select B in the collection outline, or use Next Chapter.
4. React still reports clean. The live buffer reports dirty.
5. Click Close Document. It refuses with exactly `Save your changes before closing this document.` and stays open.

Reproduced for both routes in normal and StrictMode: **four failing regression cases**. This is a pre-existing production behavior, not an extraction regression. No source corruption, wrong-file write or data loss is claimed from this reproduction.

## Concrete before/after matrix for the blocking transition

The browser-collection fixture starts from a mounted initial document with buffer version/savedVersion 0/0. Import replaces the buffer once and marks it saved. Both activation routes then have the same result below.

| Representation | Initial workspace | After browser collection import: A | After collection selection or Next Chapter: B | After refused Close Document |
| --- | --- | --- | --- | --- |
| React source | `# Initial` | `# A` | `# B` | `# B` |
| DocumentBuffer.text | `# Initial` | `# A` | `# B` | `# B` |
| buffer version | 0 | 1 | 2 | 2 |
| buffer savedVersion | 0 | 1 | **1, retained from A** | 1 |
| React isDirty | false | false | **false** | false |
| buffer isDirty | false | false | **true** | true |
| active collection entry source | `# Initial` | `# A` | `# B` | `# B` |
| activeDocumentId | welcome identity | imported A identity | imported B identity | imported B identity |
| activeSessionId | null | null | null | null |
| canSaveDirectly | false | false | false | false |

The test directly observes the buffer, rendered React dirty/identity/session attributes, document name, post-effect source in localStorage and Close Document outcome. The initial buffer counters, A counters, B text and incremented version are asserted. Retention of savedVersion, collection entry values and canSaveDirectly are additionally established by source inspection of the unchanged handlers; this report does not pretend every cell has a separate runtime probe.

For this fixture, the intended authority is unambiguous: imported B has never been edited and should remain clean. Text representations agree. A monotonic buffer version may legitimately advance on replacement, but its comparison against a baseline belonging to the previous document cannot correctly establish B's dirty state. The dirty disagreement here is not an intentional mirror lag after React settles.

## Root cause and consumer disagreement

`DocumentBuffer.replace` increments version. Dirty is derived strictly as `version !== savedVersion`.

Both `switchDocument` and `navigateChapter` replace the shared workspace buffer, set React source/name/active ID, disable direct save and set React dirty false. Neither marks the target buffer saved or restores a saved baseline associated with the target document. Browser collection import, by contrast, calls replace followed by markSaved.

Consequences by current consumer:

- Header/DOM dirty indication and ordinary recovery scheduling use React isDirty: false here.
- Close Document tests React dirty **or** live buffer dirty: it refuses here.
- Native window close also reads live buffer dirty. A false unsaved prompt is a source-backed consequence to investigate, not a packaged scenario exercised by these tests.
- The active collection entry stores text but no independent saved baseline, so its source alone cannot distinguish untouched B from a previously edited B retained in memory.

The separate authorities documented by the audit therefore produce a concrete user-visible contradiction in this transition.

## Scope, tests and remaining matrix

Added only `src/test/active-document-authority.test.tsx` and this report. Production code is unchanged against `f943d91`; `git diff --check` passes. Existing untracked `currentTree.md` and `docs/state-ownership-coupling-audit.md` were left untouched.

Command: `npx vitest run src/test/active-document-authority.test.tsx`.

Result: **4 failed**, all at the intended buffer-dirty/close-success expectations. No skip, TODO or weakened assertion. Log: `/private/tmp/active-authority-defect.log`.

Full suite, build, lint and packaged verification were not rerun after reaching the requested defect stop condition. The new cases remain uncommitted for review. They deliberately expose the failing contract; this working tree is not claimed to have a passing full suite.

The requested all-transition matrix is **not complete**. Edit, direct Save, Save As, standalone browser open, native/recent opens, history/link/search activation, recovery restore, external conflict/reload and native close have not received new exhaustive authority probes in this task. Prior characterization remains useful evidence, but is not relabeled as completion of this broader gate. Further characterization stopped after the first confirmed defect, as requested.

## Smallest next correctness decision

Do not start a runtime-owner migration or optional Step 18 helper on the strength of this partial gate. The immediate high-payoff boundary is the dirty/saved-baseline handoff during collection activation.

Request a separately scoped repair design and characterization for that boundary: establish the target document's saved baseline, distinguish untouched from previously edited targets, and make React/close/recovery consumers agree. A blanket markSaved on every switch would make this clean fixture pass but could incorrectly classify a previously edited target as clean; it is not recommended without that distinction.

A single document-runtime authority remains a plausible future direction, but this finding justifies resolving one concrete authority contract first, not a migration. No production repair or ownership change was implemented.
