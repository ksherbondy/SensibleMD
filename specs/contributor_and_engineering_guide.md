# Accessible Markdown Reader & Editor
# Contributor and Engineering Guide

**Document type:** Engineering contribution and implementation guide  
**Status:** Working specification  
**Purpose:** Define how contributors should understand, modify, test, document, and review the application without violating its semantic, accessibility, security, state, and source-fidelity architecture.

---

# 1. Purpose

This guide is intended for contributors working on the application.

It assumes the project is more than a visual Markdown editor.

The application is built around several cross-cutting guarantees:

- Markdown source remains authoritative.
- Rendered content is untrusted.
- Semantic structure drives reader/editor behavior.
- Accessibility is part of the primary architecture.
- Reading position is semantic, not pixel-based.
- Commands represent user intent independent of input method.
- Derived state should not become a second source of truth.
- Filesystem ownership remains with the user.
- Unsupported syntax should be preserved rather than silently destroyed.

The goal of this guide is to help contributors make changes without accidentally breaking those guarantees.

---

# 2. Start Here

Before making significant changes, contributors should read:

```text
accessible_markdown_reader_editor_spec.md
semantic_document_model_specification.md
hci_and_interaction_design_principles.md
data_and_application_state_model_specification.md
threat_model_and_security_requirements.md
test_strategy.md
requirements_traceability_matrix.md
```

Feature-specific work may additionally require:

```text
pagination_and_book_mode_specification.md
smart_search_specification.md
reading_position_and_navigation_state_specification.md
command_and_shortcut_system_specification.md
accessible_authoring_rules_catalog.md
accessibility_requirements_and_verification_matrix.md
accessibility_manual_test_scripts.md
performance_budget.md
torture_test_corpus_specification.md
competitor_gap_matrix.md
```

---

# 3. Core Architectural Mental Model

The application should conceptually flow like this:

```text
Markdown Source
      |
      v
Parser
      |
      v
Normalized Semantic Document Model
      |
      +--> Reader
      +--> Editor semantic context
      +--> Search
      +--> Outline
      +--> Pagination
      +--> Accessibility diagnostics
      +--> Reading position
      +--> Book navigation
```

Do not build major features by bypassing the semantic model.

---

# 4. Privilege Boundary

Electron architecture should remain:

```text
Renderer
  |
  | narrow contextBridge API
  v
Preload
  |
  | validated IPC
  v
Main Process
  |
  +--> filesystem
  +--> OS shell
  +--> native dialogs
```

Rendered Markdown must never inherit privileged APIs.

---

# 5. Suggested Repository Structure

A possible end-state structure:

```text
src/
├── main/
│   ├── app/
│   ├── files/
│   ├── ipc/
│   ├── security/
│   └── windows/
├── preload/
│   └── bridge/
├── renderer/
│   ├── app/
│   ├── components/
│   ├── reader/
│   ├── editor/
│   ├── search/
│   ├── pagination/
│   ├── diagnostics/
│   ├── accessibility/
│   └── settings/
├── semantic/
│   ├── parser/
│   ├── model/
│   ├── sections/
│   ├── identity/
│   ├── positions/
│   └── transforms/
├── commands/
├── state/
├── persistence/
├── collections/
└── shared/

tests/
├── unit/
├── integration/
├── e2e/
├── accessibility/
├── security/
├── performance/
└── corpus/

docs/
```

This is a suggested organization, not a frozen implementation requirement.

---

# 6. Language and Tooling

Expected stack:

```text
TypeScript / JavaScript
React
Electron
Vite
Vitest
```

Additional libraries should be selected through architecture decisions rather than added casually.

Security-critical or architecture-defining dependencies should receive ADRs.

Examples:

- Markdown parser,
- sanitizer,
- editor engine,
- state-management library,
- persistence store,
- E2E framework.

---

# 7. TypeScript Guidance

Prefer TypeScript for architecture-critical code where it improves clarity.

Especially:

```text
semantic model
commands
state interfaces
IPC schemas
search records
positions
pagination structures
accessibility findings
```

