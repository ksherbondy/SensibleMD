# Measured pagination — Phase 1

This implements the current user-approved whole-block measurement scope. It
supersedes the fixed 76/52-word capacity policy described in the earlier navigation
repair design, without changing navigation identity, bookmarks, saving or lifecycle
ownership. Paragraph/list/table fragmentation and recto/verso redesign remain out
of scope.

## Pipeline and files

Previously, `App.tsx` parsed the document and called the word-capacity paginator on
every render. Page/Spread selected different word thresholds. Typography could
reflow inside a page without changing the page map.

Now:

1. The source/version-memoized semantic model retains exactly the same identities.
2. `ReaderSurface.renderMarkdown()` renders the complete source offscreen with the
   same ReactMarkdown/remark-gfm/sanitization pipeline, semantic block components,
   and `.book-page` / `.page-content` CSS as visible pages.
3. `use-measured-pagination.ts` reads DOM geometry and produces a derived page map.
4. `pagination.ts` packs complete blocks by measured height. Word counts remain
   metadata only. The existing full-document page projection resolves references
   before selecting blocks; source is never split or rewritten.
5. The existing semantic anchor determines the physical page and spread start.
   Measurement never writes the navigation anchor or a saved page number.

Production files changed:

- `src/core/pagination.ts`: measured geometry input and atomic height packing.
- `src/core/use-measured-pagination.ts`: measurement, invalidation, and stale-result guards.
- `src/App.tsx`: shared measurement render, derived page wiring, model memoization,
  pending-layout UI, and semantic DOM mapping for thematic breaks.
- `src/core/page-render.ts`: measurement-only ID namespace for generated content.
- `src/core/use-page-step.ts`: container-observed effective spread column selection.
- `src/index.css`: shared block flow, page-width preference, hidden measurement
  surface, stable scrollbar gutter and table overflow.

The measurement surface is fixed offscreen, invisible, inert, and `aria-hidden`.
Its IDs have a `measure-` prefix, including generated footnote IDs, so visible
navigation lookups and accessibility references do not collide. It is mounted
only in Read/Page or Read/Spread.

## Geometry contract

The early CSS `min-height: 620px` is overridden by existing later rules:
visible `.book-page` containers have `height: 100%`, `min-height: 0`, and scroll
inside the finite `.book-pages` grid. The implementation measures that **actual
resolved grid height**, rather than treating 620px as usable content height.

Usable content height is:

```
grid border-box height − grid vertical padding
− page vertical padding and borders
− footer rendered height and vertical margins
```

Page width comes from the first resolved CSS grid track. The offscreen page gets
that width and inherits the same font scale, line height, responsive padding and
reader CSS. The Content width preference now caps the total Page/Spread grid
width; CSS and the existing effective column count divide it into individual
pages. No TypeScript page-height/padding constants mirror CSS values.

`.page-content` uses a column flex layout with non-shrinking blocks. Top-level
margins cannot collapse differently on a page boundary: each block consumes its
rendered border-box height plus computed top/bottom margins, identically in
measurement and visible flow. There is no additional inter-block flex gap.
The footer is outside this flow and its full margin box is reserved separately.
The same stable scrollbar gutter avoids a width change for overflowing pages.

Headings, paragraphs, lists, blockquotes, code, tables and thematic breaks are
matched to their source-backed DOM IDs. Generated endnotes are measured as an
additional trailing margin box and stay with the last source group on the last
page, preserving the earlier footnote placement contract.

## Invalidation and position

Document/source version, font scale, line height, content width, requested Page /
Spread mode and effective column count invalidate the derived result.
ResizeObserver watches the stable visible grid, its reader container, and the full
offscreen content / blocks. Window resize, fonts.ready, font loadingdone, and captured media load/error
also schedule measurement. This covers both layout changes and late content sizes.

Notifications coalesce into one animation frame. An unchanged geometry signature
reuses the existing result. Visible page fragments are not observed, so repacking
cannot resize its own measurement input. Initial measurement happens after DOM
commit; cleanup cancels the frame and invalidates the effect lifetime. Results are
qualified by semantic-model identity and layout configuration. A stale callback
cannot replace the current document's map.

The current anchor determines its new containing page after reflow. Spread pairing
uses the existing one/two-column step and preserves right-page targets. No raw page
number is persisted or used to restore position. While geometry is unavailable,
`Preparing pages…` is shown with disabled page traversal; there is no production
word-count fallback.

## Responsive reader-container correction

Spread previously selected columns from a window media query, while page padding
used viewport units. A narrow reader could therefore receive two columns merely
because the application window was wide. The new regression reproduced this on
the previous implementation: a narrow grid expected one column but received two.

