# Accessible Markdown Reader & Editor
# Pagination and Book Mode Specification

**Document type:** Core interaction and layout specification  
**Status:** Working specification  
**Purpose:** Define the end-state behavior of paginated reading, responsive book layouts, semantic position preservation, long-form reading, and accessibility requirements for page-based Markdown presentation.

---

# 1. Purpose

This specification defines how the application should transform rendered Markdown into a book-like reading experience without sacrificing:

- semantic document structure,
- accessibility,
- source fidelity,
- reading-position persistence,
- responsive layout,
- keyboard access,
- screen-reader usability,
- low-vision reflow.

The application must treat pagination as a presentation layer, not as the canonical structure of the document.

The core architectural rule is:

> **Pages may change. The reader's semantic location should not.**

A user may change:

- font size,
- font family,
- content width,
- line spacing,
- paragraph spacing,
- window dimensions,
- one-page/two-page layout,
- zoom,
- accessibility profile.

These changes may produce completely different page counts. The application should still preserve the user's place.

---

# 2. Product Goal

The intended user experience is similar in spirit to a modern ebook reader such as Apple Books while preserving ordinary Markdown files.

A user should be able to:

- double-click a Markdown file,
- enter rendered reading mode,
- read one page or a two-page spread,
- move forward/backward using arrows, swipe, buttons, or semantic commands,
- resize the application,
- increase text size,
- switch layout modes,
- close the file,
- return later,
- resume at the same semantic place.

No conversion to a proprietary ebook format should be required.

---

# 3. Supported Reading Layouts

The reader should support at minimum:

## 3.1 Continuous Mode

A vertically scrolling rendered document.

Use cases:

- code-heavy documents,
- reference manuals,
- users who prefer web-style reading,
- users for whom pagination is undesirable,
- accessibility fallback.

## 3.2 Single-Page Mode

One page visible at a time.

Use cases:

- narrow windows,
- small screens,
- large text,
- low-vision profiles,
- focused reading.

## 3.3 Two-Page Spread

Two consecutive pages visible side-by-side.

Use cases:

- wide desktop windows,
- book-like reading,
- landscape orientation,
- users who prefer traditional spreads.

## 3.4 Automatic Responsive Mode

The application may automatically choose single-page or spread mode based on available space.

Automatic switching must not lose semantic reading position.

---

# 4. Page as Presentation, Not Identity

A page number is not a stable reading anchor.

Example:

```text
16px font:
Virtual Memory paragraph 4 = page 27

24px font:
Virtual Memory paragraph 4 = page 41
```

The application should save something closer to:

```text
document: memory.md
section: Virtual Memory
paragraph: 4
sentence: 2
```

Then derive the current page from the active layout.

Page number may be displayed, persisted, or used as a fallback, but it must never be the sole canonical position.

---

# 5. Pagination Input

Pagination should consume:

- semantic document nodes,
- rendered block measurements,
- reader typography settings,
- page dimensions,
- margins,
- layout mode,
- image dimensions,
- table dimensions,
- code block dimensions.

Conceptually:

```text
Semantic Document Model
        +
Reader Presentation Settings
        +
Available Layout Geometry
        |
        v
Pagination Engine
        |
        v
Page Layout Map
```

---

# 6. Page Layout Map

Conceptual model:

```ts
interface PageLayoutMap {
  documentId: string;
  layoutSignature: string;
  pages: PageLayout[];
}
```

Page:

```ts
interface PageLayout {
  pageNumber: number;
  fragments: PageFragment[];
}
```

Fragment:

```ts
interface PageFragment {
  nodeId: string;
  fragmentIndex: number;
  fragmentCount: number;

  startOffset?: number;
  endOffset?: number;

  continuationFromPrevious?: boolean;
  continuesOnNext?: boolean;
}
```

The page map should point back to semantic nodes rather than duplicating document meaning.

---

# 7. Layout Signature

Pagination output should be associated with a layout signature so stale page maps are not reused incorrectly.