Avoid using `any` as an escape hatch in core boundaries.

---

# 8. Data Over Hidden Behavior

Prefer explicit data structures.

Good:

```ts
{
  nodeId,
  headingPath,
  sourceRange,
  nodeType
}
```

over behavior that must infer state from arbitrary DOM structure.

---

# 9. Source Is Authoritative

For an editable Markdown document:

```text
source text
```

is the content source of truth.

Never treat:

```text
rendered DOM
preview HTML
page layout
search index
```

as canonical document content.

---

# 10. Derived State Rule

Ask before storing a new value:

> Can this be derived from existing authoritative state?

If yes, derive it unless performance requires a bounded cache.

Examples of derived state:

```text
outline
section summary
search groups
page count
accessibility findings
word count
```

---

# 11. Version Derived Data

Derived data should carry the source/model version it represents.

Example:

```ts
{
  sourceVersion: 42,
  records: [...]
}
```

If source is now version 43, discard stale result 42.

---

# 12. Semantic Model Rules

The semantic model should be parser-independent.

Do not spread parser-specific node shapes throughout the application.

Bad:

```text
component checks mdast node internals everywhere
```

Preferred:

```text
parser adapter
-> normalized SemanticNode
```

---

# 13. Semantic Node Identity

Do not use:

```text
array index
DOM index
page number
line number alone
```

as persistent semantic identity.

Persistent features may require:

```text
node ID
fingerprint
heading path
text anchor
source proximity
```

---

# 14. Source Range Accuracy

Source ranges are critical for:

- editor synchronization,
- diagnostics,
- structural edits,
- navigation.

Any parser or transformation change must re-run source-range tests.

---

# 15. Section Ownership

Sections should be derived from heading hierarchy.

Do not implement separate competing section logic in:

- search,
- outline,
- diagnostics,
- reader.

They should use the same semantic section model.

---

# 16. Reader Rules

Reader mode must remain interactive.

Supported reader actions include:

```text
navigate
search
follow links
copy
bookmark
describe context
speech
page turns
```

Do not require editor mode for these tasks.

---

# 17. Reader Cursor

Use the semantic reading cursor for reader navigation.

Do not equate it automatically with:

- DOM focus,
- browser selection,
- editor caret,
- screen-reader virtual cursor.

---

# 18. Focus Rules

Focus is a separate interaction state.

When implementing UI changes, define:

```text
where focus starts
where focus moves
where focus returns
```

Do not let rerenders decide focus accidentally.

---

# 19. Position Preservation

Any feature changing layout should preserve semantic position.

Examples:

```text
font size
line spacing
window resize
continuous -> page
single -> spread
theme
panel layout
```

Capture semantic anchor before reflow and resolve after.

---

# 20. Search Rules

Search should operate against semantic/search records.

Do not build core search by repeatedly traversing rendered DOM.

Search results should preserve:

```text
node ID
section ID
heading path
document ID
```

---

# 21. Pagination Rules

Page number is derived presentation.

Never store it as the only identity for:

- bookmarks,
- reading position,
- history.

Page fragments must reference semantic nodes.

---

# 22. Structural Editing Rules

Structural commands should operate on source ranges derived from semantic structure.

Example:

```text
move section
```

should move the whole semantic section source range.

Do not manually reproduce section-boundary logic inside command handlers.

---

# 23. Command Architecture

Every meaningful action should have one semantic command.

Bad:

```text
keyboard implementation
menu implementation
voice implementation
```

each with separate behavior.

Preferred:

```text
structure.moveSectionDown
```

invoked from any input method.

---

# 24. Command IDs

Command IDs are stable interfaces.

Use:

```text
namespace.actionObject
```

Examples:

```text
reader.nextHeading
search.returnToOrigin
structure.moveSectionDown
```

Avoid renaming public command IDs casually.

---

# 25. Adding a Command

A new command should define:

```text
ID
title
scope
preconditions
effect
focus behavior
position behavior
undoability
accessibility feedback
security implications
tests
```

---

# 26. Keyboard Shortcuts

Do not assign shortcuts without considering:

- macOS,
- Windows,
- Linux,
- VoiceOver,
- NVDA,
- JAWS,
- Narrator,
- Orca,
- international keyboards,
- Sticky Keys.

Exact defaults should be tested.

---

# 27. Accessibility Is Not a Separate Layer

Do not write:

```text
feature first
accessibility later
```

For every feature define:

- keyboard path,
- screen-reader semantics,
- focus behavior,
- high-zoom behavior,
- announcement behavior,
- reduced-motion behavior where relevant.

---

# 28. Native Semantics First

Prefer native HTML:

```text
button
a
h1-h6
p
ul
ol
li
table
th
td
input
```

Use ARIA only when necessary.

Do not recreate a button with a clickable `div`.

---

# 29. Screen-Reader Announcements

Do not announce internal implementation events.

Announce only meaningful user-facing outcomes.

Good:

```text
Section moved below Installation.
```

Bad:

```text
AST rebuilt.
Preview rerendered.
Search index updated.
```

---

# 30. Avoid Duplicate Speech

If native semantics already communicate a state change, do not add a second announcement unless it provides missing context.

Manual AT testing decides this.

---

# 31. Low-Vision Support

Changes must be tested under:

- large font,
- text spacing,
- narrow viewport,
- high zoom,
- dark/light/high contrast.

Do not assume desktop-size default typography is sufficient.

---

# 32. Reduced Motion

Animations must never carry required information.

Every animated interaction must remain understandable with motion disabled.

---

# 33. Accessible Authoring Rules

Rules should distinguish:

```text
standards-related issue
best practice
heuristic
advisory
```

Do not call every finding a WCAG failure.

---

# 34. Rule Findings

Every finding should include:

```text
rule ID
severity
confidence
message
rationale
source range / semantic node
remediation
```

where applicable.

---

# 35. Rule Safety

Accessibility analysis must never silently modify source.

Automated fixes must be explicit and reviewable.

---

# 36. Security Rules

Treat Markdown as untrusted.

A contributor should assume a file can contain malicious:

```text
HTML
URLs
SVG
CSS
paths
images
```

Never expose privileged renderer capabilities to document content.

---

# 37. IPC Rules

Do not expose:

```text
raw ipcRenderer
generic readFile(path)
generic writeFile(path)
shell(command)
```

Prefer narrowly scoped operations.

Validate all inputs in the main process.

---

# 38. External URLs

All external URLs must:

- validate scheme,
- follow security policy,
- open outside privileged renderer context.

Never use arbitrary scheme strings blindly.

---

# 39. Local Assets

Document references do not automatically grant filesystem permission.

Respect:

- document root,
- collection root,
- traversal prevention,
- symlink resolution.

---

# 40. Custom CSS

Document CSS must not style privileged application chrome.

Remote `url()` / `@import` behavior must follow security/privacy policy.

---

# 41. Source Preservation

The application should preserve unsupported syntax.

If rendering cannot understand:

```text
:::custom
```

do not delete it during save.

Source fidelity is more important than normalizing everything.

---

# 42. Formatting Preservation

Avoid whole-document reserialization for small edits unless required.

Structural transformations should modify minimal source ranges where practical.

---

# 43. Line Endings

Respect source line-ending policy.

Tests must cover:

```text
LF
CRLF
mixed
```

---

# 44. External Changes

Never silently overwrite known external changes.

If document is dirty and disk changed:

```text
CONFLICT
```

Preserve local edits.

---

# 45. Save Safety

Prefer atomic write strategy where practical.

Save failure must leave in-memory source intact.

---

# 46. Performance Rules

Ask for every feature:

```text
Does it run on every keystroke?
every scroll event?
every page turn?
every render?
```

Avoid unnecessary full-document work.

---

# 47. Typing Priority

Editor input must remain responsive.

Background tasks may lag behind:

```text
preview
diagnostics
pagination
search index
```

Typing should not.

---

# 48. Cancellation

Async derived work should be versioned and cancellable/supersedable.

Stale results must not overwrite newer state.

---

