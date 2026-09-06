# SensibleMD Remediation Plan (pre-`v0.1-reference`)

Status: **approved with amendments**. Baseline tagged `pre-hardening-baseline`.

This plan responds to four external code reviews. Every finding referenced below was
verified against the tree at `pre-hardening-baseline` before being scheduled.

## Organizing principle

Nearly every defect traces to one of three concepts the prototype discovered but never
formalized:

| Concept      | Question it answers                                          |
| ------------ | ------------------------------------------------------------ |
| **Identity** | What exact document/session/node does this data belong to?   |
| **Version**  | Which exact version of that thing does this operation refer to? |
| **Ownership**| Which layer is authoritative for this data?                  |

Sprints 1–4 establish those three. Everything after depends on them.

## Working rules

1. **One sprint per implementation pass.** Sprint 0 alone, commit, then Sprint 1, commit.
   No combined passes. Small, boring, auditable commits.
2. **Every sprint leaves behind its own regression tests.** Security and integration
   coverage is not deferred to the end.
3. **No sprint deletes user state.** Legacy/orphaned persisted state is archived or left
   in place through at least one release.
4. **Correctness beats feature fidelity.** Where a correct behavior is less polished than
   the current incorrect one, ship the correct one.
5. **No architecture is built in an early sprint that a later sprint is already planned
   to dismantle.**

---

## Sprint 0 — Deterministic test harness (prerequisite)

The worst defects found are *sequence* bugs. Pure-function unit tests cannot reach them.
This harness must exist before any production behavior changes.

1. Add `@testing-library/react`, `@testing-library/user-event`, `jsdom`; configure vitest
   with a `jsdom` environment for component/scenario tests while `src/core` stays `node`.
2. Build a **deferred-promise scheduler** so tests control async resolution order
   explicitly (resolve B before A, resolve after unmount, never resolve).
3. Build an **Electron API test double** implementing the `window.sensibleMD` surface on
   top of that scheduler, with an in-memory fake filesystem, recovery store, state store
   and recents list, plus an injectable external-change event emitter.
4. Build a **scenario harness** that mounts the app and exposes intent-level actions
   (`openDocument`, `type`, `save`, `switchChapter`) so scenario tests do not depend on
   current DOM structure.
5. Write the invariant list as `it.todo()` stubs. These are the exit criteria for later
   sprints; each sprint converts its stubs to real passing tests.

**Exit:** harness can drive the app with deterministic async ordering; existing suite
still green; no production source file modified.

### Invariants (stubbed in Sprint 0, satisfied across Sprints 1–12)

- A document session never applies another session's recovery data.
- A document session never applies another session's external-change event.
- A completed save can never mark edits made after that save began as persisted.
- An unresolved disk conflict can never be overwritten by an ordinary save.
- A failed open never changes the currently authorized document.
- Every semantic heading maps to exactly one rendered DOM heading.
- Every rendered navigable node maps to exactly one semantic node.
- No page-turn operation skips a page, and no reading layout hides content.
- Changing reader layout never changes document meaning.
- Pagination never alters Markdown source.
- Reduced Motion never causes programmatic smooth movement.
- Corrupt or unknown persisted state never prevents a document from opening.
- No Markdown input can cause privileged renderer navigation.
- No document makes a network request unless policy explicitly permits it.
- No renderer request can read recovery/state outside its granted capabilities.
- Every recovery snapshot is current, explicitly retained, or deleted.
- Continuous editing still produces periodic recovery snapshots.
- Opening a new document with unsaved work requires an explicit decision.
- Closing the application with unsaved work requires an explicit decision.
- Two same-named files in different directories never share persisted state.

---

## Sprint 1 — Identity

> **Amendment 1.** Do **not** permanently define `DocumentId` as `SHA-256(realpath)`.
> A path-derived hash means renaming `/Docs/book.md` to `/Docs/my-book.md` silently
> orphans its bookmarks, recovery and reading position, and it makes symlink resolution
> part of identity semantics. Path-derived identity may be acceptable *for v0.1*, but the
> tradeoff must be deliberate, documented and swappable — not baked in.

