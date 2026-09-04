# ADR-005: Persistent Application Metadata Store

**Status:** Proposed  
**Date:** 2026-09-03  
**Decision owners:** Project maintainers  
**Scope:** Local application metadata persistence, reading positions, bookmarks, preferences, collections, schema migration  
**Related specifications:** Data and Application State Model, Reading Position, Threat Model, Contributor Guide, Test Strategy

---

## 1. Context

The application needs to persist local metadata that should survive application restarts but should **not** be written into Markdown files.

Examples:

```text
reading positions
stable reading positions
bookmarks
recent files
collections
reader preferences
accessibility preferences
keyboard bindings
finding suppressions
window preferences
```

The persistence system must be:

- local-first,
- transparent,
- schema-versioned,
- recoverable,
- atomic where practical,
- easy to migrate,
- independent of rendered Markdown,
- safe against malformed stored data.

The data volume is expected to be modest compared with document/search content.

Search indexes, semantic ASTs, page maps, and accessibility findings are derived and should normally be recomputed rather than persisted.

---

## 2. Decision

Use **schema-validated, partitioned JSON metadata files** stored under the application's OS-specific application-data directory.

Do not introduce SQLite as the default metadata store initially.

Persistence is owned by a **main-process persistence service**.

The renderer does not receive generic filesystem write access.

Conceptual layout:

```text
appData/
├── settings.json
├── recent-files.json
├── collections.json
├── keybindings.json
└── documents/
    ├── <document-id>.json
    ├── <document-id>.json
    └── ...
```

Exact names may evolve.

---

## 3. Why JSON

### 3.1 Data Shape Is Modest

The core persistent metadata consists mostly of keyed records and small arrays.

Examples:

```text
one document -> one position record
one bookmark -> small semantic anchor
preferences -> small settings object
```

This does not inherently require relational querying.

### 3.2 Human Inspectability

JSON state can be inspected during development and recovery.

This is useful while the data model is evolving.

### 3.3 No Native Database Dependency

SQLite libraries in Electron may introduce native-module build/rebuild requirements.

Electron's official documentation notes that native Node modules may need recompilation for Electron's ABI.

Avoiding a native DB dependency simplifies:

- Windows development,
- macOS builds,
- Linux builds,
- packaging,
- Electron upgrades.

### 3.4 Clear Persistence Boundary

The project can implement exactly the persistence behavior needed:

```text
runtime validation
schema migration
atomic writes
partitioning
backup/recovery
```

without treating a browser storage API as the database.

---

## 4. Main Process Ownership

Persistence files are read/written from the privileged main process.

Renderer access occurs through narrow operations such as:

```text
loadApplicationSettings
saveApplicationSettings
loadDocumentState(documentId)
saveDocumentState(documentId, record)
```

Do not expose:

```text
writeJson(path, arbitraryObject)
```

---

## 5. Schema Validation

Every file loaded from disk is untrusted input.

Validate it at runtime before use.

A schema library such as Zod may be considered, but the exact validation library does not need to be fixed by this ADR.

Invalid fields should:

- be rejected,
- receive safe defaults,
- not crash the application.

---

## 6. Schema Versioning

Each persistent record contains:

```json
{
  "schemaVersion": 1
}
```

Migrations are explicit.

Example:

```text
v1 -> v2 -> v3
```

Do not silently infer incompatible versions.

---

## 7. Atomic Writes

For important metadata:

```text
serialize
-> write temporary file
-> flush/close where appropriate
-> rename/replace target
```

Use platform-safe atomic-replace behavior.

A crash during persistence should not normally leave half-written JSON.

---

## 8. Partitioning

Do not put every piece of metadata into one giant file.

Reasons:

- smaller atomic writes,
- lower corruption blast radius,
- document state can update independently,
- large recent/history collections do not rewrite settings.

---

## 9. Document State Record

Conceptual:

```ts
interface PersistedDocumentState {
  schemaVersion: number;
  documentId: string;
  lastKnownPath: string;

  lastReaderPosition?: SemanticPosition;
  stableReadingPosition?: SemanticPosition;
  lastEditorPosition?: EditorPositionState;

  bookmarks?: Bookmark[];

  readerPreferencesOverride?: ReaderPreferenceOverrides;

  findingSuppressions?: FindingSuppression[];
}
```

---

## 10. Application Settings

Store:

```text
global reader preferences
accessibility preferences
theme
default reading mode
privacy preferences
```

Settings should remain separate from per-document state.

---

## 11. Recent Files

Recent files are privacy-sensitive.

Store:

```text
path
document identity hint
last-opened time
```

Do not store document excerpts unless there is a clear product need.

Users should eventually be able to clear recent-file history.

---

## 12. Search Queries

Do **not** persist search-query history by default.

Search terms may be sensitive.

Session search state can remain in memory.

---

## 13. Search Indexes

Do not persist normal search indexes initially.

Reasons:

- derived,
- potentially contain full document text,
- can become stale,
- increase privacy surface.

Recompute from authorized open/collection documents.

---

## 14. Semantic AST

Do not persist normal semantic ASTs.

They are derived from Markdown source.

Persist only the semantic anchors required for user state.

---

## 15. Pagination Data

Do not persist page maps.

Pages depend on:

- viewport,
- font,
- spacing,
- theme,
- app version.

Recompute.

---

## 16. Accessibility Findings

Do not persist generated findings.

Persist only:

```text
user suppressions/configuration
```

Findings should be recalculated from current source.

---

## 17. Reading Position Write Frequency

Do not write on every scroll event.

Use:

```text
in-memory update
-> debounce
-> persistence
```

Also persist on:

- document close,
- application close where possible,
- meaningful reading transitions.

---

## 18. Settings Write Frequency

User settings may persist immediately or with a short debounce.

Failures should not block document reading/editing.

---

## 19. Backup

For metadata files critical to user experience, optionally retain one last-known-good backup.

Example:

```text
settings.json
settings.json.bak
```

Backup policy should remain bounded.

---

## 20. Corruption Recovery

If JSON cannot be parsed:

1. preserve corrupted file for diagnostics where practical,
2. attempt backup,
3. fall back to safe defaults,
4. do not affect Markdown source.

---

## 21. Migration Testing

Test fixtures should include:

```text
state-v1.json
state-v2.json
corrupt-state.json
unknown-future-version.json
```

Migrations must preserve:

- bookmarks,
- semantic positions,
- accessibility settings,
- keybindings.

---

## 22. Document Identity

Filename/path alone may change.

Persist:

```text
application document ID
last known path
content/fingerprint hints where useful
```

Do not inject document IDs into Markdown source.

---

## 23. Deleted Documents

If a persisted record points to a missing file:

- preserve metadata for a reasonable period or mark unavailable,
- do not search arbitrary filesystem locations automatically.

A cleanup policy can remove stale records later.

---

## 24. Privacy

All metadata remains local by default.

No account or sync is required.

Future sync would require a separate privacy/security architecture.

---

## 25. File Permissions

Use the OS application-data directory and normal user-account permissions.

Do not claim encryption at rest unless encryption is actually implemented.

---

## 26. Sensitive Metadata

The threat model assumes an attacker with full access to the user's OS account can generally read app metadata.

The persistence layer is intended primarily to protect against:

- corruption,
- accidental exposure,
- application compromise paths,

not a fully compromised local account.

---

## 27. Renderer Compromise

A compromised renderer should not gain arbitrary persistence-file access.

The preload/main API should only expose defined metadata operations.

---

## 28. Multiple Windows

Main-process persistence service serializes/coalesces writes.

Avoid two renderer windows independently writing the same JSON file.

Use:

```text
main-process queue
document-level write coordination
```

---

## 29. Concurrency

Potential race:

```text
window A updates bookmark
window B updates position
```

Persistence service should merge at structured record level or serialize updates against latest record.

Do not implement blind full-file writes from stale renderer copies.

