import { act, screen } from '@testing-library/react'
import { EditorView } from '@codemirror/view'
import { StateEffect } from '@codemirror/state'
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { startScenario } from './scenario'

const css = readFileSync('src/index.css', 'utf8')

const source = '# Start\n\n' + Array.from({ length: 400 }, (_, i) => `Paragraph ${i}.\n`).join('\n') + '\n## Final section\n\nLast reachable line.'

describe('DOG-003 editor scroll containers', () => {
  it.each(['Write', 'Split'] as const)('keeps the full source and native scroller in %s with navigation requesting reveal', async (mode) => {
    const s = await startScenario({ storage: { 'sensiblemd-document': source } })
    try {
      await s.enterMode(mode)
      const host = document.querySelector('.markdown-editor')!
      const editor = EditorView.findFromDOM(host.querySelector('.cm-editor')!)!
      expect(editor.scrollDOM).toHaveClass('cm-scroller')
      expect(host.contains(editor.scrollDOM)).toBe(true)
      expect(editor.state.doc.toString()).toBe(source)
      const scrollRequests: boolean[] = []
      await act(async () => editor.dispatch({ effects: StateEffect.appendConfig.of(EditorView.updateListener.of(update => {
        for (const transaction of update.transactions) if (transaction.selection) scrollRequests.push(transaction.scrollIntoView)
      })) }))
      if (mode === 'Split') {
        const preview = screen.getByRole('article', { name: 'Rendered Markdown preview' })
        expect(preview.contains(editor.scrollDOM)).toBe(false)
        expect(editor.scrollDOM.contains(preview)).toBe(false)
        expect(preview.parentElement).toBe(host.closest('.editor-layout'))
      }
      await s.clickOutlineHeading('Final section')
      await s.settleNavigation()
      expect(editor.state.doc.lineAt(editor.state.selection.main.head).text).toBe('## Final section')
      expect(scrollRequests).toContain(true)
      expect(s.isDirty()).toBe(false)
      expect(editor.state.doc.toString()).toBe(source)
    } finally { s.unmount() }
  })

  it('constrains the editor height and gives CodeMirror its own overflow container', () => {
    // CSS contract only: jsdom cannot prove scrollHeight, wheel motion or target visibility.
    expect(css).toMatch(/\.editor-shell\s*\{[^}]*min-height:\s*0/)
    expect(css).toMatch(/\.markdown-editor\s*\{[^}]*min-height:\s*0/)
    expect(css).toMatch(/\.markdown-editor \.cm-scroller\s*\{[^}]*overflow:\s*auto/)
    expect(css).not.toContain('min-height: calc(100svh - 172px)')
    expect(css).not.toContain('min-height: calc(100svh - 134px)')
  })
})
