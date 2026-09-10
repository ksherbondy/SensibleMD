# SensibleMD Cross-Platform Desktop Experience Standard

> **Engineering goal:** A user should not be able to tell SensibleMD is Electron from its responsiveness, behavior, accessibility, or platform integration.

**Status:** Living engineering standard  
**Applies to:** macOS, Windows, Linux desktop builds  
**Primary concern:** User experience, native-feeling behavior, accessibility, performance, privacy, and reliability  
**Framework:** Electron + React/Vite prototype

---

## 1. Purpose

SensibleMD is intentionally being prototyped in Electron because Electron allows rapid iteration across macOS, Windows, and Linux.

Electron is an implementation choice. It must not become the user's problem.

The standard for SensibleMD is not merely:

> "The app works on Mac, Windows, and Linux."

The standard is:

> **The app behaves like a good desktop citizen on Mac, Windows, and Linux.**

A user should not encounter the common failure modes associated with poorly built Electron applications:

- slow startup
- excessive idle CPU use
- uncontrolled memory growth
- stuttering scroll or typing
- web-like interaction patterns where native desktop behavior is expected
- broken keyboard shortcuts
- incorrect application/window lifecycle behavior
- non-native file dialogs
- inaccessible controls
- keyboard traps
- inconsistent focus handling
- platform conventions ignored
- oversized or unnecessary dependencies
- blocking filesystem or IPC work
- background work that interferes with foreground interaction

If users are surprised to learn SensibleMD is built with Electron, that is a success.

---

# 2. Core Principle

## 2.1 Electron must disappear as an implementation detail

The user should experience:

```text
Open file
    ↓
read
    ↓
navigate
    ↓
edit if needed
    ↓
save
```

They should not experience:

```text
launch Chromium application
    ↓
wait
    ↓
web UI behaves slightly wrong
    ↓
fight keyboard/focus/window behavior
```

SensibleMD should feel like a desktop application that happens to use Electron internally.

---

# 3. User-First Priority Order

When tradeoffs occur, use this order:

1. Never lose or corrupt the user's writing.
2. Never access files beyond the user's intent.
3. Never exclude the user because of disability or input method.
4. Never surprise the user with destructive or irreversible behavior.
5. Preserve privacy and local-first behavior.
6. Make application state and consequences understandable.
7. Behave correctly on supported operating systems.
8. Remain responsive and resource-conscious.
9. Be visually polished and pleasant.
10. Keep the architecture maintainable enough that items 1-9 remain true.

Performance does not outrank data integrity or accessibility.

Visual polish does not excuse broken platform behavior.

---

# 4. Cross-Platform Behavioral Contract

These behaviors apply regardless of operating system.

## DESK-001 — Fast usable startup

SensibleMD should display a usable application window without requiring the full application state, library, indexes, or document history to be loaded first.

Preferred lifecycle:

```text
launch
    ↓
show application
    ↓
restore minimal UI state
    ↓
open/restore active document if appropriate
    ↓
lazy-load secondary state
```

Avoid:

```text
launch
    ↓
load every document
    ↓
parse every document
    ↓
hydrate every index
    ↓
restore all state
    ↓
finally show UI
```

## DESK-002 — Idle means idle

When the user is not interacting with SensibleMD and no explicit background operation is required:

- CPU utilization should settle near zero.
- no polling loop should continuously wake the process without justification.
- no animation should continue indefinitely when invisible or unnecessary.
- filesystem watching must not create continuous CPU churn.
- background indexing must yield to foreground interaction.

A desktop reading application should not make the user's fans spin while doing nothing.

## DESK-003 — Foreground interaction always wins

Typing, scrolling, page navigation, file opening, outline navigation, and commands visible to the user take precedence over background work.

Background work must not create noticeable:

- typing latency
- missed clicks
- delayed hover state
- scroll hitching
- mode-switch stalls
- page-navigation stalls

## DESK-004 — Never block the Electron main process unnecessarily

Avoid synchronous or long-running work on the main process.

Be especially careful with:

- filesystem traversal
- large file reads
- hashing
- parsing
- indexing
- serialization
- large synchronous IPC responses
- large JSON state files

The main process is responsible for application responsiveness and native integration.

## DESK-005 — Avoid synchronous IPC

Renderer/main communication should generally be asynchronous.

