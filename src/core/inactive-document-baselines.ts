import type { DocumentSnapshot, RetainedBaseline } from "./document-buffer";
import type { DocumentId } from "./identity";

// Baseline custody only: no text, native capability, navigation or async work.
// The active document has no ledger entry; its buffer is authoritative.
export class InactiveDocumentBaselines {
  private inactive = new Map<DocumentId, RetainedBaseline>();
  private activeId: DocumentId;

  constructor(documentIds: DocumentId[], activeId: DocumentId) {
    this.activeId = activeId;
    this.reset(documentIds, activeId);
  }

  // Fresh collection incarnation, including a same-ID reimport.
  reset(documentIds: DocumentId[], activeId: DocumentId): void {
    if (!documentIds.includes(activeId)) throw new Error("Active baseline document is missing");
    this.inactive = new Map(documentIds
      .filter(id => id !== activeId)
      .map(id => [id, { kind: "clean" }]));
    this.activeId = activeId;
  }

  // Called synchronously at each existing buffer activation boundary. The key
  // follows custody, so batched departures do not depend on a React commit.
  takeForActivation(targetId: DocumentId, outgoing: DocumentSnapshot): RetainedBaseline {
    const incoming = this.inactive.get(targetId);
    if (!incoming) throw new Error("Target saved baseline is missing");
    this.inactive.set(this.activeId, outgoing.isDirty
      ? { kind: "dirty", savedVersion: outgoing.savedVersion }
      : { kind: "clean" });
    this.inactive.delete(targetId);
    this.activeId = targetId;
    return incoming;
  }

  // Save As has already passed its existing activation-ownership check.
  // A colliding inactive target is displaced, not inherited by the survivor.
  remapActive(targetId: DocumentId): void {
    this.inactive.delete(targetId);
    this.activeId = targetId;
  }
}