1. Introduce an opaque `DocumentId` abstraction **owned by the main process**, behind a
   single `deriveDocumentId()` seam so the algorithm can change without touching callers.
2. Separate **stable identity** (`DocumentId`, persists across sessions, keys bookmarks /
   recovery / reading position) from **ephemeral identity** (`SessionId`, one open
   document in one window, keys authorization and in-flight operations).
3. Document the v0.1 identity algorithm and its known limitations in
   `specs/document-identity.md`, including the rename/move orphaning tradeoff.
4. Explicitly test and record behavior for: rename, move within a volume, move across
   volumes, symlinked file, symlinked parent directory, hardlink, and case-only rename on
   case-insensitive filesystems.
5. Replace index-derived collection IDs in `src/core/document-collection.ts`. Desktop
   documents take IDs from main; browser/in-memory documents get `crypto.randomUUID()`.
6. Add branded types in `src/core/identity.ts`: `DocumentId`, `SessionId`,
   `SemanticNodeId`, `BookmarkId`.
7. Fix `NavigationHistory.visit()` to deduplicate on `documentId + headingId`.
8. Make identity derivation locale-independent (no `toLocaleLowerCase()` in identity or
   fingerprint paths; explicit Unicode normalization) so a future Rust implementation can
   reproduce it.
9. **Migration: do not delete.** Legacy state written under old IDs is moved to
   `userData/legacy-state/` (or left untouched) and reported once in diagnostics. No
   destructive cleanup during a hardening pass.

**Regression tests:** identity collision, rename/move/symlink matrix, cross-document
history deduplication.

---

## Sprint 2 — Save, dirty state, conflict

> **Amendment 2.** Do **not** move `dirty` / `savedSource` onto `CollectionDocument`.
> That would build the session object early and Sprint 13 would immediately dismantle it.
> Use a separate per-document runtime map instead.

1. Introduce `DocumentRuntimeState { dirty, savedVersion, saveState, diskFingerprint }`
   held in a `Map<DocumentId, DocumentRuntimeState>`. `CollectionDocument` stays a plain
   data object (`id`, `name`, `source`). This map is the seam Sprint 13 absorbs into
   `DocumentSession`.
2. `DocumentBuffer.markSaved(version: number)` — refuse to advance `savedVersion` past
   what actually reached disk; return whether the buffer is still dirty.
3. Saves capture `{ source, version }` as a unit; on resolve, mark clean only if the
   current version still equals the written version.
4. Explicit save-state machine replacing the ad-hoc booleans:
   `CLEAN | DIRTY | SAVING | DIRTY_WHILE_SAVING | CONFLICT | SAVE_FAILED | RECOVERED_DIRTY`.
5. Remove the `setIsDirty(false)` resets from `switchDocument`, `navigateChapter`,
   `goThroughHistory`, `followInternalLink` and `goToCollectionSearchResult`.
6. Unsaved-work guard (Save / Discard / Cancel) on open, open-recent, open-collection,
   document switch and `before-quit`.
7. Save-time disk fingerprint check in main: compare against the fingerprint observed at
   load/last write; mismatch returns `CONFLICT`. Ordinary save is blocked while in
   `CONFLICT`.
8. Save As adopts the destination as the authorized session and enables direct save. Main
   reduces `payload.name` via `path.basename()` and stops returning the absolute path to
   the renderer.
9. Replace the permanently-rendered `✓ Saved locally` header with state-machine text.

**Regression tests:** save race (edit during in-flight save), conflict blocks overwrite,
per-chapter dirty survives switching, guard fires on every destructive path.

---

## Sprint 3 — Recovery and persistence lifecycle

1. Stamp `documentId` + `sessionId` on recovery snapshots and external-change events, and
   validate at **apply** time, not only at load time.
2. Clear `recoverySnapshot` and `externalChange` synchronously when the active document
   changes.
3. Generation tokens on every async load (`state:load`, `recovery:load`); discard stale
   results.
4. Session lifecycle: `OPENING → LOADING_CONTENT → LOADING_STATE → READY`. Persistence
   effects run only in `READY`, which closes the "save A's state under B's identity" race.
