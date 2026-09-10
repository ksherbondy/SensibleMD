# AGENTS.md — SensibleMD

> **This file is the entry-point contract for AI agents and human contributors working in the SensibleMD repository.**
>
> Read this file before making source changes.

SensibleMD is a **reader-first Markdown desktop application**. It is currently implemented with Electron + React/Vite for rapid cross-platform development, but the framework is an implementation detail rather than the product identity.

The product goal is simple:

> **Let users open ordinary Markdown files directly, read them comfortably like documents or books, move between reading and authoring without losing their place, and trust SensibleMD to respect their files, privacy, accessibility needs, and operating system.**

The project is intentionally held to a higher standard than “the feature works on the developer’s machine.”

---

# 1. Core Product Principles

These principles outrank implementation convenience.

1. **Never lose or corrupt the user’s writing.**
2. **Never access files beyond the user’s intent.**
3. **Never trap or exclude the user because of disability or input method.**
4. **Never surprise the user with destructive or irreversible behavior.**
5. **Keep Markdown ordinary, portable, and user-owned.**
6. **Preserve privacy and local-first behavior.**
7. **Make application state and consequences understandable.**
8. **Behave correctly on supported operating systems.**
9. **Remain responsive and resource-conscious.**
10. **Keep the architecture maintainable enough that items 1–9 remain true.**

When requirements conflict, use this order.

---

# 2. What SensibleMD Is

SensibleMD is not primarily trying to replace IDEs, PKM systems, or developer editors.

The intended workflow is:

```text
write Markdown anywhere
        ↓
ordinary .md file
        ↓
open in SensibleMD
        ↓
read comfortably
        ↓
navigate semantically
        ↓
edit when needed
        ↓
save normal Markdown
```

The defining product experience is:

> **SensibleMD should remember the document and the reader’s meaningful place so the user does not have to.**

This includes continuity across:

- application restart
- font changes
- line-spacing changes
- content-width changes
- window resize
- continuous / page / spread changes
- outline navigation
- search navigation
- history navigation
- reader ↔ writer transitions

Do not reduce semantic navigation to raw scroll offsets unless a documented fallback explicitly requires it.

---

# 3. Required Reading Before Major Changes

Before making architectural, security, filesystem, navigation, release, cross-platform, accessibility, or privacy changes, locate and read the relevant project documents.

At minimum, contributors should be aware of:

- `SENSIBLEMD_RELEASE_ASSURANCE_CHECKLIST.md`
- `SENSIBLEMD_CROSS_PLATFORM_DESKTOP_EXPERIENCE_STANDARD.md`
- `SENSIBLEMD_LIBRARY_PRIVACY_AND_INDEXING.md`
- `SENSIBLEMD_DOGFOODING_BUGS.md`
- `navigation-state-coherence-design.md`
- the current v0.1 acceptance checklist/specification
- current remediation/sprint plans
- applicable design notes under `docs/`

If filenames or locations change, locate the current authoritative version before proceeding.

Do not silently substitute personal preference for an existing documented project decision.

---

# 4. Documentation Precedence

When instructions appear to conflict, use this precedence:

1. User safety, data integrity, privacy, and filesystem boundaries
2. Explicit current user/product decisions
3. Release-assurance requirements
4. Current approved architecture/design note for the area being changed
5. Current v0.1 acceptance criteria
6. Current sprint/remediation scope
7. Dogfooding issue acceptance criteria
8. Existing implementation
9. Contributor preference

Existing code is **not automatically authoritative** when it conflicts with an approved design or safety invariant.

If two current project documents materially conflict, stop and surface the conflict before broad implementation.

---

# 5. Scope Discipline

Do not broaden a task merely because adjacent cleanup looks attractive.

For every change:

- identify the requested scope
- identify the relevant acceptance criteria
- identify explicit non-goals
- preserve unrelated behavior
- avoid opportunistic architecture migrations
- avoid unrelated dependency changes
- avoid cosmetic rewrites during correctness/security work unless required

