# Accessible Markdown Reader & Editor
# Accessibility Manual Test Scripts

**Document type:** Accessibility QA / validation specification  
**Status:** Working specification  
**Purpose:** Define repeatable manual test procedures for validating accessibility across reader, editor, pagination, search, structural navigation, low-vision settings, keyboard-only operation, and assistive technologies.

---

# 1. Purpose

Automated accessibility testing is necessary but insufficient.

This document defines manual test scripts intended to verify whether users can actually:

- perceive content,
- understand structure,
- maintain orientation,
- operate the application efficiently,
- edit reliably,
- recover from navigation,
- use the same core capabilities regardless of input or assistive technology.

These scripts are designed to be reusable by:

- maintainers,
- contributors,
- QA testers,
- accessibility specialists,
- users participating in usability studies.

Each test should eventually produce a result such as:

```text
PASS
FAIL
BLOCKED
NOT TESTED
```

with notes and environment information.

---

# 2. Test Record Format

Every manual test execution should record:

```text
Test ID:
Date:
Tester:
Platform:
OS version:
App version/commit:
Assistive technology:
AT version:
Browser engine/Electron version:
Input method:
Test file:
Result:
Notes:
Regression issue:
```

---

# 3. Severity of Failures

## Critical

User cannot complete a core task.

Examples:

- screen reader cannot read document text,
- keyboard cannot reach Save,
- focus becomes trapped,
- editor cannot accept/review text,
- reopening loses all reading context.

## High

Task is technically possible but severely inefficient or disorienting.

Examples:

- preview steals focus after every edit,
- search jumps user away with no return path,
- heading levels are not exposed,
- page changes repeatedly reset screen-reader position.

## Medium

Task works but creates friction or ambiguity.

## Low

Minor usability/polish issue with an effective alternative path.

---

# 4. Test Corpus Requirements

Manual tests should use multiple fixture files.

Recommended fixtures:

```text
basic.md
long-4000-lines.md
book/chapter-01.md
book/chapter-02.md
tables.md
images.md
code-heavy.md
accessibility-errors.md
deep-headings.md
unicode.md
custom-css.md
external-change.md
```

The long-document fixtures should contain:

- many headings,
- paragraphs,
- lists,
- links,
- tables,
- images,
- code blocks,
- repeated terms for search testing.

---

# 5. Environment Matrix

## macOS

Primary:

- VoiceOver
- Keyboard-only
- Voice Control
- Zoom / increased contrast / reduced motion

## Windows

Primary:

- NVDA
- Narrator
- Keyboard-only
- Windows High Contrast / Magnifier

Secondary:

- JAWS when available

## Linux

Primary where supported:

- Orca
- Keyboard-only

Secondary:

- high-contrast / large-text desktop configurations

---

# 6. Core Reader Test Scripts

## READ-001 — Open Markdown directly

**Goal:** Verify a Markdown file can be opened as a normal document.

### Steps

1. Associate `.md` files with the application.
2. Close the application.
3. Double-click `basic.md`.

### Expected

- Application launches.
- File opens directly.
- Rendered reading mode is active by default unless user preference overrides it.
- Focus lands somewhere useful and predictable.
- User is not required to enter edit mode.

### Fail if

- file opens blank,
- user lands in raw source unexpectedly,
- focus is lost,
- file association launches but does not open the file.

---

## READ-002 — Rendered reader only

### Steps

1. Open `basic.md`.
2. Inspect the document visually and with assistive technology.

### Expected

- Markdown punctuation is not exposed as the default visible reading representation.
- Headings, paragraphs, lists, links, tables, images, and code are rendered semantically.
- User can read without opening an editor.

---

## READ-003 — Reader remains interactive

### Steps

1. Open rendered mode.
2. Search for text.
3. Follow a link.
4. Copy a paragraph.
5. Open the outline.
6. Create a bookmark.

### Expected

All actions work without entering edit mode.

---

# 7. Persistent Reading Position Scripts

## POS-001 — Reopen exact location

### Steps

1. Open `long-4000-lines.md`.
2. Navigate to:
   - heading: `Virtual Memory`
   - paragraph 6
