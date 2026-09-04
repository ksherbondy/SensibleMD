# Accessible Markdown Reader & Editor
# Accessible Authoring Rules Catalog

**Document type:** Accessibility authoring specification  
**Status:** Working specification  
**Purpose:** Define the rules, diagnostics, severities, explanations, remediation guidance, and verification behavior used to help authors create more accessible Markdown content.

---

# 1. Purpose

This catalog defines the accessibility-aware authoring rules for the Markdown editor.

The objective is not merely to validate syntax. The objective is to help authors avoid publishing Markdown that is structurally difficult or impossible to use with assistive technology.

The rules in this document should eventually power:

- live editor diagnostics,
- document-wide accessibility reports,
- accessible authoring panels,
- source annotations,
- quick navigation to issues,
- automated tests,
- CI or command-line analysis if that capability is later added.

The application should distinguish between:

1. **Definite structural accessibility problems**
2. **Likely accessibility problems**
3. **Readability or usability heuristics**
4. **Informational recommendations**

The application must not represent subjective readability guidance as though it were a WCAG conformance failure.

---

# 2. Core Design Principles

## 2.1 Explain, do not merely flag

A useful diagnostic should answer:

```text
What is wrong?
Where is it?
Why does it matter?
How can I fix it?
How confident is the rule?
```

A message such as:

```text
Accessibility error
```

is insufficient.

A better diagnostic:

```text
Image has no alternative text.

Screen-reader users may receive only the filename or no useful description.

Add concise alt text describing the information the image communicates.
```

---

## 2.2 Do not rewrite source without permission

Accessibility analysis may:

- identify,
- explain,
- suggest,
- preview a fix.

It should not silently change the Markdown file.

---

## 2.3 Preserve author intent

Some patterns that look suspicious may be intentional.

Example:

```md
![](decorative-divider.svg)
```

Empty alt text can be correct for a decorative image.

The application should therefore distinguish:

```text
missing alt text
```

from:

```text
explicit empty alt text
```

These are not equivalent.

---

## 2.4 Avoid false certainty

Where the application cannot know author intent, it should use language such as:

- Review
- Possible issue
- Consider
- Verify

rather than claiming definite failure.

---

## 2.5 Rules should map to semantic nodes

Diagnostics should reference the Semantic Document Model.

Example:

```ts
AccessibilityFinding {
  ruleId: "IMG-001",
  nodeId: "image:f82a",
  sourceRange: ...,
  severity: "error"
}
```

This supports:

- source highlighting,
- rendered highlighting,
- keyboard navigation,
- screen-reader navigation,
- fixes,
- regression testing.

---

# 3. Severity Levels

## Error

A strong structural accessibility problem or standards failure is present.

Examples:

- image syntax omits alt text entirely,
- heading level skips in a way that produces misleading hierarchy,
- empty link destination,
- malformed table structure.

## Warning

A likely accessibility problem exists but author intent matters.

Examples:

- alt text appears to be a filename,
- link text is "click here",
- very long unbroken paragraph,
- duplicate headings.

## Advisory

A usability/readability concern or best-practice recommendation.

Examples:

- very long section,
- unusually dense table,
- heading text is excessively long.

## Information

Context that may help an author understand document accessibility.

---

# 4. Confidence Levels

Each rule should have a confidence classification.

```text
High
Medium
Low
```

Examples:

```text
IMG-001 missing alt syntax -> High
LINK-003 ambiguous "click here" -> Medium
READ-004 paragraph may be cognitively dense -> Low
```

The UI should avoid presenting low-confidence heuristics as definitive accessibility violations.

---

# 5. Finding Structure

Conceptual:

```ts
interface AccessibilityFinding {
  id: string;
  ruleId: string;

  severity:
    | "error"
    | "warning"
    | "advisory"
    | "info";

  confidence:
    | "high"
    | "medium"
    | "low";

  nodeId?: string;
  sourceRange?: SourceRange;

  title: string;
  explanation: string;
  rationale: string;

  remediation?: string;
  exampleBefore?: string;
  exampleAfter?: string;

  wcagRefs?: string[];
}
```

