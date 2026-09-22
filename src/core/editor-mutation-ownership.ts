import type { DocumentId } from "./identity";

/** Identity is the object itself, not documentId (including same-ID reopen). */
export interface EditorActivation {
  readonly documentId: DocumentId;
}

export interface EditorLease {
  live: boolean;
}

export interface EditorMutationOrigin {
  readonly activation: EditorActivation;
  readonly lease: EditorLease;
}

/** Only authorizes editor mutations; owns no document data or save lifecycle. */
export class EditorMutationOwnership {
  readonly initial: EditorActivation;
  private current: EditorActivation | null;
  private mounted = false;

  constructor(documentId: DocumentId) {
    this.initial = { documentId };
    this.current = this.initial;
  }

  mount() { this.mounted = true; }
  unmount() { this.mounted = false; }

  invalidate() { this.current = null; }

  activate(documentId: DocumentId): EditorActivation {
    const activation = { documentId };
    this.current = activation;
    return activation;
  }

  isCurrent(activation: EditorActivation): boolean {
    return this.mounted && this.current === activation;
  }

  accepts(
    captured: EditorActivation,
    documentId: DocumentId,
    origin: EditorMutationOrigin,
  ): boolean {
    return origin.lease.live && origin.activation === captured &&
      captured.documentId === documentId && this.isCurrent(captured);
  }
}