3. Close the application.
4. Reopen the same file.

### Expected

- Application restores the same semantic paragraph or nearest valid anchor.
- User is not returned to document start.
- Screen reader context is useful.
- Position restoration does not rely only on old pixel offset.

---

## POS-002 — Font resize preservation

### Steps

1. Navigate to the middle of a long document.
2. Increase font size substantially.

### Expected

- document reflows,
- page count may change,
- semantic location stays anchored to the same content.

---

## POS-003 — Window resize preservation

1. Navigate to a specific paragraph.
2. Resize the window from wide to narrow.
3. Resize back to wide.

### Expected

Same semantic location remains active.

---

## POS-004 — Reader/editor mode switching

1. Navigate to a paragraph in reader.
2. Enter editor.
3. Return to reader.

### Expected

Reader returns to the corresponding semantic location.

---

## POS-005 — Search-return position

1. Begin at a known paragraph.
2. Search for a distant term.
3. Open a result.
4. Invoke Return to Reading Position.

### Expected

Original semantic position is restored.

---

## POS-006 — Link-return position

1. Navigate to a paragraph.
2. Follow an internal or cross-file link.
3. Navigate Back.

### Expected

Exact prior semantic location is restored.

---

## POS-007 — Position after external file change

1. Navigate to middle of document.
2. Modify earlier content externally.
3. Reload/reconcile.

### Expected

App attempts semantic recovery.
If exact anchor is unavailable, fallback is understandable and near the prior location.

---

# 8. Book Mode / Pagination Scripts

## BOOK-001 — Single-page mode

1. Open long document.
2. Switch to single-page mode.
3. Navigate forward 5 pages.
4. Navigate back 2 pages.

### Expected

- order is correct,
- no missing content,
- current semantic location remains valid.

---

## BOOK-002 — Two-page spread

1. Widen application.
2. Enable spread mode.

### Expected

- earlier page appears before later page,
- logical reading order remains correct,
- screen-reader order is not confused by visual columns.

---

## BOOK-003 — Responsive change

1. Start in two-page spread.
2. Narrow window until only one page fits.

### Expected

- app moves to one page or equivalent responsive layout,
- current semantic content remains visible.

---

## BOOK-004 — Large text repagination

1. Navigate to page near middle of document.
2. Increase text size significantly.

### Expected

- pages are recalculated,
- reader remains at same semantic location,
- no clipping or overlapping content.

---

## BOOK-005 — Reduced motion

1. Enable OS reduced-motion setting.
2. Turn pages.

### Expected

- page navigation works without required page-turn animation,
- no disorienting motion.

---

## BOOK-006 — Long code block

1. Open code-heavy file.
2. Navigate to code block larger than one page.

### Expected

- code continues across pages safely,
- whitespace preserved,
- copy-whole-block still works.

---

## BOOK-007 — Wide table

1. Open table wider than page.

### Expected

- document does not become globally unusable,
- table remains keyboard accessible,
- local horizontal navigation does not trap focus.

---

# 9. VoiceOver Reader Scripts

## VO-READ-001 — Start reading

1. Enable VoiceOver.
2. Open `basic.md`.
3. Navigate into document content.

### Expected

- content region is discoverable,
- heading semantics are announced,
- paragraphs are readable in logical order.

---

## VO-READ-002 — Heading navigation

1. Use VoiceOver heading navigation.

### Expected

- all rendered Markdown headings are available,
- levels are correct,
- order matches source hierarchy.

---

## VO-READ-003 — Links

Navigate links using VoiceOver.

### Expected

- link role is announced,
- useful link text is available,
- local and external links activate predictably.

---

## VO-READ-004 — Section overview

1. Navigate to a heading.
2. Invoke section summary.

### Expected

Summary announces useful structure such as:

```text
heading level
paragraph count
subheading count
tables
images
links
code blocks
estimated length
```

User position does not move.

---

## VO-READ-005 — Repeat sentence

1. Navigate to a sentence.
2. Invoke Repeat Sentence.

### Expected

- current sentence is repeated,
- user does not need to relocate cursor manually,
- reading position remains stable.

---

## VO-READ-006 — Repeat paragraph

