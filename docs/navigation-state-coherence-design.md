# Navigation state coherence: trace and bounded proposal

Status: Proposed for review; no implementation or tests changed.

Baseline: `3d1f42e` (Sprint 1), inspected with the existing uncommitted packaging/configuration changes. References below use source line numbers at that baseline. Dogfooding observations are in [the bug report](../SENSIBLEMD_DOGFOODING_BUGS.md). Causes below are established by source inspection; packaged reproductions remain to be recorded.

## Decision proposed

Give the active document one semantic navigation location, owned by a small React hook using one state record and pure transition helpers. Derive the current heading and page/spread from that location. Keep Read/Write/Split and requested reading presentation as separate user preferences. Neither is a side effect of navigating.

Do not introduce Zustand, a general application store, the future DocumentSession architecture, or a new persistence format. Do not fix cosmetic issues in this work.

This is a bounded change to navigation ownership, not evidence that save/recovery or Electron capability defects are resolved. The user's requested navigation-first sequence supersedes the broad sprint ordering in [the remediation plan](remediation-plan.md) for this work. Its source-preservation and regression requirements still apply. This note does not start an implementation sprint.

## Current ownership and consumers

References such as `App:126` mean `src/App.tsx:126`.

| Value | Current authority/initialization | Readers and consequences |
|---|---|---|
| `activeDocumentId` | Independent React state, initialized from browser-restored collection; changed by multiple open/switch handlers | Collection selection, parsing/search scope, persistence keys, history, recovery, DOM test attributes. Its transitions are not atomic with a validated navigation destination. |
| `activeNodeId` | React state initialized to empty (`App:127`) | Preferred over heading in persistence and page synchronization; structural traversal, copy selection, restoration (`167–219`, `258–262`, `302–307`, `457`, `583–590`). |
| `activeHeading` | React state initialized from global browser storage (`126`) | Outline highlight, section summary, bookmark target, heading traversal, search origin, history entries, reader context label; fallback location when node is empty (`151`, `282–425`, `575–600`, `617–625`). |
| `pageIndex` | React state initialized to zero (`120`) | ReaderSurface page slice and buttons (`83–91`), page turns (`312–320`), command availability (`593–594`). Both handlers and an effect write it. |
| `view` | React state defaults to Read (`108`) | Selects reader/editor/preview, navigation shortcuts, available commands, diagnostic UI (`266–280`, `581–608`, `618`, `632`). Many navigation handlers also change it. |
| `readingMode` | React state restored from browser storage (`119`) | Capacity 52 for spread / 76 otherwise (`147`), page effect, keyboard behavior, step size and DOM layout; persisted at `162`. |
| Outline selection | No separate outline store | The `.active` class directly compares `activeHeading` (`617`); there is no scroll sensor. `outlineOpen` controls visibility only. |
| `query`, `searchScope` | React state and search controls (`109–112`, `618–619`) | Recompute results through `searchCollection`; query also controls panel visibility. Scope buttons and query/scope effect reset index/origin. |
| `searchIndex` | Independent index into recomputed result array | Result counter, selected row, next/previous cycling; UI displays only first eight rows (`619`). Not a semantic location. |
| `searchOrigin` | `{ documentId, headingId }`, captured only by result-cycling (`399–406`) | Return button and command (`408–425`, `599`, `619`). Direct result clicks do not capture it. |
| `readerMemory` | React map initialized from browser storage (`133`) | Mount restoration and chapter-switch restoration; overwritten by effects and explicit switch handler. Stores bookmarks, heading and optional semantic position. |
| `editorLine`, `diagnosticLine` | Independent line state (`121–122`) | Heading edits use `editorLine`; diagnostics set `diagnosticLine`; editor receives it as `jumpToLine` (`370`, `632`). Neither is integrated with reader location. |
| History and bookmarks | `NavigationHistory` ref; heading-ID bookmark array | History stores document/heading pairs; bookmarks resolve only current heading IDs. Both navigate via existing handlers rather than sharing a complete location. |

### Every location/mode writer in App