Possible inputs:

```text
window content width
page width
page height
font family
font size
line height
paragraph spacing
letter spacing
word spacing
margins
reader theme metrics
layout mode
```

If metrics change, repagination may be required.

---

# 8. Responsive Layout Rules

The application should determine whether a two-page spread is readable based on actual available width.

It should not simply use a fixed breakpoint without considering:

- user font size,
- margins,
- minimum readable page width,
- content width,
- low-vision settings.

Conceptually:

```text
if two readable pages fit:
    show spread
else:
    show single page
```

A user preference may override automatic layout selection.

---

# 9. Minimum Page Readability

A page should not become so narrow that ordinary prose becomes uncomfortable or unreadable.

The layout engine should define a minimum usable content width.

If a spread would violate that minimum:

```text
two-page -> single-page
```

This decision should be reversible when the window becomes wider again.

---

# 10. Page Navigation

Users should be able to move:

- next page,
- previous page,
- next spread,
- previous spread,
- first page,
- last page,
- next chapter,
- previous chapter.

Input methods should include:

- keyboard,
- visible controls,
- touchpad/touch gestures where supported,
- semantic command system,
- future voice commands.

---

# 11. Keyboard Navigation

Recommended conceptual commands:

```text
reader.nextPage
reader.previousPage
reader.firstPage
reader.lastPage
reader.nextChapter
reader.previousChapter
```

Default key bindings may include:

```text
Right Arrow -> next page/spread
Left Arrow  -> previous page/spread
```

Exact shortcuts should be validated against:

- OS conventions,
- screen readers,
- editor shortcuts,
- user testing.

All bindings should remain configurable where practical.

---

# 12. Swipe Navigation

Where platform/input support exists:

```text
swipe left  -> next page
swipe right -> previous page
```

Swipe must not be the only way to turn pages.

The application should avoid intercepting gestures that conflict with assistive technologies.

---

# 13. Visible Page Controls

Page controls should:

- have accessible names,
- have sufficient hit area,
- remain keyboard focusable,
- not cover document content,
- not disappear as the only available navigation method.

Controls may visually fade or minimize, but keyboard and assistive access must remain available.

---

# 14. Spread Ordering

Two-page spreads must preserve logical order.

For left-to-right content:

```text
left page  = earlier page
right page = later page
```

For future right-to-left support, ordering may differ.

Nonvisual reading order should follow semantic document order rather than the physical screen geometry.

---

# 15. Reading Position During Page Turns

A page turn should update semantic reader context to the first meaningful semantic anchor on the new page or retain the current anchor if it remains visible.

The application should distinguish:

- visual page position,
- semantic reading cursor,
- keyboard focus,
- screen-reader virtual cursor where applicable.

These are related but not identical.

---

# 16. Current Page Semantics

The application may expose:

```text
Page 27 of 184
```

but should also be able to expose:

```text
Chapter 4
Virtual Memory
39 percent through document
```

Semantic progress should remain primary for accessibility and persistence.

---

# 17. Page Count Recalculation

When the user changes presentation:

```text
font size
line spacing
window size
page margins
content width
theme metrics
```

the application may:

1. capture current semantic position,
2. repaginate,
3. resolve semantic position into the new page map,
4. display the page containing that anchor.

The user should not be returned to page 1.

---

# 18. Heading Break Rules

Preferred rules:

- avoid placing a heading alone at the bottom of a page,
- keep a heading with at least some following content where practical,
- avoid separating a short heading from its first paragraph.

Conceptual behavior:

```text
if heading + minimum following content does not fit:
    start heading on next page
```

These are quality rules, not absolute constraints if a pathological layout makes them impossible.

---

# 19. Paragraph Break Rules

Paragraphs may split across pages.

Preferred behavior:

- avoid a single line of a paragraph stranded at the top or bottom where practical,
- preserve readable line continuity,
- indicate continuation naturally.

The pagination engine should not insert source-visible markers into the Markdown file.

---

# 20. Code Block Pagination

