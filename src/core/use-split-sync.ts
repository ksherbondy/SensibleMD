import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { connectSplit, type SplitEditor } from './split-sync';
import type { SemanticDocument, SemanticNode } from './semantic-document';

export function useSplitSync(enabled: boolean, documentId: string, document: SemanticDocument, work: Parameters<typeof connectSplit>[3], onObserve: (node: SemanticNode) => void) {
  const [editor, setEditor] = useState<SplitEditor | null>(null);
  const controller = useRef<ReturnType<typeof connectSplit> | null>(null);
  const pending = useRef<{ offset: number; source: string } | null>(null);
  const observe = useRef(onObserve);
  useLayoutEffect(() => { observe.current = onObserve; });
  useLayoutEffect(() => {
    if (!enabled) { pending.current = null; return; }
    const preview = window.document.querySelector<HTMLElement>('.authoring-preview');
    if (!enabled || !editor || !preview) return;
    const bridge = connectSplit(document, editor, preview, work, node => observe.current(node));
    controller.current = bridge;
    if (pending.current?.source === document.source) bridge.navigate(pending.current.offset);
    pending.current = null;
    return () => { bridge.dispose(); if (controller.current === bridge) controller.current = null; };
  }, [enabled, documentId, editor, document, work]);
  const onNavigate = useCallback((offset: number, source: string) => {
    if (!enabled || source !== document.source) return;
    if (controller.current) controller.current.navigate(offset);
    else pending.current = { offset, source };
  }, [enabled, document]);
  return { setEditor, onNavigate };
}
