# Accessible Markdown Reader & Editor
# HCI and Interaction Design Principles

**Document type:** Human-computer interaction and product design specification  
**Status:** Working specification  
**Purpose:** Define the interaction principles that govern the application's reader, editor, navigation, accessibility, search, pagination, commands, dialogs, and state transitions.

---

# 1. Purpose

This document establishes the product-wide interaction rules that should guide implementation decisions.

The application is intended to serve:

- sighted readers,
- blind readers,
- low-vision readers,
- keyboard-only users,
- users with motor impairments,
- users with cognitive or attention-related needs,
- developers reading large technical Markdown,
- authors creating accessible documents.

The goal is not to build separate "normal" and "accessible" experiences.

The goal is one coherent application whose capabilities remain available through multiple interaction paths.

---

# 2. Core Product Principle

> **Accessibility is not a secondary mode. It is a property of the primary interaction model.**

A feature should not exist only for pointer users and later receive an incomplete accessibility adaptation.

Instead, the application should define:

```text
user intent
   |
semantic command / semantic state
   |
multiple interaction paths
```

Examples:

```text
Next heading
-> keyboard
-> command palette
-> menu
-> screen-reader-accessible control
-> future voice command
```

---

# 3. Never Unexpectedly Move the User

The most important global interaction rule is:

> **Never unexpectedly move the user's visual, keyboard, or semantic reading position.**

This applies to:

- font changes,
- window resizing,
- pagination changes,
- search,
- preview updates,
- panel opening,
- accessibility diagnostics,
- external file refresh,
- mode switching,
- theme changes.

If movement is required, it should be:

- intentional,
- predictable,
- reversible where practical.

---

# 4. Semantic Position Over Pixel Position

The application should reason about:

```text
section
paragraph
sentence
heading
code block
table
```

rather than primarily:

```text
scrollTop = 8214px
```

Pixels are presentation.

Semantic position is user context.

---

# 5. Recognition Over Recall

Users should not have to memorize every shortcut or command.

Important functionality should be discoverable through:

- menus,
- command palette,
- contextual actions,
- accessible labels,
- visible controls,
- documentation.

Power users may memorize commands, but memorization should accelerate use rather than unlock basic capability.

---

# 6. Overview Before Traversal

Sighted users often obtain structural information by glancing at a document.

Nonvisual users should have equivalent access to document overview.

The application should support:

```text
document summary
section summary
heading outline
upcoming section summary
```

Examples:

```text
Section: Virtual Memory
8 paragraphs
2 subsections
1 table
3 links
1 code block
```

This enables informed navigation instead of forcing linear exploration.

---

# 7. Preserve Orientation

After every significant interaction, the user should be able to answer:

```text
Where am I?
What just happened?
How do I get back?
```

The application should provide appropriate context after:

- following a link,
- jumping to a search result,
- moving a section,
- opening a chapter,
- returning from a footnote,
- closing a dialog.

---

# 8. Equal Capability, Different Interaction Paths

Accessibility should not mean a reduced feature set.

Example:

```text
Sighted pointer user:
right-click paragraph -> Copy Paragraph

Keyboard user:
command palette -> Copy Current Paragraph

Blind user:
semantic command -> Copy Current Paragraph

Voice user:
"copy paragraph"
```

All invoke the same capability.

---

# 9. Reader and Editor Are Different Modes

Reading and editing are different user intents.

Reader mode should optimize for:

```text
reading
navigation
search
copying
bookmarks
links
speech
```

Editor mode should optimize for:

```text
modification
selection
structure
save
authoring diagnostics
```

Do not require entering edit mode merely to interact with text.

---

# 10. Copying Is a Reading Capability

Users must be able to:

- select text,
- copy text,
- copy a paragraph,
- copy a section,
- copy code,

without entering edit mode.

This is especially important for:

- technical readers,
- keyboard users,
- screen-reader users.

---

# 11. The Reading Cursor Is Not the Editor Caret

The application should distinguish:

```text
semantic reading cursor
editor caret
keyboard focus
pointer selection
screen-reader cursor
```