Code blocks are a special case.

## 20.1 Short Blocks

If a code block fits on the next page but not the remaining current-page space, prefer moving it intact.

## 20.2 Long Blocks

If a code block exceeds one full page, split it across pages.

Requirements:

- preserve whitespace,
- preserve syntax highlighting,
- clearly indicate continuation where useful,
- retain one semantic code-block identity,
- maintain copy-whole-block functionality.

The user should be able to copy the full code block regardless of visual splitting.

---

# 21. Table Pagination

Tables may require multiple strategies.

Possible strategies:

## 21.1 Fit Normally

Small tables remain on one page.

## 21.2 Split Across Pages

Large tables may span pages.

If split:

- repeat header row where useful,
- preserve table semantics,
- expose row/column context to screen readers,
- retain one semantic table identity.

## 21.3 Local Scroll Region

Very wide tables may use local horizontal scrolling rather than forcing the entire document width to expand.

Requirements:

- local scroll must be keyboard accessible,
- it must not trap focus,
- screen readers must retain table semantics,
- page navigation must remain distinguishable from table navigation.

---

# 22. Image Pagination

Images should:

- preserve aspect ratio,
- fit within page content bounds,
- avoid overflow,
- keep captions/associated text together where practical.

If an image is larger than the page:

- scale it down for reading,
- provide accessible zoom/enlarge behavior where implemented.

Image resizing must not alter source file contents.

---

# 23. List Pagination

Lists may split across pages.

Requirements:

- retain list semantics,
- retain item numbering,
- preserve nested hierarchy,
- avoid separating a marker from its item content.

For ordered lists, continued pages should preserve correct numbering.

---

# 24. Blockquote Pagination

Blockquotes may span pages.

Visual continuation should remain clear.

The semantic blockquote remains one logical structure even when rendered as multiple fragments.

---

# 25. Footnotes

If footnotes are supported, pagination may offer multiple presentation styles:

- inline linked footnotes,
- end-of-document notes,
- chapter-end notes,
- page-local footnotes where practical.

The first implementation should prioritize semantic link navigation over complex print-style footnote placement.

A user following a footnote must be able to return to the exact prior reading position.

---

# 26. Internal Links in Paginated Mode

For:

```md
[Heap](#heap)
```

the reader should:

1. resolve the semantic target,
2. find the page containing that target,
3. navigate to that page,
4. set semantic position to the heading/target,
5. preserve the source location in navigation history.

---

# 27. Cross-File Links in Book Mode

For:

```md
[Next Chapter](chapter-02.md)
```

the reader should:

1. resolve the target document,
2. open it internally,
3. restore target anchor if present,
4. update collection/chapter context,
5. preserve history.

---

# 28. Chapter Navigation

A Markdown collection may expose:

```text
Previous Chapter
Next Chapter
```

Chapter order may come from:

- explicit collection configuration,
- linked-document graph,
- filename ordering,
- table of contents,
- user-defined order.

The app should not assume alphabetical order is always semantically correct.

---

# 29. Multi-File Book Progress

Progress may include:

```text
Chapter 4 of 11
Page 27 of 48 in chapter
39% through book
```

Overall progress should be derived from semantic content or stable weighting rather than current page count alone.

---

# 30. Reading Time

The book reader may show:

```text
12 minutes remaining in chapter
1 hour 46 minutes remaining in book
```

These are estimates.

Estimates should account primarily for readable prose and may weight code differently.

They should not be presented as exact.

---

# 31. Table of Contents

Book mode should provide a navigable table of contents based on:

- document headings,
- collection chapters,
- nested sections.

Requirements:

- keyboard accessible,
- screen-reader accessible,
- synchronized with current position,
- able to return the reader to prior location if used exploratorily.

---

# 32. Bookmarks

Bookmarks should anchor semantically.

Example:

```text
chapter-04.md
Virtual Memory
paragraph fingerprint
```

The bookmark may display the current page number, but should not depend on it.

---

