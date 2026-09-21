# Step 16 ordinary reader metadata extraction verification

Status: **Step 16 complete**. Dedicated extraction commit: `0155329`. Step 17 has not begun and remains unauthorized.

Accepted production baseline: hydration repair `f330461`. Accepted characterization: `83325f8`, building on `4deba49` and `160ea9f`. See [complete characterization](reader-metadata-characterization-verification.md) and [hydration repair](reader-metadata-hydration-repair-verification.md). The earlier pre-repair stop report remains in this file's Git history.

## Files and boundary

- `src/core/use-reader-metadata.ts`: focused `useReaderMetadata` hook containing only the ordinary metadata effect.
- `src/App.tsx`: imports and invokes the hook at the former effect position.
- This verification report.

No tests, packaged harness, native code, dependencies or configuration changed.

`useReaderMetadata(inputs): void` has the following explicit interface:

| Input | Type / purpose |
| --- | --- |
| activeDocumentId | string; current metadata identity |
| bookmarks | string[]; current ordered bookmarks |
| activeHeading, activeNodeId | string; current derived heading and semantic node |
| semanticDocument | SemanticDocument; current payload projection model |
| fontScale, lineHeight, contentWidth | number; current reader preferences |
| reducedMotion | boolean |
| source | string; retained dependency trigger |
| closing | boolean; retained scheduling gate |
| readerStateReady | boolean; accepted hydration-repair gate |
| pendingReaderWrites | RefObject<Set<Promise<unknown>>>; the existing workspace-owned pending set |
| setAppStatus | (status: string) => void; existing status setter |

Payload field types are reused through `Omit<ReaderStatePayloadInput, "documentId">`. No generic workspace object, bridge object, buffer or lifecycle manager is passed. The hook returns no new state or capability. **No state or refs moved.** Readiness, pendingReaderWrites, closing, hydration and final close remain workspace-owned.

## Preserved protocol

1. At ordinary effect setup, look up `window.sensibleMD?.saveDocumentState`.
2. Return when not ready, closing, or API unavailable.
3. Schedule the same **500 ms** timer.
4. Inside the timer, construct the payload with the existing `createReaderStatePayload` and identical inputs.
5. Invoke the captured save operation, attaching the same catch and exact status: `Desktop settings could not be saved. Your document remains open.`
6. Add that caught promise to the same workspace pending set; remove it in the same finally callback.
7. Effect cleanup clears the timer at the same lifecycle point.

The dependency array is unchanged, in the same order: activeDocumentId, activeHeading, activeNodeId, bookmarks, fontScale, lineHeight, contentWidth, reducedMotion, source, closing, readerStateReady. No dependencies were added to accommodate the new interface. Semantic payload projection still occurs at timer execution using that effect's render capture, not at setup or through a new latest-state getter.

The accepted repair remains intact: unresolved hydration blocks ordinary writes; success/null/failure completes readiness through the unchanged load effect; readiness starts a fresh 500 ms debounce rather than an immediate flush. A→B cancels the old timer and blocks B until ready. Existing closing gating and cancellation remain intact.

The same `pendingReaderWrites` ref is still created in DocumentWorkspace and read by Close Document. The hook merely receives it. Close Document's exact existing body still awaits `Promise.allSettled([...pendingReaderWrites.current])`, rechecks validity, constructs and awaits the final payload, rechecks validity again and completes only when current. Final flush does not move into the hook. Ordinary metadata remains separate from normal pending saves and recovery tracking.

## Executable source comparison

PASS against `f330461`, which remains production-identical to accepted characterization `83325f8`:

- Read baseline App through `git show f330461:src/App.tsx`.
- Extract the entire ordinary `useEffect` block, including its dependency array.
- Assert that the corresponding block in the hook is **byte-for-byte identical**.
- Restore that block in place of the App hook call and remove only the new import.
- Assert the resulting **entire App file is byte-for-byte identical** to baseline.

This comparison proves no semantic reordering of debounce body, API lookup, payload inputs, promise registration/removal or cleanup, and preserves the accepted readiness/closing guards and exact error string. It also proves loading, Close Document and final flush, Save/Save As, navigation and all surrounding code did not change.

The hook adds only this one passive effect and is invoked at the original effect position: after reader-state loading, before recovery write, recovery load and external-change subscription. No effect registration moved relative to another. No Step 17 code moved and no broader ownership was required.

## Behavior evidence

All accepted characterization tests ran unchanged:

- Full dependency matrix and exact 500 ms restart behavior; source-only semantic projection changes retain their trigger.
- Hydration success/null/failure, fast hydration, held hydration and A→B readiness gating.
- Exact pending promise added once, retained while held and removed on success/rejection, outside normal pending saves.
- Close drains earlier writes before one final flush, which uses newer state than the previous ordinary payload.
- Navigation, dirty-source and independently clean-version changes invalidate close before and during final flush.
- Final-flush failure preserves the exact close-error status, resets closing and permits retry.
- Ordinary failure preserves dirty source/recovery and independent save progress, with existing shared-status ordering.
- Already-dispatched A writes retain A identity after B activation; old workspace success/rejection cannot mutate a remounted workspace.
- StrictMode setup/cleanup/setup produces no duplicate writes, and actual unmount cancels ordinary timers.

## Verification

| Check | Result |
| --- | --- |
| Targeted 12 suites | **110 passed** |
| Full `npm test`, 58 files | **378 passed, 70 TODO** |
| `npm run build` | PASS |
| `npm run lint` | Exit 0; **30 warnings**, same category counts |
| `git diff --check` | PASS |
| Packaged metadata restoration + existing save/close smoke | PASS, 12 checks |

Targeted suites: reader metadata, reader-state payload, reader settings, Close Document, window-close, recovery-write, workspace-recovery, identity, position continuity and navigation stale/red/observation. StrictMode/lifecycle cases are included.

Lint categories: 12 `react(refs)`, 8 `react-hooks(exhaustive-deps)`, 6 `react(set-state-in-effect)`, 3 `eslint(no-unused-vars)`, 1 `eslint(no-unused-expressions)`. No category/count increase, suppression, configuration change or unrelated cleanup.

The existing ordinary-effect exhaustive-deps diagnostic relocates to the new hook. It now names `semanticDocument`, `setAppStatus` and `pendingReaderWrites.current`: React can no longer infer the workspace setter/ref origins through the hook inputs. The passed setter/ref remain the original stable workspace values, and the exact dependency list is intentionally preserved. This is recorded, not suppressed or cleaned up.

Logs: `/private/tmp/step16-extract-{targeted,tests,build,lint,package,packaged}.log`.

## Packaged verification and remaining limits

PASS on a freshly built local macOS arm64 package. `npx electron-builder --mac --dir --arm64` and `node scripts/test-window-close-packaged.mjs` both exited 0. The unchanged harness passed all 12 checks, including real native reader metadata persistence and restoration after Close Document/reopen with browser storage cleared, plus all prior Save As/direct-save/download/native-close/discard checks.

The packaged gate covers document reopen within the running app, not full process restart or held hydration. Physical dialogs, assistive technology and Windows/Linux remain NOT TESTED. Local packaging is unsigned; no public-release readiness claim.

Intended observable behavior change: **none**. No new production coupling or deviation beyond the explicit hook input boundary was found. Step 17 appears ready for separately authorized scope review and characterization, but has not been started and remains unauthorized.