They may align, but they serve different purposes.

Collapsing them into one state creates:

- focus bugs,
- lost reading position,
- accessibility conflicts.

---

# 12. Direct Manipulation Must Have an Alternative

If an action uses:

- dragging,
- swiping,
- resizing by pointer,
- visual reordering,

there should be a discrete alternative.

Examples:

```text
drag section
-> Move Section Up / Down

drag pane divider
-> keyboard resize commands

swipe page
-> Next Page / Previous Page
```

---

# 13. Keyboard Is a First-Class Input Method

All core workflows should be possible without a pointer.

Core workflows include:

- open file,
- read,
- navigate headings,
- search,
- follow links,
- copy text,
- bookmark,
- switch reading mode,
- edit,
- structurally move content,
- review accessibility findings,
- save.

---

# 14. Do Not Hijack Assistive Technology

The application should not compete unnecessarily with:

- VoiceOver,
- NVDA,
- JAWS,
- Narrator,
- Orca.

Avoid:

- excessive custom key interception,
- duplicate announcements,
- artificial focus movement,
- unnecessary ARIA where native HTML works better.

---

# 15. Native Semantics First

Use native semantic elements when possible:

```text
h1-h6
p
a
ul
ol
li
table
th
td
button
input
```

Prefer this over recreating semantics with ARIA.

ARIA should supplement, not replace, correct native structure.

---

# 16. Predictable Focus

Focus should move only when the user's action logically changes interaction context.

Examples:

```text
Open Search
-> focus search input

Close Search
-> return to prior logical focus

Open Settings
-> focus dialog

Close Settings
-> return to invoking context
```

Do not move focus merely because content re-rendered.

---

# 17. Focus and Reading Position Are Separate

Opening a dialog changes focus.

It should not change:

```text
stable reading position
```

Likewise, opening the outline should not imply the user stopped reading their current paragraph permanently.

---

# 18. Focus Restoration Must Be Deliberate

When temporary UI closes, focus should return to:

- invoking control,
- prior reading region,
- prior editor location,
- result list,

depending on the interaction.

Avoid returning focus to document start or application root.

---

# 19. Minimize Context Switching

The app should reduce unnecessary mode changes.

Examples:

Bad:

```text
Reader -> Editor just to copy a paragraph
```

Better:

```text
Reader -> Copy Paragraph
```

Bad:

```text
Search -> separate full-screen result page -> reader
```

Better:

```text
Search panel + semantic preview/navigation
```

---

# 20. Progressive Disclosure

Advanced capabilities should be available without overwhelming basic use.

A new user should be able to:

```text
open file
read
search
copy
```

without understanding:

- structural commands,
- CSS,
- extension settings,
- semantic model details.

Power users should still be able to access those advanced features.

---

# 21. Consistency Over Cleverness

Similar actions should behave similarly.

Examples:

```text
Next Heading
Next Paragraph
Next Link
```

should follow similar navigation expectations.

Likewise:

```text
Copy Paragraph
Copy Section
Copy Code Block
```

should preserve focus and semantic position consistently.

---

# 22. Command Vocabulary Should Match User Intent

Prefer:

```text
Copy Current Paragraph
Move Section Down
Describe Current Section
```

over technical internal terms like:

```text
Copy AST Node
Shift Structural Unit
Inspect Semantic Context
```

Internal architecture may be technical.

User-facing language should be direct.

---

# 23. Structural Editing Should Feel Safer Than Text Surgery

If a user wants to move a section, they should not need to manually:

```text
select lines
cut
find destination
paste
fix heading spacing
```

Structural commands should operate on semantic units.

This reduces:

- accidental omissions,
- malformed Markdown,
- cognitive load.

---

# 24. Make Reversible Actions Easy

Potentially destructive editing operations should be undoable.

Examples:

```text
move section
delete paragraph
promote heading
replace all
```

If an action cannot be easily undone, confirmation requirements should be stronger.

---

# 25. Prevent Errors Before Explaining Them

Where possible:

```text
disable impossible command
```

rather than:

```text
allow command
then display error
```

Example:

```text
Move Section Up
```

