# ADR-002: Rendering Security Boundary for Untrusted Markdown

**Status:** Proposed  
**Date:** 2026-09-03  
**Decision owners:** Project maintainers  
**Scope:** Electron renderer security, Markdown rendering, raw HTML, CSS, URLs, IPC, filesystem access  
**Related specifications:** Threat Model, Semantic Document Model, HCI Principles, Accessibility Requirements, Contributor Guide

---

## 1. Context

The application opens arbitrary local Markdown files.

Those files may originate from:

- Git repositories,
- downloads,
- email,
- documentation bundles,
- unknown third parties.

Markdown may contain:

- raw HTML,
- links,
- images,
- SVG,
- CSS-adjacent constructs,
- extension syntax,
- remote resources.

Electron applications have greater host privileges than ordinary browser pages.

Therefore:

> **A Markdown document must be treated as untrusted content even when it is a local file.**

Opening Markdown must not become equivalent to executing code.

---

## 2. Decision

Adopt a layered rendering boundary with these mandatory rules:

```text
Electron renderer:
  nodeIntegration = false
  contextIsolation = true
  sandbox = true

Preload:
  narrow contextBridge API only

IPC:
  explicit channels
  schema/argument validation
  sender validation

Markdown:
  parsed as data
  normalized semantically
  raw HTML sanitized before DOM use

External resources:
  validated and policy-controlled

Document CSS:
  isolated from privileged application chrome
```

The application must not expose unrestricted Electron or Node APIs to rendered document content.

---

## 3. Architectural Flow

```text
Untrusted Markdown Source
        |
        v
Markdown Parser
        |
        v
Semantic Document Model
        |
        v
Safe Render Projection
        |
        +--> native React elements for known semantic nodes
        |
        +--> sanitized HTML path for supported raw HTML
        |
        v
Unprivileged Sandboxed Renderer
        |
        v
Narrow Preload API
        |
        v
Validated IPC
        |
        v
Privileged Main Process
```

---

## 4. Renderer Privilege

The application renderer should use:

```text
nodeIntegration: false
contextIsolation: true
sandbox: true
webSecurity: true
```

These are baseline invariants.

A future dependency that requires disabling one of these settings must trigger a new ADR and security review.

---

## 5. Renderer Must Not Have

Rendered/UI code must not receive unrestricted:

```text
require
fs
child_process
process APIs
shell
ipcRenderer
Electron module
```

The renderer should operate as though it were an ordinary web application with a small capability bridge.

---

## 6. Preload Bridge

Bad:

```ts
contextBridge.exposeInMainWorld("electron", {
  ipcRenderer
});
```

Rejected because it exposes a generic privileged transport.

Preferred:

```ts
contextBridge.exposeInMainWorld("appApi", {
  requestOpenMarkdown,
  requestSaveCurrentDocument,
  requestOpenExternalUrl
});
```

Each operation should have:

- narrow arguments,
- validation,
- bounded return data.

---

## 7. IPC Validation

Main-process handlers must not trust renderer data.

Validate:

```text
channel
sender/frame
argument schema
path
URL
document identity
operation scope
```

Invalid requests fail closed.

---

## 8. Markdown Rendering Strategy

Known Markdown semantic nodes should preferably render as explicit React/native HTML elements.

Example:

```text
HeadingNode -> h1..h6
ParagraphNode -> p
LinkNode -> a
ListNode -> ul/ol
TableNode -> table
```

Benefits:

- accessible semantics,
- controlled properties,
- reduced need for arbitrary HTML insertion,
- easier URL validation.

---

## 9. `dangerouslySetInnerHTML`

The normal semantic Markdown path should not require arbitrary use of:

```ts
dangerouslySetInnerHTML
```

If raw HTML support uses it at a carefully isolated boundary, the input must have already passed through a reviewed sanitizer.

Never insert unsanitized document HTML.

---

## 10. Raw HTML Policy

Raw HTML may be supported because real Markdown files use it.

The policy is:

```text
preserve source
parse if needed
sanitize rendering
never destructively rewrite source merely to make it safe
```

Unsafe source constructs may remain in raw editing mode while becoming inert or omitted in rendered mode.

---

## 11. Sanitization Technology

Initial recommendation:

```text
rehype-raw
-> rehype-sanitize
```

for raw HTML that must participate in the HTML syntax tree.

`rehype-sanitize` uses an allowlist/schema model and is explicitly intended for untrusted HTML.

Sanitization must occur **after** raw HTML is parsed into the HTML AST.

---

## 12. Sanitizer Schema

Do not blindly use an increasingly permissive schema.

Define an application-specific schema based on actual supported Markdown/HTML behavior.

Default principle:

```text
deny unless needed
```

Potentially supported:

```text
headings
paragraphs
lists
links
images
tables
code/pre
blockquote
details/summary if accessibility tested
basic text-level semantics
```

Potentially prohibited:

```text
script
iframe
object
embed
forms unless explicitly justified
event-handler attributes
```

---

## 13. DOM Clobbering

Sanitization must consider DOM clobbering through attacker-controlled:

```text
id
name
```

Application code should also avoid relying on named global DOM properties.

Heading IDs should be generated/normalized through application logic, not blindly trusted from raw HTML.

---

## 14. Script Execution

The following must never execute from Markdown:

```html
<script>
<img onerror>
<svg onload>
<a href="javascript:...">
```

Security fixtures must verify this in a packaged-like Electron environment.

---

## 15. Links

Rendered links are data until explicitly activated by the user.

URL handling pipeline:

```text
LinkNode
  |
normalize
  |
classify:
  local Markdown
  local asset/file
  external web URL
  mailto
  unsupported/dangerous scheme
  |
policy
```

---

## 16. Dangerous Schemes

Block or explicitly reject:

```text
javascript:
vbscript:
```

Treat cautiously:

```text
data:
file:
custom protocols
```

No arbitrary scheme should reach `shell.openExternal` without validation.

---

## 17. External Web Links

External HTTP(S) links should open in the user's system browser rather than navigating the privileged application renderer.

The main process should validate the URL before invoking the OS.

---

## 18. Navigation Restrictions

The application renderer itself should not navigate to arbitrary internet pages.

Unexpected navigation requests should be denied.

Creation of new windows should be restricted.

---

## 19. Remote Resources

Remote images/fonts/CSS can leak:

- IP address,
- open time,
- network identity.

Remote resource loading therefore requires an explicit application policy.

Initial recommended default:

```text
do not silently load arbitrary remote resources
```

Exact UX can be decided separately.

---

## 20. Local Resources

Markdown references do not grant arbitrary local filesystem read access.

Example:

```md
![x](../../../../secret.txt)
```

must not result in unrestricted file access.

Local resources should resolve within:

```text
current document root
or explicitly authorized collection root
```

subject to final filesystem ADR.

---

## 21. Symlinks

Path security checks must account for resolved paths.

Naive prefix checks are insufficient.

Security tests must include symlink escape fixtures.

---

## 22. `file://`

Avoid designing the renderer around unrestricted `file://` resource access.

Electron's current security guidance recommends preferring custom protocols over broad file-protocol use.

A future ADR should define the local-resource protocol if necessary.

---

## 23. Custom Protocol Candidate

Potential model:

```text
app-resource://document/<id>/asset/...
```

Main process/protocol handler resolves only authorized assets.

Advantages:

- explicit authorization boundary,
- no arbitrary local paths exposed to renderer,
- CSP can target known scheme.

Exact design is deferred.

---

## 24. Custom CSS

Document/user CSS is a separate trust surface.

It must not be able to modify privileged application UI.

Potential isolation strategies:

```text
Shadow DOM
strict scope rewriting
separate rendering subtree/context
```

The final implementation should be decided after proof-of-concept testing.

---

## 25. CSS Network Access

Document CSS should not silently load:

```css
@import
url(https://...)
```

without following remote-resource policy.

---

## 26. Accessibility Overrides

Security isolation must not prevent user accessibility preferences from overriding document presentation.

The architecture should support:

```text
document style
<
user accessibility override for critical readability
```

where required.

---

## 27. SVG

SVG requires explicit treatment.

Inline SVG may contain:

- scriptable behavior,
- external references,
- foreignObject.

Initial safe policy:

```text
do not treat arbitrary inline SVG as trusted markup
```

Either sanitize it with a reviewed schema or render it through a restricted image path.

---

## 28. Diagrams

Mermaid or other diagram systems must not execute arbitrary document JavaScript.

Any diagram renderer should:

- use strict/safe configuration,
- sanitize output,
- obey remote URL policy,
- provide accessible fallback.

---

## 29. Code Blocks

Code blocks are display content.

They never execute by default.

A future "run code" feature, if ever proposed, requires an entirely separate threat model and ADR.

---

## 30. CSP

Production renderer should use a restrictive Content Security Policy.

Conceptual baseline:

```text
default-src 'self'
script-src 'self'
object-src 'none'
frame-src restricted/none
connect-src restricted
img-src explicitly controlled
style-src explicitly controlled
```

Exact directives depend on Vite/Electron implementation.

Avoid:

```text
'unsafe-eval'
*
```

in production unless explicitly justified.

---

## 31. Development vs Production

Vite development mode may require different CSP behavior.

Production configuration must be independently tested.

Do not assume development security settings equal packaged security.

---

## 32. Electron Fuses

Packaging should review Electron fuses and disable unnecessary capabilities where appropriate.

