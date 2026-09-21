# Explicit native-save binding repair

Status: implemented and verified; uncommitted for review. This report describes changes after the preceding uncommitted saved-baseline repair. No general runtime controller, universal activation helper, generic authorization manager, Context, reducer migration or renderer-supplied destination path was added.

## Defect and authority contract

A collection document could inherit another active document's canSaveDirectly/session values through internal-link, history or search activation. Main previously accepted source alone and wrote to whichever file its requesting window authorized. The reproduced internal-link case overwrote native A with browser B's source and marked B clean.

Renderer now owns one `NativeSaveBinding | null`, containing `{ documentId, sessionId }`. Its ref is the synchronous authority for save invocation/revocation, and React state is its rendering projection. `activeSessionId` and `canSaveDirectly` are derived from the binding matching activeDocumentId; they are no longer independently writable state.

Main remains authoritative for `{ documentId, sessionId, filePath }` per requesting webContents. Direct-save requests include `{ documentId, sessionId, source }`. Main compares both identifiers with that sender's current native authorization before any write. It rejects missing/mismatched/stale bindings with `{ error: "binding-mismatch" }`. Malformed source requests still throw the existing validation error. Successful saves retain the existing `{ name }` result.

A validated write captures its session/destination before awaiting filesystem work. Replacing native authorization during that accepted write cannot redirect it. Main does not accept a renderer path and does not fall back to an unrelated currently authorized file.

Main validates the claimed binding, not the semantic content of arbitrary text. The renderer is responsible for constructing that request from the active document and its live binding. This is a bounded accidental wrong-file-write repair, not a claim that main can inspect or authenticate React's internal state.

## Production changes

- `src/core/use-native-save-binding.ts`: focused binding ownership with synchronous read/install/revoke and a React projection. No effects or persistence.
- `src/App.tsx`: revoke at the existing generation-aware setActiveDocumentId boundary; initialize/install accepted native bindings; derive session/capability; capture and validate invocation ownership for direct-save completion.
- `src/core/workspace-save-actions.ts`: include both binding IDs in direct Save; distinguish binding rejection from filesystem failure; guard baseline/cleanup mutation by current binding/lifetime; install accepted Save As bindings as one pair.
- `src/electron-api.d.ts`: updated direct-save request and discriminated mismatch result.
- `electron/main.cjs`: validate sender-session/document equality before writing and retain the validated destination.

Preload already forwards the complete payload and result, so no preload code change was needed. No additional IPC channel was introduced.

## Exact lifecycle integration

| Route | Renderer binding after transition | Save behavior |
| --- | --- | --- |
| Browser file open | null | Save As |
| Browser collection open | null | Save As |
| Same-ID browser reimport | null, even if identity repeats | Save As |
| Collection selection | revoked synchronously | Save As |
| Next/previous chapter | revoked synchronously | Save As |
| Cross-document history back/forward | revoked synchronously | Save As |
| Cross-document internal link | revoked synchronously | Save As |
| Collection search direct selection/cycling | revoked when document changes | Save As |
| Cross-document return to search origin | revoked synchronously | Save As |
| Same-document navigation/editing | retained | Direct Save when otherwise enabled |
| Native Open / Recent Open | old binding revoked on adoption; returned pair installed | Direct Save with that pair |
| Same-ID native reopen | fresh returned session installed | Old session rejected by main; current session accepted |
| Accepted Save As | existing ownership check, identity/ledger remap, then returned pair installed | Subsequent Save uses direct Save |
| Save As cancellation/failure/stale completion | no new renderer binding adoption | Existing applicable binding state remains |
| OS/native initial workspace | initialized from accepted initial document/session | Direct Save with that pair |
| Close Document refused/failed | no binding transition | Existing retry behavior |
| Workspace unmount | renderer lifetime ends; completion guard fails | No late markSaved or recovery cleanup |

Binding revocation is added to the existing identity setter; activation bodies and their navigation choices were not consolidated. The setter still invalidates Save As generation synchronously. Save As still performs its ownership check before collection/identity mutation. Ordinary navigation within a document does not invoke the identity setter.

The baseline ledger does not retain native capabilities. Returning to a previously native collection entry does not restore its old session; native adoption must establish authority again. Main's previously authorized session may remain stored after renderer revocation, but a request for another document/session cannot use it.

## Save completion and failure semantics

- Main binding mismatch: no disk write, no markSaved and no recovery clear. Revoke only if the rejected binding/activation is still current; show the existing save-failure status. Do not automatically invoke Save As.
- Explicit retry after binding rejection: Save As can establish a fresh binding.
- Ordinary filesystem failure: preserve the binding and saved baseline so the user can retry direct Save.
- Older mismatch/failure: cannot revoke or overwrite a replacement binding; cannot mark its buffer saved or clear its recovery.
- Successful completion: retain the existing version comparison; additionally require the invocation binding object, activation generation and mounted lifetime before markSaved/cleanup.
- The existing earlier-version status branch remains unchanged. This repair does not redesign general status arbitration.
- Recovery cleanup already started after an accepted current save retains its captured document ID and remains in pending-save tracking; it is not retargeted.
- Save As still retains live newer edits, marks saved only under its existing version comparison, and clears recovery under the original document ID.

