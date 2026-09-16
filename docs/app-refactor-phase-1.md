# App.tsx refactor — Phase 1 research and dependency analysis

Date: 2026-09-13. Source baseline: `011ca2e166ebc60d95283871d679c44e54b9e5c5`.

**Status: research and proposed plan only. No production refactoring is authorized or implemented.** Line references below identify the baseline, not permanent interfaces.

## 1. Recommendation and scope

Keep `DocumentWorkspace` as the owner of the active working document during the first extraction wave. Move controlled rendering and the command catalog first. Extract effects and asynchronous actions only after their individual ordering contracts have characterization coverage. Do not introduce a general `useDocumentSession`, a store, a reducer migration, or a universal document-activation helper.

The difficult part of this file is not its 2,959 lines. It is the coordination between a persistent mutable buffer, render snapshots, native filesystem authorization, deferred navigation, and several independently timed persistence operations. Similar-looking activation paths currently have different semantics. A mechanical refactor must preserve those differences until a separately authorized correctness change resolves them.

The report covers the entire `src/App.tsx`, its material component/core dependencies, preload declarations and implementation, main-process handlers and lifecycle modules, state storage, CSS layout contracts, all 34 test files, the scenario harness, and the two relevant packaged verification scripts. Fonts and icons are assets rather than state owners; their loading still matters to measured pagination. Relevant project guidance was consulted, including the navigation design, measured-pagination design, remediation plan and ADR sections, identity design, v0.1 checklist, dogfooding observations, assurance and desktop standards, library policy, and recent UI/save/close verification notes. Large standards were reviewed by relevant sections; they are not represented here as newly audited release gates.

### Documentation precedence

- The user explicitly requests behavior-preserving research. Proposed architecture in an older document is not authority to implement it now.
- `docs/navigation-state-coherence-design.md` supplies the semantic-navigation direction, but parts of its historical implementation inventory and proposed reconciliation are not today's implementation.
- `docs/measured-pagination-phase-1.md` supersedes the earlier fixed-capacity pagination description. Current pages depend on measured geometry and whole semantic blocks.
- `docs/remediation-plan.md` places broad decomposition after stabilization. Its proposed runtime/session ownership and store work must not be smuggled into a mechanical extraction. The proposed Zustand ADR is not an installed or required dependency.
- Checked acceptance boxes and past packaged verification reports are historical evidence, not evidence from this run. Desired invariants in standards are distinguished below from guarantees demonstrated by this revision.

### Baseline evidence from this investigation

| Check | Result | Limit |
|---|---|---|
| `npm test` | PASS: 34 files, 225 passed, 70 TODO; 295 total | TODO is not PASS; simulated browser/desktop behavior has limits described below |
| `npm run build` | PASS: TypeScript and Vite | Does not prove packaged launch or native behavior |
| `npm run lint` | Exit 0 with existing warnings | Includes refs during render, effect dependencies/state updates, forward references, and unused diagnostic code |
| Packaged application | NOT TESTED in Phase 1 | Existing scripts inspected; historical results not reclassified as current PASS |
| Physical keyboard, screen readers, Windows/Linux desktop | NOT TESTED | Event simulation is not platform or accessibility certification |
| Production/test changes | None | This report is the only intended repository change |

The build retains lazy editor and palette chunks. Moving imports through an eager barrel could change startup behavior even if all functional tests pass.

## 2. Actual architecture

```text
App (Home / keyed workspace / OS-open handshake)
  ├─ NoDocument (its own open/recents/pending/focus behavior)
  └─ DocumentWorkspace (one working buffer for its mounted lifetime)
       ├─ source + collection + active identity/session + dirty/save capability
       ├─ semantic model → anchor → heading, page, outline, persisted position
       ├─ NavigationWork → observation / editor jumps / split projection
       ├─ measured reader DOM → pagination → page/spread rendering
       ├─ source mutations → buffer version + React source + collection + dirty
       ├─ save promises ↔ recovery cleanup ↔ window close
       ├─ reader metadata hydration/debounce/close flush
       └─ controlled UI, commands, search, preferences, diagnostics

renderer → frozen preload API → validated main-process handlers
                               ├─ authorized session and directory watcher
                               ├─ file writes / recent documents
                               ├─ reader metadata / per-document recovery queue
                               └─ window-close and OS-open handshakes
```

`App` and `DocumentWorkspace` have different lifetimes. The outer `opened` value seeds a workspace and keys it by `sessionId ?? id`. In-workspace native opens and Save As update workspace identity without updating outer `opened`. Replacing that key with `activeDocumentId`, or putting the buffer above this boundary, would change reset behavior.

`DocumentBuffer` is instantiated once per workspace with the internal label `active-document`; it is not a per-document registry. React does not subscribe to it. Call sites manually update the buffer, React `source`, collection entries, and `isDirty`. The buffer's version/savedVersion and React's dirty flag can therefore differ. That distinction is used by close handling and cannot be removed incidentally.

### Source locator

| Baseline App lines | Responsibility |
|---|---|
| 131–235 | Local types, exported test fixture, semantic rendering contexts/components, legacy restoration helper |
| 237–444 | `ReaderSurface` and `PreviewSurface` |
| 446–730 | Workspace state/refs, derived model, navigation/observation/split/pagination wiring |
| 732–973 | Local storage, reader memory, recents, hydration, metadata writes, recovery, external changes, transient UI effects |
| 975–1024 | Keyboard dispatch and latest-save ref |
| 1026–1324 | Heading/node/page/history/link navigation, edits, structural commands, search navigation |
| 1326–1533 | Browser/native/recent opening and collection transitions |
| 1535–1666 | Recovery cleanup, save/export, window-close integration |
| 1668–1758 | Close Document, imperative open guard, external reload, recovery restore |
| 1760–2181 | Bookmarks and command catalog |
| 2183–2894 | Preference projection and workspace JSX |
| 2897–2959 | Outer Home/workspace state and OS-open handshake |

## 3. State ownership and responsibility map

The owners below are conceptual. Unless explicitly identified as an existing hook/component, the state remains owned by `DocumentWorkspace` today. Proposed boundaries are not permission to move state immediately.

### 3.1 Working document, identity, source and collections — high risk

**State:** `source`, `documentName`, `collection`, `activeDocumentId`, `activeSessionId`, `isDirty`, `canSaveDirectly`. **Refs:** `bufferRef`; the resulting stable `buffer` object. **Derived:** `sourceVersion`, `semanticDocument`, word count, chapter index, collection word count.

**Writers/actions:** every activation path, `updateSource`, structural heading edits, external reload/automatic update, recovery restore, direct-save completion, Save As completion. No single activation reducer exists. Buffer `replace` always increments version, including identical text; `markSaved` marks the current version. `apply` checks a base version and validates edit ranges. Origins describe operations but do not provide a separate event-driven synchronization system.

**Dependencies:** collection/identity helpers; native and browser opening; all navigation and persistence; editor callback source equality. **Consumers:** effectively every subsystem. Native document identity is derived in main from canonical realpath using SHA-256; native session identity is distinct. Browser identity uses file metadata and a different digest; in-memory collections have their own identity rules. Names, source offsets, document IDs, session IDs, and filesystem capabilities are not interchangeable.