# 33. Page Thumbnails

Page thumbnails may be supported later.

If implemented:

- they are a secondary navigation aid,
- they must have textual accessible names,
- keyboard navigation must be available,
- thumbnail-only interaction is not acceptable.

---

# 34. Page Number Input

Users may be allowed to jump to:

```text
Page 84
```

This is valid only within the current layout.

If pagination changes, page-number bookmarks should not be assumed stable.

The UI should distinguish:

- physical/current-layout page,
- semantic document position.

---

# 35. Return to Reading Position

One of the most important commands:

```text
reader.returnToReadingPosition
```

Use cases:

- after search,
- after following a link,
- after opening outline,
- after inspecting a footnote,
- after jumping to a bookmark.

The command should restore semantic location even if the page layout changed.

---

# 36. Accessibility: Screen Readers

Paginated visual presentation must not fragment the semantic reading experience unnecessarily.

Requirements:

- screen readers should encounter document content in logical source order,
- two-page visual spreads should not create column-order confusion,
- page wrappers should not become meaningless noise,
- current page information should be queryable,
- page changes should not force focus to irrelevant UI,
- heading navigation should continue to work.

A screen-reader user may prefer continuous mode; it must remain available.

---

# 37. Accessibility: Low Vision

Book mode must support:

- large fonts,
- custom spacing,
- custom colors,
- high contrast,
- zoom,
- narrow windows.

If large text makes two-page mode unsuitable:

```text
spread -> single page
```

The semantic position should remain stable.

---

# 38. Accessibility: Keyboard

All book actions must be keyboard accessible.

At minimum:

- next page,
- previous page,
- next chapter,
- previous chapter,
- table of contents,
- bookmark,
- search,
- switch reading mode,
- current location.

No pagination control may require precise pointer interaction.

---

# 39. Accessibility: Reduced Motion

Page transitions should respect the OS/application reduced-motion setting.

Possible options:

- no animation,
- subtle fade,
- slide/turn effect.

A decorative page-curl animation must never be required for navigation.

---

# 40. Accessibility: Cognitive Load

Book mode should allow:

- reduced-distraction presentation,
- optional current-paragraph highlighting,
- optional current-sentence highlighting,
- reading progress,
- section-length preview,
- consistent page controls.

Users should be able to disable visual effects.

---

# 41. Page Transition Behavior

Page transitions should be:

- quick,
- predictable,
- cancellable by subsequent input,
- nonblocking.

The app should avoid queueing multiple slow animations if the user presses Next rapidly.

---

# 42. Navigation Debouncing

Rapid page commands should not create corrupted state.

Example:

```text
Right Arrow x 8
```

The application should resolve to the intended later page without:

- dropping focus,
- losing semantic position,
- causing excessive rendering work.

---

# 43. Preloading Adjacent Pages

For perceived responsiveness, the app may pre-render or pre-measure:

- previous page,
- current page,
- next page.

For two-page spread:

- previous spread,
- current spread,
- next spread.

Preloading should be bounded to avoid excessive memory use.

---

# 44. Virtualization

Very large documents may require virtualization.

If used:

- offscreen pages may be unmounted,
- semantic navigation must still work,
- screen-reader access must not be broken,
- reading-position restoration must remain accurate.

Virtualization must be evaluated carefully with assistive technologies.

---

# 45. Pagination Caching

Page layout maps may be cached by layout signature.

Cache invalidation triggers include:

- document content change,
- font metric change,
- page dimension change,
- reader spacing change,
- extension-rendering change.

Stale layout maps must not be reused after source edits.

---

# 46. Incremental Repagination

For editing and large documents, full repagination after every keystroke may be too expensive.

Possible strategy:

```text
changed semantic node
      |
find affected page
      |
repaginate from that point forward
```

This is an optimization, not a correctness requirement.

Correct semantic position is more important than premature optimization.

---

# 47. Editor + Book Preview

In split editing mode, the preview may be paginated.

Requirements:

