# Accessible Markdown Reader & Editor — Product Specification updates in real time

## 1. Purpose

This specification defines the complete intended product for a cross-platform desktop Markdown reader and editor focused on excellent long-form reading, powerful Markdown authoring, accessibility-first interaction, filesystem-first behavior, and preservation of user context.

This is a **single end-state specification**, not a versioned roadmap. Features may be implemented in any order. The specification describes what the application should ultimately become once complete.

The application should aim to be to Markdown what VLC is to media: dependable, flexible, open, cross-platform, respectful of user-owned files, and capable of handling simple and advanced use cases without forcing users into a proprietary ecosystem.

The application should not attempt to become a general-purpose IDE, word processor, note database, knowledge vault, or cloud platform. Its purpose is narrower and deeper:

> Open, read, navigate, understand, edit, and preserve Markdown files exceptionally well.

---

## 2. Product Vision

The application should provide:

- A reader-first experience for Markdown.
- A first-class editor for Markdown.
- A book-like experience for long Markdown documents and linked Markdown collections.
- Accessibility designed into the application architecture rather than added later.
- Equal feature access for users who rely on screen readers, keyboard-only interaction, low-vision settings, voice input, or alternative input methods.
- Strong semantic navigation based on Markdown structure.
- Persistent reading context so users do not lose their place.
- Filesystem-first operation without proprietary conversion.
- Basic-to-advanced Markdown support, from simple syntax through advanced extensions and custom styling.
- Cross-platform support using Electron, Node.js, React, Vite, and Vitest unless later technical requirements justify another component.

---

## 3. Core Product Principles

### 3.1 User files remain user files

The application must work directly with ordinary `.md` files.

It must not require:

- importing documents into a proprietary database,
- converting Markdown into a proprietary format,
- creating an account,
- using cloud storage,
- creating a "vault" or workspace before opening a file,
- using a project structure when the user only wants to open one file.

A user should be able to associate `.md` files with the application at the operating-system level and double-click a Markdown file to open it directly.

### 3.2 Reader first, editor available

Opening a Markdown file should default to a rendered reading experience unless the user has explicitly chosen a different default.

The source should not need to be visible during ordinary reading.

Reading mode must remain interactive. Users should be able to search, navigate, follow links, select text, copy text, bookmark locations, and use accessibility features without entering edit mode.

### 3.3 Preserve context

The application should avoid making users rediscover their position.

Whenever practical, the application should preserve semantic reading position rather than raw pixel position.

### 3.4 Accessibility is part of the product

Accessibility must not be treated as a reduced-function secondary application.

The same document capabilities should be available through:

- mouse/pointer interaction,
- keyboard interaction,
- screen readers,
- voice commands where supported,
- alternative input technologies.

### 3.5 Semantic structure is a first-class data model

Markdown is structured content. The application should understand headings, paragraphs, lists, links, images, tables, code blocks, and other elements semantically.

Features such as search, navigation, accessibility, pagination, reading position, editing, document analysis, and speech should operate on that structure where possible.

### 3.6 Progressive complexity

The application should support both simple and advanced users.

A beginner should be able to work with common Markdown features without facing an overwhelming interface.

An advanced user should be able to access:

- extended Markdown features,
- syntax extensions,
- embedded HTML where permitted,
- front matter,
- diagrams,
- math,
- custom styling,
- document-level CSS,
- advanced editing controls.

Simple mode must not destroy or strip advanced syntax from an existing file.

---

## 4. Target Users

The application should serve, at minimum:

- People who want to read Markdown without opening an IDE.
- Developers reading long README files, technical documentation, manuals, or specifications.
- Authors writing Markdown.
- Blind and screen-reader users.
- Low-vision users.
- Keyboard-only users.
- Users with motor impairments.
- Users with reading or cognitive accessibility needs.
- Users who prefer minimal-distraction reading.
- Students and educators using Markdown as course material.
- Users reading long-form Markdown books or multi-file documentation.
- Power users who want structural navigation and editing.
- Users who prefer voice-driven or command-driven workflows.

---

## 5. User Stories

### 5.1 Reading