**Boundary:** retain state and buffer ownership in the workspace; later extract named action functions with explicit inputs and commit callbacks. Do not introduce a buffer subscription, per-document buffers, identity normalization, or a new session object while moving code. **Tests:** core buffer/identity, renderer identity, save-as, close, download, navigation-stale, editor/split suites.

### 3.2 Opening, recents, collection activation and outer lifecycle — high risk

**State:** document fields above; `recentDocuments`; outer `opened`, `osStatus`. **Refs:** `fileInput`, `collectionInput`, outer `prepareOpen` and acknowledgement ref. **Effects:** workspace recents load; outer OS-open subscription and post-commit acknowledgement. `NoDocument` independently owns pending state, recents, status and focus refs.

**Actions/APIs:** FileReader, `File.text`, `openDocument`, `openRecentDocument`, `listRecentDocuments`, `openOsDocument`, OS completion callback; collection, history, search and link transitions. Recents are positional indexes into the main-process list, not renderer-held paths. Browser collection opening sorts names with `localeCompare`; this UI ordering must not be repurposed for persistent identity.

**Dependencies:** close preparation, buffer, reader-memory restoration, navigation target model/version, main authorization. **Consumers:** editor, save target, watcher, recovery identity, metadata, page model, Home. **Boundary:** keep outer `App` and `NoDocument` independent; cautiously factor only demonstrated equivalent native/recent success commits later. See the activation matrix before centralizing anything. **Tests:** identity, os-open, close-document, harness, main file-open lifecycle; missing transition matrix coverage is material.

### 3.3 Save, Save As and export — high risk

**State written:** dirty, active ID/session, name, direct-save capability, collection, recovery notice, recents and status. **Refs:** `pendingSaves`; buffer version; latest keyboard-save callback. **Derived:** `saveUnavailable`, `saveEnabled`. **Actions:** `trackSave`, `saveFile`, `downloadCopy`. **APIs:** `saveOpenedDocument({source})`, `saveDocumentAs({name, source})`, recovery deletion, Blob/object URL/download link.

Save captures source/name from its render closure and document/version at invocation. Pending promises include post-save recovery cleanup, not only disk writing. Direct save marks clean only when the live buffer version still matches. Save As adopts returned identity/session/name even if later edits mean the buffer remains dirty; it updates the collection using the live buffer text and removes a colliding target-ID entry. Export does not mark saved or adopt identity.

**Dependencies:** identity, recovery revision protocol, buffer, native authorization and recents. **Consumers:** toolbar/palette/keyboard, window close, Close Document, recovery debounce. **Boundary:** plain async action functions, initially keeping state ownership and promise tracking in the workspace; preserve render snapshots and exact continuation order. A generic latest-state getter after each await would change semantics. **Tests:** save-as-lifecycle, recovery-clear, keyboard-save, download-state, window-close, close-document, Electron save-as-lifecycle.

There is no separate user-facing Save As dispatcher here: save falls back to Save As when direct save is unavailable. Tests deliberately remove the direct API to exercise that branch. Adding a new accelerator or always-available Save As command is feature work.

### 3.4 Recovery — high risk

**State:** `recoverySnapshot`. **Refs:** `windowDiscard` holds the discarded ID/version; `recoveryContext = {documentId, revision}` resets in a layout effect on document ID. **Effects:** per-ID recovery loading with lifetime/context/revision validation; 1,500 ms dirty-snapshot debounce using a buffer snapshot. **Actions:** clear, saved-clear warning handling, explicit discard, restore, and fresh snapshot preservation when close-discard races an edit.

**APIs:** load/save/clear recovery snapshots. Main serializes saves and clears per document and retains latest/previous generations; renderer recovery writes are not added to `pendingSaves`. A matching discard ID/version suppresses the normal debounce. Clearing increments a revision so an earlier load cannot repopulate a deleted prompt. Clearing a different document must not clear the active prompt.

**Dependencies:** dirty flag, live buffer, identity and layout-effect order, save completion, close decision. **Consumers:** prompt, save status, window close, future restore. **Boundary:** eventually a focused recovery hook owning load/context/notice/timer/clear, with explicit immutable snapshots and action ports. It must not own saving, identity adoption, navigation or all lifecycle state. **Tests:** recovery-clear, window-close, close-document, Electron recovery-clear. Late load after clear needs direct characterization.

### 3.5 Window close versus Close Document — high risk

**State/refs:** `closing`, `closingRef`, `pendingSaves`, `pendingReaderWrites`, `readerStateReady`; discard state/context above. Existing `useWindowClose` owns latest callbacks, requested/discarded snapshots, active/busy lifecycle variables and listener cleanup.

**Window close:** live buffer dirty/version plus pending saves decide unload protection. Save waits for pending save promises; discard awaits recovery removal, rechecks ID/version and preserves a newer snapshot on a race. The final unload removes the legacy source cache for a valid discard. Native request IDs and sender validation live in main. The main module explicitly preserves a separate app-quit bypass; do not claim this is a universal quit guard.

**Close Document:** rejects dirty state from either authority, pending saves, and incomplete reader hydration. It drains tracked reader writes, validates captured navigation/version/dirty state, explicitly flushes metadata, validates again, then calls completion to show Home. It does not ask the native save/discard dialog. The same operation with a no-op completion is exposed through `prepareOpen` for OS-open replacement.

**Dependencies:** all save/recovery/metadata/navigation contracts. **Consumers:** toolbar/command, OS-open preparation, native unload. **Boundary:** retain `useWindowClose`; later move only the workspace's Close Document async action, keeping the imperative handle and call order. Do not unify these two close protocols. **Tests:** window-close, close-document, os-open, main lifecycle suites; packaged close script is required for future relevant changes.

### 3.6 Reader metadata, local storage and bookmarks — high risk

**State:** `readerMemory`, `bookmarks`, `readerStateReady`; preferences are workspace-owned. **Refs:** pending reader writes and navigation captures. **Effects:** broad synchronous localStorage writes; derived per-document memory update; separate memory write; mount-only legacy position restore; per-ID desktop hydration; 500 ms desktop debounce. **Derived:** `SemanticPosition`, saved headings, heading fallback.

Browser keys include `sensiblemd-document`, `name`, `bookmarks`, `position`, `font-scale`, `line-height`, `content-width`, `reduced-motion`, `reading-mode`, and `reader-memory` under their existing prefix. Do not migrate, rename or remove them. Reader memory stores bookmarks and heading plus optional semantic position. Desktop payload includes identity, bookmarks, heading/position and preferences. Hydration applies bookmarks/preferences, while applying location additionally requires a current navigation capture. `readerStateReady` gates close, but does not gate the 500 ms save effect.

**Actions/APIs:** bookmark toggle; collection memory restoration; `loadDocumentState`, `saveDocumentState`; final close flush. **Dependencies:** semantic model, navigation, source, preferences, closing state. **Consumers:** initial projection, outline/bookmarks UI, page derivation, restart continuity, close. **Boundary:** first extract a pure desktop payload builder shared only by debounce and close flush; later a metadata hook may own hydration/write tracking/readiness. Keep legacy browser persistence separate initially. **Tests:** position-continuity, identity, close-document, navigation-stale and core semantic-position tests; delayed hydration/write ordering needs stronger coverage.

### 3.7 Semantic navigation, history and deferred work — high risk

**State:** `navigationAnchor` (node ID and currently zero word offset), `outlineJump`, `observationRevision`; **refs:** `historyRef`, presentation-transition ref; existing `useNavigationWork` owns committed context, revisions, liveness and pending callbacks. **Derived:** active navigable node, preceding active heading, outline headings, page index, chapter index.