Synchronous IPC can freeze the renderer while it waits for the main process.

IPC should be narrow, explicit, validated, and designed around capabilities rather than exposing broad system access.

## DESK-006 — Scrolling must remain fluid

SensibleMD is a reader.

Scrolling quality is therefore not a cosmetic metric.

Continuous reading mode must remain smooth during:

- ordinary scrolling
- trackpad momentum
- keyboard navigation
- outline synchronization
- large documents
- active search results
- rendered code blocks/tables/images
- split view

Expensive work should not run on every scroll event when it can be deferred, throttled, memoized, indexed, or derived differently.

## DESK-007 — Typing must never wait on authoring analysis

Authoring diagnostics, parsing, summaries, indexing, or semantic analysis must not make raw Markdown editing feel sluggish.

If necessary:

```text
keystroke
    ↓
editor immediately updates
    ↓
analysis scheduled/debounced
    ↓
results update later
```

Never:

```text
keystroke
    ↓
parse entire document synchronously
    ↓
run diagnostics
    ↓
update indexes
    ↓
finally paint character
```

---

# 5. Performance Budgets

These are engineering targets, not marketing promises. They should be revised after measurements on representative hardware.

## Initial targets

| Scenario | Initial target |
|---|---:|
| Idle CPU | approximately 0% |
| Typical idle memory | preferably under 200-250 MB total |
| Cold launch to usable UI | < 1.5 seconds on mainstream hardware |
| Warm launch | < 750 ms |
| Common command response | < 100 ms perceived |
| Typing response | imperceptible; preferably < 16-50 ms |
| 60 Hz frame budget | ~16.7 ms |
| Open 1 MB Markdown | effectively immediate |
| Open 10 MB Markdown | aim for < 1 second to usable content |
| Search large document | UI remains responsive |
| Read/write/layout switch | preferably < 100-200 ms perceived |
| Idle after operation | returns to near-zero CPU |

These are starting budgets. Real measurements determine whether the target is reasonable.

---

# 6. Reference Hardware

Testing only on a high-end development machine is insufficient.

Maintain at least three performance profiles.

## PERF-HW-001 — High-end development reference

Example:

- Apple M-series Max-class machine
- large RAM configuration
- fast SSD

Purpose:

- development
- profiling
- stress testing
- measuring algorithmic behavior

This machine must **not** define the minimum acceptable experience.

## PERF-HW-002 — Mainstream reference

Example target:

- 4-8 modern CPU cores
- 16 GB RAM
- ordinary consumer SSD
- integrated graphics acceptable

This should approximate a normal current laptop/desktop.

## PERF-HW-003 — Low-end supported reference

Example target:

- 4 CPU cores
- 8 GB RAM
- ordinary SSD
- integrated graphics

If SensibleMD remains pleasant here, the high-end machine is unlikely to be masking major interaction problems.

---

# 7. Document Performance Corpus

Performance testing should include at least:

```text
100 KB
1 MB
10 MB
50 MB
```

Markdown corpora should contain realistic combinations of:

- headings
- paragraphs
- links
- images
- tables
- code blocks
- lists
- long lines
- deeply nested structures
- malformed Markdown
- many internal links

Do not benchmark only synthetic plain-text documents.

---

# 8. Lifecycle Performance Testing

Startup benchmarks alone are insufficient.

Run long-session scenarios.

## PERF-LIFE-001

```text
cold launch
↓
open 100 KB file
↓
open 1 MB file
↓
open 10 MB file
↓
close/open documents repeatedly
↓
switch reading modes repeatedly
↓
search repeatedly
↓
resize repeatedly
↓
change font/spacing/width repeatedly
↓
edit document
↓
save
↓
leave idle
↓
measure CPU/memory/handles/listeners
```

Watch for memory patterns such as:

```text
150 MB
↓
180 MB
↓
245 MB
↓
390 MB
↓
650 MB
↓
never meaningfully returns
```

That pattern requires investigation.

---

# 9. Dependency Discipline

Every new runtime dependency increases one or more of:

- startup work
- bundle size
- attack surface
- maintenance burden
- supply-chain exposure
- transitive dependencies
- memory footprint

Before adding a dependency, answer:

