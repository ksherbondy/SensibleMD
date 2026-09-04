# Accessible Markdown Reader & Editor
# Command and Shortcut System Specification

**Document type:** Interaction architecture specification  
**Status:** Working specification  
**Purpose:** Define the semantic command system, command naming, scope, targets, keyboard shortcuts, voice mappings, menu mappings, accessibility behavior, conflict handling, and contributor requirements for all reader and editor actions.

---

# 1. Purpose

The application should not treat keyboard shortcuts, menu items, voice commands, and buttons as unrelated implementations of the same feature.

Instead, it should define a shared semantic command system.

The core idea is:

```text
User Intent
    |
    v
Semantic Command
    |
    +--> Keyboard Shortcut
    +--> Menu Item
    +--> Toolbar/Button
    +--> Screen-Reader Accessible Control
    +--> Voice Command
    +--> Gesture
```

The semantic command is the behavior.

The key combination, spoken phrase, menu entry, or pointer control is only an input binding.

This architecture allows the product to remain consistent across input methods and makes it possible to support accessibility, customization, testing, and future voice control without duplicating application logic.

---

# 2. Core Principle

> **Commands describe what the user wants to do, not how the user triggered it.**

Bad architectural model:

```text
Ctrl+Shift+P handler
Voice handler
Menu handler
Button handler
```

each implementing separate logic.

Preferred model:

```text
command: reader.copyParagraph
```

with all input paths invoking that same command.

---

# 3. Design Goals

The command system should be:

## 3.1 Semantic

Commands should describe meaningful actions such as:

```text
reader.nextHeading
reader.copyParagraph
editor.moveSectionDown
```

rather than low-level pointer or DOM manipulation.

## 3.2 Discoverable

Users should be able to find available commands through:

- menus,
- command palette/search,
- shortcut documentation,
- contextual help.

## 3.3 Configurable

Keyboard bindings should be user-configurable where practical.

## 3.4 Accessible

Commands should be invokable without a mouse.

## 3.5 Stable

Command IDs should remain stable once documented and exposed to:

- tests,
- plugins,
- config files,
- documentation,
- voice mappings.

## 3.6 Context-aware

A command may be:

- enabled,
- disabled,
- hidden,
- context-specific.

## 3.7 Input-agnostic

A command should not know whether it was invoked by:

- keyboard,
- voice,
- menu,
- pointer,
- screen reader.

---

# 4. Command Identifier Convention

Recommended form:

```text
namespace.actionObject
```

Examples:

```text
reader.nextHeading
reader.previousParagraph
reader.copySection

editor.selectParagraph
editor.moveSectionDown
editor.promoteHeading

search.nextResult
search.returnToOrigin

book.nextChapter

app.openFile
```

Avoid IDs tied to UI labels.

Bad:

```text
clickNextButton
ctrlShiftH
leftToolbarThing
```

---

# 5. Command Namespaces

Recommended namespaces:

```text
app.
file.
reader.
book.
navigation.
search.
bookmark.
editor.
selection.
structure.
accessibility.
speech.
view.
settings.
history.
diagnostics.
```

Each namespace should own a coherent feature area.

---

# 6. Command Definition Model

Conceptual:

```ts
interface CommandDefinition {
  id: string;
  title: string;
  description?: string;

  scope:
    | "global"
    | "reader"
    | "editor"
    | "search"
    | "book"
    | "dialog";

  enabledWhen?: CommandPredicate;

  execute(context: CommandContext, args?: unknown): Promise<void> | void;

  defaultBindings?: KeyBinding[];
  voicePhrases?: string[];
}
```

This is conceptual and may evolve.

---

# 7. Command Context

A command should receive semantic context rather than needing to inspect arbitrary UI state.

Conceptual:

```ts
interface CommandContext {
  activeDocumentId?: string;

  readerContext?: ReaderContext;
  editorContext?: EditorContext;

  currentNodeId?: string;
  currentSectionId?: string;

  structuralSelection?: StructuralSelection;

  mode:
    | "reader"
    | "editor"
    | "split"
    | "book"
    | "search";
}
```

---

# 8. Global Application Commands

Recommended core commands:

```text
app.openFile
app.openRecent
app.closeDocument
app.quit
app.showSettings
app.showCommandPalette
app.showKeyboardShortcuts
app.toggleFullScreen
```

