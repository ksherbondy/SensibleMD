# Workspace command catalog extraction — Step 2

Scope: accepted Phase 1 Step 2 with the Phase 1.5 renderer/domain and transport-neutral boundary. Expected observable behavior change: **none**. Step 3 is not authorized.

## C12 characterization baseline

Source baseline: `a95a916` (accepted reader-surface extraction). Added `src/test/workspace-commands.test.tsx` and its checked-in metadata snapshots before modifying production command construction.

The test observes commands at the existing palette component boundary and still renders/clicks the real palette. It does not export private App state or depend on the proposed factory. Metadata snapshots capture all 34 static commands plus an inserted recent entry: IDs, titles, order, keywords, scopes, shortcuts, disabled reasons and enabled state in Read/Write/Split. Twenty executable cases cover every catalog action, including dynamic recent selection.

Additional cases cover clean browser Save As availability, clean native Save disabled, dirty native Save using latest source, unavailable save APIs, browser-open fallback, open/recent document changes, collection picker/chapter directions, dirty Close refusal and pending-close disabled state, structural targets and direction, copy source, history/page directions, search cycle/origin, bookmark toggle, context, explicit modes, diagnostics, settings and export. Existing keyboard-save, download-state, transient-ui, authoring-checks, save/recovery/close and navigation suites continue to test related entry points without claiming keyboard/palette equivalence where it does not exist.

Preserved distinctions: Close remains enabled for dirty content but its action refuses; clean browser documents can Save As; copy availability checks the *next* matching node even when the action could copy the current one; Show Authoring Checks changes mode rather than opening a hidden checks panel; native recents remain positional; explicit mode commands are not the keyboard's mode toggle.

Baseline results: **255 tests passed, 70 TODO, 37 files**; build **PASS**; lint **exit 0 with the same 33 warning categories/counts as accepted Step 1**. No production code was changed while establishing this gate. Initial test-authoring corrections used the harness's `elementId`, observed the user-event clipboard stub directly, and removed unsupported testing-library query typing; no production behavior or existing regression assertion was changed.

Packaged verification is not required for this pure catalog move and is **NOT RUN for Step 2**. Step 1's packaged evidence remains historical; no new native menus, accelerators, bridge or layout behavior is introduced.

## Extraction and interface

C12 commit: `7578cfe` (`test: characterize workspace command catalog before extraction`).

`src/core/workspace-commands.ts` now exports `createWorkspaceCommands({ facts, actions })`, `WorkspaceCommandFacts`, and `WorkspaceCommandActions`. It returns the same 34 static definitions with recent commands inserted in the same position. IDs, titles, keywords, shortcuts, scopes, order and disabled messages are retained. App calls the factory at the original catalog construction location on **every render**, without memoization or callback caching.

Inputs are deliberately limited:

- `facts.enabled`: 26 explicitly typed command-availability booleans, keyed by their existing IDs. The original expressions—including view guards, adjacency queries and short-circuiting—are still evaluated in App. The factory receives no navigation/history/model/buffer objects.
- `facts.recentDocuments`: only index/name entries used for dynamic IDs, labels and callback arguments. `facts.saveUnavailable` retains the existing distinction between unavailable native saving and a clean document in the disabled message.
- `actions`: 20 named callbacks with narrow argument unions for navigation direction, structural target type, view selection and diagnostic filter. There are no arbitrary setters, generic dispatch, Electron APIs, refs or workspace/session objects in the interface. The number reflects the existing command families; it does not recreate workspace state ownership.

Special handling remains explicit: collection-input click is an App-owned action; Show Authoring Checks remains distinct from opening its panel; the three diagnostic commands pass their original filter argument to an action that sets filter before selecting Write; explicit view commands pass their original mode and do not become a toggle. Direct Save/download callbacks remain direct callbacks. Open/recent/close preserve their existing void-dispatch wrappers. No save, close, recovery, navigation, keyboard, toolbar or palette implementation was moved.

No new runtime coupling was discovered. One extraction-specific lint diagnostic appeared on passing the callback/facts object to a function (`react/refs` at the factory call). A documented, single-line suppression covers only that new call-site diagnostic because the factory stores rather than executes ref-reading actions. The existing history/buffer ref diagnostics remain untouched. This is the only tooling accommodation; it is not a broad lint cleanup.

Added `src/core/workspace-commands.test.ts` to verify construction invokes no actions, accepts frozen input objects, returns a fresh catalog and keeps separate invocations bound to their respective supplied facts/actions. The original C12 scenario tests and snapshots were not changed after extraction.

## Final evidence

| Check | Before production extraction | After extraction |
|---|---|---|
| Full test suite | 255 passed, 70 TODO, 37 files | 256 passed, 70 TODO, 38 files (one added factory-purity test) |
| C12 scenarios / metadata snapshots | 20 cases, three mode snapshots PASS | Same cases and snapshots PASS, no snapshot updates |
| TypeScript/Vite build | PASS | PASS |
| Lint | Exit 0, 33 existing warnings | Exit 0, same warning multiset after line-number normalization |
| Packaged/native verification | NOT RUN for Step 2 | NOT RUN; no new native dependency revealed |
| Source comparison | Original catalog retained for comparison | All 34 static metadata entries and original availability expressions match; App outside catalog/import and scoped lint comment is byte-identical |

Full-suite evidence includes core commands, keyboard-save, download-state, transient UI, authoring checks, save/Save As/recovery/close, navigation and accepted reader-surface tests. The editor/palette remain lazy chunks; no dependency or CSS changes occurred. The renderer bundle grows by about 2.5 kB uncompressed from the explicit factory interface wiring; no performance optimization was attempted during this move.

Expected observable behavior change remains **none**. No substantive Phase 1/1.5 deviation or roadmap revision was needed. Existing availability quirks and platform/security limitations remain unchanged. Packaged menus, physical keyboard behavior and assistive technology were not newly verified; prior evidence is not recast as a new PASS.

Step 2 is complete for review. Step 3 (controlled workspace header) appears consistent with the accepted roadmap and still needs its own relevant characterization/DOM/ref checks. **Step 3 has not begun and requires explicit authorization.**
