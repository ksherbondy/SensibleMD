import { useEffect, useLayoutEffect, useRef } from "react";
import { Annotation, EditorState } from "@codemirror/state";
import { keymap, EditorView } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { ArrowDown, ArrowUp, Heading } from "lucide-react";

import type { EditorActivation, EditorMutationOrigin } from "../core/editor-mutation-ownership";

import { SPLIT_ANCHOR, type SplitEditor } from "../core/split-sync";

const projectedSource = Annotation.define<boolean>();
const projectedSelection = Annotation.define<boolean>();

interface MarkdownEditorProps {
  value: string;
  activation: EditorActivation;
  isActivationCurrent: (activation: EditorActivation) => boolean;
  onChange: (value: string, origin: EditorMutationOrigin) => void;
  cursorLine: number;
  onCursorLineChange: (line: number) => void;
  onPromoteHeading: (origin: EditorMutationOrigin) => void;
  onDemoteHeading: (origin: EditorMutationOrigin) => void;
  jumpToLine: number | null;
  jumpIsCurrent?: () => boolean;
  navigationJump?: { line: number; isCurrent: () => boolean } | null;
  onScrollAdapter?: (editor: SplitEditor | null) => void;
  onNavigate?: (offset: number, source: string) => void;
  onObserveCursor?: (offset: number, source: string) => void;
}

export function MarkdownEditor({
  value,
  activation,
  isActivationCurrent,
  onChange,
  cursorLine,
  onCursorLineChange,
  onPromoteHeading,
  onDemoteHeading,
  jumpToLine,
  jumpIsCurrent,
  navigationJump,
  onObserveCursor,
  onScrollAdapter,
  onNavigate,
}: MarkdownEditorProps) {
  const currentSource = useRef(value);
  const contentOrigin = useRef<EditorMutationOrigin | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  const callbacks = useRef({
    isActivationCurrent,
    onNavigate,
    onScrollAdapter,
    onChange,
    onCursorLineChange,
    onObserveCursor,
    onPromoteHeading,
    onDemoteHeading,
  });
  useLayoutEffect(() => {
    callbacks.current = {
      isActivationCurrent,
      onNavigate,
      onScrollAdapter,
      onChange,
      onCursorLineChange,
      onObserveCursor,
      onPromoteHeading,
      onDemoteHeading,
    };
  });

  useEffect(() => {
    if (!host.current) return;
    const lease = { live: true };
    contentOrigin.current = { activation, lease };
    const originForThisView = () => {
      const origin = contentOrigin.current;
      return origin?.lease === lease && lease.live &&
        callbacks.current.isActivationCurrent(origin.activation) ? origin : null;
    };
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        markdown(),
        keymap.of([
          {
            key: "Mod-Alt-ArrowUp",
            run: () => {
              const origin = originForThisView();
              if (origin) callbacks.current.onPromoteHeading(origin);
              return true;
            },
          },
          {
            key: "Mod-Alt-ArrowDown",
            run: () => {
              const origin = originForThisView();
              if (origin) callbacks.current.onDemoteHeading(origin);
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          const origin = originForThisView();
          if (!origin) return;
          if (update.docChanged) {
            currentSource.current = update.state.doc.toString();
            if (!update.transactions.some(transaction => transaction.annotation(projectedSource)))
              callbacks.current.onChange(currentSource.current, origin);
          }
          if (update.selectionSet)
            callbacks.current.onCursorLineChange(
              update.state.doc.lineAt(update.state.selection.main.head).number,
            );
          if (
            update.selectionSet &&
            !update.docChanged &&
            !update.transactions.some((transaction) =>
              transaction.annotation(projectedSelection),
            )
          )
            callbacks.current.onObserveCursor?.(
              update.state.selection.main.head,
              update.state.doc.toString(),
            );
        }),
      ],
    });
    const editor = new EditorView({ state, parent: host.current });
    view.current = editor;
    const registerScrollAdapter = callbacks.current.onScrollAdapter;
    registerScrollAdapter?.({
      scrollDOM: editor.scrollDOM,
      source: () => currentSource.current,
      offsetAtAnchor: () =>
        editor.lineBlockAtHeight(
          editor.scrollDOM.getBoundingClientRect().top +
            editor.scrollDOM.clientHeight * SPLIT_ANCHOR -
            editor.documentTop,
        ).from,
      reveal: (offset) =>
        editor.dispatch({
          effects: EditorView.scrollIntoView(
            Math.max(0, Math.min(offset, editor.state.doc.length)),
            {
              y: "start",
              yMargin: editor.scrollDOM.clientHeight * SPLIT_ANCHOR,
            },
          ),
        }),
    });
    return () => {
      lease.live = false;
      registerScrollAdapter?.(null);
      editor.destroy();
      view.current = null;
    };
  }, []);

  useEffect(() => {
    const editor = view.current;
    const origin = contentOrigin.current;
    if (!editor || !origin?.lease.live || !callbacks.current.isActivationCurrent(activation)) return;
    // Callback props commit before this effect. Do not grant the new activation
    // to old editor content until its source is projected, even for equal text.
    contentOrigin.current = { activation, lease: origin.lease };
    currentSource.current = value;
    if (editor.state.doc.toString() === value) return;
    editor.dispatch({
      annotations: projectedSource.of(true),
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  }, [value, activation]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || jumpToLine === null || (jumpIsCurrent && !jumpIsCurrent()))
      return;
    const line = editor.state.doc.line(
      Math.min(jumpToLine, editor.state.doc.lines),
    );
    editor.dispatch({
      annotations: projectedSelection.of(true),
      selection: { anchor: line.from },
      scrollIntoView: true,
    });
    editor.focus();
    callbacks.current.onNavigate?.(line.from, currentSource.current);
  }, [jumpToLine, jumpIsCurrent]);

  useEffect(() => {
    const editor = view.current;
    if (!editor || !navigationJump || !navigationJump.isCurrent()) return;
    const line = editor.state.doc.line(
      Math.max(1, Math.min(navigationJump.line, editor.state.doc.lines)),
    );
    editor.dispatch({
      annotations: projectedSelection.of(true),
      selection: { anchor: line.from },
      scrollIntoView: true,
    });
    editor.focus();
    callbacks.current.onNavigate?.(line.from, currentSource.current);
  }, [navigationJump]);

  return (
    <section className="editor-shell" aria-label="Markdown source editor">
      <div className="editor-command-bar">
        <span>Line {cursorLine}</span>
        <span>Heading</span>
        <button
          type="button"
          onClick={() => {
            const origin = contentOrigin.current;
            if (origin?.lease.live && isActivationCurrent(origin.activation)) onPromoteHeading(origin);
          }}
          aria-label="Promote heading"
          title="Promote heading (Cmd/Ctrl+Alt+Up)"
        >
          <ArrowUp size={15} />
          <Heading size={15} />
        </button>
        <button
          type="button"
          onClick={() => {
            const origin = contentOrigin.current;
            if (origin?.lease.live && isActivationCurrent(origin.activation)) onDemoteHeading(origin);
          }}
          aria-label="Demote heading"
          title="Demote heading (Cmd/Ctrl+Alt+Down)"
        >
          <ArrowDown size={15} />
          <Heading size={15} />
        </button>
      </div>
      <div className="markdown-editor" ref={host} />
    </section>
  );
}
