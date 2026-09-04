# Accessible Markdown Reader & Editor
# Competitor Gap Matrix

**Document type:** Product research and competitive analysis  
**Status:** Working research specification  
**Research date:** 2026-09-03  
**Purpose:** Compare the proposed product against strong adjacent Markdown tools, identify genuinely differentiated product territory, and prevent the project from mistaking ordinary Markdown-editor features for unique value.

---

# 1. Purpose

This document is not intended to prove that competing applications are bad.

Several existing Markdown applications are mature, capable, and excellent at the problems they were built to solve.

The useful question is:

> **What important user experience remains underserved even after accounting for the strengths of existing Markdown tools?**

The proposed application is being designed around a specific intersection:

```text
filesystem-first
+
reader-first
+
semantic navigation
+
persistent reading context
+
book-like long-form reading
+
accessibility as primary architecture
+
accessible authoring
```

The competitive analysis should test whether that intersection is meaningfully distinct.

---

# 2. Research Method

Primary comparison was based on first-party documentation and project documentation available on 2026-09-03.

Products reviewed:

```text
Typora
Zettlr
Visual Studio Code
Joplin
iA Writer
MarkText
Obsidian
```

These products were selected because they represent different adjacent categories:

- polished Markdown editor,
- academic/publishing workbench,
- developer editor,
- note ecosystem,
- focused writing application,
- open-source WYSIWYG Markdown editor,
- local-file knowledge-management platform.

---

# 3. Evidence Scale

The matrix uses:

```text
YES
Documented first-party capability strongly matches the category.

PARTIAL
Related functionality exists but does not appear to satisfy the full proposed behavior.

NO COMPARABLE FEATURE FOUND
No comparable first-party feature was identified during this research pass.

N/A
Category does not meaningfully apply.

UNKNOWN
Insufficient first-party evidence.
```

`NO COMPARABLE FEATURE FOUND` does **not** claim that no plugin, extension, hidden setting, experimental feature, or undocumented workflow exists.

It means that a comparable product capability was not identified in the reviewed first-party material.

---

# 4. Executive Finding

The proposed product should **not** try to differentiate itself merely by having:

- Markdown editing,
- live preview,
- source mode,
- themes,
- outline,
- tables,
- math,
- diagrams,
- search,
- focus mode,
- keyboard shortcuts,
- local files.

Those are established capabilities.

The stronger gap appears to be:

> **A filesystem-native Markdown application designed first as an accessible long-form reader and semantic navigator, while still providing serious authoring capabilities.**

The most unusual combination is not a single feature.

It is the integration of:

```text
ordinary .md files
semantic reader cursor
persistent semantic reading position
section-aware search
nonvisual document overview
book-style pagination
cross-file chapter reading
structural editing
accessibility diagnostics
screen-reader-first interaction contracts
```

---

# 5. High-Level Matrix