Examples of scope creep to avoid:

- introducing Zustand during a bounded navigation repair unless explicitly approved
- replacing the parser during a pagination fix
- redesigning persistence during a UI bugfix
- adding a plugin system because another editor has one
- widening filesystem permissions to make implementation easier

If a discovered issue is real but outside scope:

1. document it
2. classify its risk
3. leave the unrelated code unchanged unless it blocks the requested work

---

# 6. Evidence Before Claims

Never claim a requirement is complete solely because code was written.

Use evidence appropriate to the requirement.

Possible evidence includes:

- executable regression test
- production build
- lint/typecheck
- packaged application test
- manual keyboard test
- screen-reader test
- cross-platform test
- performance measurement
- filesystem adversarial test
- recovery/save workflow test
- source inspection

Project rule:

> **NOT TESTED is not PASS.**

`N/A` requires a written rationale.

Do not claim:

- secure
- accessible
- production-ready
- cross-platform
- recovered
- private
- saved safely
- release-ready

without evidence supporting what a normal user would understand those words to mean.

---

# 7. Test-First Rule for Regressions

For a reported bug:

1. reproduce the original behavior
2. identify the actual cause
3. add a failing regression test where practical
4. implement the smallest coherent fix
5. make the regression pass
6. run relevant existing tests
7. test the packaged app when behavior depends on Electron/browser/layout
8. record remaining limitations

A new test that only passes against the new implementation is weaker than a reproduction that demonstrably fails for the intended reason before the fix.

Do not add TODO tests as a substitute for fixing a scoped requirement.

---

# 8. Navigation Architecture Guardrails

Navigation is a core product capability.

The approved direction is:

> **One semantic navigation location for the active document. Heading, page, spread, and visible section are derived from that location. Read/Write/Split and requested reading presentation are separate user choices and must not become side effects of navigation.**

Do not reintroduce multiple competing location authorities.

Important navigation invariants:

## NAV-001

A user-initiated navigation action may change location but must not implicitly change Read/Write/Split mode.

## NAV-002

Changing presentation must not change semantic location.

## NAV-003

No stale synchronization effect may overwrite a newer user-initiated navigation location.

## NAV-004

For a non-empty document, current navigation must resolve within the active document/model. Heading and page are derived rather than independently authoritative.

## NAV-005

Navigation targets must map to the correct semantic source/render target, including duplicate and formatted headings.

## NAV-006

Programmatic projection must not feed back as fresh user navigation.

## NAV-007

Pagination must not rewrite Markdown source merely to create page fragments, and all content must remain reachable.

## NAV-008

Stale source offsets, search results, hydration results, or queued callbacks must not apply to a newer document/model/version.

## NAV-009

Navigation and presentation alone must not dirty the document or mutate editor undo history.

For current detailed design and regression sequence, read `navigation-state-coherence-design.md`.

---

# 9. Navigation Intent Must Be Consistent Across Modes

The meaning of an outline or semantic navigation action is:

> **Take me to this section.**

Presentation adapts to the current mode.

Expected behavior:

- **Scroll/Read:** reveal the target in the rendered reader
- **Page/Spread:** reveal the page/spread containing the target
- **Write:** move the editor to the target source location
- **Split:** move editor and preview coherently

Do not force Read mode simply because the user navigated.

Mode changes must come from explicit user intent unless an approved open/activation rule says otherwise.

---

# 10. Stale Asynchronous Work Is a Correctness Risk

SensibleMD contains or may contain:

- async desktop state hydration
- file reads
- recovery loading
- external file events
- delayed persistence
- `requestAnimationFrame`
- lazy editor mounting
- observers
- search/index computation
- queued UI projection

Never assume deferred work will complete in the order it was started.

Any deferred operation that can affect the active document, navigation, editor, or persisted state must be validated against the current relevant identity/version/generation before applying.

