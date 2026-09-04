# Accessible Markdown Reader & Editor
# Accessibility Requirements and Verification Matrix

**Document type:** End-state engineering specification  
**Status:** Working specification  
**Scope:** Desktop Markdown reader/editor, including rendered reading, raw and rendered editing, book/pagination modes, linked Markdown documents, assistive navigation, and accessibility-aware authoring.

---

## 1. Purpose

This document defines the accessibility quality bar for the Accessible Markdown Reader & Editor.

It is deliberately stricter than a checklist that merely asks whether an application can be operated by a screen reader. The product goal is **effective and efficient access to the same core capabilities for users with disabilities**, including users who are blind, have low vision, use only a keyboard, use voice or switch-style input, have limited fine-motor control, or benefit from reduced cognitive/visual load.

The requirements in this document are intended to become:

- design constraints,
- implementation requirements,
- manual test cases,
- automated-test candidates,
- regression-test cases,
- contributor guidance,
- release criteria.

This document treats WCAG 2.2 as an important baseline, not as the complete definition of desktop accessibility. Electron renders HTML through Chromium, so WCAG and WAI-ARIA remain highly relevant; however, the finished application must also be tested against real operating-system accessibility stacks and assistive technologies.

---

## 2. Accessibility Philosophy

### 2.1 Equal capability

Accessibility must not mean a reduced version of the application.

A user who relies on VoiceOver, NVDA, Narrator, JAWS, Orca, keyboard-only interaction, voice control, magnification, or alternative input should be able to perform the same meaningful reader and editor operations as other users whenever technically possible.

### 2.2 Semantic over visual

When the visual interface conveys structure such as:

- heading hierarchy,
- current paragraph,
- table relationships,
- list nesting,
- code-block boundaries,
- document progress,
- current page,
- current section,
- search-result context,

an equivalent programmatic representation must be available.

### 2.3 Never make the user rediscover context unnecessarily

The application should avoid unexpected:

- focus movement,
- scroll jumps,
- page jumps,
- reading-position resets,
- cursor relocation,
- mode changes,
- pane changes.

### 2.4 Multiple interaction paths

Important functions should be available through more than one interaction mechanism where practical:

- keyboard,
- pointer,
- accessible control,
- menu,
- screen reader,
- semantic command API,
- future voice commands.

### 2.5 Overview before traversal

A sighted reader can often understand a document's shape with a glance. A nonvisual user should be able to request comparable structural information without traversing every item serially.

### 2.6 Configurable verbosity

More speech is not automatically more accessible.

Announcements, section previews, status updates, and reading assistance should provide useful defaults while allowing users to reduce or increase verbosity.

---

# 3. Standards and Technical References

The following references should guide implementation and testing.

## 3.1 WCAG 2.2

Primary standard:

https://www.w3.org/TR/WCAG22/

Particularly relevant areas include:

- 1.1 Text Alternatives
- 1.3 Adaptable
- 1.4 Distinguishable
- 2.1 Keyboard Accessible
- 2.2 Enough Time
- 2.3 Seizures and Physical Reactions
- 2.4 Navigable
- 2.5 Input Modalities
- 3.1 Readable
- 3.2 Predictable
- 3.3 Input Assistance
- 4.1 Compatible

WCAG 2.2 Understanding documents:

https://www.w3.org/WAI/WCAG22/understanding/

## 3.2 WAI-ARIA

https://www.w3.org/WAI/standards-guidelines/aria/

ARIA should supplement correct HTML semantics, not replace them unnecessarily.

## 3.3 ARIA Authoring Practices Guide

https://www.w3.org/WAI/ARIA/apg/

Keyboard interface guidance:

https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/

The APG is guidance rather than a normative standard, but established keyboard conventions should generally be treated as strong requirements unless usability testing demonstrates a better accessible alternative.

## 3.4 Electron Accessibility

https://www.electronjs.org/docs/latest/tutorial/accessibility

Electron applications inherit many accessibility concerns from web applications because renderer content is HTML/Chromium-based. Electron exposes Chromium's accessibility tree to assistive technology when accessibility support is active.

## 3.5 Apple Accessibility / VoiceOver

https://developer.apple.com/documentation/accessibility/voiceover

VoiceOver evaluation criteria:

https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voiceover-evaluation-criteria

Apple emphasizes that visible interactive behavior should have an equivalent VoiceOver path, that visible text must be exposed, and that VoiceOver navigation/grouping should be complete and logically ordered.

## 3.6 Linux / Orca / AT-SPI

Orca:

https://help.gnome.org/orca/introduction.html

AT-SPI:

https://gnome.pages.gitlab.gnome.org/at-spi2-core/

Orca interacts with applications through AT-SPI-compatible accessibility information exposed by toolkits including Chromium.

---

# 4. Conformance Target

The application should be designed to meet or exceed **WCAG 2.2 Level AA principles** for all renderer-based application interfaces where WCAG is applicable.

This statement is an engineering target, not a legal certification.

Desktop accessibility also requires:

- platform-native testing,
- assistive-technology testing,
- interaction testing,
- accessibility-tree inspection,
- real-user feedback.

No release should be called "accessible" solely because an automated scanner reports zero violations.

---

# 5. Assistive Technology Test Matrix

The project should maintain test coverage for the following combinations where practical.

