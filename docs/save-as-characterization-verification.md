# Step 15 Save As characterization gate — complete

Status: **remaining characterization gate complete; extraction awaits explicit authorization**. Dedicated characterization commit: `149c0e5`. No Save As extraction action was created. Step 16 remains unauthorized.

Accepted production baseline is the stale-ownership repair `0680730`, with original characterization `3e3bfb0` and additional repair characterization `2f24983`. A source comparison confirms App, core and Electron production files are byte-for-byte unchanged from the accepted repair.

## Files changed

- `src/test/save-as-completion.test.tsx`: ten additional characterization cases.
- `scripts/test-window-close-packaged.mjs`: a bounded Save As sequence using the existing debugger, temporary-profile, polling and dialog-injection helpers. Existing save/close smoke checks remain.
- This report and the current-status pointer in `docs/save-as-extraction-verification.md`.

## Results by contract

| Contract | Evidence and result |
| --- | --- |
| Clean successful Save As | PASS in normal and StrictMode. Exact `{ name: 'A.md', source: '# A' }` payload; returned document/session/name adopted; unchanged buffer marked saved; dirty false; exact `Saved.` status; notice removed; one recents refresh; captured old-ID cleanup. Subsequent save bypasses Save As and writes the adopted file directly. |
| Same-A newer edits | PASS in normal and StrictMode. Native file receives invocation source; current buffer retains newer text; new ID/session/name adopted; markSaved is not called and savedVersion stays unchanged; dirty true; exact newer-edit status. Old-ID cleanup completes and the existing debounce creates recovery under the new ID. |
| Cancellation | PASS. Identity/session/name, entire buffer snapshot including saved baseline, collection names, dirty state and visible notice are preserved. No cleanup, recents refresh or new status. A subsequent native save-close starts a fresh Save As and completes, proving cancelled tracking settled. |
| Failure | PASS. The same state and recovery preservation checks hold; exact existing file-could-not-be-saved status is reported. Retry through native save-close succeeds, proving failed tracking settled. |
| Returned-ID collision | PASS. B is first saved as native Target.md, leaving A and unrelated C in the collection. Saving A to that same returned native ID removes the old B/Target entry and remaps A into its place. The remaining ordered entries are Target.md and C.md (cardinality two). Target contains A's live newer text/name, active ID equals the target ID, and C retains exactly `# C`. Disk contains A's invocation text while memory contains its later edits. Switching away and back proves the remapped collection source is the live A snapshot, not the invocation source. |
| Old-ID recovery | PASS. Valid cleanup calls the pre-adoption ID exactly once; persisted old recovery remains while cleanup is held and disappears after it completes. Accepted stale cases still prove no cleanup or recents refresh when ownership has changed. |
| Visible recovery notice | PASS. Valid success removes the existing notice, including newer-edit success; cancellation/failure retain the same notice element. Accepted stale ownership cases preserve B's notice. |
| Save operation pending | PASS. Close Document reports that saving is in progress; native save-close waits and does not dispatch another Save As. |
| Recovery cleanup pending | PASS. Close Document remains blocked despite the now-clean buffer. Native close initiated during the original operation keeps waiting through cleanup; a separate case starts native close after adoption and proves it also waits for cleanup. Clean completion permits close; newer edits keep the window open. |
| Keyboard Save | PASS. Cmd+S and Ctrl+S from a non-direct-save document invoke Save As once with the latest committed source and correct name; existing workspace-keyboard/direct-save tests remain active. |
| Ownership regressions | PASS. A→B, A→B→A, same-ID reimport, unmount/remount, stale rejection, recovery retention, capability preservation and source association retain the accepted repaired behavior. |
| StrictMode | PASS. Valid same-lifetime clean and newer-edit saves work during development lifecycle replay; existing stale tests and actual unmount/remount cases remain active. |

The collision fixture deliberately exercises the documented filter/map policy with an existing clean target entry and an unrelated third entry. It establishes which entry survives and which source it contains; it does not introduce a different deduplication policy or claim every possible multi-document unsaved-data scenario is covered. No defect or ambiguous outcome was observed in the required collision case.

The first draft of the single-document success assertion expected a visible chapter row. Source inspection confirmed the existing outline intentionally hides the chapter list when collection length is one; the test now asserts that DOM contract. Multi-entry remapping and source correctness are independently tested in the collision case. This was a test assumption correction; no production behavior changed.

## Packaged macOS arm64 Save As gate

PASS on a newly packaged local build via the extended existing smoke script:

1. Launches the packaged application from `file://` without a development server.
2. Uses the real renderer browser-file import path with a File/DataTransfer fixture, creating a document with no native session/direct-save capability.
3. Save invokes the native Save As handler. Injected cancellation leaves renderer ID/session/source/dirty state unchanged and creates no destination file.
4. A second Save As is held at the injected native dialog. A native window close requests Save and waits rather than closing or starting another Save As.
5. An editor edit arrives during the held operation. On release, the real native handler creates the file with invocation source, and the renderer adopts the canonical file identity, a nonempty session and returned filename while preserving newer dirty text. The pending close is vetoed.
6. Normal Save writes the newer text directly to the adopted file without another Save As dialog.
7. Another edit followed by native Save-close writes the adopted file and closes successfully, still without another Save As dialog.
8. All pre-existing toolbar Save/Download, Cancel/duplicate close, direct save-close, clean close and discard/recovery smoke checks also pass.

The harness controls native dialog results, not save IPC or filesystem writes. Expected identity is derived through the existing main identity helper after adoption, and subsequent direct writes establish that the adopted file remains authorized. The native session is observed as nonempty; no new test-only session API is introduced.

Harness development required two synchronization corrections: waiting for inserted text to reach renderer state, and deriving the expected canonical ID only after the new file exists. Deriving it before creation used the identity helper's documented nonexistent-path fallback, which can differ from realpath on macOS temporary-directory aliases. The final harness retains the exact ID assertion after adoption; no production identity behavior was changed or bypassed.

Commands: `npx electron-builder --mac --dir --arm64`, then `node scripts/test-window-close-packaged.mjs`. Logs: `/private/tmp/step15-gate-package.log` and `/private/tmp/step15-gate-packaged.log`. This is an unsigned local package; physical dialog interaction, assistive technology and Windows/Linux were not tested. No signing or public-release readiness claim is made.

## Final verification

| Check | Result |
| --- | --- |
| Targeted thirteen suites | **93 passed** |
| Full `npm test`, 57 files | **350 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0; **30 warnings**, unchanged categories |
| `node --check scripts/test-window-close-packaged.mjs` | PASS |
| `git diff --check` | PASS |
| Packaged Save As and existing native save/close smoke | PASS |

The final targeted/full/build rerun includes the additional post-adoption native-close case. It was added after the packaged smoke passed; it changes only a renderer test, and packaged production code remains unchanged.

Lint remains 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No new category, suppression or configuration change.

Renderer verification logs: `/private/tmp/step15-gate-{targeted,tests,build,lint}.log`.

## Authorization boundary

The requested characterization gate is complete for the accepted repaired baseline. The evidence supports authorizing a bounded Save As extraction with the existing capture, ownership, collision, recovery and tracking semantics preserved. It is not a claim that the extraction itself has been implemented or verified.

No production source, direct-save action, activation-generation mechanism, recovery hook, DocumentBuffer, close protocol, native session logic, IPC, navigation or metadata changed. Save As extraction remains paused until explicitly authorized. Step 16 has not begun.