Same pattern as sentence.

---

## VO-READ-007 — Current location

Invoke current-location command.

### Expected

Useful output such as:

```text
Chapter 3.
Virtual Memory.
Paragraph 4 of 11.
42 percent through document.
```

Exact verbosity may vary by settings.

---

## VO-READ-008 — Copy paragraph

1. Navigate to paragraph.
2. Invoke Copy Current Paragraph.

### Expected

- text copied,
- no switch to editor,
- optional concise confirmation,
- position unchanged.

---

# 10. NVDA Reader Scripts

Repeat equivalent VoiceOver workflows with NVDA.

## NVDA-READ-001 — Browse document
## NVDA-READ-002 — Heading navigation
## NVDA-READ-003 — Link navigation
## NVDA-READ-004 — Section summary
## NVDA-READ-005 — Repeat sentence
## NVDA-READ-006 — Repeat paragraph
## NVDA-READ-007 — Current location
## NVDA-READ-008 — Copy current paragraph

Special attention:

- browse mode,
- focus mode,
- interaction with Electron/Chromium,
- duplicate announcements,
- unexpected live-region noise.

---

# 11. Narrator Reader Scripts

Repeat core Windows reader tests using Narrator.

Focus on:

- heading exposure,
- focus movement,
- search results,
- page turns,
- reader controls.

---

# 12. Orca Reader Scripts

Repeat Linux reader workflows.

Confirm:

- document landmarks,
- headings,
- links,
- table semantics,
- keyboard operations,
- no Chromium/AT-SPI breakage.

---

# 13. Raw Editor Screen Reader Scripts

## EDIT-SR-001 — Type normal prose

1. Enable screen reader.
2. Enter raw editor.
3. Type several sentences.

### Expected

- text entry is reliable,
- screen reader echo behaves according to user/AT settings,
- no duplicate app-generated echo.

---

## EDIT-SR-002 — Character review

Navigate entered text character by character.

### Expected

Correct text can be reviewed.

---

## EDIT-SR-003 — Word review

Navigate word by word.

### Expected

Reliable word navigation.

---

## EDIT-SR-004 — Paragraph review

Navigate paragraph by paragraph.

### Expected

Paragraph boundaries remain meaningful.

---

## EDIT-SR-005 — Structural context

Place caret in:

- heading,
- paragraph,
- list,
- link,
- code block.

Invoke structural-context command.

### Expected

Current structure is correctly announced.

---

## EDIT-SR-006 — Heading level

Place caret in H3.

### Expected

User can determine that current heading is level 3.

---

## EDIT-SR-007 — Live preview stability

1. Use split view.
2. Type continuously for 20–30 seconds.

### Expected

- focus remains in editor,
- screen-reader review is not disrupted,
- preview does not steal cursor.

---

## EDIT-SR-008 — Save status

Save document.

### Expected

Save success/failure available nonvisually without forced unrelated focus movement.

---

## EDIT-SR-009 — Undo

1. Make structural or textual edit.
2. Undo.

### Expected

User receives enough feedback to understand what changed.

---

# 14. Structural Editing Scripts

## STRUCT-001 — Select paragraph

1. Place caret in paragraph.
2. Invoke Select Paragraph.

### Expected

Whole semantic paragraph selected.

---

## STRUCT-002 — Copy section

1. Place caret inside section.
2. Invoke Copy Section.

### Expected

Section including nested child content is copied.

---

## STRUCT-003 — Move section down

1. Place caret in section.
2. Invoke Move Section Down.

### Expected

- section moves as one semantic unit,
- nested subsections move with it,
- focus remains logical,
- operation can be undone.

---

## STRUCT-004 — Promote heading

1. Select H3 section.
2. Promote heading.

### Expected

H3 becomes H2 safely.

Screen-reader feedback should identify the change.

---

## STRUCT-005 — Delete list item

Delete structurally.

### Expected

- correct item removed,
- surrounding list remains valid,
- focus moves predictably.

---

# 15. Search Accessibility Scripts

## SEARCH-001 — Basic keyboard search

Without mouse:

1. Open search.
2. Enter query.
3. Navigate next/previous result.
4. Close search.