---

# 6. Image Alternative Text Rules

Accessible images are one of the highest-value areas for authoring support.

W3C guidance treats text alternatives as essential for non-text content, but the correct alternative depends on the image's purpose.

---

## IMG-001 — Image missing alternative text syntax

**Severity:** Error  
**Confidence:** High

Detect:

```md
![](image.png)
```

carefully.

This pattern contains an explicitly empty alternative, so it must not automatically be treated the same as malformed syntax.

The actual rule should detect cases where the parser exposes an image without an alt-text field due to malformed or extension-specific syntax.

### Message

```text
Image has no alternative-text field.
```

### Rationale

Assistive technology needs a textual alternative or an intentional decorative indication.

### Remediation

Add meaningful alt text if the image communicates information.

If intentionally decorative, use the format's supported empty-alt representation.

---

## IMG-002 — Empty alternative text

**Severity:** Advisory / Warning depending on context  
**Confidence:** Medium

Detect:

```md
![](divider.png)
```

### Message

```text
Image has empty alternative text.
```

### Explanation

Empty alt text may be correct for decorative images, but informative images need a useful description.

### Remediation

Confirm the image is decorative. If it communicates information, provide alt text.

---

## IMG-003 — Alt text appears to be filename

**Severity:** Warning  
**Confidence:** Medium

Examples:

```md
![IMG_2938.png](IMG_2938.png)
![screenshot-final-2.jpg](...)
```

### Message

```text
Alternative text appears to repeat the filename.
```

### Rationale

A filename usually does not communicate the purpose or content of an image.

---

## IMG-004 — Alt text contains redundant "image of" prefix

**Severity:** Advisory  
**Confidence:** Medium

Examples:

```text
Image of a network diagram
Picture of a dog
```

### Explanation

Screen readers generally already announce the element as an image.

### Caveat

Do not flag when "image", "photo", "painting", etc. is important to meaning.

---

## IMG-005 — Extremely long alt text

**Severity:** Advisory  
**Confidence:** Low/Medium

### Message

```text
Alternative text is unusually long.
```

### Rationale

Complex images may need longer descriptions, but excessively long alt text may be difficult to navigate.

### Remediation

Consider:

- concise alt text,
- nearby long description,
- structured explanation in surrounding text.

No universal hard character limit should be treated as a standards requirement.

---

## IMG-006 — Duplicate alt text on multiple distinct images

**Severity:** Advisory  
**Confidence:** Low

Useful for finding likely copy/paste mistakes.

Do not assume duplication is wrong.

---

## IMG-007 — Linked image lacks useful accessible purpose

Example:

```md
[![](download.png)](report.pdf)
```

### Severity

Warning

### Explanation

If an image is the only content of a link, its alternative text may become the link's accessible name.

---

# 7. Heading Rules

Markdown headings create the document's primary navigational structure.

Screen-reader users commonly navigate by headings, so poor hierarchy is particularly disruptive.

---

## HEAD-001 — Skipped heading level

Example:

```md
# Installation

### Windows
```

### Severity

Warning/Error depending on configured strictness  
### Confidence

High

### Message

```text
Heading hierarchy jumps from level 1 to level 3.
```

### Rationale

Heading levels should communicate document hierarchy rather than visual size.

### Remediation

Usually use:

```md
## Windows
```

unless the hierarchy genuinely requires an intermediate structure.

---

## HEAD-002 — Empty heading

Example:

```md
##
```

### Severity

Error  
### Confidence

High

### Message

```text
Heading has no accessible text.
```

---

## HEAD-003 — Duplicate heading text

Example:

```md
## Setup
...
## Setup
```

### Severity

Advisory  
### Confidence

Medium

### Rationale

Duplicates may make:

- outlines,
- anchor links,
- screen-reader navigation,
- search context

harder to distinguish.

Duplicates are not inherently invalid.

---

