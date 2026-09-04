# Accessible Markdown Reader & Editor
# Test Strategy

**Document type:** Software quality and verification strategy  
**Status:** Working specification  
**Purpose:** Define how the application will be verified across unit, integration, end-to-end, accessibility, performance, security, regression, cross-platform, and usability testing.

---

# 1. Purpose

This document defines the overall testing strategy for the application.

The product has several characteristics that make a conventional "unit tests plus a few end-to-end tests" approach insufficient:

- Markdown source is transformed through multiple layers.
- Semantic document structure drives many features.
- Reading position must remain stable across reflow and edits.
- Accessibility requires manual assistive-technology verification.
- Electron introduces privileged and unprivileged process boundaries.
- Pagination creates layout-dependent behavior.
- Search, diagnostics, and indexing are derived from the semantic model.
- Structural editing must safely rewrite source.
- Cross-file books depend on filesystem relationships.
- Large files must remain responsive.
- Security depends on treating Markdown as untrusted input.

The testing strategy therefore needs multiple layers that verify different kinds of correctness.

The guiding principle is:

> **Test the smallest meaningful unit for logic, the integrated pipeline for contracts, and the actual user workflow for behavior.**

---

# 2. Quality Goals

The test system should provide confidence that the application is:

- functionally correct,
- semantically correct,
- accessible,
- secure,
- performant,
- stable under malformed input,
- predictable across platforms,
- resilient to external file changes,
- regression-resistant.

---

# 3. Testing Pyramid

Conceptually:

```text
                     User Testing
                  Manual Accessibility
                 End-to-End Workflows
              Integration / Component Tests
                  Unit / Property Tests
```

The lower layers should be broad and fast.

The upper layers should be fewer but validate behaviors that cannot be proven in isolation.

---

# 4. Test Categories

The test suite should include:

```text
Unit
Property / Invariant
Parser / Semantic Model
Component
Integration
Command
State
Filesystem
Search
Pagination
Accessibility Automated
Accessibility Manual
Security
Performance
End-to-End
Cross-Platform
Regression
Usability
```

---

# 5. Unit Testing

Unit tests should validate deterministic logic in isolation.

Examples:

- heading hierarchy generation,
- section ownership,
- source-range calculations,
- sentence-boundary helpers,
- node fingerprint generation,
- text-anchor generation,
- semantic-position resolution,
- search grouping,
- search filters,
- command enable/disable predicates,
- accessibility-rule evaluation,
- path normalization,
- URL-scheme validation,
- settings-resolution logic,
- migration functions.

Unit tests should be:

- fast,
- deterministic,
- independent of Electron where possible,
- easy to run continuously.

---

# 6. Property and Invariant Testing

Some logic is best tested by invariants rather than only fixed examples.

Examples:

## Semantic tree

For any parsed document:

```text
child source range lies within parent range
node IDs unique within model
source-order blocks remain ordered
section boundaries deterministic
```

## Position resolution

For any unchanged document:

```text
save position
reparse
restore
-> same semantic node
```

## Structural editing

For valid transformations:

```text
transform source
reparse
-> document remains parseable
-> intended structure moved
```

Property tests are especially useful for:

- position logic,
- source transformations,
- parser normalization,
- search indexing.

---

# 7. Semantic Model Tests

The semantic model is central enough to deserve dedicated fixtures.

Test:

- headings,
- nested sections,
- duplicate headings,
- content before first heading,
- paragraphs,
- nested lists,
- tables,
- code blocks,
- blockquotes,
- links,
- images,
- front matter,
- embedded HTML,
- extensions,
- malformed syntax.

Each test should verify:

```text
node type
source range
parent/child relationship
section ownership
heading path
text content
identity/fingerprint behavior
```

---

# 8. Parser Normalization Tests

The application may use a third-party parser, but the app's semantic model should remain parser-independent.

Tests should verify parser output normalization into the application's node vocabulary.

If parser implementation changes later, semantic-model fixtures should still pass.

This protects the application from parser-specific behavior leaking into every subsystem.

---

# 9. Source Fidelity Tests

Structural edits should preserve source style where practical.

Fixture variants should include:

```md
- item
* item
+ item

# Heading
Heading
=======

```js
```

~~~
```

Verify unrelated syntax does not get reformatted unexpectedly.

---

# 10. Command Tests

Every semantic command should be directly testable.

Example:

```ts
executeCommand("reader.nextHeading")
```

Then assert:

```text
semantic position changed correctly
focus contract respected
history updated or not updated correctly
```

Command tests should not need mouse simulation.

---

# 11. Command Availability Tests

Test:

- enabled states,
- disabled states,
- contextual scopes,
- mode switching.

Example:

```text
structure.moveSectionDown
```

should be disabled when current section is already the last sibling.

---

# 12. Shortcut Binding Tests

Test:

- default binding registration,
- platform-specific bindings,
- user remapping,
- conflict detection,
- scope-aware overlaps.

Do not treat these as substitutes for actual assistive-technology shortcut testing.

---

# 13. Application State Tests

Test state transitions such as:

```text
open document
edit
save
search
repaginate
external change
close
reopen
```

Assertions should verify:

- canonical state changes,
- derived state invalidation,
- version consistency,
- no accidental cross-domain mutation.

---

# 14. Derived-State Version Tests

Example:

```text
source version = 42
search index version = 41
```

Expected:

```text
index considered stale
```

Worker results tagged with stale versions should be discarded.

---

# 15. Integration Testing

Integration tests should verify subsystem contracts.

Key pipelines:

```text
Source -> Parser -> Semantic Model
Semantic Model -> Reader Renderer
Semantic Model -> Search Index
Semantic Model -> Accessibility Rules
Semantic Model -> Pagination
Reader Command -> Position Manager
Editor Command -> Source Transform -> Reparse
```

---

# 16. Reader Integration Tests

Test:

```text
open source
render semantic output
navigate
copy
search
bookmark
```

Verify rendered semantics and semantic state agree.

---

# 17. Editor Integration Tests

Test:

```text
source edit
semantic reparse
preview update
diagnostics update
search index update
dirty state
```

Focus should remain in editor during preview updates.

---

# 18. Structural Editing Integration Tests

Examples:

```text
move section down
promote heading
delete list item
duplicate code block
```

Verify:

- source changed correctly,
- semantic tree changed correctly,
- caret/context reconciled,
- undo restores prior source,
- diagnostics/search/pagination update.

---

# 19. Search Integration Tests

Test:

```text
index document
query
group by section
activate result
return to origin
```

Also test:

- edits invalidating index,
- collection search,
- cross-file result navigation.

---

# 20. Pagination Integration Tests

Test:

```text
semantic model
+
layout settings
->
page map
```

Verify:

- node fragments remain linked to semantic nodes,
- semantic position survives repagination,
- long blocks split safely,
- responsive spread changes preserve location.

---

# 21. Navigation Integration Tests

Test:

```text
search jump
link jump
outline jump
bookmark jump
Back
Forward
Return to Reading Position
```

Verify navigation stacks do not interfere incorrectly.

---

# 22. Filesystem Integration Tests

Use temporary directories.

Test:

- open,
- save,
- Save As,
- external modification,
- deleted file,
- renamed file,
- relative linked Markdown,
- local images,
- collection roots,
- symlinks.

Tests must never write outside controlled temporary directories.

---

# 23. External Change Tests

Scenarios:

```text
clean document + disk changed
dirty document + disk changed
file removed
file renamed
```

Verify no silent data loss.

---

# 24. Electron Boundary Tests

Test the main/preload/renderer contract.

Verify:

- only allowed IPC channels exist,
- argument validation occurs,
- renderer has no direct Node access,
- unauthorized filesystem requests fail.

---

# 25. Component Testing

React components should be tested for:

- semantic markup,
- accessible labels,
- state rendering,
- focus behavior,
- keyboard behavior.

Examples:

```text
SearchPanel
Outline
AccessibilityFindingsPanel
BookControls
SettingsDialog
CommandPalette
```

---

# 26. DOM Semantics Tests

Automated checks should verify obvious semantic structure.

Examples:

```text
HeadingNode -> h1/h2/etc.
LinkNode -> a
Button -> button
Table -> table/th/td
```