# 49. Worker Guidance

Heavy tasks may move to workers.

Workers should receive serializable data and return version-tagged results.

Do not give workers privileged filesystem access unless explicitly designed.

---

# 50. React Rendering

Avoid causing entire app rerenders for local state changes.

Use domain-specific subscriptions/selectors.

Examples:

```text
typing in editor
```

should not rerender:

```text
settings
bookmarks
unrelated panels
```

---

# 51. Component State

Use local component state for truly local UI details:

```text
popover open
hover
temporary input draft
```

Use shared state for:

```text
active document
reader position
search session
preferences
```

---

# 52. Testing Requirement

A feature is incomplete without appropriate tests.

Choose the lowest useful test layer:

```text
unit
integration
E2E
manual accessibility
security
performance
```

Do not test everything through E2E.

---

# 53. Regression Rule

If a bug reveals an untested document shape:

> Add a synthetic regression fixture.

Do not commit private user documents.

---

# 54. Corpus Use

Use the torture-test corpus for:

- parser changes,
- search changes,
- pagination,
- security,
- accessibility rules,
- performance.

Do not invent one-off large documents repeatedly if an existing corpus fixture covers the scenario.

---

# 55. Accessibility Testing

Automated accessibility checks are necessary but insufficient.

Relevant feature changes may require real:

```text
VoiceOver
NVDA
Narrator
Orca
JAWS
```

testing.

---

# 56. Manual Test Evidence

Record:

```text
OS
AT/version
app version
scenario
result
notes
```

For accessibility-sensitive releases.

---

# 57. Performance Testing

Do not report one timing sample as proof.

Use:

```text
warmup
multiple runs
median
p95
```

Benchmark against standardized fixtures.

---

# 58. Security Testing

Security-sensitive changes should include regression tests.

Examples:

```text
unsafe URL
path traversal
malicious HTML
IPC malformed args
remote CSS
```

---

# 59. Coding Style

Prefer:

- small focused functions,
- explicit naming,
- immutable transformations where practical,
- early validation at boundaries,
- comments explaining why.

Avoid:

- giant utility modules,
- hidden global state,
- clever one-liners in architecture-critical code.

---

# 60. Comments

Comments should explain:

```text
why this exists
what invariant it protects
why an unusual implementation is necessary
```

Avoid comments that merely repeat syntax.

---

# 61. Naming

Use domain language consistently:

```text
SemanticPosition
Section
HeadingPath
SearchResult
PageFragment
StructuralSelection
AccessibilityFinding
```

Do not invent multiple names for the same concept.

---

# 62. Error Handling

Do not swallow errors silently.

Classify errors where useful:

```text
file
parse
security
search
pagination
persistence
```

User-facing messages should support recovery.

---

# 63. Logging

Development logs may include:

```text
document ID
node ID
source version
command ID
position resolution strategy
```

Avoid dumping full document content unnecessarily.

---

# 64. Privacy

No feature should transmit:

- Markdown source,
- search terms,
- bookmarks,
- reading history,

without explicit documented behavior.

Core functionality remains local.

---

# 65. Dependencies

Before adding a dependency ask:

1. What problem does it solve?
2. Is it maintained?
3. Is it security-critical?
4. How large is it?
5. Can native/browser functionality solve this?
6. Does it complicate Electron sandboxing?
7. Does it affect accessibility?
8. Does it execute install scripts?

---

# 66. Dependency Categories Requiring ADR

Usually create an ADR for:

```text
Markdown parser
sanitizer
editor engine
state-management system
persistence database/store
E2E framework
pagination architecture
plugin architecture
```

---

# 67. Architecture Decision Records

ADRs should capture:

```text
context
decision
alternatives
tradeoffs
consequences
status
```

Do not use ADRs for every trivial code choice.

Use them for decisions expensive to reverse.

---

# 68. ADR Naming

Recommended:

```text
ADR-001-markdown-parser.md
ADR-002-rendering-security-boundary.md
ADR-003-state-management.md
```

---

# 69. ADR Status

Possible:

```text
Proposed
Accepted
Superseded
Deprecated
```