| Path | Writes and gaps |
|---|---|
| Mount memory restoration (`183–192`) | Resolves memory, writes node + heading, schedules DOM scroll. No request/generation validation. |
| Desktop state load (`195–210`) | Async result writes heading, optionally node, plus bookmarks/preferences. Captures old model; no cancellation, document-generation, or newer-navigation guard. |
| Location-to-page effect (`257–262`) | Rebuilds pages and writes index from `activeNodeId || activeHeading`. Runs after heading/node/mode/source changes. |
| `goToHeading` (`282–288`) | Writes heading + node, forces Read, records destination history, schedules scroll to heading ID. Used by outline, heading buttons/shortcuts/commands, bookmark, same-document links, search and history. |
| `goToNode` (`294–300`) | Writes node + owning heading, forces Read, schedules scroll. Used by structural navigation. |
| `setPageAndContext` / `turnPage` (`312–320`) | Writes page index and, only when target page contains a heading, heading. Never writes node. ReaderSurface buttons and app keyboard/palette have separate step calculations. |
| Cross-document history (`322–337`) | Replaces source/document/name, writes heading only; schedules scroll. Same-document path calls `goToHeading`. |
| `followInternalLink` (`339–361`) | Same-document path calls `goToHeading`; cross-document path replaces source/document, writes heading only, forces Read, writes history, schedules scroll. |
| `goToSearchResult` (`377–380`) | Converts result line to preceding heading and calls `goToHeading`, losing result-block precision. |
| `goToCollectionSearchResult` (`381–397`) | Cross-document path clears heading, forces Read, then writes heading in a queued animation frame. Leaves node/index untouched. Same-document path uses preceding heading. |
| `navigateSearchResults` (`398–407`) | Captures heading-only origin if absent; writes index and invokes result navigation without ordinary history. |
| `returnToSearchOrigin` (`408–426`) | Same-document heading navigation; cross-document source replacement + heading-only write + forced Read + queued scroll; then clears origin/index. |
| Browser `openFile` (`427–434`) | Async FileReader callback replaces document, clears heading/node, forces Read. Does not reset page index. |
| `openCollection` (`435–454`) | Async file reads replace collection/active document, clear heading, force Read. Leave node/page index untouched. |
| `switchDocument` (`455–475`) | Saves outgoing memory, resolves incoming memory, writes node + heading, forces Read; queued scroll. |
| `navigateChapter` (`476–492`) | Replaces document, writes first heading only, forces Read, records history and scroll. |
| Native open / recent open (`493–532`) | Async result replaces document/session, clears node + heading, forces Read. No explicit page reset or obsolete-open guard. |
| Explicit mode actions (`266`, `602–608`, `618`) | Shortcut, palette and toolbar change `view`; finding commands explicitly enter Write. These are intentional mode actions, unlike outline navigation. |
| Layout controls (`618`) | Set reading mode; Page and Spread also write index zero before the location effect may overwrite it. Scroll only changes mode. |
| Search controls (`253–255`, `619`) | Query/scope effect clears index/origin; scope buttons repeat those writes. Result clicks set index and navigate without capturing origin. |
| Diagnostic activation (`632`) | Writes line-only editor jump target; repeat selection of the same line is not a new effect dependency. |

`updateSource`, structural edits, clean external reload, conflict reload and recovery restore (`237–250`, `363–376`, `557–574`) replace source without reconciling navigation first. This indirectly runs the page and memory effects against old IDs in a new model. Save changes the buffer's saved version, not navigation. Copy reads location and writes only feedback/clipboard. Bookmark toggle changes the bookmark array, not location.

### Synchronization effects and deferred work