**Actions:** `setNavigationNode` invalidates deferred work, increments observation revision and clears outline jump. Observation writes anchor without requesting projection. Heading navigation records optional history and projects according to mode. Page changes directly invalidate and set anchor; they do not call the same setter sequence. Structural reader navigation explicitly sets Read mode. History entries are document+heading, not full semantic locations.

`NavigationWork` guards document/source context and revisions; it deliberately supports callbacks scheduled for a destination before React commits that destination. Interrupting the current context must not cancel valid future-destination work. Its capture compares context identity, preventing an A→B→A cycle from reviving an old capture. Do not replace this with only document-ID equality or a blanket RAF cancellation helper.

**Dependencies:** parser IDs/source ranges, renderer DOM IDs, editor jump contracts, hydration, pagination, collections. **Consumers:** all navigation entry points, reader-memory persistence, split/observation, close revalidation. **Boundary:** keep existing core helpers/hooks; extract action definitions only after path-specific tests. Do not add a second authoritative heading/page state. **Tests:** navigation-red, navigation-stale, navigation-observation, position-continuity, core navigation/history/position tests.

### 3.8 Observation and split synchronization — high risk

Workspace wires existing `useReadingObservation` and `useSplitSync`; these are already meaningful boundaries. **Inputs:** view, active ID, semantic model/source, navigation work, observation revision. **Owned inside hooks/controllers:** viewport refs, editor adapter/controller/pending offset, driver timing, cached geometry, observers and RAFs. **Writes back:** observed node anchor; editor cursor updates are rejected for old source or Read mode.

Continuous observation accepts a user input followed by a relevant scroll, not every observer callback. It excludes independently scrolling descendants. Geometry changes capture and reproject position. Split synchronization maps top-level source offsets and rendered blocks, distinguishes user driving from projection, coalesces work, and checks source/lifetime/navigation validity. Programmatic editor reveal scrolls without rewriting source or declaring fresh user navigation.

**Dependencies:** exact DOM structure, CodeMirror adapter, source versions, layout effect ordering, font/image/resize events. **Consumers:** semantic continuity and persisted position. **Boundary:** preserve existing hooks/controller rather than fold them into a navigation god hook. **Tests:** observation, stale, split-sync, scroll-shell, editor-scroll; packaged real-layout script for future DOM moves.

### 3.9 Rendering, pagination and preferences — medium to high risk

**State:** `view`, `readingMode`, `fontScale`, `lineHeight`, `contentWidth`, `reducedMotion`; existing pagination hooks own measured results/readiness and effective page step. **Refs:** reader viewport and measurement refs returned by hooks. **Derived:** normalized preferences/CSS variables; pages, derived page index, effective one/two-column step, section summary.

Reader rendering parses full Markdown with GFM and sanitization before page-range filtering. Whole blocks and generated footnotes retain meaning; no page source fragments should be reparsed. Heading IDs use semantic source lines; other block IDs use semantic source offsets. Measurement IDs are separately prefixed. Measurement is inert and hidden from accessibility. Oversized whole groups get an independently scrollable region; ordinary pages remain clipped. Invalid/unavailable geometry yields no fabricated fallback pages.

Reader and preview share semantic rendering components but differ in link/image overrides. Reader HTTPS links use external handling; internal links call workspace navigation; other schemes are prevented. Preview does not install those custom handlers. Combining the surfaces under a new generic link renderer changes behavior.

**Dependencies:** full parse model, sanitization/plugin order, `page-render`, CSS inheritance, real width/height/margins/fonts, async stale-result checks. **Consumers:** navigation/page controls, observation, split, heading focus/scroll, preferences, tests. **Boundary:** move both surfaces and their singleton contexts together into one module initially. Keep hooks and CSS untouched. **Tests:** pagination-reader, measured-pagination, rendered-theme, split-layout, scroll-shell, navigation-red; real packaged geometry before/after.

### 3.10 Search and internal links — medium to high risk

**State:** `query`, `searchOpen`, `searchScope`, `searchIndex`, `searchOrigin`. **Effects:** query/scope reset index/origin. **Derived:** collection results/match count, recomputed each render; only first eight results displayed but cycling uses all results. **Actions:** direct result, next/previous, return-to-origin, same/cross-document link handling.

Same-document search chooses the heading preceding a result line. Cross-document search sets an initial empty anchor, forces Read, then a guarded callback sets the heading and scrolls. Cycling captures a heading-only origin on its first invocation; clicking a result does not use that same origin protocol. Search visibility is independent of query. Internal links resolve within the existing collection by basename; they are not a new filesystem capability.

**Dependencies:** collection source freshness, semantic heading derivation, navigation/history, mode, queued work. **Consumers:** toolbar/palette, search rows, back-to-origin, reader links. **Boundary:** controlled search UI first; retain state and separate navigation actions. No generalized `navigateToResult` shared with links/history until semantics are characterized. **Tests:** core collection-search/internal-links plus transient-ui; integrated cross-document search/origin coverage is inadequate.

### 3.11 Editor, structural edits and diagnostics — medium to high risk

**State:** `editorLine`, `diagnosticJump`, `checksOpen`, `findingFilter`. **Derived:** accessibility findings on each render, filtered findings, structural edit transaction. **Actions:** source callback; change heading level; diagnostic jump with navigation capture; editor cursor observation. `updateSource` first compares against live buffer text to suppress editor echo, then replaces buffer, updates active collection source, React source and dirty state.

The lazy `MarkdownEditor` owns one CodeMirror view per mounted editor, callbacks kept current in layout effects, and its adapter registration. Its prop-source synchronization and projected-selection annotation are distinct from typing. Write↔Split retains the editor branch; Read unmounts it. A new wrapper/key or conditional branch can destroy selection/undo/caret even if source stays identical.

Diagnostics visibility does not currently suppress analysis computation. Showing authoring via its command sets Write mode; that is not the same operation as toggling `checksOpen`. Preserve panel filter, focus restoration and direct sibling layout.

**Dependencies:** buffer/version/source, structural helpers, navigation work, split adapter and lazy Suspense, CSS. **Consumers:** save/recovery, parsing/search/pagination, diagnostics panel and line display. **Boundary:** controlled chrome first; later source-edit actions as plain functions. Keep editor synchronization and mounting architecture unchanged. **Tests:** editor-scroll, navigation-red/stale, split-sync/layout, authoring-checks, core structural/diagnostics; undo/selection across extractions needs explicit characterization.

### 3.12 Commands, transient UI, status and utilities — low to medium risk

**State:** `outlineOpen`, `settingsOpen`, `bookmarksOpen`, `commandPaletteOpen`, `commandQuery`, `sectionSummaryOpen`, `copyStatus`, `appStatus`, plus panels above. **Refs:** settings panel/trigger and keyboard-save latest callback. Search focus uses the `document-search` DOM ID, not an input ref. **Effects:** Escape priority and settings pointer-away; document keyboard listener. **Derived:** command definitions/enabled conditions, adjacent nodes, summary, saved heading list.

Commands are freshly built with render closures. Keyboard Save has a latest committed callback, strict Ctrl/Meta modifier rules, and repeat handling distinct from the broader shortcut branches. The `headings` array is rebuilt every render; the keyboard listener depends on it. Memoizing that array during extraction could expose stale closures otherwise masked by resubscription. Palette focus behavior lives in its own component; selection closes without following the same restoration path as Escape/backdrop.