Cancellation is useful but is not sufficient by itself.

A stale callback must be harmless if it executes.

---

# 11. Save and Recovery Are Higher Priority Than Convenience

Any lifecycle feature that can close, replace, switch, reload, or discard a document must respect save/recovery protections.

Examples:

- Close Document
- Open another document
- Recent Document
- collection chapter switch
- internal link to another file
- external-change reload
- recovery restore
- application quit

Before implementing convenience lifecycle features, verify they cannot:

- lose unsaved edits
- overwrite the wrong file
- apply state to the wrong document
- discard recoverable content
- cross session/document authority

A polished no-document screen does not outrank save integrity.

---

# 12. Filesystem and Privacy Guardrails

SensibleMD follows least privilege.

The user owns the filesystem.

The app receives only the authority required for the operation the user requested.

For future Library/indexing behavior:

```text
OS access
    ↓
explicit user-authorized root
    ↓
Markdown-only scope
    ↓
metadata permission?
    ↓
content permission?
    ↓
specific operation
```

Do not silently expand filesystem authority.

---

# 13. Markdown-Only Library Rule

For future Library/index/search functionality:

> **Files that are not Markdown are none of SensibleMD’s business.**

The Library/indexer should not intentionally enumerate, expose, index, preview, or read unsupported non-Markdown files.

Apply Markdown filtering at multiple boundaries:

- scanner
- indexer
- library open handler
- main-process filesystem boundary

Case handling must follow the documented `.md` policy.

Reject misleading names such as:

```text
notes.md.txt
photo.md.png
```

Symlinks must be canonicalized and validated so a link inside an authorized directory cannot escape the authorized root.

Removing authorization must revoke application-level access and invalidate relevant indexing capability.

Read `SENSIBLEMD_LIBRARY_PRIVACY_AND_INDEXING.md` before implementing Library behavior.

---

# 14. Electron Security Guardrails

Electron is a privileged desktop shell. Treat its trust boundaries seriously.

At minimum preserve and verify as applicable:

- `contextIsolation = true`
- renderer sandboxing
- no unnecessary Node integration in renderer
- restrictive Content Security Policy
- sanitized untrusted Markdown rendering
- narrow `contextBridge` API
- no raw `ipcRenderer` exposure
- validated IPC senders
- explicit input validation
- restricted navigation/window creation
- validated external URL opening
- current supported Electron version
- review of Electron fuses
- least-privilege filesystem operations

Renderer code must not gain broad filesystem capability because doing so is convenient.

Session/document identity must not be confused with filesystem authorization.

---

# 15. DevTools Policy

Development builds may expose DevTools.

Public/release binaries must not expose casual user-accessible Chromium DevTools through:

- F12
- `Ctrl+Shift+I`
- `Cmd/Option+Cmd+I` equivalents
- application menus
- context-menu Inspect actions
- accidental production `openDevTools()` calls

Disabling DevTools is **not a security boundary**. Security must remain correct even if a determined local user can inspect or modify their own installed application.

---

# 16. Cross-Platform Desktop Standard

Electron is allowed to make SensibleMD easier to build.

> **Electron is not allowed to make SensibleMD worse to use.**

Read `SENSIBLEMD_CROSS_PLATFORM_DESKTOP_EXPERIENCE_STANDARD.md` before changing desktop behavior.

The operating-system behaviors users already know should simply work.

---

# 17. macOS Expectations

Use native Electron roles and platform behavior where available rather than manually recreating standard AppKit actions.

Verify appropriate behavior for:

- `Cmd+O`
- `Cmd+S`
- `Cmd+Shift+S`
- `Cmd+W`
- `Cmd+Q`
- `Cmd+F`
- `Cmd+,`
- `Cmd+H`
- `Option+Cmd+H`
- `Cmd+M`
- undo/redo
- cut/copy/paste/select all
- Dock activation
- hiding/unhiding
- minimizing/restoring
- native menus
- native file dialogs
- application/window lifecycle
- VoiceOver
- reduced motion
- light/dark appearance

