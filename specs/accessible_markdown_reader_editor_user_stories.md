# Accessible Markdown Reader & Editor — Comprehensive User Stories

This document contains implementation-oriented user stories for the complete Accessible Markdown Reader & Editor product. It is intentionally broad and redundant in places so stories can later be grouped into epics, acceptance criteria, test cases, or implementation tasks.

---

# 1. File Opening and Filesystem Behavior

- As a reader, I want to double-click a `.md` file and have it open directly in the application so that I do not have to launch an IDE first.
- As a reader, I want the application to open directly into rendered reading mode so that I can start reading immediately.
- As a reader, I want to open a Markdown file from the application menu so that I can browse for documents normally.
- As a reader, I want to drag a Markdown file onto the application so that I can open it quickly.
- As a reader, I want the application to remember recently opened files so that I can return to them quickly.
- As a reader, I want the application to work with ordinary filesystem paths so that my documents remain where I put them.
- As a user, I want the application to work without creating a vault, notebook, workspace, or proprietary project so that opening one file remains simple.
- As a user, I want to associate `.md` files with the application at the OS level so that it behaves like a normal desktop reader.
- As a user, I want to open multiple Markdown files without importing them into a database so that the application does not take ownership of my content.
- As a user, I want unsupported Markdown syntax preserved when I save so that the application does not destroy content it does not understand.
- As an author, I want edits saved back to the original `.md` file so that the file remains usable by other tools.
- As an author, I want Save As support so that I can create a new copy without overwriting the original.
- As a user, I want the application to warn me when a file becomes unavailable or is moved so that I understand why it cannot reopen.
- As a user, I want the application to handle filenames containing spaces and Unicode characters correctly.
- As a user, I want the application to handle very long file paths gracefully.
- As a user, I want the application to open files from external drives and network-mounted locations when the OS permits it.
- As a user, I want the application to remain useful offline so that reading and editing do not depend on internet access.
- As a user, I do not want an account requirement so that local Markdown remains local.
- As a privacy-conscious user, I want my document contents to stay on my computer during normal use.
- As a user, I want clear errors when the application lacks permission to read or save a file.

---

# 2. Default Reading Experience

- As a reader, I want to see only the rendered version of a Markdown file by default so that syntax does not distract me.
- As a reader, I want the rendered document to feel like a document rather than a developer preview pane.
- As a reader, I want headings, paragraphs, lists, links, tables, images, and code blocks rendered clearly.
- As a reader, I want readable typography by default so that long-form reading is comfortable.
- As a reader, I want the interface to minimize unnecessary chrome while reading.
- As a reader, I want controls to stay discoverable without permanently occupying large amounts of reading space.
- As a reader, I want to switch between reading and editing without reopening the file.
- As a reader, I want my position preserved when switching between reading and editing.
- As a reader, I want to choose between continuous scrolling and paginated reading.
- As a reader, I want to change reading modes without being returned to the top of the document.
- As a reader, I want to hide optional panels such as outlines or search results so that I can focus on the document.
- As a reader, I want local links to feel like document navigation rather than application switching.
- As a reader, I want external web links to open predictably and safely.
- As a reader, I want code blocks to remain selectable and copyable.
- As a reader, I want tables to remain readable rather than being flattened into plain text.
- As a reader, I want images to fit the available reading area without distorting their aspect ratio.

---

# 3. Persistent Reading Position

- As a reader, I want to reopen a file at the exact place I stopped reading so that I do not have to rediscover my position.
- As a reader, I want my place preserved after closing and reopening the application.
- As a reader, I want my place preserved after switching to another file and returning.
- As a reader, I want my place preserved when switching between reader and editor views.
- As a reader, I want my place preserved when changing font size.
- As a reader, I want my place preserved when changing line spacing.
- As a reader, I want my place preserved when resizing the window.
- As a reader, I want my place preserved when switching between single-page and two-page layouts.
- As a reader, I want my place preserved when switching between continuous and paginated modes.
- As a low-vision reader, I want changing zoom or typography to reflow the page without losing the paragraph I was reading.
- As a reader, I want the application to remember semantic location rather than only scroll offset.
- As a reader, I want the application to return to the same paragraph even if repagination changes the page number.
- As a reader, I want to return to my original location after following an internal link.
- As a reader, I want to return to my original location after following a link to another Markdown file.
- As a reader, I want to return to my original location after jumping from search results.
- As a reader, I want to return to my original location after using the outline.
- As a reader, I want a navigation history so that I can move backward and forward through recently visited locations.
- As a reader, I want the application to remember separate reading positions for different files.
- As a reader, I want bookmarks and reading position to survive application restarts.
- As a reader, I want reopening a book-like collection to restore both the chapter and position within that chapter.

---

# 4. Book-Like Reading