can be disabled if already first.

---

# 26. Error Messages Should Support Recovery

A useful error tells the user:

```text
what failed
what was preserved
what can be done next
```

Bad:

```text
Error 1843.
```

Better:

```text
The file could not be saved because it changed on disk.
Your edits are still open.
Review the external changes before saving.
```

---

# 27. Never Destroy Source Because Rendering Failed

The application must separate:

```text
cannot render
```

from:

```text
cannot preserve
```

If content is unsupported:

- preserve source,
- show fallback,
- explain limitation.

Do not normalize or delete syntax simply because the renderer does not understand it.

---

# 28. Be Liberal in What You Can Open, Conservative in What You Modify

The application should attempt to display unusual or imperfect Markdown.

Editing behavior should avoid unnecessary source rewriting.

This principle protects:

- syntax extensions,
- formatting style,
- external tool compatibility,
- author intent.

---

# 29. Do Not Hide Complexity by Destroying Information

A polished rendered view should not erase access to:

- heading hierarchy,
- link destinations,
- image alternatives,
- code language,
- table context.

The visible UI may simplify presentation, but semantic detail should remain available.

---

# 30. Information Parity

Ask:

> **What information or capability does a sighted, mouse-using reader obtain almost automatically that another user currently has to work harder to obtain?**

Examples:

Sighted users can often glance and see:

- section length,
- code blocks,
- images,
- tables,
- link density.

The application should make equivalent information queryable nonvisually.

---

# 31. Reading Efficiency Matters

Accessibility is not only whether a task is technically possible.

A screen-reader user should not need 80 commands to accomplish what a sighted user can understand in one glance.

Evaluate:

```text
task completion
number of actions
orientation
confidence
```

---

# 32. Avoid Excessive Announcements

The application should not narrate every internal state change.

Use announcements for information that is:

- important,
- otherwise unavailable,
- action-related.

Example:

Good:

```text
Section moved below Installation.
```

Potentially excessive:

```text
Paragraph changed.
Preview updated.
Document rerendered.
Page map recalculated.
```

---

# 33. Verbosity Should Be Adjustable

Some users want concise output.

Others want detailed context.

Potential settings:

```text
minimal
standard
detailed
```

Apply to:

- current-location reports,
- section summaries,
- command confirmation.

---

# 34. Status Messages Must Not Steal Focus

Examples:

```text
Saved.
14 search results.
Paragraph copied.
```

These should use accessible status semantics without forcing focus movement.

---

# 35. Reduced Motion Is a Functional Preference

Motion should never be required to understand state changes.

Users should be able to disable:

- page-turn animation,
- sliding panels,
- animated scrolling,
- decorative transitions.

Navigation remains fully functional.

---

# 36. Visual Motion Should Not Carry Unique Meaning

If a section visibly slides to a new position, also provide:

- updated structure,
- announcement,
- undo.

The animation alone cannot communicate the result.

---

# 37. Low-Vision Reflow Must Preserve Function

Users should be able to enlarge:

- text,
- spacing,
- content scale,

without:

- clipping,
- overlap,
- losing controls,
- losing reading position.

Two-page mode should yield to one-page mode when space becomes insufficient.

---

# 38. Avoid Global Horizontal Scrolling for Prose

Normal prose should reflow.

Horizontal scrolling may be appropriate locally for:

- wide code,
- large tables,
- oversized diagrams.

It should not become the default document-reading model.

---

# 39. Respect User Typography

The user should be able to change:

- font size,
- font family,
- line height,
- paragraph spacing,
- word spacing,
- letter spacing,
- content width.

These changes should not break:

- pagination,
- semantic navigation,
- bookmarks,
- search results.

---

# 40. Color Is Not Enough

State should not rely only on color.

Examples:

```text
current search result
focused control
warning/error
selected mode
```

should also have:

- shape,
- text,
- iconography,
- border,
- programmatic state.

---

# 41. Focus Must Remain Visible

Custom themes/CSS must not remove visible focus from core application UI.

Focus visibility is part of interaction correctness.

---

# 42. Document CSS Must Not Control Application Chrome

