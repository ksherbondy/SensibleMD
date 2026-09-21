import { useRef, useState } from "react";
import type { DocumentId, SessionId } from "./identity";

export interface NativeSaveBinding {
  readonly documentId: DocumentId;
  readonly sessionId: SessionId;
}

// Authority changes synchronously; React receives its rendering projection.
// No persistence, activation policy, effects or native authorization ownership.
export function useNativeSaveBinding(initial: NativeSaveBinding | null) {
  const [binding, setBinding] = useState(initial);
  const current = useRef(binding);
  const installBinding = (next: NativeSaveBinding) => {
    current.current = next;
    setBinding(next);
  };
  const revokeBinding = () => {
    current.current = null;
    setBinding(null);
  };
  return { binding, readBinding: () => current.current, installBinding, revokeBinding };
}