---

## 30. In-Memory Cache

Main persistence service may maintain validated metadata records in memory.

Disk remains durable authority.

Cache invalidation is simpler because writes are centralized.

---

## 31. Crash Recovery Source

Unsaved document recovery is a separate concern from metadata persistence.

Recovery buffers may use a dedicated recovery directory and lifecycle.

Do not overload normal document-state JSON with huge source snapshots.

---

## 32. Why Not `localStorage`

Rejected as authoritative persistence because:

- renderer-controlled,
- less explicit migration/recovery architecture,
- not ideal for filesystem-associated document metadata,
- security boundary is weaker,
- storage location/backup behavior is less deliberate.

---

## 33. Why Not Zustand Persist

Zustand persistence is useful for web applications and small preferences.

However, the project requires:

- schema validation,
- main-process ownership,
- atomic file writes,
- partitioned document records,
- migration control.

Therefore persistence stays separate from state-management middleware.

---

## 34. Alternative Considered — SQLite

SQLite is a strong option.

Advantages:

- transactions,
- indexing,
- relational queries,
- concurrency model,
- mature data integrity.

Reasons not chosen initially:

1. Persistent metadata does not yet require complex relational queries.
2. A native SQLite dependency may complicate Electron packaging/rebuilds.
3. Node's built-in `node:sqlite` is still documented as release-candidate stability in current Node documentation, so relying on it would tie the application to the exact Node version bundled with Electron.
4. JSON is sufficient if partitioned and written atomically.

SQLite should be reconsidered if the application later needs:

```text
very large bookmark/history stores
complex cross-document metadata queries
sync/change tracking
high write concurrency
```

Changing persistence backend should not affect renderer/domain APIs if this service boundary is maintained.

---

## 35. Alternative Considered — IndexedDB

Advantages:

- browser-native,
- transactional.

Rejected for authoritative desktop metadata because:

- lives in renderer/browser storage context,
- data management is less transparent,
- main process is the better security/ownership boundary.

---

## 36. Alternative Considered — Single JSON File

Rejected.

A single file creates:

- larger rewrite cost,
- larger corruption blast radius,
- concurrency problems,
- unrelated state coupling.

---

## 37. Consequences

### Positive

- no native database build complexity,
- explicit schema/migration design,
- human-debuggable,
- local and portable architecture,
- renderer lacks generic persistence access.

### Negative

- application must implement atomic-write/merge logic,
- relational queries are less convenient,
- multi-window writes require care,
- very large metadata collections may eventually justify SQLite.

---

## 38. Performance

Metadata reads/writes should be tiny relative to document I/O.

Load application settings eagerly.

Load per-document state:

```text
on document open
```

rather than scanning every document-state file at startup.

---

## 39. Testing

Unit:

```text
schema validation
migration
serialization
merge
```

Integration:

```text
atomic write
corrupt file recovery
concurrent update queue
```

E2E:

```text
bookmark -> restart -> restored
reading position -> restart -> restored
settings -> restart -> restored
```

---

## 40. Acceptance Criteria

Move to Accepted after prototype verifies:

1. settings round-trip,
2. document positions round-trip,
3. bookmarks round-trip,
4. schema migration works,
5. corruption falls back safely,
6. atomic write survives simulated interruption,
7. concurrent structured updates do not overwrite each other,
8. renderer cannot write arbitrary persistence paths.

---

## 41. Research Basis

Reviewed 2026-09-03:

- Electron native modules: https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules/
- Electron process model: https://www.electronjs.org/docs/latest/tutorial/process-model
- Node SQLite API: https://nodejs.org/api/sqlite.html

Electron currently documents that native Node modules may need rebuilding against Electron's ABI. Current Node documentation lists `node:sqlite` as release-candidate stability, making it worth watching but not necessary for the application's modest metadata requirements.

---

## 42. Final Decision Rule

> **Persist only durable user/application metadata, keep it validated and recoverable, and do not introduce database complexity until the data model actually requires database behavior.**