## HEAD-004 — Heading consists only of punctuation/symbols

Examples:

```md
## ---
## ***
```

### Severity

Warning  
### Confidence

Medium

---

## HEAD-005 — Excessively long heading

### Severity

Advisory  
### Confidence

Low

Useful as a usability warning for:

- outlines,
- navigation,
- speech verbosity.

Do not treat as WCAG failure.

---

## HEAD-006 — First major heading level inconsistent with surrounding document

Example:

Document begins with:

```md
### Introduction
```

### Severity

Advisory

Markdown fragments embedded elsewhere may intentionally begin below H1.

---

## HEAD-007 — Heading used only for visual styling

Potential heuristic:

```text
many headings with extremely long prose
```

### Severity

Advisory  
### Confidence

Low

This should never be treated as definite failure.

---

# 8. Link Rules

W3C guidance requires link purpose to be understandable from the link text alone or together with programmatically associated context.

---

## LINK-001 — Empty link text

Example:

```md
[](https://example.com)
```

### Severity

Error  
### Confidence

High

---

## LINK-002 — Empty link destination

Example:

```md
[Documentation]()
```

### Severity

Error  
### Confidence

High

---

## LINK-003 — Ambiguous link phrase

Common candidates:

```text
click here
here
more
read more
link
this
go
```

### Severity

Warning  
### Confidence

Medium

### Message

```text
Link text may not describe its destination.
```

### Remediation

Prefer:

```md
[Read the installation guide](installation.md)
```

over:

```md
[Click here](installation.md)
```

### Important

Context may make generic text understandable, so this should remain a warning rather than a guaranteed violation.

---

## LINK-004 — Raw URL used as meaningful prose link

Example:

```md
https://www.example.com/products/1234?foo=bar
```

### Severity

Advisory

Long URLs can be cumbersome when spoken by screen readers.

---

## LINK-005 — Multiple identical link labels with different destinations

Example:

```text
Read more -> article A
Read more -> article B
Read more -> article C
```

### Severity

Warning  
### Confidence

Medium/High

Particularly important when links are navigated out of surrounding context.

---

## LINK-006 — Local Markdown link target missing

Example:

```md
[Next Chapter](chapter-05.md)
```

but file does not exist.

### Severity

Error

This is both usability and accessibility relevant because semantic navigation becomes broken.

---

## LINK-007 — Heading anchor target missing

Example:

```md
[Heap](memory.md#heap)
```

where target heading cannot be resolved.

### Severity

Error

---

## LINK-008 — Link destination appears identical to surrounding text but purpose differs

Potential duplicate-link heuristic.

### Severity

Advisory

---

# 9. Table Rules

Accessible data tables require recognizable relationships between headers and data cells. W3C guidance emphasizes programmatic header/data associations because screen-reader users typically encounter tables one cell at a time. citeturn119899search0turn119899search1turn119899search2

Markdown's table syntax is simpler than HTML, so some complex table accessibility features cannot be represented directly.

---

## TABLE-001 — Table has no header row

### Severity

Error / Warning depending on Markdown dialect  
### Confidence

High

A standard GFM table normally contains a header row.

---

## TABLE-002 — Empty header cell

Example:

```md
| Name |   | Status |
|------|---|--------|
```

### Severity

Warning

### Rationale

A screen-reader user may not know the meaning of values in that column.

---

## TABLE-003 — Duplicate header names

Example:

```text
Value | Value | Value
```

### Severity

Advisory / Warning

Duplicates may make column context ambiguous.

---

## TABLE-004 — Very wide table

Trigger based on column count and/or measured width.

### Severity

Advisory

### Rationale

Very wide tables may be difficult for:

- low-vision users,
- magnification users,
- screen-reader users maintaining context,
- small-window readers.

### Suggested remediation

Consider splitting the information into simpler tables or sections when appropriate.

---

## TABLE-005 — Very large table

Trigger based on cell count.

### Severity

Advisory

Offer navigation/structural support rather than declaring the table inaccessible.