| Effect/callback | Direction | Problem to remove or constrain |
|---|---|---|
| Browser persistence (`154–164`, `171–173`) | Live state → localStorage | Multiple stored location representations; no validation/readiness gate. |
| Reader memory (`166–169`) | Document + node/heading/source → remembered position | Derives memory on every location/source change, including temporary navigation and transient document transitions. |
| Mount restoration (`183–192`) | Memory → location → queued viewport | Can apply after a newer action; mounted surface may differ. |
| Desktop hydration (`195–210`) | Saved state → location/preferences | Late result may overwrite current navigation or another document's state. |
| Desktop persistence (`213–219`) | Current node/heading → saved record after 500 ms | Can write default/outgoing state before incoming state is loaded. |
| Recovery load (`231–235`) | Async recovery → notice; later source replacement | No session tag at apply time; source change invalidates navigation. Broader recovery isolation remains separate work. |
| External event (`237–250`) | Disk text → source/model → location effects | Event contains no identity; source updates can invalidate node IDs. Broader event authorization is separate work. |
| Search reset (`252–255`) | Query/scope → index/origin cleared | Query edits discard return context. |
| Page synchronization (`257–262`) | Preferred node/heading → page index | Competes with user page controls. |
| Keyboard subscription (`264–280`) | Key → navigation handler | Dependency list omits invoked handlers; newly allocated `headings` currently causes frequent rebinding. Memoization alone could expose stale closures. |
| Queued DOM operations | Handler → requestAnimationFrame → DOM, sometimes heading state | Uncancelled callbacks can act on a replaced document/surface or override newer intent. |
| Editor effects (`MarkdownEditor:14–36`) | Mount/value → CodeMirror; line prop → caret + focus; selection → line callback | Mount captures initial callbacks. Programmatic changes can echo through callbacks. Line-only jumps have no request identity. No outline/reader projection exists. |

Related core modules are not independent stores except `NavigationHistory` and `DocumentBuffer`. `semantic-document.ts` assigns offset/index IDs; `semantic-position.ts` resolves persisted clues but builds a preceding-heading list rather than a true ancestor path. `reader-navigation.ts` searches within filtered node types, so Next Link from a paragraph currently starts at the first link, not necessarily the next link in document order. `collection-search.ts` reparses and returns node IDs without document-version tags. `internal-links.ts` resolves to document/heading using basename and ASCII-style slug matching. These limitations constrain navigation; they do not justify a full parser or filesystem rewrite in this pass.

## Why the bugs are connected

**DOG-011:** navigate to node A, then turn to a page containing heading B. The handler writes the page and B but leaves node A. The effect sees the changed heading, prefers A, and writes A's page back. Pages without headings can appear to work until another dependency changes. Clearing A merely changes which stale value wins.

**DOG-012 and DOG-013:** semantic headings are `heading-<offset>-<index>`, while reader/preview h1–h3 use `headingId(text, line)`. `goToHeading` queries the semantic ID, which the DOM does not expose. h4–h6 lack that custom mapping entirely. Book navigation can appear successful because the separate page effect uses semantic IDs. The same helper unconditionally changes `view` to Read.

**DOG-010:** no observation of ordinary scrolling exists; section state changes mainly on explicit jumps. Pages without headings do not update it. Thus the outline reports the last selected heading rather than consistently reporting the current location.

**DOG-008:** long paragraphs are split by whitespace and rejoined as independently parsed source. A single node can occupy several pages, and `pageIndexForNode` always returns its first page. Page-relative offsets cannot match document-absolute ranges. CSS can hide the second spread page while navigation still advances by two. Oversized blocks are clipped. These problems remain even after removing the snap-back effect.

## Smallest ownership model

Conceptual types; these are not new source files:

```ts
type NavigationLocation = {
  documentId: DocumentId
  anchor: SemanticPosition // node ID plus existing recovery clues
  sourceOffset?: number   // optional editor precision; valid only at sourceVersion
  sourceVersion: number
}

type NavigationState = {
  location: NavigationLocation | null // null for an empty document
  documentGeneration: number          // changes even when reopening the same file
  revision: number                    // increases for every accepted intent
  cause: 'navigate' | 'observe' | 'editor' | 'restore' | 'reconcile'
  ready: boolean                     // navigation hydration settled
}
```

`headingId` is deliberately a selector from the resolved node and model, not another writable field. Likewise, source line is derived from offset. The optional source offset must be rebuilt/clamped through edit reconciliation; an offset from an older version is never trusted directly.