### Expected

No lost focus or reading context.

---

## SEARCH-002 — Grouped results

Search for term appearing in several sections.

### Expected

Results grouped meaningfully by heading/section.

---

## SEARCH-003 — Result context

Screen reader navigates result list.

### Expected

Each result exposes enough context to distinguish it from other matches.

---

## SEARCH-004 — Search scope

Switch among:

- whole document,
- current section,
- headings,
- code.

### Expected

Scopes are keyboard/screen-reader accessible.

---

## SEARCH-005 — Cross-file search

Search across linked book.

### Expected

Results identify source chapter/file.

---

## SEARCH-006 — Return to origin

Navigate to several results, then Return to Reading Position.

### Expected

Original location restored.

---

# 16. Low-Vision Scripts

## LV-001 — 200%+ text enlargement

Increase text significantly.

### Expected

- content remains available,
- prose reflows,
- no overlapping controls,
- current location preserved.

---

## LV-002 — Line spacing

Increase line spacing substantially.

### Expected

No clipping or overlap.

---

## LV-003 — Character spacing

Increase letter spacing.

### Expected

Text remains readable and layout remains usable.

---

## LV-004 — Word spacing

Increase word spacing.

### Expected

No clipping.

---

## LV-005 — Paragraph spacing

Increase paragraph spacing.

### Expected

No overlap or missing content.

---

## LV-006 — Content width

Set narrow reading measure.

### Expected

Readable document without global horizontal scrolling.

---

## LV-007 — Custom colors

Set custom foreground/background.

### Expected

Text, links, focus, and headings remain distinguishable.

---

## LV-008 — OS high contrast

Enable OS high-contrast mode.

### Expected

- essential UI remains visible,
- focus indicators remain discernible,
- no information disappears.

---

## LV-009 — Magnification + table

Use magnification/zoom and navigate large table.

### Expected

Table remains usable through local navigation.

---

# 17. Keyboard-Only End-to-End Scripts

## KEY-E2E-001 — Reader workflow

Without pointer:

1. Open file.
2. Navigate content.
3. Open outline.
4. Jump to heading.
5. Search.
6. Open result.
7. Return.
8. Follow Markdown link.
9. Back.
10. Copy paragraph.
11. Bookmark location.
12. Switch book mode.
13. Close file.

### Expected

Entire workflow is possible.

---

## KEY-E2E-002 — Editor workflow

Without pointer:

1. Open file.
2. Enter edit mode.
3. Type content.
4. Select paragraph.
5. Move section.
6. Search/replace.
7. Open accessibility findings.
8. Navigate finding.
9. Save.
10. Return to reader.

### Expected

No mouse required.

---

## KEY-E2E-003 — Split view

1. Open split view.
2. Switch between panes.
3. Resize panes using non-drag control.

### Expected

Full keyboard support.

---

# 18. Motor Accessibility Scripts

## MOT-001 — No drag dependency

Test:

- pane resize,
- section move,
- page navigation,
- bookmark movement if relevant.

### Expected

Each drag action has a keyboard or discrete-control alternative.

---

## MOT-002 — Pointer target size

Inspect key controls:

- next/previous page,
- close,
- search,
- mode switch,
- bookmark.

### Expected

Targets are large enough to activate reliably.

---

## MOT-003 — Swipe equivalence

Use swipe to page-turn, then perform same action by keyboard/button.

### Expected

Equivalent functionality.

---

# 19. Cognitive / Orientation Scripts

## COG-001 — Current paragraph focus

Enable paragraph focus mode.

### Expected

Current paragraph is emphasized without hiding essential context unless user chose that behavior.

---

## COG-002 — Reduced-distraction mode

Enable reduced-distraction presentation.

### Expected

Nonessential chrome decreases, but core navigation remains available.

---

## COG-003 — Section length preview

Request upcoming section summary.

### Expected

User receives useful workload/context information without entering section.

---

## COG-004 — No surprise movement

Perform:

- theme change,
- font change,
- panel open/close,
- search,
- preview update.

### Expected

No unexpected reading-position jumps.

---

# 20. Tables Screen Reader Scripts

## TABLE-SR-001 — Header association