Do not rely only on snapshot tests.

Prefer role/name/state assertions.

---

# 27. Automated Accessibility Testing

Use automated accessibility tooling for detectable issues.

Potential categories:

- missing accessible name,
- invalid ARIA,
- color contrast where measurable,
- landmark issues,
- form labels,
- focusable hidden elements.

Automated accessibility tests do not replace screen-reader testing.

---

# 28. Accessibility Manual Testing

The dedicated `accessibility_manual_test_scripts.md` remains authoritative.

Manual testing should cover:

- VoiceOver,
- NVDA,
- Narrator,
- Orca,
- JAWS when available,
- keyboard-only workflows,
- large text,
- high contrast,
- reduced motion,
- screen magnification.

---

# 29. Accessibility Release Smoke Tests

At minimum before release:

## macOS

- VoiceOver reader,
- VoiceOver raw editor,
- keyboard reader/editor,
- large-text reflow.

## Windows

- NVDA reader/editor,
- Narrator smoke test,
- keyboard workflow,
- high contrast.

## Linux

When supported:

- Orca smoke test,
- keyboard workflow.

---

# 30. End-to-End Testing

E2E tests should simulate real user workflows through the packaged-like application where practical.

Core workflows:

```text
Open -> Read -> Close -> Reopen
Read -> Search -> Result -> Return
Read -> Follow Chapter Link -> Back
Edit -> Structural Change -> Save
Edit -> Accessibility Finding -> Fix
Change Font -> Repaginate -> Continue Reading
```

---

# 31. E2E Test Philosophy

E2E tests should verify important workflows, not every tiny UI state.

Overly broad E2E suites become:

- slow,
- brittle,
- difficult to diagnose.

Keep business/semantic logic in lower layers where possible.

---

# 32. Suggested E2E Scenarios

## E2E-001 — Reader lifecycle

1. Open Markdown.
2. Navigate to middle.
3. Close app.
4. Reopen.

Expected:

same semantic position.

## E2E-002 — Search recovery

1. Read paragraph.
2. Search distant result.
3. Return.

Expected:

original location.

## E2E-003 — Book navigation

1. Open chapter.
2. Next chapter.
3. Back.

Expected:

cross-file location restored.

## E2E-004 — Structural edit

1. Open editor.
2. Move section.
3. Save.
4. Reopen.

Expected:

source persisted correctly.

## E2E-005 — Accessibility finding

1. Open bad Markdown.
2. Find missing-alt issue.
3. Fix.
4. Reanalyze.

Expected:

finding clears.

---

# 33. Security Testing

The Threat Model and Security Requirements document remains authoritative.

Security tests should include:

- XSS fixtures,
- malicious HTML,
- unsafe schemes,
- path traversal,
- symlink escape,
- remote resource policy,
- malicious SVG,
- CSP enforcement,
- renderer privilege checks,
- IPC validation,
- save conflicts,
- denial-of-service fixtures.

---

# 34. Security Test Layers

## Unit

```text
URL validation
path boundary checks
IPC schema validation
```

## Integration

```text
renderer -> preload -> main denied request
```

## E2E

```text
open malicious Markdown
verify no execution
```

---

# 35. Performance Testing

Performance is its own quality dimension.

Test:

- startup,
- file open,
- parse time,
- render time,
- search latency,
- pagination,
- repagination,
- typing latency,
- accessibility-analysis latency,
- memory usage,
- collection indexing.

Exact budgets belong in the Performance Budget document.

---

# 36. Performance Test Method

Tests should record:

```text
hardware
OS
Electron version
dataset
file size
node count
run count
warmup
median
p95/p99 where useful
```

Avoid judging performance from one timing sample.

---

# 37. Performance Regression Tests

Critical hot paths should have regression thresholds.

Examples:

```text
open 10k-line file
search common term
repaginate after font change
type in large document
```

Thresholds should allow realistic platform variance.

---

# 38. Long-Running Stability Tests

Potential soak tests:

- repeatedly page through long document,
- edit/search for extended period,
- switch layouts many times,
- open/close many files.

Watch for:

- memory leaks,
- stale state,
- event-listener buildup,
- worker leaks.

---

# 39. Memory Testing