---

## TABLE-006 — Complex table not representable accessibly in simple Markdown

Examples may include:

- multi-level headers,
- row-group headers,
- merged-cell concepts.

### Severity

Warning

### Explanation

Plain Markdown table syntax may not be able to express all relationships needed for complex data.

W3C notes that complex HTML tables sometimes require explicit header associations such as `scope`, `id`, or `headers`, which Markdown typically cannot encode directly. citeturn119899search0turn119899search4

### Remediation

Consider:

- simplifying the table,
- using accessible HTML if allowed,
- presenting the information in another structured form.

---

## TABLE-007 — Table appears to be used for layout

### Severity

Warning  
### Confidence

Low/Medium

Markdown tables should represent tabular relationships, not merely visual positioning.

---

# 10. List Rules

---

## LIST-001 — Excessively deep nesting

### Severity

Advisory

Deeply nested lists can become difficult to understand nonvisually.

Configurable threshold.

---

## LIST-002 — Empty list item

Example:

```md
- First
-
- Third
```

### Severity

Warning

---

## LIST-003 — Mixed list structure appears malformed

Example:

Indentation produces an unexpected nesting level.

### Severity

Warning

Use parser-derived structure rather than regex guessing.

---

## LIST-004 — Very long list without grouping

### Severity

Advisory

This is a cognitive/usability heuristic, not a standards violation.

---

# 11. Paragraph and Readability Rules

These should be explicitly labeled as heuristics.

---

## READ-001 — Extremely long paragraph

### Severity

Advisory  
### Confidence

Medium

Configurable threshold by:

- word count,
- sentence count,
- rendered length.

### Message

```text
This paragraph is unusually long and may be difficult to scan or revisit.
```

### Important

Do not claim this is a WCAG violation.

---

## READ-002 — Very long sentence

### Severity

Advisory  
### Confidence

Low/Medium

Can help:

- cognitive accessibility,
- plain-language review,
- screen-reader comprehension.

Should remain optional.

---

## READ-003 — Long section with no subheadings

### Severity

Advisory

Example:

```text
2,500 words under one H2
```

### Rationale

Subheadings can improve scanning and structural navigation.

---

## READ-004 — Extremely dense document structure

Possible signals:

- huge paragraph count,
- few headings,
- many inline links.

### Severity

Informational / Advisory

---

## READ-005 — Excessive all-caps prose

Example:

```text
THIS ENTIRE PARAGRAPH IS CAPITALIZED
```

### Severity

Advisory

May reduce readability.

---

## READ-006 — Repeated punctuation used as visual separator

Example:

```text
========================
```

instead of semantic heading/rule syntax.

### Severity

Advisory

---

# 12. Code Block Rules

---

## CODE-001 — Code block missing language identifier

Example:

````
```
const x = 1;
```
````

### Severity

Advisory

### Rationale

Language metadata improves:

- syntax highlighting,
- navigation context,
- assistive announcements.

Not an accessibility failure by itself.

---

## CODE-002 — Extremely long code block

### Severity

Advisory

Offer:

- block summary,
- line count,
- copy whole block,
- skip block.

---

## CODE-003 — Code block contains extremely long unbroken lines

### Severity

Advisory

Important for:

- low vision,
- horizontal scrolling,
- magnification.

---

## CODE-004 — Code example relies only on color annotations

Potential if HTML/extension rendering exposes color-based spans.

### Severity

Warning

---

# 13. Language Rules

---

## LANG-001 — Document language unknown

Markdown alone does not define a universal document-language field.

If front matter provides language metadata, use it.

### Severity

Informational

The app may allow the user/author to define language metadata for accessibility/export purposes.

---

## LANG-002 — Language change inside document cannot be represented

If embedded HTML or an extension contains `lang`, preserve it.

Do not attempt unreliable language detection and automatically annotate source.

### Severity

Informational

---

# 14. Emphasis and Styling Rules

---

## STYLE-001 — Meaning appears to rely only on bold/italic

### Severity

