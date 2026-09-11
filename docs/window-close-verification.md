# Protected window close

Scope: window closing only. The default Electron menu, Cmd+Q/application quit,
Cmd+S, Save As, browser Download, and Close Document semantics remain unchanged.

## Architecture and cause

Before this change, the default menu close role and native close controls reached
BrowserWindow's normal close lifecycle with no renderer veto. `closeDocument()`
only protected its own callers. A renderer keydown-only fix cannot cover native
window controls or direct BrowserWindow close requests.

The renderer now checks the live DocumentBuffer in `beforeunload`. Clean windows
unload normally. Main handles a blocked **window close** with one native Save /
Discard / Cancel dialog. Reload vetoes do not open a window-close dialog. Main
recognizes application quit and preserves its previous behavior; quit protection
remains separate work.

Save invokes the existing `saveFile()` lifecycle and waits for tracked saves.
It approves closing only if the live buffer is clean and no save remains pending.
Cancelled or failed saves leave the window open. Newer edits remain dirty.

Discard clears recovery with the existing serialized recovery-clear operation,
suppresses the pending recovery timer for the discarded version, and approves
only that document/version. An edit during deletion keeps the window open and
receives a fresh recovery snapshot. Final unload removes the legacy source cache
so discarded writing cannot be restored from that cache. Disk source is unchanged.
Recovery-clear failure keeps the dirty document open with an error status.

Cancel does not save, discard, or change the document. Main accepts completion
only from the owning main frame and matching request ID. Duplicate requests share
one pending decision. Approved close retries still pass through `beforeunload`,
which rechecks current buffer state; no unconditional destroy/close bypass is used.

## Files

- `electron/window-close-lifecycle.cjs`: native close/dialog coordination and request validation.
- `electron/main.cjs`: installs the coordinator per window.
- `electron/preload.cjs`, `src/electron-api.d.ts`: narrow decision/completion bridge.
- `src/core/use-window-close.ts`: live-buffer unload veto, decision handling and final recheck.
- `src/App.tsx`: existing save/recovery integration and discard timer suppression.
- `src/test/electron-double.ts`: decision bridge test double.
- `electron/window-close-lifecycle.test.ts`: main lifecycle, sender validation and quit exclusion.
- `src/test/window-close.test.tsx`: renderer save/discard/cancel, failures, races and recovery tests.
- `scripts/test-window-close-packaged.mjs`: isolated macOS packaged smoke test.
- This verification record.

## Evidence

The initial regression test failed against the original implementation: dirty
`beforeunload` was not prevented. It passed after implementation.

- Focused: **27 passed**, including **7 unchanged Close Document tests**.
- Full suite: **195 passed, 70 existing TODO**, 28 test files passed.
- TypeScript/Vite build: **PASS**.
- Lint: **PASS with existing warnings**.
- Electron main/preload/coordinator and smoke-script syntax: **PASS**.
- `git diff --check`: **PASS**.
- Local macOS arm64 package: **PASS**, unsigned local verification build.
- Packaged smoke: **PASS** for file:// launch without a dev server, dirty close /
  Cancel / duplicate suppression, successful Save and window closure, clean close
  without a dialog, and Discard with disk preservation and recovery deletion.

The main tests model the shared close event used by default Cmd+W, native controls,
and BrowserWindow.close(); those named cases are not physical OS input tests.

Packaged verification uses the actual packaged renderer, preload, IPC, filesystem
save/recovery handlers and native BrowserWindow lifecycle with temporary user data.
Dialog answers are injected in main. It does not automate native dialog interaction.
Run after `npm run package:mac:dir` using:

```sh
node scripts/test-window-close-packaged.mjs
```

## Remaining manual verification

Physical Cmd+W, macOS red close button, keyboard/Escape/focus behavior in the native
three-choice dialog, VoiceOver, and unchanged Cmd+Q behavior require manual checks.
Windows/Linux native close controls and Narrator/Orca are **NOT TESTED** here.
Application quit protection, forced termination/crash handling, and broader save,
recovery, navigation and filesystem remediation are outside this task.