**APIs:** DOM focus/events, clipboard, download, all workspace action callbacks. Status is shared last-writer state; introducing message priority, automatic clearing or a toast manager changes observable behavior. **Boundary:** pure command factory, then individually controlled view components; eventually keyboard hook with unchanged dependency/lifetime behavior. Keep asynchronous status writers with their actions. **Tests:** transient-ui, keyboard-save, download-state, authoring-checks, command matching/core utilities; complete command enablement coverage is missing.

### 3.13 External file subscription — high risk

**State:** `externalChange` holds pending replacement text or null. **Refs:** no dedicated subscription ref in the workspace; the effect captures the buffer and active render's dirty/identity-related dependencies. **Effect:** App 924–940 subscribes through `onExternalDocumentChange` and returns its unsubscribe. **Actions:** automatic replace when considered clean, Reload at 1734–1743, and Keep Editing in the notice. **Derived:** conflict visibility from non-null text.

**Dependencies:** main watcher/session validation, live buffer equality, React dirty state, collection source updates. **Consumers:** source/model/editor, save baseline, conflict notice and subsequent recovery persistence. **Boundary:** leave this effect and reload action in the workspace initially; only extract its controlled notice in Wave A. A later focused subscription hook requires C08 and must preserve the source-only IPC contract and subscription lifetime. **Tests:** close-document includes an old-event/unmount case; main Save As tests cover watcher replacement. Neither supplies a full active-workspace external-change transition matrix.

## 4. Lifecycle and repeated-transition analysis

### 4.1 Activation is a family of protocols, not one protocol

Common shape: obtain source → replace buffer → commit identity/source/name → select semantic target → project after destination commit. Only some paths additionally mark saved, reset capability/session, restore bookmarks, record history, or change view.

| Entry path | Buffer/saved baseline | Identity/capability and dirty | Location/mode/history/memory |
|---|---|---|---|
| Native open / recent (1473–1533) | Replace + markSaved | Single-item collection; returned ID/session; direct true; dirty false | Empty anchor, Read; refresh recents; no explicit memory/bookmark reset in commit |
| Browser single (1326–1348) | Replace + markSaved | Browser ID; session null; direct false; dirty false; single collection | Empty anchor, Read; FileReader completion has no destination generation guard |
| Browser collection (1350–1380) | Replace + markSaved | Sorted collection first ID; session null; direct false; dirty false | Empty anchor, Read; `Promise.all` completion not generation-guarded |
| Sidebar switch (1382–1429) | Replace, no markSaved | Target ID; direct false; dirty false; session retained | Save outgoing memory; restore/filter target bookmarks/position; Read; no history visit |
| Chapter previous/next (1431–1471) | Replace, no markSaved | Target ID; direct false; dirty false; session retained | First heading, Read; origin+destination history; no bookmark restore |
| Cross-document history (1123–1154) | Replace, no markSaved | Target ID/source/name; dirty/direct/session retained | Historical heading; preserves view; no bookmark restore |
| Cross-document internal link (1156–1208) | Replace, no markSaved | Target ID/source/name; dirty/direct/session retained | Linked heading, Read; origin+destination history |
| Cross-document search (1242–1279) | Replace, no markSaved | Target ID/source/name; dirty/direct/session retained | Empty then queued heading, Read; no equivalent cross-branch history recording |
| Cross-document search origin (1296–1324) | Replace, no markSaved | Target ID/source/name; dirty/direct/session retained | Saved heading, Read; reset origin/index |
| OS-open (2897–2959) | New keyed workspace initialization | Main authorizes, then new workspace seeded with native response | Existing workspace preparation first; acknowledge after React commit; hydration restores place |
| Save As completion (1588–1620) | MarkSaved only if captured version still current | Adopt returned ID/session/name even with newer edits; direct true; collection remap/dedup | Not a normal open/reset; navigation/view are not explicitly reset |

Native/recent success commits are the strongest candidate for a limited common helper. Their API invocation, fallback/unavailable behavior, status handling and cancellation remain separate. Browser APIs have different failure/lifetime behavior. Collection/sidebar and chapter transitions differ meaningfully. History, search and links must not be normalized into the native-open sequence.

The regular in-workspace open actions do not use `prepareOpen`. That guard belongs to the outer OS-open path. Adding it everywhere may be desirable safety work, but it is not a behavior-preserving extraction.

### 4.2 Save protocols

1. Capture invocation document ID and buffer version, with render-captured source/name.
2. Choose direct native save if available; otherwise native Save As; otherwise report unavailable.
3. Track the entire promise, including recovery cleanup; cancellation/failure do not become success.
4. Direct success with a newer buffer version reports an earlier version was saved and leaves newer edits dirty/recoverable.
5. Direct matching success marks buffer saved and clears React dirty, reports Saved, then attempts old-document recovery deletion. Deletion failure produces the specific saved-but-cleanup-failed message.
6. Save As success adopts native identity/session, remaps the collection with current buffer text, computes clean/dirty from the captured version, refreshes recents and clears the prior recovery identity. Newer edits are not discarded.
7. Export creates a copy without any of those save-state transitions.

These branches can share promise tracking and recovery cleanup helpers, which already exist. Do not merge success handlers: identity adoption is exclusive to Save As, and cleanup failure is not a file-write failure.

### 4.3 Navigation and restoration protocols

| Protocol | Distinction to preserve |
|---|---|
| Explicit heading | Invalidate; optional history; create editor jump for Write/Split; scoped DOM projection; no implicit view change |
| Explicit page | Derive location from page, invalidate and set anchor; page itself remains derived |
| Reader structural node | Invalidate/set node and explicitly Read; separate reader command semantics |
| Passive observation | Accept genuine user driver; update anchor without feeding another programmatic navigation |
| View/presentation transition | Capture current location and project it into destination surface; do not establish new semantic intent |
| Cross-document queued target | Schedule with explicit destination ID/source before commit; preserve valid future work while cancelling stale current work |
| Browser initial restore | Mount-only reader-memory lookup and semantic resolve; its DOM-target construction differs from desktop restoration |
| Desktop restore | Per-ID async load; current capture required for location; bookmarks/preferences have separate application behavior |
| Collection restore | Synchronous target-model resolution plus bookmark filtering; not used by all cross-document paths |

Persisted `SemanticPosition` resolves through validated node ID/fingerprint, matching fingerprint/text, section heading, and first navigable fallback. Prefix/suffix are stored but not fully used as a contextual resolver. Live edits do not automatically run the complete proposed reconciliation protocol. Page lookup matches fragment node IDs and falls back to page zero; inline navigable IDs do not inherently map to their containing top-level page block.

### 4.4 Recovery and external changes

Recovery restore replaces source and marks dirty, closes the visible notice, but does not clear the persisted snapshot immediately. Explicit discard waits for deletion and leaves the prompt on failure. Saved cleanup targets the invocation's old identity, particularly important after Save As. Context/revision checks protect visible prompt updates and late loads.

External-change notification carries source only. Main validates its watcher session before sending; renderer compares text to the current live buffer and uses React dirty state to choose conflict notice versus automatic replace+markSaved. Reload explicitly replaces and marks saved; Keep Editing dismisses the conflict. This is not the recovery-restore protocol, and neither path should be routed through a generic source setter that always means an editor edit.