- As a reader, I want to open a `.md` file directly and immediately see the rendered document.
- As a reader, I want to see only the rendered version of the file unless I choose to edit or inspect the source.
- As a reader, I want to reopen a document at the exact place I stopped reading so that I do not have to rediscover my position.
- As a reader, I want to return to my previous reading position after following a link or performing a search.
- As a reader, I want to easily copy text without entering edit mode.
- As a reader, I want to select and copy a word, sentence, paragraph, section, code block, link text, or other meaningful unit.
- As a reader, I want linked Markdown files to open within the application rather than being treated as unrelated external files.
- As a reader, I want ordinary Markdown links and anchor links to behave predictably.
- As a reader, I want a clean reading experience with minimal unnecessary chrome.
- As a reader, I want to know my progress through a long document.
- As a reader, I want to bookmark important positions.
- As a reader, I want to resume from bookmarks or recent positions easily.

### 5.2 Book and long-form reading

- As a reader, I want a reading experience comparable to Apple Books when reading Markdown.
- As a reader, I want to move forward and backward using arrow keys, swipe gestures, or visible controls.
- As a reader, I want one-page or two-page display depending on available window size.
- As a reader, I want the page layout to respond to resizing without losing my place.
- As a reader, I want long Markdown files to feel like books rather than giant vertically scrolling pages.
- As a reader, I want linked `.md` files to behave like chapters of a book without converting them into a proprietary format.
- As a reader, I want navigation history when moving across chapters or internal links.
- As a reader, I want chapter, section, page, and overall progress information where meaningful.
- As a reader, I want a continuous-scroll mode available when pagination is not desirable.

### 5.3 Blind and screen-reader users

- As a blind reader, I want to resume at the paragraph where I stopped so I do not have to rediscover my position.
- As a blind reader, I want a section breakdown before entering a new section.
- As a blind reader, I want to know approximately how long a section is before I begin reading it.
- As a blind reader, I want to know whether a section contains tables, images, links, lists, subheadings, or code blocks before entering it.
- As a blind reader, I want to know my current position in the document.
- As a blind reader, I want to know my current chapter, heading, paragraph, or other meaningful context.
- As a blind reader, I want to repeat the current sentence, paragraph, or section.
- As a blind reader, I want to navigate directly by sentence, paragraph, heading, section, link, image, list, table, and code block.
- As a blind reader, I want search results described with section context before I navigate to them.
- As a blind reader, I want to return to my previous reading position after exploring a search result or link.
- As a blind user, I want the full application capability available through assistive technology rather than a reduced accessibility mode.

### 5.4 Low-vision users

- As a low-vision reader, I want to enlarge text without breaking the layout.
- As a low-vision reader, I want to change line spacing, paragraph spacing, word spacing, and character spacing.
- As a low-vision reader, I want to adjust content width and margins.
- As a low-vision reader, I want to control foreground and background colors.
- As a low-vision reader, I want to control link, heading, code block, and emphasis presentation.
- As a low-vision reader, I want pagination to adapt to my display settings while preserving my semantic position.
- As a low-vision reader, I want high-contrast configurations that do not remove information or focus indicators.

### 5.5 Keyboard-only and motor-access users

- As a keyboard-only user, I want to navigate headings, paragraphs, links, search results, pages, menus, and application controls without a mouse.
- As a keyboard-only user, I want efficient shortcuts for common reading actions.
- As a keyboard-only user, I want focus to remain predictable and visible.
- As a keyboard-only user, I want to select semantic units without precise pointer movement.
- As a user with motor limitations, I want large enough interactive targets and alternatives to drag-based interaction.
- As a user relying on voice control, I want meaningful commands that map to the same semantic actions available through the keyboard.

### 5.6 Search

- As a developer reading a 4,000-line README, I want search results grouped by section so I can understand where relevant information occurs.
- As a reader, I want to search the whole document or limit search to the current section.
- As a reader, I want to search headings, links, code, or other document structures where useful.
- As a reader, I want enough nearby context to distinguish similar search results.
- As a reader, I want to move to the next or previous result without losing my original reading position.
- As a screen-reader user, I want search results announced with meaningful section context.

### 5.7 Editing