---

# 9. File Commands

```text
file.save
file.saveAs
file.reload
file.revealInFileManager
file.copyPath
```

Security-sensitive commands should route through validated privileged APIs.

---

# 10. Reader Navigation Commands

Core navigation:

```text
reader.nextCharacter
reader.previousCharacter

reader.nextWord
reader.previousWord

reader.nextSentence
reader.previousSentence

reader.nextParagraph
reader.previousParagraph

reader.nextHeading
reader.previousHeading

reader.nextSection
reader.previousSection

reader.nextLink
reader.previousLink

reader.nextImage
reader.previousImage

reader.nextList
reader.previousList

reader.nextTable
reader.previousTable

reader.nextCodeBlock
reader.previousCodeBlock
```

Not all commands need default shortcuts.

They should still be available through the command system.

---

# 11. Current Context Commands

```text
reader.describeCurrentPosition
reader.describeCurrentSection
reader.describeCurrentPage
reader.describeDocument
reader.describeUpcomingSection
```

These should not move reading position.

---

# 12. Repeat Commands

```text
reader.repeatCurrentSentence
reader.repeatCurrentParagraph
reader.repeatCurrentSection
reader.repeatCurrentHeading
```

These are particularly important for nonvisual reading.

---

# 13. Reader Copy Commands

```text
reader.copyCurrentWord
reader.copyCurrentSentence
reader.copyCurrentParagraph
reader.copyCurrentSection
reader.copyCurrentCodeBlock
reader.copyCurrentLinkText
reader.copyCurrentLinkTarget
```

These must function in rendered reading mode.

Copying must not require edit mode.

---

# 14. Page and Book Commands

```text
book.nextPage
book.previousPage
book.firstPage
book.lastPage

book.nextSpread
book.previousSpread

book.nextChapter
book.previousChapter

book.togglePagination
book.useContinuousMode
book.useSinglePageMode
book.useSpreadMode

book.showTableOfContents
```

---

# 15. Search Commands

```text
search.open
search.close
search.nextResult
search.previousResult

search.nextResultGroup
search.previousResultGroup

search.scopeDocument
search.scopeCurrentSection
search.scopeHeadings
search.scopeLinks
search.scopeCode
search.scopeCollection

search.returnToOrigin
```

---

# 16. Bookmark Commands

```text
bookmark.addCurrentPosition
bookmark.removeCurrentPosition
bookmark.showAll
bookmark.next
bookmark.previous
bookmark.rename
```

---

# 17. History Commands

```text
history.back
history.forward
history.returnToReadingPosition
```

These should operate on semantic navigation history.

---

# 18. Editor Mode Commands

```text
editor.enterRawMode
editor.enterRenderedMode
editor.enterSplitMode
editor.togglePreview
editor.focusSource
editor.focusPreview
```

Switching modes should preserve semantic/caret position where practical.

---

# 19. Standard Editing Commands

The editor should support expected platform conventions:

```text
editor.undo
editor.redo
editor.cut
editor.copy
editor.paste
editor.selectAll
editor.find
editor.replace
```

Platform-default shortcuts should be respected.

---

# 20. Semantic Selection Commands

```text
selection.currentCharacter
selection.currentWord
selection.currentSentence
selection.currentLine
selection.currentParagraph
selection.currentHeading
selection.currentSection
selection.currentListItem
selection.currentList
selection.currentTable
selection.currentCodeBlock
selection.currentLink
```

Semantic selection may differ from ordinary text selection.

---

# 21. Structural Editing Commands

```text
structure.moveParagraphUp
structure.moveParagraphDown

structure.moveSectionUp
structure.moveSectionDown

structure.moveListItemUp
structure.moveListItemDown

structure.promoteHeading
structure.demoteHeading

structure.indentListItem
structure.outdentListItem

structure.duplicateParagraph
structure.duplicateSection
structure.duplicateCodeBlock

structure.deleteParagraph
structure.deleteSection
structure.deleteListItem
structure.deleteCodeBlock
```

---

# 22. Command Grammar

The system should support a mental model similar to:

```text
operation + object
```

Examples:

```text
select paragraph
copy paragraph
delete paragraph
move section down
copy code block
```