Source/version capture timing, save promise tracking, normal save ordering, cleanup tracking, Save As generation checks, saved-baseline handoff, recovery protocols, navigation behavior and close/window-close protocols remain. No effect or imperative-handle registration moved; the new hook registers none.

## Regression and acceptance evidence

The two original `save-capability-binding.test.tsx` cases were rerun before changes and failed as expected. They remain byte-for-byte unchanged and now pass in normal and StrictMode execution.

New coverage:

- `electron/direct-save-binding.test.ts`: **16 tests** executing the actual main module's registered handlers with temporary real files. Covers missing/empty/wrong/type-invalid binding fields, malformed source/null payload, unauthorized/destroyed sender, cross-window binding use, same/different-document stale sessions, accepted current sessions, and session replacement while a validated A write waits at rename.
- `src/test/native-save-binding.test.tsx`: **37 tests**. Covers all browser/collection activation routes under normal and StrictMode execution, history in both directions, direct/cycled search and return to origin, native/Recent/same-ID reopen adoption, same-document preservation, mismatch and filesystem retry, old success/mismatch/failure after replacement, unmount, and A→B→A with a fresh same-ID session.
- `src/test/native-save-binding-hook.test.tsx`: **3 tests**. Establishes synchronous revocation/install before React commit under normal/StrictMode execution, and rejects a successful old completion even when buffer version is unchanged but binding ownership is lost.
- Existing Save As completion/ownership/lifecycle suites pass, including accepted pair adoption, newer edits, cancellation, failure, stale completion, collision and cleanup tracking.
- Existing baseline, recovery, close/window-close, metadata, identity, OS-open, navigation and keyboard-save preservation suites pass.

Existing direct-save tests were updated only to expect the required document/session request fields. Existing main Save As lifecycle tests now submit the accepted pair on subsequent direct saves. FakeDesktop validates bindings and captures the accepted path at invocation rather than consulting authorization when a held write is released. Its harness tests were updated for the explicit mismatch result. These changes align test transport with the new contract; they do not remove behavioral assertions.

## Verification results

| Check | Result |
| --- | --- |
| Targeted, 25 suites | **257 passed** |
| Full `npm test`, 66 suites | **492 passed, 70 TODO** |
| `npm run build` | PASS |
| Final `npx tsc -b` after test-only additions | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged categories/counts |
| `node --check` main, preload, packaged harness | PASS |
| `git diff --check` | PASS |
| Local macOS arm64 package | PASS |
| Packaged smoke | **18 PASS checks**, exit 0 |

Lint: 12 react(refs), 8 react-hooks(exhaustive-deps), 6 react(set-state-in-effect), 3 eslint(no-unused-vars), 1 eslint(no-unused-expressions). No suppression or configuration change.

Targeted suites: save-capability-binding, native-save-binding, native-save-binding-hook, main direct-save-binding, main save-as-lifecycle, direct-save, save-as-completion, save-as-ownership, renderer save-as-lifecycle, active-document-authority, saved-baseline-lifecycle, inactive-document-baselines, close-document-protocol, close-document, window-close, workspace-recovery, recovery-write, recovery-clear, identity, os-open, reader-metadata, workspace-search, navigation-stale, navigation-red, keyboard-save.

Logs: `/private/tmp/native-binding-{before,targeted,full,build,lint,package,packaged}.log`. Source snapshots taken before this repair are under `/private/tmp/native-binding-start` for comparison with the prior uncommitted baseline repair.

## Packaged scope

Built with installed Electron, without a new download:

```sh
npx electron-builder --mac --dir --arm64 -c.electronDist=node_modules/electron/dist
node scripts/test-window-close-packaged.mjs
```

The packaged GUI smoke ran outside the sandbox and used file:// loading without a development server. The three added checks prove:

1. Main rejects missing/mismatched direct-save bindings without changing A's real file.
2. Internal-link activation of browser B revokes A's renderer binding; editing/saving B invokes Save As, and cancellation leaves A unchanged and B dirty.
3. Accepted B Save As installs B authority, subsequent direct Save changes only B, and an obsolete A request is rejected without changing either file.

The existing fifteen packaged checks also pass, including baseline round trips, Save As newer-edit behavior, metadata restoration, download, native save-close, cancel and discard. No existing packaged checks were removed.

This is an unsigned local macOS arm64 package. Dialog results are injected by the harness; real IPC, editor input and filesystem writes are exercised. Physical native-dialog interaction, assistive technology, Windows and Linux are NOT TESTED. No public-release or comprehensive security certification is claimed.

## Scope limits

No broader ownership was required. Main session/watch lifetime after browser activation, external-change payload scoping, open-result ordering, collection-wide close protection and general runtime/source ownership were not redesigned. Binding validation prevents stale renderer authorization from silently selecting another file; it does not claim those adjacent policies are resolved.

Changes remain uncommitted for review. The previous saved-baseline work, its reports/tests, the audit/stop reports and user-owned currentTree.md remain intact. No Step 18 activation helper was begun.
