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

import { SPLIT_ANCHOR, type SplitEditor } from "../core/split-sync";

const projectedSelection = Annotation.define<boolean>();

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  cursorLine: number;
  onCursorLineChange: (line: number) => void;
  onPromoteHeading: () => void;
  onDemoteHeading: () => void;
  jumpToLine: number | null;
  jumpIsCurrent?: () => boolean;
  navigationJump?: { line: number; isCurrent: () => boolean } | null;
  onScrollAdapter?: (editor: SplitEditor | null) => void;
  onNavigate?: (offset: number, source: string) => void;
  onObserveCursor?: (offset: number, source: string) => void;
}

export function MarkdownEditor({
  value,
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
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);

  const callbacks = useRef({
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
    const state = EditorState.create({
      doc: value,
      extensions: [
        history(),
        markdown(),
        keymap.of([
          {
            key: "Mod-Alt-ArrowUp",
            run: () => {
              callbacks.current.onPromoteHeading();
              return true;
            },
          },
          {
            key: "Mod-Alt-ArrowDown",
            run: () => {
              callbacks.current.onDemoteHeading();
              return true;
            },
          },
          ...defaultKeymap,
          ...historyKeymap,
          indentWithTab,
        ]),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            currentSource.current = update.state.doc.toString();
            callbacks.current.onChange(currentSource.current);
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
      offsetAtAnchor: () => editor.lineBlockAtHeight(
        editor.scrollDOM.getBoundingClientRect().top + editor.scrollDOM.clientHeight * SPLIT_ANCHOR - editor.documentTop,
      ).from,
      reveal: (offset) => editor.dispatch({ effects: EditorView.scrollIntoView(
        Math.max(0, Math.min(offset, editor.state.doc.length)),
        { y: "start", yMargin: editor.scrollDOM.clientHeight * SPLIT_ANCHOR },
      ) }),
    });
    return () => { registerScrollAdapter?.(null); editor.destroy(); view.current = null; };
  }, []);

  useEffect(() => {
    const editor = view.current;
    if (!editor || editor.state.doc.toString() === value) return;
    editor.dispatch({
      changes: { from: 0, to: editor.state.doc.length, insert: value },
    });
  }, [value]);

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
          onClick={onPromoteHeading}
          aria-label="Promote heading"
          title="Promote heading (Cmd/Ctrl+Alt+Up)"
        >
          <ArrowUp size={15} />
          <Heading size={15} />
        </button>
        <button
          type="button"
          onClick={onDemoteHeading}
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
