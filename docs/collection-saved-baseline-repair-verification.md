# Collection saved-baseline repair verification

Status: implemented and verified; uncommitted for review. Scope is the approved inactive-baseline ledger plus buffer activation handoff. No general runtime controller, Context, reducer, universal activation abstraction, or Step 18 work was introduced.

## Defect and correction

The workspace reused one buffer across collection documents. Activation advanced its version but retained the preceding document's savedVersion, while two activation handlers independently cleared React dirty. Consequently untouched B appeared clean in React but dirty in the buffer, and returning to edited A cleared React dirty despite retaining edited text. Saving another document also replaced the only available saved baseline.

The active buffer now owns the active baseline exclusively. A workspace-local `InactiveDocumentBaselines` instance retains only inactive baseline records: `{ kind: "clean" }` or `{ kind: "dirty", savedVersion }`. CollectionDocument remains `{ id, name, source }`; no runtime fields or duplicate source storage were added.

Every retained-document activation archives the outgoing live baseline, consumes the incoming baseline, and calls `DocumentBuffer.replaceForActivation`. That primitive increments the existing workspace version exactly once. A known-clean target receives the new version as its saved marker; a dirty target retains its own saved marker. Text and baseline are installed before a single subscriber notification. Invalid negative, fractional, non-finite or future saved markers are rejected before mutation. No method to independently set a saved version or rewind a current version was added.

React dirty is projected from the resulting buffer snapshot at edit, structural edit, activation, successful save, recovery restore and reload boundaries. There is no corrective synchronization effect.

Example: imported A 1/1 clean → edited A 2/1 dirty → untouched B 3/3 clean → returned A 4/1 dirty. Editing back to identical text remains dirty. Clean return rebases a clean saved marker without claiming that a new disk write occurred. Saved markers are not async freshness tokens.

## Files changed

Production:

- `src/core/document-buffer.ts`: retained baseline type and constrained activation handoff primitive.
- `src/core/inactive-document-baselines.ts`: new inactive-only ledger with fresh-incarnation reset, synchronous custody transfer, and Save As remap/collision handling.
- `src/App.tsx`: workspace-lifetime ledger allocation; integrations at six retained-document activation boundaries, four fresh import/open boundaries, and accepted Save As identity adoption; snapshot-derived dirty projections.
- `src/core/workspace-source-actions.ts`: project editor/structural mutation snapshot dirty.
- `src/core/workspace-save-actions.ts`: project accepted save/live completion snapshot dirty, retaining all existing acceptance checks and sequencing.

Evidence:

- `src/core/inactive-document-baselines.test.ts`: 9 buffer/ledger invariant cases.
- `src/test/saved-baseline-lifecycle.test.tsx`: 28 lifecycle cases.
- `scripts/test-window-close-packaged.mjs`: three additional real packaged baseline checks; existing twelve checks retained.
- This report.

The nine cases in the pre-existing untracked `src/test/active-document-authority.test.tsx` were retained unchanged. Existing audit/stop reports and `currentTree.md` were not edited.

## Integration and preserved boundaries

| Boundary | Integration |
| --- | --- |
| Workspace initialization | Lazily allocate one ledger instance, with inactive initial entries known clean. The existing buffer remains authoritative for the initial active document. No effect initializes/resets the ledger, so StrictMode effect replay cannot erase it. |
| Browser file / browser collection / native Open / Recent Open | Reset all inactive metadata for the new collection incarnation, including same-ID imports. Preserve the existing replace + markSaved behavior, version increment and native session/capability assignments. |
| Collection selection / next and previous chapter | Transfer outgoing/incoming baselines at the existing buffer replacement point. |
| History / internal link / collection search / return to search origin | Same baseline transfer, preserving each route's existing navigation, mode and capability choices. Same-document navigation does not hand off a baseline. |
| Editor, undo/redo, structural edit | Existing active buffer mutation and collection source update; no ledger write. The active baseline will be captured on departure. |
| Direct Save | Existing captured-version comparison controls markSaved. Failure or obsolete completion cannot advance active or inactive baselines. Pending-save tracking and cleanup remain unchanged. |
| Save As | Existing ownership check precedes all remapping. The existing identity callback also remaps baseline custody, deleting a colliding inactive target. Unrelated inactive baselines survive. Same-ID remap is safe. No buffer version increment is added. |
| Save As with newer content | Preserve the current saved marker and live source. Dirty is projected from the current snapshot, rather than independently manufactured from the invocation comparison. The comparison still controls markSaved and the existing status string. |
| Recovery restore | Existing replacement advances version and retains the current saved marker. Dirty recovery remains dirty after departure and return. |
| Clean external reload / explicit conflict reload | Preserve existing replacement and markSaved; later departure captures the resulting clean baseline. Dirty conflict notification does not mutate the buffer. |
| Close Document | Protocol unchanged. Refusal, failed flush, retry, no-op prepare callback and pending work do not discard the ledger. Actual workspace unmount ends its lifetime. |
| Native window close | Protocol, save/discard/cancel checks and recovery retention unchanged. No baseline is marked saved merely because closing/discarding was requested. |
| Outer native open / fresh workspace | Existing mount/remount initializes a fresh buffer and ledger. No baseline transfers between workspace lifetimes. |

