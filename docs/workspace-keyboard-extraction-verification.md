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
