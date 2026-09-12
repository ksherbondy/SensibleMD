# Shared rendered Markdown theme

Scroll is the visual source of truth for rendered Markdown. Layout may change
wrapping, page boundaries and viewport geometry, but no longer selects a different
Markdown element theme.

## Architecture and established cause

Scroll and Page/Spread already shared ReaderSurface's ReactMarkdown pipeline.
Page/Spread add semantic page filtering; offscreen pagination uses a complete
render. Split preview uses ReactMarkdown separately, with the same GFM,
sanitization and semantic heading/block components. No parser/component migration
was necessary.

Previously, element styles were copied across `.document-reader`, `.book-page`
and `.authoring-preview` in App.css/index.css. Paginated code received pale text
without the dark Scroll `pre` background, while Split had different code padding,
foreground, heading sizes and typography. There was no yellow rendered `strong`
rule in the inspected source, so the explicit requested yellow treatment is now
defined in the shared theme rather than attributed to a nonexistent old selector.

`src/rendered-markdown.css` owns the `.rendered-markdown` theme, applied to all four
visible surfaces and the offscreen measurement article. App.css/index.css retain
shell geometry and overflow ownership. Their per-mode element styles were removed.

Shared elements include headings h1–h6, paragraphs, lists/items, blockquotes,
code blocks, inline code, strong/emphasis, links, images, horizontal rules and
tables/cells. The theme reuses Scroll's dark green `#173b32` code background and
`#ecf5e9` foreground, with 16px padding and a 4px radius. Nested code has a
transparent background and inherits that foreground. Strong text uses dark
`#34443d` on yellow `#f4d77b`. Inline code retains its light background and dark text.
Rendered typography follows the reader font-scale and line-height preferences in
all views, including Split. Native Markdown source remains unchanged.

Page/Spread measurement receives exactly the same token styles as visible pages.
Page counts may consequently change as the existing measured paginator responds
to canonical heading sizes and spacing; pagination mechanics were not changed.
Scroll shell, fixed sheets, oversized-group overflow, Split composition, semantic
navigation, content-width preference and document lifecycle code remain intact.

## Files changed

- `src/rendered-markdown.css`: shared theme.
- `src/App.tsx`: import and theme classes on rendered surfaces.
- `src/App.css`, `src/index.css`: remove duplicated element and root typography rules.
- `src/test/rendered-theme.test.tsx`: shared theme and token coverage in each view,
  including measurement, with unchanged dirty state.
- `scripts/test-pagination-packaged.mjs`: computed-style comparison for 21 tokens,
  plus explicit code/strong colors and contrast assertions.

## Evidence

The new rendering regression failed before implementation because the surfaces
lacked the shared theme. Results after implementation:

- Focused theme, measured-pagination and semantic continuity: 19 passed.
- Full suite: 217 passed, 70 existing TODOs; 32 test files passed.
- TypeScript/Vite build and local macOS arm64 packaging: PASS.
- Lint: PASS with existing warnings.
- Diff whitespace and packaged script syntax: PASS.
- Packaged macOS, isolated profile, file:// without a dev server: PASS. Computed
  colors, font properties, line height, padding, margins, borders and decoration
  match Scroll for 21 element selectors in Page, Spread, Split and measurement.
- Code and highlighted-strong foreground/background pairs exceed 4.5:1 contrast.
- Existing packaged Scroll shell, fixed-sheet geometry, responsive widths,
  semantic continuity, exact source coverage and oversized-content tests: PASS.

No remaining theme mismatch was observed in the tested tokens. Different line
wrapping, page boundaries and outer spacing remain intentional layout differences.
Manual visual/VoiceOver review, Windows/Linux rendering and platform font-raster
comparisons remain NOT TESTED. The macOS build is unsigned local verification.
