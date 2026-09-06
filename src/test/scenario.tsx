import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { EditorView } from '@codemirror/view'
import App from '../App'
import { FakeDesktop } from './electron-double'
import { CallScheduler } from './scheduler'

export interface ScenarioOptions {
  desktop?: FakeDesktop
  /** Seed browser storage before the application reads it during mount. */
  storage?: Record<string, string>
}

export interface Scenario {
  readonly desktop: FakeDesktop
  readonly scheduler: CallScheduler
  readonly user: UserEvent
  /** Let queued microtasks and effects settle. */
  settle: () => Promise<void>
  unmount: () => void

  documentName: () => string
  isDirty: () => boolean
  status: () => string
  chapterNames: () => string[]
  outlineHeadings: () => string[]

  openDocument: () => Promise<void>
  save: () => Promise<void>
  enterMode: (mode: 'Read' | 'Write' | 'Split') => Promise<void>
  setEditorSource: (source: string) => Promise<void>
  appendToEditor: (text: string) => Promise<void>
  switchChapter: (name: string) => Promise<void>
  restoreRecovery: () => Promise<void>
  discardRecovery: () => Promise<void>
  reloadFromDisk: () => Promise<void>
}

function requireShell() {
  const shell = document.querySelector('.app-shell')
  if (!shell) throw new Error('Application shell is not mounted')
  return shell
}

function editorView() {
  const host = document.querySelector('.markdown-editor .cm-editor')
  if (!(host instanceof HTMLElement)) throw new Error('Source editor is not mounted. Call enterMode("Write") or enterMode("Split") first.')
  const view = EditorView.findFromDOM(host)
  if (!view) throw new Error('Source editor is mounted but has no CodeMirror view')
  return view
}

export async function startScenario(options: ScenarioOptions = {}): Promise<Scenario> {
  const desktop = options.desktop ?? new FakeDesktop()
  for (const [key, value] of Object.entries(options.storage ?? {})) localStorage.setItem(key, value)
  desktop.install()

  const user = userEvent.setup()
  const view = render(<App />)
  const settle = async () => { await act(async () => { await Promise.resolve() }) }
  await settle()

  const clickByName = async (name: string | RegExp) => {
    await user.click(screen.getByRole('button', { name }))
    await settle()
  }

  const dispatchToEditor = async (transaction: Parameters<EditorView['dispatch']>[0]) => {
    const editor = editorView()
    await act(async () => { editor.dispatch(transaction) })
    await settle()
  }

  return {
    desktop,
    scheduler: desktop.scheduler,
    user,
    settle,
    unmount: () => { view.unmount(); desktop.uninstall() },

    documentName: () => requireShell().querySelector('.document-title > span')?.textContent ?? '',
    isDirty: () => requireShell().getAttribute('data-dirty') === 'true',
    status: () => document.querySelector('.app-status')?.textContent ?? '',
    chapterNames: () => Array.from(document.querySelectorAll('.chapter-list button')).map((button) => button.textContent?.replace(/^\d+/, '') ?? ''),
    outlineHeadings: () => Array.from(document.querySelectorAll('.outline-item')).map((button) => button.textContent ?? ''),

    openDocument: () => clickByName('Open Markdown file'),
    save: () => clickByName('Save Markdown file'),

    enterMode: async (mode) => {
      const group = screen.getByRole('group', { name: 'Document mode' })
      await user.click(within(group).getByRole('button', { name: mode }))
      await settle()
      if (mode !== 'Read') await waitFor(() => editorView())
    },

    setEditorSource: async (source) => {
      const editor = editorView()
      await dispatchToEditor({ changes: { from: 0, to: editor.state.doc.length, insert: source } })
    },

    appendToEditor: async (text) => {
      const editor = editorView()
      await dispatchToEditor({ changes: { from: editor.state.doc.length, insert: text } })
    },

    switchChapter: async (name) => {
      const nav = screen.getByRole('navigation', { name: 'Collection chapters' })
      await user.click(within(nav).getByRole('button', { name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }))
      await settle()
    },

    restoreRecovery: () => clickByName('Restore changes'),
    discardRecovery: () => clickByName('Discard recovery'),
    reloadFromDisk: () => clickByName('Reload from disk'),
  }
}
