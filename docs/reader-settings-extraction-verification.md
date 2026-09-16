# Reader settings extraction — Step 6

Scope: accepted Phase 1 Step 6/C13 and preference geometry gates, supplemented by Phase 1.5. Intended observable behavior change: **none**. Step 7 is not authorized.

## Baseline and characterization

Production baseline: `39cbc39` (`formatted code using prettier`). The working tree was clean. This commit contains the previously reported formatting changes in AuthoringChecks, MarkdownEditor, reader-surfaces and WorkspaceHeader, and adds the previously untracked documentation. These are committed baseline content, not unknown working-tree behavioral edits.

Added `src/test/reader-settings.test.tsx` before modifying production rendering, with three cases:

- Settings closed/open state and trigger expansion, direct main-area/panel/label/output/input relationships, control order, types, default values, min/max/step attributes, tab order, inside-panel containment, Escape/focus restoration, click-away and trigger-again dismissal.
- Read and Split (two cases): each preference's displayed value and existing shared shell style/class update, unchanged mode/selected heading/dirty state, all four localStorage keys and values, and restoration on workspace remount.

Reading-layout controls are outside this panel in the reader toolbar; they remain outside the extraction. Existing document-core preference normalization, measured-pagination, pagination-reader, rendered-theme, position-continuity, split-layout, transient-ui and close-document/state-flush tests supply the remaining existing contracts. Geometry is additionally checked in the packaged harness below, rather than inferred from jsdom style assertions.

A new-test authoring expectation exposed an existing labeling limitation: each range input's implicit label has a labelable `<output>` before the input, and the DOM accessibility query returns an empty slider name. Characterization records both the visible label text and this empty-name behavior. The test expectation was corrected before production extraction; no markup or existing test was changed to hide the issue. This is an existing accessibility risk for separate repair, not an accessibility PASS or a contradiction of the mechanical roadmap. Physical screen-reader behavior was not tested.

Pre-extraction checks:

- Targeted suites: **65 passed, 9 files** (reader-settings, document-core, measured-pagination, pagination-reader, rendered-theme, position-continuity, split-layout, transient-ui, close-document).
- Full `npm test`: **272 passed, 70 TODO, 42 files**.
- TypeScript/Vite build: **PASS**.
- Lint: **exit 0, 33 warnings**, unchanged accepted categories/counts.

## Packaged baseline

Built a matching Electron 44.1.1 macOS arm64 directory package with `electron-builder --mac --dir`. Sandbox GitHub resolution initially failed; the approved retry downloaded Electron and completed. No Developer ID signing identity was available; this is a local unsigned verification artifact.

Ran the unchanged `scripts/test-pagination-packaged.mjs` with isolated temporary user data. No port 5175 dev-server listener was present; the harness verifies a `file://` launch.

The first run exited 1 at line 141 (`initialScroll.targetVisible` was false), before preference assertions. Extraction was held while the unchanged harness was rerun against the same package. The second run exited 0 and passed all checks, including font repagination 7→18, line-height 7→9, width 13→9, window resize 13→6, semantic target retention, shared Scroll/Page/Spread/Split theme, 37 blocks rendered once, oversized content reachability and reduced-motion Split synchronization.

Record the baseline as **PASS on unchanged retry, with an unresolved intermittent initial Scroll visibility failure**. The failure's cause is not established; no harness timing/assertion or production behavior was altered. Do not infer deterministic repeatability, release readiness or cross-platform/assistive-technology validation from this result.