| Platform | Assistive technology | Required level |
|---|---|---|
| macOS | VoiceOver | Primary |
| macOS | Keyboard-only | Primary |
| macOS | Voice Control | Secondary/manual |
| macOS | Zoom / high contrast / increased text | Primary |
| Windows | NVDA | Primary |
| Windows | Narrator | Primary |
| Windows | JAWS | Secondary when available |
| Windows | Keyboard-only | Primary |
| Windows | High Contrast / magnification | Primary |
| Linux | Orca | Primary when supported environment available |
| Linux | Keyboard-only | Primary |
| Linux | High contrast / large text | Secondary |

"Primary" means a release should not knowingly ship a severe regression in that configuration.

---

# 6. Severity Model

Accessibility defects should be classified separately from general UI defects.

## Critical

A user cannot perform a core operation.

Examples:

- editor cannot receive screen-reader text input,
- document cannot be read nonvisually,
- keyboard focus becomes permanently trapped,
- Save cannot be triggered without a mouse,
- application loses access to an entire document region.

## High

Core capability exists but is severely inefficient, confusing, or unreliable.

Examples:

- focus frequently jumps after preview updates,
- reading position is lost after changing text size,
- table cells are exposed without header relationships,
- search results are reachable but lack usable context.

## Medium

Function is usable but creates unnecessary friction or ambiguity.

Examples:

- status message not announced,
- section progress unavailable to screen reader,
- shortcut is not discoverable.

## Low

Polish/accessibility enhancement with a viable equivalent path already available.

---

# 7. Core Semantic Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-SEM-001 | Rendered headings must be exposed programmatically as headings with correct levels. | Accessibility tree inspection + VoiceOver/NVDA navigation |
| ACC-SEM-002 | Paragraph text must remain readable as text rather than being exposed as unlabeled generic containers. | AT manual test |
| ACC-SEM-003 | Lists must expose list and list-item structure. | Accessibility tree + AT |
| ACC-SEM-004 | Nested lists must preserve nesting relationships. | AT manual test |
| ACC-SEM-005 | Links must expose link role, accessible name, and destination behavior. | Automated + AT |
| ACC-SEM-006 | Images must expose meaningful alternative text when supplied by the document. | Automated + AT |
| ACC-SEM-007 | Tables must expose row/cell/header relationships. | AT table-navigation test |
| ACC-SEM-008 | Code blocks must be programmatically identifiable as code regions or otherwise have clear accessible context. | AT manual test |
| ACC-SEM-009 | Fenced-code language should be exposed when known without forcing repetitive announcements. | AT manual test |
| ACC-SEM-010 | Blockquotes must preserve their semantic distinction where supported. | Accessibility tree |
| ACC-SEM-011 | Document title and primary content region must be programmatically identifiable. | Accessibility tree |
| ACC-SEM-012 | Reader, outline, search panel, editor, preview, and settings areas must have meaningful landmarks/names. | Automated + AT |
| ACC-SEM-013 | Visual relationships must not be the only way hierarchy is conveyed. | Inspection |
| ACC-SEM-014 | Custom widgets must expose correct name, role, state, and value. | Automated + AT |
| ACC-SEM-015 | State changes for toggles, tabs, disclosure controls, and selection must be exposed programmatically. | Accessibility tree + AT |

Relevant WCAG: 1.3.1, 4.1.2.

---

# 8. Keyboard Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-KEY-001 | Every core reader function must be operable using a keyboard. | Keyboard-only test |
| ACC-KEY-002 | Every core editor function must be operable using a keyboard. | Keyboard-only test |
| ACC-KEY-003 | Tab order must be logical and predictable. | Manual |
| ACC-KEY-004 | Composite widgets should follow established ARIA/APG keyboard conventions unless documented otherwise. | Manual |
| ACC-KEY-005 | Keyboard focus must always be visually discernible. | Visual/manual |
| ACC-KEY-006 | Focus must not be completely obscured by toolbars, panels, overlays, or pagination UI. | Manual |
| ACC-KEY-007 | Closing a dialog must return focus to a logical location, preferably the invoking control. | Manual |
| ACC-KEY-008 | Deleting or hiding the currently focused item must place focus somewhere predictable. | Manual |
| ACC-KEY-009 | Focus must never silently fall to the document body because a focused element was removed. | Automated/manual |
| ACC-KEY-010 | Users must be able to move between editor and preview without a pointer. | Manual |
| ACC-KEY-011 | Users must be able to resize or otherwise control split-pane layout without requiring dragging. | Manual |
| ACC-KEY-012 | Any drag-based operation must have a non-drag alternative unless dragging is essential. | Manual |
| ACC-KEY-013 | Shortcut conflicts with OS, browser/Chromium, and assistive-technology commands must be investigated before defaults are assigned. | Design review |
| ACC-KEY-014 | Custom keyboard shortcuts must be configurable where practical. | Functional test |
| ACC-KEY-015 | Shortcut configuration must detect duplicate/conflicting application bindings. | Functional test |
| ACC-KEY-016 | Shortcut documentation must be keyboard accessible. | Manual |
| ACC-KEY-017 | Reader page-turn actions must be available through keyboard controls. | Manual |
| ACC-KEY-018 | Structural navigation must not require repeated Tab traversal through every inline link/control. | Manual |
| ACC-KEY-019 | Keyboard operations should preserve focus when the action applies to the currently focused context. | Manual |
| ACC-KEY-020 | Keyboard users must have an escape route from composite/editor widgets and dialogs. | Manual |

Relevant WCAG: 2.1.1, 2.1.2, 2.4.3, 2.4.7, 2.4.11, 2.5.7.

---

