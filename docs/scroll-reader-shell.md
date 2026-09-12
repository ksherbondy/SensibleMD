# Scroll reader shell consistency

Scroll now uses the same bounded central area as Page/Spread: toolbar, reader
viewport, then controls in normal layout flow. This is a Scroll-only layout
correction; Split synchronization and Page/Spread geometry are unchanged.

## Established cause

The history, section-context and collection controls were absolutely positioned
against `.main-area`, over the Scroll article. Article bottom padding could not
reserve an application control row. Later width rules also forced the article to
full width and defeated the content-width preference. The global status bar was
already a normal-flow sibling of the workspace, not the floating control owner.

## DOM and geometry

`ReaderSurface` now renders `.scroll-reader > .document-reader > .reading-column`.
The outer wrapper fills the central flex space after the toolbar and bottom
controls. It provides the same green background as Page/Spread, with 28px side
gutters and 24px vertical gaps. Only the document surface scrolls vertically;
its inner reading column follows `--reader-width`, retaining padding and outer
gutters even at narrow preferences.

Existing bottom controls share a `.scroll-navigation` wrapper in Scroll mode.
They use static positioning in a wrapping flex row with a real minimum height.
The global status bar and toolbar do not shrink. In other modes the wrapper uses
`display: contents`, preserving the existing positioning of those controls.
The viewport shell remains bounded at narrow window sizes as well.

Reading observation now uses the actual article as its IntersectionObserver root.
ResizeObserver watches both the surface and inner column. A geometry change
projects the current semantic anchor through the existing NavigationWork guards;
it does not write a new anchor, dirty state, source, or identity. Observer cleanup
and an explicit surface-lifetime check reject stale callbacks after document or
mode changes. The resize projection also invalidates old passive observations.
No changes were made to Split-mode synchronization or Save/Download/close behavior.

## Files and evidence

- `src/App.tsx`: Scroll wrappers, bottom-control wrapper, guarded anchor projection.
- `src/index.css`: bounded Scroll viewport, gutters, inner column and in-flow controls.
- `src/core/use-reading-observation.ts`: container observation and resize invalidation.
- `src/test/scroll-shell.test.tsx`: wrapper/control separation, observer root,
  semantic resize projection and stale callback rejection.
- `src/test/dom-polyfills.ts`: record IntersectionObserver options for assertions.
- `scripts/test-pagination-packaged.mjs`: real Scroll footer/text bounds, gutters,
  width preference, outline/resize position retention, plus existing Page/Spread checks.

The new tests failed before implementation because the bounded Scroll shell and
container resize observer were absent.

Results:

- Focused Scroll shell, reading observation and position continuity: 13 passed.
- Full suite: 216 passed, 70 existing TODO, 31 test files passed.
- TypeScript/Vite build and local macOS arm64 packaging: PASS.
- Lint: PASS with existing warnings.
- Diff whitespace and packaged script syntax checks: PASS.
- Packaged macOS (isolated profile, file://, no development server): PASS. Document
  bounds end above the in-flow controls; controls end above the status bar; final
  document content remains reachable; both gutters remain visible. Outline toggles,
  content-width changes and window resize retain the selected semantic target.
  The preference changes the inner column without changing the outer frame width.
- Existing packaged Page/Spread fixed-sheet, responsive geometry, semantic target,
  exact content coverage and oversized-block reachability checks: PASS.

Manual VoiceOver/keyboard review and Windows/Linux packaged verification remain
NOT TESTED. The macOS package is an unsigned local verification build.