Navigate through table.

### Expected

Screen reader can identify relevant row/column headers.

---

## TABLE-SR-002 — Empty header

Test intentionally problematic fixture.

### Expected

Editor accessibility checker identifies issue.

---

## TABLE-SR-003 — Wide table

Navigate horizontally/vertically.

### Expected

No focus trap; context remains understandable.

---

# 21. Image Scripts

## IMG-SR-001 — Meaningful alt text

Screen reader reaches image.

### Expected

Useful alt text announced.

---

## IMG-SR-002 — Decorative image

Test empty-alt decorative image.

### Expected

Image does not create unnecessary verbal noise.

---

## IMG-AUTH-001 — Missing alt diagnostic

Open editor accessibility panel.

### Expected

Missing/invalid alt issue is reported with source location and explanation.

---

# 22. Code Block Scripts

## CODE-SR-001 — Identify block

Navigate to code block.

### Expected

User knows a code block begins.

---

## CODE-SR-002 — Language context

If language known:

### Expected

Language is available on request or announced according to verbosity.

---

## CODE-COPY-001 — Copy whole block

From reader mode:

### Expected

Whole code block copies without entering editor.

---

# 23. Accessibility Findings Scripts

## A11Y-FIND-001 — Navigate findings

1. Open `accessibility-errors.md`.
2. Open accessibility panel.
3. Navigate findings by keyboard.

### Expected

Every finding is reachable.

---

## A11Y-FIND-002 — Screen reader finding detail

Open a finding.

### Expected

User gets:

- severity,
- issue,
- location,
- reason,
- remediation.

---

## A11Y-FIND-003 — Jump to source

Activate finding.

### Expected

Editor moves to relevant source location without losing ability to return to findings.

---

## A11Y-FIND-004 — Ignore finding

Ignore one advisory.

### Expected

State is clear; document source unchanged.

---

## A11Y-FIND-005 — No false certification

Resolve all automated findings.

### Expected

Application does not claim definitive WCAG compliance.

---

# 24. Dialog and Modal Scripts

## UI-A11Y-001 — Open dialog

Open settings dialog.

### Expected

- dialog announced,
- focus moves inside,
- dialog name available.

---

## UI-A11Y-002 — Close dialog

Close with Escape.

### Expected

Focus returns to logical invoking context.

---

## UI-A11Y-003 — Error dialog

Trigger safe test error.

### Expected

Error is announced and recovery path is clear.

---

# 25. Custom CSS Scripts

## CSS-A11Y-001 — Disable bad theme

Load intentionally low-contrast CSS.

### Expected

User can disable document CSS and recover readability.

---

## CSS-A11Y-002 — Focus override protection

Load CSS that attempts to hide focus.

### Expected

Application's privileged UI focus remains visible/protected.

---

## CSS-A11Y-003 — Reflow after CSS change

Change layout-affecting CSS.

### Expected

Pagination updates while preserving semantic position.

---

# 26. External Change Scripts

## EXT-001 — Reader file update

1. Open file in reader.
2. Modify earlier paragraph externally.
3. Refresh.

### Expected

Current reading position recovered semantically where possible.

---

## EXT-002 — Editor conflict

1. Open file in editor.
2. Make unsaved edit.
3. Modify same file externally.

### Expected

User receives accessible conflict warning.
No source silently overwritten.

---

# 27. Multi-File Book Scripts

## BOOK-XF-001 — Chapter forward

Follow next-chapter link.

### Expected

Target chapter opens internally.

---

## BOOK-XF-002 — Chapter anchor

Follow link to heading in another file.

### Expected

Correct heading reached.

---

## BOOK-XF-003 — Back history

Return to previous chapter location.

### Expected

Exact prior semantic position.

---

## BOOK-XF-004 — Cross-file bookmark

Create bookmark in chapter 2, close book, reopen bookmark.

### Expected

Correct chapter and semantic position restored.

---

# 28. Voice Control Scripts

## VOICE-001 — Next heading

Speak configured command.

### Expected

Same semantic command as keyboard navigation executes.

---

## VOICE-002 — Copy paragraph

Speak command.

### Expected

