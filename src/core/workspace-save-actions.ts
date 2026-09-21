import type { NativeSaveBinding } from "./use-native-save-binding";
import type { CollectionDocument } from "./document-collection";
import { asDocumentId, asSessionId, type DocumentId } from "./identity";

interface DirectSaveInputs {
  savedDocumentId: string;
  savedSessionId: string;
  ownsBinding: () => boolean;
  revokeBinding: () => void;
  savedVersion: number;
  source: string;
  saveOpenedDocument: NonNullable<Window["sensibleMD"]>["saveOpenedDocument"];
  readCurrentVersion: () => number;
  markSaved: () => { isDirty: boolean };
  setIsDirty: (dirty: boolean) => void;
  setAppStatus: (status: string) => void;
  clearSavedRecovery: (documentId: string) => Promise<void>;
}

// Return the entire existing disk-save + cleanup chain for workspace tracking.
// Keep invocation synchronous, including any synchronous API exception.
export function saveWorkspaceDocumentDirectly({
  savedDocumentId, savedSessionId, savedVersion, source, saveOpenedDocument, readCurrentVersion,
  ownsBinding, revokeBinding,
  markSaved, setIsDirty, setAppStatus, clearSavedRecovery,
}: DirectSaveInputs): Promise<void> {
  return saveOpenedDocument({ documentId: savedDocumentId, sessionId: savedSessionId, source })
    .then(async (result) => {
      if ("error" in result) {
        if (ownsBinding()) {
          revokeBinding();
          setAppStatus("The file could not be saved. Your edits are still open.");
        }
        return;
      }
      if (readCurrentVersion() !== savedVersion) {
        setAppStatus(
          "Saved the earlier version. Newer changes remain open.",
        );
        return;
      }
      if (!ownsBinding()) return;
      const saved = markSaved();
      setIsDirty(saved.isDirty);
      setAppStatus("Saved.");
      await clearSavedRecovery(savedDocumentId);
    })
    .catch(() => {
      if (ownsBinding()) setAppStatus(
        "The file could not be saved. Your edits are still open.",
      );
    });
}

interface SaveAsInputs {
  savedDocumentId: DocumentId;
  savedVersion: number;
  documentName: string;
  source: string;
  saveNativeDocument: (payload: { name: string; source: string }) => Promise<{
    documentId: string;
    sessionId: string;
    name: string;
  } | null>;
  ownsActivation: () => boolean;
  readCurrentSnapshot: () => { text: string; version: number; isDirty: boolean };
  setCollection: (update: (documents: CollectionDocument[]) => CollectionDocument[]) => void;
  setActiveDocumentId: (documentId: DocumentId) => void;
  installBinding: (binding: NativeSaveBinding) => void;
  setDocumentName: (name: string) => void;
  markSaved: () => { isDirty: boolean };
  setIsDirty: (dirty: boolean) => void;
  clearRecoveryNotice: () => void;
  refreshRecentDocuments: () => void;
  setAppStatus: (status: string) => void;
  clearSavedRecovery: (documentId: string) => Promise<void>;
}

// Workspace owns activation authority and tracks this entire completion/cleanup chain.
export function saveWorkspaceDocumentAs({
  savedDocumentId, savedVersion, documentName, source, saveNativeDocument,
  ownsActivation, readCurrentSnapshot, setCollection, setActiveDocumentId,
  installBinding, setDocumentName, markSaved, setIsDirty,
  clearRecoveryNotice, refreshRecentDocuments, setAppStatus, clearSavedRecovery,
}: SaveAsInputs): Promise<void> {
  return saveNativeDocument({ name: documentName, source })
    .then(async (file) => {
      // The file may already be saved; stale results cannot adopt renderer
      // identity or clear recovery belonging to a departed activation.
      if (!file || !ownsActivation()) return;
      const newId = asDocumentId(file.documentId);
      const current = readCurrentSnapshot();
      const clean = current.version === savedVersion;
      setCollection((documents) => documents
        .filter((document) => document.id !== newId || document.id === savedDocumentId)
        .map((document) => document.id === savedDocumentId
          ? { ...document, id: newId, name: file.name, source: current.text }
          : document));
      setActiveDocumentId(newId);
      installBinding({ documentId: newId, sessionId: asSessionId(file.sessionId) });
      setDocumentName(file.name);
      const saved = clean ? markSaved() : current;
      setIsDirty(saved.isDirty);
      clearRecoveryNotice();
      refreshRecentDocuments();
      setAppStatus(clean ? "Saved." : "Saved the earlier version. Newer changes remain open.");
      // The normal debounce writes recovery under newId only when dirty.
      await clearSavedRecovery(savedDocumentId);
    })
    .catch(() => {
      if (ownsActivation()) setAppStatus(
        "The file could not be saved. Your edits are still open.",
      );
    });
}