# 9. Focus and Orientation Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-FOC-001 | Re-rendering Markdown must not arbitrarily reset keyboard focus. | Integration test |
| ACC-FOC-002 | Live preview updates must not steal focus from the editor. | Integration + AT |
| ACC-FOC-003 | Search updates must not unexpectedly move the reading cursor. | Manual/integration |
| ACC-FOC-004 | Opening a side panel must have predictable focus behavior. | Manual |
| ACC-FOC-005 | Closing a side panel must restore or preserve meaningful focus. | Manual |
| ACC-FOC-006 | Changing reader theme must not reset reading position. | Integration |
| ACC-FOC-007 | Changing font size or spacing must not reset semantic position. | Integration |
| ACC-FOC-008 | Repagination must preserve the semantic reading anchor. | Integration |
| ACC-FOC-009 | Switching continuous/single-page/two-page modes must preserve semantic location. | Integration |
| ACC-FOC-010 | Returning from a search result must restore the pre-search semantic location. | Integration |
| ACC-FOC-011 | Returning from a Markdown link must restore the prior semantic location. | Integration |
| ACC-FOC-012 | Application restart must restore saved semantic reading position when enabled. | End-to-end |
| ACC-FOC-013 | A user must be able to request current semantic location without changing it. | AT + keyboard |
| ACC-FOC-014 | Visual focus and semantic reading position must be treated as distinct state when necessary. | Architecture review |
| ACC-FOC-015 | The application must avoid automatic focus placement on startup unless the interaction model clearly benefits from it. | Manual |

---

# 10. Structural Navigation Requirements

The product's accessibility goal goes beyond generic screen-reader compatibility.

| ID | Requirement | Verification |
|---|---|---|
| ACC-NAV-001 | Users must be able to navigate to the next/previous heading. | Keyboard + AT |
| ACC-NAV-002 | Users must be able to navigate to the next/previous paragraph. | Keyboard + AT |
| ACC-NAV-003 | Users should be able to navigate to the next/previous sentence where sentence segmentation is reliable. | Functional + AT |
| ACC-NAV-004 | Users must be able to navigate among links. | Keyboard + AT |
| ACC-NAV-005 | Users must be able to navigate among images. | Keyboard + AT |
| ACC-NAV-006 | Users must be able to navigate among tables. | Keyboard + AT |
| ACC-NAV-007 | Users must be able to navigate among lists. | Keyboard + AT |
| ACC-NAV-008 | Users must be able to navigate among code blocks. | Keyboard + AT |
| ACC-NAV-009 | Users must be able to request current heading path. | Functional + AT |
| ACC-NAV-010 | Users must be able to request current document progress. | Functional + AT |
| ACC-NAV-011 | Users must be able to request current section progress. | Functional + AT |
| ACC-NAV-012 | Outline navigation must expose heading hierarchy. | AT |
| ACC-NAV-013 | Navigating the outline must not destroy the previous reading location. | Integration |
| ACC-NAV-014 | "Return to reading position" must restore a semantic location, not merely approximate pixels. | End-to-end |
| ACC-NAV-015 | Navigation history must work across search, internal anchors, and linked Markdown files. | End-to-end |
| ACC-NAV-016 | Structural navigation commands must have a programmatic command representation independent of specific key bindings. | Architecture review |
| ACC-NAV-017 | Semantic navigation should be invokable by future voice control without requiring pointer-coordinate simulation. | Architecture review |

---

# 11. Section Preview / Nonvisual Overview Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-OVR-001 | Users must be able to request a summary of the current/upcoming section. | Functional + AT |
| ACC-OVR-002 | Section summary should identify heading and level. | Functional |
| ACC-OVR-003 | Section summary should report approximate paragraph count. | Functional |
| ACC-OVR-004 | Section summary should report subheading count. | Functional |
| ACC-OVR-005 | Section summary should report presence/count of links. | Functional |
| ACC-OVR-006 | Section summary should report presence/count of images. | Functional |
| ACC-OVR-007 | Section summary should report presence/count of tables. | Functional |
| ACC-OVR-008 | Section summary should report presence/count of lists. | Functional |
| ACC-OVR-009 | Section summary should report presence/count of code blocks. | Functional |
| ACC-OVR-010 | Section summary may provide estimated word count and reading time. | Functional |
| ACC-OVR-011 | Summary must be available on demand rather than forced before every section. | UX test |
| ACC-OVR-012 | Summary verbosity must be configurable. | Functional |
| ACC-OVR-013 | Requesting summary must not change reading position. | Integration |
| ACC-OVR-014 | Summary must be exposed through an accessible output mechanism. | VoiceOver/NVDA |
| ACC-OVR-015 | Repeated summaries should avoid unnecessary duplicate announcements. | AT usability test |

---

# 12. Search Accessibility Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-SRCH-001 | Search controls must have accessible names. | Automated + AT |
| ACC-SRCH-002 | Search must be fully keyboard operable. | Keyboard |
| ACC-SRCH-003 | Result count must be programmatically available. | AT |
| ACC-SRCH-004 | Result-count changes must be communicated without unnecessarily stealing focus. | AT |
| ACC-SRCH-005 | Search results must expose associated heading/section context. | Functional + AT |
| ACC-SRCH-006 | Grouped results must expose group names and counts. | AT |
| ACC-SRCH-007 | Users must be able to navigate next/previous result from keyboard. | Keyboard |
| ACC-SRCH-008 | Users must be able to return to the pre-search reading location. | End-to-end |
| ACC-SRCH-009 | Search-result navigation must not destroy the original semantic anchor. | Integration |
| ACC-SRCH-010 | Search scope controls must be accessible. | AT |
| ACC-SRCH-011 | Cross-file results must identify source file/chapter. | AT + functional |
| ACC-SRCH-012 | Search highlights must not rely on color alone. | Visual inspection |
| ACC-SRCH-013 | Search result context must remain understandable at high zoom and custom spacing. | Visual/manual |