User/document styling should not be able to hide:

- Save,
- security prompts,
- navigation controls,
- accessibility controls.

The reading document and privileged UI should remain visually and structurally separable.

---

# 43. Book Mode Is Optional Presentation

Pagination should not become a forced interaction paradigm.

Users should always be able to choose continuous reading.

A screen-reader user may prefer continuous semantic flow.

A sighted reader may prefer two-page spreads.

Both are first-class.

---

# 44. Page Number Is Secondary Context

Page number can be useful.

But the application should not make the user dependent on a layout-specific number.

Semantic location should remain available:

```text
Chapter 3
Section: Virtual Memory
Paragraph 4 of 11
```

---

# 45. Search Should Explain Where Results Live

A match should provide more than:

```text
7 of 42
```

It should provide semantic context.

Example:

```text
Memory Management > Virtual Memory
Paragraph
"...the page table maps..."
```

---

# 46. Search Exploration Should Be Reversible

Search should capture the user's original location.

A user should be able to explore results and return.

This supports confidence and reduces disorientation.

---

# 47. Back and Return Are Different Concepts

```text
Back
```

means prior navigation step.

```text
Return to Reading Position
```

means return to the stable place where the user had been reading before exploration.

Both may be useful.

---

# 48. Preserve State Across Mode Changes

Switching:

```text
reader -> editor
continuous -> paginated
single page -> spread
```

should not reset user context.

---

# 49. Split View Synchronization Must Be Semantic

Do not synchronize source and preview using only scroll percentages.

Prefer:

```text
source location
-> semantic node
-> rendered node
```

This preserves meaning despite different layout heights.

---

# 50. Avoid Preview-Induced Instability

While editing:

- preview should not steal focus,
- preview should not jump aggressively,
- screen-reader interaction should not be disrupted.

The user is editing; preview is supporting information.

---

# 51. Structure Should Be Queryable

Users should be able to ask:

```text
Where am I?
What is this?
What is in this section?
What comes next?
```

The product should support those questions directly.

---

# 52. Current Context Should Be Available On Demand

Example:

```text
Chapter 4 of 10.
Heading level 2: Virtual Memory.
Paragraph 3 of 8.
```

The application should not force this verbosity constantly.

---

# 53. Interaction Modes Should Share the Same Mental Model

Reader, editor, search, outline, and book mode should use consistent concepts:

```text
document
section
heading
paragraph
sentence
link
table
code block
```

Users should not need to learn separate structural vocabularies.

---

# 54. Keep Structural Units Stable

If a user performs:

```text
Move Section Down
```

the same section should remain:

- selected,
- focused semantically,
- undoable.

Do not make them rediscover the moved content.

---

# 55. Feedback After Structural Change

After structural mutation:

```text
Section moved below Installation.
```

is more useful than:

```text
Operation complete.
```

Feedback should include meaningful context.

---

# 56. Use Safe Defaults

Defaults should favor:

- readable typography,
- visible focus,
- reduced surprise,
- local/offline behavior,
- secure rendering,
- predictable shortcuts.

Advanced customization remains available.

---

# 57. Do Not Overload the User With Panels

Outline, search, accessibility findings, bookmarks, and settings should not all compete simultaneously.

Panels should:

- be dismissible,
- preserve context,
- restore focus,
- respect small windows/high zoom.

---

# 58. Panels Must Not Cover the Only Reading Context

At large text sizes or narrow windows:

- sidebars may become overlays,
- stacked panels may collapse.

The main reading task must remain usable.

---

# 59. Dialogs Must Be Short-Lived Interaction Contexts

Dialogs should:

- have a clear title,
- trap focus only while truly modal,
- close predictably,
- return focus appropriately.

Avoid using modal dialogs for routine navigation.

---

# 60. Confirm Only When Necessary

Too many confirmations create friction and habituation.

Confirm when:

- action is destructive,
- action is difficult to reverse,
- scope is broad,
- consequence is surprising.

Do not confirm:

```text
copy paragraph
next page
next heading
```

---

# 61. Undo Can Replace Some Confirmations

