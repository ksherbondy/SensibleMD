# Explicit Save and Download copy

## Scope and implementation

This is a toolbar/palette correction, with no new save implementation or state owner.
`saveFile()` retains its native direct Save and native Save As branches. The former
browser download fallback is extracted unchanged into `downloadCopy()`. If no
native save API exists, Save reports that saving is unavailable; it never exports.
The keyboard listener remains connected to `saveFile()`.

The toolbar always shows distinct controls for an open document:

- **Save**: floppy-disk icon, accessible name/title `Save`. Enabled when native
  saving is available and the document is dirty, or when it needs its first Save
  As. Clean authorized files disable Save. A clean document without a writable
  path can still need its first Save As, so Save remains enabled in that case.
- **Download copy**: Download icon, accessible name/title `Download copy`.
  Available independently of dirty state and native save availability.

The palette has separate `file.save` / `Save` and `file.downloadCopy` /
`Download copy` commands. Only Save advertises Cmd/Ctrl+S. Download uses the existing
Blob/anchor export and neither updates document identity nor marks the buffer
saved or clears recovery. Native Save, Save As adoption, Recents, window closing,
application quit, and recovery/dirty-state lifecycles are otherwise unchanged.

## Files changed

- `src/App.tsx`: separate toolbar/palette commands and extraction of download action.
- `src/App.css`: disabled toolbar control appearance.
- `src/test/download-state.test.tsx`: distinct labels/icons, enabled states, native
  export invariants, browser Save exclusion, and palette dispatch tests.
- `src/test/scenario.tsx`: Save helper follows the new accessible name.
- `src/test/close-document.test.tsx`: no-document assertion follows the new name.
- `scripts/test-window-close-packaged.mjs`: extends the existing isolated packaged
  smoke with toolbar assertions, a real copy download, and toolbar Save.
- This verification record.

## Evidence

The updated toolbar regression initially failed because there was no control named
`Save`. After implementation:

- Focused download, Save As, keyboard Save, recovery, window-close, and Close
  Document suites: **44 passed**.
- Full suite: **198 passed, 70 existing TODO**, all 28 test files passed.
- TypeScript/Vite build: **PASS**.
- Lint: **PASS with existing warnings**.
- `git diff --check` and packaged smoke script syntax: **PASS**.
- Local macOS arm64 packaging: **PASS**, unsigned local test build.
- Packaged smoke: **PASS** for distinct toolbar icons/names/disabled states, real
  Download copy output with original-file and dirty-state preservation, and toolbar
  Save updating the original and marking it clean. Existing packaged clean/dirty
  window-close, Cancel, Save, Discard and duplicate-request checks also passed.
  The smoke uses temporary user data and injected close-dialog responses, with
  actual packaged renderer/preload/IPC and filesystem/download operations.

Focused assertions cover original-file writes and clean state after Save; unchanged
original, identity/session, dirty state and recovery after Download copy; Save As
adoption; keyboard Save across macOS/Windows/Linux key conventions; and distinct
palette commands with Save-only shortcut and separate execution paths.

## Remaining manual verification

Manual toolbar inspection at narrow widths and text scaling, keyboard focus and
screen-reader announcements (VoiceOver/Narrator/Orca), and native Windows/Linux
packaged interaction remain **NOT TESTED**. Automated key-event tests do not stand
in for physical OS shortcut testing. Signing/release readiness is outside scope.