- editor caret maps to semantic node,
- preview resolves that node to current page,
- typing should not cause constant disruptive page jumps,
- preview may defer aggressive repagination during rapid typing,
- focus must remain in editor.

---

# 48. Stable Preview During Editing

A preview should prioritize orientation.

If the user is typing in a paragraph:

- keep the corresponding preview region visible,
- avoid jumping to a new page on every line wrap,
- repaginate smoothly or after short idle periods where appropriate.

Exact behavior should be validated through usability testing.

---

# 49. Layout Failure Fallback

If pagination cannot safely render a construct:

```text
unsupported complex block
```

the app should:

- preserve source,
- provide a fallback rendering,
- optionally switch that block to a local continuous region,
- avoid crashing the whole document.

---

# 50. Unsupported Extension Blocks

Unknown extension blocks should be treated as atomic layout units when possible.

If too large:

- allow safe splitting only if the extension renderer supports it,
- otherwise use fallback presentation.

---

# 51. Printing vs Book Pagination

Screen pagination and print pagination are separate concerns.

The application should not assume:

```text
screen page == printed page
```

Print/PDF export may use a dedicated print stylesheet and layout engine.

---

# 52. CSS Interaction

Custom reader/document CSS may affect pagination.

The application should:

- detect layout-affecting changes,
- invalidate page cache,
- preserve semantic position,
- allow users to disable problematic CSS.

CSS must not compromise privileged UI.

---

# 53. Font Loading

If custom fonts are supported, pagination should not finalize using fallback font metrics and then silently shift after font load without preserving position.

Possible flow:

```text
load font
measure
paginate
render
```

or:

```text
render fallback
reflow when ready
preserve semantic position
```

---

# 54. Images with Unknown Dimensions

Remote or local images may not have dimensions available immediately.

Pagination should avoid uncontrolled layout shifts.

Possible techniques:

- reserve intrinsic dimensions when known,
- reflow after image load,
- preserve semantic position after reflow.

---

# 55. Page Break Diagnostics

For development and testing, a debug mode may expose:

```text
page boundaries
node IDs
fragment IDs
break reasons
layout measurements
```

This should be a developer feature, not normal user UI.

---

# 56. Performance Targets

Targets should eventually be measured against real hardware.

Suggested quality goals:

- page turn feels immediate,
- no visible multi-second stall for ordinary documents,
- repagination after resize remains responsive,
- large documents can paginate without runaway memory use,
- semantic position restoration remains deterministic.

Exact numeric budgets should live in the dedicated performance document.

---

# 57. Test Fixture Requirements

Pagination tests should include Markdown with:

- thousands of lines,
- long paragraphs,
- very short paragraphs,
- nested headings,
- orphan-prone headings,
- huge code blocks,
- many small code blocks,
- narrow tables,
- very wide tables,
- large images,
- missing images,
- nested lists,
- blockquotes,
- internal links,
- cross-file links,
- Unicode,
- custom CSS,
- accessibility spacing overrides.

---

# 58. Core Pagination Test Cases

## PAGE-001 — Basic single-page navigation

1. Open a long document.
2. Enter single-page mode.
3. Move forward several pages.
4. Move backward.

Expected:

- correct order,
- no lost content,
- stable semantic position.

## PAGE-002 — Responsive spread

1. Open in wide window.
2. Confirm two-page spread.
3. Narrow window.
4. Confirm single-page layout.
5. Widen again.

Expected:

- semantic location preserved throughout.

## PAGE-003 — Large text

1. Navigate to middle of document.
2. Increase font size substantially.

Expected:

- repagination,
- same semantic paragraph remains active.

## PAGE-004 — Code split

1. Open document containing a code block longer than one page.

Expected:

- block spans pages,
- whitespace preserved,
- copy-whole-block remains possible.

## PAGE-005 — Table overflow

1. Open document containing a very wide table.

Expected:

- document width remains usable,
- local table navigation works,
- keyboard access remains intact.

## PAGE-006 — Search return

