# Workspace keyboard extraction — Step 11

Scope: accepted Phase 1 Step 11, current renderer adapter only, with Phase 1.5's native-menu/accelerator boundary retained. Intended observable behavior change: **none**. Step 12 is not authorized.

## Characterization baseline

Production baseline: `67c8ee4`; working tree initially clean. Added five cases in `src/test/workspace-keyboard.test.tsx` before changing production:

- E toggles Read→Write, Write→Read and Split→Read; uppercase matching and existing broad modifier/composition/repeat/already-prevented behavior for non-S branches are preserved. Save rejects simultaneous Meta+Control and accepts uppercase Control+S.
- K opens/focuses the palette without closing existing search/settings; palette Escape retains existing focus restoration. F focuses the toolbar search field and reopens retained query/scope, including its existing permissive modifiers.
- Alt+Down/Up navigates current headings only in Read, including from an input target; a newly activated document supplies the current headings.
- Left/Right page navigation uses current page state and excludes input, textarea and descendants of contenteditable=true. Read plus noncontinuous layout is required; repeat/composition/modifier behavior remains unchanged. Continuous, Write and Split exclusions are explicit.
- Tracks the named shortcut handler separately from Escape dismissal: exactly one active per workspace, removal/replacement on rerender, cleanup on unmount and no duplicate handling after remount. Fresh headings currently cause re-registration on every workspace render, including opening settings.

Existing keyboard-save covers Meta/Ctrl platform paths, shift/alt/composition/defaultPrevented exclusions, preventDefault, repeat suppression, current editor source, failure and edits during a pending save. Existing command, transient UI, search, navigation-red, pagination-reader, split-layout, structural editor shortcut and close-document suites remain in the gate. No test expectation or production behavior was changed while establishing the baseline.

Before extraction: **72 targeted tests passed, 10 files**; full suite **304 passed, 70 TODO, 50 files**; TypeScript/Vite build **PASS**; lint **exit 0, same 33 warning categories/counts as accepted Step 10**.

Packaged/physical-keyboard verification: **NOT RUN for Step 11** unless extraction reveals a new runtime dependency. Automated events establish renderer event matching/default prevention/state effects; they do not certify OS menu routing, physical keyboard layouts/IME hardware, assistive technology or cross-platform native shortcuts. No native integration is proposed.

## Accepted extraction

Characterization commit: `6b1d84e`. Production changes are limited to `src/App.tsx` and new `src/core/use-workspace-keyboard.ts`. Added `src/test/workspace-keyboard-hook.test.tsx` for one direct hook case. The user reviewed and accepted the extraction-related lint delta before the final verification and commit.

Moved the exact existing `onKeyDown` function, window keydown registration/removal and useEffect into `useWorkspaceKeyboard`. Only the three parent state-update expressions become named toggleView/openPalette/openSearch callbacks. Search DOM focus stays after openSearch. All key matching, modifier checks, prevention locations, Save early return/repeat rule, view/layout conditions and editing-target detection are unchanged.

The hook receives ten inputs: view, readingMode, activeHeading, the original headings array (narrowly typed through IDs and used only as the original dependency), keyboardSave ref, toggleView, openPalette, openSearch, navigateHeading and turnPage. It receives no workspace/session/buffer/model/bridge controller. Heading/page callbacks use deferred wrappers because their parent const declarations occur later in the component; they are invoked only by events after render. No callbacks are memoized.

The original effect dependency array `[activeHeading, headings, readingMode, view]` is unchanged and the hook is called at the original effect position. The parent continues to rebuild headings each render, preserving listener re-registration cadence. The keyboardSave ref and its existing later layout effect assigning saveFile remain byte-identical in App. The new direct test holds dependencies constant, changes the ref's current callback, verifies no re-registration and confirms Save invokes the latest ref, then checks matching cleanup.

Shortcut-family preservation is established by the before/after scenarios and existing keyboard-save suite: strict S handling; functional E toggle; K palette; F retained search/focus; Read-only Alt heading navigation; Read noncontinuous page turns with the original editing exclusions. Dismissal remains a separate parent listener. No native menus, accelerators, IPC, editor keymaps or command catalog changed.

### Final verification and accepted lint baseline

| Check | Before extraction | Final extraction |
|---|---|---|
| Targeted suites | 72 passed, 10 files | 73 passed, 11 files |
| Full `npm test` | 304 passed, 70 TODO, 50 files | 305 passed, 70 TODO, 51 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 warnings | Exit 0, **31 warnings — accepted baseline** |
| Packaged/physical keyboard | NOT RUN | NOT RUN; no new runtime dependency revealed |

The category delta is exactly removal of the two `react/immutability` warnings formerly emitted for forward accesses to navigateHeading and turnPage inside the App-local effect. The deferred hook callback wrappers no longer trigger those diagnostics. The existing exhaustive-deps warning moves to the hook and additionally names keyboardSave/toggleView/openPalette/openSearch because they are now hook parameters; its category/count stays unchanged. The other 30 normalized warning messages are identical. No suppression or lint configuration was changed.

The extraction was paused at the requested lint review gate. The user explicitly accepted the 33→31 reduction as a natural consequence of moving the App-local forward references across the bounded hook boundary, not a regression. The two warnings were not artificially recreated: no suppression, configuration change, dummy reference, reordering or unrelated lint cleanup was added. The relocated exhaustive-deps warning remains visible and unchanged for later dedicated review.

Exact source comparison confirms the listener/effect body is identical after the three callback substitutions, including dependency order. App outside the replaced effect/import is byte-identical, including save freshness, dismissal and other hooks. `git diff --check`: **PASS**. No characterization tests were changed after extraction.

Intended observable behavior change: **none**. The only review exception is the described lint-category delta and relocated dependency diagnostic. Newly exposed coupling is the forward-declared navigation/page actions and the original headings identity governing effect lifetime; neither ownership nor registration behavior changed in tests.

Final pre-commit rerun: targeted suites, full `npm test`, `npm run build`, `npm run lint` and `git diff --check` all passed with the counts shown above. Callback freshness and listener registration/cleanup remain unchanged. No production or test changes were made after the lint-delta review; only this report was updated.

**Step 11 and Wave B are complete. Step 12 remains unauthorized and has not begun.** Existing physical keyboard/IME, native-menu, platform and accessibility limitations remain unverified, as do the unrelated Step 6 findings.
