# ADR-004: Markdown Source Editor Engine

**Status:** Proposed  
**Date:** 2026-09-03  
**Decision owners:** Project maintainers  
**Scope:** Raw Markdown editing, editor accessibility, source selection, undo/redo, keymaps, decorations, diagnostics integration  
**Related specifications:** Semantic Document Model, Command System, Accessibility Requirements, Test Strategy, Performance Budget

---

## 1. Context

The application needs a serious Markdown source editor.

Requirements include:

- large-document editing,
- source selection and caret control,
- undo/redo,
- Markdown syntax highlighting,
- custom keymaps,
- structural command integration,
- diagnostics,
- source/preview synchronization,
- accessible keyboard behavior,
- screen-reader usability,
- bidirectional text,
- high customization without building a text editor from scratch.

The editor is not the reader.

The project should therefore use a mature editor engine for raw source editing while keeping:

```text
semantic reader
document parser
application commands
accessibility diagnostics
```

as application-owned systems.

---

## 2. Decision

Use **CodeMirror 6** as the initial raw Markdown editor engine.

Use its Markdown language support and extension system for editor-native functionality.

The editor remains one component inside the application architecture rather than becoming the semantic source for the whole product.

Conceptually:

```text
Document Source / Buffer
       |
       +--> CodeMirror 6 editor view
       |
       +--> application Markdown parser
              |
              v
        Semantic Document Model
```

CodeMirror's syntax tree does not replace ADR-001's semantic parsing model.

---

## 3. Why CodeMirror 6

### 3.1 Accessibility Is Explicitly a Product Feature

CodeMirror's first-party site explicitly lists accessibility and states support for screen readers and keyboard-only users.

That does not eliminate the need for application testing, but accessibility is not an undocumented afterthought.

### 3.2 Keyboard-Trap Awareness

CodeMirror intentionally does not bind Tab by default so the editor can satisfy the WCAG no-keyboard-trap requirement.

It documents an escape mechanism and a dedicated Tab-focus mode.

This aligns strongly with the project's keyboard-first architecture.

### 3.3 Extensible State Model

CodeMirror 6 provides:

- immutable editor state,
- transactions,
- selections,
- state fields,
- facets,
- extensions,
- keymaps,
- decorations,
- panels.

This is suitable for integrating:

- accessibility findings,
- semantic context decorations,
- structural commands,
- editor modes.

### 3.4 Large Documents

CodeMirror documentation includes a huge-document example demonstrating an editor with millions of lines.

This does not prove all of our Markdown configurations will meet our budgets, but the core editor architecture is designed for large text.

### 3.5 Bidirectional Text

The documented extension/examples include explicit bidirectional-text handling.

This matters for Unicode and RTL requirements.

### 3.6 Markdown Language Support

CodeMirror provides a Markdown language package and configurable code-language support within fenced code blocks.

---

## 4. Editor Responsibilities

CodeMirror owns editor-native concerns:

```text
caret
text selection
composition/input
editor viewport
editor undo/redo history
syntax highlighting
editor decorations
editor keymaps
editor-local search/replace if used
```

---

## 5. Application Responsibilities

The application owns:

```text
SemanticDocument
SectionTree
SemanticPosition
reader navigation
book pagination
reader search
accessible-authoring rule engine
cross-file navigation
persistent bookmarks
application command registry
```

Do not couple these systems to CodeMirror internals.

---

## 6. CodeMirror Parse Tree Is Not the Product Semantic Model

CodeMirror uses Lezer parsing for language features.

The application must not use the CodeMirror Markdown syntax tree as the sole semantic model.

Reasons:

- reader must function without editor mounted,
- parsing architecture should remain independent,
- persisted positions cannot depend on editor internals,
- search/pagination need stable product-level semantics.

---

## 7. Source Synchronization

The application needs a dedicated document-buffer contract.

Conceptual:

```ts
interface DocumentBuffer {
  getText(): string;
  getVersion(): number;
  applyEdit(edit: SourceEdit): void;
  subscribe(listener): Unsubscribe;
}
```

CodeMirror transactions update the document buffer.

External/app structural edits update CodeMirror through controlled transactions when the editor is mounted.

Avoid two independent writable copies of source.

---

## 8. Structural Commands

Application structural commands should:

1. resolve semantic source range,
2. create source edit,
3. apply through document buffer/editor transaction,
4. preserve selection/caret semantically,
5. participate in undo.

Example:

```text
structure.moveSectionDown
```

must not be implemented as a CodeMirror-specific line-moving trick.

---

## 9. Undo / Redo

CodeMirror's history should be the primary editor undo/redo system while the editor is active.

Application structural edits should enter that history as coherent transactions.

Expected:

```text
Move Section Down
-> one Undo returns the section
```

not dozens of low-level edits.

---

## 10. Editor Search

CodeMirror may provide source-editor search/replace.

This is separate from the product's semantic reader search.

UI must distinguish:

```text
Search Markdown Source
```

from:

```text
Search Rendered Document
```

Both may use Ctrl/Cmd+F depending on active context.

---

## 11. Diagnostics

Accessibility findings may render as:

- gutter markers,
- underlines,
- panel items,
- source decorations.

The finding engine remains application-owned.

CodeMirror receives finding positions/decorations.

---

## 12. Focus

CodeMirror focus must not be conflated with semantic reading position.

When editor is active:

```text
editor caret
```

can map into semantic position.

Leaving editor for settings/search does not erase caret context.

---

## 13. Tab Behavior

Default policy should preserve easy keyboard escape from the editor.