### 4.5 Main-process obligations that extraction must leave intact

- Preload exposes a frozen narrow API; renderer never receives native path authority. Direct save selects the currently authorized main session at handler entry. Main and renderer identity state must not be casually treated as the same object.
- Save As captures the previous session, checks it after the dialog, writes the selected file, then establishes the new watcher/session. A failure after writing can leave a file even while previous authorization is retained; existing tests prove authorization behavior, not universal rollback of disk effects.
- Native opening establishes identity/read/watch/recents/session state. Watchers monitor the directory with filename filtering and reject stale-session callbacks before sending source. Close Document does not revoke this main authorization; window destruction performs cleanup.
- Recovery save/clear operations are serialized per document in main. Metadata writes are a different mechanism, using temporary JSON replacement without the same per-document queue. Text writes are temporary-file rename, not evidence of an fsync durability contract.
- OS requests have one in-flight request and one newest pending slot, not an unlimited FIFO. Main waits for renderer readiness and a validated completion. Renderer acknowledgement is delayed until replacement workspace commit.
- Native picker extensions are broader than OS `.md` opening and the future Markdown-only Library policy. Do not change filtering or introduce scanning in this refactor.
- Legacy identity migration archives old state; it is unrelated to extraction. Do not clean up old storage or reconnect identities here.

## 5. Invariants and strength of evidence

**T:** implementation plus executable tests support the stated bounded behavior. **C:** visible directly in source, without sufficient direct regression coverage. **I:** architectural dependency strongly implied by how parts compose. **U:** broader assumption not established. T does not imply every race or platform is covered.

| Invariant / dependency | Evidence | Qualification |
|---|---|---|
| Buffer versions reject stale transactions; async save must not mark a newer edit clean | T: core, save-as, recovery, close | Version-only guards are not universal native-session/activation guards |
| Save As changes ID/session and retains newer text as dirty | T: renderer + main Save As suites | Crossed opens/Save As completions not exhaustively tested |
| Download does not change saved baseline, identity or recovery | T: download-state | Browser download success itself not a durable-save guarantee |
| Pending save includes recovery cleanup | T/C: save/close tests plus tracked promise source | Preserve promise settlement location, not just count |
| Close Document drains metadata and refuses unsafe close | T: close-document; C: exact capture checks | Held hydration, edits during final flush need direct cases |
| Native discard revalidates version/identity and preserves a raced edit | T: window-close and recovery-clear | App quit is a distinct main path |
| OS-open completion follows replacement commit | C with scenario/main tests around constituent behavior | Combined rapid OS sequence and exact handshake timing need stronger coverage |
| Heading navigation preserves Write/Split | T: navigation-red | Cross-document links/search and structural reader commands intentionally set Read today |
| Presentation projects semantic position without changing it | T: position-continuity/measured-pagination | Broad live-edit reconciliation and all inline nodes are not proven |
| Stale deferred navigation is harmless, including A→B→A and future destination work | T: navigation-stale | Do not generalize this protection to unguarded open/save promises |
| Programmatic scroll/caret projection must not feed back as user intent | T: observation/split tests | Physical input/browser event combinations still need packaged evidence |
| Pagination uses full-source semantics and all tested blocks remain reachable | T: core + renderer pagination | jsdom geometry is synthetic; whole oversized groups are deliberate current behavior |
| Measurement namespace/layout must match rendered content without accessible duplicates | T/C: measurement/DOM tests + CSS | Visual equality across fonts/OS is U without packaged/manual checks |
| Editor instance survives Write↔Split and source is not rewritten by navigation | T/C: editor/navigation/split tests + branch shape | Undo/selection history across extracted component boundaries needs explicit tests |
| Metadata hydration cannot overwrite a newer navigation location | T/C: navigation captures and stale tests | Bookmarks/preferences are not protected by that same location gate |
| A late recovery load cannot repopulate after clear | C: context/revision checks | Add exact held-load/clear case before moving effects |
| Renderer document identity always matches native authorization | U | Browser/collection routes and retained main session require route-specific analysis |
| Every lifecycle route protects dirty content | U | In-workspace activation lacks the outer OS-open close guard |
| Non-empty source always yields a valid current semantic anchor | U | Empty anchors and invalidated node IDs exist; do not claim full NAV-004 implementation |
| Mount/key/ref/effect order is behaviorally significant | I | Supported by CodeMirror lifecycle, navigation commit guards and observer construction |
| Accessible, private, secure, cross-platform or release-ready as a whole | U in this investigation | This report does not certify those product promises |

## 6. First-, second- and third-order extraction concerns

First order is the immediate moved dependency; second order is the subsystem it changes; third order is the downstream user consequence.

| Proposed area | First order | Second order | Third order / risk |
|---|---|---|---|
| Save action | Render snapshot/version capture; promise tracking | Cleanup lifetime and native ID adoption | Close can approve early or recovery can target wrong document — high |
| Recovery hook | Layout-effect context reset; timer/load closure | Save/clear queue and discard suppression | Restart can offer stale data or close can discard newer edits — high |
| Metadata hook | Hydration dependencies, timer and pending set | Close flush and navigation restore | Reader reopens at wrong place or leaves before state persistence — high |
| Activation helper | Different reset/markSaved/session operations | Save capability, bookmark/history, semantic model | Wrong save authority or unexpected mode/dirty behavior — high |
| Navigation actions | Capture identity, invalidation order, selector scope | Future-destination RAF, observation suppression | Snap-back, stale caret move, wrong page after switch — high |
| Reader component | Context singleton, IDs, plugin order and DOM refs | Measurement and observer target mapping | Hidden content, wrong page, duplicate accessible content — medium/high |
| Editor composition | Component type/key and Suspense branch | Editor instance, adapter registration, effect order | Lost undo/caret, split loops, source synchronization changes — high |
| Controlled panels | DOM nesting, trigger/input refs | CSS selectors and focus return | Keyboard dismissal/reflow changes despite identical appearance — medium |
| Command factory | Enabled calculations and fresh closures | Keyboard/palette dispatch to current state | Saving/navigating a stale render snapshot — medium |
| Keyboard hook | Listener dependencies/latest callback timing | Repeat/modifier and editor event consumption | Duplicate save or changed native/editor shortcut behavior — medium/high |
| Derived-value cleanup | Memoizing headings/findings/search | Listener refresh timing and invalidation | Latent stale callback or different performance/diagnostic timing — high if bundled |
| Import reorganization | Lazy boundary and CSS evaluation order | Startup chunk/loading and geometry | Slower startup, shifted layout/page boundaries — medium |
| Status extraction | Competing async writers | Save/cleanup error distinction | User is told an operation succeeded/failed differently — medium |

## 7. Test coverage map and its limits

### Existing executable coverage