5. Add `recovery:clear(documentId)`; call it after successful save and explicit discard.
   Define a retention/expiry policy.
6. Change recovery autosave from pure debounce to **throttle with maximum interval**
   (snapshot at least every 10s while dirty, plus shortly after idle) so continuous typing
   cannot starve it.
7. `writeJsonAtomically()` gets unique temp names (PID + timestamp, matching the text
   writer), a per-document serialized write queue, and a monotonic generation number so an
   older write cannot land last.
8. Deep-validate persisted state on read using the existing `zod` dependency. Treat
   persistence files as untrusted input.
9. Make `openAuthorizedDocument()` transactional: read, validate and construct the watcher
   first; swap authorization only on complete success. Demote recents persistence and
   watcher setup to non-fatal.

**Regression tests:** cross-document recovery contamination, cross-document external-change
contamination, late-resolving state load, continuous-typing recovery coverage,
out-of-order metadata writes, failed open leaves prior authorization intact.

**Gates Sprint 7** — `localStorage` is currently acting as an accidental second autosave.
Removing it before recovery scheduling is fixed would make crash recovery worse.

---

## Sprint 4 — Electron hardening (capability model)

> **Amendment 4.** "A compromised renderer cannot read arbitrary documents" is not a
> testable invariant while `openRecentDocument()` is exposed — main cannot distinguish a
> React button from hostile script on the same origin. Reframe around **capabilities**.

**Model:**

```
OS dialog / trusted main-process action
        ↓  grants
Document capability  (opaque token, main-side record)
        ↓
Renderer may operate only on capabilities it has been granted
```

**Security exit criterion (replaces the earlier wording):**

> A compromised renderer cannot obtain filesystem paths, read recovery or state for
> arbitrary identifiers, navigate the privileged renderer to another origin, or perform
> filesystem operations outside explicitly granted document capabilities.

Separately decide and document how much authority an existing "recent document" entry
represents — whether listing recents is itself a capability, and whether opening one
requires a fresh user gesture.

1. Remove the `--dev` argv path from packaged builds; gate on `app.isPackaged` and compile
   the dev-server URL out entirely.
2. `assertTrustedSender(event)` on every privileged IPC handler.
3. `will-navigate` / `will-frame-navigate` deny-all except the app origin.
4. CSP in `index.html` **and** via `onHeadersReceived`. Designed jointly with Sprint 9 —
   see Amendment 5.
5. `setPermissionRequestHandler` denying camera, microphone, geolocation, MIDI,
   notifications, USB, Bluetooth and display capture.
6. `app.requestSingleInstanceLock()`.
7. Fix watcher cleanup: `app.on('web-contents-destroyed')` is not a real emitter pairing
   and never fires. Bind `webContents.once('destroyed')` at window creation. Add
   `watcher.on('error')` — an unhandled emitter error is process-fatal today.
8. Watch the containing directory and filter by filename (rename-based atomic save orphans
   an inode watch); debounce and coalesce events; ignore events whose hash matches our own
   most recent write.
9. IPC input limits: maximum source bytes, bookmark count, `headingPath` length and anchor
   string length. Reject over-limit payloads rather than silently clamping.
10. Replace `loadRecoverySnapshot(arbitraryId)` and positional `openRecentDocument(index)`
    with capability-scoped calls and opaque recent-entry identifiers.
11. `safeExternalUrl()`: parse with `URL`, require `https:`, reject embedded credentials,
    cap length; call it only from an explicit user-initiated path.

**Regression tests:** IPC sender rejection, navigation denial, capability escape attempts
(recovery/state for a non-granted identifier), oversized-payload rejection, CSP presence,
watcher-error survival.

---

## Sprint 5 — Rendering identity

1. Delete `headingId()` from `src/App.tsx`. One ID system only.
2. Map AST → semantic node by `node.position.start.offset` for **h1–h6** (not h1–h3), the
   same mechanism `navigationId()` already uses for block nodes. This also removes the
   `String(children)` failure on formatted headings and the duplicate-heading-text
   mismatch.
