# SensibleMD

**Markdown that makes sense.**

SensibleMD is a desktop Markdown reader and editor built around a simple idea: Markdown should be as comfortable to **read** as it is convenient to **write**.

Most Markdown tools treat the rendered document as a preview of source code. SensibleMD reverses that relationship. The rendered document is the primary experience, while the original `.md` file remains directly available whenever you need to edit it.

SensibleMD is currently an early **v0.1 prototype** under active development and dogfooding.

## Why SensibleMD?

Markdown is excellent for documentation, notes, books, READMEs, technical writing, and long-form text, but many workflows still require choosing between:

- a code editor optimized for source editing,
- a word processor that hides or converts the original Markdown,
- or a specialized editor that introduces its own storage model or project format.

SensibleMD is being built as a **filesystem-first, reader-first Markdown application**:

- open ordinary `.md` files directly,
- read them in a clean rendered view,
- switch into writing or split view when needed,
- preserve the original Markdown source,
- return to the same semantic area when moving between reading and writing,
- and provide navigation, accessibility, search, and long-form reading tools without requiring a proprietary document format.

> **Write Markdown anywhere. Read it in SensibleMD.**

## Current Prototype

The v0.1 prototype now includes:

- Rendered Markdown reading mode
- Raw Markdown writing mode powered by CodeMirror 6
- Split editor + rendered preview mode
- GitHub-Flavored Markdown support
- Scroll, single-page, and two-page spread reading layouts
- Semantic document outline generated from headings
- Heading navigation with current-section tracking
- Semantic reading-position persistence
- Cross-mode semantic position projection between Read, Write, and Split
- Command palette with semantic commands
- Document and collection search
- Bookmarks and semantic navigation history
- Internal Markdown-document links
- Recent-document / no-document application state
- Reader preferences for text size, line height, content width, and reduced motion
- Accessibility-oriented authoring diagnostics
- Section summaries and structural document information
- Versioned document-buffer architecture for safe source updates
- Local document-state persistence
- Dirty-document protection when closing
- Electron desktop integration for opening and saving Markdown files
- macOS `.md` file-open lifecycle support
- Source-preserving pagination that avoids reconstructing Markdown source
- Stale navigation/work rejection across document and source changes
- Responsive Split layout behavior
- Packaged macOS builds used for dogfooding

Several systems are intentionally bounded first-pass implementations rather than final designs.

## Reader-First Interaction

A core SensibleMD interaction goal is:

```text
Read at a passage
        ↓
Switch to Write or Split
        ↓
Edit the same semantic area
        ↓
Save
        ↓
Return to Read
        ↓
Remain at the same semantic passage
```

SensibleMD treats semantic document location as more important than raw pixel or scroll offsets.

Current continuity is implemented at **semantic-node / source-line granularity**. Exact intra-paragraph word or pixel continuity is still future work.

## Reading Modes

### Scroll

A conventional continuous rendered document.

### Page

A single-page long-form reading presentation.

### Spread

A two-page reading presentation intended to feel closer to reading a book or technical manual.

Page and Spread currently use a bounded pagination model. Complete Markdown blocks are preserved, but truly geometry-aware pagination is still in development.

## Writing Modes

### Write

Raw Markdown editing using CodeMirror 6.

### Split

Side-by-side Markdown editing and rendered preview.

The editor and preview share the same document buffer and semantic navigation state while remaining independent working surfaces.

## Accessibility

Accessibility is a core product requirement, not a separate mode or later add-on.

Current and in-progress work includes:

- semantic heading and section navigation,
- screen-reader-friendly document structure,
- persistent semantic reading position,
- keyboard-first operation,
- low-vision typography and reflow controls,
- reduced-motion support,
- structured search results,
- accessible authoring diagnostics,
- focus and transient-UI behavior,
- and testing with VoiceOver, NVDA, Narrator, and Orca.

The accessibility system is still under active development and should **not** yet be considered fully validated against assistive-technology or WCAG conformance requirements.

## Project Philosophy

> **Reader first.** Opening a Markdown file should feel like opening a document, not opening source code.

> **One accessible product.** Accessibility should change interaction paths when necessary, not remove capability.

> **Semantic location over pixel location.** A reader's place should survive font changes, window resizing, pagination changes, mode changes, and reopening the file.

> **Filesystem first.** Markdown remains ordinary Markdown. SensibleMD should not require conversion into a proprietary project format.

> **Source fidelity matters.** Reading, navigation, pagination, and presentation should not silently rewrite the user's Markdown.

> **User state must be protected.** Dirty documents, stale work, lifecycle events, and navigation updates should fail safely rather than surprise the user.

> **Opening Markdown should never be equivalent to executing a program.** Untrusted document content must remain separated from Electron privileges.