- As a reader, I want long Markdown documents to feel like books rather than endless webpages.
- As a reader, I want a paginated reading mode.
- As a reader, I want to move to the next page with the Right Arrow key.
- As a reader, I want to move to the previous page with the Left Arrow key.
- As a reader, I want swipe gestures to change pages where supported.
- As a reader, I want visible next/previous page controls when I prefer pointer navigation.
- As a reader, I want one page displayed when the window is narrow.
- As a reader, I want a two-page spread when the window is wide enough.
- As a reader, I want the layout to adapt automatically when I resize the window.
- As a reader, I want to manually choose single-page mode even on a wide monitor.
- As a reader, I want to manually choose continuous mode when paginated reading is not appropriate.
- As a reader, I want readable page margins and line lengths.
- As a reader, I want pages to avoid awkwardly stranding headings at the bottom.
- As a reader, I want short code blocks to stay together on one page when practical.
- As a reader, I want long code blocks to continue clearly across pages when they cannot fit.
- As a reader, I want large tables handled without making the rest of the page unreadable.
- As a reader, I want images constrained to page bounds.
- As a reader, I want to know my current page when pagination is enabled.
- As a reader, I want to know my percentage through the document.
- As a reader, I want to know which chapter or section I am currently reading.
- As a reader, I want an estimate of how much of the document remains.
- As a reader, I want reading progress to remain meaningful even if the number of pages changes because I changed text size.
- As a reader, I want a full-screen or distraction-reduced book view when I want to focus on reading.
- As a reader, I want a reading experience comparable to the Mac Books app while still reading ordinary Markdown files.

---

# 5. Multi-File Books and Documentation Sets

- As a reader, I want linked `.md` files to behave like chapters.
- As a reader, I want a link such as `[Next](chapter-02.md)` to open inside the application.
- As a reader, I want links with heading anchors to open the correct section in another Markdown file.
- As a reader, I want Back to return me to the exact point I left.
- As a reader, I want Forward to restore the location I navigated away from.
- As a reader, I want a folder of connected Markdown files to behave like a documentation set.
- As a reader, I want a table of contents that can span multiple Markdown files.
- As a reader, I want next-chapter and previous-chapter navigation.
- As a reader, I want cross-file search within a Markdown book or documentation set.
- As a reader, I want bookmarks to work across files.
- As a reader, I want overall progress through a multi-file collection.
- As a reader, I want each source file to remain an ordinary Markdown file on disk.
- As an author, I want existing relative links to continue working outside this application.
- As a user, I do not want the application to rewrite file links into proprietary references.
- As a reader, I want missing linked files reported clearly.
- As a reader, I want circular links to behave like normal navigation without confusing history.
- As a reader, I want linked local images and assets to resolve relative to the Markdown file.
- As a reader, I want a collection to remain useful even if some files contain unsupported extensions.

---

# 6. Search and Smart Find

- As a reader, I want normal Ctrl/Cmd+F search.
- As a reader, I want search results highlighted in the rendered document.
- As a reader, I want to move to the next search result.
- As a reader, I want to move to the previous search result.
- As a reader, I want to know how many results were found.
- As a developer reading a 4,000-line README, I want search results grouped by section.
- As a reader, I want search results grouped by heading hierarchy.
- As a reader, I want search results to show nearby context.
- As a reader, I want search results to identify the file or chapter in multi-file collections.
- As a reader, I want to search only the current section.
- As a reader, I want to search only headings.
- As a reader, I want to search only links.
- As a reader, I want to search only code blocks.
- As a reader, I want to search across an entire Markdown book or documentation set.
- As a reader, I want search results to preserve my original reading position.
- As a reader, I want a command to return to where I was before searching.
- As a reader, I want search result groups to be keyboard navigable.
- As a screen-reader user, I want search result counts announced accessibly.
- As a screen-reader user, I want the heading and section context of a search result announced before I jump to it.
- As a screen-reader user, I want to navigate search results without losing orientation.
- As a developer, I want code search results distinguished from prose search results.
- As a reader, I want case-sensitive search when I need it.
- As a reader, I want whole-word search when I need it.
- As an author, I want search-and-replace in editing mode.
- As an author, I want replace operations scoped to the current section or entire document.
- As an author, I want a preview or count before performing a large replace operation.

---

# 7. Document Outline and Structural Navigation

- As a reader, I want a generated outline based on headings.
- As a reader, I want to jump directly to a heading from the outline.
- As a reader, I want the outline to show heading hierarchy.
- As a reader, I want the current section reflected in the outline.
- As a reader, I want to collapse and expand outline sections.
- As a keyboard-only user, I want the outline fully navigable without a mouse.
- As a screen-reader user, I want the outline exposed semantically.
- As a reader, I want to navigate to the next heading.
- As a reader, I want to navigate to the previous heading.
- As a reader, I want to navigate to the next paragraph.
- As a reader, I want to navigate to the previous paragraph.
- As a reader, I want to navigate to the next sentence.
- As a reader, I want to navigate to the previous sentence.
- As a reader, I want to navigate to the next link.
- As a reader, I want to navigate to the previous link.
- As a reader, I want to navigate to the next image.
- As a reader, I want to navigate to the next list.
- As a reader, I want to navigate to the next table.
- As a reader, I want to navigate to the next code block.
- As a reader, I want a command that tells me my current heading and section.
- As a reader, I want a command that tells me how far I am through the current section.
- As a reader, I want navigation shortcuts to be configurable.
- As a reader, I want semantic navigation commands exposed through menus as well as shortcuts.
- As a voice-control user, I want semantic navigation commands that can map cleanly to voice commands.