If superseded, link new ADR.

---

# 70. Pull Request Scope

Prefer focused PRs.

A PR should not casually combine:

```text
parser replacement
UI redesign
state migration
new search feature
```

unless inseparable.

Smaller scope improves review.

---

# 71. Pull Request Description

A significant PR should include:

```text
What changes
Why
Requirement IDs
Architecture impact
Accessibility impact
Security impact
Performance impact
Tests
Screenshots only if visual context helps
```

---

# 72. Traceability in PRs

Example:

```text
Implements:
USR-SRCH-001
PRD-SRCH-002

Commands:
search.nextResultGroup

Tests:
SEARCH-T-007
SEARCH-A11Y-001
```

---

# 73. Review Checklist

Reviewer should ask:

- Does this preserve source?
- Does this bypass semantic model?
- Is new state canonical or derived?
- Does this affect semantic position?
- Does this move focus?
- Is keyboard behavior defined?
- Is screen-reader behavior defined?
- Does this cross privilege boundary?
- Can stale async data race?
- Is performance acceptable?
- Are tests adequate?

---

# 74. Accessibility Review Checklist

- [ ] Native semantics used.
- [ ] Accessible names exist.
- [ ] Keyboard path complete.
- [ ] Focus behavior predictable.
- [ ] High zoom tested.
- [ ] Reduced motion considered.
- [ ] Screen-reader output considered.
- [ ] No color-only information.
- [ ] No pointer-only interaction.
- [ ] Announcements not excessive.

---

# 75. Security Review Checklist

- [ ] Input trust identified.
- [ ] Paths normalized.
- [ ] URLs validated.
- [ ] IPC validated.
- [ ] No raw Node exposure.
- [ ] No arbitrary shell execution.
- [ ] Remote requests intentional.
- [ ] HTML/CSS sanitized/scoped.
- [ ] Malformed input fails safely.

---

# 76. Performance Review Checklist

- [ ] No full-document work on scroll unless necessary.
- [ ] No full analysis on every keypress.
- [ ] Async work versioned.
- [ ] Stale work discarded.
- [ ] Cache bounded.
- [ ] Large fixture tested.
- [ ] No obvious memory duplication.

---

# 77. Documentation Changes

Update documentation when changing:

- public commands,
- persistent schema,
- security boundary,
- semantic model,
- accessibility behavior,
- reader position,
- pagination,
- search semantics.

Do not let code silently diverge from specs.

---

# 78. Documentation Is Not Immutable

Specifications can change.

When implementation reveals a better design:

1. update relevant spec,
2. record architectural decision if significant,
3. update traceability,
4. update tests.

Do not preserve a known-bad design merely because it was documented first.

---

# 79. Backward Compatibility

Be cautious with:

- command IDs,
- persisted state,
- file-format interpretation,
- custom shortcut configuration,
- future plugin APIs.

Internal code APIs can change more freely before public release.

---

# 80. Feature Flags

Feature flags may be useful during development.

Do not use flags to maintain two permanently divergent accessibility architectures.

---

# 81. Experimental Features

Experimental features should:

- fail safely,
- not corrupt source,
- be clearly marked,
- avoid modifying persistent schema irreversibly.

---

# 82. Plugin Architecture

No unrestricted plugin API should be introduced casually.

Plugins represent a privilege boundary and require a dedicated security/permissions design.

---

# 83. Generated Code

Generated code should:

- be reproducible,
- have documented generator,
- not be hand-edited.

Generated large corpus files may be excluded from Git when appropriate.

---

# 84. Test Fixture Privacy

Never commit:

- user documents,
- private work files,
- proprietary content.

Create synthetic minimal reproductions.

---

# 85. Issue Reports

Useful bug report fields:

```text
OS
app version
document characteristics
reader/editor mode
steps
expected
actual
AT/version if relevant
```

Do not require users to share sensitive source if a synthetic reproduction can be created.

---

# 86. Accessibility Bug Severity

Treat as high severity when:

- core workflow becomes pointer-only,
- screen reader cannot access main content,
- focus becomes trapped/lost,
- semantic position repeatedly resets,
- high zoom makes UI unusable.

---

# 87. Data-Loss Severity

Any defect that:

```text
silently overwrites
drops source
corrupts Markdown
```

is critical.

---

# 88. Security Severity

Any defect enabling:

```text
code execution
arbitrary filesystem read/write
privilege escalation
```

is critical.

---

# 89. Performance Severity

Performance becomes high severity when it makes a core task practically unusable.

Examples:

- multi-second typing lag,
- frozen search,
- reader navigation consistently delayed.

---

# 90. Development Workflow

Suggested:

```text
create branch
read relevant spec
write/update tests
implement
run fast suite
run affected integration suite
run accessibility/security/performance checks as needed
update docs
open PR
```

---

# 91. Commit Style

Prefer focused commits.

Examples:

```text
feat(search): group results by semantic section
fix(position): preserve anchor after heading rename
test(security): add symlink escape fixture
docs(adr): record parser decision
```

Exact conventional-commit use is optional, but clarity matters.

---

# 92. Branch Policy

Keep main branch releasable where practical.

Avoid long-lived branches that accumulate architectural divergence.

---

# 93. Local Test Commands

Potential future scripts:

```text
npm test
npm run test:fast
npm run test:integration
npm run test:e2e
npm run test:a11y
npm run test:security
npm run test:performance
npm run lint
npm run typecheck
```

---

# 94. CI Expectations

CI should eventually run:

```text
lint
typecheck
unit
integration
automated accessibility
security checks
build
selected E2E
```

Nightly/release:

```text
stress corpus
performance
soak
full cross-platform
```

---

# 95. Development Debugging Tools

Useful internal tools:

```text
semantic tree inspector
current SemanticPosition inspector
state/version inspector
command log
pagination fragment viewer
search index viewer
accessibility finding inspector
```

These can reduce difficult architecture bugs dramatically.

---

# 96. Semantic Tree Inspector

Should display:

```text
node ID
type
source range
heading path
parent
fingerprint
```

Do not expose this in normal user UI unless useful.

---

# 97. Position Debugger

Display:

```text
active position
stable reading position
resolution strategy
confidence
history stack
search origin
```

Critical for "lost my place" defects.

---

# 98. State Debugger

Display:

```text
source version
semantic version
search index version
diagnostic version
pagination version
dirty state
```

Useful for stale-race bugs.

---

# 99. Security Debugging

Development mode may expose:

```text
blocked URL reason
blocked path reason
IPC validation failure
CSP violations
```

Do not weaken production security to simplify debugging.

---

# 100. Accessibility Debugging

Useful dev views:

- accessibility tree inspection via platform/browser tools,
- current landmark/role/name,
- announcement log,
- focus history.

These tools support—but do not replace—real AT testing.

---

# 101. Definition of Done for a Feature

A feature is done when:

- behavior matches spec,
- semantic/state architecture is respected,
- keyboard path exists,
- focus behavior defined,
- accessibility implications tested,
- security implications addressed,
- performance reasonable,
- tests added,
- traceability updated where needed,
- documentation updated.

---

# 102. Definition of Done for a Structural Change

Architecture-changing work additionally requires:

- ADR,
- migration plan if persisted data changes,
- impact analysis,
- regression suite,
- documentation update.

---

# 103. Contributor Onboarding Goal

A new contributor should be able to answer within a short time:

```text
Where does source live?
What is the semantic model?
Where do commands live?
Who owns filesystem access?
How is reading position stored?
How do I add a test?
How do I avoid breaking accessibility?
```

If those answers require tribal knowledge, the architecture/documentation should improve.

---

# 104. Engineering Values

The project should favor:

```text
clarity over cleverness
semantic consistency over duplication
user context over implementation convenience
source fidelity over normalization
accessibility by architecture
least privilege
measured performance
testable behavior
```

---

# 105. Final Contributor Rule

> **Do not optimize for making one screen work. Optimize for preserving the system's contracts across reader, editor, search, accessibility, security, and state.**
