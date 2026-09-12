# Shared collapsible Authoring Checks panel

## Established cause and change

Write used a right-side findings column, while Split explicitly placed findings
in a bottom grid row. Severity filters were a separate absolutely positioned
navigation element against the main area, so they could obscure rendered preview.

Both modes now use `AuthoringChecks`, one component containing the header, severity
filters, findings, empty state, collapse button and reopen rail. Editor, preview
and checks remain sibling grid items; no editor/preview wrapper was introduced.
Filters use normal panel flow and report the selected value with aria-pressed.
Finding navigation still calls the existing guarded diagnostic-jump lifecycle.

The document workspace owns one `checksOpen` presentation boolean alongside the
existing filter state. It survives Write/Split transitions, without introducing a
second diagnostics model or persistence policy. Collapsing hides the mounted
panel and exposes a 36px labeled reopen rail, returning the remaining column width
to the document panes. Filter state, findings and panel DOM remain available when
reopened. The editor/preview are not remounted by collapsing. Focus moves between
the collapse and reopen buttons when visibility changes, not on initial mount.

## Container-responsive geometry

The main authoring area is a named inline-size container. Geometry responds to
available content width, including outline changes, rather than raw window width.

- Above 960px: Write has editor/checks columns; Split has editor/preview/checks.
  Checks use a bounded 240–280px column. Split's two document panes share the rest.
- At 601–960px: Split stacks editor and preview in the left column, with checks
  spanning both rows on the right. Collapse widens both stacked panes.
- At 600px or below: expanded checks use a bounded bottom row (30% in Write, 25%
  in Split) so the document is not squeezed into unusable columns. Collapsed Split
  retains stacked document panes and the narrow reopen rail.

The toolbar/status bar and central authoring layout remain bounded. Pane overflow
is independent. This task does not implement Split synchronization, change
rendered Markdown, or change diagnostic generation/filter semantics, source,
pagination, semantic navigation, or Save/Download/close behavior.

## Files changed

- `src/components/AuthoringChecks.tsx`: shared panel and focus handling.
- `src/App.tsx`: workspace visibility state and shared component wiring.
- `src/index.css`: right-side grid, container breakpoints, in-panel filters and rail.
- `src/test/authoring-checks.test.tsx`: collapse/reopen focus, filter and mode
  persistence, finding navigation, unchanged source and dirty state.
- `src/test/split-layout.test.tsx`: update the superseded bottom-row contract.
- `scripts/test-pagination-packaged.mjs`: real placement, width, filter bounds,
  pane scroll retention, state persistence and narrow-window checks.

## Verification

The new regression failed before implementation because the named shared panel
and collapse controls were absent.

- Focused authoring-checks, Split layout, editor scroll and observation: 11 passed.
- Full suite: 218 passed, 70 existing TODOs; all 33 test files passed.
- TypeScript/Vite build and macOS arm64 local packaging: PASS.
- Lint: PASS with existing warnings.
- Diff whitespace and packaged-script syntax: PASS.
- Isolated packaged macOS, file:// without development server: PASS. Checks sit
  beside Write/Split content, filters remain within panel bounds, collapsing widens
  the document panes, collapse/reopen retains tested scroll positions, and filter
  and collapsed state survive mode switches. Intermediate and very narrow layouts
  keep document panes usable and contained. The harness lowered only its isolated
  window's minimum width to exercise the very narrow renderer fallback; production
  window limits were unchanged.
- Existing packaged Scroll/Page/Spread layout, shared Markdown theme, contrast,
  semantic continuity, content coverage and oversized-block checks: PASS.

Manual keyboard/VoiceOver review, Windows/Linux packaged behavior and unusual
text-scaling combinations remain NOT TESTED. The macOS package is unsigned local
verification, not a public release artifact.
