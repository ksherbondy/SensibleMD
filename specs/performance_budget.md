# Accessible Markdown Reader & Editor
# Performance Budget

**Document type:** Performance engineering specification  
**Status:** Working specification  
**Purpose:** Define measurable performance expectations for startup, file opening, parsing, rendering, search, pagination, typing, accessibility analysis, navigation, memory, multi-file collections, and long-running application stability.

---

# 1. Purpose

Performance is a user-experience requirement.

For this application, performance also affects accessibility.

Examples:

- delayed keyboard response can make structural navigation unusable,
- slow screen-reader updates create uncertainty,
- pagination stalls can destroy reading flow,
- editor lag makes source editing unreliable,
- slow search makes long technical documents frustrating,
- excessive memory use limits large-book workflows.

This document establishes target budgets for the end-state application.

These budgets are not immutable laws. They are engineering targets that should be measured, reviewed, and adjusted using real data.

The guiding principle is:

> **The application should remain responsive enough that users can maintain reading, editing, and navigation context without waiting on the system.**

---

# 2. Measurement Philosophy

Performance should be evaluated using:

```text
median
p95
p99 where useful
worst observed
memory peak
steady-state memory
```

Avoid relying on one run.

Each benchmark should record:

```text
hardware
OS
Electron version
Node version
dataset
file size
semantic node count
run count
warmup count
build type
```

---

# 3. Reference Hardware Classes

Budgets should eventually be validated on more than one machine.

Recommended classes:

## Class A — Modern High-End

Example:

```text
current Apple Silicon / high-end desktop CPU
16+ GB RAM
SSD
```

## Class B — Mainstream

Example:

```text
mid-range 4–8 core CPU
8–16 GB RAM
SSD
```

## Class C — Lower-End Supported

Example:

```text
older laptop-class CPU
8 GB RAM
SSD
```

The product should not be optimized only for development hardware.

---

# 4. Build Types

Measure separately:

```text
development build
production build
packaged application
```

Production budgets should primarily be based on packaged/release behavior.

Development-mode overhead should not be mistaken for shipping performance.

---

# 5. Dataset Classes

Use standardized data sizes.

## Small

```text
< 100 KB
< 500 semantic blocks
```

## Medium

```text
100 KB – 1 MB
500 – 5,000 semantic blocks
```

## Large

```text
1 – 10 MB
5,000 – 50,000 semantic blocks
```

## Pathological / Stress

```text
> 10 MB
huge tables
massive code blocks
extreme nesting
malformed content
```

Stress cases may fall outside normal budgets but must fail gracefully.

---

# 6. Startup Budget

## PERF-START-001 — Warm startup

Target on mainstream supported hardware:

```text
application usable within ~1.5 s
```

Stretch target:

```text
< 1.0 s
```

"Usable" means:

- main window visible,
- menus responsive,
- keyboard input accepted,
- opening a document possible.

---

# 7. Cold Startup

Cold startup target:

```text
< 3 s on mainstream SSD hardware
```

Cold startup includes:

- process launch,
- renderer initialization,
- application shell load.

A previously open large document may continue loading after the shell becomes interactive.

---

# 8. Startup Accessibility

The application should not delay accessible UI exposure until every background subsystem is initialized.

Screen-reader users should encounter a usable application shell promptly.

---

# 9. File Open Budget — Small

For typical Markdown files:

```text
Open -> readable rendered content
median < 150 ms
p95 < 300 ms
```

On mainstream hardware.

---

# 10. File Open Budget — Medium

For a substantial README/manual:

```text
Open -> initial readable content
median < 400 ms
p95 < 800 ms
```

Full derived processing may continue asynchronously.

---

# 11. File Open Budget — Large

For large documents:

```text
initial usable reader < 1.5 s
```

Target.

Secondary tasks such as:

- full search indexing,
- accessibility analysis,
- complete pagination,

may continue after the user can begin reading.

---

# 12. Progressive Readiness

The application should prefer:

```text
content first
secondary analysis second
```

Example:

```text
source loaded
-> semantic model sufficient for reader
-> reader interactive
-> search index completes
-> diagnostics complete
-> optional pagination completes
```

