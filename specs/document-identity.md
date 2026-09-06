# Document Identity

Status: **v0.1, provisional.** The derivation below is expected to change before 1.0.
Callers must treat `DocumentId` as opaque.

## Two kinds of identity

| | `DocumentId` | `SessionId` |
| --- | --- | --- |
| Lifetime | Persists across restarts | One opened document in one window |
| Owner | Main process (desktop) / renderer (browser) | Main process |
| Persisted | Yes | Never |
| Keys | Bookmarks, reading position, recovery snapshots, per-document settings | Authorization, in-flight operations, external-change events |

Conflating the two is what allowed one document's recovery snapshot to be applied to
another. They are separate types so the compiler can keep them apart.

## Derivation

There is exactly one seam for desktop identity: `deriveDocumentId()` in
[electron/document-identity.cjs](../electron/document-identity.cjs). Nothing else may
derive an identifier from a path.

```
absolute path
      ↓  path.resolve
      ↓  fs.realpath        (symlinks resolved; falls back to the resolved path)
canonical path
      ↓  SHA-256, first 128 bits
doc-<32 hex>
```

`IDENTITY_SCHEME` records the derivation generation. Raising it causes the main process
to archive existing per-document state on next launch rather than apply it under
identifiers it can no longer produce.

### Renderer-side identity

Documents with no main-process path get their identity in the renderer
([src/core/identity.ts](../src/core/identity.ts)):

| Source | Derivation | Prefix |
| --- | --- | --- |
| Bundled sample / browser-storage restore | fixed constant | `welcome-document` |
| Browser file input | digest of `name`, `size`, `lastModified` | `doc-b-` |
| Source string with no file | digest of `name`, `source` | `doc-m-` |

The digest is FNV-1a over NFC-normalized UTF-8 bytes. It is not a security primitive; it
only has to be stable, collision-resistant enough for one collection, and identical on
every platform. No locale-sensitive operation participates in identity derivation, so
identifiers do not vary with the host locale.

Collection membership never contributes to identity. If two entries in one collection
derive the same identifier — only possible for genuinely indistinguishable inputs — later
duplicates are suffixed, which leaves every other document's identity untouched.

## Behaviour matrix

Verified in [electron/document-identity.test.ts](../electron/document-identity.test.ts).

| Situation | Identity | Consequence |
| --- | --- | --- |
| Same file, reopened | Same | State restores |
| Same name, different directory | Different | **Fixed in Sprint 1.** No longer collides |
| Relative or `..`-containing path spelling | Same | Normalized before hashing |
| Symlink to a file | Same as target | A write through the link lands on the target, so they are one document |
| File under a symlinked directory | Same as real location | As above |
| Hard link | Different | Two paths, no way to tell they share an inode without extra bookkeeping |
| Case-only spelling on a case-insensitive volume | Same | `realpath` returns the on-disk case |
| Case-only spelling on a case-sensitive volume | Different | They are genuinely different files |
| Renamed | **Different** | Known limitation, see below |
| Moved to another directory | **Different** | Known limitation, see below |

## Known limitations

### Rename and move orphan a document's state

Renaming `~/Docs/book.md` to `~/Docs/my-book.md` produces a new identifier. Bookmarks,
reading position and recovery snapshots recorded under the old identifier are not found.

Nothing is lost — the old state remains on disk under the old identifier — but it is not
reachable through the application. This is accepted for v0.1 and is the main reason the
derivation is behind a seam.

Candidate fixes for a later release, in rough order of preference:

1. Record `(deviceId, inode, size)` alongside each document's state and, when no state
   exists for a path-derived identifier, look for a record whose inode matches. Handles
   rename and move within a volume; does not survive a copy or a cross-volume move.
2. Content-addressed identity with a rediscovery index. Survives moves, but changes
   identity on every edit, so it needs a separate mutable-document key.
3. macOS bookmark data / Windows file IDs. Most durable, least portable, and the least
   reproducible in a future Rust implementation.

None of these are v0.1 work.

### Symlink identity depends on filesystem state

Because canonicalisation resolves symlinks, repointing a link changes which document the
link refers to. That is the intended reading — the link names whatever it currently points
at — but it means identity is not derivable from the path string alone.

### Browser-mode identity is weak

A file chosen through the browser file input exposes no path. Two identical copies in
different directories are indistinguishable, and editing a file externally changes
`lastModified` and therefore its identity. Sprint 9 replaces the collection open path with
a native one, which removes this case for desktop builds.

## Rules for later sprints

- Never derive an identifier from a document's position in a collection.
- Never use a `SessionId` as a persistence key, and never persist one.
- Never use a `DocumentId` to authorize a filesystem operation; that is what capabilities
  are for (Sprint 4).
- Any change to the derivation must raise `IDENTITY_SCHEME` and must archive, not delete,
  state written under the previous scheme.