1. What user problem does this dependency solve?
2. Can an existing dependency solve it?
3. Is a small internal implementation safer/simpler?
4. How much code is loaded at startup?
5. Does the dependency execute background work?
6. What permissions or APIs does it require?
7. What is its maintenance/security history?
8. Does it materially increase bundle size?

Avoid:

> "There is an npm package for this, therefore install it."

---

# 10. Platform Layering

SensibleMD should maintain:

```text
                Shared SensibleMD behavior
                          │
          ┌───────────────┼───────────────┐
          │               │               │
        macOS          Windows          Linux
          │               │               │
 Apple conventions   Windows/Fluent   GNOME/KDE/
 + AppKit behavior   conventions      freedesktop
```

Do not force identical platform behavior when users expect different conventions.

Consistency means:

> SensibleMD behaves consistently with the user's operating system.

Not:

> Every operating system receives exactly the same shortcuts and menus.

---

# 11. macOS Standard

macOS users expect ordinary Mac application behavior.

## MAC-BEH-001 — Command-H hides SensibleMD

`⌘H` must hide the application using normal macOS application behavior.

Prefer native Electron menu roles such as:

```js
{ role: 'hide' }
```

rather than manually implementing:

```js
{
  accelerator: 'Cmd+H',
  click() {
    // custom window-hiding logic
  }
}
```

Electron's macOS roles map to underlying AppKit application actions.

## MAC-BEH-002 — Hidden app returns correctly

After `⌘H`:

- `⌘Tab` back to SensibleMD should restore/focus it correctly.
- clicking SensibleMD in the Dock should produce expected activation behavior.
- the correct previously active window/document state should return.
- auxiliary windows must not remain strangely visible while the main application is hidden.

## MAC-BEH-003 — Command-M minimizes

`⌘M` should minimize the active window.

Hide and minimize are not interchangeable.

## MAC-BEH-004 — Command-W follows document/window lifecycle

`⌘W` should behave like a Mac user expects.

The exact behavior depends on the final SensibleMD document/window architecture, but it must not unexpectedly:

- quit the entire application
- discard unsaved work
- leave invisible inaccessible state
- make reopening impossible

SensibleMD should support an explicit **no-document-open state**.

The app may remain open even when no document is active.

## MAC-BEH-005 — Command-Q quits

`⌘Q` should perform a normal application quit lifecycle.

Before termination:

- protect unsaved changes
- finish or safely cancel state writes
- ensure recovery state is valid
- do not silently discard work

## MAC-BEH-006 — Standard application shortcuts

At minimum evaluate:

| Shortcut | Expected meaning |
|---|---|
| `⌘O` | Open |
| `⌘S` | Save |
| `⇧⌘S` | Save As |
| `⌘W` | Close document/window |
| `⌘Q` | Quit |
| `⌘F` | Find |
| `⌘,` | Settings |
| `⌘H` | Hide SensibleMD |
| `⌥⌘H` | Hide Others |
| `⌘M` | Minimize |
| `⌘Z` | Undo |
| `⇧⌘Z` | Redo |
| `⌘X` | Cut |
| `⌘C` | Copy |
| `⌘V` | Paste |
| `⌘A` | Select All |

Use native menu roles where Electron provides them.

## MAC-BEH-007 — Native menu bar

SensibleMD should expose appropriate macOS menus rather than relying entirely on in-window web-style controls.

Expected categories may include:

```text
SensibleMD
File
Edit
View
Window
Help
```

Only include commands that genuinely exist.

## MAC-BEH-008 — Native file dialogs

Open and Save interactions should use normal macOS file dialogs.

Do not recreate file-selection UI in HTML when the OS dialog is appropriate.

## MAC-BEH-009 — Trackpad and scrolling behavior

Test:

- smooth momentum scrolling
- page mode
- spread mode
- continuous mode
- horizontal/vertical gestures if supported
- no scroll trapping
- correct scrolling in raw Markdown editor
- correct scrolling in split view

## MAC-BEH-010 — Appearance and accessibility settings

Test:

- light mode
- dark mode
- increased contrast where applicable
- reduced motion
- text scaling/zoom
- VoiceOver
- full keyboard navigation

---

# 12. Windows Standard

Windows users should not encounter a Mac-shaped application with Control substituted for Command.

SensibleMD should respect Windows interaction conventions.

## WIN-BEH-001 — Standard shortcuts

Evaluate at minimum:

| Shortcut | Expected meaning |
|---|---|
| `Ctrl+O` | Open |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+W` | Close document/window where appropriate |
| `Ctrl+F` | Find |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` or platform-appropriate redo | Redo |
| `Ctrl+X` | Cut |
| `Ctrl+C` | Copy |
| `Ctrl+V` | Paste |
| `Ctrl+A` | Select All |
| `Alt+F4` | Close window/application according to Windows convention |

## WIN-BEH-002 — Full range of input

Test all core workflows using:

- mouse
- touchpad
- keyboard
- touch where applicable
- pen where practical

Microsoft's current Windows guidance explicitly treats support for multiple input types and standard interaction behavior as expected application behavior.

## WIN-BEH-003 — Text behaves like text

Rendered text should normally allow:

- selection
- copying
- keyboard selection where appropriate
- context menu behavior where appropriate

Editable text should support expected cut/copy/paste behavior.

## WIN-BEH-004 — Resizing never makes functionality unreachable

Windows can be resized aggressively.

All commands and content required for normal operation must remain reachable through:

- responsive layout
- scrolling
- collapsible regions
- menus

Never allow controls to simply fall outside the viewport with no way to access them.

## WIN-BEH-005 — Window behavior

Test:

- maximize
- restore
- minimize
- Snap layouts / window snapping
- multiple monitor movement
- mixed-DPI monitors
- taskbar activation
- reopen after minimizing
- focus restoration

## WIN-BEH-006 — DPI scaling

Test at multiple scaling factors.

Examples:

```text
100%
125%
150%
175%
200%
```

No clipped text, unusable controls, microscopic hit targets, or broken pagination.

## WIN-BEH-007 — High contrast

SensibleMD must not assume its own color palette is always in control.

Test Windows high-contrast modes and ensure meaning is not conveyed using color alone.

## WIN-A11Y-001 — Narrator

Primary workflows must be usable with Windows Narrator.

Test at minimum:

- open document
- read document
- navigate outline
- search
- change reading mode
- enter Write mode
- edit/save
- close document
- settings

## WIN-A11Y-002 — Keyboard-only completion

A user must be able to complete every primary workflow without a pointer.

Focus must:

- be visible
- follow logical order
- not become trapped
- return sensibly after closing dialogs/popovers

Microsoft explicitly treats keyboard access as a primary interaction model rather than a secondary fallback.

---

# 13. Linux Standard

Linux does not have one universal desktop environment.

SensibleMD should target common desktop expectations rather than pretending one Linux UI standard exists.

At minimum test:

- GNOME
- KDE Plasma

Where practical, test both:

- Wayland
- X11/XWayland paths relevant to Electron

## LINUX-BEH-001 — Standard desktop shortcuts

Common shortcuts should work according to the desktop environment and application conventions.

Examples generally include:

```text
Ctrl+O
Ctrl+S
Ctrl+Shift+S
Ctrl+F
Ctrl+W
Ctrl+Q where appropriate
Ctrl+Z
Ctrl+Shift+Z or Ctrl+Y where appropriate
Ctrl+C
Ctrl+V
Ctrl+A
```

Avoid assuming macOS conventions.

## LINUX-BEH-002 — Native file chooser expectations

File opening/saving should integrate with the environment as cleanly as Electron allows.

Test on both major desktop families.

## LINUX-BEH-003 — Smooth scrolling

KDE guidance explicitly values smooth pixel-by-pixel touchpad scrolling and predictable navigation.

Test:

- mouse wheel
- touchpad
- keyboard
- continuous view
- page view
- spread view
- raw Markdown editor
- split view

## LINUX-BEH-004 — Settings apply immediately when safe

Where a setting is reversible and inexpensive, changes should normally become visible immediately.

Examples:

- font size
- line spacing
- content width
- theme
- reduced motion

A visible control that appears to do nothing is a UX defect.

## LINUX-BEH-005 — Minimize unnecessary modal dialogs

Use modal dialogs when the user must make a decision before continuing.

Do not make ordinary navigation or configuration unnecessarily modal.

## LINUX-BEH-006 — Desktop integration

Test:

- launcher entry
- application icon
- file association
- task switching
- focus restoration
- multi-monitor use
- window maximize/minimize
- system theme behavior

---

# 14. Native Behavior Rule