The internal command model does not need to literally parse Vim-style grammar initially, but command naming should preserve this composability.

---

# 23. Accessibility Commands

```text
accessibility.showSectionSummary
accessibility.showCurrentContext
accessibility.showDocumentStructure
accessibility.openFindings
accessibility.nextFinding
accessibility.previousFinding
accessibility.nextError
accessibility.nextWarning
accessibility.toggleReducedMotion
accessibility.toggleParagraphFocus
accessibility.toggleSentenceFocus
```

---

# 24. Speech Commands

If built-in speech is supported:

```text
speech.readFromCurrentPosition
speech.readCurrentSentence
speech.readCurrentParagraph
speech.readCurrentSection
speech.pause
speech.resume
speech.stop
speech.nextSentence
speech.previousSentence
speech.nextParagraph
speech.previousParagraph
```

---

# 25. View Commands

```text
view.increaseTextSize
view.decreaseTextSize
view.resetTextSize

view.increaseLineSpacing
view.decreaseLineSpacing

view.toggleOutline
view.toggleSearchPanel
view.toggleAccessibilityPanel
view.toggleDistractionFree

view.zoomIn
view.zoomOut
view.resetZoom
```

---

# 26. Command Availability

Commands should expose availability.

Example:

```text
structure.moveSectionDown
```

disabled if:

- no active document,
- not editing,
- current semantic target is not inside a movable section,
- section is already last sibling.

Disabled commands should remain discoverable where useful but must clearly expose disabled state.

---

# 27. Context-Sensitive Commands

The same input may invoke different commands depending on mode only when behavior remains predictable.

Example:

```text
Right Arrow
```

Reader book mode:

```text
book.nextPage
```

Raw editor:

```text
move caret right
```

Avoid surprising context overload.

---

# 28. Keyboard Binding Model

Conceptual:

```ts
interface KeyBinding {
  commandId: string;

  key: string;

  modifiers: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };

  when?: string;

  platform?: "windows" | "macos" | "linux";
}
```

---

# 29. Platform Conventions

Respect common conventions:

## macOS

```text
Cmd+C
Cmd+V
Cmd+F
Cmd+S
Cmd+Z
```

## Windows/Linux

```text
Ctrl+C
Ctrl+V
Ctrl+F
Ctrl+S
Ctrl+Z
```

Do not replace expected editing shortcuts with custom semantic commands.

---

# 30. Shortcut Assignment Principles

Default shortcuts should be:

- memorable,
- consistent,
- reachable,
- minimally conflicting,
- documented.

Avoid assigning a shortcut merely because it is unused in the application.

It may conflict with:

- OS commands,
- VoiceOver,
- NVDA,
- JAWS,
- Narrator,
- Orca,
- browser/Electron conventions,
- input methods.

---

# 31. Screen Reader Shortcut Conflicts

Accessibility-sensitive defaults require real testing.

Examples of modifiers heavily used by assistive technology include:

- VoiceOver modifier combinations,
- NVDA modifier combinations,
- Insert-based screen-reader commands,
- Caps Lock-based commands.

The application should avoid requiring users to fight their assistive technology for core functions.

---

# 32. Shortcut Conflict Detection

When a user assigns a shortcut, the app should detect conflicts with existing app commands.

Example:

```text
Ctrl+Shift+H is already assigned to:
reader.previousHeading
```

User may:

- cancel,
- replace,
- keep both if scopes cannot conflict.

---

# 33. Scope-Aware Conflicts

Bindings may safely overlap if their contexts cannot overlap.

Example:

```text
Enter
```

may mean:

```text
activate selected search result
```

inside search results and:

```text
insert newline
```

inside editor.

The conflict detector should understand scope.

---

# 34. Shortcut Profiles

Potential profiles:

```text
Default
Vim-inspired
Screen Reader Friendly
Custom
```

Profiles should change bindings, not capabilities.

---

# 35. Vim-Inspired Interaction

The application may eventually offer optional Vim-like structural bindings.

The goal is not necessarily to recreate Vim.

The useful concept is:

```text
verb + object
```

Examples:

```text
delete paragraph
move section
copy code block
```

This may be implemented through:

- shortcuts,
- command palette,
- optional modal command mode.