---

# 13. Reader Selection and Copy Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-COPY-001 | Rendered reading mode must permit text selection without entering edit mode. | Functional |
| ACC-COPY-002 | Reader text must be selectable by keyboard where technically practical. | Keyboard |
| ACC-COPY-003 | Users must be able to copy current sentence through a semantic command. | Functional |
| ACC-COPY-004 | Users must be able to copy current paragraph through a semantic command. | Functional |
| ACC-COPY-005 | Users must be able to copy current section through a semantic command. | Functional |
| ACC-COPY-006 | Users must be able to copy a code block without entering edit mode. | Functional |
| ACC-COPY-007 | Copying must not move the reading position. | Integration |
| ACC-COPY-008 | Copy confirmation, if announced, must be concise and configurable. | AT |
| ACC-COPY-009 | Pointer selection must coexist with semantic selection rather than replacing it. | Manual |

---

# 14. Screen Reader Reading Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-SR-001 | All visible document text must be accessible to screen readers. | VoiceOver/NVDA/Orca |
| ACC-SR-002 | Reading order must match meaningful document order. | AT |
| ACC-SR-003 | Heading navigation must work through native screen-reader heading navigation where supported. | AT |
| ACC-SR-004 | Links must be reachable through native screen-reader link navigation. | AT |
| ACC-SR-005 | Reader controls must not pollute the document reading stream unnecessarily. | AT usability |
| ACC-SR-006 | Users must be able to identify where reader content begins and ends. | AT |
| ACC-SR-007 | User must be able to request semantic current location. | AT |
| ACC-SR-008 | "Repeat sentence" must not require manual cursor relocation. | AT + functional |
| ACC-SR-009 | "Repeat paragraph" must not require manual cursor relocation. | AT + functional |
| ACC-SR-010 | Changing page must provide sufficient context without excessive announcements. | AT usability |
| ACC-SR-011 | Page navigation must not cause VoiceOver/NVDA focus to jump to unrelated application controls. | AT |
| ACC-SR-012 | Internal link navigation must announce the destination context when appropriate. | AT |
| ACC-SR-013 | Missing local link targets must be communicated accessibly. | AT |
| ACC-SR-014 | Status messages should use appropriate live-region/status semantics where needed, not arbitrary forced focus. | Accessibility tree |
| ACC-SR-015 | Assistive technology must be able to interact with the application without manually enabling hidden accessibility modes. | Platform test |

---

# 15. Screen Reader Editing Requirements

This area is release-critical because an editor may be nominally "accessible" while still being inefficient or unreliable.

| ID | Requirement | Verification |
|---|---|---|
| ACC-EDIT-001 | Screen-reader users must be able to enter text reliably. | VoiceOver/NVDA/Orca |
| ACC-EDIT-002 | Typed characters/words must be exposed to the active screen reader according to the screen reader's normal echo settings. | AT |
| ACC-EDIT-003 | Users must be able to review text by character. | AT |
| ACC-EDIT-004 | Users must be able to review text by word. | AT |
| ACC-EDIT-005 | Users must be able to review text by line where line navigation is exposed. | AT |
| ACC-EDIT-006 | Users must be able to navigate by paragraph. | AT |
| ACC-EDIT-007 | Current structural context must be available on request. | AT |
| ACC-EDIT-008 | Heading level must be identifiable while editing a heading. | AT |
| ACC-EDIT-009 | List nesting and item context must be identifiable. | AT |
| ACC-EDIT-010 | Link text and link target must be distinguishable. | AT |
| ACC-EDIT-011 | Image alt text must be editable nonvisually. | AT |
| ACC-EDIT-012 | Table editing must expose useful row/column/header context. | AT |
| ACC-EDIT-013 | Code-block boundaries and language must be identifiable. | AT |
| ACC-EDIT-014 | Structural edit operations must provide concise completion feedback where useful. | AT |
| ACC-EDIT-015 | Undo/redo should communicate meaningful structural changes where possible. | AT |
| ACC-EDIT-016 | Save status must be available nonvisually. | AT |
| ACC-EDIT-017 | Unsaved-change status must be available nonvisually. | AT |
| ACC-EDIT-018 | Live preview updates must not interfere with editor text review. | AT |
| ACC-EDIT-019 | Switching raw/rendered/split editing modes must preserve semantic/caret context where practical. | Integration + AT |
| ACC-EDIT-020 | Editor widgets must be evaluated with real screen readers before adoption; popularity alone is not sufficient. | Architecture/release review |

---

# 16. Structural Editing Accessibility