1. Start on page 30.
2. Search term.
3. Jump to result on page 70.
4. Return to reading position.

Expected:

- original semantic location restored even if layout changed.

## PAGE-007 — Cross-file chapter navigation

1. Open chapter 1.
2. Follow link to chapter 2.
3. Navigate back.

Expected:

- exact semantic location in chapter 1 restored.

## PAGE-008 — External file refresh

1. Navigate to middle of file.
2. Modify file externally near beginning.
3. Reload/reconcile.

Expected:

- semantic position recovered where possible.

---

# 59. Accessibility Test Cases

## PAGE-A11Y-001 — VoiceOver logical order

Test two-page spread with VoiceOver.

Expected:

- reading order follows document semantics,
- not arbitrary left/right DOM container noise.

## PAGE-A11Y-002 — NVDA page turn

Use keyboard to move pages.

Expected:

- no focus loss,
- useful page/context announcement,
- heading navigation still works.

## PAGE-A11Y-003 — Large spacing

Increase line/word/letter/paragraph spacing.

Expected:

- reflow,
- no clipping,
- semantic position preserved.

## PAGE-A11Y-004 — Reduced motion

Enable reduced-motion preference.

Expected:

- page navigation remains fully functional without animated page turn.

---

# 60. User Preferences

Possible persisted preferences:

```text
reading mode
single/spread preference
automatic responsive mode
page margins
content width
font family
font size
line spacing
paragraph spacing
page transition style
reduced motion
show page numbers
show reading progress
show reading time
```

Preferences should be stored in app settings, not Markdown source.

---

# 61. Book Mode Profiles

Possible profiles:

```text
Standard Book
Large Text Book
Reduced Distraction
Screen Reader Optimized
Custom
```

Profiles should adjust defaults, not remove capabilities.

---

# 62. Full-Screen Reading

If full-screen mode is supported:

- exiting must be keyboard accessible,
- focus must remain predictable,
- accessibility tree must remain intact,
- OS accessibility controls must continue functioning.

---

# 63. Current Location Command

Book mode should expose a command such as:

```text
reader.announceCurrentLocation
```

Possible output:

```text
Chapter 4 of 11.
Virtual Memory.
Page 27 of 48.
39 percent through document.
```

Verbosity should be configurable.

---

# 64. Page Number Semantics for Screen Readers

Page numbers are useful but should not dominate announcements.

Default automatic announcements might be concise:

```text
Page 28
```

On-demand detail may provide:

```text
Page 28 of 184.
Virtual Memory.
```

Exact defaults should be user-tested.

---

# 65. Two-Page Spread Semantics

A spread is a visual construct.

Do not force screen readers to understand:

```text
left page container
right page container
```

unless that information is actually useful.

The semantic reading order should remain one continuous document stream.

---

# 66. Layout Direction

Initial product may prioritize left-to-right documents.

The architecture should not unnecessarily prevent future:

- right-to-left page spreads,
- RTL text,
- multilingual layout.

---

# 67. Selection Across Pages

Reader text selection may span page boundaries.

Possible behavior:

- keyboard semantic selection ignores visual page boundaries,
- pointer selection may continue across page transitions where technically feasible,
- copy current section works regardless of page fragmentation.

---

# 68. Annotations

Annotations are not currently a core requirement, but pagination architecture should not make future annotation impossible.

Potential future anchors should be semantic/text-based rather than page-number-only.

---

# 69. Page-Level Metadata

Derived page metadata may include:

```ts
interface PageMetadata {
  pageNumber: number;
  firstNodeId?: string;
  lastNodeId?: string;
  sectionIds: string[];
  wordCount: number;
}
```

This may support:

- progress,
- navigation,
- debugging,
- page summaries.

---

# 70. Page Summary

A future accessibility feature may allow:

```text
Describe this page
```

Potential output:

```text
Page 27.
Section: Virtual Memory.
4 paragraphs.
1 code block.
2 links.
```

This should derive from semantic fragments on the page.