Use a `useDocumentNavigation` hook around `useState<NavigationState>` with functional updates and pure transition functions in `core/navigation-location.ts`. Export intentional operations, not the raw setter. Keep side effects outside state updater functions so StrictMode cannot duplicate scrolls/history writes. A narrowly scoped ref may hold cancellation handles/current request tokens; it must not become an alternative location store.

The existing document activation path remains responsible for source, identity and save authority. All its callers must activate the corresponding navigation generation in the same event transaction. Rendering/projection/persistence require matching active document, generation and model version; otherwise wait for activation/reconciliation. This avoids treating a navigation `documentId` as filesystem authorization. No new per-document buffer/session repository is introduced.

```text
outline / page controls / search / history / bookmark / chapter
                  ↓ resolve intent against current model
          one accepted NavigationLocation
                  ↓ selectors
         heading       containing page → visible spread
                  ↓ projection for current view
       Scroll     Page/Spread     Write     Split
                  ↑ tagged user observations only
```

The hook retains the existing semantic anchor across presentation changes. Read/Write/Split and requested Scroll/Page/Spread are written only by explicit presentation commands (or the defined initial-open preference). File open may deliberately default to Read; chapter/link/search/outline/history navigation must not.

### Intent and projection contracts

| Intent | Location update | Surface behavior |
|---|---|---|
| Outline / heading / bookmark | Resolve target node in current document, commit once | Scroll reader; reveal containing page; set editor selection to source start in Write; update editor and preview in Split. Keep mode. |
| Next/previous page | Calculate destination from current derived visible range; commit first navigable anchor on destination page | No independent index write. Boundary action is a no-op. |
| Search result | Resolve result node, not preceding heading; capture full origin before first activation by either click or keyboard | Keep mode. Revalidate result against current document version. Current API supports block-level targeting, not exact match offsets. |
| Return / Back / Forward | Resolve stored document-qualified anchor | Same navigation path; preserve mode; approximate fallback is explicit. |
| Scroll observation | Commit selected visible block only after deliberate user scrolling | Update outline/memory without scrolling the originating surface again. |
| Editor selection | Map user selection head to semantic block and source offset | Keep CodeMirror selection/history as editor-owned. In Split, project to preview without feeding a programmatic selection back. |
| Presentation change | No semantic location mutation | Project existing anchor into newly mounted/layout-adjusted surface. A new projection token invalidates old viewport callbacks. |
| Source change | Reconcile previous anchor against new model; map known editor changes where available | Exact/high/approximate fallback from existing resolver. Never interpret old offsets as current. |
| Document activation / restore | Initialize generation and explicit target or remembered position | Explicit link/search destination outranks saved resume; late hydration cannot override user navigation. |

History and search origins are snapshots, not competing current positions. Extend in-memory history entries to carry `documentId + SemanticPosition`; adapt legacy heading-only entries on resolution. Keep existing heading bookmarks in this pass, resolving them through the new navigation path. Record both departure and destination for meaningful history jumps; ordinary scrolling does not flood history.

Search origin lasts through query edits within the same exploration session. Ending the session or explicitly returning clears it; unrelated file replacement clears/rebinds it deliberately. Index/result state only selects a candidate. A recomputed index must never automatically drive location. Record a result-set version or anchor at activation rather than trusting an old index. Full search dismissal UX and result-list pagination remain outside this task.

### Stale-work rules

Each deferred restoration, source reconciliation, observer batch and surface projection carries `{ documentId, documentGeneration, sourceVersion, revision, surfaceGeneration }` as applicable. At execution, compare with current state; discard obsolete work. Cancelling a queued callback on cleanup is necessary but insufficient without validation at apply time.

Desktop navigation hydration is accepted only for the same activation and only if no newer navigation/source change occurred. It does not overwrite an explicit opening destination. Location persistence starts after navigation hydration settles, using the resolved location's document key. Continue writing the existing `position` and a derived legacy `activeHeading` field; introduce no schema migration. Loading bookmarks/preferences has separate ownership and must also avoid applying records from a previous document. General metadata write ordering and recovery safety are not solved by a navigation revision.