## NAT-001 — Use platform-native roles before custom JavaScript

When Electron provides a native role/action for standard application behavior, prefer that role.

Examples include:

- hide
- hide others
- unhide
- minimize
- zoom
- close
- quit
- undo
- redo
- cut
- copy
- paste
- select all

Custom implementations should require a reason.

This reduces the chance that SensibleMD behaves subtly differently from native applications.

---

# 15. Transient UI Standard

Menus, search boxes, filters, popovers, command palettes, and similar transient interfaces should follow predictable dismissal behavior.

Where appropriate, users should be able to close transient UI by:

- selecting an option
- clicking outside
- pressing `Escape`
- activating the trigger again
- switching relevant context

Do not require the user to manually erase text simply to dismiss a search interface.

Search query state and search UI visibility should be considered separate concepts.

---

# 16. Focus Standard

## FOCUS-001 — Visible focus

Keyboard focus must be clearly visible.

## FOCUS-002 — Logical order

Tab and arrow navigation should follow a predictable semantic order.

## FOCUS-003 — Focus restoration

When a modal, popover, command palette, search UI, or settings panel closes, focus should return to a sensible location.

Usually this is:

- the invoking control
- the document location that was active before the transient UI appeared

## FOCUS-004 — No traps

Except for intentionally modal interfaces with a valid escape path, keyboard focus must never become trapped.

---

# 17. SensibleMD-Specific Navigation Coherence

The following concepts should not behave as unrelated systems:

```text
semantic reading position
outline
active heading
pagination
scroll position
reading mode
navigation history
bookmarks
search navigation
editor location
```

Target architecture:

```text
Semantic reading position
          ↓
      navigation state
          ↓
 ┌────────┼────────┐
scroll    page    spread
          ↓
     active section
          ↓
        outline
```

The visible layout is a presentation of navigation state.

It should not independently own conflicting location state.

---

# 18. Outline Behavior

Clicking a heading in the outline should mean:

> "Take me to this section."

The effect should preserve the user's current working mode whenever possible.

## Read mode

Move the reader to the heading.

## Write mode

Move the editor viewport/cursor to the heading.

## Split mode

Move the editor and preview to the corresponding section.

Clicking the outline should **not unexpectedly force Write or Split mode into Read mode.**

---

# 19. Reading Position Continuity

One of SensibleMD's defining experiences is that the user should not have to manage their reading position manually.

The system should attempt to preserve semantic location across:

- font size changes
- line spacing changes
- content width changes
- window resize
- continuous/page/spread transitions
- search jumps and Back navigation
- application restart
- pagination reflow

The user should experience:

```text
I was reading this passage.
        ↓
layout changed.
        ↓
I am still reading this passage.
```

Not:

```text
I was 18,423 pixels down.
```

---

# 20. No-Document State

SensibleMD must eventually support an explicit state where the application is running but no document is open.

Example:

```text
SensibleMD

Open a Markdown file

Recent Documents
────────────────
README.md
architecture.md
notes.md

[ Open File ]
```

Closing a document must not require quitting the application.

This state should integrate cleanly with:

- File > Open
- recent files
- future Library
- application activation
- macOS Dock activation
- Windows taskbar activation
- Linux launchers

---

# 21. Settings Behavior

Every setting presented as functional must have an observable and persistent effect.

Expected lifecycle:

```text
change setting
      ↓
observable result
      ↓
persist
      ↓
restart
      ↓
same setting restored
```

Examples:

- font size
- line spacing
- content width
- reduced motion
- authoring checks
- reading mode where appropriate

If a feature is not implemented, do not present it as though it works.

---

# 22. Reduced Motion

A Reduce Motion option must have a defined behavioral contract.

It must not be a checkbox whose effect is unknowable.

When enabled, identify which animations/transitions are:

- removed
- shortened
- replaced by instantaneous state change

Where available, respect OS-level reduced-motion preferences automatically.

User preference may override or supplement system behavior only in a way that does not reduce accessibility.

---

# 23. Authoring Checks

Authoring diagnostics should help rather than dominate the writing experience.

Requirements:

- optional visibility
- keyboard-accessible show/hide control
- no editor performance penalty perceptible during typing
- diagnostic UI does not steal focus unexpectedly
- hiding diagnostics does not corrupt or modify Markdown
- preference can persist if appropriate

