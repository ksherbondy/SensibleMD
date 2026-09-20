# Stale Save As ownership repair verification

Status: **repair implemented and verified; awaiting review before Step 15 resumes**.

- Original defect characterization: `3e3bfb0`.
- Additional repair characterization: `2f24983`.
- Dedicated production repair: `0680730`.
- Previous accepted production baseline: `5e9f5f9`.

Step 15 extraction remains paused. Step 16 remains unauthorized. Save As has not been extracted and the accepted direct-save action is unchanged.

## Cause and continuity definition

The old Save As completion combined A's invocation document ID/version with whichever document owned the live workspace buffer at completion. Version comparison answered whether the buffer could be marked saved, but did not establish who owned that buffer. Thus a late result could adopt A's returned native identity over B and put B's live text into A's collection entry. An obsolete unmounted callback could also call the current bridge's recovery-clear operation.

A Save As operation now owns one **renderer activation lifetime**: the originating mounted workspace, with no intervening explicit document activation. Editing source, changing reading mode, or navigating within the same document does not revoke this lifetime. Any document activation revokes it, including leaving and returning to the same ID, same-ID reopening, and Save As adoption of a returned identity. Unmount revokes it as well.

ID equality alone is insufficient: A→B→A must not restore authority to the first A operation, and reopening an identical collection can retain the same ID while creating a new activation.

## Activation/session audit

All eleven existing document setter call sites were inspected and retained without changing their source/navigation behavior:

| Path | Document identity change | Session update |
| --- | --- | --- |
| History back/forward across documents | Target document | Existing session behavior retained |
| Cross-document internal Markdown link | Link target | Existing session behavior retained |
| Collection search result | Search target | Existing session behavior retained |
| Return to search origin across documents | Origin document | Existing session behavior retained |
| Browser single-file opening | Imported file | Set null |
| Browser collection opening/reopening | First imported document | Set null |
| Explicit collection chapter selection | Selected chapter | Existing session behavior retained |
| Previous/next chapter | Adjacent chapter | Existing session behavior retained |
| Native Open | Returned document | Returned native session |
| Native Recent | Returned document | Returned native session |
| Valid Save As adoption | Returned document | Returned native session |

These include all five active-session setter call sites. Initial session comes from workspace props. Home/native OS activation mounts or replaces `DocumentWorkspace`, keyed by `opened.sessionId ?? opened.id`; Close Document unmounts it. The new lifetime cleanup covers that boundary. Same-document heading/page/search navigation does not activate another document and does not increment the generation.

Navigation freshness intentionally includes source/projection changes and has navigation ownership; it would incorrectly revoke same-A editing. Recovery revision governs load/clear behavior, and clears would incorrectly revoke saves. Neither is reused. Collection entries contain only `{ id, name, source }`, with no per-entry native session/capability slot. There is therefore no valid background native-session adoption mechanism to reuse.

## Mechanism and stale policy

Only `src/App.tsx` changes in production:

- Keep the existing active-document state, renaming its raw setter to `commitActiveDocumentId`.
- Add a workspace-local ref `{ generation, mounted }` used only for Save As continuity.
- Preserve all `setActiveDocumentId(id)` call sites through a narrow wrapper that increments generation synchronously, then invokes the raw setter. This covers every existing activation, same-ID reopen, and transitions before React commits; it does not centralize source/navigation/session behavior or create a general activation controller.
- A layout effect marks the lifetime mounted; cleanup marks it unmounted and increments generation. Cleanup captures the stable ownership object at setup. StrictMode cleanup/setup cannot restore authority to an earlier generation.
- Capture generation in the Save As branch immediately before invoking the native API. Successful completion checks mounted/current generation before reading the live buffer or mutating collection/identity/recovery/status. Rejection reports the existing error only while ownership remains current.

An obsolete successful result is ignored by renderer adoption. Its returned ID/session/name are not stored or partially remapped into a background collection entry. The already-started native operation may have written a file and changed native session/recents; this repair does not cancel or undo it, revoke native authorization, or claim the file was not saved. No new status text is introduced: the current renderer status remains unchanged for stale success or stale rejection. A future normal recents refresh can expose the saved file through the existing native recents behavior.