| Test files (relative to repository) | Behaviors protected |
|---|---|
| `src/core/document-core.test.ts` | Buffer versions/dirty, parsing/search, navigation/history, structural edits, preferences, summaries, links/copy and semantic-position helpers |
| `src/core/identity.test.ts`, `corpus-integration.test.ts` | Identity/collection properties; representative/malformed Markdown and resolver behavior |
| `src/core/pagination-repair.test.ts`, `measured-pagination.test.ts` | Whole-block pagination, missing geometry, margins/grouping/footnotes, page bounds |
| `src/test/harness.test.tsx` | Harness scheduling, fake operations and scenario controls; not production guarantees by itself |
| `src/test/identity.test.tsx` | Sequential opens, session changes, current identity and selected persistence requests |
| `src/test/save-as-lifecycle.test.tsx` | Identity/name/session/collection adoption, newer edits, cancellation and failure |
| `src/test/recovery-clear.test.tsx` | Document-scoped generations, clear failure/holding, save versus cleanup failure, newer edits |
| `src/test/window-close.test.tsx` | Clean/dirty unload, save/discard/cancel, pending saves, duplicate decisions, edit races and recovery failures |
| `src/test/close-document.test.tsx` | Home transition, refusal cases, metadata persistence/reopen and stale old recovery |
| `src/test/os-open.test.tsx` | Home behavior, OS activation/restoration and dirty refusal |
| `src/test/keyboard-save.test.tsx`, `download-state.test.tsx` | Save dispatch across modes/modifiers, repeat/consumption, export state and labels |
| `src/test/navigation-red.test.tsx` | Page direction/headingless movement; Write/Split outline and exact duplicate/formatted heading targets |
| `src/test/navigation-stale.test.tsx` | Superseded/document/source navigation, future destinations, A→B→A, repeated editor jumps and passive interruption |
| `src/test/navigation-observation.test.tsx` | Input+scroll gating, stale observers, caret-derived location and no programmatic feedback |
| `src/test/position-continuity.test.tsx` | Presentation/mode transitions retaining semantic paragraph/caret position |
| `src/test/pagination-reader.test.tsx`, `measured-pagination.test.tsx` | Full Markdown, oversized reachability, odd/even/spread cases, measurement/inert IDs, preference/resize/font invalidation |
| `src/test/editor-scroll.test.tsx`, `split-sync.test.tsx` | CodeMirror scrolling/jumps, controller source mapping, user-driver switching, stale/disposal and post-edit rebuild |
| `src/test/transient-ui.test.tsx`, `authoring-checks.test.tsx` | Search query retention, settings/palette dismissal/focus, checks visibility/filter/jump |
| `src/test/split-layout.test.tsx`, `rendered-theme.test.tsx`, `scroll-shell.test.tsx` | DOM/CSS structural contracts, shared theme, footer isolation and resize continuity |
| `src/test/invariants.test.ts` | Executable identity/scheme cases plus 70 TODO placeholders; not a completed assurance suite |
| `electron/document-identity.test.ts`, `legacy-state.test.ts` | Real temporary-filesystem identity and archive behavior, including symlink/hardlink distinctions |
| `electron/save-as-lifecycle.test.ts`, `recovery-clear.test.ts` | Actual main handler code with temporary files and mocked shell APIs: auth/watcher replacement, cancellation/failure and recovery serialization |
| `electron/window-close-lifecycle.test.ts`, `file-open-lifecycle.test.ts` | Main event/request lifecycle, sender/queue behavior, startup/readiness/quit distinctions using EventEmitters |

The 70 TODOs include older planned invariants; some related behavior now has executable coverage in newer files. Neither delete them as duplicate cleanup nor describe all 70 as newly discovered defects.

### Harness boundaries

`src/test/scenario.tsx`, `scheduler.ts`, `electron-double.ts`, setup/polyfills and pagination geometry are part of the evidence chain. The fake uses a different identity digest from main. Held operations defer computation, so fake direct save chooses authorized path when the held operation completes; real main captures its session at handler invocation. Recovery operations in the fake do not reproduce main's per-document queue. The fake OS path does not model the complete main request/acknowledgement queue. Therefore a renderer race passing in the fake may not characterize the real boundary.

jsdom uses synthetic geometry, observers and scroll recording. CodeMirror is mounted in several tests, but browser layout remains simulated. CSS source assertions protect selectors, not rendered appearance. Tests labelled with Windows/Linux modifiers are keyboard event cases, not real platform sessions. The application root uses StrictMode; the scenario fixture is not equivalent to that production root lifecycle.

`scripts/test-pagination-packaged.mjs` exercises real geometry, reader theme, font/preferences/resize, oversized reachability, scroll shell and split/editor behavior. `scripts/test-window-close-packaged.mjs` exercises the actual file-loaded renderer/preload/main/filesystem close path with injected dialog decisions and isolated user data. They are valuable but do not replace physical keyboard, native dialog, screen-reader or other-platform tests. Build a matching package and keep the dev server offline before using their results for a refactor.

### Characterization required before risky extraction

Tests should record observable baseline behavior first. If a safety expectation fails, preserve the reproduction and request a separate correctness decision; do not silently bless unsafe behavior or change it as part of extraction.

| ID | Characterization scenario | Gate |
|---|---|---|
| C01 | Native, recent, browser single/collection, sidebar, chapter, cross-history/link/search/origin from clean and dirty state: source, mode, visible location, bookmarks, save availability, close outcome and bridge calls | Any activation abstraction |
| C02 | Hold open A, start B, resolve in both orders; repeat with FileReader/collection read and unmount. Hold direct save or Save As across each activation | Async open/save extraction; use a handler-faithful fake or main-boundary case |
| C03 | Hold file save then recovery clear; attempt Close Document/window close between each stage; duplicate Save input; verify no premature close and precise status | Save/pending tracking extraction |
| C04 | Save As to an existing collection ID, with clean/newer-edit variants; verify collection contents, name, session, dirty, old recovery and next direct save | Save As continuation extraction |
| C05 | Hold recovery load, clear/discard/save, then release old load; include same-ID new session and A→B→A | Recovery ownership/effect extraction |
| C06 | Hold hydration while navigating/changing preferences/bookmarks; allow debounce; close before/after hydration; reopen same ID | Metadata extraction; characterize fields independently |
| C07 | Hold an existing metadata write and final close flush; edit/navigate/switch while pending; reject write; confirm Home and on-disk final state | Close/flush extraction |
| C08 | Old queued external source after browser/collection/native transition; clean versus dirty reload/keep-editing and recovery notice interactions | External subscription or activation extraction |
| C09 | Type, select, undo/redo across Write↔Split; navigate repeatedly; cross Read boundary; verify expected editor lifetime, caret, text and dirty behavior | Editor composition or synchronization changes |
| C10 | Search click versus cycle, >8 results, scope reset, same/cross-document return origin, old queued result after edit, formatted/duplicate headings | Search action extraction |
| C11 | History branching and cross-document history versus chapter/sidebar/link routes; inspect view, bookmark and save behavior | History/navigation action centralization |
| C12 | Table-driven command availability and execution after edits, switches, view changes and missing APIs; keyboard/palette/toolbar equivalent where currently equivalent | Command factory / keyboard extraction |
| C13 | Focus and DOM contract: settings trigger, query retained on dismissal, palette selection versus Escape, checks panel; real page dimensions and observer targets unchanged | Controlled UI / reader extraction |
| C14 | Real main+renderer OS requests during dirty close preparation, held metadata flush, replacement commit, and three rapid requests; verify newest-pending policy and acknowledgement exactly once | Outer OS lifecycle extraction (defer initially) |
| C15 | StrictMode mount/cleanup/remount with held hydration/recovery/navigation, subscriptions and lazy editor registration | Moving effect ownership between component levels |
| C16 | Every explicit location route preserves source and expected dirty/undo state; include inline nodes, headingless documents and invalidated offsets | Navigation extraction; document existing fallback behavior separately |