Do not implement a web imitation of native behavior when Electron exposes the native action.

---

# 18. Windows Expectations

Verify:

- standard Control-key shortcuts
- `Alt+F4`
- keyboard-only operation
- Narrator
- visible focus
- high contrast
- DPI scaling
- mixed-DPI monitor behavior
- window snapping
- maximize/minimize/restore
- taskbar activation
- text selection/copy behavior
- native file dialogs
- mouse/touchpad behavior

Do not treat Windows as “macOS with Ctrl instead of Cmd.”

---

# 19. Linux Expectations

Linux support must be tested deliberately.

At minimum, when claiming broad Linux support, consider:

- GNOME
- KDE Plasma
- Wayland
- X11/XWayland paths relevant to the application
- file chooser integration
- launcher behavior
- window lifecycle
- system themes
- keyboard navigation
- Orca where applicable
- touchpad/mouse scrolling

Do not claim Linux support based on one developer distribution alone.

---

# 20. Accessibility Is Not Optional

Target WCAG 2.2 AA where applicable and honor platform accessibility conventions.

Automated tooling does not replace manual accessibility testing.

Primary workflows must be tested with:

- keyboard only
- VoiceOver on macOS
- Narrator on Windows
- Orca on Linux where appropriate
- zoom/text scaling
- narrow/reflow layouts
- reduced motion
- high contrast
- visible focus

Do not convey important state using color alone.

Do not create inaccessible custom controls when a semantic/native control will work.

---

# 21. Focus and Transient UI

Transient interfaces include:

- menus
- popovers
- search UI
- filters
- command palette
- settings overlays
- dialogs

Where appropriate they should support:

- `Escape`
- click-away
- trigger-again dismissal
- selection dismissal
- logical focus restoration

Search text and search UI visibility are separate concepts.

Do not force users to erase a query merely to close search.

Keyboard focus must remain visible, logical, and recoverable.

---

# 22. Performance Is a User Feature

SensibleMD is a reader. Jank is a correctness problem for the reading experience.

Protect:

- fast startup
- near-zero idle CPU
- bounded memory
- smooth scrolling
- immediate typing
- fast navigation
- responsive search
- responsive mode changes

Do not rely on a high-end development machine to prove performance.

Use representative lower-end hardware before release.

---

# 23. Performance Engineering Rules

Avoid unnecessary:

- synchronous filesystem work
- synchronous IPC
- repeated full-document parsing during render
- heavy computation on scroll
- eager loading of entire libraries
- giant persistent JSON/state hydration at startup
- polling loops
- runtime dependencies
- background work that competes with user input

Typing must not wait for diagnostics, indexing, summaries, or other analysis.

Prefer:

```text
user input
    ↓
immediate UI update
    ↓
debounced/background analysis
```

Measure before optimizing, but do not ignore obvious architectural hot paths.

---

# 24. Dependency Discipline

Before adding a runtime dependency, answer:

1. What user problem does it solve?
2. Can existing code/dependencies solve it?
3. What is the bundle/startup impact?
4. What transitive dependencies are introduced?
5. What attack surface is introduced?
6. Is it actively maintained?
7. Is a small internal implementation safer and simpler?

Do not add a large framework/library to solve a tiny isolated problem without justification.

---

# 25. UI Controls Must Tell the Truth

A control shown as functional must have a real and observable effect.

For preferences:

```text
change
    ↓
observable result
    ↓
persist if intended
    ↓
restart
    ↓
restored behavior
```

If a feature is not implemented, do not present a working-looking control that does nothing.

This applies to settings such as:

- content width
- line spacing
- font size
- reduced motion
- authoring checks
- reading layout

---

# 26. Authoring Experience

SensibleMD is reader-first, but authoring must still be safe and comfortable.

