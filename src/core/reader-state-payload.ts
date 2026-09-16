import type { SemanticDocument } from "./semantic-document";
import { createSemanticPosition } from "./semantic-position";

export type ReaderStatePayload = Omit<SensibleDocumentState, "schemaVersion">;

export interface ReaderStatePayloadInput extends Omit<ReaderStatePayload, "position"> {
  semanticDocument: SemanticDocument;
  activeNodeId: string;
}

export function createReaderStatePayload({
  documentId,
  bookmarks,
  activeHeading,
  semanticDocument,
  activeNodeId,
  fontScale,
  lineHeight,
  contentWidth,
  reducedMotion,
}: ReaderStatePayloadInput): ReaderStatePayload {
  return {
    documentId,
    bookmarks,
    activeHeading,
    position:
      createSemanticPosition(
        semanticDocument,
        activeNodeId || activeHeading,
      ) ?? undefined,
    fontScale,
    lineHeight,
    contentWidth,
    reducedMotion,
  };
}