If the product enables Tab-to-indent, it must provide and document an accessible escape mechanism.

The application should test this with:

- keyboard-only users,
- VoiceOver,
- NVDA,
- Narrator,
- Orca.

---

## 14. Application Keymaps

Do not blindly install every CodeMirror key binding.

The command architecture is authoritative for application-level commands.

Editor-specific keymaps should coexist with:

```text
app command shortcuts
screen-reader shortcuts
OS conventions
```

---

## 15. Vim / Emacs

CodeMirror's extension ecosystem may permit Vim-like or Emacs-like behavior.

Such modes are optional profiles.

They must not alter core product capabilities.

---

## 16. Editor Accessibility Contract

The editor must be manually tested for:

- character navigation,
- word navigation,
- paragraph navigation,
- selection feedback,
- Markdown punctuation,
- code fences,
- large files,
- live diagnostics,
- split preview updates.

Passing CodeMirror's general accessibility claim is not enough.

---

## 17. Rendered Editing

This ADR selects the **raw source editor engine**.

It does not decide the implementation of any future WYSIWYM/rendered editing mode.

If rendered editing becomes a separate contenteditable/editor architecture, that requires another ADR.

---

## 18. Split View

CodeMirror source view can be synchronized with reader preview through:

```text
source offset
-> application semantic node
-> rendered semantic node
```

Do not use only scroll percentages.

---

## 19. Performance

The editor must meet typing-latency budgets.

Avoid running these synchronously inside every CodeMirror transaction:

```text
full accessibility analysis
full pagination
collection indexing
expensive fuzzy position matching
```

Use:

- debouncing,
- workers,
- versioning,
- incremental work.

---

## 20. Very Large Markdown

The torture corpus includes pathological long lines and huge blocks.

CodeMirror configuration itself must be benchmarked.

The presence of a generic huge-document demo does not guarantee that:

```text
Markdown parsing
syntax highlighting
our decorations
```

remain fast on all adversarial inputs.

---

## 21. Source Fidelity

CodeMirror edits text directly and therefore fits the source-fidelity approach.

Do not introduce an AST serializer merely because the editor has parsed syntax information.

---

## 22. Alternatives Considered

### Alternative A — Monaco Editor

Strengths:

- extremely mature,
- VS Code lineage,
- strong accessibility settings,
- excellent language/editor capabilities.

Monaco's API exposes screen-reader accessibility support and configurable accessibility page sizing.

Reasons not selected initially:

- heavier workbench/code-editor orientation,
- larger footprint,
- more capability than this Markdown-focused editor needs,
- CodeMirror's extension model and embedding model are a better fit for a focused document application.

Monaco remains a viable fallback if CodeMirror proves inadequate under screen-reader or large-document testing.

### Alternative B — `<textarea>`

Strengths:

- native accessibility,
- low complexity.

Rejected as primary editor because serious authoring requires:

- syntax highlighting,
- decorations,
- diagnostics,
- structural integrations,
- advanced selections,
- scalable editor behavior.

A plain textarea may still be useful as an emergency fallback.

### Alternative C — contenteditable custom editor

Rejected.

Building a robust accessible source-code/text editor is a major product in itself.

### Alternative D — ProseMirror / rich-text editor

More appropriate for rendered rich-text authoring than raw Markdown source.

Does not replace the need for a raw source editor.

---

## 23. Consequences

### Positive

- mature embedded editor,
- strong extension architecture,
- screen-reader/keyboard accessibility is explicitly considered,
- large-document architecture,
- source edits remain direct text operations.

### Negative

- editor introduces its own state/transaction model,
- application must prevent semantic architecture from leaking into CodeMirror-specific assumptions,
- Markdown language configuration requires performance testing,
- screen-reader behavior must still be validated across platforms.

---

## 24. Risks

### RISK-001 — Duplicate source authority

Mitigation:

document-buffer abstraction with one writable source contract.

### RISK-002 — CodeMirror syntax tree becomes semantic model

Mitigation:

strict semantic parser boundary.

### RISK-003 — Keymap conflict with AT

Mitigation:

manual AT tests and configurable shortcuts.

### RISK-004 — Decorations harm screen-reader editing

Mitigation:

manual raw-editor accessibility scripts.

### RISK-005 — Pathological Markdown slows editor

Mitigation:

torture corpus + performance budgets.

---

## 25. Acceptance Criteria

Move to Accepted after prototype verifies:

1. Markdown syntax editing works,
2. screen-reader basic editing works on macOS and Windows,
3. keyboard escape from editor is reliable,
4. structural source edits can enter undo history coherently,
5. source↔semantic mapping works,
6. 10k-line fixture remains responsive,
7. large code blocks/long lines degrade acceptably,
8. split preview updates do not steal focus.

---

## 26. Research Basis

Reviewed 2026-09-03:

- CodeMirror: https://codemirror.net/
- Basic editor: https://codemirror.net/examples/basic/
- Tab handling/accessibility: https://codemirror.net/examples/tab/
- CodeMirror reference: https://codemirror.net/docs/ref/
- Monaco Editor API: https://microsoft.github.io/monaco-editor/typedoc/interfaces/editor_editor_api.editor.IEditorOptions.html

CodeMirror currently documents accessibility support for screen readers and keyboard-only users, intentionally accessible Tab handling, an extension-based architecture, selection/document APIs, bidirectional-text support, and very large-document examples.

---

## 27. Final Decision Rule

> **Use CodeMirror to solve the hard problem of editing text; keep the application's understanding of Markdown, reading, and accessibility outside the editor engine.**