- As an author, I want to edit raw Markdown directly.
- As an author, I want a live rendered preview.
- As an author, I want an optional side-by-side source and rendered view.
- As an author, I want source and preview positions to stay synchronized where practical.
- As an author, I want simple keyboard shortcuts or voice commands for structural selections.
- As an author, I want to select by word, line, sentence, paragraph, section, list, table, or code block.
- As an author, I want to cut, copy, paste, delete, duplicate, or move selected structural units.
- As a screen-reader user editing Markdown, I want my current structural context announced.
- As a screen-reader user, I want to know whether I am editing a heading, paragraph, list, link, image, table, or code block.
- As a screen-reader user, I want meaningful structural changes announced when they occur.
- As an author, I want to work with both basic and advanced Markdown features.
- As an author, I want advanced syntax preserved even when I am using a simplified editing mode.

### 5.8 Accessible authoring

- As an author, I want warnings when I create inaccessible document structures so I can fix them before publishing.
- As an author, I want to know when images are missing alternative text.
- As an author, I want warnings about inconsistent heading hierarchy.
- As an author, I want warnings about ambiguous link text.
- As an author, I want table-structure problems identified.
- As an author, I want accessibility issues explained in language that helps me fix them.
- As an author, I want accessibility checks to operate without changing my document automatically unless I explicitly request a change.

---

## 6. File Handling

### 6.1 Supported primary format

The application is specifically a Markdown reader/editor.

Primary file extension:

- `.md`

Additional Markdown extensions may be considered if they are clearly Markdown variants, but support for unrelated general text formats is not a goal.

### 6.2 File association

The packaged desktop application should support OS-level `.md` file association.

Expected behavior:

1. User selects the application as the default Markdown application.
2. User double-clicks a `.md` file.
3. The application launches if necessary.
4. The selected document opens directly in reading mode at the saved semantic position if one exists.

### 6.3 Direct filesystem behavior

The application should:

- open files in place,
- preserve their location,
- save changes back to the original file when authorized,
- avoid unnecessary import/export steps,
- preserve unsupported syntax wherever possible,
- warn before destructive transformations.

### 6.4 External file changes

If a file changes on disk while open:

- the application should detect the change where practical,
- it must avoid silently discarding user edits,
- it should preserve the reader's semantic position during refresh,
- it should provide clear conflict handling when both disk and editor changes exist.

---

## 7. Reading Modes

The application should support multiple reading presentations.

### 7.1 Continuous mode

Traditional vertically flowing rendered Markdown.

Requirements:

- smooth scrolling,
- semantic position tracking,
- position restoration,
- heading navigation,
- selectable/copyable rendered text,
- internal link handling,
- accessibility support.

### 7.2 Paginated book mode

Rendered content flows into pages.

Requirements:

- page-forward and page-back controls,
- arrow-key navigation,
- swipe navigation where supported,
- page-number/progress feedback,
- semantic position preserved across repagination,
- readable page geometry,
- responsive behavior.

### 7.3 One-page mode

Used when:

- window width is narrow,
- user explicitly selects it,
- accessibility settings make two-page mode unsuitable.

### 7.4 Two-page spread

Used when:

- sufficient space exists,
- user settings allow it.

The application should intelligently avoid unreadably narrow pages.

### 7.5 Presentation mode switching

Users should be able to move between continuous, single-page, and spread views without losing their semantic reading position.

---

## 8. Pagination Requirements

Pagination must operate as presentation, not canonical document location.

A stored reading position should not depend solely on page number.

The application should track semantic anchors such as:

- document identifier,
- heading path,
- block/node identifier,
- paragraph index,
- sentence index where feasible,
- character/text anchor as a fallback.

Pagination should account for:

- font changes,
- window resizing,
- spacing changes,
- zoom,
- images,
- tables,
- code blocks,
- lists,
- headings.

The engine should attempt to avoid poor page breaks such as:

- orphaned headings,
- tiny fragments of code blocks,
- one-line fragments of paragraphs,
- broken table context.

Large structures may span pages when necessary.

---

## 9. Semantic Document Model

The application should parse Markdown into a semantic representation that can be used across reader and editor features.

The model should understand at minimum:

- document,
- headings and hierarchy,
- paragraphs,
- sentences where practical,
- lists,
- list items,
- blockquotes,
- inline emphasis,
- strong text,
- links,
- images,
- code spans,
- fenced code blocks,
- tables,
- horizontal rules,
- HTML blocks where supported,
- front matter where supported,
- extension nodes such as math or diagrams where enabled.

The same semantic model should support:

- rendering,
- search,
- navigation,
- accessibility tree design,
- reading-position persistence,
- document outline,
- section summaries,
- editing operations,
- accessibility checks,
- export where supported.

---

## 10. Persistent Reading Position

Reading position is a core feature.

### 10.1 Requirements

The application should remember a user's location when:

- switching between reader and editor,
- switching tabs,
- following links,
- performing searches,
- resizing the window,
- changing font size,
- changing spacing,
- changing layout modes,
- closing and reopening a document,
- closing and reopening the application.

### 10.2 Semantic persistence

Preferred position data should be semantic rather than pixel-only.

Example conceptual model:

```text
File: memory.md
Heading path:
  Memory Management
  Virtual Memory
Block: paragraph 8
Sentence: 2
```

Page number and scroll offset may be stored as supplemental information but should not be the only location mechanism.

### 10.3 Return stack

The application should maintain navigation history for:

- internal links,
- linked Markdown files,
- search-result jumps,
- bookmarks or explicit "go to" actions.

Users should be able to return to the previous semantic location.

---

## 11. Structural Navigation

The reader and editor should expose semantic navigation commands.

Supported navigable unit types should include:

- character,
- word,
- sentence,
- line where meaningful,
- paragraph,
- heading,
- section,
- list,
- list item,
- link,
- image,
- table,
- table row/cell where accessible,
- code span,
- code block,
- search result,
- page.

Commands should include concepts such as:

- next,
- previous,
- current,
- repeat,
- select,
- copy,
- go to,
- describe.

Keyboard shortcuts should be configurable.

Commands should be designed so they may also be invoked by:

- menus,
- screen-reader-accessible controls,
- voice commands,
- future assistive interfaces.

---

## 12. Section Preview / Structural Summary

Before entering a section, the user should be able to request a semantic summary.

A summary may include:

- section heading and heading level,
- estimated word count,
- estimated reading time,
- number of paragraphs,
- number of subheadings,
- number of links,
- number of images,
- number of tables,
- number of lists,
- number of code blocks,
- approximate section progress/length.

Example:

```text
Memory Management
Heading level 2
8 paragraphs
2 subheadings
1 table
3 links
1 code block
Approximately 6 minutes
```

This feature should be accessible through keyboard and screen reader.

It should not force the user to listen to the summary every time; verbosity must be configurable.

---

## 13. Search

### 13.1 Standard search

The application must support conventional text search.

### 13.2 Structure-aware search

Search should optionally group results by:

- heading,
- section,
- chapter/file,
- document type/location.

### 13.3 Search scopes

Where practical, allow searching:

- entire document,
- current section,
- headings only,
- links,
- code blocks,
- current Markdown collection/book.

### 13.4 Result context

Search results should provide enough context for users to identify relevance before navigating.

Possible result information:

- file/chapter,
- heading path,
- paragraph or block context,
- matching excerpt,
- result count.

### 13.5 Search navigation

Users must be able to:

- go to next result,
- go to previous result,
- move among section-grouped results,
- return to pre-search reading position.

### 13.6 Accessibility

Search result state and navigation must be clearly exposed to assistive technology.

---

## 14. Selection and Copying in Reader Mode

Reader mode must support text selection and copying without entering edit mode.

Supported methods should include:

- pointer selection,
- keyboard selection,
- semantic selection commands.

Semantic selection should eventually support:

- current word,
- current sentence,
- current paragraph,
- current section,
- current code block,
- current link text,
- current table content where meaningful.

Copying should preserve useful text representation while avoiding unnecessary visual-only formatting.

---

## 15. Markdown Linking and Multi-File Documents

The application should understand local Markdown links.

Examples:

```md
[Next Chapter](chapter-02.md)
[Heap](memory.md#heap)
```

Expected behavior:

- local `.md` targets open inside the application,
- anchors resolve to semantic headings/locations,
- back navigation returns to the previous location,
- file collections can be read sequentially.

### 15.1 Book/document set behavior

