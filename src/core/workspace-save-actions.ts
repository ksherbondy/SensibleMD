interface DirectSaveInputs {
  savedDocumentId: string;
  savedVersion: number;
  source: string;
  saveOpenedDocument: (payload: { source: string }) => Promise<unknown>;
  readCurrentVersion: () => number;
  markSaved: () => void;
  setIsDirty: (dirty: boolean) => void;
  setAppStatus: (status: string) => void;
  clearSavedRecovery: (documentId: string) => Promise<void>;
}

// Return the entire existing disk-save + cleanup chain for workspace tracking.
// Keep invocation synchronous, including any synchronous API exception.
export function saveWorkspaceDocumentDirectly({
  savedDocumentId, savedVersion, source, saveOpenedDocument, readCurrentVersion,
  markSaved, setIsDirty, setAppStatus, clearSavedRecovery,
}: DirectSaveInputs): Promise<void> {
  return saveOpenedDocument({ source })
    .then(async () => {
      if (readCurrentVersion() !== savedVersion) {
        setAppStatus(
          "Saved the earlier version. Newer changes remain open.",
        );
        return;
      }
      markSaved();
      setIsDirty(false);
      setAppStatus("Saved.");
      await clearSavedRecovery(savedDocumentId);
    })
    .catch(() =>
      setAppStatus(
        "The file could not be saved. Your edits are still open.",
      ),
    );
}
