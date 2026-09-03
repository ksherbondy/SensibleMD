# SensibleMD

**Markdown that makes sense.**

SensibleMD is a desktop Markdown reader and editor designed around a simple idea: Markdown should be as comfortable to **read** as it is convenient to **write**.

Instead of treating Markdown as source code that happens to have a preview, SensibleMD treats the rendered document as the primary reading experience while keeping the original `.md` file fully accessible for editing when needed.

The project is currently an early **v0.1 prototype** and is under active development.

## Why SensibleMD?

Markdown is excellent for documentation, notes, books, READMEs, technical writing, and long-form text, but most Markdown workflows still require choosing between:

- a code editor that is powerful but optimized for source editing,
- a word processor that hides or converts the original Markdown,
- or a specialized editor that may introduce its own storage model or workflow.

SensibleMD is being built as a **filesystem-first, reader-first Markdown application**:

- open ordinary `.md` files directly,
- read them in a clean rendered view,
- switch into writing mode when necessary,
- preserve the original Markdown source,
- and provide semantic navigation, accessibility features, and long-form reading tools without requiring a proprietary document format.

## Current Prototype Features

The v0.1 prototype currently includes or is actively implementing:

- Rendered Markdown reading mode
- Raw Markdown writing mode powered by CodeMirror 6
- GitHub-Flavored Markdown support
- Scroll, single-page, and two-page spread reading layouts
- Semantic document outline generated from headings
- Heading navigation
- Command palette with semantic commands
- Document search and collection search foundations
- Bookmarks and semantic navigation history
- Internal Markdown-document links
- Reader preferences including font scaling, line height, content width, and reduced motion
- Accessibility-oriented authoring diagnostics
- Section summaries and structural document information
- Versioned document-buffer architecture for safe source updates
- Local document state persistence hooks
- Electron desktop integration for opening and saving Markdown files

Many of these systems are still being refined as the implementation works toward the complete v0.1 specification.

## Accessibility

Accessibility is a core product requirement, not a separate mode or later add-on.

SensibleMD is being designed around the principle that readers should have access to the same document structure and capabilities regardless of whether they navigate visually, with a keyboard, through assistive technology, or through other interaction methods.

Planned and in-progress work includes:

- semantic heading and section navigation,
- screen-reader-friendly document structure,
- persistent semantic reading position,
- keyboard-first operation,
- low-vision typography and reflow controls,
- reduced-motion support,
- structured search results,
- accessible authoring diagnostics,
- and testing with platform assistive technologies such as VoiceOver, NVDA, Narrator, and Orca.

The accessibility system is still under active development and should not yet be considered fully validated against assistive-technology or WCAG conformance requirements.

## Project Philosophy

A few principles guide the project:

> **Reader first.** Opening a Markdown file should feel like opening a document, not opening source code.

> **One accessible product.** Accessibility should change interaction paths when necessary, not remove capability.

> **Semantic location over pixel location.** A reader's place in a document should survive font changes, window resizing, pagination changes, and reopening the file.

> **Filesystem first.** Markdown remains ordinary Markdown. SensibleMD should not require conversion into a proprietary project format.

> **Be liberal in what you can open, conservative in what you modify.** Source fidelity and user trust matter.

> **Opening Markdown should never be equivalent to executing a program.** Untrusted document content must remain separated from Electron privileges.

## Technology Stack

SensibleMD currently uses:

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

You will need a recent Node.js release compatible with the project's dependencies. The current Electron toolchain expects **Node.js 22.12 or newer**.

Check your installed version:

```bash
node --version
npm --version
```

## Getting Started

Clone the repository:

```bash
git clone <repository-url>
cd sensiblemd
```

Install dependencies:

```bash
npm install
```

### Run the web renderer

```bash
npm run dev
```

The Vite development server binds to:

```text
http://127.0.0.1:5175
```

### Run the desktop application

```bash
npm run dev:desktop
```

This starts Vite, waits for the local development server, and then launches Electron.

## Development Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite renderer development server |
| `npm run dev:desktop` | Start Vite and launch the Electron desktop app |
| `npm run build` | Type-check the project and build the renderer |
| `npm test` | Run the Vitest test suite |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production Vite build |
| `npm run package` | Build and package the Electron application |

## Packaging

The current `electron-builder` configuration identifies the application as:

```text
com.sensiblemd.app
```

