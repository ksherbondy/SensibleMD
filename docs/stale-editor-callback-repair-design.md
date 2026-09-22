# Stale editor callback: bounded ownership design

Status: proposed design only. No production or test changes in this design task.

Evidence: [the reproduced defect and its limits](editor-source-publication-stop-report.md). The existing two failing regressions and two passing edit-before-departure controls must remain.

## Recommendation

Use a workspace-local **editor activation token**, accompanied by a lifetime lease for each concrete CodeMirror EditorView setup. Guard editor-origin source mutations before touching the buffer or scheduling React updates. Do not reuse the Save As generation directly, introduce a source store, or move activation orchestration.

The activation token answers “which document activation supplied this editor content?” The EditorView lease answers “does the editor instance that emitted this operation still exist?” These are distinct lifetimes: switching Read/Write can replace the editor without activating another document, and history activation can replace the document without replacing the editor.

This recommendation includes a narrow treatment of prop-driven CodeMirror replacement: projection of already-published source is not a fresh editor mutation. Mark those transactions locally and do not echo them through the source-mutation callback. Preserve their existing editor history/selection behavior; do not add history-reset or history-exclusion policy as part of this repair.

## Why the existing generation is not sufficient as-is

`saveAsOwnership.current.generation` advances synchronously in `setActiveDocumentId`, including same-ID replacements, and in workspace layout-effect cleanup. Save operations capture it at invocation. That is suitable for async save completion checks.

Editor callbacks instead exist across renders and commits:

| Approach | Benefit | Problem / required additional work |
| --- | --- | --- |
| Compare captured document ID | Smallest expression | Incorrect for A→B→A and same-ID reimport. Reject. |
| Capture existing save generation at render | Reuses activation invalidation | StrictMode cleanup advances the generation without requiring a new render; committed callbacks can remain permanently stale. Reading live generation when the event arrives instead would authorize the obsolete A callback as B. Reject as a direct implementation. |
| Reuse save generation with explicit committed editor registration | Can be made safe | Still needs render-associated activation publication, editor setup/cleanup ownership, and protection between callback commit and editor content projection. Save cleanup semantics become part of editor authorization. Little scope saved. |
| Separate editor activation token and EditorView lease | Explicit matching lifetimes; leaves accepted save semantics intact | Small extra ownership state and explicit invalidation at activation boundaries. Recommended. |

Do not alter save generation increments, save ownership checks, native bindings, or navigation generations to accommodate editor callbacks. Buffer version is also unsuitable as the ownership token: legitimate edits advance it within the same activation.

## Exact ownership contract

Conceptually, an activation token is an opaque object with a document ID. Each activation receives a new object even when its ID and text equal those of the previous activation. Object identity, not a reusable ID or text fingerprint, determines ownership.

The workspace holds:

- The token published with React source/identity to the editor, in React state. This associates callbacks with the render that created them and ensures same-ID activation still publishes a new token.
- A synchronous current-token reference, used only by event/effect handlers for authorization. It can temporarily be null while handing off the buffer.

Initialize both to the same token for the initial document. Allocate subsequent tokens in activation handlers, not by mutating refs during render. React's published token is a rendering credential, not another source or document-identity authority. Only existing activation boundaries may replace it.

Each actual EditorView setup also creates a fresh lease. Cleanup permanently revokes that lease before destroying the view. StrictMode setup after cleanup creates another lease; it never reactivates the old lease. A workspace-unmounted check additionally rejects callbacks after workspace teardown. It can read the existing workspace mounted flag without changing its save-generation semantics; editor setup runs after workspace layout setup.

For an editor event, carry an immutable origin containing the activation token associated with the editor content and the emitting EditorView's lease. Capture it when the operation is emitted; never reconstruct it later from the workspace's current token or newest callback props.

Before any source mutation, require all of:

1. The workspace is mounted and the emitting editor lease is still live.
2. The event's token is exactly the workspace's current token.
3. The callback's captured render token is that same token.
4. The captured document ID agrees with the token's document ID.

Failure is a silent no-op: no buffer change, version increment, dirty change, collection update, source update, status, save, or recovery operation. Reject the operation entirely; do not send late A text to either B or an inactive A entry.

On success, retain the existing synchronous source action and immutable publication. Its text equality check remains a no-op optimization after authorization. It still replaces the buffer once, captures the result, and publishes to the captured document ID. Do not recheck ownership inside the functional collection updater: an A edit accepted before departure must still publish to A when React later evaluates that updater.

No await or scheduled work may separate the authorization check from the synchronous source mutation.

## Synchronous activation boundary