Candidate review areas include:

- Node CLI environment behavior,
- `runAsNode`,
- debugging capabilities,
- ASAR integrity options where supported.

Fuse choices require testing and may become a packaging ADR.

---

## 33. Permissions

If renderer/session content could request browser permissions, install explicit permission handlers.

Default should deny permissions not required by the application.

---

## 34. Clipboard

Reader copy operations may write user-selected content to clipboard.

Rendered Markdown must not be able to read clipboard content arbitrarily.

---

## 35. Drag and Drop

Dropped Markdown/files remain untrusted.

Dropping a directory must not silently establish unlimited trust.

---

## 36. Accessibility and Security

Security prompts/errors must themselves be accessible.

Examples:

- blocked external link prompt,
- remote-content permission,
- unsafe file target warning.

Requirements:

```text
keyboard accessible
screen-reader named
predictable focus
no document CSS influence
```

---

## 37. Failure Behavior

If sanitization/rendering fails:

```text
preserve source
show safe fallback
keep raw editor available
```

Do not destroy or rewrite the document.

---

## 38. Security Layering

No single defense is sufficient.

Required layers:

```text
semantic rendering
sanitization
CSP
sandbox
context isolation
no Node integration
narrow preload
IPC validation
navigation restrictions
resource policy
```

A sanitizer bug should not automatically become host code execution.

---

## 39. Alternatives Considered

### Alternative A — Trust local Markdown

Rejected.

Local files can come from untrusted sources.

### Alternative B — Disable all raw HTML permanently

Security-simple but compatibility-hostile.

Not chosen as the architectural default because the product aims to open real-world Markdown broadly.

Unsafe HTML may be rendered inert while source is preserved.

### Alternative C — Render Markdown in the privileged main process

Rejected.

Electron guidance warns against processing untrusted content in privileged contexts.

### Alternative D — Give renderer direct filesystem APIs

Rejected.

An XSS/sanitizer failure could become arbitrary local-file access.

### Alternative E — Separate untrusted document into another WebContentsView

Potential future defense-in-depth option.

Not required by this ADR initially because it introduces:

- accessibility-tree complexity,
- focus complexity,
- selection/copy complexity,
- reader/editor synchronization complexity.

A prototype may revisit this if same-renderer isolation proves insufficient.

---

## 40. Consequences

### Positive

- XSS has far less privilege.
- File and shell access remain mediated.
- Raw HTML compatibility remains possible.
- Security and accessibility semantics can share controlled render projection.
- Source stays intact.

### Negative

- More architecture than direct Markdown-to-HTML insertion.
- Local image handling requires explicit protocol/path design.
- Custom CSS becomes more complex.
- Some embedded HTML will be intentionally unsupported or sanitized.
- Security testing becomes a permanent project responsibility.

---

## 41. Mandatory Regression Fixtures

At minimum:

```text
<script>
event handlers
javascript: links
malicious SVG
iframe/object/embed
remote image
CSS @import
path traversal
symlink escape
window.open
navigation attempt
malformed IPC
renderer Node access attempt
```

---

## 42. Acceptance Criteria

ADR may move from Proposed to Accepted after a security prototype proves:

1. Renderer has no Node integration.
2. Context isolation is enabled.
3. Renderer is sandboxed.
4. Raw malicious HTML does not execute.
5. `javascript:` URLs cannot execute.
6. Renderer cannot issue arbitrary IPC.
7. Renderer cannot read arbitrary filesystem paths.
8. Navigation to arbitrary sites is blocked.
9. External links open only through validated policy.
10. Source containing blocked HTML remains intact.
11. VoiceOver/NVDA can still access rendered semantic content under the chosen isolation approach.

---

## 43. Research Basis

Reviewed on 2026-09-03:

- Electron Security: https://www.electronjs.org/docs/latest/tutorial/security
- Electron Process Sandboxing: https://www.electronjs.org/docs/latest/tutorial/sandbox
- Electron Context Isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- rehype-sanitize: https://github.com/rehypejs/rehype-sanitize
- rehype-raw: https://github.com/rehypejs/rehype-raw

Current Electron guidance recommends enabling context isolation and sandboxing, keeping Node integration away from untrusted content, retaining `webSecurity`, defining restrictive CSP, limiting navigation/new windows, validating IPC senders, avoiding unsafe `shell.openExternal` use, preferring safer protocols over broad `file://` use, and not exposing Electron APIs to untrusted content.

The rehype project recommends `rehype-sanitize` when rendering untrusted HTML and provides an allowlist/schema-based sanitizer designed to drop content not explicitly permitted.

---

## 44. Final Decision Rule

> **Even if malicious Markdown achieves script execution inside the renderer, the surrounding architecture should still deny it meaningful host privileges.**