The application may infer or allow users to define a set of linked Markdown files as a book/document collection.

A collection may support:

- title,
- chapter order,
- table of contents,
- next/previous chapter,
- overall progress,
- cross-file search,
- bookmarks,
- reading position per file and per collection.

This must not require conversion into a proprietary document format.

---

## 16. Editor Modes

### 16.1 Raw Markdown editor

Provide direct source editing with appropriate syntax highlighting.

### 16.2 Split editor and preview

Provide source on one side and rendered Markdown on the other.

Requirements:

- live preview updates,
- reasonable synchronization of source and rendered positions,
- user-resizable panes,
- keyboard-accessible pane switching,
- no loss of editor or reader position when switching.

### 16.3 Rendered/live editing

A rendered or WYSIWYM-style editing experience may be supported.

If implemented, it must preserve Markdown fidelity and must not silently rewrite complex source in destructive ways.

### 16.4 Simple-to-advanced authoring

The editor should support different levels of feature exposure.

Possible conceptual levels:

**Essential**
- headings,
- paragraphs,
- lists,
- bold,
- italic,
- links,
- images,
- code.

**Extended**
- tables,
- task lists,
- strikethrough,
- fenced code,
- footnotes,
- syntax highlighting.

**Advanced**
- front matter,
- HTML,
- math,
- diagrams,
- custom attributes/extensions.

**Full**
- custom CSS,
- document styling,
- advanced extensions and plugins where appropriate.

These levels should influence UI complexity, not destroy unsupported content.

---

## 17. Structural Editing

Editing should support semantic operations in addition to character-based editing.

Potential structural units:

- word,
- sentence,
- line,
- paragraph,
- heading,
- section,
- list item,
- list,
- table,
- code block.

Potential operations:

- select,
- cut,
- copy,
- paste,
- delete,
- duplicate,
- move up,
- move down,
- indent/outdent,
- promote/demote heading,
- convert block type where safe.

The command system should be designed similarly to a composable editor grammar:

```text
operation + object
```

Examples:

- select paragraph,
- copy section,
- delete list item,
- move section down,
- promote heading,
- copy code block.

These operations should be callable through keyboard shortcuts, menus, accessibility controls, and potentially voice commands.

---

## 18. Screen Reader Support

The application must expose meaningful semantic structure to platform accessibility systems.

Target testing should include, where practical:

### Windows
- NVDA
- Narrator
- JAWS when available

### macOS
- VoiceOver

### Linux
- Orca

Requirements:

- predictable focus,
- appropriate roles/names/states,
- headings exposed as headings,
- links exposed as links,
- tables exposed structurally,
- images expose alternative text,
- code blocks identifiable,
- editing context available,
- dynamic updates do not unnecessarily steal focus,
- user position is preserved,
- keyboard navigation remains functional with screen readers active.

The application should not rely on one specific screen reader to compensate for poor application semantics.

---

## 19. Built-In Reading Assistance

The application may provide its own reading assistance in addition to compatibility with external screen readers.

Possible capabilities:

- read current sentence,
- repeat sentence,
- read current paragraph,
- repeat paragraph,
- read section,
- read from current position,
- pause/resume speech,
- next/previous semantic unit,
- announce current position,
- announce section summary.

Where text-to-speech is implemented, it should use platform-appropriate speech services and coexist cleanly with screen readers.

Speech verbosity should be configurable.

---

## 20. Low-Vision and Visual Accessibility

Users should be able to control:

- font family,
- font size,
- line height,
- word spacing,
- letter spacing,
- paragraph spacing,
- content width,
- margins,
- foreground color,
- background color,
- link appearance,
- heading appearance,
- code-block appearance.

The application must preserve usability under:

- large text,
- high zoom,
- increased spacing,
- narrow windows,
- high-contrast environments.

Layouts should reflow rather than requiring unnecessary horizontal scrolling for ordinary prose.

Focus indicators must remain visible.

Color must not be the sole indicator of meaning.

Motion and animation should be optional or respect reduced-motion preferences.

---

## 21. Keyboard Accessibility

Every core action should be possible without a mouse.

Requirements:

- visible focus,
- predictable tab order,
- keyboard-accessible menus,
- keyboard-accessible dialogs,
- keyboard-accessible search,
- keyboard-accessible layout switching,
- keyboard-accessible structural navigation,
- configurable shortcuts.

The application should avoid trapping focus unexpectedly.

Shortcuts should be discoverable.

---

## 22. Voice and Alternative Input

The command architecture should make future voice support practical.

Voice commands should map to semantic operations rather than simulate arbitrary mouse movement.

Examples:

- "next heading,"
- "read this paragraph,"
- "repeat sentence,"
- "select section,"
- "copy paragraph,"
- "move section down,"
- "find virtual memory,"
- "return to reading position."

Voice support should not be required for basic accessibility, but the architecture should not prevent it.

---

## 23. Accessibility-Aware Authoring

The editor should analyze Markdown for accessibility-related issues.

Potential checks include:

### Headings
- skipped heading levels,
- malformed hierarchy,
- empty headings.

### Images
- missing alt text,
- empty alt text where likely inappropriate,
- suspicious filename-only alt text.

### Links
- ambiguous link text such as "click here,"
- empty links,
- repeated indistinguishable link text where context is insufficient.

### Tables
- missing header structure,
- malformed tables,
- excessively complex structures where practical to detect.

### Document structure
- extremely long unbroken paragraphs,
- missing document title where relevant,
- inaccessible embedded HTML patterns where detectable.

Results should:

- explain the issue,
- identify its location,
- provide guidance,
- avoid automatically modifying the document without permission.

---

## 24. Reader Customization and Profiles

The application may support profiles such as:

- Standard,
- Book,
- Low Vision,
- Screen Reader Optimized,
- Reduced Distraction,
- Custom.

Profiles should be combinations of settings and interaction defaults, not separate reduced-feature applications.

Users should retain access to the same core capabilities.

---

## 25. Themes and Styling

### 25.1 Reader themes

Users should be able to customize:

- colors,
- typography,
- spacing,
- page appearance.

### 25.2 Backgrounds

Optional background colors or images may be supported provided readability and accessibility safeguards remain available.

### 25.3 Document CSS

Advanced users may be allowed to apply CSS to rendered Markdown.

Security boundaries must be maintained.

The application should distinguish between:

- application UI styling,
- reader theme styling,
- document-specific styling.

Custom document styling must not compromise application controls or privileged Electron/Node functionality.

---

## 26. Markdown Compatibility

The application should aim for broad compatibility.

Expected support should include:

- CommonMark-compatible Markdown,
- GitHub Flavored Markdown features,
- tables,
- task lists,
- fenced code blocks,
- syntax highlighting,
- autolinks,
- strikethrough.

Advanced/optional support may include:

- front matter,
- footnotes,
- math,
- Mermaid or similar diagrams,
- embedded HTML,
- custom attributes,
- custom CSS,
- plugin/extension syntax.

Unsupported syntax should be preserved wherever possible rather than silently destroyed.

---

## 27. Code Blocks

Code blocks should support:

- syntax highlighting,
- copy-code action,
- keyboard-accessible navigation,
- screen-reader identification,
- language announcement where known.

Long code blocks must work in both continuous and paginated reading modes.

Pagination should clearly indicate continuation when a code block spans pages.

---

## 28. Tables

Tables should be:

- rendered clearly,
- navigable by keyboard where practical,
- exposed semantically to screen readers,
- readable under zoom/reflow constraints.

Large tables may require an alternative interaction pattern such as local horizontal scrolling rather than breaking the entire document layout.

Table navigation should identify:

- headers,
- row/column position,
- current cell context where possible.

---

## 29. Images

Images should:

- render within page/content bounds,
- preserve aspect ratio,
- expose alt text,
- support accessible authoring checks,
- avoid breaking pagination.

The reader may offer an image description panel using existing alt text and metadata.

Automatic AI image description is outside the core requirement unless explicitly added later.

---

## 30. Document Outline and Table of Contents

The application should generate an outline from headings.

Users should be able to:

- view current heading hierarchy,
- jump to headings,
- collapse/expand sections in the outline,
- navigate outline by keyboard,
- use outline with screen readers,
- understand current location.

The outline should remain synchronized with reader/editor position.

---

## 31. Bookmarks and Reading History