## 8. Proposed target boundaries

The initial target is a smaller coordinator with explicit action ports, not a new application framework.

```text
src/App.tsx
  App: retain Home/keyed workspace/OS handshake
  DocumentWorkspace: retain document state, buffer and cross-system orchestration

src/components/reader-surfaces.tsx
  existing ReaderSurface + PreviewSurface + shared semantic contexts/mappings
src/components/workspace/
  WorkspaceHeader.tsx       controlled topbar and existing file inputs
  WorkspaceOutline.tsx      controlled collection/heading outline
  WorkspaceSearch.tsx       controlled result UI
  ReaderSettings.tsx        controlled preferences panel
  DocumentNotices.tsx       controlled external/recovery notices

src/core/workspace-commands.ts
  pure command factory: view facts + named action callbacks → same Command[]
src/core/reader-state-payload.ts
  pure desktop payload construction, shared by debounce and explicit flush
src/core/workspace-source-actions.ts
  later: existing editor/structural source mutations, explicit buffer + commit ports
src/core/workspace-save-actions.ts
  later: direct save and Save As branches, preserving captured input semantics
src/core/workspace-close-action.ts
  later: Close Document protocol; no ownership of native window-close listener
src/core/use-workspace-keyboard.ts
  later: existing keyboard listener and latest-save ref, same effect lifetime
src/core/use-workspace-recovery.ts
  later: recovery context, notice, load/debounce/clear/discard only
src/core/use-reader-metadata.ts
  later: desktop hydration, pending writes/readiness and explicit flush port
```

These are proposed paths, not files created in Phase 1. No minimum extraction count or target App line count is imposed.

Use typed, domain-specific inputs rather than `workspace: any`, a bag of all setters, or a catch-all session hook. For example, the command factory can receive current availability/display facts and named command callbacks; it should not receive `DocumentBuffer` merely to compute a condition already computed by the workspace. Async actions need invocation snapshots and explicit commit callbacks, not access to arbitrary UI state.

Do not split shared renderer contexts into separately instantiated copies. Keep component definitions at module scope. Preserve the lazy `MarkdownEditor` and `CommandPalette` imports, their Suspense placement, and CSS import order. Do not move hooks into children just because their DOM moved: child/parent layout-effect ordering differs from hook order inside one component.

Preserve these DOM contracts exactly: continuous reader's viewport/article/reading-column nesting; measurement sibling and ID prefix; direct `.main-area > .editor-layout`; editor/preview/checks as layout siblings; `.reader-utilities` display-contents behavior; footer outside the reading article; oversized page-region focusability. A component returning the same nodes is acceptable; an extra wrapper is not mechanically equivalent.

## 9. Ordered Phase 2 proposal

**Every step below has expected behavior change: none.** Each extraction is one independently revertible commit after its prerequisite characterization commit. Rollback means revert that extraction commit, retaining useful baseline tests. Do not fold cleanup or a failing behavior fix into it. For every step run relevant tests listed, then the full test suite, build and lint; compare warning categories to baseline rather than broadly fixing them. Run packaged verification for reader/editor/layout or Electron-dependent lifecycle changes. If baseline characterization disagrees with this report, revise the plan before extracting that area.

### Wave A: characterize, then move rendering and definitions

| Step | Exact move: source → destination | Crossing dependencies | Verification / new gate | Risk, downstream effects and rollback |
|---|---|---|---|---|
| 0 | Add baseline characterization only in existing test suites; no production move | Existing scenario scheduler, faithful bridge behavior where needed | C12/C13 before first moves; establish matching packaged pagination/close baseline; add other C tests just before their gated steps | Low production risk. A failing safety case is separate work. Rollback test-only commit if harness itself is wrong |
| 1 | App 165–223, 237–444 rendering contexts/mappings and two surfaces → `components/reader-surfaces.tsx` | Existing semantic types, page-render plugins, props/refs, internal-link callback | Navigation-red, pagination-reader, measured-pagination, theme/split/scroll; C13; packaged pagination | Medium/high: singleton IDs, sanitize order, inherited geometry. Revert only surface extraction |
| 2 | App 1767–2181 command array → pure `core/workspace-commands.ts` factory | Current facts and named callbacks; existing `Command` type | Core commands, keyboard-save, download, transient, authoring; C12 | Medium: stale closures/enabled values. Rebuild every render; no memoization. Revert factory/import wiring |
| 3 | App 2205–2295 topbar and file inputs → controlled `WorkspaceHeader.tsx` | Name/status facts, open/save/close/export callbacks, input refs and change handlers | Save/download/close/identity/transient; C13 header focus/labels and input selection | Medium: ref ownership and input reset timing. No new wrappers. Revert header extraction |
| 4 | App 2307–2364 outline → controlled `WorkspaceOutline.tsx` | Collection/headings/active IDs, open state, switch/heading callbacks | Navigation-red/stale, identity; C01 sidebar and C13 focus/DOM | Medium: do not relocate navigation or memory ownership. Revert outline extraction |
| 5 | App 2466–2542 search results UI → controlled `WorkspaceSearch.tsx` | Query/scope/results/index/origin facts and existing handlers; search input remains in toolbar | Transient-ui; C10 and C13 | Medium: direct-click and cycling differ; preserve first-eight display and retained query. Revert search view extraction |
| 6 | App 2543–2595 settings panel → controlled `ReaderSettings.tsx` | Raw preference values/setters and panel ref; trigger stays in original owner | Transient, measured-pagination, theme; C13; packaged preference geometry | Medium: click-away containment/focus and CSS ancestry. Keep dismissal effect in workspace. Revert settings extraction |
| 7 | App 2596–2630 conflict/recovery notices → controlled `DocumentNotices.tsx` | Exact text and callbacks, current notices | Recovery-clear/window-close plus C08 notice interaction | Low/medium: do not merge restore/reload semantics or clear messages on mount. Revert notices extraction |

These steps are deliberately individual. A new generic toolbar, unified panels framework, editor wrapper or design-system cleanup is not part of Wave A.

### Wave B: pure shared computation and bounded actions

| Step | Exact move: source → destination | Crossing dependencies | Verification / new gate | Risk, downstream effects and rollback |
|---|---|---|---|---|
| 8 | Duplicate desktop reader-state payload expressions in App 851–888 and 1668–1731 → `core/reader-state-payload.ts` | ID/bookmarks/model/location/raw preferences; existing serialized type | Identity, close-document, position; C06/C07 payload equality | Medium: only payload construction is equivalent, not timers/guards. Do not normalize differently. Revert helper use |
| 9 | App 1210–1217 `updateSource` → named action in `core/workspace-source-actions.ts` | Stable buffer, render active ID, explicit collection/source/dirty commits | Editor/split, save-as, recovery, navigation; C09 source echo and dirty | Medium/high: equality guard precedes replace; no subscription conversion. Revert action only |
| 10 | App 1219–1235 structural edit action → second named action in same module | Render source/editor line, base-version buffer apply and same commits | Core structural, editor/navigation; C09 structural undo/caret baseline | Medium/high: preserve transaction ordering, not a generic edit pipeline. Revert this action independently |
| 11 | App 975–1024 → `use-workspace-keyboard.ts`, returning the save ref; retain latest-save layout assignment at 1636 in workspace | Existing action closures, view/mode/headings/active heading; latest committed save callback | Keyboard-save, navigation, transient; C12 and C15 | Medium/high: preserve dependency-driven rebinding, layout assignment order and modifier/repeat behavior. Revert hook extraction; no lint autofix |

