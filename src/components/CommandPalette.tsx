import { useEffect, useRef, useState } from 'react'
import { Command, X } from 'lucide-react'
import { matchCommands, type CommandDefinition } from '../core/commands'

interface CommandPaletteProps { commands: CommandDefinition[]; onClose: () => void }

export function CommandPalette({ commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const results = matchCommands(commands, query)

  useEffect(() => { input.current?.focus() }, [])
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return <div className="command-overlay" role="presentation" onMouseDown={onClose}><section className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event) => event.stopPropagation()}><header><Command size={18} /><label className="visually-hidden" htmlFor="command-search">Search commands</label><input ref={input} id="command-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search commands" /><button type="button" aria-label="Close command palette" onClick={onClose}><X size={17} /></button></header><div className="command-results">{results.length ? results.map((command) => <button type="button" key={command.id} disabled={!command.enabled} title={command.disabledReason} onClick={() => { command.execute(); onClose() }}><span><strong>{command.title}</strong><small>{command.id}</small></span>{command.shortcut && <kbd>{command.shortcut}</kbd>}{!command.enabled && <em>{command.disabledReason}</em>}</button>) : <p>No commands match “{query}”.</p>}</div></section></div>
}