import { useLayoutEffect, useState } from "react";

interface NavigationContext {
  documentId: string;
  source: string;
}
interface PendingProjection {
  context: NavigationContext;
  revision: number;
  cancelled: boolean;
  entered: boolean;
}
const sameContext = (a: NavigationContext, b: NavigationContext) =>
  a.documentId === b.documentId && a.source === b.source;

// Local lifetime/revision guard, not a second navigation location. Invalidated
// work stays invalid even if the user later returns to identical source/IDs.
class NavigationWork {
  private context: NavigationContext;
  private revision = 0;
  private passiveRevision = 0;
  private alive = false;
  private pending = new Set<PendingProjection>();
  constructor(context: NavigationContext) {
    this.context = context;
  }
  commit(context: NavigationContext) {
    this.alive = true;
    if (sameContext(context, this.context)) return;
    this.context = context;
    for (const work of this.pending) {
      // An intermediate commit may precede a newer queued destination. Only
      // leaving a context the request actually entered permanently revokes it.
      if (sameContext(work.context, context)) work.entered = true;
      else if (work.entered) work.cancelled = true;
    }
  }
  invalidate() {
    this.revision += 1;
  }
  interruptCurrentContext() {
    // User interaction takes ownership of this surface/document only. It must
    // not revoke a newer projection awaiting another document's commit.
    this.passiveRevision += 1;
    for (const work of this.pending)
      if (sameContext(work.context, this.context)) work.cancelled = true;
  }
  capture() {
    const context = this.context;
    const revision = this.revision;
    const passiveRevision = this.passiveRevision;
    return () =>
      this.alive &&
      this.context === context &&
      this.revision === revision &&
      this.passiveRevision === passiveRevision;
  }
  schedule(callback: () => void, context: NavigationContext) {
    const work = {
      context,
      revision: this.revision,
      cancelled: false,
      entered: sameContext(context, this.context),
    };
    this.pending.add(work);
    requestAnimationFrame(() => {
      this.pending.delete(work);
      if (
        this.alive &&
        !work.cancelled &&
        work.revision === this.revision &&
        sameContext(work.context, this.context)
      )
        callback();
    });
  }
  dispose() {
    this.alive = false;
    this.invalidate();
    for (const work of this.pending) work.cancelled = true;
    this.pending.clear();
  }
}

export function useNavigationWork(documentId: string, source: string) {
  const [work] = useState(() => new NavigationWork({ documentId, source }));
  useLayoutEffect(() => {
    work.commit({ documentId, source });
  }, [work, documentId, source]);
  useLayoutEffect(() => () => work.dispose(), [work]);
  return work;
}
