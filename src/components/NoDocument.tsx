import { useCallback, useEffect, useRef, useState } from 'react'
import { asDocumentId, asSessionId, browserDocumentId, type DocumentId, type SessionId } from '../core/identity'

export interface OpenedReaderDocument { id: DocumentId; source: string; name: string; sessionId: SessionId | null; canSaveDirectly: boolean }

export function NoDocument({ onOpen }: { onOpen: (file: OpenedReaderDocument) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const pending = useRef(false)
  const [status, setStatus] = useState('')
  const [recents, setRecents] = useState<Array<{ index: number; name: string }>>([])
  useEffect(() => {
    let active = true
    void window.sensibleMD?.listRecentDocuments?.().then((items) => { if (active) setRecents(items) }).catch(() => { if (active) setStatus('Recent files are unavailable.') })
    return () => { active = false }
  }, [])
  const openRecent = async (index: number) => {
    if (pending.current) return
    pending.current = true
    try {
      const file = await window.sensibleMD?.openRecentDocument?.(index)
      if (file) onOpen({ id: asDocumentId(file.documentId), source: file.source, name: file.name, sessionId: asSessionId(file.sessionId), canSaveDirectly: true })
      else setStatus('That recent file is no longer available.')
    } catch { setStatus('The recent file could not be opened.') }
    finally { pending.current = false }
  }
  const open = useCallback(async () => {
    if (pending.current) return
    const nativeOpen = window.sensibleMD?.openDocument
    if (!nativeOpen) { input.current?.click(); return }
    pending.current = true
    try {
      const file = await nativeOpen()
      if (file) onOpen({ id: asDocumentId(file.documentId), source: file.source, name: file.name, sessionId: asSessionId(file.sessionId), canSaveDirectly: true })
    } catch { setStatus('The Markdown file could not be opened.') }
    finally { pending.current = false }
  }, [onOpen])
  useEffect(() => { button.current?.focus() }, [])
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); void open() }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [open])
  return <div className="app-shell" data-dirty="false">
    <header className="topbar"><div className="brand">SensibleMD</div></header>
    <main className="empty-state"><h1>No document open</h1><button ref={button} type="button" onClick={() => void open()} aria-label="Open Markdown file">Open Markdown file</button>
      <input ref={input} className="visually-hidden" type="file" accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain" onChange={(event) => {
        const file = event.target.files?.[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = () => onOpen({ id: browserDocumentId(file), source: String(reader.result), name: file.name, sessionId: null, canSaveDirectly: false })
        reader.onerror = () => setStatus('The Markdown file could not be opened.')
        reader.readAsText(file)
        event.target.value = ''
      }} />
      {recents.length > 0 && <nav aria-label="Recent documents">{recents.map((recent) => <button key={recent.index} type="button" onClick={() => void openRecent(recent.index)}>Open recent {recent.name}</button>)}</nav>}
      <p className="app-status" role="status">{status}</p>
    </main>
  </div>
}