At minimum the editor should support normal desktop expectations:

- scrolling
- selection
- cursor movement
- undo/redo
- cut/copy/paste
- find
- keyboard navigation
- visible caret
- stable source
- no surprise mode changes

Authoring diagnostics should be optional in visibility and must not create perceptible typing latency.

Syntax highlighting is an enhancement; basic editor correctness comes first.

---

# 27. Pagination Quality Bar

Pagination is a defining product capability.

Do not hide pagination defects behind UI polish.

Current bounded work may retain fixed-capacity pagination if explicitly documented.

Do not claim geometry-sensitive pagination until page boundaries actually respond correctly to:

- font size
- line spacing
- content width
- viewport geometry

For fixed-capacity repair:

- preserve source semantics
- do not fragment/reparse Markdown in a way that changes meaning
- keep all content reachable
- allow oversized whole blocks to remain scrollable if required by the current approved design
- keep page/spread state derived from semantic location
- handle odd/even page counts
- handle effective one/two-column layouts consistently

---

# 28. Dogfooding Is Engineering Evidence

Direct use of the packaged application is a formal source of requirements.

Read `SENSIBLEMD_DOGFOODING_BUGS.md`.

Preserve raw user observations before translating them into technical theories.

Example:

> “I clicked page buttons a few times and it jumped back to where the view opened.”

This is valuable even before the cause is known.

Do not overwrite a user observation with an implementation explanation.

Maintain both:

- **Observed behavior**
- **Established cause**

---

# 29. Packaged-App Verification

A Vite dev server succeeding does not prove the desktop product works.

For Electron behavior, package and run the actual application.

Regression already discovered:

## PACKAGING-001

A packaged build initially showed a blank screen because absolute Vite asset paths did not work under packaged file loading.

Therefore:

> The packaged app must launch and render with the development server completely offline.

Public packaging has additional signing/notarization/code-signing requirements defined in the release-assurance standards.

---

# 30. Public Release Discipline

Source availability is not the same as release readiness.

Do not treat an easy-to-download public binary as acceptable until release gates are satisfied.

Stable/public release work must eventually include appropriate:

- signing
- notarization / platform trust
- hashes
- release manifest
- source tag/commit traceability
- dependency review
- SBOM/provenance where required by the assurance plan
- cross-platform packaged testing
- accessibility evidence
- known limitations

Never instruct normal users to bypass Gatekeeper, SmartScreen, or comparable platform security controls as the normal installation process.

---

# 31. Clean Architecture Without Dogma

Favor:

- clear domain concepts
- narrow module responsibilities
- explicit state ownership
- pure transition/helper logic where appropriate
- explicit trust boundaries
- testable core behavior
- platform-specific code at platform edges

Do not refactor merely to satisfy a pattern.

A simpler implementation that preserves the project invariants is better than architectural ceremony.

---

# 32. `App.tsx` Guardrail

`App.tsx` currently coordinates substantial application behavior.

Do not continue adding independent state variables/effects for domain concepts that should share ownership.

When touching `App.tsx`, explicitly ask:

- Is this new state authoritative or derived?
- Who is allowed to write it?
- Could it conflict with another state value?
- Can stale async work overwrite it?
- Should this logic live in an existing/new core hook/module instead?
- Is the change making `App.tsx` more coherent or merely larger?

Do not perform a broad `App.tsx` rewrite without an approved bounded design.

---

# 33. Source and Identity Rules

Document identity, semantic identity, navigation identity, session identity, and filesystem authority are related but not interchangeable.

Do not casually change identity formats.

Do not use user-visible names, collection position, or locale-sensitive transformations as persistent identity unless explicitly designed for that purpose.

Preserve documented migration behavior.

Never delete old user state merely because a new identity/storage design is introduced unless an explicit migration policy authorizes it.

---

# 34. Locale and Unicode

Persistent identifiers/fingerprints must not accidentally depend on current machine locale.

