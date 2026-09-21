import { useEffect, type RefObject } from "react";
import { createReaderStatePayload, type ReaderStatePayloadInput } from "./reader-state-payload";

interface ReaderMetadataInputs extends Omit<ReaderStatePayloadInput, "documentId"> {
  activeDocumentId: string;
  source: string;
  closing: boolean;
  readerStateReady: boolean;
  pendingReaderWrites: RefObject<Set<Promise<unknown>>>;
  setAppStatus: (status: string) => void;
}

// Register at the original ordinary-write effect position. The workspace keeps
// pending-write ownership so Close Document drains the same set before its flush.
export function useReaderMetadata({
  activeDocumentId, bookmarks, activeHeading, semanticDocument, activeNodeId,
  fontScale, lineHeight, contentWidth, reducedMotion, source, closing,
  readerStateReady, pendingReaderWrites, setAppStatus,
}: ReaderMetadataInputs): void {
  useEffect(() => {
    const saveState = window.sensibleMD?.saveDocumentState;
    if (!readerStateReady || closing || typeof saveState !== "function") return;
    const timer = window.setTimeout(() => {
      const write = saveState(createReaderStatePayload({
        documentId: activeDocumentId,
        bookmarks,
        activeHeading,
        semanticDocument,
        activeNodeId,
        fontScale,
        lineHeight,
        contentWidth,
        reducedMotion,
      })).catch(() =>
        setAppStatus(
          "Desktop settings could not be saved. Your document remains open.",
        ),
      );
      pendingReaderWrites.current.add(write);
      void write.finally(() => pendingReaderWrites.current.delete(write));
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    activeDocumentId,
    activeHeading,
    activeNodeId,
    bookmarks,
    fontScale,
    lineHeight,
    contentWidth,
    reducedMotion,
    source,
    closing,
    readerStateReady,
  ]);
}
