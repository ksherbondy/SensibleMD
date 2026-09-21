# Structural source-publication repair

Status: implemented and verified; uncommitted for review. No broader source boundary or runtime owner was introduced.

## Exact correction

`applyWorkspaceStructuralHeadingChange` already captures the successful `buffer.apply(...)` result as `updated`. The repair changes exactly two production expressions in `src/core/workspace-source-actions.ts`:

- The functional collection updater publishes `updated.text` to the captured activeDocumentId instead of reading `buffer.snapshot().text` when React evaluates the updater.
- React source receives the same `updated.text` instead of a separate live buffer read.

The functional updater still receives the latest collection container, preserving unrelated document updates. The structural transaction origin, edit, baseVersion read, single apply call and dirty projection from `updated.isDirty` are unchanged. No additional version increment or saved-baseline mutation was introduced. Other source mutation paths were not modified.

This prevents demotion of A followed by activation of B before React commits from publishing B's text into A's collection entry.

## Characterization and regressions

Only the existing unsafe-read characterization in `src/core/workspace-structural-heading.test.ts` was updated. It now asserts:

- React receives the transaction's `## A` text.
- After the live buffer changes, the deferred collection updater still writes `## A` to A.
- An independently updated B entry is retained by reference from the latest container.
- No extra buffer snapshot read occurs during either publication.
- The existing transaction and invalid-command assertions remain.

`src/test/source-publication.test.tsx` is byte-for-byte unchanged. Before the fix, its batched normal/StrictMode cases failed and its sequential controls passed: **2 failed, 2 passed**. After the fix all four pass.

Files changed in this task:

1. `src/core/workspace-source-actions.ts` — two expression substitutions.
2. `src/core/workspace-structural-heading.test.ts` — the one explicitly authorized characterization update.
3. This report.

Previous uncommitted baseline/native-binding repairs, their tests/reports, all other production paths and the repository packaged harness were left intact.

## Verification

| Check | Result |
| --- | --- |
| Targeted, 10 suites | **108 passed** |
| Full `npm test`, 67 suites | **496 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged categories/counts |
| `git diff --check` | PASS |
| Local macOS arm64 package | PASS |
| Packaged verification | **19 checks passed**, exit 0 |

Targeted suites: core workspace-structural-heading and workspace-source-actions; scenario structural-heading-action, workspace-source-actions, source-publication, active-document-authority, saved-baseline-lifecycle, native-save-binding, direct-save and save-as-completion.

Lint: 12 react(refs), 8 react-hooks(exhaustive-deps), 6 react(set-state-in-effect), 3 eslint(no-unused-vars), 1 eslint(no-unused-expressions). No suppression or configuration changes.

Logs: `/private/tmp/structural-publication-{before,targeted,full,build,lint,package,packaged}.log`.

## Packaged evidence

Built using the installed Electron distribution:

```sh
npx electron-builder --mac --dir --arm64 -c.electronDist=node_modules/electron/dist
node /private/tmp/structural-publication-packaged.mjs
```

The temporary verification script copies the unchanged repository packaged harness and adds one scoped check before its wrong-file-save checks. It imports A/B, enters Write, clicks Demote and B selection in the same renderer JavaScript evaluation, returns to A, verifies `## Baseline A` and dirty state, then saves A to a temporary native file and verifies that file's exact contents. It subsequently runs all eighteen existing packaged checks unchanged.

All nineteen checks pass with file:// loading and no development server. The packaged GUI run required execution outside the sandbox. This is an unsigned local macOS arm64 build; dialog responses are injected by the harness. Real renderer controls, IPC and filesystem writes are exercised. Physical input scheduling, native-dialog interaction, assistive technology, Windows and Linux are NOT TESTED. The deterministic React batching regression remains separately covered by the unchanged normal/StrictMode tests.

Intended observable correction: structural edits remain associated with their originating document even when another document activates before collection publication. General source ownership, structural edit planning from captured React source, and other publication interleavings remain outside this repair.