### Wave C: gated lifecycle extraction, one protocol at a time

This wave is a proposal for review, not an assertion that the current coverage permits immediate execution. Complete each listed race characterization first. Keep the workspace as identity/buffer owner throughout.

| Step | Exact move: source → destination | Crossing dependencies | Verification / new gate | Risk, downstream effects and rollback |
|---|---|---|---|---|
| 12 | App recovery context/state at 571–578, load 909–922, clear helpers 1535–1554 → initial `use-workspace-recovery.ts` | Active ID, live buffer read, API, status; return same notice/setter and clear/discard operations | Recovery-clear, close-document, window-close; C05/C15 | High: layout effect must still precede recovery consumers; do not move timer yet. Revert recovery load/clear extraction |
| 13 | App recovery debounce 890–907 → extend that hook | Current dirty flag, source-version snapshot, discard ID/version, save API | Recovery/close; C03/C05 and edit-during-discard baseline | High: preserve 1,500 ms capture/suppression, no new pending tracking. Revert timer move independently |
| 14 | App direct-save branch 1560–1587 → named action in `workspace-save-actions.ts` | Invocation ID/version and render source, stable buffer, exact commit/status/cleanup ports; parent tracker | Save/recovery/keyboard/close; C02/C03; packaged close | High: settlement includes cleanup; no latest-source substitution. Revert direct branch extraction |
| 15 | App Save As branch 1588–1620 → separate action in same module | Captured ID/version/name/source; live buffer at completion; identity/collection/recents/recovery commits | Renderer/main Save As, recovery/window-close; C02/C04; packaged Save As characterization if script lacks it | High: retain identity adoption with newer edits, collision behavior and cancellation. Revert Save As move |
| 16 | App desktop hydration 800–849 and debounce 851–888, readiness/pending metadata ownership → `use-reader-metadata.ts` | Model/navigation capture, bookmark/preference setters, closing ref, payload builder, explicit flush port | Identity/navigation/close; C06/C07/C15 | High: retain per-ID effect dependency and write timing; keep legacy localStorage effects in workspace. Revert hook and ownership wiring |
| 17 | App 1668–1731 Close Document async body → `workspace-close-action.ts` | Buffer, dirty snapshot, pending sets, readiness, navigation capture, flush, closing/status commits and completion | Close-document/window-close/os-open; C03/C07/C14; packaged close | High: retain both validation passes and no-op prepare completion. Keep imperative handle in workspace. Revert action extraction |
| 18 | Only confirmed common native/recent success statements at 1473–1533 → narrowly named native activation helper | Typed native response, same buffer/collection/identity/nav/view/recents commits | Identity, close, stale navigation; C01/C02/C08 | High: invocation/fallback/error paths remain separate; no browser/collection/history reuse. Revert common success helper |

Step 18 is optional if its parameter surface obscures rather than clarifies the protocol. A short duplicated commit sequence is preferable to an unreviewable setter bag. Likewise, stop Wave C if a hook would require most of the workspace as inputs: the correct next action is a revised bounded design, not a larger god hook.

After each wave, review the remaining coordinator using the responsibility graph rather than its line count. Moving `DocumentWorkspace` wholesale to another file may later be a file-organization decision; it is not itself decoupling and is not a substitute for these boundaries.

## 10. Separately recorded risks and deferred work

These are not fixes performed by this report. “Source-backed” means the control flow is present; the precise user-visible failure still needs reproduction unless existing tests explicitly demonstrate it.

| Finding | Classification / significance | Treatment |
|---|---|---|
| In-workspace activation does not uniformly guard dirty content; several paths retain session/direct capability or skip markSaved while resetting React dirty | Source-backed protocol inconsistency; high data-integrity risk if normalized or exercised in an unsafe sequence | C01/C02 first; separately decide safety repair versus mechanical preservation |
| Browser/collection opens and native/recent completions lack a common generation guard | Source-backed async risk; older completion can plausibly replace newer intent | C02; do not claim NavigationWork protects these operations |
| Direct save guards version but not all document/native-session transitions; Save As adopts identity in its completion | Source-backed race risk | Handler-faithful C02/C04; no new guard silently added |
| Desktop metadata debounce does not wait for hydration readiness; fields have different hydration guards | Source-backed ordering risk | C06/C07; preserve current timers until separately decided |
| Renderer external-change payload has no ID; native authorization survives Close Document and browser transitions | Source-backed boundary risk; main watcher does reject stale native sessions | C08; do not expand IPC in extraction |
| Live semantic anchor may be empty/stale after source changes; inline ID page lookup falls back to zero | Source-backed limitation relative to broader navigation design | C16; full reconciliation/containing-block mapping is separate behavior work |
| Browser initial restore builds a different target ID form from desktop heading restoration | Source-backed inconsistency; visible impact needs reproduction | Add focused browser-restore case before touching legacy persistence |
| App-quit bypass differs from guarded window close | Intentional existing main behavior covered by lifecycle tests; broader assurance gap | Preserve in refactor; separate lifecycle scope if requested |
| Main open has awaited recents work between current-session validation and final authorization replacement | Credible race from source; not reproduced here | Main concurrency characterization before asserting universal isolation |
| Active-workspace keyboard handler lacks the Home component's Open shortcut; advertised commands are not all keyboard dispatchers | Source-backed behavior discrepancy | C12; adding shortcuts is separate feature/correctness work |
| Findings/search/collection counts are recomputed during render; headings identity participates in effect refresh | Current implementation, not a measured performance defect | No memoization/performance cleanup during extraction |
| Proposed per-document runtime, stronger recovery/durability and broader accessibility/platform gates remain beyond current evidence | Planned or unverified work, not automatically a current-sprint defect | Preserve documentation distinctions; do not manufacture completion |

### Explicitly do not refactor yet

- Universal document activation; per-document buffer/session architecture; React dirty-state consolidation; store/reducer migration.
- Outer Home/workspace keying and OS acknowledgement ownership; main authorization, watcher, IPC or filesystem identity formats.
- Save As semantics, recovery generations/queue, metadata serialization/concurrency, localStorage schema or legacy migration.
- NavigationWork internals, semantic reconciliation, history/bookmark format migration, search offset versioning, universal navigation dispatch.
- Pagination algorithm, Markdown parser/sanitizer/plugin order, whole-block oversized behavior, measurement CSS or page-source generation.
- CodeMirror binding, undo model, mount strategy, adapter registration, editor/Suspense composition, or broad accessibility/keyboard redesign.
- Memoization, diagnostics scheduling, dependency upgrades, lint cleanup, renamed concepts, CSS consolidation, new components merely to reduce line count.
- Library/indexing, symlink policy changes, broader file filters, public packaging/release claims, or platform behavior changes.

## 11. Phase 1 acceptance

The architecture, ownership map, transition differences, invariants, dependency orders, current evidence, missing characterization, proposed boundaries and per-step risks are recorded above. Baseline tests/build/lint were run; their limits are explicit. No production code, tests, persistence schema or IPC contract was changed.

The next decision is review of this report and the proposed extraction waves. Phase 2 must not begin until the user authorizes production refactoring.