---

# 8. Section Preview and Structural Summary

- As a blind reader, I want a section breakdown before I enter a new heading.
- As a blind reader, I want to know how many paragraphs are in the upcoming section.
- As a blind reader, I want to know how many subheadings are in the upcoming section.
- As a blind reader, I want to know whether the section contains links.
- As a blind reader, I want to know whether the section contains images.
- As a blind reader, I want to know whether the section contains tables.
- As a blind reader, I want to know whether the section contains lists.
- As a blind reader, I want to know whether the section contains code blocks.
- As a blind reader, I want an estimated reading time before starting a section.
- As a blind reader, I want an estimated word count for a section.
- As a blind reader, I want section summaries available on demand rather than forced every time.
- As a blind reader, I want to configure how much detail section summaries contain.
- As a reader, I want a structural summary of a very long chapter before committing to reading it.
- As a reader with cognitive accessibility needs, I want to preview document complexity before entering a section.
- As a screen-reader user, I want section summaries announced without moving my reading position.
- As a reader, I want section summaries to identify unusually large tables or code blocks.
- As a reader, I want a section summary to tell me how many pages the section currently spans in paginated mode.

---

# 9. Repeat and Reading Assistance

- As a blind reader, I want to repeat the current sentence.
- As a blind reader, I want to repeat the current paragraph.
- As a blind reader, I want to repeat the current section.
- As a reader, I want to start reading from the current paragraph.
- As a reader, I want to start reading from the current heading.
- As a reader, I want to resume reading from my saved position.
- As a reader, I want to pause and resume built-in text-to-speech if I use it.
- As a reader, I want to move speech to the next sentence.
- As a reader, I want to move speech to the previous sentence.
- As a reader, I want to move speech to the next paragraph.
- As a reader, I want the application to announce heading levels when helpful.
- As a reader, I want to configure speech verbosity.
- As a reader, I want speech to identify links, images, tables, and code blocks where useful.
- As a screen-reader user, I want built-in speech features to coexist cleanly with my screen reader.
- As a reader, I want the application to avoid speaking unnecessary interface noise while reading.
- As a reader, I want a command that announces my current location without moving it.

---

# 10. Reader Selection and Copying

- As a reader, I want to copy text without entering edit mode.
- As a reader, I want to select text with the mouse in rendered mode.
- As a keyboard-only reader, I want to select text without using the mouse.
- As a reader, I want to select the current word.
- As a reader, I want to select the current sentence.
- As a reader, I want to select the current paragraph.
- As a reader, I want to select the current section.
- As a reader, I want to select the current code block.
- As a reader, I want to copy the current sentence.
- As a reader, I want to copy the current paragraph.
- As a reader, I want to copy the current section.
- As a reader, I want to copy a code block with one action.
- As a reader, I want to copy link text.
- As a reader, I want to copy a link target.
- As a reader, I want copied text to remain useful plain text.
- As a screen-reader user, I want a copy action to confirm what structural unit was copied.
- As a reader, I want copying to leave my reading position unchanged.

---

# 11. Keyboard-Only Interaction

- As a keyboard-only user, I want every core application function accessible without a mouse.
- As a keyboard-only user, I want predictable Tab navigation.
- As a keyboard-only user, I want visible focus at all times.
- As a keyboard-only user, I want focus to remain on the control or content I intentionally navigated to.
- As a keyboard-only user, I want to open files through the keyboard.
- As a keyboard-only user, I want to close files through the keyboard.
- As a keyboard-only user, I want to switch between open documents through the keyboard.
- As a keyboard-only user, I want to switch between reader and editor through the keyboard.
- As a keyboard-only user, I want to move between editor and preview panes through the keyboard.
- As a keyboard-only user, I want to navigate pages with arrow keys.
- As a keyboard-only user, I want to navigate headings with simple shortcuts.
- As a keyboard-only user, I want to navigate paragraphs with simple shortcuts.
- As a keyboard-only user, I want to navigate links, images, tables, and code blocks with simple shortcuts.
- As a keyboard-only user, I want shortcuts to be discoverable.
- As a keyboard-only user, I want shortcuts to be configurable.
- As a keyboard-only user, I want conflicting shortcuts detected before saving custom bindings.
- As a keyboard-only user, I want an easy way to reset custom shortcuts to defaults.
- As a motor-impaired user, I want commands that reduce the need for precise selection gestures.
- As a motor-impaired user, I want drag actions to have keyboard alternatives.
- As a keyboard-only user, I do not want focus trapped unexpectedly in an editor or pane.