Revoke the outgoing editor token **before the first active-buffer replacement or active-identity adoption**, after the route has resolved its target and passed its existing refusal checks. Several routes currently replace the buffer before calling `setActiveDocumentId`; placing the entire guard update only in that setter leaves a synchronous handoff gap. Buffer replacements notify subscribers synchronously, even though the current workspace does not subscribe.

Use a narrow editor-ownership invalidation operation at those existing handoff sites. It does not open a file, mutate the buffer, update baselines, or perform navigation. At the existing identity setter, install/publish the new token with the accepted target ID. During the short invalid interval, reject editor events. Do not reorder baseline, buffer, save-binding, or navigation effects to implement this.

Same-document navigation that does not replace the document does not rotate the token. Same-ID reopen/reimport does. A→B→A produces three different tokens, including when React only commits the final A state. Failed/cancelled open and refused close do not revoke authority. Unexpected handoff failure must not reauthorize an editor against a partially replaced buffer; tests must establish that the normal guarded handoff remains synchronous and valid.

## CodeMirror and React commit timing

`MarkdownEditor` currently refreshes callbacks in a layout effect and projects `value` into CodeMirror in a later passive effect. Merely installing a freshly authorized onChange callback at layout commit is unsafe: the surviving EditorView can still contain outgoing text.

Maintain an editor-local content token alongside `currentSource`. Initialize it from the activation props when the EditorView is created. Updating the callback ref does not update this content token. Until source projection finishes, an event from old editor content retains the old token and fails authorization, even if the listener now calls the newest callback.

Extend the existing value-projection effect to depend on both `value` and the activation token. Before doing anything, verify that its captured activation is still current and its editor lease is live. With no await, project the captured value and adopt its activation token as one editor synchronization operation. Adopt the new token even if text is identical and no replacement transaction is needed. Do not copy the live workspace token into an editor containing unrelated text.

Tag replacement transactions as source projection. The listener continues to update editor-local text and existing cursor behavior, but does not invoke source mutation for that transaction. This avoids delayed projection echo being interpreted as a user edit. The annotation applies only to the dispatched projection transaction, not to later undo/redo transactions. No new effect ordering, keyed editor remount, undo-history reset, callback-ref indirection that launders old credentials, or layout/passive effect migration is required.

Ordinary typing and undo/redo use the same guarded document-change path. An event accepted before departure keeps its existing synchronous buffer/version/dirty behavior. A delayed event carries its original provenance and cannot borrow the next activation's token. This contract does not by itself solve stale same-activation full-text transactions; if characterization reproduces such a separate lost-update defect, stop rather than introduce version reconciliation here.

## Integration points

| Existing site | Bounded integration |
| --- | --- |
| Workspace initialization | Initialize published/current editor activation token together; retain existing identity and buffer ownership. |
| Browser file open / browser collection open | Revoke at accepted replacement, before buffer/collection handoff; publish a fresh token through existing identity adoption, including same-ID import. Do not revoke merely for opening a chooser or starting a read. |
| Native Open / Recent Open | Same rule on accepted file result; leave session/binding installation unchanged. |
| Collection selection / chapter navigation | Revoke before `replaceForActivation`; publish with existing identity change. Same-document no-op remains a no-op. |
| History / internal links / collection search / return to origin | Apply the same invalidation only in their cross-document branches. History must be tested with a surviving editor. No common activation controller. |
| Accepted Save As identity adoption | Revoke before adoption, then publish a fresh token even for same-ID adoption. Keep captured newer text, baseline remap, collision policy and save ownership checks unchanged. Failed, cancelled or stale completions do not rotate it. |
| `updateSource` / source mutation boundary | Require captured render token plus event origin, validate synchronously, then call the existing source action. Keep captured text/ID in the collection updater. |
| Editor-origin heading commands | Carry the same provenance through keyboard and editor toolbar mutation entry points. Guard before invoking the existing structural action; do not change transaction planning or the accepted immutable publication fix. Guarding onChange alone leaves another editor callback able to mutate source after departure. |
| `MarkdownEditor` | Accept activation credential/currentness predicate; create/revoke concrete view leases, retain content provenance, pass it on mutation callbacks, and tag prop projection locally. Retain callback refresh and effect registration positions. |
| Recovery restore / clean external reload / conflict reload | Retain current workspace mutation semantics and activation token for the same document. Their source props project without a mutation echo. These operations are not editor callbacks; do not reroute them through editor authorization. |
| Direct Save / failed or cancelled Save As | No token rotation, extra version change, or baseline change. |
| Close Document | Refusal/failure leaves editor usable. Revoke on successful actual document removal before its completion callback queues unmount; retain the protocol's ordering and boolean/status behavior. The `prepareOpen` validation call with a no-op completion must not count as departure. |
| Native window close | No new close protocol, recovery timing, or authorization messages. Cancellation retains editor authority; actual teardown revokes editor leases/workspace liveness. |
| Editor unmount/remount and StrictMode | Revoke old setup lease, create a fresh lease for the replacement. Do not rotate document activation solely for mode changes or effect replay. Do not revive an old lease after setup replay. |