Advisory  
### Confidence

Low

Developer cannot reliably determine intent.

---

## STYLE-002 — Meaning conveyed only through custom color

If custom HTML/CSS uses classes or inline styles where color is the sole obvious differentiator.

### Severity

Warning  
### Confidence

Medium

---

## STYLE-003 — Low contrast custom document CSS

If computed colors can be evaluated.

### Severity

Error/Warning based on certainty

Relevant WCAG concerns include text and non-text contrast.

---

## STYLE-004 — CSS removes focus indication from interactive content

### Severity

Error

---

## STYLE-005 — CSS hides content visually while leaving confusing accessibility exposure, or vice versa

### Severity

Warning/Error

Requires rendered-DOM analysis rather than Markdown AST alone.

---

# 15. Embedded HTML Rules

---

## HTML-001 — Image element missing alt attribute

Example:

```html
<img src="chart.png">
```

### Severity

Error

---

## HTML-002 — Heading level hierarchy conflict introduced by HTML

Example:

```md
## Setup

<h5>Windows</h5>
```

### Severity

Warning/Error

---

## HTML-003 — Clickable generic element without keyboard semantics

Example:

```html
<div onclick="...">Open</div>
```

### Severity

Error if executable HTML is supported.

In practice, application security policy may prohibit interactive script entirely.

---

## HTML-004 — Form control lacks label

If form HTML is supported in rendered Markdown.

### Severity

Error

---

## HTML-005 — Table semantics missing

If an HTML table uses only `<td>` with no headers.

### Severity

Error/Warning

---

## HTML-006 — Positive tabindex

Example:

```html
tabindex="5"
```

### Severity

Warning

---

## HTML-007 — ARIA misuse

Examples:

- invalid roles,
- `aria-hidden` on focusable content,
- missing required ARIA states.

### Severity

Error/Warning based on rule.

---

# 16. Math Rules

If math extensions are supported:

---

## MATH-001 — Math renderer has no accessible textual/math representation

### Severity

Warning/Error depending on renderer capabilities.

---

## MATH-002 — Math image without alternative

If math is embedded as an image.

### Severity

Error.

---

## MATH-003 — Extremely large equation block

### Severity

Informational / Advisory.

Offer structural skip/navigation rather than flagging as inaccessible.

---

# 17. Diagram Rules

For Mermaid or similar syntax:

---

## DIAG-001 — Diagram has no textual alternative

### Severity

Warning

### Explanation

Diagram source may not be meaningful enough as an equivalent for all users.

### Remediation

Provide:

- nearby explanation,
- caption,
- description,
- accessible text equivalent.

---

## DIAG-002 — Diagram communicates relationship solely through color

### Severity

Warning where detectable.

---

## DIAG-003 — Diagram renderer inaccessible

### Severity

Warning/Error depending on output.

The app should provide source or textual fallback.

---

# 18. Document Structure Rules

---

## DOC-001 — Document contains no headings despite substantial length

### Severity

Advisory

Threshold should be configurable.

---

## DOC-002 — No obvious document title

Examples:

- long standalone document with no H1,
- front matter has no title.

### Severity

Advisory

Fragments and README snippets may intentionally omit H1.

---

## DOC-003 — Multiple H1 headings

### Severity

Informational / Advisory

Multiple H1s are not automatically inaccessible.

Do not repeat outdated blanket claims that a document may contain only one H1.

---

## DOC-004 — Excessive structural depth

Example:

```text
H1 > H2 > H3 > H4 > H5 > H6
```

repeated deeply.

### Severity

Advisory.

---

## DOC-005 — Very large document

### Severity

Information

Rather than claiming failure, offer:

- outline,
- section summaries,
- reading progress,
- book mode,
- smart search.

---

# 19. Metadata Rules

---

## META-001 — Empty title in known front matter

Example:

```yaml
title:
```

### Severity

Advisory

---

## META-002 — Missing language metadata where export target requires it

### Severity

Advisory

---

## META-003 — Broken referenced stylesheet

