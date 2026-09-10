# SensibleMD Dogfooding Bugs and UX Backlog

**Status:** Active  
**Source:** Direct dogfooding observations from packaged SensibleMD builds  
**Purpose:** Preserve raw user-observed problems, then convert them into structured engineering work with reproducible acceptance criteria.

---

## Severity

| Priority | Meaning |
|---|---|
| **P0** | Release blocker; core advertised behavior is broken or untrustworthy. |
| **P1** | Major workflow, usability, accessibility, or state-management problem. |
| **P2** | Important quality/polish issue for a stable public release. |
| **P3** | Useful enhancement, but not required for basic trustworthiness. |

---

## DOG-001 — Close Current File / No-Document State

**Priority:** P1  
**Category:** Application lifecycle / UX / State

### Observed
Once a Markdown file is opened, that file is effectively always "on." There is no clear way to close the document while keeping SensibleMD open.

### Expected
The user should be able to close the current document without quitting the application.

SensibleMD should have an explicit no-document state, for example:

```text
SensibleMD

Open a Markdown file

Recent Documents
────────────────
README.md
architecture.md
notes.md

[ Open File ]
```

This can later become the natural entry point for Recent Documents, Library, favorites/pins, and folder authorization.

### Acceptance criteria
- User can close the active document without quitting SensibleMD.
- Unsaved work is protected before close.
- Application remains usable with no document open.
- Opening another Markdown file works normally.
- Recovery/reader state is not corrupted.
- Native menu and keyboard behavior match the current platform.

---

## DOG-002 — Authoring Checks Should Be Optional

**Priority:** P2  
**Category:** Authoring UX / Preferences / Accessibility

### Observed
Authoring checks are always visible in Write and Split modes.

### Expected
The user should be able to show or hide authoring diagnostics.

### Acceptance criteria
- Diagnostics can be toggled on/off.
- Toggling does not modify document contents.
- Preference persists if intended.
- Showing/hiding does not steal or lose keyboard focus.
- Diagnostics do not create perceptible typing latency.

---

## DOG-003 — Raw Markdown Pane Is Not Properly Scrollable

**Priority:** P1  
**Category:** Editor UX / Accessibility / Input

### Observed
In Write and Split modes, the raw Markdown pane is not properly scrollable/moveable.

### Expected
The Markdown editor should behave like a normal desktop text editor.

### Acceptance criteria
- Mouse wheel scrolling works.
- Trackpad scrolling works.
- Keyboard scrolling/navigation works.
- Long Markdown files remain fully reachable.
- Split mode leaves both editor and preview usable.
- No focus traps occur.

---

## DOG-004 — Syntax Highlighting

**Priority:** P3  
**Category:** Authoring UX / Readability

### Observed
Raw Markdown editing currently lacks syntax highlighting.

### Expected
Common Markdown syntax should be visually distinguishable without changing the underlying source.

### Acceptance criteria
- Highlight headings, links, emphasis, code, lists, etc.
- Works in supported themes.
- Meets contrast requirements.
- Does not introduce noticeable typing lag.
- Plain editing remains functional if highlighting fails.

---

## DOG-005 — Content Width Control Appears Nonfunctional

**Priority:** P2  
**Category:** Reader preferences / HCI

### Observed
Font size and line spacing work, but Content Width appears to do nothing.

### Expected
Changing Content Width should produce an immediate visible change in the reading surface.

### Acceptance criteria
- Width visibly changes.
- Change behaves correctly in supported reader modes.
- Semantic reading position survives reflow.
- Preference persists if intended.
- Control is not shown as functional if the feature is not implemented.

---

## DOG-006 — Reduce Motion Has No Observable Effect

**Priority:** P2  
**Category:** Accessibility / Preferences / HCI

### Observed
The Reduce Motion checkbox changes state, but it is unclear whether it actually changes application behavior.

### Expected
Reduce Motion must have a defined behavioral contract.