3. Apply the same mapping in `PreviewSurface`.
4. Extract a shared `<SemanticMarkdown>` component so reader and preview cannot drift.

**Regression tests:** every semantic heading resolves to exactly one DOM node; duplicate
heading text resolves distinctly; formatted headings resolve; h4–h6 are navigable.

---

## Sprint 6 — Pagination and reader layout

> **Amendment 3.** Do **not** split oversized Markdown blocks into independently
> reparsed source-range fragments. A paragraph may contain formatting or link syntax that
> spans any candidate cut point; there is not necessarily a source-character boundary that
> yields two independently valid Markdown strings. A "safe boundary" heuristic recreates
> the current bug in a more sophisticated and harder-to-detect form.

**Invariant established this sprint:**

> Pagination never fragments a semantic Markdown block by rewriting or independently
> reparsing partial Markdown source.

**Required behavior for an oversized block:**

```
keep the semantic block intact
        ↓
allow that page to scroll or exceed nominal capacity
```

Rendered-representation fragmentation (a layout-aware renderer that splits the *rendered*
output rather than the source) is deferred until it can be built safely. It is explicitly
out of scope for `v0.1-reference`.

1. Remove the word-joining fragment path from `src/core/pagination.ts`. Pages are composed
   of whole semantic blocks referenced by source range.
2. Replace `overflow: hidden` on `.book-page` with a scrollable/overflowing page for
   oversized content. Content must never be silently clipped.
3. Drive the spread-versus-single decision from a single source of truth in application
   state, not from a CSS media query. When only one page is visible, the page-turn step
   must be 1.
4. Correct page-relative offsets: `navigationId()` must account for a fragment's offset
   within the page string before comparing against document-absolute
   `SemanticNode.range.start`.
5. Reset `pageIndex` atomically in `openDocument`, `openRecentDocument`, `openFile` and
   `openCollection` so a newly opened document cannot render blank.
6. Unify `activeHeading`, `activeNodeId` and `pageIndex` into a single `ReadingLocation`.
7. Add the missing reading-position sensor: an `IntersectionObserver` over navigable nodes
   updating `ReadingLocation` during ordinary scrolling. Today the app remembers the last
   *navigated* position, not where the user was actually reading.

**Regression tests:** pagination output concatenates to the original source ranges with no
rewriting; no page is skipped in any viewport width; oversized blocks remain reachable;
newly opened documents never render blank; scroll-only reading restores position.

---

## Sprint 7 — Runtime performance

1. Memoize per source version: one `parseSemanticDocument` result feeding search, outline,
   section summary, diagnostics and pagination.
2. Cache collection parses. `collectionWordCount` and `searchCollection` currently reparse
   every chapter on every keystroke.
3. Remove whole-document `localStorage` persistence. Guard every remaining
   `JSON.parse(localStorage...)` with try/catch plus shape validation. **Only after
   Sprint 3.**