---

# 12. Low-Vision Reading

- As a low-vision reader, I want to increase font size significantly.
- As a low-vision reader, I want text to reflow when enlarged.
- As a low-vision reader, I want to change line spacing.
- As a low-vision reader, I want to change paragraph spacing.
- As a low-vision reader, I want to change word spacing.
- As a low-vision reader, I want to change character spacing.
- As a low-vision reader, I want to control content width.
- As a low-vision reader, I want to control page margins.
- As a low-vision reader, I want to choose a font family that works well for me.
- As a low-vision reader, I want to customize foreground color.
- As a low-vision reader, I want to customize background color.
- As a low-vision reader, I want to customize link appearance.
- As a low-vision reader, I want headings to remain visually distinguishable under custom themes.
- As a low-vision reader, I want code blocks to remain readable under custom themes.
- As a low-vision reader, I want focus indicators to remain visible in high-contrast modes.
- As a low-vision reader, I want color not to be the only way the app communicates state.
- As a low-vision reader, I want changes to font and spacing to preserve reading position.
- As a low-vision reader, I want paginated mode to reflow cleanly after display changes.
- As a low-vision reader, I want the interface usable at high zoom without clipping controls.
- As a low-vision reader, I want ordinary prose to avoid unnecessary horizontal scrolling.

---

# 13. Cognitive and Distraction-Reduction Features

- As a reader with attention difficulties, I want a reduced-distraction reading mode.
- As a reader, I want to hide nonessential controls while reading.
- As a reader, I want to highlight the current paragraph if that helps me stay oriented.
- As a reader, I want to highlight the current sentence if that helps me stay oriented.
- As a reader, I want focus highlighting to be optional.
- As a reader, I want reduced-motion behavior.
- As a reader, I want page transitions that do not cause disorientation.
- As a reader, I want predictable layouts that do not move unexpectedly.
- As a reader, I want the current section clearly identifiable.
- As a reader, I want section length information to help me plan reading effort.
- As a reader, I want reading-time estimates to help me decide whether to continue now or later.
- As a reader, I want customizable content width to reduce visual crowding.
- As a reader, I want saved reading profiles so that I do not have to reconfigure the app each time.

---

# 14. Raw Markdown Editing

- As an author, I want to edit raw Markdown directly.
- As an author, I want Markdown syntax highlighting.
- As an author, I want editor line numbers optionally available.
- As an author, I want standard undo and redo.
- As an author, I want standard cut, copy, and paste.
- As an author, I want search and replace.
- As an author, I want the editor to preserve line endings where practical.
- As an author, I want the editor to preserve unsupported syntax.
- As an author, I want to save without the editor silently reformatting my entire file.
- As an author, I want clear indication of unsaved changes.
- As an author, I want a save command that does not change my cursor or reading position.
- As an author, I want autosave to be optional.
- As an author, I want external file changes detected before I accidentally overwrite them.
- As an author, I want conflict warnings if both the disk file and my editor buffer changed.
- As an author, I want large Markdown files to remain responsive while editing.
- As an author, I want fenced code blocks to retain their language identifiers.
- As an author, I want Markdown comments or extension syntax preserved where supported by the source format.

---

# 15. Split Editor and Preview

- As an author, I want a side-by-side source and rendered view.
- As an author, I want the preview to update as I type.
- As an author, I want the rendered preview to reflect the same application state as the editor.
- As an author, I want editor and preview positions synchronized where practical.
- As an author, I want selecting a heading in the preview to help me locate the corresponding source.
- As an author, I want moving to a source section to update the preview location.
- As an author, I want to resize the source and preview panes.
- As a keyboard-only author, I want to resize or switch panes without dragging.
- As an author, I want to hide either pane when I need more space.
- As an author, I want my pane sizes remembered.
- As a screen-reader user, I want editor and preview panes named clearly.
- As a screen-reader user, I want switching panes to preserve context.
- As an author, I want preview rendering errors surfaced without destroying my source text.

---

# 16. Rendered or WYSIWYM Editing

- As an author, I want an optional rendered editing mode so that I can edit without constantly seeing Markdown syntax.
- As an author, I want rendered editing to preserve the underlying Markdown accurately.
- As an author, I do not want rendered editing to silently destroy advanced syntax.
- As an author, I want to switch between rendered editing and raw source without losing position.
- As an author, I want rendered editing to expose formatting structure accessibly.
- As a screen-reader user, I want the current block type announced in rendered editing mode.
- As an author, I want difficult or unsupported syntax to fall back safely to source editing instead of being mangled.
- As an author, I want to know when a feature cannot safely be edited in rendered mode.

---

# 17. Structural Editing