### Acceptance criteria
- Identify which animations/transitions are affected.
- Enabling it produces observable reduced-motion behavior where motion exists.
- Respect OS-level reduced-motion preferences where practical.
- Preference persists if intended.
- If there is no motion to reduce, the UI must not misleadingly imply otherwise.

---

## DOG-007 — Transient Controls Do Not Dismiss Naturally

**Priority:** P1  
**Category:** HCI / Focus / Interaction model

### Observed
Folder/download/save filters, command controls, and search UI often require manual closing.

For search, the user may have to delete entered text rather than simply dismissing the search interface.

### Expected
Transient UI should follow predictable desktop behavior.

Appropriate dismissal methods include:
- `Escape`
- click outside
- activate trigger again
- choose an option
- change relevant context

Search query state and search UI visibility should be separate concepts.

### Acceptance criteria
- `Escape` dismisses applicable transient UI.
- Click-away works where appropriate.
- Trigger controls can close their own UI.
- Closing search does not require erasing the query.
- Focus returns somewhere sensible.
- Dismissal behavior is consistent throughout the app.

---

## DOG-008 — Pagination Is Still Incorrect

**Priority:** P0  
**Category:** Core reader behavior / Pagination / Navigation

### Observed
Pagination is still not functioning reliably.

### Expected
Single-page and spread modes must paginate correctly and predictably.

### Acceptance criteria
- Page boundaries are stable for a given layout.
- Page count updates correctly after font, spacing, width, or viewport changes.
- Semantic reading location survives repagination.
- No unexpected page jumps.
- Outline/search/navigation resolve to the correct page.
- Stale pagination state cannot overwrite the user's current position.

---

## DOG-009 — Better Page Navigation Controls

**Priority:** P2  
**Category:** Pagination UX / Navigation

### Observed
The bottom-right page mover can move page by page and jump to the end, but the interaction is not intuitive.

### Expected
Use a familiar first/previous/next/last pattern.

```text
|<<| |<|   Page 17 of 84   |>| |>>|
```

Meaning:

```text
<<  first page
<   previous page
>   next page
>>  last page
```

### Acceptance criteria
- First/Previous/Next/Last all work.
- Boundary controls disable correctly.
- Controls have accessible names.
- Current page and total page count are obvious.
- Keyboard operation works.
- Consider direct page-number entry for large documents.

---

## DOG-010 — Outline Should Track and Highlight Current Section

**Priority:** P1  
**Category:** Reader navigation / Orientation / Accessibility

### Observed
The outline does not consistently follow the reader or highlight the current section.

### Expected
The outline should remain synchronized with semantic reading location.

### Acceptance criteria
- Current section is visually highlighted.
- Scroll updates active outline section.
- Page and spread navigation update it.
- Search jumps update it.
- Outline tracking does not create feedback loops or scroll jitter.
- Active state is not communicated by color alone.

---

## DOG-011 — Page Controls Can Jump Back to Initial Page

**Priority:** P0  
**Category:** Pagination / State synchronization / Navigation

### Observed
In Page or Spread mode, clicking page controls several times can suddenly jump back to the page where that view originally opened.

### Expected
The user's current page/location must remain authoritative.

### Likely concern
Multiple systems may independently own document position:

```text
semantic reading position
pagination index
current page
active heading
outline location
mode-entry position
```

### Acceptance criteria
- Repeated navigation never jumps to stale entry state.
- Switching page/spread preserves semantic location.
- Re-rendering does not reset to stale state.
- Outline synchronization cannot overwrite current pagination state.
- Restoration occurs only when explicitly restoring/entering document state.

---

## DOG-012 — Outline Navigation Is Inconsistent Across Modes

**Priority:** P1  
**Category:** Navigation / UX consistency

### Observed
Outline heading navigation works in Page/Spread mode but not properly in Scroll, Write, or Split mode.

### Expected
Clicking a heading should always mean:

> **Take me to this section.**

Per mode:

- **Read/Scroll:** move rendered reader to heading.
- **Page/Spread:** move to page containing heading.
- **Write:** move editor viewport/cursor to heading.
- **Split:** move editor and preview to corresponding section.