Project once per accepted navigation/presentation revision, after the correct surface commits. A surface mount acknowledges the latest request; delayed CodeMirror loading must not replay the request that initiated loading if a newer one exists. Give editor jumps an ID and source offset, not only a line number. Keep mounted callbacks current and annotate programmatic selection transactions to avoid echo.

Observer feedback needs more than a revision check: an initial callback from a freshly observed DOM can still carry the current revision. Do not commit observation merely because layout changed. Arm location observations on user wheel/touch/keyboard/scrollbar interaction with that surface, suspend during programmatic projection, and select a candidate from actual scroll activity. User input interrupts pending programmatic projection and takes ownership. Do not use a timeout alone as proof that scrolling was user initiated.

For the first pass, choose the top-level readable block crossing a fixed reading band near the upper viewport; otherwise choose the nearest visible block below it, then the last visible block at document end. Resolve ties in source order and update only when the chosen block changes. This is a block-level estimate, not knowledge of eye position or the screen reader's virtual cursor. In Split, the last explicitly interacted surface owns observations; projecting into the other surface must not seize ownership. Passive page overflow scrolling may refine the current block without turning pages.

## Page derivation prerequisite and fixed-capacity scope

A node-only location cannot uniquely select continuation pages in the existing paginator. Adding a writable page override would recreate the problem. Adding fragment indexes to persisted location would couple location to layout.

Proposed minimum prerequisite: remove source-fragmenting paragraph pagination and keep whole top-level rendered blocks together, as already required by remediation Amendment 3. Oversized blocks remain intact on a scrollable page. This small correctness slice of DOG-008 must accompany the first derived-page implementation; the rest of pagination stabilization follows outline tracking. It is a necessary dependency adjustment to the requested order, not measured pagination.

A page map carries document/model version and capacity; every rendered top-level block belongs to exactly one page. For inline targets, locate the containing top-level block by original source range. Non-rendering definitions must not create empty pages. Empty documents produce no target/page and disabled navigation rather than a fabricated node or “Page 1 of 0.”

Selectors:

```text
containingPage = pageForContainingBlock(resolvedLocation)
effectiveSpreadSize = requestedSpread && twoColumnsActuallyVisible ? 2 : 1
visibleStart = floor(containingPage / effectiveSpreadSize) * effectiveSpreadSize
visibleEnd = min(pageCount - 1, visibleStart + effectiveSpreadSize - 1)
nextTargetPage = visibleEnd + 1, if it exists
previousTargetPage = max(0, visibleStart - effectiveSpreadSize), if visibleStart > 0
```

Use zero-based indexes internally. A spread's final page may be unpaired. A target on the right-hand page remains the semantic target; deriving the spread start must not move location to its left page. Collapse/expand uses one shared effective presentation value for both CSS and navigation. Retain the current responsive policy initially; measuring available width here is only for column visibility, not measuring Markdown page breaks.

Retain a documented fixed capacity policy (currently 76 single / 52 spread) for this pass. For a fixed source and capacity, the map is deterministic. Typography changes can reflow/overflow within a page without changing page count; do not claim DOG-008's geometry-sensitive acceptance criterion is fulfilled. Actual measured repagination is a separate future task.

### Shared render target mapping

Replace text/line-derived DOM heading IDs with mapping from original parser source ranges to semantic IDs for h1–h6 and navigable blocks. Qualify targets by document and surface (reader versus preview), or use a surface-local ref registry. All projection lookups must be scoped to the mounted surface, avoiding duplicate IDs and global queries landing in the wrong pane.

Do not independently parse rewritten page strings. Prefer parsing the full document with the existing Markdown stack and projecting complete rendered blocks into their assigned pages, retaining original source positions and document-wide reference/footnote context. Page selection must not remove reference definitions before links are resolved. Share that mapping between ReaderSurface and PreviewSurface. Keep existing sanitization and link policy boundaries intact. This is a narrow rendering adapter, not replacement of the entire semantic parser.