Do not block file opening on nonessential derived work.

---

# 13. Parsing Budget

## Small

```text
< 50 ms
```

## Medium

```text
< 200 ms
```

## Large

```text
< 750 ms
```

Targets should be measured separately from rendering.

---

# 14. Semantic Normalization Budget

Parser AST -> application semantic model:

```text
small: < 25 ms
medium: < 100 ms
large: < 300 ms
```

This budget includes:

- heading hierarchy,
- section ownership,
- source ranges,
- node fingerprints where generated eagerly.

---

# 15. Initial Rendering Budget

After semantic model is ready:

## Small/Medium

```text
first readable frame < 100–200 ms
```

## Large

Prefer virtualization/progressive rendering rather than blocking on the entire DOM.

---

# 16. Interaction Frame Budget

For direct interaction:

```text
ideal: < 16.7 ms
acceptable for many actions: < 50 ms
noticeable delay threshold: ~100 ms
```

Not every operation can complete in one frame, but UI feedback should occur quickly.

---

# 17. Keyboard Navigation Budget

Commands such as:

```text
next heading
next paragraph
next link
next search result
```

should typically update application state in:

```text
< 50 ms
```

Target.

The user should not perceive meaningful lag.

---

# 18. Page Turn Budget

Page turn should feel immediate.

Target:

```text
input -> new page visible
median < 100 ms
p95 < 200 ms
```

Decorative transitions must not delay content availability.

---

# 19. Search Open Budget

Opening the search UI:

```text
< 50 ms perceived response
```

The input should be focusable immediately.

---

# 20. Search Query Budget — Current Document

For medium documents:

```text
query update -> results
median < 50 ms
p95 < 100 ms
```

For large documents:

```text
p95 < 250 ms
```

for normal literal search.

---

# 21. Search-as-You-Type Budget

Typing into search must remain responsive.

Target:

```text
input latency < 50 ms
```

Search computation may be debounced, but the text field itself must never lag.

---

# 22. Collection Search Budget

For a 100-file Markdown collection:

```text
common literal query results begin appearing < 500 ms
full result set < 2 s
```

Target on mainstream hardware.

Progressive/streamed results are acceptable.

---

# 23. Search Navigation Budget

Moving between existing results:

```text
< 50 ms state update
< 100 ms visible target response
```

---

# 24. Search Index Build Budget

Medium document:

```text
< 200 ms
```

Large document:

```text
< 1 s
```

Collection indexing should occur incrementally.

---

# 25. Typing Latency Budget

Editor typing is critical.

Target:

```text
keypress -> text visible
median < 16 ms
p95 < 50 ms
```

Even if:

- preview,
- parsing,
- diagnostics,
- pagination

are temporarily behind.

---

# 26. Editor Background Work Rule

Typing must have priority over derived work.

If necessary:

```text
editor input
-> immediate buffer update
-> defer parse/preview/analysis briefly
```

---

# 27. Live Preview Budget

After typing stops or a debounce expires:

```text
small/medium preview update < 150 ms
```

Large documents may use localized/incremental update.

The preview must not steal focus while updating.

---

# 28. Incremental Parse Budget

For a localized edit in a medium/large document:

Target:

```text
affected semantic update < 100 ms
```

where implementation supports incremental processing.

A full reparse may initially exceed this; typing must remain decoupled.

---

# 29. Structural Editing Budget

Commands like:

```text
move section down
promote heading
delete list item
```

should provide visible completion:

```text
< 150 ms medium document
```

Target.

For very large sections, a busy indication may appear quickly while operation completes.

---

# 30. Undo / Redo Budget

Normal undo/redo:

```text
< 50 ms
```

Target for ordinary edits.

Large structural undo:

```text
< 200 ms
```

where practical.

---

# 31. Accessibility Analysis Budget

Live authoring diagnostics should not block typing.

For a localized edit:

```text
affected-node analysis < 100 ms
```

after debounce.

Full document analysis:

## Medium

```text
< 500 ms
```

## Large

```text
< 2 s
```

Target, preferably asynchronous.

---

# 32. Accessibility Announcement Latency

When app-generated feedback is required:

```text
command completion -> status availability < 100 ms
```