Analysis may continue in the background if inexpensive, but the user controls whether the diagnostic interface is shown.

---

# 24. Editor Behavior

The raw Markdown editor must behave like a normal editor.

At minimum:

- scrollable
- keyboard navigable
- mouse/trackpad scrollable
- expected text selection
- undo/redo
- cut/copy/paste
- find
- visible cursor
- preserved location during appropriate mode changes
- no forced switch to Read mode from outline navigation

Syntax highlighting is desirable, but fundamental editor behavior comes first.

---

# 25. Pagination UX

Pagination is a defining SensibleMD feature and therefore receives a higher quality bar than ordinary secondary features.

## PAG-001 — Correctness first

The user's page must never unexpectedly jump backward because another component holds stale navigation state.

## PAG-002 — Standard page controls

A mature page control should support:

```text
First   Previous   Page N of M   Next   Last
```

Visually this may be represented as:

```text
|<<| |<|   Page 17 of 84   |>| |>>|
```

Use accessible names such as:

```text
First page
Previous page
Next page
Last page
```

## PAG-003 — Direct page jump

Consider allowing the page number to become an editable control:

```text
Page [17] of 84
```

A user should not need to press Next dozens of times to reach a known page.

## PAG-004 — Outline synchronization

As pages change:

- current outline section should update
- current section should be visually identifiable
- screen readers should receive meaningful state without excessive announcements

---

# 26. Accessibility Standard

Accessibility is an architectural requirement.

Target baseline:

- WCAG 2.2 AA where applicable
- platform accessibility APIs/assistive technologies
- keyboard-only complete use
- meaningful semantic structure

Manual testing remains mandatory.

Automated checks alone cannot establish accessibility.

## A11Y-001 — Keyboard

Every primary workflow must be usable without a mouse.

## A11Y-002 — Screen readers

Test:

- VoiceOver on macOS
- Narrator on Windows
- Orca on Linux where appropriate

## A11Y-003 — Visual scaling

Test:

- application zoom
- system DPI scaling
- large text
- narrow windows
- reflow

## A11Y-004 — Contrast and color

- meet contrast targets
- do not communicate status using color alone
- support high contrast/system accessibility preferences where possible

## A11Y-005 — Motion

Respect reduced-motion preferences.

## A11Y-006 — Focus

Focus must be visible and understandable at all times during keyboard navigation.

---

# 27. Electron Security Baseline

Electron security is part of desktop quality.

At minimum evaluate and enforce where applicable:

- load only trusted/secure content
- disable Node integration in renderers where not required
- `contextIsolation = true`
- renderer sandboxing
- do not disable `webSecurity`
- restrictive Content Security Policy
- no insecure mixed content
- limit navigation
- limit creation of new windows
- never pass untrusted URLs directly to `shell.openExternal`
- use a current supported Electron version
- validate IPC senders
- expose the smallest possible preload/contextBridge surface
- review Electron fuses
- sanitize rendered Markdown
- avoid arbitrary remote content

SensibleMD's renderer should possess only the capabilities it actually needs.

---

# 28. IPC Principle

Treat IPC endpoints like API endpoints.

Every IPC message should answer:

1. Who is allowed to call this?
2. What capability does it grant?
3. What inputs are valid?
4. Is the sender/session authorized?
5. What filesystem scope can this affect?
6. What happens on failure?
7. Is the result safe to return to the renderer?

Never expose raw `ipcRenderer` or broad filesystem power to untrusted renderer content.

---

# 29. Filesystem Principle

The user owns their files.

SensibleMD should behave as a least-privilege client of those files.

For future Library/indexing features:

```text
OS permission
    ↓
user-authorized root
    ↓
Markdown-only policy
    ↓
metadata permission?
    ↓
content permission?
    ↓
specific operation
```

The application should never silently broaden its filesystem authority.

---

# 30. Markdown-Only Library Boundary

For future library/indexing behavior:

> SensibleMD should never intentionally enumerate, expose, index, or read a file that does not qualify as Markdown under the defined `.md` policy.

Consider case-insensitive `.md` acceptance:

```text
README.md
README.MD
```

Reject misleading names:

```text
notes.md.txt
image.md.png
```

Apply the check at multiple boundaries:

- scanner
- indexer
- library open handler
- main-process filesystem boundary