| ID | Requirement | Verification |
|---|---|---|
| ACC-STRUCT-001 | Users must be able to invoke structural operations without pointer selection. | Keyboard |
| ACC-STRUCT-002 | Select paragraph must work through command/keyboard interface. | Functional |
| ACC-STRUCT-003 | Select section must work through command/keyboard interface. | Functional |
| ACC-STRUCT-004 | Move section up/down must not require dragging. | Functional |
| ACC-STRUCT-005 | Promote/demote heading must be keyboard operable. | Functional |
| ACC-STRUCT-006 | Structural operation results must preserve logical focus. | Integration |
| ACC-STRUCT-007 | Structural operations must be undoable. | Functional |
| ACC-STRUCT-008 | Structural operations should announce the affected unit and action when screen-reader feedback is enabled. | AT |
| ACC-STRUCT-009 | Structural selection must be programmatically distinguishable from ordinary keyboard focus. | Architecture + AT |
| ACC-STRUCT-010 | Voice-command mappings should invoke the same semantic commands as keyboard/menu actions. | Architecture |

---

# 17. Low-Vision Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-LV-001 | Reader text size must be user adjustable. | Visual/manual |
| ACC-LV-002 | Large text must reflow rather than disappear or overlap. | Visual/manual |
| ACC-LV-003 | User must be able to adjust line spacing. | Functional |
| ACC-LV-004 | User must be able to adjust paragraph spacing. | Functional |
| ACC-LV-005 | User must be able to adjust letter spacing. | Functional |
| ACC-LV-006 | User must be able to adjust word spacing. | Functional |
| ACC-LV-007 | User must be able to adjust content width. | Functional |
| ACC-LV-008 | User must be able to choose foreground/background colors. | Functional |
| ACC-LV-009 | Important states must remain distinguishable without relying on color alone. | Visual |
| ACC-LV-010 | Focus indicators must remain visible in application themes. | Visual |
| ACC-LV-011 | Focus indicators must remain useful in OS high-contrast modes where possible. | Platform manual |
| ACC-LV-012 | Code blocks must remain readable under large text and high zoom. | Manual |
| ACC-LV-013 | Tables must have a usable local overflow/reflow strategy at high zoom. | Manual |
| ACC-LV-014 | Enlarging text must not reset semantic reading position. | Integration |
| ACC-LV-015 | Changing spacing must not reset semantic reading position. | Integration |
| ACC-LV-016 | Page mode must repaginate without returning the reader to the beginning. | Integration |
| ACC-LV-017 | Ordinary prose should avoid two-dimensional scrolling at expected reflow widths. | WCAG/manual |
| ACC-LV-018 | Users must be able to override decorative document themes with readable preferences. | Functional |
| ACC-LV-019 | User-defined reading presentation must not hide application controls or semantic content. | Manual |

Relevant WCAG: 1.4.3, 1.4.4, 1.4.10, 1.4.11, 1.4.12.

---

# 18. Motor and Pointer Accessibility

| ID | Requirement | Verification |
|---|---|---|
| ACC-MOT-001 | Core functions must not require precision pointer movement. | Manual |
| ACC-MOT-002 | Dragging must have a single-pointer or keyboard alternative unless essential. | Manual |
| ACC-MOT-003 | Application-created pointer targets should meet or exceed 24x24 CSS px unless a WCAG exception genuinely applies. | Automated/manual |
| ACC-MOT-004 | Frequently used controls should target a larger practical hit area than the bare minimum when layout permits. | Design review |
| ACC-MOT-005 | Adjacent small controls must have adequate separation. | Manual |
| ACC-MOT-006 | Page-turn controls must have usable pointer target sizes. | Manual |
| ACC-MOT-007 | Split-pane resizing must have keyboard/non-drag alternatives. | Manual |
| ACC-MOT-008 | Reordering sections/items must have non-drag commands. | Functional |
| ACC-MOT-009 | Touch/swipe page turning must have equivalent button/keyboard actions. | Manual |
| ACC-MOT-010 | Pointer interactions must not disable keyboard or assistive-technology alternatives. | Manual |

Relevant WCAG: 2.5.7, 2.5.8.

---

# 19. Cognitive and Predictability Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-COG-001 | Core navigation patterns must behave consistently across reader contexts. | UX review |
| ACC-COG-002 | Similar controls must use consistent names and locations where practical. | UX review |
| ACC-COG-003 | Application must not unexpectedly switch reading/editing mode. | Integration |
| ACC-COG-004 | Page transitions should avoid unnecessary motion. | Manual |
| ACC-COG-005 | OS reduced-motion preference should be respected. | Platform test |
| ACC-COG-006 | A reduced-distraction reading presentation should be available. | Functional |
| ACC-COG-007 | Current paragraph/sentence focus aids should be optional. | Functional |
| ACC-COG-008 | Structural overview should be available on demand. | Functional |
| ACC-COG-009 | Reading-time estimates and progress must be clearly identified as estimates where applicable. | UX review |
| ACC-COG-010 | Destructive editing operations must provide understandable recovery/undo behavior. | Functional |
| ACC-COG-011 | Error messages should identify the problem and recovery path. | UX/manual |
| ACC-COG-012 | Advanced authoring options should use progressive disclosure rather than overwhelming the default interface. | UX review |

---

# 20. Pagination and Book-Mode Accessibility