It must not compromise accessibility or beginner usability.

---

# 36. Command Palette

The application should provide searchable command discovery.

Example:

```text
> copy paragraph
> next heading
> show section summary
> move section down
```

Requirements:

- keyboard accessible,
- screen-reader accessible,
- results expose command names and shortcuts,
- disabled commands explain why when practical.

---

# 37. Command Search

Command matching should support:

- title,
- aliases,
- keywords.

Example:

```text
"repeat"
```

could find:

```text
Repeat Current Sentence
Repeat Current Paragraph
Repeat Current Section
```

---

# 38. Menus

Desktop menus should invoke semantic commands.

Example:

```text
Navigate
  Next Heading
  Previous Heading
  Next Paragraph
  Previous Paragraph
```

Menu implementation should not duplicate command logic.

---

# 39. Context Menus

Rendered content may expose context commands.

Paragraph context:

```text
Copy Paragraph
Bookmark Here
Read Paragraph
Describe Section
```

Code block:

```text
Copy Code Block
Read Code Block
```

Context menus must remain keyboard accessible.

---

# 40. Toolbar Controls

Toolbar buttons should map directly to commands.

Example:

```text
button -> book.nextPage
```

The button should expose:

- accessible name,
- disabled state,
- shortcut if useful.

---

# 41. Voice Command Mapping

Voice phrases should map to semantic command IDs.

Conceptual:

```ts
{
  phrase: "next heading",
  command: "reader.nextHeading"
}
```

Alternative phrases may map to the same command:

```text
next heading
go to next heading
forward heading
```

---

# 42. Voice Command Safety

Commands that modify content should be handled more cautiously than navigation commands.

Low-risk:

```text
next heading
repeat paragraph
copy sentence
```

Higher-risk:

```text
delete section
replace all
save over file
```

Potential safety approaches:

- undo support,
- confirmation for destructive multi-unit actions,
- command echo before execution where needed.

---

# 43. Voice Command Feedback

After voice invocation:

```text
Move section down
```

the app may announce:

```text
Section moved below "Installation."
```

Feedback should be concise.

---

# 44. Command Arguments

Some commands require arguments.

Example:

```text
search.query("memory")
structure.moveSection(targetSectionId, direction)
```

Command argument schema should be explicit.

---

# 45. Repeatable Commands

Some commands may support repeat counts.

Future example:

```text
next paragraph x 5
```

The command model should not prevent counted repetition.

---

# 46. Command Chaining

Future advanced workflows may support:

```text
select section
copy
next section
paste
```

Do not require command chaining initially, but keep commands deterministic enough to compose.

---

# 47. Async Commands

Some commands may be asynchronous:

```text
file.open
file.save
search.collection
```

The command system should support:

- busy state,
- cancellation where appropriate,
- error reporting.

---

# 48. Command Errors

Commands should fail predictably.

Example:

```text
book.nextChapter
```

when no next chapter exists.

Expected:

- no crash,
- optional concise status,
- no focus loss.

---

# 49. Command Undoability

Commands that mutate source should specify whether they are undoable.

Conceptual metadata:

```ts
undoable: true
```

Examples:

```text
move section
delete paragraph
promote heading
```

should normally be undoable.

---

# 50. Destructive Commands

Commands such as:

```text
delete section
replace all
discard changes
```

need clear safeguards.

Criteria for confirmation may depend on:

- scope,
- reversibility,
- existing undo history.

---

# 51. Command State

Commands may expose state.

Example:

```text
view.toggleOutline
```

state:

```text
checked = true
```

Assistive technology must be able to perceive toggled state.

---

# 52. Commands and Semantic Reader Cursor

Navigation commands should primarily operate on the semantic reader cursor.

They should not rely only on:

- DOM focus,
- mouse selection,
- pixel coordinates.

---

# 53. Commands and Editor Caret

Editor structural commands should resolve the editor caret into semantic context.

Example:

```text
caret in paragraph
        |
        v
current ParagraphNode
        |
        v
selection.currentParagraph
```

---

# 54. Command Logging

Development builds may log commands for debugging.

Example:

```text
COMMAND reader.nextHeading
target=heading:virtual-memory
```

Production logs should avoid sensitive document text.

---

# 55. Command Telemetry

No telemetry is required.