Symlinks must be canonicalized and verified so they cannot escape an authorized root.

---

# 31. Native File Integration

Eventually evaluate proper OS-level file association so users can:

```text
double-click README.md
        ↓
SensibleMD opens it
```

or choose:

```text
Open With > SensibleMD
```

without forcing the user to adopt a proprietary workspace.

---

# 32. Platform Packaging

## macOS

Public distribution should eventually include:

- Developer ID signing
- Hardened Runtime
- reviewed entitlements
- Apple notarization
- stapled notarization ticket where appropriate
- Gatekeeper validation
- signature verification

Users must never be instructed to bypass Gatekeeper for normal public installation.

## Windows

Public distribution should eventually include appropriate code signing and reputation-conscious packaging.

Test:

- installation
- upgrade
- uninstall
- file associations
- SmartScreen behavior
- clean removal of application-owned state without touching user documents

## Linux

Test appropriate packaging formats selected for support.

Possible candidates may include:

- AppImage
- `.deb`
- `.rpm`

Do not claim broad Linux support based on one distribution.

---

# 33. Platform Test Matrix

At release-candidate time, maintain evidence for supported environments.

Example:

| Area | macOS | Windows | Linux GNOME | Linux KDE |
|---|---|---|---|---|
| Launch | PASS/FAIL | PASS/FAIL | PASS/FAIL | PASS/FAIL |
| Open file | | | | |
| Save | | | | |
| Save As | | | | |
| Close document | | | | |
| No-document state | | | | |
| Search | | | | |
| Scroll | | | | |
| Page mode | | | | |
| Spread mode | | | | |
| Write | | | | |
| Split | | | | |
| Keyboard-only | | | | |
| Screen reader | | | | |
| Theme | | | | |
| Reduced motion | | | | |
| DPI/zoom | | | | |
| Native dialogs | | | | |
| Hide/minimize/task switch | | | | |
| Idle CPU | | | | |
| Memory baseline | | | | |
| Long-session memory | | | | |

`NOT TESTED` is not equivalent to `PASS`.

---

# 34. Dogfooding Standard

Dogfooding is a formal source of product requirements.

Capture raw observations before polishing them into issues.

Example:

```text
docs/dogfooding/
    2026-09-05.md
```

Raw reports such as:

> "you click the buttons a couple of times and you are jumped back"

are valuable because they describe the actual user experience rather than an implementation theory.

Each issue can later be classified as:

- data integrity
- security
- privacy
- accessibility
- HCI/usability
- UI polish
- reliability
- performance
- platform integration

---

# 35. Regression Cases Already Discovered

## PACKAGING-001 — Packaged application blank screen

**Observed:** Packaged macOS app launched to a blank white screen.

**Cause:** Vite-generated absolute asset paths did not work correctly under packaged file loading.

**Fix:** Configure Vite appropriately for packaged relative assets, e.g. `base: './'` for the current architecture.

**Regression requirement:** Packaged application must launch and render correctly with the development server completely offline.

## PACKAGING-002 — Unsigned transferred macOS development build

**Observed:** A locally packaged unsigned application transferred to another Mac may be rejected by Gatekeeper/quarantine.

**Development implication:** Local build behavior is not equivalent to distributable build behavior.

**Public release requirement:** Normal users must receive signed/notarized builds and must never be expected to remove quarantine attributes or bypass platform security controls.

---

# 36. Electron Smell Checklist

A reviewer should actively ask:

> "Did this change make SensibleMD feel more like a bad Electron app?"

Potential smells:

- startup got slower
- another spinner appeared
- idle CPU increased
- memory no longer settles
- scrolling now hitches
- typing pauses
- custom HTML dialog replaced an OS dialog without reason
- standard keyboard shortcut stopped working
- context menu feels web-like
- focus disappears
- Escape does not dismiss UI
- click-away behavior is inconsistent
- window lifecycle differs from platform expectations
- OS accessibility setting is ignored
- user must learn an unnecessary SensibleMD-specific interaction
- large state is loaded eagerly
- a heavy dependency was added for a tiny feature
- entire document reparses during every trivial interaction

Any of these may be a regression even if unit tests pass.

---

# 37. Definition of Native-Feeling

Native-feeling does **not** require using AppKit, WinUI, GTK, or Qt internally.

