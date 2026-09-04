# ADR-003: Application State Management

**Status:** Proposed  
**Date:** 2026-09-03  
**Decision owners:** Project maintainers  
**Scope:** Renderer-side application state, domain state ownership, React subscriptions, command integration  
**Related specifications:** Data and Application State Model, Command System, Reading Position, Smart Search, Contributor Guide, Performance Budget

---

## 1. Context

The application has several shared state domains:

```text
open documents
active document
reader position
stable reading position
search sessions
pagination status
navigation history
book/collection state
diagnostics state
preferences
UI panels
```

At the same time, several high-volume or specialized structures should **not** live in a general React state store:

```text
editor engine internals
full undo history
large semantic trees
page layout caches
worker-local indexes
privileged Electron objects
```

The state system therefore needs to provide:

1. predictable shared state,
2. selective React subscriptions,
3. access outside React for the command system,
4. testability without rendering components,
5. domain separation,
6. low overhead,
7. no requirement to persist the entire store,
8. no coupling between renderer state and privileged Electron APIs.

---

## 2. Decision

Use **Zustand** as the initial renderer application-state library, primarily through its vanilla-store capability and selector-based React bindings.

The store will be organized into domain slices/modules rather than one monolithic mutable object.

Conceptually:

```text
Application Store
├── session
├── documents metadata
├── reader
├── navigation
├── search
├── pagination status
├── collections
├── diagnostics UI state
├── preferences
└── UI state
```

The application will **not** use Zustand persistence middleware as the authoritative durable-storage architecture.

Durable persistence is handled by a separate persistence service defined by ADR-005.

---

## 3. Why Zustand

### 3.1 Small Surface Area

The application already defines a semantic command layer.

A heavy state framework with an additional elaborate action architecture risks duplicating:

```text
semantic command
+
state action
+
UI handler
```

Zustand permits explicit domain operations without requiring a second large conceptual framework.

### 3.2 Vanilla Stores

Zustand supports stores outside React.

This is important because the command registry should be able to execute:

```text
reader.nextHeading
search.returnToOrigin
structure.moveSectionDown
```

without needing a React component or hook.

Conceptually:

```ts
commandRegistry.execute(...)
    |
    v
applicationStore.getState()
applicationStore.setState(...)
```

through domain services/actions.

### 3.3 Selective Subscriptions

React components should subscribe only to the state they need.

Example:

```text
SearchPanel
```

should not rerender when:

```text
window position
bookmark list
unrelated document diagnostics
```

change.

Selector-based subscriptions fit this requirement.

### 3.4 TypeScript Support

The application can strongly type:

- domain state,
- actions,
- selectors.

### 3.5 Testability

Vanilla stores can be instantiated directly in unit/integration tests.

---

## 4. Store Does Not Own Everything

The application store is not the universal dumping ground.

The following should remain outside or referenced indirectly:

### Editor Engine State

CodeMirror owns:

```text
editor selection
transaction history
editor-specific extension state
undo/redo internals
```

Application state stores only the context needed by the rest of the product.

### Semantic Document Model

Large semantic documents may live in a document-domain repository/service keyed by document ID.

The app store may store:

```text
semanticVersion
parseStatus
model reference/handle if safe
```

rather than forcing all AST data through React subscriptions.

### Search Index

Search indexes are derived data and may live in a dedicated service/worker.

### Page Maps

Page-layout maps are derived and potentially large.

### Privileged State

Filesystem handles and Electron objects stay in main-process services.

---

## 5. State Slice Pattern

Conceptual:

```ts
interface ReaderSlice {
  readerByDocument: Record<DocumentId, ReaderState>;

  setReaderPosition(
    documentId: DocumentId,
    position: SemanticPosition,
    reason: PositionChangeReason
  ): void;
}
```

Slices should expose intentional domain operations.

Avoid broad:

```ts
setAnything(path, value)
```

APIs.

---

## 6. Direct Mutation Policy

Components should not perform arbitrary store mutation.

Preferred:

```text
UI
-> command/domain action
-> state update
```

This protects state invariants.

Example:

Bad:

```ts
useStore.setState({
  stableReadingPosition: arbitraryPosition
})
```

from a random component.

Preferred:

```ts
positionManager.commitReadingPosition(...)
```

---

## 7. Commands and State

Commands remain the input-agnostic user-intent layer.

Example:

```text
reader.nextHeading
```

may:

1. read current reader state,
2. query semantic document,
3. compute next heading,
4. invoke position manager,
5. update store.

The Zustand store does not replace the command system.

---

## 8. Domain Services

Complex operations belong in domain services rather than giant store actions.

Examples:

```text
PositionManager
NavigationManager
SearchService
DocumentRepository
PaginationService
PersistenceService
```

The store records resulting application state.

---

## 9. Canonical and Derived State

The store should primarily contain canonical coordination state.

Derived values should use selectors or services.

Example:

Do not store independently:

```text
currentSectionId
currentHeadingPath
currentSectionTitle
```

if all can be derived reliably from:

```text
current SemanticPosition + SemanticDocument
```

unless measured performance justifies caching.

---

## 10. High-Frequency Editor Text

The general application store should not become a keystroke-by-keystroke serialized logging system for the full editor document.

The editor/document-buffer architecture will define the exact source synchronization contract.

Key requirement:

> There must be one authoritative current source representation, even if the editor engine maintains internal immutable structures.

Avoid unnecessary full-string copies on every keypress.

---

## 11. DevTools

Development builds may connect the store to state-inspection tooling.

Sensitive document contents should not be copied into logs/devtools unnecessarily.

Useful inspected values include:

```text
document ID
source version
semantic version
reader position
stable reading position
search state
pagination state
dirty state
```

---

## 12. Persistence

Zustand's official persistence middleware can persist state and supports versioning/migrations/custom storage.

However, this project should **not** make browser `localStorage` or Zustand persistence the durable application metadata authority.

Reasons:

- persistent data requires runtime schema validation,
- writes belong behind the desktop persistence service,
- data includes document IDs/paths/bookmarks,
- migration and atomic-write behavior should be explicit,
- renderer compromise should not gain a generic durable-file API.

---

## 13. Rehydration

Application startup flow:

```text
Persistence Service
    |
validated persisted records
    |
    v
initial application state
```

The state store receives already validated data.

It should not deserialize arbitrary disk content itself.

---

## 14. Async Work

Async operations should carry request/version IDs.

Example:

```text
search request version 12
source becomes version 13
result for 12 arrives
-> discard
```

State should expose statuses:

```text
idle
running
ready
stale
error
```

where useful.

---

## 15. React Integration

Use small selectors.

Preferred:

```ts
const query = useAppStore(selectSearchQuery)
```

rather than:

```ts
const entireStore = useAppStore()
```

in broad components.

This reduces unnecessary rerenders.

---

## 16. Multiple Documents

Store state should normalize documents by ID.

Conceptual:

```ts
{
  documents: {
    byId: {...},
    openIds: [...]
  },
  activeDocumentId: "..."
}
```

Do not duplicate whole document state into each tab.

---

## 17. Multiple Windows

This ADR governs renderer state within an application window/process.

If the project later supports multiple independent renderer windows editing the same document, cross-window synchronization requires a separate decision.

Persistent/document-domain identity should remain window-independent.

---

## 18. Testing

State tests should instantiate fresh stores.

Verify:

- initial state,
- domain transitions,
- stale-result rejection,
- selector correctness,
- document isolation,
- close/open cleanup,
- preferences resolution.

No singleton global store should make tests order-dependent.

---

## 19. Alternatives Considered

### Alternative A — Redux Toolkit

Strengths:

- highly explicit predictable state model,
- excellent DevTools,
- mature ecosystem,
- slices/selectors,
- strong TypeScript support.

Why not initial choice:

The project already has a separate semantic command/domain-service architecture. Redux's dispatch/action/reducer model would add another substantial coordination abstraction.

Redux Toolkit remains a strong fallback if:

- state transitions become difficult to audit,
- multi-window synchronization requires event sourcing-like behavior,
- contributor scale favors stricter reducer conventions.

### Alternative B — React Context + `useReducer`

Strengths:

- no external dependency.

Rejected for core state because:

- many independent domains,
- selector performance is harder,
- non-React command access becomes awkward,
- context updates can create broad rerenders.

### Alternative C — Jotai

Strengths:

- fine-grained atomic state,
- React-friendly.

Concern:

The application's architecture is domain-command oriented rather than atom-oriented. A large atom graph may make system-level transitions harder to reason about.

### Alternative D — Custom EventEmitter/store

Rejected initially.

State management is not a product differentiator. A maintained library reduces unnecessary infrastructure work.

---

## 20. Consequences

### Positive

- low ceremony,
- selective subscriptions,
- command system can access store outside React,
- straightforward testing,
- domain modules remain explicit.

### Negative

- Zustand permits patterns that are too loose if discipline is poor,
- state mutation conventions must be enforced by project architecture,
- fewer structural guardrails than Redux reducers,
- persistence must be built separately.

---

## 21. Risks and Mitigations

### RISK-001 — Store becomes giant mutable bag

Mitigation:

```text
domain slices
service boundaries
review checklist
```

### RISK-002 — Components mutate architecture-critical state directly

Mitigation:

```text
export intentional actions/selectors
avoid exporting raw setter patterns
```

### RISK-003 — Full documents stored redundantly

Mitigation:

```text
DocumentRepository / buffer abstraction
memory benchmarks
```

### RISK-004 — Persistence middleware becomes accidental database

Mitigation:

ADR-005 is authoritative for durable state.

---

## 22. Acceptance Criteria

Move ADR to Accepted after a spike demonstrates:

1. command registry can invoke state transitions outside React,
2. React components subscribe selectively,
3. multiple document state remains isolated,
4. large source/semantic data is not duplicated unnecessarily,
5. state can be instantiated cleanly in tests,
6. no persistence architecture depends on `localStorage`.

---

## 23. Research Basis

Reviewed 2026-09-03:

- Zustand documentation: https://zustand.docs.pmnd.rs/
- Zustand persist documentation: https://zustand.docs.pmnd.rs/reference/middlewares/persist
- Redux Toolkit: https://redux-toolkit.js.org/

Zustand currently documents vanilla stores, selector patterns, persistence middleware, versioning/migrations, and custom storage. Its persistence documentation also explicitly notes that simple JSON storage requires additional runtime validation for production use.

---

## 24. Final Decision Rule

> **Use the application store to coordinate product state, not to replace domain models, editor internals, caches, or persistence architecture.**