Users should be able to create bookmarks.

Bookmarks should reference semantic locations.

A bookmark may include:

- file,
- heading path,
- block,
- note/label,
- timestamp.

Reading history should support returning through recently visited locations.

History should work across:

- links,
- searches,
- files/chapters,
- outline jumps.

---

## 32. Reading Progress

The application may report:

- current page,
- total pages in current layout,
- percentage through document,
- current chapter,
- overall book/document-set progress,
- estimated remaining reading time.

Because pagination changes with layout, semantic progress should be preferred for persistent reporting.

---

## 33. Application State and Persistence

Persist user preferences such as:

- reader mode,
- last-opened documents,
- reading position,
- bookmarks,
- theme,
- typography,
- spacing,
- accessibility preferences,
- keyboard shortcuts,
- recent files,
- window size/position where appropriate.

User documents should remain separate from application settings.

---

## 34. Desktop Integration

The application should support standard desktop behaviors:

- `.md` file association,
- Open File,
- drag-and-drop Markdown files,
- recent files,
- operating-system menus,
- standard save/save-as behavior,
- window management,
- native dialogs where appropriate.

Future integration may include:

- system share actions,
- print,
- export,
- open-containing-folder,
- file-reveal actions.

---

## 35. Security Architecture

Electron security boundaries must be treated seriously.

### 35.1 Renderer

The React renderer should not receive unrestricted Node.js access.

### 35.2 Preload bridge

Expose a minimal, intentional API through Electron `contextBridge`.

### 35.3 Main process

Privileged operations such as:

- filesystem access,
- native dialogs,
- application lifecycle,
- OS integration,

should occur in the main process or trusted helpers.

### 35.4 Markdown rendering

Rendered Markdown must be sanitized appropriately.

Embedded HTML, custom CSS, images, links, and extension content must not become a path to arbitrary code execution.

### 35.5 External links

External links should be handled deliberately and should not gain access to privileged Electron APIs.

---

## 36. Technical Direction

Intended primary stack:

- Node.js
- Electron
- React
- Vite
- Vitest

Likely architectural areas:

```text
Electron Main Process
    |
    | IPC
    v
Preload Bridge
    |
    v
React Renderer
    |
    +-- Reader
    +-- Editor
    +-- Document Model
    +-- Search
    +-- Pagination
    +-- Accessibility
```

The implementation should favor modular separation of concerns without splitting trivial behavior into unnecessary abstractions.

---

## 37. Testing

Testing should cover more than ordinary unit tests.

### 37.1 Unit tests

Examples:

- Markdown parsing,
- semantic position mapping,
- search grouping,
- heading hierarchy,
- accessibility checks,
- pagination helpers,
- structural operations.

### 37.2 Component tests

Examples:

- rendered document components,
- search UI,
- outline,
- editor/preview synchronization,
- accessibility settings.

### 37.3 Integration tests

Examples:

- opening files,
- saving files,
- file associations,
- navigation history,
- reading-position restoration,
- linked Markdown navigation.

### 37.4 Accessibility tests

Automated accessibility checks should be used where useful but must not replace human testing.

Manual testing should include:

- keyboard-only operation,
- macOS VoiceOver,
- Windows NVDA,
- Windows Narrator,
- JAWS when available,
- Linux Orca when practical,
- high contrast,
- large text,
- increased spacing,
- reduced motion,
- zoom/reflow.

### 37.5 Long-document tests

Use large Markdown documents with:

- thousands of lines,
- many headings,
- code blocks,
- images,
- tables,
- local links,
- multiple linked files.

The application should remain responsive and should not lose reading position.

---

## 38. Performance Expectations

The application should feel lightweight despite using Electron.

Important performance goals:

- fast startup,
- fast opening of ordinary Markdown files,
- responsive navigation,
- responsive editing,
- efficient rendering of very large documents,
- efficient search,
- no unnecessary full-document reprocessing on every small action where avoidable,
- stable memory usage for long documents.

Large files should not become unusable merely because they contain thousands of lines.

---

## 39. Error Handling

Errors should be understandable and recoverable.

Examples:

- unreadable file,
- malformed extension syntax,
- missing linked file,
- invalid image path,
- save conflict,
- permission failure.