Measure:

- source size,
- semantic model overhead,
- search index,
- pagination cache,
- rendered pages,
- open document count.

Ensure caches are bounded.

---

# 40. Test Corpus

A dedicated torture-test corpus should contain representative and pathological Markdown.

Categories:

```text
basic
technical
book
tables
images
code
Unicode
accessibility failures
malformed Markdown
hostile security content
huge documents
```

A separate specification will define the corpus.

---

# 41. Golden Fixtures

For deterministic transformations, use golden expected outputs cautiously.

Good uses:

- normalized semantic tree,
- accessibility findings,
- search grouping,
- structural source transform.

Avoid giant fragile DOM snapshots.

---

# 42. Snapshot Testing

Snapshot tests may help for stable structured outputs, but should not become the primary test strategy.

A test should explain what behavior matters.

Bad:

```text
snapshot changed
```

without understanding why.

---

# 43. Regression Tests

Every important defect should produce a regression test when feasible.

Examples:

```text
lost reading position after resize
NVDA focus jumps to toolbar
section move drops child subsection
search result opens wrong duplicate heading
```

Regression test ID should reference the issue.

---

# 44. Regression Classification

Suggested categories:

```text
REG-SEM
REG-POS
REG-SRCH
REG-PAGE
REG-EDIT
REG-A11Y
REG-SEC
REG-STATE
REG-FILE
REG-PERF
```

---

# 45. Cross-Platform Testing

Primary desktop targets should be tested independently.

Areas likely to differ:

- filesystem paths,
- keyboard shortcuts,
- file dialogs,
- screen readers,
- high contrast,
- font rendering,
- gestures,
- file associations,
- application lifecycle.

Do not assume a passing macOS build implies Windows/Linux correctness.

---

# 46. Platform CI Matrix

Potential automated matrix:

```text
macOS
Windows
Linux
```

Run:

- unit tests,
- integration tests,
- build/package smoke tests.

Manual AT testing remains platform-specific.

---

# 47. Browser/Chromium Dependency Testing

Electron upgrades can change:

- accessibility tree behavior,
- CSS layout,
- focus behavior,
- selection,
- sandboxing.

Major Electron upgrades should trigger focused regression testing.

---

# 48. Markdown Parser Upgrade Testing

Parser upgrades should rerun:

- semantic fixtures,
- source-range tests,
- heading/section tests,
- link resolution,
- malformed syntax fixtures,
- accessibility rules.

---

# 49. Dependency Upgrade Testing

Security-critical dependency upgrades should trigger:

```text
unit suite
integration suite
security fixtures
basic E2E
```

---

# 50. State Migration Testing

Persistent schema migrations should have fixtures from older versions.

Verify:

- reading positions survive,
- bookmarks survive,
- accessibility preferences survive,
- invalid data fails safely.

---

# 51. File Format Compatibility Tests

Open Markdown produced by multiple tools/styles.

Examples:

- CommonMark,
- GFM,
- Typora-like syntax,
- front matter,
- fenced code,
- inline HTML.

Unknown extensions must remain source-preserved.

---

# 52. Unicode Testing

Fixtures should include:

- accented Latin text,
- CJK,
- Arabic/Hebrew,
- emoji,
- combining characters,
- bidirectional text,
- long grapheme clusters.

Test:

- search,
- selection,
- sentence navigation,
- source ranges,
- rendering.

---

# 53. Input Method Testing

Test:

- mouse,
- keyboard,
- trackpad,
- touch where supported,
- voice-control workflows,
- screen-reader keyboard interactions.

No feature should depend on one input method without a justified alternative.

---

# 54. Keyboard Test Strategy

Automated keyboard tests should verify:

- Tab order,
- Enter/Space activation,
- Escape behavior,
- arrow-key logic,
- focus restoration,
- command shortcut dispatch.

Manual tests should verify AT conflicts.

---

# 55. Focus Testing

Focus bugs are high-impact.

Test:

```text
open/close search
open/close settings
activate search result
return from findings
switch editor/reader
preview updates
page turns
```

Assert logical focus destination.

---

# 56. Search Test Matrix

Dimensions:

```text
document vs collection
literal vs case-sensitive
whole-word
node type
duplicate headings
Unicode
large result count
live editing
```

---

# 57. Pagination Test Matrix

Dimensions:

```text
single vs spread
window size
font size
spacing
code/table/image/list blocks
large document
screen reader
reduced motion
```

---

# 58. Reading Position Test Matrix

Dimensions:

```text
reopen
resize
font change
edit-before-anchor
edit-anchor
delete-anchor
rename-heading
duplicate-heading
cross-file
crash restart
```

---

# 59. Structural Editing Test Matrix

For each command, test:

```text
normal target
first/last sibling
nested section
nested lists
undo
redo
malformed surrounding Markdown
external conflict
```

---

# 60. Accessibility Rule Test Matrix

Each rule should have:

```text
positive fixture
negative fixture
edge-case fixture
false-positive fixture where relevant
```

Heuristics should explicitly test intentional valid cases.

---

# 61. Test Data Isolation

Tests must not depend on the user's real files.

Use:

- fixtures,
- temp directories,
- ephemeral app data.

Never risk modifying real user data during automated tests.

---

# 62. Determinism

Tests should avoid:

- network dependencies,
- current-time assumptions,
- random behavior without fixed seed,
- machine-specific file paths.

When randomness is useful, record seed.

---

# 63. Offline Testing

Because core functionality is offline-first, CI should be able to run the core test suite without internet access.

Remote-resource tests should use controlled local mocks.

---

# 64. Mocking Strategy

Mock external boundaries, not core logic.

Good mock candidates:

- OS dialogs,
- external URL launch,
- filesystem watcher events,
- remote-resource policy.

Avoid mocking the semantic model in tests intended to validate semantic pipelines.

---

# 65. Test Doubles for Electron

Main/preload boundaries may use controlled adapters.

This allows:

- unit testing IPC validation,
- integration testing without launching full GUI for every case.

---

# 66. Accessibility Testing With Real AT

Mocks cannot validate:

- VoiceOver behavior,
- NVDA browse mode,
- Narrator announcements,
- Orca interaction.

Use real assistive technologies for release validation.

---

# 67. Visual Regression Testing

Visual regression may help with:

- pagination,
- themes,
- high contrast,
- layout panels.

It should supplement semantic assertions.

Visual diffs alone cannot prove accessibility.

---

# 68. Screenshot Baselines

If used:

- keep number manageable,
- include stable viewport/font,
- separate platform baselines where necessary.

Do not use screenshots for tests better expressed semantically.

---

# 69. Usability Testing

User testing should focus on tasks, not feature demonstrations.

Examples:

```text
Find a section.
Copy a paragraph.
Return to where you were.
Reopen a file.
Move a section.
Review accessibility issues.
```

Observe:

- errors,
- hesitation,
- recovery,
- orientation,
- command efficiency.

---

# 70. Beta / Dogfood Testing

As the application becomes usable, regular real-world use on:

- READMEs,
- manuals,
- course notes,
- linked Markdown books,

can expose issues that synthetic tests miss.

---

# 71. Defect Severity

Recommended severity:

## Critical

- data loss,
- arbitrary code execution,
- cannot read document with primary AT,
- cannot save safely.

## High

- reading position repeatedly lost,
- major keyboard workflow impossible,
- search returns wrong file/section,
- structural edit corrupts source.

## Medium

- partial workflow friction,
- incorrect noncritical announcement,
- layout issue with workaround.

## Low

- cosmetic issue,
- minor wording issue,
- nonblocking polish.

---

# 72. Release Gates

A release should require:

- unit suite passing,
- integration suite passing,
- core E2E suite passing,
- security blockers resolved,
- accessibility smoke tests completed,
- no unresolved critical data-loss defects,
- no known critical reading-position regressions,
- performance within agreed budgets.

---

# 73. Pull Request Test Expectations

Each PR should answer:

```text
What requirement does this affect?
What tests cover it?
Does it affect accessibility?
Does it affect security?
Does it affect performance?
```

New behavior should usually include new tests.

---

# 74. Continuous Integration

CI should run:

```text
lint
type-check
unit
integration
automated accessibility
security static checks
build
selected E2E
```