Current paragraph copies without simulated pointer selection.

---

## VOICE-003 — Move section

Speak command in editor.

### Expected

Semantic section move occurs and can be undone.

---

# 29. Reduced Motion Scripts

## RM-001 — Page turn

Enable reduced motion.

### Expected

No required page-curl/slide effect.

---

## RM-002 — Panel transitions

### Expected

Panels remain usable without motion-heavy animation.

---

# 30. Performance Accessibility Scripts

## PERF-A11Y-001 — Long document screen-reader responsiveness

Open 10,000-line Markdown file.

### Expected

- navigation remains responsive,
- AT announcements do not lag by several seconds,
- app remains usable.

---

## PERF-A11Y-002 — Live preview typing

Type continuously in large file.

### Expected

- input remains responsive,
- screen reader does not fall behind badly,
- preview does not steal focus.

---

# 31. Regression Test Template

Whenever an accessibility defect is fixed, add a manual regression entry:

```text
REG-A11Y-###
Issue:
Affected platform:
Affected AT:
Original failure:
Steps:
Expected:
Automated coverage:
Manual retest required:
```

---

# 32. Release Smoke Test

Before release, at minimum perform:

## macOS

- VoiceOver basic reader
- VoiceOver raw editor
- keyboard-only reader
- keyboard-only editor
- large text/reflow
- reduced motion

## Windows

- NVDA basic reader
- NVDA raw editor
- Narrator smoke test
- keyboard-only reader/editor
- high contrast

## Linux

When supported:

- Orca reader smoke test
- keyboard-only workflow

---

# 33. Accessibility Release Blockers

Release should be blocked for issues such as:

- document text inaccessible to primary screen reader,
- editor cannot reliably accept/review text,
- Save unavailable by keyboard,
- focus trap in core workflow,
- live preview repeatedly steals focus,
- semantic reading position consistently lost,
- page mode breaks screen-reader order,
- high zoom clips core prose,
- critical error unavailable nonvisually.

---

# 34. User Testing Sessions

Engineering tests cannot substitute for lived experience.

Recruit users when possible from groups including:

- blind screen-reader users,
- low-vision users,
- keyboard-only users,
- users with limited fine-motor control,
- users relying on voice input,
- users with dyslexia/reading difficulties,
- users who regularly read large technical documents.

Observe:

- where users hesitate,
- where they become disoriented,
- what they expect commands to do,
- what announcements are excessive,
- what information they request but the app does not provide.

---

# 35. User Testing Prompts

Avoid leading prompts.

Prefer tasks:

```text
Find the section that explains virtual memory.

Read the first paragraph and then inspect the table later in the section.

Return to where you were.

Close the document and reopen it.

Copy the paragraph you just read.

Move the Installation section below Requirements.

Find all accessibility problems in this document.
```

Observe how the user approaches the task naturally.

---

# 36. Metrics Worth Recording

For usability studies:

- task completion,
- time to completion,
- navigation errors,
- focus-loss events,
- number of backtracks,
- number of commands required,
- user-reported confidence,
- user-reported orientation,
- verbosity complaints,
- accessibility blockers.

Do not optimize solely for speed; confidence and orientation matter.

---

# 37. Guiding Test Principle

Every accessibility feature should answer:

```text
Can the user perform the task?
Can the user understand where they are?
Can the user understand what changed?
Can the user recover if they navigate away?
Can the user perform it efficiently enough to be practical?
```

A feature is not truly accessible merely because it is technically reachable.

---

# 38. Definition of Done for Manual Accessibility Validation

The test suite should eventually be considered mature when:

- every major reader workflow has keyboard-only tests,
- every major editor workflow has keyboard-only tests,
- primary screen readers have repeatable scripts,
- book mode has dedicated accessibility tests,
- semantic-position restoration is covered,
- low-vision/reflow scenarios are covered,
- structural editing is covered,
- accessibility findings are covered,
- multi-file books are covered,
- regression cases are added after defects,
- release smoke tests are documented,
- real-user testing supplements engineering validation.

---

# 39. Core Rule

> **The purpose of testing is not to prove that an accessibility API exists. It is to prove that a person can use the product effectively.**
