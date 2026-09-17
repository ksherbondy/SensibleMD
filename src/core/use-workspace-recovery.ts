import { useEffect, useLayoutEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";

type RecoveryNotice = { source: string; savedAt: string } | null;
type RecoveryContext = { documentId: string; revision: number };

interface RecoveryInputs {
  activeDocumentId: string;
  setAppStatus: (status: string) => void;
}

// Register at the original context/state location, before workspace consumers.
export function useWorkspaceRecovery({ activeDocumentId, setAppStatus }: RecoveryInputs) {
  const recoveryContext = useRef({ documentId: activeDocumentId, revision: 0 });
  const [recoverySnapshot, setRecoverySnapshot] = useState<{
    source: string;
    savedAt: string;
  } | null>(null);
  useLayoutEffect(() => {
    recoveryContext.current = { documentId: activeDocumentId, revision: 0 };
    setRecoverySnapshot(null);
  }, [activeDocumentId]);
  const clearRecovery = async (documentId: string) => {
    const context = recoveryContext.current;
    const revision = context.documentId === documentId ? ++context.revision : context.revision;
    if (!window.sensibleMD?.clearRecoverySnapshot) throw new Error("Recovery clearing unavailable");
    await window.sensibleMD.clearRecoverySnapshot(documentId);
    if (recoveryContext.current === context && context.documentId === documentId && context.revision === revision) setRecoverySnapshot(null);
  };
  const clearSavedRecovery = async (documentId: string) => {
    try {
      await clearRecovery(documentId);
    } catch {
      setAppStatus("Saved, but recovery data could not be cleared. It may appear again when you reopen the document.");
    }
  };
  const discardRecovery = async () => {
    try {
      await clearRecovery(activeDocumentId);
    } catch {
      setAppStatus("Recovery could not be discarded. Please try again.");
    }
  };
  return { recoveryContext, recoverySnapshot, setRecoverySnapshot, clearRecovery, clearSavedRecovery, discardRecovery };
}

interface RecoveryLoadInputs extends RecoveryInputs {
  recoveryContext: RefObject<RecoveryContext>;
  setRecoverySnapshot: Dispatch<SetStateAction<RecoveryNotice>>;
  readCurrentSource: () => string;
}

// Keep this separate so loading retains its original passive-effect position.
export function useWorkspaceRecoveryLoad({
  activeDocumentId, recoveryContext, setRecoverySnapshot, readCurrentSource, setAppStatus,
}: RecoveryLoadInputs): void {
  useEffect(() => {
    const loadRecoverySnapshot = window.sensibleMD?.loadRecoverySnapshot;
    if (typeof loadRecoverySnapshot !== "function") return;
    const context = recoveryContext.current;
    const revision = context.revision;
    let current = true;
    void loadRecoverySnapshot(activeDocumentId)
      .then((snapshot) => {
        if (current && recoveryContext.current === context && context.revision === revision && snapshot?.source && snapshot.source !== readCurrentSource())
          setRecoverySnapshot(snapshot);
      })
      .catch(() => { if (current) setAppStatus("Recovery check is temporarily unavailable."); });
    return () => { current = false; };
  }, [activeDocumentId]);

}
