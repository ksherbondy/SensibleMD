# SensibleMD Library and Directory Access Principles

## Purpose

This note records the intended privacy, security, and UX rules for any future SensibleMD library, recent-files, directory browsing, indexing, or cross-document search feature.

The guiding principle is:

> SensibleMD should only know what the user explicitly permits it to know, and it should only concern itself with Markdown files.

---

## 1. User-Authorized Directories Only

SensibleMD must **never scan the user's filesystem by default**.

The user must explicitly choose which directories SensibleMD is allowed to use.

Example:

```text
Authorized directories

~/Documents/Markdown
~/Projects/Documentation
~/Writing
```

SensibleMD may only browse or index files contained within explicitly authorized roots.

Removing a directory from Settings must revoke SensibleMD's application-level permission to use that directory for library browsing, indexing, or search.

---

## 2. Directory Visibility and File-Content Access Are Different Permissions

SensibleMD should distinguish between two separate capabilities.

### Directory / filename access

Allows SensibleMD to:

- see authorized folder structure;
- see Markdown filenames;
- show recent files;
- support filename search;
- allow navigation through approved Markdown folders.

This permission does **not** authorize reading Markdown file contents for indexing.

### Markdown content access

This must require an additional explicit user choice.

Example settings:

```text
~/Documents/Markdown

[x] Show folders and Markdown filenames
[ ] Read Markdown contents for search
```

When content access is disabled, SensibleMD may know that:

```text
architecture.md
notes.md
sprint-1.md
```

exist, but must not inspect their contents merely for indexing or search.

When content access is enabled, SensibleMD may read `.md` files under that approved directory for local features such as:

- heading search;
- full-text search;
- semantic search/indexing;
- content previews;
- cross-document navigation.

The UI must explain this distinction plainly.

Suggested wording:

> **Allow content indexing**  
> SensibleMD may read Markdown files in this folder to build local search results. File contents remain on this device.

---

## 3. Operating-System Permission Is Not the Same as SensibleMD Permission

The operating system may technically grant SensibleMD access to an entire directory.

SensibleMD's own policy must remain stricter.

Conceptually:

```text
OS filesystem permission
        ↓
SensibleMD authorized root
        ↓
directory/filename permission?
        ↓
content-reading permission?
        ↓
requested operation allowed
```

The app must not treat broad OS access as permission to inspect everything it can technically reach.

---

## 4. Markdown-Only Scope Is a Hard Invariant

SensibleMD is a Markdown application, not a general-purpose file browser.

Library, directory, indexing, and search features must only consider Markdown files ending in:

```text
.md
```

The extension should be evaluated case-insensitively so files such as `README.MD` may still be treated as Markdown while preserving the original filename for display.

All other file types must be ignored.

Examples of files that must never be displayed, indexed, parsed, searched, or opened through library/indexing features:

```text
.txt
.doc
.docx
.xls
.xlsx
.csv
.json
.pdf
.png
.jpg
.jpeg
.gif
.webp
.svg
.zip
```

This includes misleading filenames:

```text
notes.md.txt    → reject
notes.md.png    → reject
notes           → reject
```

Non-Markdown files should not merely appear disabled. They should be outside the library feature's visible world entirely.

---

## 5. Enforce Markdown-Only Rules at Multiple Boundaries

Do not rely on a single UI filter.

The `.md` rule should be checked independently at important boundaries:

```text
directory scanner
    ↓
.md filter

search indexer
    ↓
.md assertion

library open handler
    ↓
.md assertion

main-process filesystem boundary
    ↓
.md assertion
```

This prevents a future UI or indexing bug from bypassing the intended file scope.

---

## 6. Symlinks Must Not Escape Authorized Roots

A recursively indexed directory must not allow a symlink to silently grant access outside the user's approved location.

Example:

```text
Authorized:
~/Documents/Markdown

Inside it:
private-link -> ~/Private
```

SensibleMD must not follow that link and index `~/Private` merely because the symlink was located inside an authorized directory.