For reversible editing:

```text
Move Section
Delete Paragraph
```

strong undo support may be better than constant confirmation.

For destructive filesystem actions, confirmation may still be warranted.

---

# 62. Defaults Should Not Hide Advanced Capability

A reader-first interface may hide raw source initially.

But source editing should remain clearly available.

Likewise, advanced Markdown/CSS options can be secondary without being inaccessible.

---

# 63. Customization Must Remain Recoverable

If the user creates a bad theme, shortcut map, or CSS configuration, there must be a way to:

```text
reset
disable
return to defaults
```

No customization should permanently make the app unusable.

---

# 64. Shortcut Customization Should Expose Conflicts

If users remap keys, the application should explain conflicts clearly.

Example:

```text
Ctrl+Shift+H is already assigned to Previous Heading.
```

---

# 65. Voice Commands Should Invoke Semantic Actions

Voice control should not simulate mouse clicks when a semantic command exists.

Prefer:

```text
"copy paragraph"
-> reader.copyCurrentParagraph
```

rather than:

```text
voice -> move mouse -> click context menu
```

---

# 66. Destructive Voice Commands Need More Safeguards

Navigation voice commands are low risk.

Editing commands such as:

```text
delete section
replace all
```

should be:

- undoable,
- possibly confirmed,
- clearly acknowledged.

---

# 67. Built-In Speech Is Not a Screen Reader Replacement

Optional text-to-speech may improve reading.

It should not replace:

- semantic HTML,
- accessibility tree,
- keyboard navigation,
- external screen-reader compatibility.

---

# 68. Accessibility Features Should Improve General UX

Examples:

```text
semantic section summary
```

helps blind users and sighted users scanning large technical docs.

```text
structural editing
```

helps motor-impaired users and power users.

```text
persistent reading position
```

helps everyone.

The strongest accessibility features often improve the entire product.

---

# 69. Do Not Assume Disability Means Simplicity

Users with disabilities may be:

- advanced developers,
- technical authors,
- keyboard power users.

Accessibility must not remove advanced functionality.

---

# 70. Cognitive Accessibility Is Also About Predictability

Useful properties include:

- stable layout,
- consistent commands,
- clear section summaries,
- reduced distraction,
- predictable Back behavior,
- visible progress.

---

# 71. Avoid Hidden State

Important state should be inspectable.

Examples:

```text
reading mode
search scope
document dirty state
current chapter
accessibility profile
```

Hidden mode changes cause errors.

---

# 72. Mode Changes Need Clear Indication

If switching from:

```text
Reader
```

to:

```text
Editor
```

the user should be able to tell.

Likewise:

```text
Document Search
Collection Search
```

should be distinguishable.

---

# 73. Do Not Make Users Infer Save State

Clearly indicate:

```text
saved
unsaved changes
save error
external conflict
```

Do not rely only on subtle color changes.

---

# 74. External File Changes Must Be Understandable

If a file changes on disk:

- explain what changed at a high level,
- preserve current reading/editing position,
- do not overwrite unsaved edits silently.

---

# 75. Performance Is an Interaction Requirement

Latency affects accessibility and usability.

Examples:

- delayed screen-reader feedback,
- slow page turns,
- laggy typing,
- delayed search.

These are HCI failures, not merely performance metrics.

---

# 76. Avoid Blocking the UI

Long tasks such as:

- collection indexing,
- huge file parsing,
- pagination,
- accessibility analysis,

should not freeze basic interaction.

Where possible:

- run asynchronously,
- show progress,
- allow cancellation.

---

# 77. Prioritize Immediate Input Response

Typing and navigation should remain responsive even while:

- preview updates,
- diagnostics run,
- pagination recalculates.

The user's active task should have priority.

---

# 78. Graceful Degradation

If an advanced feature fails:

```text
pagination fails
```

fallback:

```text
continuous reading
```

If custom CSS fails:

```text
safe default theme
```

If extension renderer fails:

```text
preserve source + fallback rendering
```

Core access to the document must survive.

---

# 79. Avoid Dead Ends

Every temporary destination should have an exit.