For SensibleMD, native-feeling means:

> **The operating-system behaviors the user already knows simply work.**

The user should not have to think about:

- how to hide/minimize the app
- how to open/save
- where focus went
- whether standard shortcuts work
- whether text can be selected
- how to close a transient UI
- whether the app respects accessibility preferences
- whether switching apps will lose state
- whether resizing the window will break controls

When these behaviors are correct, the framework becomes invisible.

---

# 38. Product-Specific Experience Goal

SensibleMD should eventually deliver this interaction:

```text
double-click manual.md

SensibleMD opens quickly
↓
restores the exact semantic place the reader stopped
↓
book/spread/continuous presentation
↓
outline follows current section
↓
user changes font size
↓
document repaginates
↓
reader remains at the same meaningful passage
↓
user searches elsewhere
↓
Back returns to previous passage
↓
user switches to Write
↓
editor opens at the corresponding section
↓
user fixes text and saves
↓
returns to reading without losing location
↓
closes document
↓
application remains usable in no-document state
↓
reopens tomorrow
↓
position is restored
```

If SensibleMD can do this fluidly on ordinary hardware while respecting platform behavior, accessibility, privacy, and filesystem ownership, the implementation technology becomes irrelevant to the user.

---

# 39. Release Question

Every significant release candidate should answer:

> **Would a Mac, Windows, or Linux user notice this is Electron because something feels wrong?**

If yes:

- identify the behavior
- determine whether Electron provides a native mechanism
- compare against platform guidance
- profile if performance-related
- fix or explicitly document the limitation

The acceptable answer is not:

> "That's just Electron."

The acceptable question is:

> "Is this actually unavoidable, or did we fail to engineer around it?"

---

# 40. Sources and Guidance

This standard combines SensibleMD-specific engineering decisions with current platform/framework guidance.

## Electron

- Electron Security Tutorial / Security Checklist  
  https://www.electronjs.org/docs/latest/tutorial/security

- Electron Menus  
  https://www.electronjs.org/docs/latest/tutorial/menus

- Electron Performance  
  https://www.electronjs.org/docs/latest/tutorial/performance

- Electron Context Bridge  
  https://www.electronjs.org/docs/latest/api/context-bridge

## Apple / macOS

- Apple Human Interface Guidelines  
  https://developer.apple.com/design/human-interface-guidelines/

- Mac keyboard shortcuts  
  https://support.apple.com/102650

- Archived Mac App Programming Guide: Common App Behaviors  
  https://developer.apple.com/library/archive/documentation/General/Conceptual/MOSXAppProgrammingGuide/CommonAppBehaviors/CommonAppBehaviors.html

Use the archived guide primarily for behavioral/design principles. Prefer current Apple documentation for implementation requirements.

## Microsoft / Windows

- Windows application development best practices  
  https://learn.microsoft.com/en-us/windows/apps/get-started/best-practices

- Windows design guidance  
  https://learn.microsoft.com/en-us/windows/apps/design/

- Keyboard accessibility  
  https://learn.microsoft.com/en-us/windows/apps/design/accessibility/keyboard-accessibility

- Accessibility in the Microsoft Store  
  https://learn.microsoft.com/en-us/windows/apps/design/accessibility/accessibility-in-the-store

- Windows accessibility development guidance  
  https://learn.microsoft.com/en-us/windows/apps/develop/accessibility

## Linux

- KDE Human Interface Guidelines  
  https://develop.kde.org/hig/

- GNOME Human Interface Guidelines  
  https://developer.gnome.org/hig/

Platform implementation should additionally consider current Electron behavior under Wayland/X11 and the packaging formats SensibleMD officially chooses to support.

---

# 41. Final Engineering Principle

> **Electron is allowed to make SensibleMD easier to build. It is not allowed to make SensibleMD worse to use.**

The goal is not to imitate native applications cosmetically.

The goal is to preserve the behaviors users already trust:

- responsiveness
- predictability
- keyboard conventions
- window lifecycle
- native dialogs
- accessibility
- system settings
- resource discipline
- safe file handling

If those are correct, users should simply experience SensibleMD as:

> **a fast, thoughtful desktop Markdown reader/editor.**

And if someone eventually reacts with:

> "Wait — this is Electron?"

that is evidence the standard is working.
