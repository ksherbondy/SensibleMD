# Workspace command catalog extraction — Step 2

Scope: accepted Phase 1 Step 2 with the Phase 1.5 renderer/domain and transport-neutral boundary. Expected observable behavior change: **none**. Step 3 is not authorized.

## C12 characterization baseline

Source baseline: `a95a916` (accepted reader-surface extraction). Added `src/test/workspace-commands.test.tsx` and its checked-in metadata snapshots before modifying production command construction.

The test observes commands at the existing palette component boundary and still renders/clicks the real palette. It does not export private App state or depend on the proposed factory. Metadata snapshots capture all 34 static commands plus an inserted recent entry: IDs, titles, order, keywords, scopes, shortcuts, disabled reasons and enabled state in Read/Write/Split. Twenty executable cases cover every catalog action, including dynamic recent selection.

Additional cases cover clean browser Save As availability, clean native Save disabled, dirty native Save using latest source, unavailable save APIs, browser-open fallback, open/recent document changes, collection picker/chapter directions, dirty Close refusal and pending-close disabled state, structural targets and direction, copy source, history/page directions, search cycle/origin, bookmark toggle, context, explicit modes, diagnostics, settings and export. Existing keyboard-save, download-state, transient-ui, authoring-checks, save/recovery/close and navigation suites continue to test related entry points without claiming keyboard/palette equivalence where it does not exist.

Preserved distinctions: Close remains enabled for dirty content but its action refuses; clean browser documents can Save As; copy availability checks the *next* matching node even when the action could copy the current one; Show Authoring Checks changes mode rather than opening a hidden checks panel; native recents remain positional; explicit mode commands are not the keyboard's mode toggle.

Baseline results: **255 tests passed, 70 TODO, 37 files**; build **PASS**; lint **exit 0 with the same 33 warning categories/counts as accepted Step 1**. No production code was changed while establishing this gate. Initial test-authoring corrections used the harness's `elementId`, observed the user-event clipboard stub directly, and removed unsupported testing-library query typing; no production behavior or existing regression assertion was changed.

Packaged verification is not required for this pure catalog move and is **NOT RUN for Step 2**. Step 1's packaged evidence remains historical; no new native menus, accelerators, bridge or layout behavior is introduced.