Examples:

- footnote -> return,
- search result -> origin/back,
- settings -> close,
- full-screen -> exit,
- findings -> return to source/list.

---

# 80. Local Links Should Feel Like Document Navigation

Links between `.md` files should open internally when appropriate.

This supports the mental model:

```text
Markdown files as chapters
```

without proprietary conversion.

---

# 81. External Links Should Feel External

External web links should clearly transition outside the document/application context.

Do not blur privileged app UI and arbitrary web pages.

---

# 82. Preserve Ordinary Filesystem Mental Model

The app should reinforce:

```text
These are your Markdown files.
```

Avoid requiring:

- proprietary import,
- vault conversion,
- database-only storage.

---

# 83. User Control Over Persistence

Reading position, bookmarks, and settings may be stored by the app.

But the Markdown remains ordinary Markdown.

Do not silently inject application metadata into source.

---

# 84. Privacy by Default

Search, reading history, document content, and bookmarks should remain local unless a future feature explicitly says otherwise.

Offline use should remain fully functional.

---

# 85. Error Prevention in Accessible Authoring

The authoring checker should explain:

```text
what may be inaccessible
why it matters
how to fix it
```

Do not reduce accessibility feedback to pass/fail.

---

# 86. Distinguish Standards Failures From Advice

Example:

```text
Missing useful image alternative
```

may be a strong accessibility issue.

```text
Paragraph is unusually long
```

is a readability advisory.

The interface should preserve that distinction.

---

# 87. Accessibility Diagnostics Must Not Interrupt Typing

Live analysis should:

- debounce,
- avoid focus changes,
- avoid constant announcements,
- update asynchronously.

A temporary incomplete Markdown construct should not trigger disruptive errors on every keystroke.

---

# 88. Findings Need Structural Context

A finding should identify:

```text
file
section
node type
source location
```

This reduces navigation effort.

---

# 89. Accessible Testing Should Measure Practical Use

A control being technically reachable is insufficient.

Ask:

```text
Can the task be completed efficiently?
Does the user know what happened?
Can the user recover?
```

---

# 90. Real Users Are Part of Validation

Engineering tests cannot fully predict:

- screen-reader workflow,
- cognitive load,
- voice-control interaction,
- low-vision usability.

Usability testing with disabled users should supplement automated/manual engineering tests.

---

# 91. Interaction Design Review Questions

For every new feature, ask:

1. What is the user's actual intent?
2. What semantic object does the action operate on?
3. Can it be performed without a mouse?
4. What happens to focus?
5. What happens to semantic reading position?
6. What feedback is required?
7. Can the action be undone?
8. Can the user recover if they navigate away?
9. Does high zoom/reflow break it?
10. Does a screen reader receive the same essential information?
11. Does this introduce a hidden mode?
12. Does this duplicate an existing interaction concept?

---

# 92. Interaction Anti-Patterns

Avoid:

```text
pointer-only controls
hover-only information
focus stealing
silent mode changes
scroll-position-only persistence
page-number-only bookmarks
unlabeled icon buttons
drag-only rearrangement
color-only status
automatic destructive rewriting
custom ARIA replacing native semantics
search results without context
reader actions that require edit mode
```

---

# 93. Design Principles Summary

The product should consistently favor:

```text
semantic over pixel
predictable over clever
recoverable over destructive
discoverable over hidden
reversible over permanent
overview before traversal
equal capability across input methods
native semantics over recreation
context preservation over visual convenience
```

---

# 94. Acceptance Criteria

The interaction model should eventually be considered mature when:

- users can read and copy without editing,
- keyboard-only core workflows are complete,
- screen readers receive useful document structure,
- low-vision changes preserve position,
- search preserves context and origin,
- pagination preserves semantic position,
- temporary panels restore focus,
- structural edits preserve orientation,
- destructive operations are undoable or confirmed,
- customizations are recoverable,
- accessibility features are integrated rather than segregated,
- user testing validates practical usability.

---

# 95. Final Product Rule

> **Every interaction should preserve the user's understanding of the document, the application, and their current place within both.**
