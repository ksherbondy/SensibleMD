import { useEffect, useRef } from 'react'
import { EditorState } from '@codemirror/state'
import { keymap, EditorView } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { ArrowDown, ArrowUp, Heading } from 'lucide-react'

interface MarkdownEditorProps { value: string; onChange: (value: string) => void; cursorLine: number; onCursorLineChange: (line: number) => void; onPromoteHeading: () => void; onDemoteHeading: () => void; jumpToLine: number | null }

export function MarkdownEditor({ value, onChange, cursorLine, onCursorLineChange, onPromoteHeading, onDemoteHeading, jumpToLine }: MarkdownEditorProps) {
  const host = useRef<HTMLDivElement>(null)
  const view = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!host.current) return
    const state = EditorState.create({
      doc: value,
      extensions: [history(), markdown(), keymap.of([{ key: 'Mod-Alt-ArrowUp', run: () => { onPromoteHeading(); return true } }, { key: 'Mod-Alt-ArrowDown', run: () => { onDemoteHeading(); return true } }, ...defaultKeymap, ...historyKeymap, indentWithTab]), EditorView.lineWrapping, EditorView.updateListener.of((update) => { if (update.docChanged) onChange(update.state.doc.toString()); if (update.selectionSet) onCursorLineChange(update.state.doc.lineAt(update.state.selection.main.head).number) })],
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
    if (!editor || jumpToLine === null) return
    const line = editor.state.doc.line(Math.min(jumpToLine, editor.state.doc.lines))
    editor.dispatch({ selection: { anchor: line.from }, scrollIntoView: true })
    editor.focus()
  }, [jumpToLine])

  return <section className="editor-shell" aria-label="Markdown source editor"><div className="editor-command-bar"><span>Line {cursorLine}</span><span>Heading</span><button type="button" onClick={onPromoteHeading} aria-label="Promote heading" title="Promote heading (Cmd/Ctrl+Alt+Up)"><ArrowUp size={15} /><Heading size={15} /></button><button type="button" onClick={onDemoteHeading} aria-label="Demote heading" title="Demote heading (Cmd/Ctrl+Alt+Down)"><ArrowDown size={15} /><Heading size={15} /></button></div><div className="markdown-editor" ref={host} /></section>
}