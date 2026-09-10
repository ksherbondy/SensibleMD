import { screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { startScenario } from './scenario'

const css = readFileSync('src/index.css', 'utf8')
const source = '# Long document\n\n' + Array.from({ length: 150 }, (_, i) => `## Section ${i}\n\nParagraph ${i}.\n\n![Missing description](image.png)`).join('\n\n')

describe('DOG2-003 Split layout', () => {
  it('keeps editor, preview and findings as sibling grid items, including long documents', async () => {
    const s = await startScenario({ storage: { 'sensiblemd-document': source } })
    try {
      await s.enterMode('Split')
      const layout = screen.getByRole('region', { name: 'Markdown authoring' })
      const editor = within(layout).getByRole('region', { name: 'Markdown source editor' })
      const preview = within(layout).getByRole('article', { name: 'Rendered Markdown preview' })
      const findings = layout.querySelector('.findings-panel')!
      expect(layout).toHaveClass('split-layout')
      for (const pane of [editor, preview, findings]) expect(pane.parentElement).toBe(layout)
      expect(editor.querySelector('.cm-scroller')).toBeInTheDocument()
      expect(preview).toHaveTextContent('Paragraph 149.')
      expect(s.editorSource()).toBe(source)
      expect(s.isDirty()).toBe(false)
      await s.enterMode('Write')
      expect(layout).not.toHaveClass('split-layout')
      expect(screen.queryByRole('article', { name: 'Rendered Markdown preview' })).not.toBeInTheDocument()
      expect(layout.querySelector('.findings-panel')?.parentElement).toBe(layout)
      expect(s.editorSource()).toBe(source)
    } finally { s.unmount() }
  })
  it('defines one Split grid with bounded subordinate diagnostics and independent overflow', () => {
    // Source-level contracts: jsdom does not calculate grid geometry or scroll extents.
    expect(css).toContain('grid-template-areas: "editor preview" "findings findings"')
    expect(css).toContain('grid-template-rows: minmax(0, 1fr) minmax(0, min(120px, 20%))')
    expect(css).toMatch(/\.split-layout > \.authoring-preview\s*\{[^}]*overflow:\s*auto/)
    expect(css).toMatch(/\.split-layout > \.findings-panel\s*\{[^}]*min-height:\s*0[^}]*overflow:\s*auto/)
    expect(css).toContain('grid-template-areas: "editor" "preview" "findings"')
    expect(css).toMatch(/\.editor-layout\.split-layout\s*\{[^}]*flex:\s*none;[^}]*height:\s*calc\(100svh - 134px\)/)
    expect(css).not.toMatch(/\.split-layout[^{}]*\{[^}]*240px/)
    expect(css).not.toMatch(/\.split-layout[^{}]*\{[^}]*200px/)
  })
})
