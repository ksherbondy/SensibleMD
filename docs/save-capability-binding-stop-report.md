# Document/session/save-capability characterization — defect stop

Status: **STOPPED after reproducing a wrong-file-save defect. No production changes.** The requested complete activation matrix is not complete; the explicit stop condition takes precedence.

## Defect

**Severity: critical data-integrity defect.** A browser-only collection document can inherit another document's native session/direct-save capability. Saving the browser document then overwrites the previously authorized native file and marks the browser document clean.

This is reproduced in the real renderer with FakeDesktop's in-memory filesystem, in normal and StrictMode execution. Production main/preload source corroborates the write destination. No real user file was written; packaged reproduction was not performed.

## Reproduction

1. Browser-import a collection containing A.md (`# A` plus an internal link to B.md) and B.md (`# B`).
2. Save A using Save As to `/NativeA.md`. This establishes native document identity Aₙ, session Sₐ, and direct-save capability. The collection retains browser-only B.
3. Follow the internal link to B.md. B becomes active and its text/baseline load correctly, but the renderer retains Sₐ and direct-save capability. Main still authorizes `/NativeA.md`.
4. Edit B to `# B edited B`.
5. Click Save. Renderer calls `saveOpenedDocument({ source: '# B edited B' })`, not Save As.
6. FakeDesktop writes B's text into `/NativeA.md`. The active identity remains browser B. Both React and buffer dirty become false.

The test configures a subsequent Save As cancellation. A correct Save As path would therefore leave A untouched and B dirty; no destination was selected for B.

## Observed transition matrix for the reproduction

Aᵦ/Bᵦ are browser import identities; Aₙ is the native identity of `/NativeA.md`; Sₐ is the returned native session. A₀ = `# A\n\n[Go to B](B.md)`, B₀ = `# B`, B₁ = `# B edited B`.

| Point | activeDocumentId | activeSessionId | canSaveDirectly | Collection identity/source | Buffer text; version/savedVersion; dirty | Subsequent Save branch |
| --- | --- | --- | --- | --- | --- | --- |
| After browser collection import | Aᵦ | null | false | Aᵦ:A₀, Bᵦ:B₀ | A₀; 1/1; false | Save As, observed |
| After accepted Save As | Aₙ | Sₐ | true | Aₙ:A₀, Bᵦ:B₀ | A₀; 1/1; false | Direct when enabled |
| After internal-link activation | Bᵦ | **Sₐ retained** | **true retained** | Aₙ:A₀, Bᵦ:B₀ | B₀; 2/2; false | Direct when enabled; clean Save is disabled |
| After editing B | Bᵦ | Sₐ | true | Aₙ:A₀, Bᵦ:B₁ | B₁; 3/2; true | **Direct, observed** |
| After Save resolves | Bᵦ | Sₐ | true | Aₙ:A₀, Bᵦ:B₁ | B₁; 3/3; false | Direct; now disabled while clean |

Native authorization stays `/NativeA.md` after the accepted Save As throughout the remaining sequence. Disk initially contains A₀ and ends with B₁, while the collection's A entry still contains A₀.

Identity/session come from renderer DOM attributes. Collection state is observed at the existing searchCollection input, without modifying its return value. Buffer state is read from the actual workspace DocumentBuffer. canSaveDirectly is established by source tracing, corroborated by Save enabled/disabled behavior and the actual direct/Save As API calls; no private React-state inspection or production instrumentation was added. Exact revision progression follows the existing buffer operations; the regression asserts source and dirty state, not those numeric revisions.

## Cause and production corroboration

- `src/App.tsx`, `followInternalLink`: changes active document/source/baseline and navigation, but does not change activeSessionId or canSaveDirectly.
- `src/App.tsx`, `saveFile`: chooses direct Save using canSaveDirectly plus API availability. It does not compare the active document with the native authorization's document.
- `src/core/workspace-save-actions.ts`, `saveWorkspaceDocumentDirectly`: sends only source. After success, its version check accepts B's still-current version and marks B saved. That check prevents obsolete version completion; it cannot establish the correct destination file.
- `electron/preload.cjs`: forwards the payload to `document:save-opened`.
- `electron/main.cjs`, `document:save-opened`: obtains the session by sender webContents ID and writes payload.source to that session's filePath. It receives neither a requested document ID nor a session token to compare against the active document.
- `electron/main.cjs`, `openAuthorizedDocument`: native Open, Recent Open and accepted Save As establish/replace the window's native authorization. Browser collection activation does not do so.

The renderer identity changed while native write authority did not. The saved-baseline ledger correctly transferred clean/dirty metadata; it intentionally does not own native authorization and cannot resolve this mismatch.

This is an **existing defect, not introduced by the baseline repair**: inspection of `git show HEAD:src/App.tsx` confirms that the original internal-link path also retained session/capability, and main/preload have no changes. No claim is made that the old revision was separately executed in this turn.

## Authority conclusions supported so far

- Native Open and Recent Open establish a native binding for the returned document; reopening the same native file creates a new session. This is explicit source behavior and is consistent with existing identity tests.
- Accepted Save As intentionally adopts a new native binding for the surviving active document. That adoption is demonstrated in this reproduction.
- Browser-only targets must not inherit another document's direct-save capability. The reproduced internal-link transition must revoke the renderer's active save binding or otherwise prevent using it for B; this report does not choose a repair or change IPC.
- Mere equality of a displayed name, prior session presence, or repeated document ID does not establish native write authority.
- A browser import setting renderer session to null/capability false does not itself delete main's per-window authorization. Those are separate states, and a later audit must record both.

Source inspection also shows history, collection search and return-to-search-origin retaining renderer capability/session, while collection selection and chapter navigation clear capability but retain the session value. These are **uncharacterized related paths**, not separately reproduced wrong-file saves. They must not be reported as validated or normalized by this task.

## Stop boundary and verification

Added only:

- `src/test/save-capability-binding.test.tsx`: two failing safety regression cases (normal / StrictMode).
- This report.

The failing assertions cover inherited session, disabled clean Save on browser B, direct Save being invoked instead of Save As, A's original source being overwritten, and B being marked clean. The assertions express the required safe behavior, not acceptance of the defect.

Targeted result: **2 failed**, for the intended safety violations. Log: `/private/tmp/save-capability-binding.log`. Diff whitespace check: PASS. Full suite, build, lint and packaged verification were not rerun after this defect stop. The deliberate failing cases mean the full suite must not now be described as green.

Prior uncommitted repair changes, existing tests, audit files and reports were left intact. No activation helper, behavior normalization, save-authorization repair, or production instrumentation was introduced.

Remaining browser-file, native/recent, collection-selection/chapter, history/search/origin and same-ID transition combinations require characterization after review of this stop. The complete matrix and any repair remain pending.
