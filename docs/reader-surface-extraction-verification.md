# Reader surface extraction — Steps 0 and 1

Scope: accepted Phase 1 Step 0 characterization and Step 1 only, supplemented by Phase 1.5 C13/N03 reader requirements. Expected observable behavior change: **none**. Step 2 is not authorized.

## Step 0 baseline (2026-09-15)

Production baseline: `011ca2e166ebc60d95283871d679c44e54b9e5c5`.

Added `src/test/reader-surfaces.test.tsx` (nine cases) and `electron/reader-link-policy.test.ts` (one case). All pass against the original App-local rendering implementation, before extraction.

| Contract | Evidence |
|---|---|
| Scroll/article/column nesting, page viewport/article/content nesting, measurement sibling, footer exclusion, Split siblings | New surface test plus existing scroll-shell/split-layout tests |
| Heading/block/inline IDs, measurement prefix, unique IDs, image src/alt, observer target elements | New surface test; existing navigation-red, navigation-stale and measured-pagination tests |
| Hidden/inert measurement, role-query exclusion | New surface test plus existing measured-pagination tests; not a screen-reader certification |
| Reader/Preview HTTPS, relative, fragment, HTTP, mailto and sanitized dangerous links | New four-mode link cases observe default cancellation before suppressing jsdom navigation; native handler test executes actual main code with mocked window/shell |
| Sanitization, raw HTML remaining inert, GFM task lists/deletion, reference definitions | New four-mode sanitization cases |
| Plugin order as observable behavior, cross-page definitions and repaired footnote targets | Existing pagination-reader footnote/reference test (full source, sanitizer then page filtering); no implementation-order snapshot |
| Single/spread counts, readiness/empty states, oversized content and page controls | Existing pagination-reader and measured-pagination suites; packaged layout script |
| Real geometry, shared theme, reachability, resize/fonts/images, Split/editor continuity | `scripts/test-pagination-packaged.mjs`, matching macOS arm64 package, dev server offline |

Results: full `npm test` **235 passed, 70 TODO, 36 files**; `npm run build` **PASS**; `npm run lint` **exit 0, same warning multiset as initial baseline** (output order may differ). Packaged pagination/real-layout script **PASS**, exit 0, using a newly built Electron 44.1.1 macOS arm64 directory package. The build required an approved Electron download; the GUI smoke ran with isolated temporary user data. No release-readiness claim follows from this local package.

Characterization details: Reader uses block nodes including thematic breaks, whereas Preview receives navigable nodes and therefore does not assign an ID to its thematic break. Preview also lacks Reader's inline link/image IDs and custom link handler. Existing ResizeObserver targets are the viewport, reader, measurement `.page-content`, and direct content children; the measurement article itself hosts load/error listeners, not ResizeObserver observation. These refine the baseline without contradicting the planned shared-module extraction.

During test authoring, two fixture expectations were corrected from source before finalizing the baseline: the observed element is the measurement content rather than its outer article, and a selected initial heading must be established explicitly before asserting unchanged Split location. No production behavior or existing assertion was changed to make characterization pass.

Limits: shell launch is mocked in the new main-process test; no actual external browser is opened. The existing packaged script establishes file-loaded layout, not hostile-link end-to-end security or physical AT behavior. VoiceOver, Windows and Linux were **NOT TESTED**. No URL policy, navigation, IPC or accessibility behavior was changed.

## Step 1 extraction

Characterization commit: `7646377` (`test: characterize reader surfaces before extraction`).

Moved the existing `ReaderIdPrefix`, `ReaderNodeContext`, `HeadingContext`, block/heading renderer mappings, `readerNodeId`, `ReaderSurface`, and `PreviewSurface` into `src/components/reader-surfaces.tsx`. Contexts remain private singleton definitions in that module. `Heading` and `ReadingMode` types move with their surface contract and are imported by App. App imports `readerNodeId` from the same module so navigation and rendering retain one ID implementation.

No hook ownership, JSX nesting, CSS, plugin configuration, source model, IPC, editor/palette lazy import or lifecycle code changed. A source comparison against the characterization commit confirmed the moved bodies are identical except export keywords, a scoped lint comment and the terminal blank line. The entire remaining `DocumentWorkspace`/outer `App` body is byte-identical. CSS imports remain in App in their original order.

One extraction-specific tooling detail arose: exporting `readerNodeId` alongside components triggers the Fast Refresh `react/only-export-components` warning. A documented, single-line suppression on that helper preserves the intended shared ID boundary without adding another module or changing behavior. No existing lint warnings were fixed. Fast Refresh behavior itself was not tested; production/lazy bundling was built and packaged.

| Check | Before extraction | After extraction |
|---|---|---|
| Full `npm test` (includes reader, navigation, pagination, measured pagination, theme, split-layout, scroll-shell and new characterization) | 235 passed, 70 TODO, 36 files | 235 passed, 70 TODO, 36 files |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 existing warnings | Exit 0, same 33 warnings after normalizing line numbers, output order and dependency-list order |
| Matching macOS arm64 package build | PASS | PASS |
| `scripts/test-pagination-packaged.mjs` | PASS, exit 0 | PASS, exit 0 |
| Dev server | No listener on port 5175; script verifies file-loaded launch | Script verifies file-loaded launch; no dev server started |
| Physical AT / Windows / Linux | NOT TESTED | NOT TESTED |

Packaged evidence includes actual font/preference/resize geometry, 37 blocks rendered exactly once, oversized content reachability, shared theme, measurement, authoring layout and Split synchronization. The package is a local unsigned verification artifact: no Developer ID signing identity was available. Native link handoff remains mocked in the new main-handler characterization, not end-to-end external browser verification.

No substantive deviation from Phase 1/1.5 was required. The observer target and Preview-ID details above refine existing coupling; no new runtime dependency or behavior-changing integration was introduced. The baseline fixture corrections were completed before the characterization commit and production extraction.

Step 1 is complete with intended observable behavior change **none**. Remaining limitations are actual assistive-technology/other-platform validation, end-to-end external-link handling, and development Fast Refresh behavior. Existing security/activation issues remain outside this extraction. Step 2 is ready for review against its own command characterization gate (C12); it has **not begun** and still requires explicit authorization.
