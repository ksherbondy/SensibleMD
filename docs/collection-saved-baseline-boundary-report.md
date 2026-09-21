# Collection saved-baseline handoff — characterization stop

Status: **STOPPED at the authorized ownership boundary; no production repair attempted.** Production remains `f943d91`. The original four failing cases remain unchanged. Five additional characterization cases now cover edited-document return and an incoming edited target whose departure bypassed the two authorized handlers.

## Reproduced transitions

Four new round-trip cases cover outline selection and next/previous chapter, each in normal and StrictMode:

| Point | Buffer text | version / savedVersion | React dirty | Buffer dirty |
| --- | --- | --- | --- | --- |
| Imported A | `# A` | 1 / 1 | false | false |
| Edited A | `# A unsaved A` | 2 / 1 | true | true |
| Activate untouched B | `# B` | 3 / 1 | false | **true, incorrect** |
| Return to edited A | `# A unsaved A` | 4 / 1 | **false, incorrect** | true |

The tests assert preservation of edited text, monotonic version advancement, untouched B being clean in both representations, and returned A remaining dirty in both representations. Current production fails the B buffer-dirty and returned A React-dirty expectations. Close continues to refuse A because it independently checks buffer dirty.

The fifth new case establishes why a ledger written only by `switchDocument` and `navigateChapter` is insufficient:

1. Import A containing an internal link to B.
2. Edit A; both dirty representations are true.
3. Follow the internal link to B. This invokes `followInternalLink`, bypassing both authorized collection activation handlers.
4. Save B through Save As. B's native file contains `# B`; B becomes clean and its version becomes the shared buffer's savedVersion.
5. Select A through `switchDocument`.
6. A's edited source survives, but React dirty becomes false. Buffer dirty is true relative to **B's** savedVersion, not a retained A baseline.

The native save/Save As path was not changed or stubbed for this case. The existing fake desktop performs the operation. It demonstrates renderer state ownership, not a packaged filesystem-loss scenario.

## What must survive per collection document

The current collection record is only `{ id, name, source }`. Once another document is active and saved, the one buffer snapshot cannot reconstruct the previous document's saved state.

The minimum retained contract is:

- A saved-baseline identity or revision associated with the **document**, and whether the retained current content has unsaved changes relative to that baseline.
- Association with the current collection entry/incarnation, so fresh import/replacement does not inherit stale runtime state merely because an ID is reused.
- A defined update rule for successful saves and clean disk replacement, and preservation on failed/cancelled/stale operations.
- A defined remap/invalidation rule when Save As changes identity or replaces a colliding collection entry.

For only a closed A→B→A loop through the two handlers, an outgoing dirty flag could be cached and consulted on return. That is insufficient for the accepted application, where edits can leave via other routes. A dirty boolean alone also does not restore the requested document-specific saved baseline.

The shared buffer's version must remain monotonic: restoring an old active version could make existing version-only async checks accept obsolete work. Its current API supports replace/apply and marking **the current version** saved; it has no operation to restore a target-specific saved baseline while retaining a new activation version. A buffer baseline handoff operation would need an explicit reviewed contract rather than using another document's savedVersion implicitly.

Comparing current text with a saved string is not automatically equivalent to existing version-based dirty semantics: editing and returning to identical text still advances the buffer revision. Do not silently change that policy.

## Why the narrow handler-only repair is blocked

A map populated solely on entry/exit of these two handlers cannot know A's baseline in the internal-link case. Treating a missing target entry as clean would lose the edited/untouched distinction; treating it as dirty would retain the original untouched-target defect.

Keeping such a ledger accurate requires additional ownership over baseline creation and updates: collection import/replacement, edits or all departures, save outcomes, clean reload/recovery distinctions and identity changes. These are concrete current consumers/producers, not a hypothetical future architecture.

This does **not** establish that a general runtime-owner migration is necessary. It establishes that correctness cannot be guaranteed by bookkeeping confined to the two named activation functions while leaving every other producer unaware. A dedicated baseline ledger could be much smaller than a runtime owner, but its synchronization contract crosses the currently authorized boundary.

The existing remediation plan also says to keep runtime dirty/saved information separate from plain CollectionDocument data. No fields were added to CollectionDocument, and no migration was begun.

## Verification and files

- `src/test/active-document-authority.test.tsx`: original four cases retained; five new cases appended.
- `docs/collection-saved-baseline-boundary-report.md`: this report.
- Existing audit and stop-report files were left untouched.

| Check | Result |
| --- | --- |
| Authority characterization | **9 failed**, at the intended dirty-state expectations |
| `npm run build` | PASS |
| `npm run lint` | Exit 0, **30 warnings**, unchanged categories |
| `git diff --check` | PASS |
| Production comparison with `f943d91` | No diff |
| Full suite / packaged verification | NOT RUN after scope stop |

Lint: 12 react(refs), 8 react-hooks(exhaustive-deps), 6 react(set-state-in-effect), 3 eslint(no-unused-vars), 1 eslint(no-unused-expressions). No suppression or configuration change.

Logs: `/private/tmp/collection-baseline-{characterization,build,lint}.log`. Tests/report remain uncommitted for review. No claim is made that the full suite is green with these deliberate regression cases present.

## Next decision

The smallest next design to review is a **document-specific saved-baseline ledger and explicit buffer handoff**, with a narrowly enumerated set of lifecycle integration points. Decide baseline semantics and invalidation/remapping before authorizing implementation. This is not authorization or a proposal to introduce a general runtime controller, session migration or universal activation helper.

No blanket markSaved, production fix, optional Step 18 helper, unrelated activation cleanup or ownership migration was implemented.