A future implementation should use canonical paths and verify that the resolved target remains inside an authorized canonical root before reading or indexing it.

Conceptually:

```text
requested path
    ↓
canonicalize / realpath
    ↓
verify target remains under authorized canonical root
    ↓
verify .md eligibility
    ↓
perform permitted operation
```

Symlink behavior must have explicit automated tests.

---

## 7. Search Should Grow Progressively

The library/search feature should not begin as an unnecessarily complex indexing system.

Suggested progression:

### Phase 1

- recent Markdown documents;
- pinned/favorite Markdown documents;
- authorized directory browser;
- filename search.

### Phase 2

With explicit content permission:

- heading search;
- section search;
- local content previews.

### Phase 3

If justified by user need:

- full-text search across approved Markdown documents;
- semantic indexing;
- advanced local knowledge-library features.

Every phase must preserve the same permission boundaries.

---

## 8. Local-First Privacy

Directory and content indexing should remain local by default.

SensibleMD must not transmit:

- document contents;
- filenames;
- directory paths;
- headings;
- search queries;
- index contents;

to an external service unless a future feature explicitly requires it and the user knowingly enables that behavior.

A future local index should minimize stored information where practical.

Possible future distinction:

```text
[x] Read Markdown contents for search
[ ] Store full document text in the search index
```

Reading a file temporarily for indexing and retaining a duplicate copy of its contents are different privacy decisions.

---

## 9. Library UX Goal

The intended user experience is to eliminate unnecessary trips through the operating-system file picker.

Example:

```text
Library
────────────────────────────
Search Markdown files...

Pinned
  architecture.md
  release-checklist.md

Recent
  sprint-1.md
  rust-notes.md

Folders
  Documents/Markdown
  Projects/Documentation
  Writing
```

The user should be able to:

1. open SensibleMD;
2. search or browse an approved Markdown location;
3. select a Markdown document;
4. immediately begin reading.

The app should reduce cognitive friction without expanding filesystem authority beyond what the user requested.

---

## 10. Security and Privacy Invariants

These should eventually become formal assurance controls and automated tests.

### LIB-FS-001 — Explicit directory authorization

SensibleMD must not recursively browse or index directories that the user has not explicitly authorized.

**Stable-release severity:** BLOCKER.

### LIB-FS-002 — Separate metadata and content permissions

Permission to display authorized folder structure and Markdown filenames must not automatically grant permission to read document contents for indexing.

**Stable-release severity:** BLOCKER.

### LIB-FS-003 — Markdown-only library scope

Library, indexing, and directory-search features must ignore every file that is not an eligible `.md` document.

**Stable-release severity:** BLOCKER.

### LIB-FS-004 — Symlink containment

Canonicalized filesystem targets must not escape an authorized directory unless the target location has separately been authorized.

**Stable-release severity:** BLOCKER.

### LIB-PRIV-001 — Local indexing

Library indexes and search metadata must remain local unless the user explicitly enables a feature requiring external processing.

**Stable-release severity:** BLOCKER.

### LIB-PRIV-002 — Permission revocation

Removing an authorized directory must stop future browsing/indexing of that directory and remove or invalidate any access capability associated with it.

**Stable-release severity:** BLOCKER.

---

## 11. Required Adversarial Tests

Before this feature is considered stable, test at least:

```text
ordinary .md file
README.MD
notes.md.txt
notes.md.png
extensionless file
hidden .md file
non-Markdown file beside Markdown files
nested authorized directories
deleted directory
moved directory
renamed file
symlink to file inside authorized root
symlink to file outside authorized root
symlinked directory escaping authorized root
file changed from .md to another extension after indexing
permission revoked while index exists
content permission disabled after previously being enabled
```

Expected behavior must be explicit for every case.

---

## Guiding Principle

SensibleMD's filesystem model should remain intentionally narrow:

> The user chooses where SensibleMD may look.  
> The user separately chooses whether SensibleMD may read Markdown contents for indexing.  
> SensibleMD ignores everything that is not Markdown.  
> Anything outside those boundaries is none of SensibleMD's business.
