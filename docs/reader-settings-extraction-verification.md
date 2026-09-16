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

## Extraction and interface

Characterization commit: `c403a4e`. Production files changed: `src/App.tsx` and new `src/components/workspace/ReaderSettings.tsx`; this report records final results. The characterization tests were not changed after extraction.

Moved only the existing settings `<section ref={settingsPanel} className="settings-popover" aria-label="Reading settings">` through its closing tag, containing the same four labels and controls. The `settingsOpen` conditional, header trigger, toolbar reading-layout controls and parent listeners remain in App. No wrapper, CSS, control, label, range or preference default changed.

The explicit nine-prop interface is:

- Four values: `fontScale`, `lineHeight`, `contentWidth`, `reducedMotion`. App supplies the exact normalized displayed values previously read by the JSX; raw state and normalization remain in App.
- `panelRef: RefObject<HTMLElement | null>` consumes the original `settingsPanel` ref. This keeps click-away containment tied to the same section; no ref is created in the child.
- `onFontScaleChange`, `onLineHeightChange`, `onContentWidthChange` accept numbers; `onReducedMotionChange` accepts a boolean. App passes its existing setters directly. Original synchronous `Number(event.target.value)` and `event.target.checked` conversions remain in the moved handlers.

ReaderSettings owns no state, effects, persistence, geometry, navigation or Electron logic. Trigger expansion, Escape priority, focus restoration, pointer containment, hydration and persistence ordering remain parent-owned. No reading-mode prop is necessary because those controls are not in the moved panel. No nativeTheme, system reduced motion, forced colors or native accessibility integration was introduced.

No new runtime coupling required a design change. The existing parent panel-ref containment is retained explicitly. The empty accessible slider names and intermittent initial packaged visibility assertion described above are the newly observed baseline limitations; neither was silently repaired or treated as a new product requirement for this extraction.

## Final evidence

| Check | Before extraction | After extraction |
|---|---|---|
| Nine targeted suites | 65 passed | 65 passed |
| Full `npm test` | 272 passed, 70 TODO, 42 files | 272 passed, 70 TODO, 42 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 warnings | Exit 0, identical normalized warning multiset |
| Matching macOS arm64 directory package | PASS, unsigned | PASS, unsigned |
| Existing packaged pagination/real-layout script | First run failed initial Scroll visibility; unchanged retry PASS | PASS on first run, exit 0 |

The post-extraction package passes the same preference measurements (font 7→18 pages, line-height 7→9, width 13→9, resize 13→6), semantic anchor retention, actual Scroll/Page/Spread/Split geometry, font/image invalidation, content reachability and reduced-motion synchronization. Both successful runs verify file-loaded startup with isolated temporary user data. No dev server was started. The harness was not edited.

A source comparison against `c403a4e` confirms identical moved JSX after indentation and prop/ref/callback name substitution. The remaining App body is byte-identical outside the replaced section and new import. Lint matches both the immediate baseline and accepted Step 5 after normalizing line numbers, output order and dependency-list order. `git diff --check`: **PASS**. No new suppression, dependency, unrelated formatting or cleanup was introduced.

Manual screen-reader/physical-keyboard verification and Windows/Linux packaged behavior remain **NOT TESTED**. Local unsigned packaged evidence does not imply release readiness. The initial baseline visibility failure remains unexplained despite two subsequent passing runs (one before and one after extraction). Accessible slider naming remains an existing limitation, not a completed accessibility requirement.

Intended observable behavior change: **none**. No Phase 1/1.5 implementation deviation. The baseline harness failure prompted an unchanged retry before the production move; there was no observed post-extraction regression or altered assertion to bypass a gate.

Step 6 is complete for review. Step 7 (controlled document notices) appears ready for its own recovery/external-change characterization gate; **Step 7 has not begun and requires explicit authorization**.
