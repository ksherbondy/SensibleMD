import { useLayoutEffect, useRef } from 'react';

type Snapshot = { documentId: string; version: number; isDirty: boolean };
type Lifecycle = {
  snapshot: () => Snapshot;
  saving: () => boolean;
  save: () => Promise<void>;
  discard: (snapshot: Snapshot) => Promise<boolean>;
  status: (message: string) => void;
};

/** No mirrored dirty state: the unload decision reads the live DocumentBuffer. */
export function useWindowClose(lifecycle: Lifecycle) {
  const latest = useRef(lifecycle);
  useLayoutEffect(() => { latest.current = lifecycle; });
  useLayoutEffect(() => {
    const api = window.sensibleMD;
    if (!api?.onWindowCloseDecision || !api.completeWindowClose) return;
    let active = true;
    let busy = false;
    let requested: Snapshot | null = null;
    let discarded: Snapshot | null = null;
    const matches = (a: Snapshot, b: Snapshot) => a.documentId === b.documentId && a.version === b.version;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      const current = latest.current.snapshot();
      if (discarded && matches(discarded, current) && !latest.current.saving()) {
        // This legacy cache also contains source; explicit discard must not restore it.
        try {
          localStorage.removeItem('sensiblemd-document');
          return;
        } catch {
          latest.current.status('Discarded changes could not be removed from the local cache. The window remains open.');
          event.preventDefault();
          event.returnValue = false as unknown as string;
          return;
        }
      }
      if (!current.isDirty && !latest.current.saving()) return;
      requested ??= current;
      event.preventDefault();
      event.returnValue = false as unknown as string;
    };
    window.addEventListener('beforeunload', beforeUnload);
    const unsubscribe = api.onWindowCloseDecision((request) => {
      if (busy) return;
      busy = true;
      void (async () => {
        let allow = false;
        const original = requested;
        try {
          if (request.choice === 'cancel' || !original) return;
          if (!matches(original, latest.current.snapshot())) {
            latest.current.status('The document changed while closing. Try closing again.');
            return;
          }
          if (request.choice === 'save') {
            await latest.current.save();
            allow = active && !latest.current.snapshot().isDirty && !latest.current.saving();
          } else if (request.choice === 'discard') {
            if (latest.current.saving()) {
              latest.current.status('A save is still in progress. Try closing again when it finishes.');
              return;
            }
            allow = await latest.current.discard(original);
            if (active && allow && matches(original, latest.current.snapshot())) discarded = original;
            else allow = false;
          }
        } catch {
          latest.current.status('The window could not be closed. Your edits are still open.');
        } finally {
          requested = null;
          busy = false;
          if (active) api.completeWindowClose!(request.id, allow);
        }
      })();
    });
    return () => { active = false; unsubscribe(); window.removeEventListener('beforeunload', beforeUnload); };
  }, []);
}