The application should not delay semantic feedback behind unrelated background processing.

---

# 33. Section Summary Budget

Request:

```text
Describe Current Section
```

If summary metadata is cached:

```text
< 50 ms
```

If recomputation is necessary:

```text
< 150 ms
```

---

# 34. Current Position Query Budget

Commands such as:

```text
Where am I?
```

should respond from state:

```text
< 50 ms
```

No reparsing should be required.

---

# 35. Pagination Initial Budget

Pagination may be expensive.

## Medium Document

```text
complete page map < 500 ms
```

Target.

## Large Document

```text
first usable pages < 500 ms
complete pagination < 2 s
```

Target.

Progressive pagination is preferable to blocking.

---

# 36. Repagination Budget

After font/spacing/window change:

## Medium

```text
semantic anchor restored < 300 ms
```

## Large

```text
current page restored < 500 ms
```

while remaining pages can finish asynchronously.

---

# 37. Responsive Resize Budget

Window resize should not trigger expensive synchronous full-document work on every pixel movement.

Use:

- debouncing,
- incremental layout,
- current-page priority.

UI should remain interactive during resize.

---

# 38. Image Loading Budget

Local images should not block text rendering.

Text should become readable first.

Image layout shifts must preserve semantic location.

---

# 39. Table Interaction Budget

Keyboard movement within large tables:

```text
< 50 ms per semantic cell navigation
```

Local horizontal scrolling should remain smooth.

---

# 40. Bookmark Budget

Add/open bookmark:

```text
< 50 ms
```

excluding file-open time for unopened documents.

---

# 41. Position Persistence Budget

Saving reading position should be debounced/background.

It must not block navigation.

Persistence write:

```text
target < 50 ms
```

but should be asynchronous where possible.

---

# 42. Position Restoration Budget

After semantic model is ready:

## Exact node match

```text
< 10 ms
```

## Fingerprint/heading-path recovery

```text
< 50 ms
```

## Fuzzy/text-anchor fallback

```text
< 200 ms medium document
```

Bound expensive fallback work.

---

# 43. Navigation History Budget

Back/Forward:

```text
< 100 ms visible response
```

when target document is already open.

Cross-file Back may include file-open time.

---

# 44. File Save Budget

Small/medium file:

```text
< 250 ms
```

Target for local SSD.

Large file:

```text
< 1 s
```

with immediate saving status.

---

# 45. Save Responsiveness

During save:

- UI remains interactive where safe,
- unsaved state remains explicit,
- save errors do not freeze app.

---

# 46. External Change Detection Budget

Filesystem changes should normally surface within:

```text
< 1 s
```

after OS watcher notification.

Exact timing depends on platform.

---

# 47. Collection Chapter Navigation

Already indexed/open neighboring chapter:

```text
< 200 ms
```

Target.

Cold open chapter:

use normal file-open budgets.

---

# 48. Memory Budget — Baseline Application

Idle application without documents:

Target:

```text
< 250 MB resident memory
```

for Electron-based architecture.

Stretch target lower.

This budget should be measured, not assumed.

---

# 49. Memory Budget — Medium Document

One medium document open:

Target incremental memory:

```text
< 100 MB above idle
```

including:

- source,
- semantic model,
- renderer,
- search index,
- normal caches.

---

# 50. Memory Budget — Large Document

Large document:

Target:

```text
< 500 MB total app memory
```

for normal large-file fixtures.

Pathological cases may exceed this temporarily but should not grow without bound.

---

# 51. Multi-Document Memory

Opening 10 medium documents should not scale as though every document has a fully rendered giant DOM.

Use:

- lazy rendering,
- bounded caches,
- inactive-tab unloading where appropriate.

---

# 52. Pagination Cache Budget

Do not retain page DOM/content for entire huge documents if unnecessary.

Potential policy:

```text
current spread
previous spread
next spread
limited measurement metadata
```

---

# 53. Search Index Memory

Search index should avoid duplicating entire document text unnecessarily.

Potential target:

```text
index overhead < 1x source text size
```

excluding general object/runtime overhead.

Measure actual implementation.

---

# 54. Semantic Model Memory

Target conceptual overhead:

```text
semantic model < 3x source size
```