### Acceptance criteria
- Outline navigation works in every supported mode.
- Current mode remains unchanged unless explicitly changed by the user.
- Destination is semantically correct.
- Active outline state updates.
- Navigation history records the meaningful destination.

---

## DOG-013 — Outline Click Forces Write/Split Into Reader Mode

**Priority:** P1  
**Category:** Navigation / Mode state / HCI

### Observed
Clicking an outline heading while in Write or Split mode exits that mode and returns to the last Reader mode.

### Expected
Outline navigation should preserve the user's current mode.

### Acceptance criteria
- Write remains Write.
- Split remains Split.
- Editor moves to selected heading.
- Split preview remains synchronized.
- Unsaved editor state is preserved.
- Mode changes occur only through explicit user action.

---

## DOG-014 — Scroll View Needs More Edge Padding

**Priority:** P2  
**Category:** Reader typography / Visual comfort / HCI

### Observed
In Scroll mode, rendered text is too close to the outline border/window edge.

### Expected
The reading surface should have comfortable breathing room around the content.

### Acceptance criteria
- Intentional left/right padding exists.
- Padding remains sensible across common window sizes.
- Narrow layouts do not waste excessive space.
- Content Width interacts predictably with outer padding.
- Zoom/text scaling does not cause text to touch container edges.

---

# Shared Architectural Investigation

The following issues may share one underlying navigation/state problem:

- DOG-008 — Pagination incorrect
- DOG-010 — Outline not tracking current section
- DOG-011 — Page navigation jumps back
- DOG-012 — Outline inconsistent across modes
- DOG-013 — Outline forces mode change

These should not automatically be patched independently.

Investigate whether multiple components maintain competing sources of truth for document location.

Desired direction:

```text
Semantic reading position
          ↓
authoritative navigation state
          ↓
 ┌────────┼─────────┬─────────┐
scroll    page     spread    editor
          ↓
     active section
          ↓
        outline
```

The visible layout should derive from the user's semantic location rather than each view independently maintaining conflicting state.

---

# Suggested Triage Order

## P0 — Core correctness

1. DOG-011 — Page controls jump back to original page
2. DOG-008 — Pagination correctness

## P1 — Workflow coherence

3. DOG-003 — Editor scrolling
4. DOG-012 — Outline navigation across modes
5. DOG-013 — Preserve Write/Split during outline navigation
6. DOG-010 — Active outline synchronization
7. DOG-001 — Close document / no-document state
8. DOG-007 — Predictable transient UI dismissal

## P2 — Preference and usability correctness

9. DOG-005 — Content Width
10. DOG-006 — Reduce Motion
11. DOG-002 — Optional authoring checks
12. DOG-009 — Better pagination controls
13. DOG-014 — Reader edge padding

## P3 — Enhancement

14. DOG-004 — Syntax highlighting

---

# Dogfooding Capture Rule

Preserve raw observations before translating them into implementation language.

For example:

> "you click the buttons a couple of times and you are jumped back to the page that view opened on"

is valuable because it records what the user actually experienced without assuming a cause.

Recommended structure:

```text
docs/
└── dogfooding/
    ├── DOGFOODING_BUGS.md
    └── sessions/
        ├── 2026-09-05.md
        └── ...
```

---

# Definition of Done

An issue is not resolved merely because code changed.

For each dogfooding issue:

1. Reproduce the original behavior.
2. Record the actual cause.
3. Implement the smallest coherent fix.
4. Add automated regression coverage where practical.
5. Test manually in the packaged desktop app.
6. Test keyboard behavior.
7. Test accessibility implications.
8. Test interactions with other modes.
9. Test restart/persistence where relevant.
10. Record resolution evidence.

For cross-platform behavior, verify each officially supported OS before calling an issue globally resolved.

---

# Product Principle

> **SensibleMD remembers the document and the reader's place so the user does not have to.**

The application should become predictable enough that the user stops thinking about navigation mechanics and simply reads.