### Severity

Warning

---

# 20. Link Collection / Book Rules

---

## BOOK-001 — Chapter link target missing

### Severity

Error

---

## BOOK-002 — Heading anchor missing in linked chapter

### Severity

Error

---

## BOOK-003 — Circular chapter navigation

### Severity

Informational

Circular navigation may be intentional.

---

## BOOK-004 — Multiple competing "next chapter" links

### Severity

Advisory

Useful if book mode infers chapter order.

---

## BOOK-005 — Collection contains inaccessible chapter structure

Aggregate findings across linked files.

### Severity

Report summary, not new failure category.

---

# 21. Footnote Rules

If footnotes are supported:

---

## FOOT-001 — Footnote reference has no definition

### Severity

Error

---

## FOOT-002 — Footnote definition is never referenced

### Severity

Information

---

## FOOT-003 — Footnote return navigation unavailable in rendered output

### Severity

Error at renderer/application level.

---

# 22. Task List Rules

---

## TASK-001 — Task checkbox exposed only visually

Renderer requirement.

### Severity

Error

Task state should be available programmatically.

---

## TASK-002 — Interactive task editing inaccessible by keyboard

If rendered task toggling is supported.

### Severity

Error

---

# 23. Horizontal Rule / Separator Rules

---

## SEP-001 — Visual separator used where a semantic heading is likely needed

### Severity

Advisory  
### Confidence

Low

Do not over-flag.

---

# 24. Accessibility Rule Categories

Rules should be filterable by category:

```text
Images
Headings
Links
Tables
Lists
Readability
Code
Language
Styling
HTML
Math
Diagrams
Document Structure
Metadata
Books/Links
Footnotes
Interactive Elements
```

---

# 25. Standards Mapping

Each rule should distinguish:

```text
Direct WCAG relationship
Best practice
Heuristic
Application-specific accessibility rule
```

Do not imply that every rule maps directly to WCAG.

W3C's WCAG 2.2 adds criteria including focus-not-obscured, dragging alternatives, and minimum target size, reinforcing that accessibility involves interaction as well as content structure. citeturn119899search3

---

# 26. Fix Suggestion Model

Conceptual:

```ts
interface SuggestedFix {
  description: string;
  preview?: string;

  safety:
    | "safe"
    | "review-required"
    | "manual-only";

  apply?: () => SourceEdit[];
}
```

Examples:

```text
Missing alt text
-> manual-only

Skipped H1 -> H3
-> review-required

Empty link destination
-> manual-only
```

---

# 27. Safe Automatic Fixes

Only highly deterministic fixes should be candidates for one-click application.

Even then, user confirmation is preferred.

Potential examples:

- remove accidental empty heading if user explicitly approves,
- change obvious duplicate whitespace,
- add syntax around user-supplied alt text.

The application should not invent semantic descriptions.

---

# 28. AI-Generated Accessibility Fixes

AI-generated descriptions or rewrites are not required for the core product.

If added later:

- must be optional,
- must be clearly identified as generated,
- must not silently modify source,
- should require author review,
- should preserve privacy expectations.

---

# 29. Findings Panel

The accessibility panel should expose:

```text
Total findings
Errors
Warnings
Advisories
Information
```

Users should be able to filter by:

- severity,
- category,
- section,
- file/chapter.

---

# 30. Finding Navigation

Users should be able to:

```text
next finding
previous finding
next error
next warning
open finding
return to prior editing position
```

Navigation must be keyboard and screen-reader accessible.

---

# 31. Finding Context

Each finding should include:

```text
file
heading path
node type
source line/range
```

Example:

```text
chapter-03.md
Memory > Virtual Memory
Image
Line 184
```

---

# 32. Screen Reader Presentation of Findings

Example concise output:

```text
Warning.
Image alternative text appears to be a filename.
Memory, Virtual Memory.
Line 184.
```

Detailed explanation should be available on demand rather than always spoken.

---

# 33. Suppression / Accepted Findings