| ID | Requirement | Verification |
|---|---|---|
| ACC-PAGE-001 | Pagination must not be the sole representation of reading location. | Architecture |
| ACC-PAGE-002 | Page number changes caused by reflow must not invalidate bookmarks. | Integration |
| ACC-PAGE-003 | Single-page and two-page modes must expose a logical reading order. | AT |
| ACC-PAGE-004 | Two-page visual presentation must not create a confusing nonvisual reading order. | AT |
| ACC-PAGE-005 | Page-turn actions must be keyboard accessible. | Keyboard |
| ACC-PAGE-006 | Page-turn actions must have accessible names. | AT |
| ACC-PAGE-007 | Page changes should communicate useful page/context information without excessive interruption. | AT usability |
| ACC-PAGE-008 | Increasing font size must trigger reflow without losing semantic position. | Integration |
| ACC-PAGE-009 | Section/book progress must remain meaningful independently of current physical page count. | Functional |
| ACC-PAGE-010 | A user must be able to switch to continuous mode if pagination is difficult for their access needs. | Functional |
| ACC-PAGE-011 | Code/table overflow solutions must not trap keyboard focus. | Keyboard |
| ACC-PAGE-012 | Page animations must respect reduced motion. | Platform/manual |
| ACC-PAGE-013 | Content must not be clipped when text spacing overrides are applied. | Manual |
| ACC-PAGE-014 | Reader controls must remain accessible at high zoom. | Manual |

---

# 21. Status Messages and Announcements

| ID | Requirement | Verification |
|---|---|---|
| ACC-ANN-001 | Noncritical status changes should be announced without moving focus when an announcement is necessary. | AT |
| ACC-ANN-002 | Save success/failure must be perceivable nonvisually. | AT |
| ACC-ANN-003 | Search-result count changes must be perceivable nonvisually. | AT |
| ACC-ANN-004 | Structural edit results should be available as concise announcements. | AT |
| ACC-ANN-005 | Announcements must not repeat ordinary screen-reader output unnecessarily. | AT usability |
| ACC-ANN-006 | Verbosity should be configurable for app-generated reading assistance. | Functional |
| ACC-ANN-007 | Critical errors may require stronger focus/dialog behavior than ordinary status messages. | Manual |
| ACC-ANN-008 | Announcements must not interrupt document speech unnecessarily. | AT usability |
| ACC-ANN-009 | The application should avoid firing rapid redundant live-region updates during typing. | AT |
| ACC-ANN-010 | Progress/status updates that do not require immediate attention should remain queryable even when not automatically announced. | Functional |

Relevant WCAG: 4.1.3.

---

# 22. Accessible Authoring Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-AUTH-001 | Missing image alt text must be detectable. | Unit test |
| ACC-AUTH-002 | Skipped heading levels must be detectable. | Unit test |
| ACC-AUTH-003 | Empty headings must be detectable. | Unit test |
| ACC-AUTH-004 | Ambiguous link-text patterns should be detectable. | Unit test |
| ACC-AUTH-005 | Empty links must be detectable. | Unit test |
| ACC-AUTH-006 | Table-header absence/malformed table structure should be detectable where Markdown syntax allows. | Unit test |
| ACC-AUTH-007 | Findings must identify source location. | Unit/integration |
| ACC-AUTH-008 | Findings must be keyboard accessible. | Manual |
| ACC-AUTH-009 | Findings must be screen-reader accessible. | AT |
| ACC-AUTH-010 | Findings must explain why an issue matters. | Content review |
| ACC-AUTH-011 | Findings should provide remediation guidance. | Content review |
| ACC-AUTH-012 | The checker must not automatically rewrite user content without explicit action. | Integration |
| ACC-AUTH-013 | Ignoring/accepting a finding must not silently alter source. | Integration |
| ACC-AUTH-014 | Accessibility-analysis severity must distinguish definite structural failures from heuristic readability concerns. | Rule review |
| ACC-AUTH-015 | Accessibility checks should work on ordinary Markdown files without requiring proprietary metadata. | Integration |

---

# 23. User Customization Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-CUST-001 | Accessibility-related reader preferences must persist when the user chooses. | Integration |
| ACC-CUST-002 | User preferences must not be stored inside the Markdown source unless explicitly requested. | Integration |
| ACC-CUST-003 | Accessibility profiles must not remove core functionality. | Functional |
| ACC-CUST-004 | Users must be able to restore defaults. | Functional |
| ACC-CUST-005 | User typography choices must override document CSS when necessary for readability. | Functional |
| ACC-CUST-006 | Shortcut customization must remain operable using keyboard. | Keyboard |
| ACC-CUST-007 | Theme customization must not make focus invisible without warning/prevention. | Functional/manual |
| ACC-CUST-008 | Custom colors should be previewable before application when practical. | Functional |

---

# 24. Accessible Dialog and Panel Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-UI-001 | Modal dialogs must have accessible names. | Automated + AT |
| ACC-UI-002 | Modal focus must remain within the modal while it is active. | Keyboard |
| ACC-UI-003 | Closing a modal must restore focus logically. | Keyboard |
| ACC-UI-004 | Escape should close dismissible dialogs where conventionally appropriate. | Keyboard |
| ACC-UI-005 | Non-modal side panels must not unexpectedly capture focus. | Manual |
| ACC-UI-006 | Tabs must expose selected state. | AT |
| ACC-UI-007 | Tree/outline controls must follow accessible tree conventions if implemented as a tree. | AT + keyboard |
| ACC-UI-008 | Menus must follow established keyboard behavior. | Keyboard |
| ACC-UI-009 | Tooltips must not contain functionality unavailable elsewhere. | Manual |
| ACC-UI-010 | Temporary notifications must not cover focused controls completely. | Visual/manual |

---

# 25. Accessibility of Custom CSS and Advanced Markdown