for ordinary Markdown.

This may need revision after real profiling.

---

# 55. CPU Idle Budget

When user is idle and no background task is active:

```text
CPU near idle
```

The application should not constantly:

- reparse,
- poll aggressively,
- rerender,
- reindex.

---

# 56. Background Analysis CPU

Debounced background tasks should complete and stop.

Avoid permanent worker loops.

---

# 57. Battery Considerations

On laptops:

- avoid unnecessary animation,
- avoid continuous polling,
- suspend nonessential work when window/document inactive.

---

# 58. Worker Budget

Workers may be used for:

- parsing,
- indexing,
- diagnostics,
- heavy pagination calculations.

Worker count should be bounded.

Do not spawn one worker per semantic node/file.

---

# 59. Concurrency Budget

Avoid saturating all CPU cores for low-priority background tasks while the user is typing or navigating.

User interaction gets priority.

---

# 60. Cancellation Budget

Stale async work should stop quickly.

Example:

```text
search query changes
```

Old query work should be cancelled/ignored within:

```text
tens of milliseconds where practical
```

---

# 61. Long-Running Stability Budget

After extended use:

```text
memory should plateau
```

rather than grow indefinitely.

Soak target examples:

```text
1 hour reading/editing session
100 document open/close cycles
1,000 page turns
500 search sessions
```

No significant unbounded memory growth.

---

# 62. Memory Leak Threshold

A sustained growth trend after repeated identical operations should be investigated.

Example test:

```text
open/close same medium doc 100 times
```

Expected:

memory returns near stable baseline after GC.

Exact tolerance should account for runtime caching.

---

# 63. Event Listener Budget

Repeated panel/file operations must not accumulate duplicate listeners.

Automated diagnostics may track listener counts in development.

---

# 64. Accessibility Performance Budget

Screen-reader workflows must be evaluated separately.

Targets:

- no multi-second delay after semantic navigation,
- no repeated DOM destruction causing AT reprocessing,
- large documents remain navigable.

Performance success for sighted mouse use does not guarantee AT performance.

---

# 65. Reduced Motion Performance

Disabling animations should not make layout slower.

It may improve responsiveness.

---

# 66. High Zoom Performance

At large text/zoom:

- pagination/reflow remains interactive,
- search remains responsive,
- reader does not produce runaway layout loops.

---

# 67. Security Performance Limits

Security processing must remain bounded.

Examples:

- sanitizer on huge HTML,
- path validation,
- malicious nested Markdown,
- oversized SVG/data URLs.

Security defenses should prevent resource exhaustion where practical.

---

# 68. Regex Performance

Any regex-enabled search or analysis rule must avoid catastrophic backtracking.

Set benchmark fixtures for adversarial strings.

---

# 69. Pathological Markdown Handling

If a document exceeds safe processing budgets:

preferred behavior:

```text
warn
degrade gracefully
offer continuous/basic mode
allow cancellation
```

rather than freezing.

---

# 70. Performance Degradation Tiers

Possible thresholds:

## Normal

All budgets apply.

## Large

Some background tasks may take seconds but UI remains interactive.

## Extreme

Feature degradation allowed:

```text
pagination disabled
accessibility analysis deferred
diagram rendering disabled
```

Source remains accessible.

---

# 71. Performance Error Messaging

If a feature is disabled due to document size:

Good:

```text
This document is too large for responsive paginated mode.
Continuous reading mode remains available.
```

Avoid:

```text
Operation failed.
```

---

# 72. Benchmark Harness Requirements

A benchmark harness should support:

```text
repeatable datasets
warmup
multiple runs
median/p95
memory sampling
JSON output
build/version metadata
```

JSON output is preferable for machine comparison.

---

# 73. Benchmark Output Example

```json
{
  "scenario": "search-large-readme",
  "appVersion": "0.1.0",
  "platform": "darwin-arm64",
  "dataset": "long-4000-lines.md",
  "runs": 30,
  "medianMs": 41.2,
  "p95Ms": 67.8,
  "peakMemoryMb": 312
}
```

---

# 74. Benchmark Reproducibility

Record:

- source fixture hash,
- settings profile,
- viewport dimensions,
- font,
- reader mode.

