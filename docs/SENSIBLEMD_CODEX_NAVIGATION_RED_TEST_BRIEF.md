# SensibleMD Navigation Coherence — Codex Implementation Brief

**Purpose:** Give Codex a tightly scoped implementation plan that complements `docs/navigation-state-coherence-design.md`.

**Read first:**
1. `docs/navigation-state-coherence-design.md`
2. This file

**Current goal:** Create red regression coverage for N01–N03 by extending the existing scenario harness only as much as required. Do **not** change production navigation behavior yet.

---

## 1. Why this work comes first

The current implementation has source-backed navigation coherence defects.

### DOG-011 — page snap-back

Current page synchronization derives `pageIndex` from `activeNodeId || activeHeading`:

```ts
useEffect(() => {
  if (readingMode === 'continuous' || !activeNodeId && !activeHeading) return
  const presentationPages = paginateDocument(semanticDocument, readingMode === 'spread' ? 52 : 76)
  const nextPageIndex = pageIndexForNode(presentationPages, activeNodeId || activeHeading)
  setPageIndex((currentIndex) => currentIndex === nextPageIndex ? currentIndex : nextPageIndex)
}, [activeHeading, activeNodeId, readingMode, source])
```

But `setPageAndContext()` updates `pageIndex` and may update `activeHeading` while leaving `activeNodeId` stale:

```ts
const setPageAndContext = (nextIndex: number) => {
  setPageIndex(nextIndex)
  const headingFragment = pages[nextIndex]?.fragments.find((fragment) =>
    semanticDocument.headings.some((heading) => heading.id === fragment.nodeId)
  )
  const heading = headingFragment && headings.find((item) => item.id === headingFragment.nodeId)
  if (heading) setActiveHeading(heading.id)
}
```

That stale `activeNodeId` can win on the next synchronization pass and pull the visible page back toward the old semantic target.

This must be reproduced in a red scenario test before implementation changes.

---

### DOG-013 — outline navigation forces Read mode

`goToHeading()` currently contains:

```ts
setView('read')
```

`goToNode()` also contains:

```ts
setView('read')
```

Outline items call:

```ts
onClick={() => goToHeading(heading, 'outline')}
```

Therefore outline navigation explicitly changes document mode today.

This must be reproduced in red tests for both Write and Split before production code changes.

---

### DOG-012 — outline/render target mismatch

Current rendered heading IDs are derived independently from semantic heading identity, and Reader rendering only supplies explicit custom heading components for h1–h3.

The regression suite must prove failures for:
- duplicate heading text,
- inline-formatted headings,
- h4–h6 headings.

Do not fix these while writing the test harness.

---

## 2. Scope for this task

### Allowed

Extend `src/test/scenario.tsx` and test support so N01–N03 can be expressed.

Add executable red tests.

Add narrow test-only helpers/polyfills when required.

### Not allowed

Do not:
- introduce `useDocumentNavigation` yet,
- redesign navigation ownership,
- change production navigation behavior,
- fix DOG-011,
- fix DOG-012,
- fix DOG-013,
- change pagination implementation,
- add scroll observers,
- change persistence,
- change Electron IPC/session architecture,
- perform unrelated CSS work,
- implement measured pagination,
- broaden into N04–N14.

The purpose of this patch is **reproduction capability**, not repair.

---

## 3. Scenario harness additions

Extend the existing `Scenario` interface with the minimum user-level behaviors needed by N01–N03.

Prefer actions and observations that correspond to actual UI behavior rather than exposing private React setters.

Recommended additions:

```ts
interface Scenario {
  // existing methods remain unchanged

  setReadingLayout: (layout: 'Scroll' | 'Page' | 'Spread') => Promise<void>

  clickNextPage: () => Promise<void>
  clickPreviousPage: () => Promise<void>

  visiblePageLabel: () => string
  visiblePageNumbers: () => number[]

  clickOutlineHeading: (
    headingText: string,
    occurrence?: number
  ) => Promise<void>

  currentMode: () => 'Read' | 'Write' | 'Split'

  lastScrollRequest: () => {
    elementId: string
    behavior?: ScrollBehavior
    block?: ScrollLogicalPosition
  } | undefined

  editorCursorLine: () => number
}
```

Names may differ if the existing test style strongly favors another naming convention, but preserve the intent.

---

## 4. Harness implementation guidance

### Reading layout

Use the real UI group:

```text
role="group"
name="Reading layout"
```

Click the actual buttons:
- Scroll
- Page
- Spread

Do not manipulate `readingMode` directly.

### Page turning

Use the actual page-control buttons:
- accessible name: `Previous page`
- accessible name: `Next page`

Do not call `setPageAndContext()` directly.

The tests should exercise the same route the user does.

### Visible page observation

Read user-visible page information from the DOM.

Possible sources:
- page footer text,
- `aria-label="Page N"`,
- page control label such as `Page X of Y`.

Prefer semantic DOM queries over CSS implementation details where practical.

For spread mode, `visiblePageNumbers()` should be capable of returning one or two visible pages.

### Outline click

Use the rendered `.outline-item` buttons or role-based queries.

Duplicate heading labels must be addressable by occurrence:

```ts
await scenario.clickOutlineHeading('Repeat', 2)
```

Use zero-based or one-based indexing consistently and document the choice.

### Current mode

Observe the selected state of the real `Document mode` control.

Do not inspect internal React state.

### Scroll request

`src/test/dom-polyfills.ts` already records `scrollIntoView()` calls in:

```ts
scrollRequests
```