| ID | Requirement | Verification |
|---|---|---|
| ACC-CSS-001 | User/document CSS must not remove semantic accessibility information. | Manual |
| ACC-CSS-002 | The app must provide a way to disable document CSS. | Functional |
| ACC-CSS-003 | Document CSS must not make application controls inaccessible. | Security/UI test |
| ACC-CSS-004 | Custom CSS should not be allowed to hide required accessibility controls in privileged UI. | Security test |
| ACC-CSS-005 | Embedded HTML must be sanitized and evaluated for accessible semantics where rendered. | Security + AT |
| ACC-CSS-006 | Unsupported embedded content must have a usable fallback or clear indication. | Manual |
| ACC-CSS-007 | Diagram extensions should expose textual alternatives or source fallback where meaningful. | AT/manual |
| ACC-CSS-008 | Math rendering should use accessible math semantics where chosen rendering technology supports them. | AT/manual |

---

# 26. Voice and Alternative Input Requirements

| ID | Requirement | Verification |
|---|---|---|
| ACC-VOICE-001 | Major semantic commands must have stable programmatic command identifiers. | Architecture |
| ACC-VOICE-002 | Voice activation should invoke commands rather than simulated screen coordinates where possible. | Architecture |
| ACC-VOICE-003 | Visible controls should have meaningful accessible names suitable for voice targeting. | Manual |
| ACC-VOICE-004 | Voice-command support must not be required for keyboard accessibility. | Design review |
| ACC-VOICE-005 | Switch/alternative-input users must be able to reach primary actions through normal focus navigation. | Manual |
| ACC-VOICE-006 | Pointer-only hover actions must have activation alternatives. | Manual |

---

# 27. Braille Considerations

Even if the project does not directly implement Braille-device support, correct platform accessibility semantics should allow screen readers to expose information to refreshable Braille displays.

| ID | Requirement | Verification |
|---|---|---|
| ACC-BRL-001 | Critical information must not exist only as audio announcements. | Review |
| ACC-BRL-002 | Structural names/states should be exposed programmatically so screen readers can render them in Braille. | Accessibility tree |
| ACC-BRL-003 | Status messages needed for task completion must have programmatic text equivalents. | AT |
| ACC-BRL-004 | Custom speech features must not replace standard semantic exposure. | Architecture |

---

# 28. Automated Accessibility Testing Requirements

Automated tools are useful but incomplete.

The project should automate detection of at least:

- missing accessible names,
- invalid ARIA usage,
- basic contrast failures where testable,
- broken landmark hierarchy,
- focusability mistakes,
- obvious label/control issues.

| ID | Requirement | Verification |
|---|---|---|
| ACC-AUTO-001 | Accessibility automated tests must run in CI for applicable React UI components. | CI |
| ACC-AUTO-002 | Automated test success must never be treated as proof of full accessibility. | Process review |
| ACC-AUTO-003 | Regression tests must be added for accessibility defects after fixes. | CI/review |
| ACC-AUTO-004 | Automated tests should cover each major modal, panel, reader mode, and editor mode. | CI |

---

# 29. Manual Screen Reader Test Scenarios

## AT-001 — Open and resume a long document

1. Open a long Markdown document.
2. Navigate to a heading several sections into the file.
3. Move to a paragraph within that section.
4. Close the document/application.
5. Reopen it.
6. Confirm the semantic reading position is restored.
7. Confirm screen-reader focus/context is useful and not placed at an unrelated toolbar.

**Expected:** User does not need to rediscover the previous reading location.

## AT-002 — Resize and preserve location

1. Navigate into the middle of a long document.
2. Increase reader text size substantially.
3. Resize the window.
4. Switch from two-page to one-page mode.
5. Request current location.

**Expected:** Same semantic paragraph/section remains active even though physical page number may change.

## AT-003 — Section preview

1. Navigate to a heading.
2. Request section summary.
3. Confirm heading level, paragraph/subheading counts, and special structures are available.
4. Dismiss/finish the summary.

**Expected:** Reading position does not move.

## AT-004 — Smart search

1. Start in the middle of a document.
2. Search for a term with matches under multiple headings.
3. Navigate grouped results.
4. Open a result.
5. Use Return to Reading Position.

**Expected:** User returns to the original semantic location.

## AT-005 — Raw editor typing

1. Focus raw Markdown editor.
2. Type ordinary prose.
3. Navigate by character, word, and paragraph.
4. Insert and delete text.
5. Undo.
6. Save.

**Expected:** Screen-reader interaction remains reliable; preview updates do not steal focus.

## AT-006 — Structural editing

1. Focus a section.
2. Invoke Select Section.
3. Move Section Down.
4. Confirm operation announcement.
5. Undo.
6. Confirm restored position/context.

## AT-007 — Table reading

1. Navigate to a Markdown table.
2. Enter table navigation.
3. Move through several cells.

**Expected:** Row/column/header context is intelligible.

## AT-008 — Reader copy

1. Navigate to a paragraph in reading mode.
2. Invoke Copy Current Paragraph.
3. Confirm operation if announcements are enabled.

**Expected:** No switch to editor; reading position unchanged.

## AT-009 — Linked book navigation

1. Open chapter 1.
2. Follow a Markdown link into chapter 2 at a heading anchor.
3. Read several paragraphs.
4. Navigate Back.

**Expected:** User returns to exact previous location in chapter 1.

## AT-010 — Accessibility findings

1. Open a file with missing alt text and skipped heading levels.
2. Open accessibility findings.
3. Navigate findings using keyboard/screen reader.
4. Open a finding.
5. Return to findings.

**Expected:** Findings identify type, location, reason, and remediation without forcing source modification.

---

# 30. Low-Vision Manual Test Scenarios

## LV-001 — Large text

Increase reader text until substantially larger than default.