- As an author, I want to select the current word with a structural command.
- As an author, I want to select the current sentence with a structural command.
- As an author, I want to select the current line with a structural command.
- As an author, I want to select the current paragraph with a structural command.
- As an author, I want to select the current section with a structural command.
- As an author, I want to select the current list item.
- As an author, I want to select the current list.
- As an author, I want to select the current code block.
- As an author, I want to select the current table.
- As an author, I want to copy the selected structural unit.
- As an author, I want to cut the selected structural unit.
- As an author, I want to delete the selected structural unit.
- As an author, I want to duplicate the selected structural unit.
- As an author, I want to move a paragraph up or down.
- As an author, I want to move a section up or down.
- As an author, I want to move a list item up or down.
- As an author, I want to promote a heading.
- As an author, I want to demote a heading.
- As an author, I want moving a heading with its section to preserve all child content.
- As an author, I want safe indentation and outdent operations for lists.
- As an author, I want structural commands to behave consistently across keyboard, menus, and voice commands.
- As a Vim-oriented user, I want concise command patterns that operate on meaningful text objects.
- As a voice-control user, I want commands like "select paragraph" and "move section down."
- As a screen-reader user, I want structural editing operations announced after completion.
- As an author, I want undo to correctly restore structural edits.

---

# 18. Simple-to-Advanced Authoring

- As a beginner, I want a simple editing experience focused on common Markdown.
- As a beginner, I want easy controls for headings, lists, bold, italic, links, images, and code.
- As a beginner, I do not want advanced syntax options cluttering the interface by default.
- As an intermediate user, I want access to tables, task lists, strikethrough, footnotes, and fenced code.
- As an advanced user, I want front matter support.
- As an advanced user, I want embedded HTML support where allowed.
- As an advanced user, I want math support.
- As an advanced user, I want diagram syntax such as Mermaid where supported.
- As an advanced user, I want custom attributes or extension syntax preserved.
- As an advanced user, I want document-level custom CSS support.
- As an advanced user, I want syntax highlighting for complex Markdown constructs.
- As an author, I want switching to a simpler UI mode to leave advanced syntax untouched.
- As an author, I want unsupported extension syntax shown safely rather than deleted.
- As an author, I want the application to tell me when a feature is unsupported.

---

# 19. Screen Reader Editing

- As a screen-reader user, I want the current structural context announced while editing.
- As a screen-reader user, I want to know whether I am inside a heading.
- As a screen-reader user, I want to know the current heading level.
- As a screen-reader user, I want to know whether I am inside a paragraph.
- As a screen-reader user, I want to know whether I am inside a list.
- As a screen-reader user, I want to know my list-item position.
- As a screen-reader user, I want to know whether I am editing a link.
- As a screen-reader user, I want link text and target distinguishable.
- As a screen-reader user, I want to know whether I am editing an image.
- As a screen-reader user, I want image alt text accessible while editing.
- As a screen-reader user, I want to know whether I am editing a table.
- As a screen-reader user, I want table row and column context.
- As a screen-reader user, I want to know whether I am editing a code block.
- As a screen-reader user, I want the code-block language announced when known.
- As a screen-reader user, I want inserted structural elements announced.
- As a screen-reader user, I want deleted structural elements announced.
- As a screen-reader user, I want heading promotions and demotions announced.
- As a screen-reader user, I want moved sections announced.
- As a screen-reader user, I want undo and redo changes announced meaningfully.
- As a screen-reader user, I want save status announced.
- As a screen-reader user, I want editing to remain navigable by character, word, sentence, paragraph, and structure.
- As a screen-reader user, I want focus to remain stable after live preview updates.

---

# 20. Accessibility-Aware Authoring

- As an author, I want the application to warn me when an image is missing alt text.
- As an author, I want suspicious filename-only alt text flagged.
- As an author, I want heading-level skips identified.
- As an author, I want empty headings identified.
- As an author, I want malformed heading hierarchies explained.
- As an author, I want ambiguous link text such as "click here" flagged.
- As an author, I want empty links identified.
- As an author, I want repeated indistinguishable links highlighted when context may be insufficient.
- As an author, I want tables without meaningful header structure flagged.
- As an author, I want malformed tables identified.
- As an author, I want extremely long unbroken paragraphs flagged as a possible readability issue.
- As an author, I want inaccessible embedded HTML patterns flagged where they can be detected.
- As an author, I want each accessibility issue linked to the relevant source location.
- As an author, I want accessibility warnings explained in plain language.
- As an author, I want suggested fixes without automatic changes unless I approve them.
- As an author, I want to mark an issue as intentionally accepted when appropriate.
- As an author, I want to rerun accessibility checks after changes.
- As an author, I want a document-level summary of accessibility findings.
- As an author, I want accessibility checks to work in both raw and rendered editing modes.
- As an author, I want accessibility analysis to remain useful even when the Markdown will be published outside this application.

---

# 21. Tables