Column selection and measured pagination now share the actual page-grid ref.
ResizeObserver watches both that grid and its reader container, covering outline
open/close and future panel resizing without requiring a window resize event.
Spread uses two columns only when the available grid width fits two CSS-defined
320px minimum page widths plus the computed gutter. Page always uses one column.
The reader establishes an inline-size query container; page padding and the
12–24px center gutter use reader-relative units. Visible and measurement pages
therefore receive the same geometry. The content-width preference still caps the
total grid width, so expansion stops at the user's chosen cap.

Page/Spread and content-width changes also invalidate measurement. Geometry
changes repack the derived page map without writing the semantic reading anchor,
dirty state, or source.

## Oversized blocks and Phase 2 limits

Heading runs remain with the next whole block. A group taller than an empty page
is placed once on that page; the loop always advances. The page is keyboard
focusable and vertically scrollable. Code retains its existing wrapping/overflow
behavior, tables have horizontal overflow, and images stay within page width and
can extend the scrollable page vertically.

No supported block type requires fragmentation merely to remain reachable.
However, a long paragraph/list/table/code block/blockquote/image can occupy a
scrolling page, and heading grouping may leave unused space. Phase 2 still needs
content-preserving fragment layout if those blocks should span physical pages.
Generated footnotes are one trailing group, not individually paginated endnotes.

The extra full-document DOM and Markdown render have a cost. This change memoizes
the semantic parse and avoids observer loops; it does not establish a large-file
performance budget or implement off-main-thread layout/virtualization. Existing
resource URL policies, including relative-resource limitations, are unchanged.

## Regression evidence

The first new regression failed on the previous word-count implementation:
changing supplied block heights did not change boundaries. It passes with measured
packing.

Test files added/updated:

- `src/core/measured-pagination.test.ts`: geometry-driven boundaries, margins,
  complete block coverage, oversized groups, missing geometry and endnotes.
- `src/test/measured-pagination.test.tsx`: settings/resize/font/content invalidation,
  semantic target retention, readiness placeholder, stale callbacks, stable frames,
  unique IDs and exact padding/border/footer subtraction.
- `src/test/pagination-geometry.ts`, `src/test/setup.ts`: explicit synthetic DOM
  geometry and controlled observer for jsdom. This code is test-only and is never
  a fallback in the application.
- Existing `pagination-repair`, `document-core`, `corpus-integration`,
  `pagination-reader`, `navigation-red` and `position-continuity` tests now use
  explicit pixel fixtures where they previously depended on word thresholds.
  Their semantic/coverage/continuity assertions remain intact. Footnote counting
  is scoped to visible pages rather than the hidden measurement copy.
- `scripts/test-pagination-packaged.mjs`: isolated packaged Electron/Chromium
  layout verification, with temporary files and injected Open dialog result.

Results:

- Latest focused measured-pagination, pagination-reader and position-continuity suites:
  **23 passed** across three files.
- Full suite: **212 passed, 70 existing TODO**, all 30 test files passed.
- TypeScript/Vite build: **PASS**.
- Lint: **PASS with existing warnings**; no new warnings in pagination code.
- Diff whitespace and packaged-script syntax checks: **PASS**.
- Local macOS arm64 packaging: **PASS**, unsigned local verification build.
- Packaged Chromium layout: **PASS** with the dev server unused (`file://` load).
  Font scale changed page count **9 → 25**, line spacing **9 → 13**, content width
  **17 → 9**, and window geometry **13 → 9** for the same Markdown. The selected
  section remained visible through reflow and Page/Spread changes.
- Packaged container-only changes: **PASS**. In both Page and Spread, closing the
  outline expanded page tracks and recomputed the gutter with unchanged window
  bounds; reopening retained the semantic target. Narrow-reader Spread collapsed
  to one column and expanded to two after closing the outline. Simulated panel
  resizing also recomputed geometry and retained the target.
- Packaged exact coverage: **37/37 source blocks once each**; ordinary page content
  plus margins/footer fit the measured page height.
- Packaged font-completion/rapid-resize checks: **PASS**, no observer errors.
- Packaged late image-size repagination: **PASS**; the whole image was scrollable.
- Packaged oversized paragraph/code/list/blockquote/table checks: **PASS**, whole
  content retained on one scrollable page, including end markers. Dirty state
  remained unchanged.

Run the packaged checks after building with `npm run package:mac:dir`:

```sh
node scripts/test-pagination-packaged.mjs
```

Manual VoiceOver/keyboard reading, visual polish under text scaling, Windows/Linux
packaged behavior, platform scrollbar variants and representative large-document
performance remain **NOT TESTED**. The existing settings range labels also need
separate accessibility review: their wrapping labels contain an output element
before the input, and the jsdom accessible-name queries did not name the inputs.
This pagination task does not alter those controls or claim accessibility completion.