Expected implementation surface: `App.tsx`, `MarkdownEditor.tsx`, and at most a small editor-ownership type/helper module, plus tests. Source actions may receive the guard explicitly if that makes their mutation precondition easier to test; there must be no unguarded editor caller. No changes to DocumentBuffer, the baseline ledger, collection schema, IPC, or storage are required by this design.

## Required tests before acceptance

Keep the existing failing cases unchanged. Add focused characterization before implementation where possible; distinguish already reproduced failures from design acceptance cases.

1. **Original regression and controls:** normal/StrictMode activation-before-editor-update rejects the entire mutation; edit-before-activation still retains A's edit and dirty baseline when returning to A. Assert buffer text/version/savedVersion/dirty, React source/dirty, and both collection entries.
2. **Activation lifetime:** A→B→A in one batch and across commits; invoke an old A callback afterward. Test same-ID file and collection reimport, native reopen/Recent, and identical-source replacement. Old credentials never regain validity; fresh editor edits work.
3. **Every activation route:** collection/chapter/history/link/search/origin/browser/native/Recent, plus accepted Save As. Assert revocation before buffer subscriber notification and no credential changes on route refusal, cancellation, or same-document navigation.
4. **Surviving editor commit window:** commit B's callback props while CodeMirror still contains A; an outgoing-content event is rejected. After B projection, B typing works. Include identical text with distinct tokens and a stale projection effect after a newer activation.
5. **Undo/redo:** real CodeMirror typing, undo and redo under one current activation retain existing results and version/dirty behavior; outgoing-activation undo/redo cannot mutate the new buffer. Preserve existing history policy. If cross-document history itself exposes an additional correctness defect, stop and report it rather than silently resetting history.
6. **Prop projection:** recovery, clean reload, explicit conflict reload and document activation update the real editor without a second buffer mutation, dirtying, or collection publication. Delayed old projection cannot mutate a new activation. Assert projection annotation does not suppress later legitimate undo/redo or typing.
7. **Save As:** fresh same-ID/remapped/collision adoption revokes old credentials while preserving newer accepted edits; fresh editor resumes. Failure, cancellation and stale completion leave current credentials usable. Preserve binding and saved-baseline tests.
8. **Structural callbacks:** delayed keyboard and editor-toolbar promote/demote reject after departure, including A→B→A. Current commands and the accepted structural publication controls remain unchanged.
9. **StrictMode/lifetimes:** initial setup/cleanup/setup accepts new-view typing; callbacks from the cleaned-up view reject even when activation is unchanged. Editor mode unmount/remount and full workspace unmount/remount reject old callbacks and accept new ones. No abandoned render can install live authority.
10. **Close:** dirty/pending-save/not-ready refusal and metadata-flush failure retain working editor callbacks. Successful actual close invalidates before unmount; `prepareOpen` with no-op completion does not strand the current editor. Preserve window-close cancel/discard/save and recovery tests.

Use actual CodeMirror dispatch for integration evidence; use retained callbacks/leases for deterministic lifetime checks. A stale event should produce zero mutation-related setter calls and zero buffer revision increments, not merely the right final text after another effect repairs it.

After implementation: targeted editor/source/structural/activation/save/baseline/binding/recovery/reload/close tests, full suite, build, lint against the accepted 30-warning baseline, diff check, and packaged file:// verification with the dev server offline. Packaged checks should cover the original batched ordering, undo/redo, history with a surviving editor, and same-ID replacement. Do not claim physical-input scheduling coverage from synthetic dispatch alone.

## Scope and evidence status

This is a design, not a verified repair. No tests were changed or rerun for this report. The working tree still contains the deliberately failing stale-callback characterization. The additional commit-window, teardown and projection cases above are required acceptance tests, not newly claimed reproductions.

The smallest safe change is explicit editor mutation authorization and provenance at the two existing boundaries: workspace activation and CodeMirror dispatch. General source publication, async save ownership, runtime document state, navigation, undo-history redesign and broader same-activation source reconciliation remain outside scope.