Authors may need to acknowledge intentional patterns.

Potential behavior:

```text
Ignore once
Ignore this occurrence
Suppress rule for document
```

Suppressions should live in app/project settings rather than polluting Markdown unless the user explicitly chooses inline metadata.

The UI must clearly distinguish:

```text
fixed
ignored
suppressed
```

---

# 34. Rule Configuration

Some heuristic rules should have configurable thresholds.

Examples:

```text
long paragraph word threshold
long section word threshold
deep list nesting threshold
large table column threshold
```

Standards-based structural rules should not be disabled silently by changing arbitrary thresholds.

---

# 35. Rule Profiles

Potential profiles:

```text
Core Accessibility
Strict Accessibility
Accessibility + Readability
Custom
```

The default should prioritize useful signal over overwhelming noise.

---

# 36. Live Analysis Behavior

Live analysis should avoid disrupting typing.

Possible strategy:

```text
edit
 |
short debounce
 |
analyze affected semantic nodes
 |
update findings
```

The panel should not:

- steal focus,
- announce every keystroke-generated temporary warning,
- cause layout jumps.

---

# 37. Temporary Invalid States

While typing:

```md
[documentation](
```

the document may temporarily be incomplete.

The analyzer should avoid aggressive error announcements during transient typing states.

Possible approach:

- debounce,
- wait for syntactic stabilization,
- downgrade temporary findings until idle.

---

# 38. Incremental Analysis

Accessibility rules should analyze affected semantic nodes where possible.

Example:

```text
edit image alt text
      |
reanalyze image
      |
update IMG findings
```

No need to rerun every unrelated rule across a 10,000-line file.

---

# 39. Multi-File Analysis

For books/document sets:

```text
Collection Accessibility Report
├── Chapter 1
├── Chapter 2
└── Chapter 3
```

Cross-file checks can include:

- broken links,
- duplicated chapter titles,
- missing targets,
- inconsistent hierarchy.

---

# 40. Accessibility Score

The application should be cautious about numeric accessibility scores.

A single:

```text
92% accessible
```

can create false confidence.

Preferred presentation:

```text
3 errors
5 warnings
8 advisories
```

with explanations.

If a score is ever implemented, it must not imply legal or WCAG certification.

---

# 41. Conformance Claims

The tool should not state:

```text
This document is WCAG compliant
```

based solely on automated checks.

Automated tooling cannot determine all accessibility requirements or author intent.

A better output:

```text
No automatically detectable issues were found for the enabled rules.
Manual review is still required.
```

---

# 42. Rule Documentation Format

Each public rule should eventually have documentation:

```text
Rule ID
Title
Category
Severity
Confidence
What it detects
Why it matters
Examples
Suggested remediation
Standards relationship
False-positive considerations
Test cases
```

---

# 43. Rule Test Fixture Format

Each rule should have fixtures.

Example:

```text
tests/accessibility/rules/IMG-003/
├── valid.md
├── invalid-basic.md
├── invalid-uppercase-extension.md
├── allowed-decorative.md
└── expected.json
```

---

# 44. Example Rule Fixture

Input:

```md
# Architecture

![architecture.png](architecture.png)
```

Expected:

```json
{
  "ruleId": "IMG-003",
  "severity": "warning",
  "confidence": "medium"
}
```

---

# 45. Rule Engine Architecture

Conceptual:

```text
Semantic Document Model
        |
        v
Accessibility Rule Engine
        |
        +--> node rules
        +--> section rules
        +--> document rules
        +--> collection rules
        +--> rendered-DOM rules
        |
        v
AccessibilityFinding[]
```

---

# 46. Rule Interface

Conceptual:

```ts
interface AccessibilityRule {
  id: string;
  category: string;

  defaultSeverity: Severity;
  confidence: Confidence;

  scope:
    | "node"
    | "section"
    | "document"
    | "collection"
    | "rendered";

  evaluate(context: RuleContext): AccessibilityFinding[];
}
```

---

# 47. AST Rules vs Rendered Rules