- As a reader, I want Markdown tables rendered clearly.
- As a keyboard-only reader, I want to navigate table cells without using a mouse.
- As a screen-reader user, I want table headers exposed semantically.
- As a screen-reader user, I want row and column position announced when navigating a table.
- As a screen-reader user, I want the relevant header announced with the current cell.
- As a reader, I want very wide tables handled locally rather than forcing the whole document to scroll horizontally.
- As a low-vision reader, I want tables usable under zoom.
- As a reader in paginated mode, I want large tables to continue clearly across pages or use an alternative readable presentation.
- As an author, I want table syntax editable without corruption.
- As an author, I want table accessibility problems identified.
- As an author, I want to add or edit table headers easily.
- As a keyboard-only author, I want to move between table cells efficiently.

---

# 22. Images

- As a reader, I want images rendered within the available content area.
- As a reader, I want images to preserve aspect ratio.
- As a screen-reader user, I want image alt text announced.
- As a screen-reader user, I want to skip images quickly if I do not want their descriptions.
- As a reader, I want to open an image larger when I need more detail.
- As a keyboard-only reader, I want image viewing controls accessible without a mouse.
- As a low-vision reader, I want images enlargable without losing my document position.
- As an author, I want to edit image alt text easily.
- As an author, I want missing alt text identified.
- As an author, I want local relative image paths preserved.
- As an author, I want image-link syntax preserved accurately.
- As a reader, I want missing images indicated clearly without breaking surrounding text.

---

# 23. Code Blocks

- As a developer, I want fenced code blocks syntax highlighted.
- As a reader, I want to copy an entire code block without entering edit mode.
- As a keyboard-only reader, I want code block copy controls accessible.
- As a screen-reader user, I want a code block identified before its contents are read.
- As a screen-reader user, I want the code language announced when known.
- As a reader, I want long code blocks usable in continuous mode.
- As a reader, I want long code blocks clearly continued in paginated mode.
- As a reader, I want code blocks to preserve whitespace.
- As an author, I want fenced code language identifiers preserved.
- As an author, I want structural commands to select or move whole code blocks.
- As an author, I want preview syntax highlighting to update after I change the language identifier.

---

# 24. Links and Navigation

- As a reader, I want links visually distinguishable without relying only on color.
- As a keyboard-only reader, I want links reachable through keyboard navigation.
- As a screen-reader user, I want link text and role announced.
- As a reader, I want local Markdown links to open within the application.
- As a reader, I want heading-anchor links to navigate to the correct section.
- As a reader, I want external links to open safely in my browser.
- As a reader, I want a way to copy a link without opening it.
- As a reader, I want a way to preview or inspect a link target where practical.
- As an author, I want broken local Markdown links identified.
- As an author, I want inaccessible or ambiguous link text flagged.
- As an author, I want relative links preserved when moving between editor and rendered modes.

---

# 25. Bookmarks, History, and Progress

- As a reader, I want to bookmark the current position.
- As a reader, I want to name bookmarks.
- As a reader, I want bookmarks tied to semantic locations rather than page numbers alone.
- As a reader, I want bookmarks to survive repagination.
- As a reader, I want bookmarks to survive application restarts.
- As a reader, I want to view all bookmarks for the current document.
- As a reader, I want to view bookmarks across a multi-file book.
- As a reader, I want to delete bookmarks.
- As a reader, I want Back and Forward navigation history.
- As a reader, I want recent semantic locations preserved.
- As a reader, I want to know my percentage through a document.
- As a reader, I want to know my chapter progress.
- As a reader, I want estimated remaining reading time.
- As a reader, I want progress indicators available visually and accessibly.
- As a screen-reader user, I want progress information announced on request rather than continuously.

---

# 26. Customization and Profiles

- As a reader, I want to save my preferred reading settings.
- As a reader, I want a Standard profile.
- As a reader, I want a Book profile.
- As a low-vision reader, I want a Low Vision profile.
- As a screen-reader user, I want a Screen Reader Optimized profile.
- As a reader, I want a Reduced Distraction profile.
- As a reader, I want to create custom profiles.
- As a reader, I want profiles to change presentation and interaction defaults without removing features.
- As a user, I want to export or back up my settings where practical.
- As a user, I want to reset a profile to defaults.
- As a user, I want document-specific settings optionally remembered.
- As a user, I want global defaults when a document does not have specific settings.

---

# 27. Themes and Styling

- As a reader, I want light and dark themes.
- As a reader, I want custom foreground and background colors.
- As a reader, I want custom link styles.
- As a reader, I want custom heading styles.
- As a reader, I want custom code block styles.
- As an advanced user, I want custom CSS for rendered documents.
- As an advanced user, I want document CSS isolated from privileged application UI.
- As a user, I want unsafe CSS or HTML behavior constrained.
- As a user, I want custom styling to remain compatible with accessibility settings where possible.
- As a reader, I want background images optional rather than required.
- As a reader, I want a quick way to disable distracting backgrounds.
- As a low-vision reader, I want my custom contrast settings to override decorative themes when necessary.

---

# 28. Voice and Alternative Input