| Capability | Proposed App | Typora | Zettlr | VS Code | Joplin | iA Writer | MarkText | Obsidian |
|---|---|---|---|---|---|---|---|---|
| Ordinary Markdown files | YES | YES | YES | YES | PARTIAL | YES | YES | YES |
| Strong source editor | YES | YES | YES | YES | YES | YES | YES | YES |
| WYSIWYM / live rendered editing | Intended | YES | YES | Preview/source rather than primary WYSIWYM | YES, Rich Text editor | PARTIAL | YES | YES, Live Preview |
| Rendered reader mode | YES | YES | YES | YES | YES | YES | YES | YES |
| Reader is primary product identity | YES | PARTIAL | NO | NO | NO | PARTIAL | NO | NO |
| Reader copy without edit mode | YES | YES | Likely | YES | YES | YES | Likely | YES |
| Semantic heading navigation | YES | Outline | Outline | Outline/symbols | Screen-reader/region navigation | UNKNOWN | UNKNOWN | Outline |
| Paragraph/sentence semantic navigation | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE MARKDOWN FEATURE FOUND | NO COMPARABLE FEATURE FOUND | Focus modes, not semantic navigation | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND |
| "Where am I?" semantic location | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | Accessibility context exists generally | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND |
| Section summary before entering | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE MARKDOWN FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND |
| Search grouped by document section | YES | NO COMPARABLE FEATURE FOUND | PARTIAL: strong search, not same section-result model | NO COMPARABLE FEATURE FOUND | PARTIAL | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | PARTIAL |
| Search current semantic section only | YES | NO COMPARABLE FEATURE FOUND | UNKNOWN | NO COMPARABLE FEATURE FOUND | UNKNOWN | UNKNOWN | UNKNOWN | Search operators exist; not same reader concept |
| Return to pre-search reading position | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | Generic navigation history | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | Generic navigation history |
| Persistent semantic reading position | YES | UNKNOWN | UNKNOWN | Editor cursor/scroll state, not proposed semantic model | UNKNOWN | UNKNOWN | UNKNOWN | Workspace state, not same semantic contract |
| Position survives repagination/font change | YES | N/A | N/A | N/A | N/A | N/A | N/A | N/A |
| Single-page book mode | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO | NO | Preview/PDF oriented | NO | NO |
| Two-page responsive spread | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO | NO | NO COMPARABLE FEATURE FOUND | NO | NO |
| Linked `.md` files as reader chapters | YES | PARTIAL | PARTIAL | PARTIAL | Notes/navigation ecosystem | NO COMPARABLE FEATURE FOUND | PARTIAL | Strong linked-note navigation |
| Cross-file reading progress | YES | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO | NO COMPARABLE FEATURE FOUND |
| Structural select/copy/move section | YES | PARTIAL text editing | PARTIAL line editing/Vim/Emacs | Strong text/code commands, not Markdown semantic section editing | PARTIAL | NO COMPARABLE FEATURE FOUND | PARTIAL | Plugins may exist; core comparison not found |
| Accessibility authoring checker | YES | NO COMPARABLE FEATURE FOUND | Markdown style checker, not accessibility checker | Extensions can lint Markdown; not core accessible-authoring system | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | NO COMPARABLE FEATURE FOUND | Plugins may exist |
| Dedicated screen-reader documentation | YES intended | UNKNOWN | Some screen-reader guidance in docs | YES | YES | YES | UNKNOWN | UNKNOWN |
| Screen-reader-first product architecture | YES | NO COMPARABLE EVIDENCE | NO COMPARABLE EVIDENCE | Strong general editor accessibility | Strong documented accessibility effort | Platform accessibility support | NO COMPARABLE EVIDENCE | UNKNOWN |
| Low-vision typography overriding pagination safely | YES | Themes/CSS | Themes/CSS | Zoom/high contrast | Themes/UI scaling | Accessibility support | Themes | Themes/CSS |
| Offline core | YES | YES | YES | YES | YES | YES | YES | YES |
| Required proprietary document format | NO | NO | NO | NO | App note database despite Markdown storage/export | NO | NO | NO |
| Local filesystem mental model central | YES | YES | YES/workspaces | YES | PARTIAL | YES/library | YES | YES, vault folders |
| Security model for untrusted rendered Markdown | YES intended | UNKNOWN | UNKNOWN | YES, documented preview security | YES, documented viewer isolation | UNKNOWN | UNKNOWN | UNKNOWN |

---

# 6. Typora

## 6.1 Product Strength

Typora describes itself as a minimal Markdown editor and reader and explicitly emphasizes a seamless readable/writable experience.

Its strongest differentiators include:

- live preview without a separate preview pane,
- polished WYSIWYM-style editing,
- images,
- headings,
- lists,
- tables,
- code fences,
- mathematics,
- diagrams,
- outline navigation,
- custom CSS themes,
- focus mode,
- typewriter mode,
- broad export support.

Typora is therefore one of the strongest comparisons for the proposed application's polished authoring experience.

## 6.2 Where Typora Already Solves the Problem

The proposed application should not claim uniqueness for:

```text
live preview
clean Markdown authoring
outline navigation
custom CSS
focus mode
typewriter mode
math
diagrams
tables
export
```

Typora already provides a mature implementation of these ideas.

## 6.3 Gap Relative to Proposed Product

No comparable first-party feature was identified for:

- semantic paragraph/sentence navigation,
- persistent semantic reader position,
- nonvisual section summaries,
- "where am I?" structural location,
- section-grouped reader search,
- responsive book pagination,
- linked Markdown as a persistent multi-chapter reading experience,
- integrated accessibility-authoring diagnostics.

## 6.4 Competitive Lesson

Do not attempt to beat Typora merely at:

> "Markdown without ugly syntax."

The stronger differentiation is:

> "Markdown that understands where the reader is and how the document is structured."

---

# 7. Zettlr

## 7.1 Product Strength

Zettlr is a particularly strong competitor on authoring depth.

Current documentation describes a feature-rich Markdown editor with:

- WYSIWYG-style editing,
- keyboard formatting,
- regular-expression search,
- autocomplete,
- footnotes,
- table editor,
- snippets,
- YAML front matter,
- scientific/technical workflows,
- exporting,
- PKMS/Zettelkasten workflows,
- Vim and Emacs modes,
- Markdown style checking.

Its documentation also explicitly recognizes keyboard/screen-reader navigation concerns, for example noting how users can release editor Tab behavior for app navigation.

## 7.2 Markdown Style Checker

Zettlr has an opinionated Markdown style checker that reports syntax/style issues and integrates findings into its diagnostics system.

That substantially overlaps the *mechanism* of the proposed accessible-authoring checker:

```text
analyze
identify span
surface finding
explain issue
```

The proposed product therefore should not describe "live Markdown diagnostics" alone as novel.

## 7.3 Gap Relative to Proposed Product

The proposed distinction is that diagnostics are specifically about accessible authoring and are tied to:

- WCAG-related semantics,
- image alternatives,
- heading hierarchy,
- link meaning,
- table structure,
- rendered accessibility behavior.

No comparable first-party system was identified for the full accessible-authoring rules catalog.

Likewise, no comparable first-party design was identified for:

- semantic reading cursor,
- sentence/paragraph reader navigation,
- persistent semantic reading context,
- book-style responsive pagination,
- section preview for nonvisual users.

## 7.4 Competitive Lesson

Zettlr demonstrates that a serious Markdown application can expose:

```text
simple writing
+
advanced power-user workflows
```

without splitting into separate products.

That strongly supports the proposed product's "basic to advanced" authoring philosophy.

---

# 8. Visual Studio Code

## 8.1 Product Strength

VS Code is one of the strongest comparisons for:

- source editing,
- keyboard commands,
- command palette,
- extensibility,
- accessibility infrastructure,
- Markdown outline,
- side-by-side preview,
- editor/preview synchronization,
- preview security.

VS Code can also be configured so Markdown preview is the default editor for `.md` files.

Its general accessibility support is extensive:

- zoom,
- high-contrast themes,
- keyboard navigation,
- screen-reader optimized mode,
- accessibility help,
- Tab focus mode.

## 8.2 Important Architectural Lessons

VS Code validates several proposed architecture choices:

```text
semantic command system
keyboard discoverability
command palette
preview/source synchronization
security restrictions around rendered Markdown
```

VS Code's Markdown preview also documents security levels and blocks scripts in strict mode.

## 8.3 Gap Relative to Proposed Product

VS Code is fundamentally a code/editor workbench.

Its Markdown functionality is strong, but no comparable first-party Markdown reading experience was identified for:

- semantic paragraph/sentence reading,
- book-like pagination,
- reader resume position as a semantic contract,
- section summaries for nonvisual preview,
- grouped-by-section reader search,
- Markdown-specific accessible-authoring guidance.

## 8.4 Competitive Lesson

Do not try to out-VS-Code VS Code.

Instead borrow its:

- command architecture,
- keyboard discoverability,
- accessibility discipline,
- extension/security lessons,

while designing the primary experience around **reading Markdown**, not managing a software-development workspace.

---

# 9. Joplin

## 9.1 Product Strength

Joplin is one of the most important accessibility comparisons.

Its first-party documentation includes dedicated screen-reader and keyboard accessibility guidance.

It documents:

- application regions,
- keyboard focus navigation,
- NVDA,
- VoiceOver,
- Orca,
- Tab-key navigation mode,
- note viewer/editor distinctions.

Joplin is also offline-first and stores notes in Markdown internally.

## 9.2 Rich Text Editing

Joplin provides a Rich Text editor layered over Markdown.

Its documentation is unusually candid about round-trip limitations.

Examples include:

- unsupported Markdown plugins,
- normalization of tables/lists,
- reference-link conversion,
- loss of certain HTML formatting.

This is directly relevant to the proposed principle:

> **Be liberal in what you can open, conservative in what you modify.**

## 9.3 Security Architecture

Joplin also documents isolating its note viewer using a separate protocol/origin to reduce the impact of sanitizer defects and improve performance.

That is valuable prior art for the proposed rendering-security design.

## 9.4 Gap Relative to Proposed Product

Joplin is primarily a notes/notebook system rather than a filesystem Markdown reader.

Plain Markdown can be imported and external editors can be used, but the mental model is centered around Joplin notes and notebooks.

No comparable first-party capability was identified for:

- book pagination,
- persistent semantic paragraph-level resume,
- nonvisual section preview,
- section-grouped reader search,
- structural Markdown section editing,
- accessible-authoring diagnostics.