Unicode normalization decisions must remain explicit.

Do not replace locale-independent persistent normalization with locale-sensitive UI matching behavior.

UI search/matching and persistent identity may intentionally use different rules.

---

# 35. Security and Accessibility Reviews Must Be Adversarial

Do not ask only:

> “Do the tests pass?”

Also ask:

- What scenario did nobody write a test for?
- What happens when a callback arrives late?
- What happens after a source edit invalidates IDs?
- What happens with duplicate headings?
- What happens with malformed Markdown?
- What happens when a symlink escapes an allowed folder?
- What happens with keyboard only?
- What happens with screen readers?
- What happens after 100 document switches?
- What happens with a 10 MB or 50 MB file?
- What happens when the app is hidden/minimized/restored?
- What happens if the OS denies access?
- What happens when the file disappears mid-session?
- What happens when a user has unsaved edits?

Tests prove only the cases they encode.

---

# 36. Definition of Done

Before claiming a scoped task complete:

- required behavior implemented
- relevant regression tests added
- existing tests pass
- type/build checks pass
- lint checked
- Electron main/preload syntax checked where applicable
- packaged behavior checked where required
- no unrelated scope creep
- known limitations documented
- acceptance criteria explicitly mapped to evidence
- TODOs reduced only when requirement is actually fulfilled

If manual platform/a11y testing remains outstanding, say so.

---

# 37. Agent Communication Standard

When reporting work:

## State what changed

Name the files and behavior.

## State why

Tie the change to:

- bug ID
- requirement
- invariant
- acceptance criterion

## State evidence

Example:

```text
Tests: 94 passed, 62 TODO
Build: PASS
Lint: PASS with existing warnings
Packaged macOS smoke test: PASS
VoiceOver: NOT TESTED
Windows: NOT TESTED
Linux: NOT TESTED
```

## State known limitations

Do not bury them.

## State scope boundaries

Explicitly mention important related work that was **not** solved.

---

# 38. Do Not Manufacture Completion

Examples of unacceptable reporting:

> “Accessibility complete” because axe found no issues.

> “Secure” because `contextIsolation` is enabled.

> “Cross-platform” because TypeScript compiled.

> “Pagination fixed” when only snap-back was fixed but content can still be hidden.

> “Recovery safe” because one recovery unit test passed.

Use precise language.

---

# 39. Do Not Manufacture Problems Either

This project values rigorous review, not performative criticism.

Do not create speculative blockers merely to appear thorough.

When identifying an issue, distinguish:

- observed defect
- source-backed defect
- credible risk
- future improvement
- intentionally deferred work
- theoretical possibility

Planned later-sprint work is not automatically a defect in the current sprint.

---

# 40. Product Honesty

Labels must mean what a normal user reasonably understands.

Examples:

- “Saved” means the user’s writing is durably handled according to the save contract.
- “Private” must reflect actual data handling.
- “Local” must not hide unexpected network behavior.
- “Recovered” must not imply recovery is complete if content may still be stale/incomplete.
- “Accessible” requires real validation.

Never solve a technical requirement by weakening the meaning of the user-facing promise.

---

# 41. Desired Contributor Mindset

Act as a steward of the user’s files and reading experience.

The question is not:

> “Can I make this test green?”

The question is:

> **“Will this make SensibleMD more trustworthy, predictable, comfortable, and maintainable without violating the user’s expectations?”**

---

# 42. Final Guardrail

Before making a substantial change, ask:

```text
Does this preserve user data?
Does this stay within authorized filesystem scope?
Does this preserve semantic reading continuity?
Does this preserve accessibility?
Does this behave correctly on the target OS?
Does this keep Electron from becoming visible as friction?
Does this have regression evidence?
Does this stay within scope?
```

If the answer to any relevant question is unclear, investigate before broad implementation.

> **SensibleMD should feel simple to the user because the engineering underneath it is deliberate.**
