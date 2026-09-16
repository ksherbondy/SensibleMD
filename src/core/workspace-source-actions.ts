import { changeHeadingLevel } from "./structural-commands";
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

export interface StructuralHeadingChangeInputs {
  source: string;
  editorLine: number;
  buffer: Pick<DocumentBuffer, "snapshot" | "apply">;
  activeDocumentId: DocumentId;
  setCollection: (update: (documents: CollectionDocument[]) => CollectionDocument[]) => void;
  setSource: (source: string) => void;
  setIsDirty: (dirty: boolean) => void;
}

export function applyWorkspaceStructuralHeadingChange(
  direction: "promote" | "demote",
  { source, editorLine, buffer, activeDocumentId, setCollection, setSource, setIsDirty }: StructuralHeadingChangeInputs,
): void {
  const edit = changeHeadingLevel(source, editorLine, direction);
  if (!edit) return;
  buffer.apply({
    origin: "structural-command",
    baseVersion: buffer.snapshot().version,
    edits: [edit],
  });
  setCollection((documents) =>
    replaceCollectionDocument(
      documents,
      activeDocumentId,
      buffer.snapshot().text,
    ),
  );
  setSource(buffer.snapshot().text);
  setIsDirty(true);
}