Some checks can operate on Markdown semantics alone:

```text
missing alt text
heading hierarchy
ambiguous link text
broken link
table headers
```

Others require rendered state:

```text
contrast
focus visibility
CSS hiding content
pointer target size
ARIA misuse
```

These should be separate rule families.

---

# 48. Authoring Rule IDs

Proposed namespaces:

```text
IMG-
HEAD-
LINK-
TABLE-
LIST-
READ-
CODE-
LANG-
STYLE-
HTML-
MATH-
DIAG-
DOC-
META-
BOOK-
FOOT-
TASK-
SEP-
```

IDs should remain stable once used in:

- documentation,
- tests,
- suppressions,
- CI output.

---

# 49. Baseline Rule Set

The first complete baseline should ideally include at least:

```text
IMG-001
IMG-002
IMG-003

HEAD-001
HEAD-002
HEAD-003

LINK-001
LINK-002
LINK-003
LINK-005
LINK-006
LINK-007

TABLE-001
TABLE-002
TABLE-006

LIST-002

READ-001
READ-003

CODE-001
CODE-003

STYLE-003
STYLE-004

HTML-001
HTML-002
HTML-004
HTML-005
HTML-007

DIAG-001

DOC-001
DOC-002

BOOK-001
BOOK-002

FOOT-001
```

This is not a roadmap; it is a suggested minimum breadth for a mature rule engine.

---

# 50. Manual Review Checklist

The report should remind authors that some questions require human judgment:

```text
Do images communicate information not captured in alt text?
Does reading order make sense?
Are link labels meaningful in context?
Are headings meaningful and descriptive?
Are tables genuinely the best representation?
Does custom CSS preserve usable contrast?
Does the document make sense when read linearly?
Are diagrams described adequately?
Is the language clear for the intended audience?
```

---

# 51. User Story Traceability

Example:

```text
As an author,
I want warnings when I create inaccessible document structures
so I can fix them before publishing.
```

Maps to:

```text
Accessibility Rule Engine
Finding Model
Findings Panel
Rule Catalog
Source Navigation
```

Example:

```text
As a screen-reader user,
I want findings announced with structural context.
```

Maps to:

```text
Finding nodeId
HeadingPath
SourceRange
Accessible finding UI
```

---

# 52. Open Research Questions

1. Which Markdown accessibility failures are reliably detectable without excessive false positives?
2. What threshold should distinguish warnings from advisories?
3. How should decorative-image intent be represented in pure Markdown?
4. Should long-alt-text heuristics exist by default?
5. What is the best method for assessing Markdown tables that cannot express complex HTML header relationships?
6. Should readability heuristics be enabled by default?
7. What language-analysis tools are appropriate without sending text off-device?
8. How should custom CSS contrast testing work across themes?
9. How should accessible math be validated for different renderers?
10. What textual fallback should Mermaid diagrams expose?
11. How should suppressions persist without modifying source?
12. Should a collection-level accessibility report traverse linked files automatically or only user-defined collections?
13. Which rules should be exposed in CI if a future CLI exists?
14. How should assistive-technology users review large numbers of findings efficiently?
15. What wording best distinguishes standards failures from authoring suggestions?

---

# 53. Definition of Done

The accessible authoring system should eventually be considered mature when:

- findings map to semantic nodes,
- findings identify source locations,
- keyboard users can navigate findings,
- screen-reader users can navigate findings,
- definite issues and heuristics are clearly distinguished,
- source is never changed without explicit action,
- rules have stable IDs,
- rules have documented rationale,
- rules have regression fixtures,
- document-wide and multi-file reports are possible,
- live analysis does not disrupt typing,
- supported rules cover headings, images, links, tables, document structure, advanced content, and rendered accessibility,
- the application never claims automated analysis proves full WCAG conformance.

---

# 54. Core Rule

> **The accessibility checker should teach authors how to create better documents, not merely tell them that they failed a test.**

The goal is improved content that remains accessible even after the Markdown leaves this application.