---

# 71. Page Break Priority Model

Potential priority ranking:

```text
1. Never lose content.
2. Preserve semantic order.
3. Preserve accessibility.
4. Preserve code/table meaning.
5. Avoid orphaned headings.
6. Avoid ugly paragraph splits.
7. Preserve decorative book appearance.
```

Visual perfection must not override correctness or accessibility.

---

# 72. Error Recovery

If pagination fails:

```text
fallback -> continuous mode
```

The application should never make the document unreadable because book mode cannot process one construct.

A clear message may explain:

```text
This document contains content that could not be safely paginated.
Continuous reading mode has been enabled.
```

---

# 73. Relationship to Semantic Document Model

Pagination depends on the Semantic Document Model specification.

Key dependencies:

```text
SemanticNode
Section
SemanticPosition
PageFragment
DocumentIdentity
HeadingPath
TextAnchor
```

Pagination must not create a competing document interpretation.

---

# 74. Relationship to Accessibility Specification

Book mode must satisfy the Accessibility Requirements and Verification Matrix.

Particularly relevant requirement families:

```text
ACC-FOC
ACC-NAV
ACC-LV
ACC-PAGE
ACC-SR
ACC-KEY
ACC-MOT
ACC-COG
```

---

# 75. Open Research Questions

1. What page geometry feels best for technical Markdown on desktop?
2. Should responsive spread switching be automatic by default?
3. What minimum page width works across normal and large-text profiles?
4. How should code blocks visually indicate continuation?
5. What is the best strategy for very wide tables?
6. Should table headers repeat visually on each page?
7. How should page-turn announcements work with VoiceOver/NVDA?
8. Should page mode expose physical pages at all to screen readers, or mostly semantic progress?
9. What is the best pagination library/strategy inside Chromium?
10. Should pagination use CSS columns, measured block placement, a custom layout algorithm, or a hybrid?
11. How much content should be pre-rendered around the current page?
12. How should pagination behave while live editing?
13. How should images with late-loading dimensions affect page stability?
14. How should user custom CSS interact with pagination guarantees?
15. What behavior is most comfortable for users with vestibular or cognitive sensitivities?
16. Should page-number jump exist if page numbers are layout-dependent?
17. How should a two-page spread be represented to screen readers?
18. What does a blind user actually want from the concept of a "page"?

---

# 76. Implementation Strategy Candidates

Potential approaches should be researched before commitment.

## Option A — CSS Multi-Column Layout

Advantages:

- browser-native flow,
- relatively simple.

Risks:

- difficult control over semantic page fragments,
- complex accessibility behavior,
- awkward large tables/code blocks,
- hard page-break control.

## Option B — Custom Measured Block Pagination

Flow:

```text
render semantic blocks
measure blocks
assign blocks/fragments to page containers
```

Advantages:

- high control,
- clear semantic mapping,
- custom break rules.

Risks:

- more engineering complexity,
- measurement/reflow cost.

## Option C — Hybrid

Use native flow where practical while maintaining a semantic page map and custom handling for complex blocks.

This may offer the best balance but requires prototyping.

The final choice should be documented in an ADR after accessibility and performance prototypes.

---

# 77. Definition of Done

Book mode should eventually be considered complete when:

- long Markdown documents can be read as pages,
- single and two-page layouts work responsively,
- page turns are keyboard/pointer accessible,
- semantic reading position survives repagination,
- closing/reopening restores location,
- internal/cross-file navigation preserves history,
- headings, paragraphs, tables, images, lists, and code blocks paginate safely,
- low-vision typography changes do not destroy location,
- screen readers retain logical document order,
- reduced-motion preferences are respected,
- continuous mode remains available,
- page-based features do not alter Markdown source.

---

# 78. Core Product Rule

> **Book mode should make Markdown feel like a book without turning Markdown into a different format.**

The visual pages are temporary.

The Markdown remains ordinary Markdown.

The semantic document remains the source of meaning.

The user's place should survive everything else.