## 9.5 Competitive Lesson

Joplin demonstrates that Markdown software can take screen-reader documentation seriously.

The proposed application should therefore aim beyond:

> "works with a screen reader."

The target should be:

> "the application's information architecture is designed to reduce the amount of work the screen-reader user must do."

---

# 10. iA Writer

## 10.1 Product Strength

iA Writer is a strong comparison for focused reading/writing.

It provides:

- Markdown editing,
- preview,
- side-by-side editor/preview,
- templates,
- Focus features,
- polished distraction-reduced writing.

Its first-party accessibility documentation states support for:

- VoiceOver on macOS/iOS/iPadOS,
- TalkBack on Android,

while noting ongoing Windows accessibility work.

## 10.2 Gap Relative to Proposed Product

iA Writer's preview is oriented toward viewing how a document will render/export.

No comparable first-party design was identified for:

- semantic reading cursor,
- current section overview,
- paragraph/sentence navigation,
- section-grouped search,
- book-style linked Markdown chapters,
- persistent semantic reader position,
- accessible-authoring checker.

## 10.3 Competitive Lesson

The proposed product can learn from iA Writer's focus on reducing interface noise.

However, "distraction-free" should not mean hiding structural information from users who need it.

The proposed reader should combine:

```text
quiet visual presentation
+
rich semantic information on demand
```

---

# 11. MarkText

## 11.1 Product Strength

MarkText is an open-source Markdown editor with:

- real-time WYSIWYG preview,
- CommonMark/GFM support,
- selected Pandoc features,
- math,
- front matter,
- emoji,
- source mode,
- typewriter mode,
- focus mode,
- themes,
- HTML/PDF export.

## 11.2 Gap Relative to Proposed Product

MarkText substantially overlaps the authoring surface of the proposed product.

No comparable first-party feature was identified for the proposed deeper reader architecture:

- semantic navigation,
- persistent semantic reading position,
- long-form book pagination,
- nonvisual section overview,
- accessible-authoring diagnostics.

## 11.3 Competitive Lesson

Open source + Markdown + WYSIWYG is not sufficient differentiation.

The product must differentiate through the **reader and accessibility model**, not merely licensing or editing presentation.

---

# 12. Obsidian

## 12.1 Product Strength

Obsidian is one of the strongest comparisons for local-file workflows.

Its core model is based around local Markdown files in vault folders.

It also offers:

- Source mode,
- Live Preview,
- Reading view,
- links between notes,
- heading/block navigation,
- search,
- command palette,
- configurable hotkeys,
- extensive plugin ecosystem,
- graph/knowledge-management workflows.

Obsidian therefore overlaps strongly with:

```text
filesystem-first
linked Markdown
power-user navigation
```

## 12.2 Why Obsidian Matters

The proposed product cannot credibly claim that:

> "Markdown files linked together like a knowledge/book system"

is unique by itself.

Obsidian already demonstrates powerful linked-file workflows.

## 12.3 Gap Relative to Proposed Product

The proposed target remains materially different:

- reader-first instead of PKM-first,
- accessibility architecture rather than plugin-dependent accessibility,
- responsive page/spread reading,
- explicit semantic reading cursor,
- section summary and nonvisual overview,
- persistent reader position robust to reflow,
- accessibility authoring diagnostics,
- structural operations defined around accessible reading/editing semantics.

## 12.4 Competitive Lesson

Obsidian proves local Markdown can support sophisticated application behavior without abandoning filesystem ownership.

That validates a core proposed principle.

The differentiation must therefore be:

```text
not local Markdown alone
but local Markdown + accessible long-form reading architecture
```

---

# 13. Feature Territory That Is Already Crowded

The following areas are mature and competitive.

They should be treated as expected product quality rather than primary differentiation:

## Editing

```text
source editing
live preview
WYSIWYM
bold/italic shortcuts
lists
tables
code
math
front matter
```

## Appearance

```text
themes
custom CSS
focus mode
typewriter mode
dark mode
```

## Navigation

```text
heading outline
file tree
basic links
standard Find
```

## Export

```text
HTML
PDF
other document formats
```

## Power User

```text
keyboard shortcuts
command palette
Vim modes
plugins
```

---

# 14. Feature Territory That Appears Less Crowded

The research identified substantially less first-party competition around the following combination.

## 14.1 Semantic Reading Cursor

The reader understands:

```text
current section
current paragraph
current sentence
current semantic object
```

independently from editor caret or pixel scroll.

---

## 14.2 Durable Semantic Reading Position

Position survives:

```text
close/reopen
window resizing
font changes
pagination changes
reasonable document edits
```

---

## 14.3 Nonvisual Structural Preview

Before entering a section:

```text
8 paragraphs
2 subsections
1 table
3 links
1 code block
estimated reading time
```

This converts visual "glance" information into explicit semantic information.

---

## 14.4 Section-Aware Search

Search results are organized around document meaning rather than anonymous occurrence numbers.

```text
Memory Management
  Heap — 2 matches
  Virtual Memory — 4 matches
```

---

## 14.5 Book-Like Markdown Reading

Ordinary Markdown remains ordinary Markdown while presentation provides:

```text
single page
two-page spread
chapter navigation
reading progress
resume
```

---

## 14.6 Structural Reader Commands

Commands such as:

```text
copy paragraph
copy section
repeat sentence
describe section
next code block
```

operate on the semantic document rather than DOM selection tricks.

---

## 14.7 Accessible Structural Editing

Commands such as:

```text
select section
move section down
promote heading
copy code block
```

use the same structural vocabulary as reader navigation.

---

## 14.8 Accessible Authoring Integrated With Reading Semantics

The same semantic model powers:

```text
reader
screen reader
search
editor
outline
pagination
accessibility checker
```

That architectural unification is more significant than any single rule.

---

# 15. Differentiation Map

The strongest positioning can be represented as:

```text
                    AUTHORING DEPTH
                         ^
                         |
          Zettlr         |      VS Code
                         |
      Typora             |
                         |
-------------------------+------------------------> SYSTEM / PKM COMPLEXITY
                         |
     iA Writer           |              Obsidian
                         |
       MarkText          |       Joplin
                         |
                         |
                         v
                 READING SPECIALIZATION
```

The proposed application aims at a different axis:

```text
LONG-FORM SEMANTIC READING
+
ACCESSIBILITY DEPTH
```

That axis is poorly represented by a normal editor-vs-PKM matrix.

---

# 16. Proposed Product Position

A concise positioning statement:

> **A filesystem-first Markdown reader and editor built around semantic long-form reading, accessibility, and durable reading context.**

Expanded:

> Open ordinary Markdown files and read them like documents or books, navigate them by meaning rather than scrolling, resume exactly where you stopped, search with structural context, and author accessible Markdown without surrendering your files to a proprietary format.

---

# 17. What the Product Should Not Become

Competitive pressure can tempt the project to copy every feature from adjacent tools.

Avoid turning the product into:

## Another VS Code

Do not make software-development workspace complexity the primary experience.

## Another Obsidian

Do not let PKM/database/plugin ecosystem concerns overwhelm reading.

## Another Typora

Do not make polished WYSIWYM editing the sole identity.

## Another Zettlr

Do not broaden into a complete academic publishing environment unless it supports the core purpose.

## Another Joplin

Do not require users to adopt an application-managed notes database.

The reader/editor should stay focused.

---

# 18. Competitive Design Lessons Worth Adopting

## From Typora

- polished direct Markdown editing,
- restrained interface,
- readable live preview.

## From Zettlr

- power-user depth,
- diagnostics,
- Vim/Emacs optionality,
- serious document workflows.

## From VS Code

- semantic command architecture,
- command palette,
- accessibility discipline,
- renderer security,
- keyboard discoverability.

## From Joplin

- explicit screen-reader documentation,
- region navigation,
- honest round-trip limitations,
- isolated rendered-document security context.

## From iA Writer

- distraction reduction,
- typography and visual restraint,
- accessibility through platform integration.

## From MarkText

- open-source WYSIWYG Markdown editing.

## From Obsidian

- local Markdown ownership,
- linked-file power,
- scalable command/hotkey model.

---

# 19. Competitive Risk

The largest product risk is not that another application already has every proposed feature.

It is that users may reasonably ask:

> "Why not use Obsidian, Typora, Zettlr, Joplin, VS Code, or iA Writer?"

The answer must be visible in normal use.

If the application eventually feels like:

```text
Typora + accessibility settings
```

the differentiation is weak.

If it feels like:

```text
a reader that understands Markdown structurally
and happens to include a serious editor
```

the product occupies a clearer space.

---

# 20. Accessibility Competitive Risk

Accessibility cannot be marketed merely as:

```text
WCAG compliant
screen-reader compatible
keyboard accessible
```

Those phrases are too broad and are not themselves product differentiation.

The meaningful experience should be concrete:

```text
Where am I?
What is in this section?
Skip to the next paragraph.
Repeat this sentence.
Search only this section.
Copy this entire code block.
Return to where I was reading.
Open tomorrow and resume here.
```

The product should make accessibility visible through reduced effort.

---

# 21. Reader-First Competitive Test

When evaluating future features, ask:

> Does this make long-form Markdown substantially better to read, navigate, understand, resume, or author accessibly?

If not, it may still be useful—but it should not displace the core product.

---

# 22. Competitive Acceptance Criteria

The product should eventually demonstrate workflows that are difficult to reproduce as one coherent first-party experience in the reviewed applications.

Minimum demonstrations:

## Demo 1 — Semantic Resume

1. Open a 4,000-line Markdown file.
2. Navigate to a paragraph.
3. Close.
4. Reopen.
5. Resume semantically.
6. Increase font size dramatically.
7. Remain at the same content.

## Demo 2 — Nonvisual Overview

1. Reach a section heading.
2. Ask what is in the section.
3. Hear paragraph/subheading/table/image/link/code counts.
4. Decide whether to enter.

## Demo 3 — Structural Search

1. Search a repeated technical term.
2. Results grouped by sections.
3. Inspect distant results.
4. Return to original reading location.

## Demo 4 — Markdown Book

1. Open ordinary chapter `.md`.
2. Read in a two-page spread.
3. Follow linked chapter.
4. Bookmark paragraph.
5. Close.
6. Resume later.

## Demo 5 — Accessible Structural Authoring

1. Navigate editor semantically.
2. Select a section.
3. Move it.
4. Receive structural confirmation.
5. Run accessibility analysis.
6. Navigate directly to heading/alt/table issue.

If these experiences work exceptionally well, the differentiation is much stronger than a checklist comparison.

---

# 23. Research Limitations

This review has limits.

- Competitor products change rapidly.
- Plugin ecosystems can add capabilities not present in core.
- Accessibility behavior may be better or worse than documentation suggests.
- Some features may exist without first-party documentation.
- Actual usability cannot be determined from documentation alone.

Therefore, the matrix should be treated as:

```text
competitive research
not a permanent factual verdict
```

---

# 24. Recommended Future Competitive Testing

Documentation research should eventually be supplemented by hands-on task testing.

Use the same task script across products:

```text
open arbitrary Markdown from filesystem
read without source
navigate headings
navigate paragraphs
copy paragraph
search repeated term
return from search
resume after reopen
increase text size
follow local Markdown link
use screen reader
inspect section structure
```

Measure:

```text
actions required
mouse dependency
orientation loss
screen-reader verbosity
file-format friction
context persistence
```

This would create a much stronger empirical competitor matrix.

---

# 25. Sources Reviewed

## Typora

- Official product page: https://typora.io/

## Zettlr

- Official documentation: https://docs.zettlr.com/
- Markdown editor: https://docs.zettlr.com/en/editor/
- Markdown syntax/style checker: https://docs.zettlr.com/en/language-style/syntax.html
- Markdown compendium: https://docs.zettlr.com/en/editor/markdown-compendium.html

## Visual Studio Code

- Markdown: https://code.visualstudio.com/docs/languages/markdown
- Accessibility: https://code.visualstudio.com/docs/configure/accessibility/accessibility

## Joplin

- Product/help: https://joplinapp.org/help/
- Screen-reader accessibility: https://joplinapp.org/help/apps/screen_reader_accessibility/
- Markdown: https://joplinapp.org/help/apps/markdown/
- Rich Text editor: https://joplinapp.org/help/apps/rich_text_editor/
- Note viewer isolation: https://joplinapp.org/help/dev/spec/note_viewer_isolation/

## iA Writer

- Support: https://ia.net/writer/support
- Accessibility: https://ia.net/writer/support/help/accessibility
- Preview: https://ia.net/writer/support/preview

## MarkText

- Project repository: https://github.com/marktext/marktext

## Obsidian

- Help: https://help.obsidian.md/
- Live Preview documentation: https://help.obsidian.md/Live+preview+update
- URI / file and heading navigation: https://help.obsidian.md/Extending+Obsidian/Obsidian+URI

---

# 26. Final Competitive Thesis

There are already excellent Markdown editors.

There are already excellent note systems.

There are already highly accessible code editors.

There are already polished distraction-free writing applications.

The comparatively underserved space is:

> **an application that treats long-form Markdown reading itself as a first-class semantic interaction problem—particularly for users who cannot rely on visual scanning, a mouse, stable page geometry, or continuous vertical scrolling.**

That is the space this product should protect.