Pagination results depend heavily on layout.

---

# 75. Performance Regression Policy

A regression should be investigated when:

- median worsens materially,
- p95 worsens materially,
- memory grows significantly,
- user-perceived responsiveness crosses target threshold.

A suggested automated alert:

```text
> 20% regression
```

for stable benchmarks.

Do not automatically fail all PRs on noisy hardware without statistical care.

---

# 76. Dedicated Performance Environment

Long-term, critical performance regressions are best measured on stable hardware/runner.

Cloud CI variability can obscure small changes.

---

# 77. PR Performance Tests

Routine PRs may run:

- fast parse benchmark,
- search benchmark,
- position resolver benchmark,
- basic memory smoke test.

Full suite can run nightly/release.

---

# 78. Nightly / Scheduled Performance Suite

Suggested:

```text
small/medium/large open
search
pagination
repagination
editor typing
accessibility analysis
collection indexing
soak
memory leak loops
```

---

# 79. Release Performance Gate

Before release verify:

- no critical input lag,
- startup acceptable,
- large fixture opens,
- search responsive,
- pagination usable,
- memory bounded,
- screen-reader navigation not severely delayed.

---

# 80. Performance Failure Categories

Suggested IDs:

```text
PERF-START
PERF-OPEN
PERF-PARSE
PERF-RENDER
PERF-TYPE
PERF-SEARCH
PERF-PAGE
PERF-POS
PERF-A11Y
PERF-MEM
PERF-LEAK
PERF-COLLECTION
PERF-SAVE
```

---

# 81. Performance Fixture Set

Minimum benchmark fixtures:

```text
tiny-basic.md
medium-readme.md
long-4000-lines.md
long-10000-lines.md
code-heavy.md
table-heavy.md
image-heavy.md
deep-headings.md
book-100-chapters/
malformed-stress.md
```

The Torture-Test Corpus Specification should define these more precisely.

---

# 82. Contributor Performance Checklist

For performance-sensitive changes ask:

- [ ] Does this run on every keystroke?
- [ ] Does this run on every scroll event?
- [ ] Does it duplicate document text?
- [ ] Does it traverse the entire semantic model?
- [ ] Can it be incremental?
- [ ] Can it be debounced?
- [ ] Can it be cancelled?
- [ ] Can it run in a worker?
- [ ] Does it trigger full React rerenders?
- [ ] Does it preserve AT stability?
- [ ] Have large fixtures been tested?

---

# 83. Anti-Patterns

Avoid:

```text
full reparse on every pixel scroll
full search-index rebuild on unrelated UI changes
full accessibility analysis on every keystroke
rendering all pages of huge document simultaneously
unbounded caches
polling filesystem continuously at high frequency
blocking renderer on file I/O
synchronous heavy IPC
```

---

# 84. Open Questions

1. Which hardware should become the official performance baseline?
2. What file sizes represent realistic "large" Markdown usage?
3. Which parser offers the best correctness/performance tradeoff?
4. Should parsing move to a worker from the first implementation?
5. How much semantic model memory overhead is acceptable?
6. Which pagination strategy gives the best time-to-first-page?
7. How aggressively should inactive documents be unloaded?
8. Should collection indexes persist between sessions?
9. What is an acceptable full-analysis time for 10 MB Markdown?
10. How should performance budgets differ across macOS/Windows/Linux?
11. Which benchmarks should block PRs?
12. How should screen-reader performance be quantified?
13. What memory-growth tolerance should soak tests allow?
14. What debounce intervals best balance typing responsiveness and preview freshness?
15. Which tasks should be prioritized or paused when the app is in background?

---

# 85. Definition of Done

The performance program should eventually be considered mature when:

- standardized fixtures exist,
- startup/open/search/pagination/edit benchmarks exist,
- median and tail latency are recorded,
- memory is measured,
- long-session leak tests exist,
- regressions are tracked over time,
- accessibility performance is explicitly tested,
- large documents degrade gracefully rather than freeze,
- interactive tasks remain prioritized over derived/background work.

---

# 86. Core Performance Rule

> **The user should never have to wait for work that does not need to block the task they are currently performing.**