**Expected:**

- no text overlap,
- no missing prose,
- page reflows,
- reading position preserved,
- core controls remain available.

## LV-002 — Text spacing

Apply large values for:

- line height,
- letter spacing,
- word spacing,
- paragraph spacing.

**Expected:** No content loss or inaccessible overlap.

## LV-003 — High contrast

Test platform high-contrast/accessibility display settings.

**Expected:** Focus and control boundaries remain understandable.

## LV-004 — Narrow viewport

Make the application window narrow.

**Expected:** Ordinary prose reflows; single-page layout is usable; no page-wide horizontal scrolling solely to read prose.

---

# 31. Keyboard-Only Manual Test Scenarios

## KEY-001 — Complete reading workflow

Without touching a mouse:

1. Open a file.
2. Navigate into content.
3. Search.
4. Open a search result.
5. Return.
6. Follow a local link.
7. Return.
8. Copy a paragraph.
9. Change reading mode.
10. Close the file.

**Expected:** Entire workflow is possible.

## KEY-002 — Complete editing workflow

Without touching a mouse:

1. Open edit mode.
2. Type content.
3. Select a paragraph.
4. Copy it.
5. Move a section.
6. Undo.
7. Search/replace.
8. Save.
9. Switch to preview.

**Expected:** Entire workflow is possible without focus loss or traps.

---

# 32. Accessibility Release Gate

A release candidate should not be considered accessibility-ready if any of the following are true:

- core reader content is not exposed to VoiceOver/NVDA,
- raw editing is unreliable with a primary screen reader,
- a core feature requires mouse-only interaction,
- keyboard focus can become permanently trapped/lost,
- changing reader presentation consistently loses semantic reading position,
- headings/lists/tables/links are stripped of meaningful semantics,
- high zoom makes ordinary prose unusable,
- a critical status/error cannot be perceived nonvisually,
- live preview steals focus during normal editing,
- the application claims accessibility solely from automated tooling.

---

# 33. Contributor Definition of Done for Accessibility-Sensitive Features

A feature affecting UI, navigation, reader structure, editor structure, focus, or document rendering is not complete until the contributor has considered:

- keyboard path,
- accessible name,
- accessible role/state,
- focus behavior,
- reading order,
- screen-reader announcement impact,
- high zoom/reflow,
- pointer-target size,
- semantic-position preservation,
- reduced-motion behavior where relevant,
- error/status communication,
- automated regression coverage where practical,
- manual test procedure.

---

# 34. Research / Validation Questions Requiring User Testing

These should not be decided by developer intuition alone.

1. What information is most useful in a section preview for blind readers?
2. Should section preview report exact counts or concise categories by default?
3. What announcement verbosity is comfortable during structural editing?
4. Which default structural keyboard shortcuts avoid conflict with screen readers?
5. How should paginated reading announce page transitions nonvisually?
6. Does a blind reader benefit from "page" as a concept, or should semantic progress dominate?
7. How should screen-reader users interact with a two-page visual spread?
8. Which search-result context is enough to distinguish matches without becoming verbose?
9. What is the most useful behavior after following a footnote/internal link?
10. How should built-in text-to-speech coexist with VoiceOver/NVDA?
11. Which structural selection operations provide the greatest value to users with motor disabilities?
12. What low-vision presets are actually useful, rather than based on developer assumptions?
13. Which editor component provides the most reliable text review across VoiceOver, NVDA, and Orca?
14. How should accessible Markdown authoring warnings distinguish standards failures from subjective readability suggestions?

These questions should become usability-study tasks when contributors with lived experience become available.

---

# 35. Guiding Test Principle

For every feature, ask two questions:

> Can a user with a disability technically perform this action?

and then:

> Can they perform it efficiently, predictably, and with enough context to understand what happened?

The second question is the standard this project should optimize for.

---

# 36. Source Notes

Key sources consulted for this specification:

- W3C, Web Content Accessibility Guidelines (WCAG) 2.2  
  https://www.w3.org/TR/WCAG22/

- W3C, Understanding WCAG 2.2  
  https://www.w3.org/WAI/WCAG22/understanding/

- W3C, Understanding 1.3.1 Info and Relationships  
  https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships.html

- W3C, Understanding 2.4.11 Focus Not Obscured (Minimum)  
  https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum

- W3C, Understanding 2.5.8 Target Size (Minimum)  
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum

- W3C, Understanding 4.1.2 Name, Role, Value  
  https://www.w3.org/WAI/WCAG22/Understanding/name-role-value

- W3C, WAI-ARIA Overview  
  https://www.w3.org/WAI/standards-guidelines/aria/

- W3C, ARIA Authoring Practices Guide  
  https://www.w3.org/WAI/ARIA/apg/

- W3C, Developing a Keyboard Interface  
  https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/

- Electron, Accessibility  
  https://www.electronjs.org/docs/latest/tutorial/accessibility

- Apple Developer, VoiceOver  
  https://developer.apple.com/documentation/accessibility/voiceover

- Apple Developer, VoiceOver Evaluation Criteria  
  https://developer.apple.com/help/app-store-connect/manage-app-accessibility/voiceover-evaluation-criteria

- Apple Developer, Integrating Accessibility into Your App  
  https://developer.apple.com/documentation/accessibility/integrating-accessibility-into-your-app

- GNOME, Orca  
  https://help.gnome.org/orca/introduction.html

- GNOME, AT-SPI  
  https://gnome.pages.gitlab.gnome.org/at-spi2-core/