4. Remove the O(n²) `lineAtOffset` scan (superseded by Sprint 8's AST traversal).
5. Feed CodeMirror change sets in as `SourceEdit[]` rather than full-document replacement.
6. Bounded concurrency and size limits on collection open; add the missing `.catch()` and
   `FileReader.onerror`.
7. Explicit maximum file size with a graceful large-document mode.

**Regression tests:** parse-call counting per keystroke, large-collection typing budget
from `specs/performance_budget.md`, corrupt-localStorage startup survival.

---

## Sprint 8 — One Markdown interpretation

1. Replace the inline link/image regex in `src/core/semantic-document.ts` with recursive
   AST traversal. Fixes reference links, autolinks, nested brackets, parenthesised URLs,
   escaped brackets, and false positives inside fenced code.
2. `analyzeAccessibility(document)` instead of `(source)` — AST-driven and code-fence
   aware.
3. Same conversion for `src/core/section-summary.ts`.
4. Unicode: replace `^[^\w]+$` with `/[\p{L}\p{N}]/u`. Make slugification a tested core
   module with deterministic duplicate suffixes (`installation`, `installation-1`).
5. Semantic word count from AST text, with a grapheme/CJK-aware counter so pagination
   capacity is meaningful for scripts that do not delimit words with spaces.
6. Support Setext headings in `changeHeadingLevel`, or disable the command on them with an
   explanation.
7. Unique finding identifiers (`ruleId-line-occurrence`); the current form is duplicable
   and used as a React key.
8. UTF-8/BOM detection in main; refuse unsupported encodings rather than reinterpreting
   and overwriting.

**Regression tests:** the parser and the analyzer never disagree about what a heading is;
no diagnostic fires for content inside a fenced code block; Unicode heading corpus.

---

## Sprint 9 — Local resources and network silence

> **Amendment 5.** CSP and the custom protocol are designed **together**. Sprint 4 must not
> ship a policy that Sprint 9 has to break, and Sprint 9 must not globally weaken CSP to
> enable remote images. Remote content, if permitted at all, is fetched through a
> controlled main-process mechanism and re-served over the app's own protocol — not by
> loosening `img-src` for the whole renderer.

> **Amendment 6.** Path authorization for the custom protocol is a security boundary. A
> `path.includes('..')` check is not sufficient. Required algorithm:
>
> ```
> URL-decode exactly once   (reject if decoding again would change the value)
> reject NUL bytes and invalid encodings
> normalize
> resolve against the authorized root
> realpath the resolved target
> realpath the authorized root
> verify the canonical target is contained within the canonical root
> handle symlinks explicitly per documented policy
> ```
>
> Containment must be verified on the canonical paths, with a separator-aware prefix check
> (so `/root-evil` is not treated as inside `/root`).

1. `sensiblemd-resource://` protocol scoped to the authorized document directory, using the
   validation algorithm above.
2. Rewrite relative image sources through that protocol so `images/diagram.png` resolves.
3. Update CSP as part of this design (`img-src 'self' data: sensiblemd-resource:`), not as
   an afterthought.
4. Block remote images by default with an explicit "Load remote images" affordance routed
   through the controlled mechanism.
5. Bundle fonts locally; remove the `fonts.googleapis.com` import from `src/index.css`.
6. Path-aware internal-link resolution; stop matching on basename in
   `src/core/internal-links.ts`.
7. Native collection open in main so chapters receive real identities, watchers, direct
   save and resource roots.

**Regression tests:** traversal corpus (encoded `..`, double-encoded, absolute paths, NUL,
symlink escape, `root-evil` sibling); zero network requests on open; local images render;
remote images blocked until permitted.

---

## Sprint 10 — Accessibility and interaction

1. Surface finding `explanation` and `remediation` — the engine computes both and the UI
   discards them.
2. Recovery and conflict notices become real `alertdialog`s: focus move, focus trap,
   background inerting, focus restoration.
3. Command palette: arrow keys, Enter, Home/End, focus trap, focus restoration, active
   option announcement.
4. `aria-pressed` on Read/Write/Split, Scroll/Page/Spread, search scope and diagnostic
   filter; `aria-current` on outline and chapter items; bookmark state exposed
   non-visually.
5. Focus restoration when outline, bookmarks and section-summary popovers close.
6. Reduced motion: `behavior: reducedMotion ? 'auto' : 'smooth'` at every `scrollIntoView`
   call site; default from `prefers-reduced-motion` with explicit user override.
7. Route Ctrl+F to the CodeMirror find panel in Write mode; implement Cmd+S and Cmd+O as
   real application-menu accelerators (currently advertised in the palette but not bound).
8. Fix copy-command enablement (checks for a *next* node when it should check
   *current ?? next*).
9. Complete the asymmetric structural navigation (previous link/image/table/code, list,
   blockquote).
10. Search: pass `activeSection` so `section` scope works; make `links` and `code` scopes
    search the node collection they claim to; paginate results rather than `slice(0, 8)`
    while navigation walks the full array.
11. Fix the document-wide "No structural issues found" claim when a severity filter is
    active.
12. Add the accessibility-diagnostics disclaimer (assistance, not certification).
13. Manual VoiceOver/NVDA pass per `specs/accessibility_manual_test_scripts.md`.

---

## Sprint 11 — CSS consolidation

Done **before** the architectural refactor, not after.

1. Remove the duplicate `.document-reader` rule and the `!important` declarations that
   currently defeat the Content Width preference.
2. Remove `!important` from `.split-layout` so its media query can take effect.
3. Establish a single ordered cascade: base → components → responsive. No later rule may
   contradict an earlier one.
4. Verify every settings control produces a visible change.
5. Move layout-mode decisions (spread collapse) out of CSS into the application state
   introduced in Sprint 6.

---

## Sprint 12 — Resilience, packaging, freeze

1. React error boundary with "your document has not been discarded", copy-diagnostic, and a
   local-only crash log (no telemetry).
2. Typed errors from main (missing vs permission-denied vs corrupt vs programming error)
   with local diagnostics and a safe generalized renderer message. Remove the blanket
   `catch { return null }` pattern.
3. Durable safe-write: fsync the temp file and, on POSIX, the containing directory. Test
   permission, ACL, extended-attribute and symlink preservation on macOS, Windows, Linux.
4. Stale `.tmp` cleanup at startup, restricted to a pattern we own.
5. Recents management: clear-all, per-item removal, retention policy. Treat stored absolute
   paths as sensitive metadata.
6. Schema-version guard so a Stable build refuses to overwrite newer Beta state, or
   separate `userData` namespaces per channel.
7. `npm audit`, committed lockfile, Electron fuses (`runAsNode` off, `nodeOptions` off,
   inspector args off, ASAR integrity on), macOS signing and notarization, Windows signing.
8. **Full adversarial suite** — the consolidation of per-sprint regression tests plus
   hostile-Markdown rendered through the real React tree (`<script>`, `onclick`,
   `javascript:`, iframe/object/embed, SVG vectors, remote images) using
   `test-corpus/security`.
9. Property/fuzz tests for `SemanticPosition` and the parser/diagnostic boundary.
10. All Sprint 0 invariant stubs green.
11. Tag `v0.1-reference`.

---

## Sprint 13 — Session architecture refactor (post-freeze only)

Behavior is now pinned by invariant tests, so the refactor can be verified rather than
guessed at.

```
DocumentSession {
  identity, buffer, savedFingerprint, dirty/saveState,
  recovery, semanticDocument, readingLocation, bookmarks
}

CollectionSession { Map<DocumentId, DocumentSession> }

ApplicationShell { recents, global preferences, windows, commands }
```

`DocumentRuntimeState` from Sprint 2 is absorbed here rather than rewritten.

Also in scope:

- Migrate `Bookmark`, `HistoryEntry` and `SearchOrigin` to `SemanticPosition`.
- Make `headingPath` a true ancestor stack rather than every preceding heading.
- Actually use the `prefix`/`suffix` text anchors that are persisted and ignored today.
- Emit `{ snapshot, transaction }` from `DocumentBuffer` so `origin` stops being
  decorative.
- Reject overlapping edits in `DocumentBuffer.apply()`.
- Migrate `main.cjs` and `preload.cjs` to TypeScript with a shared IPC schema, replacing
  the hand-maintained agreement between `preload.cjs`, `electron-api.d.ts` and `main.cjs`.
- Resolve the global-versus-per-document preference ownership question (font/spacing/width
  and reduced motion are global; position and bookmarks are per document).

---

## Sequencing constraints

| Constraint | Reason |
| --- | --- |
| 0 → everything | No behavior changes before the harness exists |
| 1 gates 2, 3, 4 | Identity underpins dirty state, recovery scoping and capabilities |
| 3 gates 7 | Removing `localStorage` before recovery scheduling is fixed makes crash recovery worse |
| 5 gates 6 | Page navigation depends on a single ID system |
| 4 ↔ 9 | CSP and the resource protocol are designed together |
| 11 gates 13 | Consolidate CSS before restructuring the components that use it |
| 12 gates 13 | Refactor only against a frozen, test-pinned reference build |

Sprints 8, 9 and 10 are largely parallelizable once 1–6 have landed.
