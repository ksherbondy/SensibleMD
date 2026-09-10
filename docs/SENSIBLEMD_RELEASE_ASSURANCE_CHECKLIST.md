# SensibleMD Release Assurance Checklist

**Purpose:** A release-gating checklist for SensibleMD stable builds and release candidates.

**Principle:** User safety, dignity, privacy, accessibility, data integrity, and trust take precedence over schedule, feature count, or cosmetic polish.

This checklist is intentionally strict. It is designed to be committed with each stable build so reviewers can see what was considered, what was verified, what remains open, and what evidence supports each claim.

---

## 0. How to Use This Checklist

### Status values

Use exactly one status for every applicable item:

- `[x] PASS` — verified with evidence.
- `[ ] FAIL` — requirement not met.
- `[ ] N/A` — not applicable **with a written rationale**.
- `[ ] DEFERRED` — intentionally postponed; this counts as **FAIL for a stable release** unless the item is explicitly non-blocking.
- `[ ] NOT TESTED` — unknown; this counts as **FAIL for a stable release**.

### Severity

- **BLOCKER** — release must not ship if this fails.
- **CRITICAL** — stable release must not ship without a documented, reviewed exception; exceptions should be extraordinarily rare.
- **HIGH** — normally blocks stable release.
- **MEDIUM** — should be fixed before stable release unless risk is clearly documented and accepted.
- **LOW** — improvement item; may ship with documented rationale.

### Evidence requirements

Every PASS should point to one or more of:

- automated test name / test file
- manual test record
- source file + relevant function/module
- threat-model entry
- accessibility audit record
- benchmark result
- dependency / scanner report
- release artifact hash
- code-signing / notarization verification
- issue / decision record

A checkbox without evidence is not considered verified.

### Stable release rule

A stable public build **FAILS release** if any of the following are true:

1. Any **BLOCKER** item fails, is deferred, or is untested.
2. Any unresolved known path to user-data loss or corruption exists.
3. Any known unauthorized filesystem access or privilege-boundary bypass exists.
4. Any known executable-content or Markdown-content injection path exists.
5. Any applicable WCAG 2.2 Level A or AA requirement is knowingly violated without a compelling documented reason and remediation plan.
6. Any feature necessary to open, edit, save, recover, or close a document is unusable by keyboard alone.
7. A known Critical vulnerability exists in a reachable production dependency.
8. A known High vulnerability is reachable and lacks a reviewed mitigation.
9. Public binaries are unsigned or fail platform integrity checks.
10. The build cannot be reproduced from the tagged source and documented toolchain closely enough to establish provenance.
11. Privacy claims made to users are not demonstrably true.
12. The release checklist itself is materially incomplete or contains unreviewed `NOT TESTED` items.

---

# Build Record

- **Version:**
- **Git tag:**
- **Commit SHA:**
- **Release type:** Development / Alpha / Beta / RC / Stable
- **Date:**
- **Reviewer(s):**
- **Primary implementation agent/developer:**
- **Independent reviewer:**
- **Node version:**
- **Electron version:**
- **npm version:**
- **Operating systems tested:**
- **Architectures tested:**
- **Build command:**
- **Test command:**
- **Package-lock hash:**
- **Known exceptions:**
- **Release decision:** PASS / FAIL
- **Release decision rationale:**

---

# 1. Governance, Scope, and Engineering Discipline

### GOV-001 — Release scope is explicit — HIGH
- [ ] PASS
- The features and fixes intended for this build are documented.
- No unrelated architectural change has silently entered the release.
- Evidence:

### GOV-002 — Known limitations are explicit — HIGH
- [ ] PASS
- Known defects, unsupported workflows, and intentional limitations are documented.
- No known limitation is hidden by optimistic wording.
- Evidence:

### GOV-003 — User-facing claims are truthful — BLOCKER
- [ ] PASS
- Claims such as “local,” “private,” “saved,” “recovered,” “accessible,” or “secure” match actual behavior.
- Evidence:

### GOV-004 — Significant decisions have rationale — MEDIUM
- [ ] PASS
- Security-, privacy-, persistence-, identity-, accessibility-, and architecture-sensitive choices have decision records or equivalent comments/specs.
- Evidence:

### GOV-005 — No known-risk normalization — HIGH
- [ ] PASS
- Previously discovered serious defects have not become accepted simply because they are old.
- Evidence:

### GOV-006 — Independent review occurred — HIGH
- [ ] PASS
- At least one reviewer other than the primary implementer/agent reviewed security-sensitive and data-integrity-sensitive changes.
- Evidence:

---

# 2. Architecture and Trust Boundaries

### ARC-001 — Architecture diagram is current — HIGH
- [ ] PASS
- Renderer, preload, main process, filesystem, persistence, parser, external-link handling, and build/release boundaries are represented.
- Evidence:

### ARC-002 — Trust boundaries are documented — BLOCKER
- [ ] PASS
- Every privilege transition is explicit.
- Renderer input is treated as untrusted at privileged boundaries.
- Evidence:

### ARC-003 — Authority resides in the narrowest layer — BLOCKER
- [ ] PASS
- Filesystem authority, process execution, native APIs, and persistence authority do not leak into less-trusted layers.
- Evidence:

### ARC-004 — Single source of truth for critical state — HIGH
- [ ] PASS
- Document identity, dirty state, active save target, session authority, and buffer version do not have conflicting owners.
- Evidence:

### ARC-005 — State machines exist where lifecycle complexity warrants them — HIGH
- [ ] PASS
- Open/save/save-as/reload/recovery/close flows cannot enter contradictory states through ad hoc booleans.
- Evidence:

### ARC-006 — Abstractions do not hide security authority — HIGH
- [ ] PASS
- Convenience APIs do not accidentally grant broader capabilities than their names imply.
- Evidence:

### ARC-007 — Circular dependencies reviewed — MEDIUM
- [ ] PASS
- Core modules remain acyclic or cycles are deliberate and documented.
- Evidence:

### ARC-008 — Failure ownership is clear — HIGH
- [ ] PASS
- Each layer knows whether it retries, reports, rolls back, or escalates failures.
- Evidence:

### ARC-009 — Platform assumptions are explicit — HIGH
- [ ] PASS
- Filesystem, path, case-sensitivity, line-ending, encoding, and watcher assumptions are documented and tested where applicable.
- Evidence:

---

# 3. Threat Modeling and Abuse Cases

### THR-001 — Threat model is current — BLOCKER
- [ ] PASS
- Updated for every new trust boundary, persistence path, parser capability, IPC capability, external link, updater, plugin, or network feature.
- Evidence:

### THR-002 — Assets are identified — HIGH
- [ ] PASS
- At minimum: document contents, unsaved edits, recovery snapshots, file paths, recent-file metadata, bookmarks, preferences, release keys, signing credentials.
- Evidence:

### THR-003 — Adversaries/misuse cases are considered — HIGH
- [ ] PASS
- Malicious Markdown, malicious filenames/paths, compromised renderer, malformed state, hostile external files, poisoned dependencies, malicious release artifacts.
- Evidence:

### THR-004 — STRIDE or equivalent analysis completed — HIGH
- [ ] PASS
- Spoofing, tampering, repudiation/audit concerns where relevant, information disclosure, denial of service, elevation of privilege considered.
- Evidence:

### THR-005 — Abuse-case tests exist for high-risk threats — BLOCKER
- [ ] PASS
- Important threats are converted into executable negative tests where feasible.
- Evidence:

### THR-006 — Threat-model residual risks are accepted explicitly — HIGH
- [ ] PASS
- No unresolved high-risk finding exists without owner, rationale, and remediation plan.
- Evidence:

---

# 4. Electron Security Boundary

### ELC-001 — `nodeIntegration` disabled in renderers — BLOCKER
- [ ] PASS
- Evidence:

### ELC-002 — `contextIsolation` enabled — BLOCKER
- [ ] PASS
- Evidence:

### ELC-003 — Renderer sandbox enabled — BLOCKER
- [ ] PASS
- Evidence:

### ELC-004 — `webSecurity` remains enabled — BLOCKER
- [ ] PASS
- Evidence:

### ELC-005 — Insecure content execution disabled — BLOCKER
- [ ] PASS
- Evidence:

### ELC-006 — Experimental / unnecessary Blink features disabled — HIGH
- [ ] PASS
- Evidence:

### ELC-007 — Restrictive CSP present — BLOCKER
- [ ] PASS
- Policy is compatible with the packaged application and does not rely on unsafe broad exceptions without documented justification.
- Evidence:

### ELC-008 — Navigation is restricted — BLOCKER
- [ ] PASS
- Renderer cannot navigate the main application window to arbitrary untrusted content.
- Evidence:

### ELC-009 — New-window creation is restricted — BLOCKER
- [ ] PASS
- Untrusted content cannot create privileged windows.
- Evidence:

### ELC-010 — External URL opening is validated — BLOCKER
- [ ] PASS
- `shell.openExternal` or equivalent accepts only explicitly allowed schemes and validated destinations.
- Evidence:

### ELC-011 — Every privileged IPC sender is validated — BLOCKER
- [ ] PASS
- Sender/frame/window identity and authorization are checked, not merely payload shape.
- Evidence:

### ELC-012 — Preload exposes minimum API surface — BLOCKER
- [ ] PASS
- No raw `ipcRenderer`, Node API, filesystem API, shell API, or generic invoke/send primitive is exposed.
- Evidence:

### ELC-013 — IPC payloads are schema/shape validated — BLOCKER
- [ ] PASS
- Typescript types alone are not treated as runtime validation.
- Evidence:

### ELC-014 — IPC size limits exist for attacker-controlled payloads — HIGH
- [ ] PASS
- Evidence:

### ELC-015 — Electron fuses reviewed for production hardening — HIGH
- [ ] PASS / N/A until packaging stage
- Evidence:

### ELC-016 — Current supported Electron version used — HIGH
- [ ] PASS
- No knowingly unsupported/EOL Electron runtime.
- Evidence:

### ELC-017 — `file://` exposure reviewed — HIGH
- [ ] PASS
- Custom protocol or equivalent isolation is used where it materially reduces risk, or rationale is documented.
- Evidence:

---

# 5. Filesystem and Path Security

### FS-001 — Renderer never authorizes arbitrary paths — BLOCKER
- [ ] PASS
- Privileged filesystem operations are tied to user-authorized capabilities/sessions.
- Evidence:

### FS-002 — Path traversal is rejected — BLOCKER
- [ ] PASS
- `..`, separators, encoded traversal, malformed identifiers, and alternate path forms are tested.
- Evidence:

### FS-003 — Symlink behavior is deliberate — HIGH
- [ ] PASS
- Open/save/state/recovery semantics around symlinks are specified and tested.
- Evidence:

### FS-004 — Hard-link behavior is deliberate — MEDIUM
- [ ] PASS
- Evidence:

### FS-005 — TOCTOU risks reviewed — HIGH
- [ ] PASS
- File replacement, symlink retargeting, deletion, or permission changes between authorization and I/O considered.
- Evidence:

### FS-006 — File extensions are not trusted as content validation — HIGH
- [ ] PASS
- Evidence:

### FS-007 — Device / special-file hazards considered — HIGH
- [ ] PASS
- The app does not blindly treat arbitrary special paths as normal Markdown files.
- Evidence:

### FS-008 — Case-sensitivity behavior tested — MEDIUM
- [ ] PASS
- Evidence:

### FS-009 — Unicode path behavior tested — MEDIUM
- [ ] PASS
- NFC/NFD and unusual legal filenames considered on supported platforms.
- Evidence:

### FS-010 — Permission-denied behavior is safe — HIGH
- [ ] PASS
- No data loss, misleading “saved” state, or crash.
- Evidence:

---

# 6. Document Identity and Session Authority

### ID-001 — Stable and ephemeral identities are distinct — HIGH
- [ ] PASS
- Evidence:

### ID-002 — Persistent state keys only stable document identity — BLOCKER
- [ ] PASS
- Session IDs are never persisted as durable identity.
- Evidence:

### ID-003 — Same-named files cannot collide — BLOCKER
- [ ] PASS
- Evidence:

### ID-004 — Collection order cannot redefine identity — BLOCKER
- [ ] PASS
- Evidence:

### ID-005 — Identity derivation is locale-independent where persistence depends on it — HIGH
- [ ] PASS
- Evidence:

### ID-006 — Identity format is safe as a persistence filename component — BLOCKER
- [ ] PASS
- Evidence:

### ID-007 — Rename/move semantics are tested and documented — HIGH
- [ ] PASS
- Evidence:

### ID-008 — Session authorization prevents cross-document state access — BLOCKER
- [ ] PASS
- Evidence:

### ID-009 — Stale session cannot mutate a newly opened document — BLOCKER
- [ ] PASS
- Evidence:

### ID-010 — Multi-window identity/session isolation tested — HIGH
- [ ] PASS / N/A if multi-window is impossible by design
- Evidence:

---

# 7. Markdown and Untrusted Content Security

### MD-001 — Markdown is treated as hostile input — BLOCKER
- [ ] PASS
- Evidence:

### MD-002 — Rendered HTML is sanitized — BLOCKER
- [ ] PASS
- Evidence:

### MD-003 — Raw HTML behavior is explicitly defined — BLOCKER
- [ ] PASS
- Evidence:

### MD-004 — `javascript:` / dangerous schemes rejected — BLOCKER
- [ ] PASS
- Includes case, whitespace, encoding, control-character, and parser-normalization bypass attempts.
- Evidence:

### MD-005 — `file:` navigation is restricted — BLOCKER
- [ ] PASS
- Evidence:

### MD-006 — Protocol-relative and custom schemes reviewed — HIGH
- [ ] PASS
- Evidence:

### MD-007 — Image/resource loading cannot silently exfiltrate local content — BLOCKER
- [ ] PASS
- Remote-resource privacy behavior is explicit.
- Evidence:

### MD-008 — Malformed Markdown cannot crash the app — HIGH
- [ ] PASS
- Evidence:

### MD-009 — Pathological Markdown has bounded resource behavior — HIGH
- [ ] PASS
- Deep nesting, huge lines, giant tables, repeated links, and parser stress inputs tested.
- Evidence:

### MD-010 — Link resolution never escapes intended collection/file scope — BLOCKER
- [ ] PASS
- Evidence:

---

# 8. Privacy and Local-First Guarantees

### PRIV-001 — Data inventory exists — BLOCKER
- [ ] PASS
- Every stored, transmitted, logged, cached, or copied user-data category is listed.
- Evidence:

### PRIV-002 — Local-first claim is technically true — BLOCKER
- [ ] PASS
- Document content is not transmitted unless the user invokes an explicitly networked feature.
- Evidence:

### PRIV-003 — No hidden telemetry — BLOCKER
- [ ] PASS
- No analytics, crash reporting, dependency telemetry, remote fonts, or third-party calls occur without deliberate review and disclosure.
- Evidence:

### PRIV-004 — Network behavior inventory is complete — BLOCKER
- [ ] PASS
- Production build network requests are measured/inspected.
- Evidence:

### PRIV-005 — Data minimization applied — HIGH
- [ ] PASS
- Store only what is necessary and for only as long as useful.
- Evidence:

### PRIV-006 — Recent-file metadata is justified and controllable — HIGH
- [ ] PASS
- Evidence:

### PRIV-007 — Local paths are not exposed unnecessarily — HIGH
- [ ] PASS
- Renderer/UI/logs/crash reports do not reveal full paths without need.
- Evidence:

### PRIV-008 — Recovery snapshots are documented and bounded — HIGH
- [ ] PASS
- Location, retention, cleanup, sensitivity, and behavior are known.
- Evidence:

### PRIV-009 — Clipboard use is explicit — MEDIUM
- [ ] PASS
- No background clipboard reads; copied content is user-initiated.
- Evidence:

### PRIV-010 — Privacy notice matches implementation — BLOCKER
- [ ] PASS / N/A before public distribution
- Evidence:

### PRIV-011 — Removal/uninstall expectations documented — MEDIUM
- [ ] PASS
- Users can understand what local state remains after uninstall and how to remove it.
- Evidence:

### PRIV-012 — Future network features require separate privacy review — HIGH
- [ ] PASS
- Update checks, cloud AI, sync, telemetry, link previews, or remote content cannot be added without updating the privacy model.
- Evidence:

---

# 9. User Data Integrity and Save Safety

### DATA-001 — No known user-data-loss path — BLOCKER
- [ ] PASS
- Evidence:

### DATA-002 — Save state machine is explicit — BLOCKER
- [ ] PASS
- Unsaved, saving, saved, save-failed, externally-changed, recovered, save-as, and closing states behave coherently.
- Evidence:

### DATA-003 — Atomic save strategy is verified — BLOCKER
- [ ] PASS
- Interrupted writes cannot replace the last valid document with partial content.
- Evidence:

### DATA-004 — Concurrent/overlapping saves are safe — BLOCKER
- [ ] PASS
- Evidence:

### DATA-005 — Save failure never clears dirty state — BLOCKER
- [ ] PASS
- Evidence:

### DATA-006 — UI never reports “saved” before durable success — BLOCKER
- [ ] PASS
- Evidence:

### DATA-007 — Save As rebinds future saves correctly — BLOCKER
- [ ] PASS
- Evidence:

### DATA-008 — Cancelled Save As leaves prior state intact — HIGH
- [ ] PASS
- Evidence:

### DATA-009 — Disk-full behavior tested — BLOCKER
- [ ] PASS
- Evidence:

### DATA-010 — Read-only destination behavior tested — HIGH
- [ ] PASS
- Evidence:

### DATA-011 — File deleted externally while open — HIGH
- [ ] PASS
- Behavior is safe and understandable.
- Evidence:

### DATA-012 — File renamed/moved externally while open — HIGH
- [ ] PASS
- Evidence:

### DATA-013 — External modification conflict policy is explicit — BLOCKER
- [ ] PASS
- Local unsaved work is never silently overwritten.
- Evidence:

### DATA-014 — File watcher survives app-originated atomic replacement — HIGH
- [ ] PASS
- Verified on each supported platform.
- Evidence:

### DATA-015 — Crash recovery does not overwrite authoritative disk state silently — BLOCKER
- [ ] PASS
- Evidence:

### DATA-016 — Recovery versioning prevents stale recovery from winning — BLOCKER
- [ ] PASS
- Evidence:

### DATA-017 — Recovery corruption is handled safely — HIGH
- [ ] PASS
- Evidence:

### DATA-018 — Migration preserves previous user state — BLOCKER
- [ ] PASS
- Evidence:

### DATA-019 — Migration interruption/retry tested — BLOCKER
- [ ] PASS
- Partial migration cannot destroy or permanently strand user data.
- Evidence:

### DATA-020 — Downgrade behavior documented — MEDIUM
- [ ] PASS
- Evidence:

### DATA-021 — Line endings preserved or behavior documented — MEDIUM
- [ ] PASS
- CRLF/LF changes do not occur unexpectedly.
- Evidence:

### DATA-022 — Encoding/BOM behavior documented and tested — HIGH
- [ ] PASS
- Evidence:

### DATA-023 — Very large files cannot cause accidental truncation — BLOCKER
- [ ] PASS
- Evidence:

---

# 10. Buffer, Transactions, Undo/Redo, and Editing Correctness

### EDIT-001 — Stale edits are rejected — BLOCKER
- [ ] PASS
- Evidence:

### EDIT-002 — Edit ranges are validated — BLOCKER
- [ ] PASS
- Evidence:

### EDIT-003 — Dirty state derives from authoritative version state — HIGH
- [ ] PASS
- Evidence:

### EDIT-004 — Programmatic changes do not accidentally masquerade as user edits — HIGH
- [ ] PASS
- Evidence:

### EDIT-005 — Undo/redo preserves source exactly — BLOCKER
- [ ] PASS / N/A until feature exists
- Evidence:

### EDIT-006 — Structural commands cannot corrupt unrelated source — BLOCKER
- [ ] PASS
- Evidence:

### EDIT-007 — Selection/caret behavior after programmatic edits is predictable — MEDIUM
- [ ] PASS
- Evidence:

### EDIT-008 — Editor and rendered view remain source-consistent — HIGH
- [ ] PASS
- Evidence:

---

# 11. Accessibility — WCAG 2.2 AA Baseline

**Policy:** WCAG 2.2 Level AA is the minimum public-release target where applicable. WCAG conformance is a floor, not the complete accessibility standard for SensibleMD.

### A11Y-001 — Automated accessibility scan clean of serious findings — HIGH
- [ ] PASS
- Automated tooling is supplementary, not sufficient.
- Evidence:

### A11Y-002 — Keyboard-only operation of all functionality — BLOCKER
- [ ] PASS
- Open, edit, save, search, command palette, settings, bookmarks, diagnostics, navigation, pagination, dialogs/popovers.
- Evidence:

### A11Y-003 — No keyboard trap — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-004 — Logical focus order — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-005 — Focus is visible — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-006 — Focus is not obscured — BLOCKER
- [ ] PASS
- Sticky toolbars, overlays, dialogs, and panels do not hide the focused element.
- Evidence:

### A11Y-007 — Focus restoration after transient UI — HIGH
- [ ] PASS
- Closing command palette/settings/dialog restores sensible focus.
- Evidence:

### A11Y-008 — Programmatic navigation communicates destination — BLOCKER
- [ ] PASS
- Screen-reader and keyboard users can determine where navigation landed.
- Evidence:

### A11Y-009 — Native HTML semantics preferred — HIGH
- [ ] PASS
- ARIA is added only when native semantics are insufficient.
- Evidence:

### A11Y-010 — Accessible names exist for all controls — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-011 — Names, roles, values, and states are exposed correctly — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-012 — Headings/landmarks describe application structure — HIGH
- [ ] PASS
- Evidence:

### A11Y-013 — Dialog/popover patterns follow APG expectations — BLOCKER
- [ ] PASS
- Focus entry, containment where appropriate, Escape behavior, labeling, dismissal.
- Evidence:

### A11Y-014 — Command palette behavior is screen-reader usable — BLOCKER
- [ ] PASS
- Results, selection, enabled/disabled state, keyboard interaction, announcements.
- Evidence:

### A11Y-015 — Search results are announced meaningfully — HIGH
- [ ] PASS
- Evidence:

### A11Y-016 — Save/error/recovery status changes are announced — BLOCKER
- [ ] PASS
- Important asynchronous status is not conveyed visually only.
- Evidence:

### A11Y-017 — Errors provide corrective guidance — HIGH
- [ ] PASS
- Evidence:

### A11Y-018 — Color is not the sole information carrier — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-019 — Text contrast meets WCAG AA — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-020 — Non-text UI contrast meets applicable WCAG criteria — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-021 — 200% zoom remains functional — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-022 — Reflow at narrow equivalent viewport is functional — BLOCKER
- [ ] PASS
- No essential two-dimensional scrolling except where content inherently requires it.
- Evidence:

### A11Y-023 — 400% zoom manual test performed — HIGH
- [ ] PASS
- Evidence:

### A11Y-024 — Text spacing overrides do not destroy content/function — HIGH
- [ ] PASS
- Evidence:

### A11Y-025 — Target sizes meet applicable WCAG 2.2 AA requirement — HIGH
- [ ] PASS
- Evidence:

### A11Y-026 — Dragging is never the sole input mechanism — HIGH
- [ ] PASS / N/A
- Evidence:

### A11Y-027 — Reduced-motion preference is respected — HIGH
- [ ] PASS
- Evidence:

### A11Y-028 — Motion/animation does not trigger avoidable vestibular issues — HIGH
- [ ] PASS
- Evidence:

### A11Y-029 — System high-contrast / forced-colors behavior checked — HIGH
- [ ] PASS
- Evidence:

### A11Y-030 — Screen-reader manual test: macOS VoiceOver — BLOCKER for macOS stable
- [ ] PASS
- Evidence:

### A11Y-031 — Screen-reader manual test: Windows NVDA — BLOCKER for Windows stable
- [ ] PASS
- Evidence:

### A11Y-032 — Screen-reader manual test: Narrator — HIGH for Windows stable
- [ ] PASS
- Evidence:

### A11Y-033 — Screen-reader manual test: Linux AT where supported — HIGH for Linux stable
- [ ] PASS
- Evidence:

### A11Y-034 — Semantic Markdown navigation is understandable nonvisually — BLOCKER
- [ ] PASS
- Heading, paragraph, link, image, table, and code navigation have clear context.
- Evidence:

### A11Y-035 — Pagination does not create inaccessible reading-order behavior — BLOCKER
- [ ] PASS
- Evidence:

### A11Y-036 — Two-page/spread mode has coherent accessibility semantics — HIGH
- [ ] PASS
- Evidence:

### A11Y-037 — Accessibility diagnostics themselves are accessible — BLOCKER
- [ ] PASS
- Findings can be navigated, understood, filtered, and acted upon with assistive technology.
- Evidence:

### A11Y-038 — Accessibility diagnostics avoid false certainty — HIGH
- [ ] PASS
- Intent-dependent issues are labeled appropriately; automated advice does not claim conformance.
- Evidence:

### A11Y-039 — WCAG-EM evaluation completed for release candidate — BLOCKER for public stable
- [ ] PASS
- Scope, representative states/workflows, findings, and evaluator record stored.
- Evidence:

### A11Y-040 — Users with disabilities involved before public stable release — HIGH
- [ ] PASS
- At least representative usability feedback is obtained; automation is not treated as user testing.
- Evidence:

---

# 12. HCI and Usability

### HCI-001 — System status is visible — HIGH
- [ ] PASS
- Open/save/saving/error/recovery/external-change state is understandable.
- Evidence:

### HCI-002 — No false-success messaging — BLOCKER
- [ ] PASS
- Evidence:

### HCI-003 — Destructive actions require sufficient friction — BLOCKER
- [ ] PASS
- Closing/discarding/replacing unsaved work cannot happen accidentally.
- Evidence:

### HCI-004 — Recovery path is obvious — HIGH
- [ ] PASS
- Evidence:

### HCI-005 — Error messages are human-readable — HIGH
- [ ] PASS
- Explain what happened, impact, and next action without exposing unnecessary internals.
- Evidence:

### HCI-006 — User control and freedom preserved — HIGH
- [ ] PASS
- Cancel/back/undo/close affordances exist where expected.
- Evidence:

### HCI-007 — Modes are visible — HIGH
- [ ] PASS
- Read/write/split/pagination modes do not create hidden modal state.
- Evidence:

### HCI-008 — Keyboard shortcuts do not conflict dangerously with platform conventions — HIGH
- [ ] PASS
- Evidence:

### HCI-009 — Preferences behave consistently — MEDIUM
- [ ] PASS
- Evidence:

### HCI-010 — Default settings are safe and readable — HIGH
- [ ] PASS
- Evidence:

### HCI-011 — Progressive disclosure is used where complexity would overwhelm — MEDIUM
- [ ] PASS
- Evidence:

### HCI-012 — Empty/error/loading states are designed — HIGH
- [ ] PASS
- Evidence:

### HCI-013 — Long operations provide feedback — HIGH
- [ ] PASS
- Evidence:

### HCI-014 — User is warned before unusually risky operations — HIGH
- [ ] PASS
- Evidence:

### HCI-015 — First-run experience does not mislead — HIGH
- [ ] PASS
- Sample content is clearly distinct from user content.
- Evidence:

### HCI-016 — Recent-file behavior is predictable — MEDIUM
- [ ] PASS
- Missing/renamed files fail gracefully.
- Evidence:

### HCI-017 — Search navigation has a recoverable origin — HIGH
- [ ] PASS
- Evidence:

### HCI-018 — Usability test performed with novice users — HIGH before public stable
- [ ] PASS
- Evidence:

### HCI-019 — Usability test performed with keyboard-heavy/power users — MEDIUM
- [ ] PASS
- Evidence:

### HCI-020 — Major workflows tested without developer explanation — HIGH
- [ ] PASS
- If the user needs the developer to explain a basic flow, the UI is not done.
- Evidence:

---

# 13. Visual/UI Quality

### UI-001 — Visual hierarchy is consistent — MEDIUM
- [ ] PASS
- Evidence:

### UI-002 — Interactive affordances are recognizable — HIGH
- [ ] PASS
- Evidence:

### UI-003 — Disabled states are distinguishable without becoming unreadable — HIGH
- [ ] PASS
- Evidence:

### UI-004 — Focus, hover, selected, active, error states are distinct — HIGH
- [ ] PASS
- Evidence:

### UI-005 — Layout survives supported window-size extremes — HIGH
- [ ] PASS
- Evidence:

### UI-006 — Long filenames/titles do not break layout — MEDIUM
- [ ] PASS
- Evidence:

### UI-007 — Large font settings do not clip controls — HIGH
- [ ] PASS
- Evidence:

### UI-008 — Tables/code/images have sensible overflow behavior — HIGH
- [ ] PASS
- Evidence:

### UI-009 — Reader typography remains legible across modes — MEDIUM
- [ ] PASS
- Evidence:

### UI-010 — Dark/light/system appearance reviewed if supported — MEDIUM
- [ ] PASS / N/A
- Evidence:

### UI-011 — Platform-native expectations respected where appropriate — MEDIUM
- [ ] PASS
- Evidence:

### UI-012 — Visual regression review performed — MEDIUM
- [ ] PASS
- Evidence:

---

# 14. Reliability and Resilience

### REL-001 — Unhandled promise rejections are prevented/observed — HIGH
- [ ] PASS
- Evidence:

### REL-002 — Unexpected exceptions do not silently destroy work — BLOCKER
- [ ] PASS
- Evidence:

### REL-003 — Startup with corrupt preferences/state is safe — HIGH
- [ ] PASS
- Evidence:

### REL-004 — Startup with missing state directories is safe — HIGH
- [ ] PASS
- Evidence:

### REL-005 — Shutdown during pending persistence is defined — BLOCKER
- [ ] PASS
- Evidence:

### REL-006 — Multiple rapid open/close operations tested — HIGH
- [ ] PASS
- Evidence:

### REL-007 — Repeated save cycles tested — HIGH
- [ ] PASS
- Evidence:

### REL-008 — Long-duration editing session tested — HIGH
- [ ] PASS
- No runaway memory/listener/timer growth.
- Evidence:

### REL-009 — File watcher cleanup verified — HIGH
- [ ] PASS
- Evidence:

### REL-010 — Subscriptions/listeners clean up on document/window lifecycle — HIGH
- [ ] PASS
- Evidence:

### REL-011 — Race-sensitive flows have deterministic tests where feasible — HIGH
- [ ] PASS
- Evidence:

### REL-012 — Resource exhaustion behavior considered — HIGH
- [ ] PASS
- Memory, disk, giant input, large collections.
- Evidence:

### REL-013 — App recovers from malformed local JSON/state — HIGH
- [ ] PASS
- Evidence:

### REL-014 — No infinite retry loops — HIGH
- [ ] PASS
- Evidence:

### REL-015 — Recovery/migration operations are idempotent where intended — HIGH
- [ ] PASS
- Evidence:

---

# 15. Performance and Responsiveness

### PERF-001 — Performance budgets are defined — HIGH
- [ ] PASS
- Startup, open, search, typing latency, page navigation, memory.
- Evidence:

### PERF-002 — Typing remains responsive on target document sizes — BLOCKER
- [ ] PASS
- Evidence:

### PERF-003 — Search remains responsive on target collection sizes — HIGH
- [ ] PASS
- Evidence:

### PERF-004 — Pagination does not block interaction excessively — HIGH
- [ ] PASS
- Evidence:

### PERF-005 — Semantic parsing is measured on large documents — HIGH
- [ ] PASS
- Evidence:

### PERF-006 — Accessibility diagnostics do not cause unacceptable typing lag — HIGH
- [ ] PASS
- Evidence:

### PERF-007 — Memory use is bounded during long sessions — HIGH
- [ ] PASS
- Evidence:

### PERF-008 — No accidental O(n²+) hotspot in common document workflows without justification — MEDIUM
- [ ] PASS
- Evidence:

### PERF-009 — Performance regressions are compared to baseline — MEDIUM
- [ ] PASS
- Evidence:

---

# 16. Testing Strategy and Coverage

### TEST-001 — Test pyramid/portfolio is explicit — HIGH
- [ ] PASS
- Unit, integration, boundary, regression corpus, end-to-end/manual.
- Evidence:

### TEST-002 — Critical invariants have executable tests — BLOCKER
- [ ] PASS
- Evidence:

### TEST-003 — Tests verify behavior, not incidental implementation shape — HIGH
- [ ] PASS
- Evidence:

### TEST-004 — Negative tests exist — BLOCKER
- [ ] PASS
- Invalid input, stale transactions, denied permissions, malicious Markdown, bad IDs, malformed state.
- Evidence:

### TEST-005 — Boundary tests cover IPC contract — BLOCKER
- [ ] PASS
- Real preload/main contract and test doubles remain aligned.
- Evidence:

### TEST-006 — Security regression corpus exists — BLOCKER
- [ ] PASS
- Evidence:

### TEST-007 — Accessibility regression checks exist — HIGH
- [ ] PASS
- Evidence:

### TEST-008 — Malformed Markdown corpus exists — HIGH
- [ ] PASS
- Evidence:

### TEST-009 — Large/performance corpus exists — HIGH
- [ ] PASS
- Evidence:

### TEST-010 — Filesystem matrix tests exist — HIGH
- [ ] PASS
- Rename, move, symlink, hard link, case sensitivity, permissions, deletion, external modification.
- Evidence:

### TEST-011 — Migration tests include interrupted/partial scenarios — BLOCKER
- [ ] PASS
- Evidence:

### TEST-012 — Save/recovery tests include failure injection — BLOCKER
- [ ] PASS
- Evidence:

### TEST-013 — Tests are deterministic — HIGH
- [ ] PASS
- Flaky tests are treated as defects, not retried into green.
- Evidence:

### TEST-014 — Test isolation prevents user machine corruption — BLOCKER
- [ ] PASS
- Filesystem tests use temporary isolated directories.
- Evidence:

### TEST-015 — Coverage gaps in critical code are reviewed manually — HIGH
- [ ] PASS
- Evidence:

### TEST-016 — Coverage percentage is not treated as proof of quality — MEDIUM
- [ ] PASS
- Evidence:

### TEST-017 — Fresh checkout test passes — BLOCKER
- [ ] PASS
- Clone/tag → install → test → build succeeds with documented prerequisites.
- Evidence:

### TEST-018 — Production packaged build is tested, not just dev server — BLOCKER
- [ ] PASS
- Evidence:

---

# 17. Static Analysis, Linting, and Code Quality

### CODE-001 — TypeScript build clean — HIGH
- [ ] PASS
- Evidence:

### CODE-002 — Lint clean or all exceptions documented — HIGH
- [ ] PASS
- Evidence:

### CODE-003 — Dead/unreachable code reviewed — MEDIUM
- [ ] PASS
- Evidence:

### CODE-004 — Debug logging removed or sanitized — HIGH
- [ ] PASS
- Evidence:

### CODE-005 — No secrets/credentials in repository — BLOCKER
- [ ] PASS
- Evidence:

### CODE-006 — No broad `any`/type assertions hiding critical trust-boundary validation — HIGH
- [ ] PASS
- Evidence:

### CODE-007 — Runtime validation exists where compile-time typing is insufficient — BLOCKER
- [ ] PASS
- Evidence:

### CODE-008 — Security-sensitive code is readable enough for review — HIGH
- [ ] PASS
- Cleverness does not obscure authority, validation, or failure behavior.
- Evidence:

### CODE-009 — Functions/modules have coherent responsibilities — MEDIUM
- [ ] PASS
- Evidence:

### CODE-010 — Comments explain why, not stale implementation trivia — MEDIUM
- [ ] PASS
- Evidence:

---

# 18. Dependency and Third-Party Governance

### DEP-001 — Production dependencies are inventoried — BLOCKER
- [ ] PASS
- Evidence:

### DEP-002 — Every production dependency has a reason to exist — HIGH
- [ ] PASS
- Evidence:

### DEP-003 — Unused dependencies removed — HIGH
- [ ] PASS
- Evidence:

### DEP-004 — Lockfile committed and reviewed — BLOCKER
- [ ] PASS
- Evidence:

### DEP-005 — Known-vulnerability scan performed — BLOCKER
- [ ] PASS
- Evidence:

### DEP-006 — Critical reachable vulnerability count is zero — BLOCKER
- [ ] PASS
- Evidence:

### DEP-007 — High reachable vulnerabilities resolved or formally mitigated — BLOCKER
- [ ] PASS
- Evidence:

### DEP-008 — Transitive dependency risk reviewed for high-impact packages — HIGH
- [ ] PASS
- Evidence:

### DEP-009 — Install scripts reviewed/minimized — HIGH
- [ ] PASS
- Evidence:

### DEP-010 — Dependency source/provenance anomalies investigated — HIGH
- [ ] PASS
- Typosquatting, maintainer change, unexpected package replacement, suspicious version jump.
- Evidence:

### DEP-011 — License compatibility reviewed — HIGH
- [ ] PASS
- Evidence:

### DEP-012 — Bundled fonts/images/assets have clear licenses — HIGH
- [ ] PASS
- Evidence:

### DEP-013 — Dependency updates are tested rather than blindly merged — HIGH
- [ ] PASS
- Evidence:

---

# 19. Open-Source Repository Security

### OSS-001 — SECURITY.md exists — HIGH before public stable
- [ ] PASS
- Private vulnerability-reporting path is documented.
- Evidence:

### OSS-002 — CONTRIBUTING.md exists — MEDIUM
- [ ] PASS
- Evidence:

### OSS-003 — Code of Conduct exists if community contributions are accepted — LOW
- [ ] PASS / N/A
- Evidence:

### OSS-004 — Branch protection configured — HIGH once GitHub workflow begins
- [ ] PASS / N/A for current phase
- Evidence:

### OSS-005 — Required review before protected-branch merge — HIGH
- [ ] PASS / N/A
- Evidence:

### OSS-006 — CI workflow permissions use least privilege — BLOCKER once CI exists
- [ ] PASS / N/A
- Evidence:

### OSS-007 — Third-party GitHub Actions pinned appropriately — HIGH
- [ ] PASS / N/A
- Evidence:

### OSS-008 — Secret scanning enabled — BLOCKER once public release automation exists
- [ ] PASS / N/A
- Evidence:

### OSS-009 — Dependency update automation configured carefully — MEDIUM
- [ ] PASS / N/A
- Evidence:

### OSS-010 — OpenSSF Scorecard reviewed — HIGH before public stable
- [ ] PASS
- Score is not treated as proof; individual findings are triaged.
- Evidence:

### OSS-011 — OpenSSF Best Practices Badge criteria reviewed — MEDIUM
- [ ] PASS
- Evidence:

### OSS-012 — Repository contains no generated sensitive artifacts — BLOCKER
- [ ] PASS
- Signing keys, credentials, private certificates, real user documents absent.
- Evidence:

---

# 20. Supply Chain, Build Provenance, and SBOM

### SUP-001 — Build inputs are version-pinned where practical — HIGH
- [ ] PASS
- Evidence:

### SUP-002 — Build process is documented — BLOCKER
- [ ] PASS
- Evidence:

### SUP-003 — Build provenance is recorded — HIGH before public binary distribution
- [ ] PASS
- Commit, environment/toolchain, workflow/job, artifact hashes.
- Evidence:

### SUP-004 — SBOM produced for public binaries — BLOCKER before public stable binaries
- [ ] PASS
- Evidence:

### SUP-005 — SBOM corresponds to actual release artifact — BLOCKER
- [ ] PASS
- Evidence:

### SUP-006 — Release artifact hashes published — BLOCKER
- [ ] PASS
- SHA-256 or stronger conventional release digest.
- Evidence:

### SUP-007 — SLSA posture assessed — HIGH
- [ ] PASS
- Target level/track and gaps documented; do not claim a SLSA level without meeting it.
- Evidence:

### SUP-008 — Build environment compromise risks considered — HIGH
- [ ] PASS
- Evidence:

### SUP-009 — Release credentials isolated from normal development — BLOCKER
- [ ] PASS before public binary signing
- Evidence:

### SUP-010 — Release keys/certificates have revocation/recovery plan — BLOCKER
- [ ] PASS before public binary signing
- Evidence:

---

# 21. CI/CD Gates (Future, but Required Before Mature Stable Distribution)

### CICD-001 — CI runs on every pull request — HIGH
- [ ] PASS / N/A current phase
- Evidence:

### CICD-002 — CI runs typecheck, lint, tests, security checks, and build — BLOCKER once CI is authoritative
- [ ] PASS / N/A
- Evidence:

### CICD-003 — Release builds originate from protected tags/branches — BLOCKER
- [ ] PASS / N/A
- Evidence:

### CICD-004 — Release cannot proceed after failed required check — BLOCKER
- [ ] PASS / N/A
- Evidence:

### CICD-005 — CI cannot expose signing secrets to untrusted pull requests — BLOCKER
- [ ] PASS / N/A
- Evidence:

### CICD-006 — CI dependencies/actions are pinned and reviewed — HIGH
- [ ] PASS / N/A
- Evidence:

### CICD-007 — Artifact retention policy defined — MEDIUM
- [ ] PASS / N/A
- Evidence:

### CICD-008 — Release workflow is auditable — HIGH
- [ ] PASS / N/A
- Evidence:

---

# 22. Cross-Platform Verification

### PLAT-001 — macOS supported-version matrix documented — HIGH
- [ ] PASS
- Evidence:

### PLAT-002 — Windows supported-version matrix documented — HIGH
- [ ] PASS
- Evidence:

### PLAT-003 — Linux supported-distribution expectations documented — HIGH
- [ ] PASS
- Evidence:

### PLAT-004 — Apple Silicon tested — BLOCKER for macOS Apple Silicon distribution
- [ ] PASS
- Evidence:

### PLAT-005 — Intel/x64 behavior tested or unsupported explicitly — HIGH
- [ ] PASS / N/A
- Evidence:

### PLAT-006 — Windows x64 tested — BLOCKER for Windows x64 distribution
- [ ] PASS
- Evidence:

### PLAT-007 — Linux target architecture tested — BLOCKER for that distributed target
- [ ] PASS
- Evidence:

### PLAT-008 — Filesystem semantic differences tested — HIGH
- [ ] PASS
- Evidence:

### PLAT-009 — Native dialogs behave correctly per platform — MEDIUM
- [ ] PASS
- Evidence:

### PLAT-010 — Keyboard shortcut labeling reflects platform — MEDIUM
- [ ] PASS
- Evidence:

---

# 23. Packaging and Public Binary Distribution

### PKG-001 — Packaged application contains only intended files — BLOCKER
- [ ] PASS
- No source secrets, test fixtures containing sensitive data, debug files, local paths, signing material.
- Evidence:

### PKG-002 — Production devtools policy is deliberate — HIGH
- [ ] PASS
- Evidence:

### PKG-003 — Production sourcemap policy reviewed — HIGH
- [ ] PASS
- Evidence:

### PKG-004 — App identity/bundle IDs are stable — HIGH
- [ ] PASS
- Evidence:

### PKG-005 — Upgrade path tested from previous public version — BLOCKER
- [ ] PASS
- Evidence:

### PKG-006 — Fresh install tested on clean machine/account — BLOCKER
- [ ] PASS
- Evidence:

### PKG-007 — Uninstall tested — HIGH
- [ ] PASS
- Evidence:

### PKG-008 — No privilege escalation/admin requirement without necessity — BLOCKER
- [ ] PASS
- Evidence:

---

# 24. macOS Release Security

### MAC-001 — Developer ID signing valid — BLOCKER for public macOS binary
- [ ] PASS
- Evidence:

### MAC-002 — Hardened Runtime enabled — BLOCKER
- [ ] PASS
- Evidence:

### MAC-003 — Entitlements minimized and reviewed — BLOCKER
- [ ] PASS
- Evidence:

### MAC-004 — `get-task-allow` absent in production — BLOCKER
- [ ] PASS
- Evidence:

### MAC-005 — Secure timestamp present — BLOCKER
- [ ] PASS
- Evidence:

### MAC-006 — Apple notarization succeeds — BLOCKER
- [ ] PASS
- Evidence:

### MAC-007 — Notarization ticket stapled where appropriate — HIGH
- [ ] PASS
- Evidence:

### MAC-008 — Gatekeeper assessment tested on clean machine — BLOCKER
- [ ] PASS
- Evidence:

### MAC-009 — Code signature recursively verified — BLOCKER
- [ ] PASS
- Evidence:

### MAC-010 — Notary log reviewed for warnings — HIGH
- [ ] PASS
- Evidence:

---

# 25. Windows Release Security

### WIN-001 — Installer/executable is Authenticode signed or distributed via trusted Store path — BLOCKER for public Windows binary
- [ ] PASS
- Evidence:

### WIN-002 — Signature verifies on clean Windows installation — BLOCKER
- [ ] PASS
- Evidence:

### WIN-003 — Installer does not request unnecessary elevation — BLOCKER
- [ ] PASS
- Evidence:

### WIN-004 — SmartScreen/reputation behavior documented — HIGH
- [ ] PASS
- Evidence:

### WIN-005 — Install/update/uninstall path tested — BLOCKER
- [ ] PASS
- Evidence:

### WIN-006 — Program files and user-data locations use appropriate Windows conventions — HIGH
- [ ] PASS
- Evidence:

---

# 26. Linux Distribution Security

### LNX-001 — Distribution format(s) and supported environments documented — HIGH
- [ ] PASS
- Evidence:

### LNX-002 — Package/artifact integrity verification available — BLOCKER
- [ ] PASS
- Evidence:

### LNX-003 — Desktop integration does not require unnecessary privileges — BLOCKER
- [ ] PASS
- Evidence:

### LNX-004 — Sandbox/runtime limitations documented — HIGH
- [ ] PASS
- Evidence:

### LNX-005 — Major target desktop environment behavior tested — HIGH
- [ ] PASS
- Evidence:

---

# 27. Update Mechanism (Only When Added)

### UPD-001 — No updater exists until explicitly threat-modeled — BLOCKER
- [ ] PASS / N/A
- Evidence:

### UPD-002 — Update metadata and binaries are authenticated — BLOCKER
- [ ] PASS / N/A
- Evidence:

### UPD-003 — Rollback/downgrade attack considered — BLOCKER
- [ ] PASS / N/A
- Evidence:

### UPD-004 — Failed update preserves runnable prior version — BLOCKER
- [ ] PASS / N/A
- Evidence:

### UPD-005 — Update does not silently expand data collection/network behavior — BLOCKER
- [ ] PASS / N/A
- Evidence:

---

# 28. Accessibility Authoring Feature Integrity

### AXAUTH-001 — Diagnostics are heuristics, not conformance claims — BLOCKER
- [ ] PASS
- Evidence:

### AXAUTH-002 — Severity/confidence terminology is defensible — HIGH
- [ ] PASS
- Evidence:

### AXAUTH-003 — Diagnostic explanations avoid misleading absolute language — HIGH
- [ ] PASS
- Evidence:

### AXAUTH-004 — Diagnostic fixes do not encourage worse accessibility — BLOCKER
- [ ] PASS
- Evidence:

### AXAUTH-005 — Markdown-specific accessibility guidance is documented — MEDIUM
- [ ] PASS
- Evidence:

### AXAUTH-006 — False-positive/false-negative corpus maintained — HIGH
- [ ] PASS
- Evidence:

### AXAUTH-007 — Rule changes receive accessibility review — HIGH
- [ ] PASS
- Evidence:

---

# 29. Semantic Navigation and Reading Position

### SEM-001 — Semantic position recovery is deterministic — HIGH
- [ ] PASS
- Evidence:

### SEM-002 — Recovery confidence is not overstated — HIGH
- [ ] PASS
- Evidence:

### SEM-003 — Duplicate content resolves predictably — HIGH
- [ ] PASS
- Evidence:

### SEM-004 — Nearby source edits preserve reading position where feasible — HIGH
- [ ] PASS
- Evidence:

### SEM-005 — Deleted target falls back safely — HIGH
- [ ] PASS
- Evidence:

### SEM-006 — Locale/Unicode differences do not silently destroy persisted position — HIGH
- [ ] PASS
- Evidence:

### SEM-007 — Semantic navigation preserves document context — BLOCKER
- [ ] PASS
- Same node/heading IDs in different documents cannot collide.
- Evidence:

### SEM-008 — History does not navigate to wrong document — BLOCKER
- [ ] PASS
- Evidence:

### SEM-009 — Search return-to-origin works across documents — HIGH
- [ ] PASS
- Evidence:

---

# 30. Internationalization and Unicode Robustness

### I18N-001 — App does not assume ASCII-only document content — BLOCKER
- [ ] PASS
- Evidence:

### I18N-002 — Unicode normalization choices are deliberate — HIGH
- [ ] PASS
- Evidence:

### I18N-003 — Case conversion used for persistent identity is locale-independent — BLOCKER
- [ ] PASS
- Evidence:

### I18N-004 — Locale-aware search/matching behavior is deliberate — MEDIUM
- [ ] PASS
- Evidence:

### I18N-005 — RTL document rendering reviewed — HIGH before claiming broad language support
- [ ] PASS / N/A
- Evidence:

### I18N-006 — Combining marks/emoji/non-BMP characters do not corrupt source ranges — HIGH
- [ ] PASS
- Evidence:

### I18N-007 — Unicode filenames tested — HIGH
- [ ] PASS
- Evidence:

---

# 31. Documentation and User Trust

### DOC-001 — README accurately describes maturity level — BLOCKER
- [ ] PASS
- Evidence:

### DOC-002 — Supported platforms/versions documented — HIGH
- [ ] PASS
- Evidence:

### DOC-003 — Data storage locations documented — HIGH
- [ ] PASS
- Evidence:

### DOC-004 — Recovery behavior documented — HIGH
- [ ] PASS
- Evidence:

### DOC-005 — Known limitations documented — HIGH
- [ ] PASS
- Evidence:

### DOC-006 — Security model summarized for technical reviewers — HIGH
- [ ] PASS
- Evidence:

### DOC-007 — Accessibility statement exists before public stable — HIGH
- [ ] PASS
- Includes tested AT/platform combinations and known limitations.
- Evidence:

### DOC-008 — Privacy statement exists before public stable — BLOCKER
- [ ] PASS
- Evidence:

### DOC-009 — Release checklist committed with stable build — BLOCKER under SensibleMD policy
- [ ] PASS
- Evidence:

### DOC-010 — CHANGELOG/release notes disclose behavior-affecting changes — HIGH
- [ ] PASS
- Evidence:

---

# 32. Legal and Licensing Hygiene

### LEGAL-001 — Project license is explicit — BLOCKER for public distribution
- [ ] PASS
- Evidence:

### LEGAL-002 — Third-party licenses are compatible — BLOCKER
- [ ] PASS
- Evidence:

### LEGAL-003 — Required notices/attributions included — BLOCKER
- [ ] PASS
- Evidence:

### LEGAL-004 — Trademarks/logos/assets are legally usable — HIGH
- [ ] PASS
- Evidence:

### LEGAL-005 — Bundled sample content is licensed/owned appropriately — HIGH
- [ ] PASS
- Evidence:

### LEGAL-006 — Accessibility/privacy claims avoid unsupported certification language — HIGH
- [ ] PASS
- Evidence:

---

# 33. Incident and Vulnerability Response

### IR-001 — Vulnerability disclosure process exists — HIGH before public stable
- [ ] PASS
- Evidence:

### IR-002 — Security contact is monitored — HIGH
- [ ] PASS
- Evidence:

### IR-003 — Severity triage process exists — HIGH
- [ ] PASS
- Evidence:

### IR-004 — Emergency release procedure exists — HIGH
- [ ] PASS
- Evidence:

### IR-005 — Signing-key compromise procedure exists — BLOCKER before binary distribution
- [ ] PASS
- Evidence:

### IR-006 — Dependency compromise response procedure exists — HIGH
- [ ] PASS
- Evidence:

### IR-007 — User notification criteria are defined — HIGH
- [ ] PASS
- Evidence:

### IR-008 — Root-cause analysis expected for serious defects — HIGH
- [ ] PASS
- Evidence:

---

# 34. Manual Release Candidate Abuse Pass

For every public stable candidate, a reviewer should attempt to break the application deliberately.

### ABUSE-001 — Hostile Markdown corpus — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-002 — Strange filenames and paths — BLOCKER
- [ ] PASS
- Spaces, Unicode, extremely long names, same names in different directories, traversal-like names where legal.
- Evidence:

### ABUSE-003 — Rapid repeated open/save/open/reload — HIGH
- [ ] PASS
- Evidence:

### ABUSE-004 — Kill process during save — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-005 — Kill process during migration — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-006 — Modify file externally while dirty — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-007 — Delete file externally while dirty — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-008 — Revoke permissions while open — HIGH
- [ ] PASS
- Evidence:

### ABUSE-009 — Fill disk / simulate write failure — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-010 — Corrupt state/recovery files — HIGH
- [ ] PASS
- Evidence:

### ABUSE-011 — Extremely large Markdown input — HIGH
- [ ] PASS
- Evidence:

### ABUSE-012 — Pathological Markdown nesting/repetition — HIGH
- [ ] PASS
- Evidence:

### ABUSE-013 — Keyboard-only full workflow — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-014 — Screen-reader full workflow — BLOCKER
- [ ] PASS
- Evidence:

### ABUSE-015 — 400% zoom / narrow window workflow — HIGH
- [ ] PASS
- Evidence:

---

# 35. Final Stable Release Gate

All answers below must be **YES** for a public stable release.

- [ ] YES — No known path can silently lose or corrupt user-authored Markdown.
- [ ] YES — No known path can cause SensibleMD to overwrite the wrong file.
- [ ] YES — No known renderer/IPC path grants unauthorized filesystem authority.
- [ ] YES — Hostile Markdown cannot execute code or escape intended navigation/resource boundaries.
- [ ] YES — Local-first/privacy claims match observed network and persistence behavior.
- [ ] YES — WCAG 2.2 AA applicability has been evaluated and blockers are resolved.
- [ ] YES — Full application workflows are usable by keyboard.
- [ ] YES — Required screen-reader tests pass on every platform claimed as supported.
- [ ] YES — Save, recovery, migration, conflict, crash, and failure-injection tests pass.
- [ ] YES — Critical production dependency vulnerabilities: 0.
- [ ] YES — Reachable High dependency vulnerabilities: 0, or exceptional reviewed mitigation attached.
- [ ] YES — Typecheck, lint, unit, integration, regression, security, accessibility, and packaged-build tests pass.
- [ ] YES — Supported operating-system matrix passes.
- [ ] YES — Release artifacts correspond exactly to the reviewed/tagged source.
- [ ] YES — SBOM and cryptographic hashes exist for public binaries.
- [ ] YES — macOS binaries are signed, hardened, notarized, and verified where macOS is distributed.
- [ ] YES — Windows binaries/installers are appropriately signed and verified where Windows is distributed.
- [ ] YES — Linux artifacts have documented integrity verification where Linux is distributed.
- [ ] YES — Security, privacy, accessibility, known limitations, and release notes are current.
- [ ] YES — An independent reviewer has reviewed the release-sensitive changes.
- [ ] YES — No `NOT TESTED` or unjustified `N/A` remains in a release-blocking area.
- [ ] YES — The release checklist is committed alongside the release tag/build.

**Final decision:** PASS / FAIL

**Signed/reviewed by:**

**Date:**

**Residual risks accepted:**

---

# 36. Framework Cross-Reference

This checklist is a SensibleMD-specific engineering control set informed by, but not claiming certification to, the following professional standards and guidance:

- NIST SP 800-218 — Secure Software Development Framework (SSDF) Version 1.1, current final at the time this checklist was authored. NIST has also published an initial public draft of SSDF 1.2; do not treat draft requirements as final without review.
- Microsoft Security Development Lifecycle (SDL).
- OWASP Application Security Verification Standard (ASVS) 5.0.0, applied selectively because SensibleMD is a desktop Electron application rather than a conventional hosted web application.
- OWASP Threat Modeling guidance.
- Electron official Security Checklist.
- W3C Web Content Accessibility Guidelines (WCAG) 2.2, target Level AA where applicable.
- W3C WAI-ARIA Authoring Practices Guide (APG).
- W3C WCAG Evaluation Methodology (WCAG-EM) 2.0.
- NIST Privacy Framework.
- ISO/IEC 25010:2023 product-quality model as a quality-taxonomy reference.
- OpenSSF Scorecard.
- OpenSSF Best Practices Badge criteria.
- SLSA v1.2 supply-chain security specification.
- Apple Developer ID / Hardened Runtime / notarization guidance for macOS distribution.
- Microsoft Windows application code-signing guidance for Windows distribution.

This document does **not** itself establish legal compliance, WCAG conformance, formal ASVS verification, ISO certification, SLSA level attainment, or independent security certification. Any such claim requires the corresponding formal evidence and evaluation.

---

# 37. Review Philosophy

A release is not “good” because the checklist is long or because most boxes are green.

The checklist succeeds only if it causes uncomfortable questions to be asked before users discover the answers themselves.

For SensibleMD:

1. User work is more important than schedule.
2. Privacy is a property of the implementation, not marketing language.
3. Accessibility is a product requirement, not a post-release enhancement.
4. Security boundaries should be enforced architecturally, not by developer intention.
5. Recovery is part of saving, not an optional feature.
6. Errors must fail safely and visibly.
7. Tests should encode important invariants so regressions become difficult.
8. Unknown behavior is risk until it is investigated.
9. “N/A” requires justification.
10. A green CI pipeline is evidence, not proof.
11. Manual review and real-user testing remain mandatory for important human factors.
12. Stable means the project is willing to stand behind the build.