Necessary CSS changes are limited to visible-column agreement, reachable overflow, and scroll containers needed to reveal navigation destinations. Styling polish, content-width controls and general cascade consolidation remain deferred. If editor scroll constraints prevent revealing an outline target, record that DOG-003 dependency and fix only the blocking container behavior with the navigation work.

## Required invariants

| ID | Contract |
|---|---|
| NAV-001 | A user-initiated navigation action may change location, but must not implicitly change Read/Write/Split mode. |
| NAV-002 | Changing presentation must not change semantic location. |
| NAV-003 | No stale synchronization effect may overwrite a newer user-initiated navigation location. |
| NAV-004 | Every nonempty current location resolves within its active document/model; heading and page are derived, never independently writable. |
| NAV-005 | Each supported target maps to the correct element/source range in the active surface, including duplicate/formatted h1–h6. |
| NAV-006 | Programmatic projection never feeds back as fresh user navigation; passive observation never steals focus. |
| NAV-007 | Every page is reachable at every supported column count; pagination neither rewrites source nor hides oversized content. |
| NAV-008 | A stale source offset/result/restore cannot be applied to a newer model; failed resolution uses a deterministic documented fallback. |
| NAV-009 | Navigation and presentation alone do not mutate Markdown, dirty state or editor undo history. |

## Regression plan: red before implementation, green afterward

Add executable tests, not more TODOs, to the existing scenario harness. Each regression must fail for its intended behavioral reason against current code. New pure-helper tests are written with the new module; their absence alone is not a useful pre-change failure. Existing tests remain passing except the old test explicitly requiring paragraph fragmentation, which must be replaced with the approved whole-block contract.

| Test | Reproduction and assertions | Mapping/layer |
|---|---|---|
| N01 | Select heading A; enter Page; navigate past a later heading repeatedly, including a headingless page. Assert visible page and derived semantic target after each click/effect flush; repeat via keyboard, then backward. | DOG-011, NAV-003; scenario |
| N02 | Outline-click in Write and Split. Assert mode unchanged, CodeMirror selection at target source offset, preview target revealed, source/dirty/undo unchanged. Repeat same target after manually moving caret. | DOG-012/013, NAV-001/009; scenario + packaged |
| N03 | Outline-click in Scroll for duplicate headings, inline-formatted headings and h4–h6. Assert correct target exists and recorded scroll addresses that exact surface element. | DOG-012, NAV-005; DOM scenario |
| N04 | Move to paragraph B under an existing heading by user scrolling only. Assert active outline item and `aria-current`; no scroll-back request, no focus movement. Multiple observer entries/ties deterministic. | DOG-010, NAV-006; controlled observer + packaged |
| N05 | Select a paragraph; cycle Scroll/Page/Spread/Write/Split and resize columns. Assert same resolved anchor, including a target on the right page of a spread. Initial observer callbacks must not change it. | DOG-008/011/013, NAV-002; scenario + packaged |
| N06 | Delay saved-position load, navigate elsewhere, then release it. Also switch A→B→A and release the first A load last. Current target must win; no outgoing/default location persisted under incoming identity. | NAV-003/004; existing deferred scheduler |
| N07 | Queue projection A; navigate B before animation frame/editor mount/observer delivery. Release obsolete callback; assert B and focus remain correct. Repeat after source edit and unmount. | NAV-003/006/008; controlled frames/observer/lazy mount |
| N08 | Activate a search result below its heading, via click and keyboard. Assert target block, preserved mode, origin captured once; query changes preserve origin; Return resolves exact original block. | DOG-008/012, NAV-001/004; scenario |
| N09 | Navigate an existing collection link/search/history across files with identical heading IDs. Assert qualified destination, no stale node from prior file, no forced mode change. Use clean documents; retain explicit known dirty-switch regression as separate unresolved work. | NAV-003/004; scenario |
| N10 | Long paragraph containing emphasis/reference links/hard breaks spans old capacities. Assert whole source-backed block is preserved, rendered meaning matches continuous view, copy remains complete, overflow reachable. Include definitions in another section. | DOG-008, NAV-007; core + renderer + packaged |
| N11 | Odd/even page counts with effective column sizes 1 and 2; traverse forward/back and collapse/expand. Union of visited visible pages covers all pages; no missing second page; target stays put on resize. | DOG-008/011, NAV-002/007; core + packaged |
| N12 | Open a short/empty document from a high page; edit/delete the current target; restore/reload source. Assert valid document-local fallback, no blank stale page or stale-offset jump. | DOG-008, NAV-004/008; scenario |
| N13 | Next link from a middle paragraph finds the next later link rather than the first link in the file; inline link/image destinations resolve through their containing page block. | NAV-004/005; core + scenario |
| N14 | Ordinary rerender/preferences change does not issue a fresh navigation; rapid page presses operate on latest accepted state. StrictMode creates no duplicate history entries or stale projection. | DOG-011, NAV-003/006; scenario |