The application should not destroy content merely because it cannot fully render an extension.

Where possible, preserve raw source and explain the unsupported feature.

---

## 40. Privacy and Offline Operation

Core reading and editing should work offline.

No account should be required.

No document content should leave the local machine for ordinary operation.

Any future network-based or AI-powered capability must be explicit and optional.

---

## 41. Export and Interoperability

Possible export formats may include:

- HTML,
- PDF,
- print.

Export is secondary to preserving the original Markdown file.

The application must never require export for ordinary reading.

---

## 42. HCI Principles

The product should follow several global interaction principles.

### 42.1 Do not unexpectedly move the user

Avoid unexpected:

- scroll jumps,
- focus jumps,
- page jumps,
- cursor movement,
- context resets.

### 42.2 Preserve orientation

Users should be able to answer:

- Where am I?
- What section am I in?
- How much is left?
- What is around me?
- Where was I before I navigated here?

### 42.3 Provide overview before traversal

Where useful, give users structural information before forcing them to consume content sequentially.

### 42.4 Recognition over recall

Expose headings, history, bookmarks, outlines, and search context rather than expecting users to remember locations.

### 42.5 Multiple equivalent interaction paths

Important actions should be reachable through more than one input style.

### 42.6 Progressive disclosure

Advanced controls should exist without overwhelming users who only need basic functionality.

### 42.7 Accessibility improvements should improve general UX

Features such as:

- semantic navigation,
- persistent position,
- large text,
- keyboard shortcuts,
- low-distraction layouts,
- structural search,

should be useful to all users rather than hidden as special accommodations.

---

## 43. WCAG / Accessibility Design Targets

The application should be designed with WCAG 2.2 principles in mind, including:

- perceivable information,
- operable controls,
- understandable behavior,
- robust semantics,
- keyboard accessibility,
- visible focus,
- reflow,
- text resizing,
- text spacing,
- sufficient contrast,
- alternatives for non-text content,
- no reliance on color alone,
- reduced unnecessary motion,
- sufficient target sizes,
- accessible names and roles,
- predictable focus and navigation.

Because this is a desktop application, WCAG should be used together with platform accessibility guidance and real assistive-technology testing rather than treated as the sole compliance mechanism.

---

## 44. Product Non-Goals

The application is not intended to become:

- a general-purpose source-code IDE,
- an office suite,
- a proprietary note database,
- a mandatory cloud sync service,
- a social network,
- a project-management system,
- a general-purpose text editor for every file format,
- a full replacement for operating-system screen readers.

It may integrate with or complement those tools.

---

## 45. Definition of the Finished Product

The product should ultimately feel like this:

A user double-clicks a Markdown file and immediately receives a clean, rendered document.

If the file is long, they can read it continuously or like a book.

If they close it and return later, the application remembers exactly where they were.

If they follow a link, search, or jump to another chapter, they can return to their prior location.

If they cannot see the screen, they can understand the structure before entering a section, navigate semantically, repeat content, inspect context, search intelligently, and edit the document without being forced into character-by-character discovery.

If they have low vision, they can change typography, spacing, contrast, and layout without breaking the document or losing position.

If they use only a keyboard or voice input, the same capabilities remain available.

If they want to edit, they can work in raw Markdown, live rendering, or split view.

If they are an advanced author, they can work with rich Markdown extensions and styling.

If they are writing content for others, the application can identify accessibility problems before publication.

If they open a folder or collection of linked Markdown files, those files can behave like a book or technical documentation set while remaining ordinary Markdown on disk.

The application should never require users to surrender ownership of their files to gain these capabilities.

---

## 46. Central Design Question

A useful question for evaluating future features:

> What information or capability does a sighted, mouse-using reader obtain almost automatically that a blind, low-vision, keyboard-only, motor-impaired, or cognitively overloaded user currently has to work harder to obtain?

Where the application can remove that asymmetry without harming other users, it should.

---

## 47. Product Identity

The intended identity of the application is:

> **A filesystem-first, accessibility-first Markdown reader and editor built for serious reading, long documents, semantic navigation, and powerful authoring without proprietary lock-in.**

Or, more simply:

> **Open Markdown. Read it well. Edit it well. Never lose your place.**