- As a voice-control user, I want to say "next heading."
- As a voice-control user, I want to say "previous paragraph."
- As a voice-control user, I want to say "repeat sentence."
- As a voice-control user, I want to say "read this section."
- As a voice-control user, I want to say "select paragraph."
- As a voice-control user, I want to say "copy section."
- As a voice-control user, I want to say "move section down."
- As a voice-control user, I want to say "find virtual memory."
- As a voice-control user, I want to say "return to reading position."
- As a voice-control user, I want voice commands to trigger the same semantic actions as keyboard commands.
- As a user of alternative input devices, I want actions available through standard focusable controls rather than only gestures.
- As a user with limited motor precision, I want sufficiently large interactive targets.
- As a user with limited motor precision, I want alternatives to dragging.

---

# 29. Markdown Compatibility

- As a user, I want CommonMark-compatible Markdown rendered correctly.
- As a developer, I want GitHub Flavored Markdown supported.
- As a user, I want task lists supported.
- As a user, I want strikethrough supported.
- As a user, I want tables supported.
- As a user, I want fenced code supported.
- As a user, I want autolinks supported.
- As an advanced user, I want front matter preserved.
- As an advanced user, I want footnotes supported where enabled.
- As an advanced user, I want math supported where enabled.
- As an advanced user, I want Mermaid or similar diagrams supported where enabled.
- As an advanced user, I want embedded HTML handled safely where enabled.
- As an advanced user, I want custom Markdown extensions preserved when unsupported.
- As a user, I want the application to tell me when a construct cannot be rendered.
- As an author, I want saving to preserve syntax the application cannot fully render.

---

# 30. Desktop Integration

- As a desktop user, I want standard Open, Save, Save As, and Close behaviors.
- As a desktop user, I want native file dialogs where appropriate.
- As a desktop user, I want recent files available from the application menu.
- As a desktop user, I want standard keyboard shortcuts for desktop actions.
- As a macOS user, I want the app to behave naturally with macOS menus and window conventions.
- As a Windows user, I want the app to behave naturally with Windows conventions.
- As a Linux user, I want the app to behave naturally with common Linux desktop conventions.
- As a user, I want the application to remember window size and position where appropriate.
- As a user, I want multiple windows or tabs handled predictably.
- As a user, I want reopening the app to restore my working context if I choose that behavior.
- As a user, I want an option to reveal the current file in the OS file manager.

---

# 31. External File Changes and Conflicts

- As a reader, I want a file that changes on disk to refresh without returning me to the top.
- As a reader, I want my semantic reading position preserved when external changes occur.
- As an author, I want to know when the file changed outside the application.
- As an author, I want to avoid silently overwriting external changes.
- As an author, I want clear options when both my editor buffer and the disk file changed.
- As an author, I want to reload the external version when I choose.
- As an author, I want to keep my local edits when I choose.
- As an author, I want to compare conflicts before deciding where practical.
- As a reader, I want broken links caused by file changes surfaced clearly.

---

# 32. Error Handling and Recovery

- As a user, I want errors explained in understandable language.
- As a user, I want a missing file reported clearly.
- As a user, I want malformed Markdown extensions handled without crashing the app.
- As a user, I want a rendering failure to preserve the source file.
- As a user, I want unsupported syntax shown as raw content where practical.
- As an author, I want save failures reported without losing my unsaved work.
- As a user, I want recovery from application crashes where practical.
- As an author, I want unsaved changes recoverable after an unexpected shutdown where practical.
- As a user, I want broken images and links indicated without blocking the rest of the document.
- As a user, I want diagnostic information available when troubleshooting without exposing sensitive document contents unnecessarily.

---

# 33. Security and Trust

- As a user, I want opening a Markdown file to be safe even if it contains embedded HTML.
- As a user, I want rendered Markdown sanitized against script execution.
- As a user, I want custom CSS prevented from accessing privileged application capabilities.
- As a user, I want external links prevented from gaining Electron or Node privileges.
- As a user, I want the React renderer isolated from unrestricted Node access.
- As a user, I want file access limited to actions I intentionally perform.
- As a user, I want no hidden document upload during normal operation.
- As a user, I want optional network-based features clearly identified.
- As a privacy-conscious user, I want offline operation to remain fully functional for core reading and editing.
- As a user, I want the application to ask before destructive file operations.

---

# 34. Performance

- As a reader, I want ordinary Markdown files to open quickly.
- As a reader, I want multi-thousand-line Markdown files to remain responsive.
- As a reader, I want search to remain responsive in large documents.
- As a reader, I want page navigation to remain smooth in long documents.
- As a reader, I want resizing or repagination to preserve responsiveness.
- As an author, I want typing to remain responsive while live preview updates.
- As an author, I want large files to avoid full expensive reprocessing after every small edit where possible.
- As a user, I want memory usage to remain reasonable for long documents.
- As a user, I want startup time to feel appropriate for a lightweight file reader.
- As a user, I want accessibility features to remain responsive and not lag behind visible content.

---

# 35. Testing and Quality