Extend `Scenario` with navigation/layout actions and semantic-location observations rather than exposing private setters. Replace NoopObserver only where needed with a controllable observer double; keep explicit distinction between layout callbacks and user scrolling. Current `scrollRequests` can prove a requested target, not actual reachability. jsdom has no meaningful layout, trackpad, viewport geometry or assistive-technology cursor: packaged checks are required for overflow, smooth-scroll interruption, keyboard focus, narrow spreads and Split scrolling.

Baseline from the preceding repository review: 79 tests passed, 71 TODO; build passed; lint completed with warnings. No tests were rerun for this documentation-only change. No bug is marked fixed here.

## Bounded implementation sequence after design review

1. Establish red reproductions N01–N03 and stale-work/mode contracts; build shared semantic render mapping and the minimum whole-block page prerequisite. Replace competing location setters with the hook, selectors and projection adapters. Fix DOG-011/012/013 together. Every listed navigation entry point must use the same path, including search/history; do not leave a hidden setter escape hatch.
2. Add user-scroll/editor observation and derived outline state (DOG-010), including ownership and feedback tests. Passive observation must be independently testable from viewport projection.
3. Complete fixed-capacity pagination validation: effective column agreement, oversized content, empty/preamble/definition handling, cross-page references, source edits and source preservation (DOG-008 bounded subset).
4. Run build, lint, core/scenario regressions and packaged manual dogfooding. Record the original reproduction and resolution evidence per DOG issue. Geometry-based page counts remain explicitly unfulfilled; do not close all of DOG-008 prematurely.

## Risks and deliberate limits

- Whole-block pages change existing page counts and can contain more scrolling. This is preferable to rewriting Markdown or introducing ambiguous page anchors; it must be visible in dogfood notes.
- Current semantic IDs churn with source offsets. The existing resolver provides bounded fallback, not durable identity for arbitrary edits. Preserve its confidence and test deletion/duplicates; do not promise exact restoration when only a section survives.
- Full-document rendering projections must preserve reference definitions, footnotes and sanitization. Rendering isolated source blocks is not sufficient proof of semantic equivalence.
- Editor mount callbacks currently capture stale values. Navigation changes need current callbacks and programmatic-origin suppression without resetting the editor on every render or erasing its undo history.
- Observer arbitration is the main new interaction risk. Initial/reflow callbacks, programmatic scrolling, scrollbar dragging and assistive scrolling need real-browser testing. Do not infer or control a screen reader's virtual cursor.
- Cross-document navigation still passes through the current source/save architecture. Navigation tokens do not fix save races, unsaved-work guards, unscoped external events or recovery contamination. Do not silently expand filesystem authority or present this work as resolving those blockers.
- Existing browser/desktop memory stores overlap. This change may gate and adapt navigation records but must not delete legacy user state or broaden into a storage migration.
- No cosmetic fixes, syntax highlighting, no-document screen, general diagnostic/search UI redesign, store migration, measured pagination or full session refactor are included.
