import type { RefObject } from "react";
import { createReaderStatePayload, type ReaderStatePayloadInput } from "./reader-state-payload";

interface CloseDocumentInputs extends Omit<ReaderStatePayloadInput, "documentId"> {
  activeDocumentId: string;
  isDirty: boolean;
  readerStateReady: boolean;
  readCurrentSnapshot: () => { version: number; isDirty: boolean };
  captureNavigation: () => () => boolean;
  pendingSaves: RefObject<Set<Promise<unknown>>>;
  pendingReaderWrites: RefObject<Set<Promise<unknown>>>;
  closingRef: RefObject<boolean>;
  setClosing: (closing: boolean) => void;
  setAppStatus: (status: string) => void;
  completed: () => void;
}

// Workspace owns lifetime, refs and completion. Keep locking before the first
// await, and retain both live validity checks around the explicit final flush.
export async function closeWorkspaceDocument({
  activeDocumentId, isDirty, readerStateReady, readCurrentSnapshot,
  captureNavigation, pendingSaves, pendingReaderWrites, closingRef, setClosing,
  setAppStatus, completed, bookmarks, activeHeading, semanticDocument,
  activeNodeId, fontScale, lineHeight, contentWidth, reducedMotion,
}: CloseDocumentInputs): Promise<boolean> {
  if (isDirty || readCurrentSnapshot().isDirty) {
    setAppStatus("Save your changes before closing this document.");
    return false;
  }
  if (pendingSaves.current.size) {
    setAppStatus(
      "A save is still in progress. Close the document when it finishes.",
    );
    return false;
  }
  if (!readerStateReady) {
    setAppStatus(
      "Reader state is still loading. Try closing again when it finishes.",
    );
    return false;
  }
  if (closingRef.current) return false;
  closingRef.current = true;
  setClosing(true);
  const isCurrent = captureNavigation();
  const version = readCurrentSnapshot().version;
  try {
    // Drain earlier reader writes before flushing the final position. Closing
    // unmounts the workspace, cancelling its timers/listeners without writing
    // an empty document over reader memory or recovery snapshots.
    await Promise.allSettled([...pendingReaderWrites.current]);
    if (
      !isCurrent() ||
      readCurrentSnapshot().version !== version ||
      readCurrentSnapshot().isDirty
    )
      return false;
    await window.sensibleMD?.saveDocumentState?.(createReaderStatePayload({
      documentId: activeDocumentId,
      bookmarks,
      activeHeading,
      semanticDocument,
      activeNodeId,
      fontScale,
      lineHeight,
      contentWidth,
      reducedMotion,
    }));
    if (
      !isCurrent() ||
      readCurrentSnapshot().version !== version ||
      readCurrentSnapshot().isDirty
    )
      return false;
    completed();
    return true;
  } catch {
    setAppStatus(
      "Reader state could not be saved. The document is still open.",
    );
    return false;
  } finally {
    closingRef.current = false;
    setClosing(false);
  }
}