with the product name:

```text
SensibleMD
```

The current macOS target is a `.dmg` package.

```bash
npm run package
```

Additional platform packaging and signing work may be added as the project matures.

## Architecture Overview

SensibleMD deliberately separates the live Markdown source from the many systems derived from it.

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
    │      ├── Section summaries
    │      ├── Accessibility analysis
    │      └── Pagination
    │
    ├── CodeMirror editor
    │
    └── Rendered reader
```

The **Document Buffer** is intended to remain the single authoritative in-memory Markdown source for an open document. Derived systems operate against versioned snapshots so stale work can be rejected rather than silently overwriting newer edits.

The Electron renderer is intended to receive only narrow application capabilities for tasks such as opening, saving, and loading document state rather than unrestricted Node.js or filesystem access.

## Security Status

SensibleMD opens user-controlled Markdown, so document content is treated as untrusted input.

The project is being designed around:

- renderer/process isolation,
- narrow preload APIs,
- sanitized Markdown rendering,
- controlled internal and external link handling,
- constrained filesystem access,
- runtime validation at privileged boundaries,
- safe handling of malformed or extremely large documents,
- and source-preserving save behavior.

The application is **not yet security-audited** and the v0.1 prototype should be treated as development software rather than a hardened production release.

Security review and adversarial testing are ongoing parts of the project.

## Testing

Run the automated tests with:

```bash
npm test
```

Current tests cover foundational behavior including:

- stale document transaction rejection,
- dirty/saved document state,
- semantic Markdown parsing,
- section-aware search,
- pagination behavior,
- structural heading commands,
- accessibility diagnostics,
- heading navigation and bookmarks,
- command-palette matching,
- semantic navigation history,
- multi-document collections,
- collection search,
- reader preference normalization,
- section summaries,
- and internal Markdown-link resolution.

The longer-term test strategy also includes hostile Markdown fixtures, large-document stress tests, manual keyboard testing, screen-reader testing, security regression cases, and cross-platform desktop testing.

## Project Status

SensibleMD is currently approaching a **spec-complete v0.1 prototype**.

That means the immediate goal is not to claim the application is finished. The goal is to implement the documented system far enough that it can be exercised by real users, inspected by contributors, tested against its design assumptions, and refined based on actual use.

Expect rough edges, incomplete UI polish, missing edge cases, and behavior that may change quickly.

Feedback is extremely valuable at this stage.

## Contributing

Contributions, testing, accessibility feedback, security review, and general product feedback are welcome.

Before making substantial architectural changes, please read the project specifications and Architecture Decision Records in the repository. The documentation describes not just the intended features, but also the invariants and design constraints the implementation is expected to preserve.

Useful contribution areas include:

- accessibility and assistive-technology testing,
- Electron security review,
- keyboard and focus behavior,
- Markdown compatibility,
- large-document performance,
- pagination and long-form reading behavior,
- UI and interaction refinement,
- automated test coverage,
- Windows and Linux testing,
- and source-fidelity edge cases.

When reporting an issue, please include:

- operating system,
- SensibleMD commit/version,
- Markdown file or minimal reproduction when possible,
- expected behavior,
- actual behavior,
- and assistive technology used, if relevant.

## Feedback for the v0.1 Prototype

If you are trying SensibleMD early, some of the most useful feedback is task-based:

- Did opening a Markdown file behave the way you expected?
- Would you use Read mode instead of your current Markdown viewer?
- Was switching between reading and writing intuitive?
- Did Scroll, Page, or Spread mode feel natural?
- Could you easily tell where you were in a long document?
- Was search useful in a large Markdown file?
- Did the outline help or get in the way?
- Were keyboard interactions predictable?
- Did anything unexpectedly move your reading position or focus?
- What would stop you from making SensibleMD your default Markdown application?

## License

SensibleMD is licensed under the GNU General Public License v3.0 or later (GPL-3.0-or-later).
You are free to use, study, modify, and redistribute SensibleMD under the terms of the GPL. Modified versions that are distributed must also provide their corresponding source code under a GPL-compatible license.
Third-party dependencies remain under their respective licenses. See THIRD_PARTY_LICENSES.md for the current dependency license inventory.
See LICENSE for the full license text.

---

**SensibleMD** is an experiment in making Markdown feel less like source code you preview and more like a document you can simply open, read, understand, and edit.