Stale completion performs **no recovery cleanup**, even if the invocation source was successfully saved. A may have acquired newer unsaved edits before departure, and suppressing adoption means there is no post-adoption recovery write to rely on. Preserve A's existing collection source and recovery records. Do not read B's buffer as A's source. Existing editor updates remain responsible for keeping A's collection text current before switching.

Current same-A completion retains the original protocol, including live snapshot read, collision filter/map, returned identity/session/name adoption, clean/version distinction, notice clearing, recents refresh, statuses, and cleanup of captured old recovery. `trackSave` still owns the original entire promise chain; stale branches simply return and settle it normally. Direct Save, recovery hooks, DocumentBuffer, close/window-close, IPC/main, storage, navigation, and activation call-site behavior are not modified.

## Characterization and regression evidence

Before repair, the two original stale cases plus seven additional cases failed against unchanged production; four existing Save As lifecycle cases passed. Build passed. After repair, all pass:

- A→B with unchanged A: B retains ID/session/name, dirty text and collection membership; A retains its own text. Normal and StrictMode variants pass.
- A→B→A, both unchanged A and A edited after Save invocation: the old result cannot regain authority. A's retained text and recovery survive; no recents refresh or cleanup runs.
- A edited before departure, then B edited: B's complete buffer snapshot, saved baseline, notice, source, session/name/status and dirty state remain unchanged. Subsequent Save still routes to Save As, proving direct-save capability was not adopted. Returning to A yields A's newer retained text.
- Unmount/remount, normal and StrictMode: old completion cannot clear recovery through the new workspace's bridge or refresh its recents. New identity/source/status remain intact.
- Reimporting the identical collection with unchanged active ID invalidates the earlier operation.
- Stale rejection leaves the current status intact.
- Existing clean Save As and same-A newer-edit Save As continue to pass: returned identity is adopted, newer edits stay dirty, saved baseline is not advanced for a changed version, and recovery follows the new identity as previously characterized.

The original `3e3bfb0` test had an incidental assertion requiring the buggy background rename to SavedA and a later lookup by that name. Under the explicitly requested no-partial-adoption policy, these two lines now expect and revisit A instead. No B ownership/source assertion was removed or relaxed; the corrected tests still failed against old production and passed only after the repair. This corrects the fixture's assumption, not the bug expectations.

## Verification

Final checks after the cleanup-object adjustment:

| Check | Result |
| --- | --- |
| Targeted twelve suites | 83 passed |
| Full `npm test`, 56 files | 340 passed, 70 TODO |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, 30 warnings |
| `git diff --check` | PASS |
| Packaged verification | NOT RUN for this repair |

Lint categories remain 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. Initial development exposed two cleanup-ref diagnostics; capturing the existing stable ownership object in effect setup resolved them. No suppression, configuration change, dummy reference, or unrelated cleanup was introduced.

Logs: `/private/tmp/save-as-repair-before.log`, `/private/tmp/save-as-repair-before-build.log`, and `/private/tmp/save-as-repair-final-{targeted,tests,build,lint}.log`.

Source comparison confirms that all eleven activation calls and five session updates remain unchanged. The only production diff is the ownership ref/setter wrapper/mount cleanup plus Save As success/error ownership guards. The direct-save module, recovery modules, main/preload, and close hook are unchanged.

Files changed across characterization, repair and reporting: `src/App.tsx`, `src/test/save-as-stale-completion.test.tsx`, `src/test/save-as-ownership.test.tsx`, this report, and the Step 15 report's current-status pointer.

## Limits and next gate

The bridge harness establishes renderer ownership, recovery retention and StrictMode behavior. Packaged native Save As timing, native session behavior after an ignored result, physical dialogs, and cross-platform/accessibility interactions were not tested in this repair. No native disk rollback, cancellation, save-serialization change, background-session retention, or general document activation redesign is claimed.

The intentional observable change is that obsolete Save As completions no longer adopt or modify the current renderer lifecycle, remap background source, clear recovery, refresh recents, or replace current status. Valid same-activation saves keep their behavior.

The repaired baseline is ready for review and, after explicit acceptance, resumption of the **full Step 15 characterization gate**. This repair does not establish all outstanding collision/packaged Save As extraction gates. Step 15 extraction remains paused; Step 16 is unauthorized.