Long performance suites may run separately.

---

# 75. Fast vs Full Test Suites

Useful commands:

```text
test:fast
test:integration
test:e2e
test:a11y
test:security
test:performance
test:full
```

Developers should have a quick local feedback loop.

---

# 76. Test Runtime Budget

The routine PR suite should remain practical.

Potential split:

```text
Fast PR tests: minutes
Full cross-platform suite: CI
Performance/soak: scheduled or release
Manual AT: release/relevant changes
```

Exact limits can be defined later.

---

# 77. Flaky Test Policy

Flaky tests reduce trust.

A flaky test should be:

- fixed,
- quarantined temporarily with issue,
- or removed if invalid.

Do not repeatedly rerun until green without investigation.

---

# 78. Test Failure Diagnostics

Failures should expose useful context.

Example:

```text
Expected semantic position:
Virtual Memory > paragraph fingerprint f82a

Resolved:
Heap > paragraph fingerprint b113

Strategy:
heading-path fallback
```

This makes position bugs diagnosable.

---

# 79. Test Logging

For failing integration/E2E tests capture:

- source/model version,
- command sequence,
- current semantic position,
- active document ID,
- history state,
- screenshot if visual issue,
- console errors.

Avoid leaking sensitive real-user data because fixtures should be synthetic.

---

# 80. Reproducibility

Bug reports should include:

```text
OS
app version
Electron version
AT/version if relevant
fixture/document characteristics
exact steps
expected
actual
```

---

# 81. Test IDs and Traceability

Tests should reference the Requirements Traceability Matrix.

Example:

```text
POS-T-001 -> PRD-005 -> USR-POS-001
```

This enables coverage analysis.

---

# 82. Coverage Metrics

Code coverage can identify untested code, but it is not proof of quality.

Useful metrics:

```text
statement/branch coverage
requirements with tests
commands with tests
accessibility rules with fixtures
security threats with regression tests
```

Requirements coverage is especially important.

---

# 83. Critical Requirement Coverage

Critical capabilities should have multiple verification layers.

Example:

```text
semantic position persistence
```

should have:

- resolver unit tests,
- integration tests,
- E2E reopen tests,
- manual screen-reader tests.

---

# 84. Test Ownership

Subsystem owners/contributors should own tests with implementation.

Accessibility and security are shared responsibilities, not separate cleanup phases.

---

# 85. Test Documentation

Complex fixtures should explain:

```text
what behavior this fixture stresses
what makes it pathological
which tests depend on it
```

---

# 86. Future Automated Traceability

A machine-readable trace file may eventually validate:

```text
requirement exists
test ID exists
command ID exists
rule ID exists
```

CI could report orphan requirements or missing test mappings.

---

# 87. Open Questions

1. Which E2E framework is the best fit for Electron?
2. Should Vitest handle most non-Electron integration tests?
3. How much Electron should be involved in routine CI tests?
4. Which automated accessibility library best complements manual AT testing?
5. What test environment is reliable for Windows High Contrast?
6. How should VoiceOver/NVDA manual results be recorded?
7. Should performance regression tests block normal PRs or run on dedicated hardware?
8. What corpus sizes best represent real long-form Markdown?
9. Should property-based testing use a dedicated generation library?
10. How should we automate parser fuzz testing?
11. How should linked-book fixtures be generated and maintained?
12. Which parts of pagination are stable enough for visual regression testing?
13. How should multi-window document conflicts be tested?
14. How should platform file-association tests run in CI?
15. Should nightly builds run large soak/fuzz suites?

---

# 88. Definition of Done

The test strategy should eventually be considered mature when:

- core semantic logic has unit/property tests,
- major subsystem boundaries have integration tests,
- user-critical workflows have E2E coverage,
- accessibility has automated and manual validation,
- security threats have regression fixtures,
- performance is measured systematically,
- cross-platform CI exists,
- critical defects produce regression tests,
- test IDs map to requirements,
- contributors can run a fast local suite and a comprehensive full suite.

---

# 89. Core Quality Rule

> **A feature is not complete because it works once; it is complete when its intended behavior can be demonstrated repeatedly, across the contexts that matter, without destroying user trust.**