If telemetry is ever added:

- do not record document contents,
- avoid recording sensitive search terms,
- disclose collection.

---

# 56. Command Testability

Every semantic command should be testable without simulating raw mouse coordinates.

Preferred unit/integration test:

```ts
executeCommand("reader.nextHeading")
expect(reader.position).toEqual(...)
```

This is a major benefit of semantic commands.

---

# 57. Command Registry

Conceptually:

```ts
class CommandRegistry {
  register(command: CommandDefinition): void;
  execute(id: string, args?: unknown): Promise<void>;
  isEnabled(id: string): boolean;
  get(id: string): CommandDefinition | undefined;
}
```

---

# 58. Stable Command IDs

Once public, command IDs should not be renamed casually.

They may eventually be referenced by:

- shortcut config,
- documentation,
- accessibility tests,
- plugins,
- user scripts.

If a rename occurs, consider aliases/migrations.

---

# 59. Command Documentation

Each command should eventually document:

```text
ID
Title
Description
Scope
Default shortcut
Alternative input
Preconditions
Effect
Focus behavior
Position behavior
Undoability
Accessibility feedback
```

---

# 60. Example Command Record

```text
ID:
reader.copyCurrentParagraph

Title:
Copy Current Paragraph

Scope:
Reader

Precondition:
Current semantic position resolves to a paragraph.

Effect:
Copies the paragraph's readable text to the clipboard.

Position:
No change.

Focus:
No change.

Undoable:
Not applicable.

Accessibility feedback:
Optional concise "Paragraph copied."

Voice aliases:
copy paragraph
copy this paragraph
```

---

# 61. Example Structural Command Record

```text
ID:
structure.moveSectionDown

Title:
Move Section Down

Scope:
Editor

Precondition:
Caret/selection resolves to a movable section.

Effect:
Moves the complete section source range, including nested subsections,
below the next sibling section.

Position:
Caret remains within moved section at equivalent semantic location.

Focus:
Editor retains focus.

Undoable:
Yes.

Accessibility feedback:
"Section moved below <heading>."
```

---

# 62. Reader Default Shortcut Candidates

These are **candidates only**, not frozen defaults.

Common platform-safe possibilities should be researched and AT-tested before final assignment.

Potential conceptual actions:

```text
next heading
previous heading
next paragraph
previous paragraph
repeat sentence
repeat paragraph
section summary
return to reading position
```

The specification intentionally does not freeze arbitrary key combinations yet.

---

# 63. Why Default Keys Are Not Frozen Here

Shortcut defaults should be chosen after:

- VoiceOver testing,
- NVDA testing,
- Narrator testing,
- Orca testing,
- platform convention review,
- user testing.

The command architecture should be defined before the exact key map.

---

# 64. Accessibility Feedback Contract

Commands should declare expected feedback behavior.

Possible values:

```text
none
status
announcement
focus-change
dialog
```

Example:

```text
reader.nextParagraph
feedback: none
```

because the screen reader will encounter the new paragraph naturally.

Example:

```text
structure.moveSectionDown
feedback: announcement
```

because the structural change is otherwise not obvious nonvisually.

---

# 65. Avoid Duplicate Announcements

If native screen-reader behavior already communicates an action, the application should not repeat it unnecessarily.

Bad:

```text
Heading level 2
Heading level 2
Virtual Memory
```

Command feedback should fill missing information rather than duplicate AT output.

---

# 66. Command Focus Contract

Each command should define whether focus:

```text
remains
moves
returns
```

Examples:

```text
reader.copyCurrentParagraph -> remains
search.open -> moves to search input
search.close -> returns to prior context
structure.moveSectionDown -> remains in editor
```

---

# 67. Command Position Contract

Each command should define semantic position behavior.

Examples:

```text
view.increaseTextSize
-> preserve semantic position

book.nextPage
-> update semantic position to new page context

reader.describeCurrentSection
-> preserve position

search.returnToOrigin
-> restore saved origin
```

---

# 68. Command Availability for Screen Readers

Commands should be available through at least one screen-reader-discoverable path even if the user has not memorized shortcuts.

Examples:

- accessible menu,
- command palette,
- button,
- documented shortcut list.

---

# 69. Command Palette and Voice Shared Vocabulary