The ledger's private active ID records baseline custody, not filesystem authority. It updates synchronously during transfer/remap, without waiting for a React commit. It does not independently change the workspace activeDocumentId. Missing target records fail before transfer instead of defaulting to clean.

No async work writes the inactive ledger. All existing save-version, Save As generation, navigation, recovery context/revision and mounted-lifetime checks remain. A→B→A advances the buffer version twice and cannot revive an obsolete save completion.

No save/recovery debounce, timer capture point, IPC, storage format, status string, source-identity format, session ownership or capability rule was changed. Effect and imperative-handle registration order remains unchanged. `document-collection.ts`, `workspace-close-action.ts`, `use-window-close.ts`, `use-workspace-recovery.ts`, `use-reader-metadata.ts`, and `use-navigation-work.ts` have no diff.

## Regression and acceptance evidence

Before production edits, the original authority suite reproduced **9 failures** at its intended dirty assertions (`/private/tmp/baseline-before.log`). All nine unchanged cases now pass.

New core tests establish coherent single-notification handoff, monotonically increasing versions, stale transaction rejection, accepted-save capture at departure, invalid-baseline rejection without mutation, missing-target rejection, same-ID reset and collision remap.

New lifecycle cases cover:

- edited-back-to-identical-text under normal and StrictMode execution;
- fresh same-ID reimport with both active and inactive dirty documents;
- history back/forward, internal-link, direct search, search cycling and return-to-origin activation, complementing the original collection/chapter cases;
- Save As cancellation, failure, stale success/failure, and A→B→A obsolete completion;
- Save As collision with and without newer edits, preserving the origin baseline and an unrelated dirty C baseline;
- direct Save success, failure, newer edits and completion after departure;
- recovery restore and later dirty close refusal;
- clean external reload and dirty conflict followed by explicit reload;
- close flush failure/native cancel preserving retained baselines;
- browser file, native Open and Recent Open replacing a dirty collection with a clean baseline;
- successful Close Document and new same-ID import using a new workspace buffer/ledger.

Existing save, recovery, identity, navigation, source-action, StrictMode/unmount, pending-reader-write and close-protocol suites remain passing. No existing assertions or TODO cases were removed or weakened.

## Verification

| Check | Result |
| --- | --- |
| Targeted, 19 suites | **159 passed** |
| Full `npm test`, 62 suites | **434 passed, 70 TODO** |
| `npm run build` | PASS |
| Final `npx tsc -b` after test-only assertion additions | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged categories/counts |
| `git diff --check` | PASS |
| Packaged smoke script syntax | PASS |
| Local macOS arm64 package | PASS |
| Packaged smoke | **15 PASS checks**, exit 0 |

Lint categories: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No suppression or configuration change.

Targeted suites: active-document-authority, saved-baseline-lifecycle, inactive-document-baselines, close-document-protocol, close-document, window-close, direct-save, save-as-completion, workspace-recovery, recovery-write, recovery-clear, identity, os-open, workspace-search, navigation-stale, navigation-red, workspace-source-actions (scenario and core), workspace-structural-heading.

Logs: `/private/tmp/baseline-{before,targeted,full,build,lint,package-local,packaged}.log`.

## Packaged verification and limits

The default packager attempted a blocked GitHub download. Packaging succeeded using the installed Electron distribution:

```sh
npx electron-builder --mac --dir --arm64 -c.electronDist=node_modules/electron/dist
node scripts/test-window-close-packaged.mjs
```

The GUI smoke required execution outside the sandbox and exited 0. It launched through file:// with no Vite development server. The three new checks prove:

1. Untouched B remains clean and Close Document succeeds.
2. Real CodeMirror edits to A survive A→B→A; B stays clean and returned A refuses Close Document as dirty.
3. Real Save As writes A's edited source, remaps identity, and retains a clean baseline through departure/return before successful close.

All twelve prior save, download, metadata restoration, recovery and native window-close checks also pass. Native dialogs are injected by the existing harness; real filesystem writes are verified.

This is an unsigned local macOS arm64 package, not release certification. Physical dialog interaction, assistive technology, Windows and Linux are NOT TESTED. The metadata smoke reopens documents within the running process, not across a full application restart.

The intended observable correction is document-correct dirty/saved state on activation and its existing downstream save/recovery/close consumers. Collection-wide close protection, inactive-document recovery, capability normalization, general source ownership, and Step 18 remain outside scope. No broader runtime ownership was required.