Expose only enough through `Scenario` to assert what target was requested.

Do not turn this into a production abstraction.

### Editor cursor

Use the mounted CodeMirror view through the existing `EditorView.findFromDOM()` helper.

Return the current cursor line from the editor state.

Do not add production-only editor APIs solely for tests.

---

## 5. N01 — Page snap-back regression

### Purpose

Prove DOG-011 before repair.

### Suggested fixture

Use a document long enough to produce several pages and include multiple headings so page turns can land on:
- a page with a later heading,
- a headingless page.

The fixture should be deterministic under current fixed-capacity pagination.

### Reproduction

1. Start scenario.
2. Open/load a multi-page document.
3. Enter Read mode.
4. Select/navigate to heading A through the real UI.
5. Switch to Page layout.
6. Record the current visible page.
7. Click Next Page repeatedly until the reader is clearly beyond heading A.
8. Flush effects with `settle()`.
9. Assert the visible page remains the page the user navigated to.

Repeat:
- across a page containing a later heading,
- across a headingless page,
- backward with Previous Page.

### Expected current result

The test should fail because stale semantic state can re-project the old page.

### Important

The test must fail because of the actual snap-back behavior, not because:
- the harness cannot find a button,
- jsdom lacks layout,
- the fixture is too short,
- an unrelated assertion is incorrect.

---

## 6. N02 — Outline navigation must preserve Write/Split mode

### Purpose

Prove DOG-013 and part of DOG-012.

### Reproduction: Write

1. Start with a document containing at least two headings.
2. Enter Write mode.
3. Manually move the editor caret away from the target heading.
4. Click a different heading in the outline.
5. Assert:
   - current mode is still Write,
   - CodeMirror selection/cursor moved to the target source location,
   - document source is unchanged,
   - dirty state did not change solely because of navigation.

### Reproduction: Split

Repeat the same flow in Split mode.

Assert:
- mode remains Split,
- editor target changes correctly,
- preview target is requested/revealed where current behavior supports observing that,
- source is unchanged,
- dirty state is unchanged.

### Expected current result

The test should fail because `goToHeading()` currently executes:

```ts
setView('read')
```

### Do not weaken the assertion

Do not write the test to accept Read mode just because that is current behavior.

The target invariant is NAV-001:

> user navigation may change location but may not implicitly change Read/Write/Split mode.

---

## 7. N03 — Outline targeting for duplicate/formatted/h4–h6 headings

### Purpose

Prove the current render/semantic identity mismatch.

### Cases

Create a deterministic fixture containing:

```md
# Top

## Repeat

Text.

## Repeat

More text.

### **Formatted heading**

#### Level Four

##### Level Five

###### Level Six
```

Add additional prose as needed.

### Assertions

For each target:

1. Click the exact outline item.
2. Inspect the recorded `scrollIntoView` request.
3. Assert the requested target corresponds to the exact intended heading.

Cases:
- first duplicate `Repeat`,
- second duplicate `Repeat`,
- inline-formatted heading,
- h4,
- h5,
- h6.

### Expected current result

At least some cases should fail under current heading-ID/render mapping.

The test must distinguish duplicate headings rather than merely checking that *some* `Repeat` heading was targeted.

---

## 8. Test-only animation control

Current production code has multiple `requestAnimationFrame()` navigation projections.

If existing tests cannot deterministically observe these callbacks, add a test-only RAF shim/control.

Preferred minimum behavior:

```ts
const animationFrameQueue = []

requestAnimationFrame(cb)
  -> queue callback

flushAnimationFrames()
  -> run queued callbacks deterministically
```

Expose through test support only if necessary.

Do not change production navigation code to make the tests pass.

If jsdom/test environment already executes RAF deterministically enough for these scenarios, do not add unnecessary infrastructure.

---

## 9. Existing observer behavior

Current test polyfills provide no-op:

```ts
IntersectionObserver
ResizeObserver
```

Do not replace them for N01–N03 unless one of these tests genuinely requires it.

Scroll observation belongs to N04 and later.

Do not expand this patch into automatic outline tracking.

---

## 10. Test quality requirements

Every new regression must:
- be executable, not `it.todo()`,
- fail against current production behavior,
- fail for the intended behavioral reason,
- use user-visible interactions where possible,
- avoid private React state setters,
- preserve existing passing tests,
- leave production code unchanged except where absolutely required for testability and only if behavior is not altered.

If a small production seam is truly unavoidable, explain why before using it.

---

## 11. Verification

After adding the harness support and red tests:

Run:

```bash
npm test
npm run build
npm run lint
```

Expected state for this patch:
- existing previously-green tests remain green,
- N01–N03 are red for the documented current defects,
- build passes,
- lint does not introduce new errors.

Do not report the navigation bugs as fixed.

---

## 12. Report back

When finished, provide:

1. files changed,
2. new Scenario methods,
3. new test names,
4. exact reason each test fails against current code,
5. confirmation that production navigation behavior was not changed,
6. test/build/lint results,
7. any blocker where jsdom cannot faithfully represent the behavior.

Do not proceed to production repair in the same change unless explicitly instructed.

---

# Next phase after review

Only after this red-test patch is reviewed should implementation begin.

The next production phase is expected to:
- introduce the bounded navigation ownership model described in `navigation-state-coherence-design.md`,
- make heading/page/presentation derived rather than competing writable state,
- preserve Read/Write/Split during navigation,
- reject stale projections,
- unify navigation entry points,
- then proceed to observation and pagination work.

Do not start that phase in this task.