The command title vocabulary should be human-readable enough to work for both discovery and voice mapping.

Prefer:

```text
Copy Current Paragraph
```

over:

```text
Copy Semantic Block
```

unless "semantic block" is genuinely meaningful to users.

---

# 70. Aliases

Commands may expose aliases:

```text
reader.describeCurrentPosition
aliases:
- where am I
- current location
- describe position
```

This improves:

- command search,
- voice mapping.

---

# 71. Localization

Command IDs remain stable English-like technical identifiers.

User-visible titles, descriptions, aliases, and voice phrases may be localized.

---

# 72. Input Method Parity

For each important command, document supported invocation paths.

Example:

| Command | Keyboard | Menu | Button | Voice | Gesture |
|---|---|---|---|---|---|
| Next Page | Yes | Yes | Yes | Future | Yes |
| Copy Paragraph | Yes | Yes | Context | Future | No |
| Move Section Down | Yes | Yes | Optional | Future | No |

No requirement says every command must have every input method.

The requirement is that core capabilities are not pointer-only.

---

# 73. Commands and Permissions

Some commands may require security validation.

Example:

```text
file.save
```

semantic command:

```text
file.save
```

then privileged implementation:

```text
validated preload -> main process -> filesystem
```

The command system must not bypass security boundaries.

---

# 74. Command Cancellation

Long-running commands should support cancellation where practical.

Examples:

```text
search.collection
document.exportPdf
```

Navigation commands generally do not need cancellation.

---

# 75. Accessibility Finding Commands

```text
diagnostics.openAccessibilityPanel
diagnostics.nextFinding
diagnostics.previousFinding
diagnostics.nextError
diagnostics.nextWarning
diagnostics.openCurrentFinding
diagnostics.ignoreCurrentFinding
diagnostics.returnToSource
```

---

# 76. Table Navigation Commands

Potential:

```text
reader.enterTable
reader.exitTable
reader.nextTableCell
reader.previousTableCell
reader.nextTableRow
reader.previousTableRow
reader.nextTableColumn
reader.previousTableColumn
reader.describeCurrentCell
```

These should complement native screen-reader table navigation rather than fight it.

---

# 77. Link Commands

```text
reader.openCurrentLink
reader.copyCurrentLinkText
reader.copyCurrentLinkTarget
reader.describeCurrentLink
history.back
```

---

# 78. Image Commands

```text
reader.describeCurrentImage
reader.openCurrentImage
reader.copyCurrentImageAltText
```

If image enlargement is supported:

```text
reader.zoomCurrentImage
```

---

# 79. Code Commands

```text
reader.copyCurrentCodeBlock
reader.describeCurrentCodeBlock
reader.skipCurrentCodeBlock
```

Editor:

```text
selection.currentCodeBlock
structure.deleteCodeBlock
structure.duplicateCodeBlock
```

---

# 80. Profile Commands

```text
settings.applyStandardProfile
settings.applyBookProfile
settings.applyLowVisionProfile
settings.applyScreenReaderProfile
settings.applyReducedDistractionProfile
```

Profiles alter settings, not feature availability.

---

# 81. Command Persistence

Persist:

- custom key bindings,
- selected shortcut profile,
- voice aliases if user-configurable.

Do not store these in Markdown source.

---

# 82. Reset Behavior

Users should be able to:

```text
reset one shortcut
reset command group
reset all shortcuts
```

without losing unrelated settings.

---

# 83. Import / Export Shortcuts

Optional future capability:

```text
export keybindings
import keybindings
```

Imported configuration must be schema-validated.

---

# 84. Conflict with Text Input

Single-letter shortcuts should not fire while typing ordinary text unless the app is in an explicit command mode.

This is particularly important for:

- raw editor,
- search input,
- dialogs,
- accessibility text fields.

---

# 85. Modifier-Only Commands

Avoid shortcuts relying solely on modifier taps unless carefully designed.

They may interfere with:

- OS behavior,
- assistive technologies,
- sticky keys.

---

# 86. Sticky Keys

Shortcut design should remain compatible with users who operate modifier keys sequentially through OS Sticky Keys.

Avoid timing-sensitive chord requirements where possible.

---

# 87. Key Repeat

Holding a key for page/paragraph navigation may trigger repeat.