> **No paywalls, ads, or tiered feature gates.** SensibleMD is intended to remain free software.

## Technology Stack

- **Electron** — desktop application shell
- **React 19** — renderer UI
- **TypeScript 6** — application code
- **Vite 8** — development and production bundling
- **CodeMirror 6** — Markdown source editor
- **unified / remark / mdast** — Markdown parsing and semantic document processing
- **remark-gfm** — GitHub-Flavored Markdown support
- **react-markdown** — rendered Markdown output
- **rehype-sanitize** — rendered-content sanitization support
- **Zod** — runtime validation support
- **Vitest** — automated tests
- **Oxlint** — linting
- **electron-builder** — desktop packaging

## Requirements

The current Electron toolchain expects **Node.js 22.12 or newer**.

```bash
node --version
npm --version
```

## Getting Started

```bash
git clone <repository-url>
cd sensiblemd
npm install
```

Run the web renderer:

```bash
npm run dev
```

Run the desktop application:

```bash
npm run dev:desktop
```

## Development Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite renderer development server |
| `npm run dev:desktop` | Start Vite and launch Electron |
| `npm run build` | Type-check and build the renderer |
| `npm test` | Run the Vitest suite |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production renderer |
| `npm run package` | Build and package the Electron application |

## Packaging

Application ID:

```text
com.sensiblemd.app
```

Product name:

```text
SensibleMD
```

The current macOS target is a `.dmg` package.

```bash
npm run package
```

macOS `.md` file association and application-open lifecycle behavior are already being exercised in packaged builds.

Signing, notarization, broader Windows/Linux validation, and release hardening remain ongoing work.

## Architecture Overview

```text
Markdown file
    │
    ▼
Document Buffer
    │
    ├── Semantic Document Model
    │      ├── Outline
    │      ├── Search
    │      ├── Navigation
    │      ├── Semantic position
    │      ├── Section summaries
    │      ├── Accessibility analysis
    │      └── Pagination
    │
    ├── CodeMirror editor
    │
    └── Rendered reader
```

The **Document Buffer** is intended to remain the authoritative in-memory Markdown source.

Derived systems operate against versioned source/model state so stale work can be rejected rather than silently overwriting newer edits or navigation.

Navigation is similarly designed around an authoritative semantic location. Page indices, outline state, editor projections, and rendered-reader positions are projections of that location rather than independent competing sources of truth.

The Electron renderer receives narrow application capabilities for opening, saving, persistence, and desktop lifecycle operations rather than unrestricted Node.js or filesystem access.

## Desktop File Lifecycle

Current desktop behavior is designed around these rules:

- normal launch opens Home / no-document state,
- normal launch does **not** automatically reopen the most recent document,
- opening a `.md` file through the operating system opens that requested file,
- an already-running instance should reuse/activate the existing window,
- closing the current document returns to Home,
- dirty documents are protected from accidental close,
- macOS activation without an open window returns to Home,
- Windows/Linux are intended to quit normally when the last window closes,
- `.md` is the intended desktop file association.

Cross-platform lifecycle validation is still ongoing.

## Security Status

SensibleMD opens user-controlled Markdown, so document content is treated as untrusted input.

Current implemented security controls include:

- `contextIsolation: true`, `nodeIntegration: false`, and renderer sandboxing,
- narrow preload APIs rather than exposing unrestricted Electron, Node.js, or filesystem access,
- validation at privileged IPC boundaries,
- a restrictive Content Security Policy,
- locally bundled fonts so the reader does not depend on Google Fonts at runtime,
- sanitized Markdown rendering with `rehype-sanitize`,
- explicit navigation controls that deny new Electron windows and prevent the application window from navigating away,
- deny-by-default browser permission handling,
- explicit external-link policy that permits HTTPS while blocking unsupported or dangerous schemes,
- constrained filesystem access,
- stale-work rejection,
- source-preserving saves,
- and protection against destructive or surprising file operations.

Manual adversarial Markdown testing currently verifies that script tags and inline event handlers do not execute, `javascript:`, `file:`, `data:`, and `ftp:` links remain inert, `mailto:` is blocked by the application link policy, and ordinary HTTPS links open externally rather than inside the Electron renderer. Initial automated hostile-link regression coverage is also in place.

The application is **not yet independently security-audited** and the v0.1 prototype should still be treated as development software rather than a hardened production release.

## Testing

Run:

```bash
npm test
```

At the time of this README update, the current refactor branch reports:

```text
150 passed
70 TODO
build: PASS
lint: PASS (28 warnings, 0 errors)
diff-check: PASS
```

Current regression coverage includes:

- document-buffer versioning and stale transaction rejection,
- dirty/saved document state,
- semantic Markdown parsing,
- semantic navigation continuity,
- mode and layout switching,
- stale navigation rejection,
- heading navigation and outline behavior,
- pagination and oversized-content handling,
- Page/Spread traversal,
- editor scrolling,
- Split layout ownership and overflow,
- close/no-document lifecycle,
- OS-requested file opening,
- transient UI dismissal,
- bookmarks and semantic navigation history,
- collections and collection search,
- reader preference normalization,
- section summaries,
- internal Markdown-link resolution,
- hostile-link regression coverage for `javascript:` and `file:` schemes,
- accessibility diagnostics,
- command-palette matching,
- and source-fidelity protections.

Automated tests do not replace physical UI testing. Manual testing still includes wheel/trackpad behavior, keyboard navigation, visible geometry, page/spread typography, assistive technology, Windows/Linux behavior, and packaged-app interaction.

## Dogfooding and Historical Bug Tracking

SensibleMD is being actively dogfooded using packaged desktop builds.

Bug reports are intentionally retained as **historical development records** rather than overwritten when fixes land. This makes it possible to follow:

```text
observed behavior
    ↓
investigation
    ↓
bounded fix
    ↓
regression tests
    ↓
follow-up issue when deeper behavior is exposed
```

Dogfooding has already driven fixes or bounded repairs in:

- page-navigation snap-back,
- outline behavior across Read/Write/Split,
- current-section observation,
- stale navigation races,
- pagination source fidelity,
- oversized-content reachability,
- document close/no-document behavior,
- OS file-open lifecycle,
- transient UI dismissal,
- editor scrolling,
- Split layout,
- and semantic position continuity across modes.

Known follow-up work includes geometry-aware Page/Spread pagination, complete preference propagation, keyboard shortcut completeness, Home-screen polish, search-result dismissal, reader spacing, accessibility refinements, and additional cross-platform validation.

See the repository dogfooding bug-tracker documents for the detailed historical record.

## Current Project Status

SensibleMD is approaching a **spec-complete v0.1 prototype**, but it is not finished software.

The project has moved beyond isolated feature prototyping into repeated packaged-app dogfooding, regression testing, lifecycle validation, and interaction refinement.

The immediate goal is to make v0.1 coherent enough that real users can:

- open ordinary Markdown files,
- read comfortably,
- move between reading and editing without losing context,
- navigate long documents semantically,
- save without source surprises,
- and provide meaningful feedback based on actual use.

Expect rough edges, incomplete UI polish, missing edge cases, and behavior that may change quickly.

## Contributing

Contributions, testing, accessibility feedback, security review, and general product feedback are welcome.

Before making substantial architectural changes, read the project specifications, design documents, and Architecture Decision Records in the repository. They describe the invariants and user-protection constraints implementation changes are expected to preserve.

Useful contribution areas include:

- accessibility and assistive-technology testing,
- Electron security review,
- keyboard and focus behavior,
- Markdown compatibility,
- large-document performance,
- geometry-aware pagination,
- long-form reading behavior,
- UI and interaction refinement,
- automated regression coverage,
- Windows and Linux testing,
- source-fidelity edge cases,
- and adversarial lifecycle/file handling.

When reporting an issue, include:

- operating system,
- SensibleMD commit/version,
- Markdown file or minimal reproduction when possible,
- expected behavior,
- actual behavior,
- reading/writing mode involved,
- viewport/window size if layout-related,
- and assistive technology used, if relevant.

## Feedback for the v0.1 Prototype

Useful task-based feedback includes:

- Did opening a Markdown file behave the way you expected?
- Would you use Read mode instead of your current Markdown viewer?
- Was switching between reading and writing intuitive?
- Did SensibleMD keep you near the same passage when changing modes?
- Did Scroll, Page, or Spread feel natural?
- Did Page/Spread ever require scrolling when you expected a page turn?
- Could you easily tell where you were in a long document?
- Was search useful in a large Markdown file?
- Did the outline help or get in the way?
- Were keyboard interactions predictable?
- Did anything unexpectedly move your reading position or focus?
- Did changing reader preferences behave consistently?
- What would stop you from making SensibleMD your default Markdown application?

## License

SensibleMD is licensed under the **GNU General Public License v3.0 or later (GPL-3.0-or-later)**.

You are free to use, study, modify, and redistribute SensibleMD under the terms of the GPL. Modified versions that are distributed must also provide their corresponding source code under a GPL-compatible license.

Third-party dependencies remain under their respective licenses. See `THIRD_PARTY_LICENSES.md` for the current dependency license inventory.

See `LICENSE` for the full license text.

---

**SensibleMD** is an experiment in making Markdown feel less like source code you preview and more like a document you can simply open, read, understand, and edit.
