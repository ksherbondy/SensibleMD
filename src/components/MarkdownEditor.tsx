import { useEffect, useLayoutEffect, useRef } from 'react'
import { Annotation, EditorState } from '@codemirror/state'
import { keymap, EditorView } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { ArrowDown, ArrowUp, Heading } from 'lucide-react'

const projectedSelection = Annotation.define<boolean>()

interface MarkdownEditorProps { value: string; onChange: (value: string) => void; cursorLine: number; onCursorLineChange: (line: number) => void; onPromoteHeading: () => void; onDemoteHeading: () => void; jumpToLine: number | null; jumpIsCurrent?: () => boolean; navigationJump?: { line: number; isCurrent: () => boolean } | null; onObserveCursor?: (offset: number, source: string) => void }

export function MarkdownEditor({ value, onChange, cursorLine, onCursorLineChange, onPromoteHeading, onDemoteHeading, jumpToLine, jumpIsCurrent, navigationJump, onObserveCursor }: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

  const callbacks = useRef({ onChange, onCursorLineChange, onObserveCursor, onPromoteHeading, onDemoteHeading })
  useLayoutEffect(() => { callbacks.current = { onChange, onCursorLineChange, onObserveCursor, onPromoteHeading, onDemoteHeading } })

  useEffect(() => {
    if (!host.current) return
    const state = EditorState.create({
      doc: value,
      extensions: [history(), markdown(), keymap.of([{ key: 'Mod-Alt-ArrowUp', run: () => { callbacks.current.onPromoteHeading(); return true } }, { key: 'Mod-Alt-ArrowDown', run: () => { callbacks.current.onDemoteHeading(); return true } }, ...defaultKeymap, ...historyKeymap, indentWithTab]), EditorView.lineWrapping, EditorView.updateListener.of((update) => { if (update.docChanged) callbacks.current.onChange(update.state.doc.toString()); if (update.selectionSet) callbacks.current.onCursorLineChange(update.state.doc.lineAt(update.state.selection.main.head).number); if (update.selectionSet && !update.docChanged && !update.transactions.some((transaction) => transaction.annotation(projectedSelection))) callbacks.current.onObserveCursor?.(update.state.selection.main.head, update.state.doc.toString()) })],
    })
    view.current = new EditorView({ state, parent: host.current })
    return () => view.current?.destroy()
  }, [])

  useEffect(() => {
    const editor = view.current
    if (!editor || editor.state.doc.toString() === value) return
    editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } })
  }, [value])

  useEffect(() => {
    const editor = view.current
    if (!editor || jumpToLine === null || (jumpIsCurrent && !jumpIsCurrent())) return
    const line = editor.state.doc.line(Math.min(jumpToLine, editor.state.doc.lines))
    editor.dispatch({ annotations: projectedSelection.of(true), selection: { anchor: line.from }, scrollIntoView: true })
    editor.focus()
  }, [jumpToLine, jumpIsCurrent])

  useEffect(() => {
    const editor = view.current
    if (!editor || !navigationJump || !navigationJump.isCurrent()) return
    const line = editor.state.doc.line(Math.max(1, Math.min(navigationJump.line, editor.state.doc.lines)))
    editor.dispatch({ annotations: projectedSelection.of(true), selection: { anchor: line.from }, scrollIntoView: true })
    editor.focus()
  }, [navigationJump])

  return <section className="editor-shell" aria-label="Markdown source editor"><div className="editor-command-bar"><span>Line {cursorLine}</span><span>Heading</span><button type="button" onClick={onPromoteHeading} aria-label="Promote heading" title="Promote heading (Cmd/Ctrl+Alt+Up)"><ArrowUp size={15} /><Heading size={15} /></button><button type="button" onClick={onDemoteHeading} aria-label="Demote heading" title="Demote heading (Cmd/Ctrl+Alt+Down)"><ArrowDown size={15} /><Heading size={15} /></button></div><div className="markdown-editor" ref={host} /></section>
}