The command system should handle repeated input without corrupting navigation state.

---

# 88. International Keyboards

Avoid assumptions tied only to US keyboard symbol locations for core commands.

Allow remapping.

---

# 89. Command Accessibility Testing

For each core command test:

```text
Keyboard invocation
Menu invocation
Accessible name
Enabled/disabled state
Focus result
Semantic position result
Screen-reader feedback
Undo behavior if mutating
```

---

# 90. Contributor Checklist for New Commands

Before adding a command:

- [ ] Does an existing command already represent this intent?
- [ ] Is the ID semantic rather than UI-specific?
- [ ] Is scope defined?
- [ ] Are preconditions defined?
- [ ] Is focus behavior defined?
- [ ] Is semantic-position behavior defined?
- [ ] Is it undoable?
- [ ] Does it require accessibility feedback?
- [ ] Does it cross a security boundary?
- [ ] Does it need a default shortcut?
- [ ] Has shortcut conflict risk been considered?
- [ ] Is it testable directly through the command registry?

---

# 91. Suggested Initial Command Inventory

A mature implementation should eventually support at least:

## Application

```text
app.openFile
app.closeDocument
app.showSettings
app.showCommandPalette
```

## File

```text
file.save
file.saveAs
file.reload
```

## Reader

```text
reader.nextHeading
reader.previousHeading
reader.nextParagraph
reader.previousParagraph
reader.nextSentence
reader.previousSentence
reader.nextLink
reader.previousLink
reader.nextImage
reader.nextTable
reader.nextCodeBlock
reader.describeCurrentPosition
reader.describeCurrentSection
reader.describeUpcomingSection
reader.repeatCurrentSentence
reader.repeatCurrentParagraph
reader.copyCurrentSentence
reader.copyCurrentParagraph
reader.copyCurrentSection
reader.copyCurrentCodeBlock
```

## Book

```text
book.nextPage
book.previousPage
book.nextChapter
book.previousChapter
book.useContinuousMode
book.useSinglePageMode
book.useSpreadMode
```

## Search

```text
search.open
search.nextResult
search.previousResult
search.returnToOrigin
```

## History

```text
history.back
history.forward
history.returnToReadingPosition
```

## Editor / Structural

```text
editor.enterRawMode
editor.enterSplitMode
editor.focusSource
editor.focusPreview

selection.currentParagraph
selection.currentSection
selection.currentCodeBlock

structure.moveSectionUp
structure.moveSectionDown
structure.promoteHeading
structure.demoteHeading
structure.deleteSection
structure.duplicateSection
```

## Accessibility

```text
diagnostics.openAccessibilityPanel
diagnostics.nextFinding
diagnostics.previousFinding
```

---

# 92. Open Research Questions

1. Which semantic commands deserve default shortcuts?
2. Which default shortcuts conflict with VoiceOver?
3. Which conflict with NVDA/JAWS/Narrator/Orca?
4. Should structural navigation use Vim-inspired optional bindings?
5. Should there be a dedicated command mode?
6. How should voice command confirmation work for destructive edits?
7. Should commands support repeat counts?
8. How should command aliases be localized?
9. Should command palette expose disabled commands?
10. How should table-navigation commands coexist with native screen-reader table commands?
11. Which commands should automatically announce completion?
12. Which should rely entirely on native accessibility output?
13. How should keyboard shortcut profiles be shared between systems?
14. Should command IDs eventually form a public plugin API?
15. What input bindings are most useful to users with limited motor control?

---

# 93. Definition of Done

The command architecture should eventually be considered mature when:

- every core action has a semantic command ID,
- UI controls invoke commands rather than duplicate logic,
- menus invoke commands,
- keyboard shortcuts invoke commands,
- future voice support can invoke the same commands,
- command availability is context-aware,
- focus behavior is defined,
- semantic-position behavior is defined,
- mutation commands are undoable where appropriate,
- keyboard conflicts can be detected,
- bindings are customizable,
- core commands are discoverable,
- commands can be tested independently of pointer simulation.

---

# 94. Core Architectural Rule

> **One user intent should have one semantic command, regardless of how that intent is expressed.**

The keyboard, voice system, menu, toolbar, screen reader, and gesture layer should all speak the same command language.
