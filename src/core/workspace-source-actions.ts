import type { DocumentBuffer } from "./document-buffer";
import { replaceCollectionDocument, type CollectionDocument } from "./document-collection";
import type { DocumentId } from "./identity";

export interface SourceUpdateInputs {
  buffer: Pick<DocumentBuffer, "snapshot" | "replace">;
  activeDocumentId: DocumentId;
  setCollection: (update: (documents: CollectionDocument[]) => CollectionDocument[]) => void;
  setSource: (source: string) => void;
  setIsDirty: (dirty: boolean) => void;
}

export function updateWorkspaceSource(
  nextSource: string,
  { buffer, activeDocumentId, setCollection, setSource, setIsDirty }: SourceUpdateInputs,
): void {
  if (nextSource === buffer.snapshot().text) return;
  buffer.replace(nextSource, "editor");
  setCollection((documents) =>
    replaceCollectionDocument(documents, activeDocumentId, nextSource),
  );
  setSource(nextSource);
  setIsDirty(true);
}