- As a user, I want keyboard navigation tested across the entire application.
- As a macOS screen-reader user, I want VoiceOver behavior tested.
- As a Windows screen-reader user, I want NVDA behavior tested.
- As a Windows user, I want Narrator behavior tested.
- As a JAWS user, I want JAWS behavior tested when resources permit.
- As a Linux screen-reader user, I want Orca behavior tested where practical.
- As a low-vision user, I want high zoom tested.
- As a low-vision user, I want large text and spacing overrides tested.
- As a user, I want high-contrast behavior tested.
- As a user sensitive to motion, I want reduced-motion behavior tested.
- As a developer, I want long synthetic and real Markdown documents included in test fixtures.
- As a developer, I want linked multi-file document sets included in tests.
- As a developer, I want accessibility checks covered by automated tests.
- As a developer, I want semantic reading-position restoration covered by tests.
- As a developer, I want search grouping covered by tests.
- As a developer, I want structural editing operations covered by tests.
- As a developer, I want regression tests for known accessibility bugs.
- As a user, I want manual accessibility testing to complement automated checks.

---

# 36. HCI and Orientation

- As a user, I want the application to avoid unexpected focus jumps.
- As a user, I want the application to avoid unexpected scroll jumps.
- As a reader, I want the application to avoid returning me to the top unnecessarily.
- As a reader, I want to know where I am in the document.
- As a reader, I want to know what section I am in.
- As a reader, I want to know what is around me.
- As a reader, I want to know how much content remains.
- As a reader, I want to know where I was before navigating elsewhere.
- As a blind reader, I want structural overview information that sighted users often gain by visually scanning.
- As a reader, I want recognition-based navigation through outlines, bookmarks, history, and search context.
- As a reader, I want advanced features progressively disclosed rather than displayed all at once.
- As a user with a disability, I want accessibility features to be part of the normal application rather than a lesser separate experience.
- As a user, I want multiple equivalent ways to perform important actions.
- As a user, I want the application to preserve orientation before adding visual novelty.

---

# 37. Product Philosophy Stories

- As a user, I want the application to open my Markdown file without asking me to reorganize my content.
- As a user, I want my files to remain portable to VS Code, GitHub, Git, and other Markdown tools.
- As a user, I want the application to respect existing Markdown rather than inventing a replacement format.
- As a reader, I want the application to be exceptionally good at reading Markdown rather than trying to become an office suite.
- As an author, I want powerful editing without turning the application into a full IDE.
- As a user with a disability, I want equal capability rather than a reduced accessibility edition.
- As a user, I want the application to be useful even if I never enable cloud or account features.
- As a user, I want unsupported content preserved rather than silently removed.
- As a reader, I want the application to remember me and my place.
- As a user, I want the application to get out of the way once my document is open.

---

# 38. Cross-Cutting Acceptance Themes

These are not individual user stories, but they should be considered when implementing nearly every story above.

## Preserve position
Any action that changes layout, mode, pane, file, search state, or presentation should preserve semantic context whenever possible.

## Preserve user ownership
Never require proprietary conversion for ordinary use.

## Preserve content
Unsupported syntax should be retained rather than destroyed.

## Equal feature access
Accessibility must not reduce the available feature set.

## Keyboard parity
Any important pointer action should have a keyboard-accessible equivalent.

## Screen-reader semantics
Important visual state should have an equivalent programmatic representation.

## Configurable verbosity
Announcements and summaries should be adjustable rather than forced.

## Avoid surprise
Do not steal focus, jump the reader, rewrite files, or change modes without clear cause.

## Semantic over pixel
Prefer headings, paragraphs, sections, blocks, and text anchors over raw scroll coordinates.

## Progressive complexity
Simple users should not be overwhelmed; advanced users should not be artificially limited.

---

# 39. Suggested Epic Groups

These groups can be used later to turn the stories into implementation work without imposing a versioned roadmap.

- Filesystem and Desktop Integration
- Reader Core
- Persistent Semantic Position
- Pagination and Book Mode
- Multi-File Books and Linked Documents
- Smart Search
- Structural Navigation
- Screen Reader Reading
- Low-Vision Reading
- Keyboard and Motor Accessibility
- Reading Assistance and Speech
- Reader Selection and Copying
- Raw Markdown Editor
- Split Editor and Preview
- Rendered Editing
- Structural Editing
- Screen Reader Editing
- Accessibility-Aware Authoring
- Markdown Compatibility
- Tables
- Images
- Code Blocks
- Links
- Bookmarks and History
- Profiles and Customization
- Themes and CSS
- Voice and Alternative Input
- Security
- Performance
- Testing and Accessibility Validation
- HCI and Orientation

---

# 40. Guiding Product Question

For future user stories and implementation decisions, ask:

> What information, capability, or orientation does a sighted mouse-using user gain almost automatically that a blind, low-vision, keyboard-only, motor-impaired, or cognitively overloaded user currently has to work harder to obtain?

If the application can remove that gap without harming other users, that behavior belongs in the product.
