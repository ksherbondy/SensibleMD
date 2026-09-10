import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { startScenario } from './scenario'

// At the existing 76-word capacity: heading+30 words, a 60-word code block,
// heading+30 words, another code block, heading+30 words. Pages 2 and 4
// have no heading. Code blocks stay intact even in the current paginator,
// so the snap-back reproduction does not depend on paragraph fragmentation.
// No production paginator is used to compute the expected navigation outcome.
const paragraph = (count: number) => Array.from({ length: count }, (_, index) => `word${index}`).join(' ')
const codeBlock = `\`\`\`text\n${paragraph(60)}\n\`\`\``
const pageFixture = `# Alpha\n\n${paragraph(30)}\n\n${codeBlock}\n\n## Beta\n\n${paragraph(30)}\n\n${codeBlock}\n\n## Gamma\n\n${paragraph(30)}`
const headingFixture = '# Top\n\nOpening text.\n\n## Repeat\n\nText.\n\n## Repeat\n\nMore text.\n\n### **Formatted heading**\n\n#### Level Four\n\n##### Level Five\n\n###### Level Six'
const storageFor = (source: string) => ({ 'sensiblemd-document': source, 'sensiblemd-name': 'Navigation.md' })

describe('N01 / DOG-011: page controls retain the user destination', () => {
  it('keeps advancing beyond a headingless page when a later heading enters view', async () => {
    const scenario = await startScenario({ storage: storageFor(pageFixture) })
    try {
      await scenario.clickOutlineHeading('Alpha')
      await scenario.setReadingLayout('Page')
      await scenario.settleNavigation()
      expect(scenario.visiblePageLabel()).toBe('Page 1 of 5')

      await scenario.clickNextPage()
      await scenario.settleNavigation()
      expect(scenario.visiblePageNumbers()).toEqual([2])
      expect(within(screen.getByRole('article', { name: 'Page 2' })).queryAllByRole('heading')).toHaveLength(0)

      await scenario.clickNextPage()
      await scenario.settleNavigation()
      expect(scenario.visiblePageNumbers(), 'Next from page 2 must stay on page 3, not snap back to Alpha').toEqual([3])
      await scenario.clickNextPage()
      await scenario.settleNavigation()
      expect(scenario.visiblePageNumbers()).toEqual([4])
      await scenario.clickPreviousPage()
      await scenario.settleNavigation()
      expect(scenario.visiblePageNumbers()).toEqual([3])
    } finally { scenario.unmount() }
  })

  it('keeps moving backward across a headingless page and a previous heading', async () => {
    const scenario = await startScenario({ storage: storageFor(pageFixture) })
    try {
      await scenario.clickOutlineHeading('Gamma')
      await scenario.setReadingLayout('Page')
      await scenario.settleNavigation()
      expect(scenario.visiblePageLabel()).toBe('Page 5 of 5')
      await scenario.clickPreviousPage()
      await scenario.settleNavigation()
      expect(scenario.visiblePageNumbers()).toEqual([4])
      expect(within(screen.getByRole('article', { name: 'Page 4' })).queryAllByRole('heading')).toHaveLength(0)
      await scenario.clickPreviousPage()
      await scenario.settleNavigation()
      expect(scenario.visiblePageNumbers(), 'Previous from page 4 must stay on page 3, not snap back to Gamma').toEqual([3])
    } finally { scenario.unmount() }
  })
})

describe('N02 / DOG-013: outline navigation preserves authoring mode', () => {
  for (const mode of ['Write', 'Split'] as const) {
    it(`keeps ${mode} mode and moves the editor to the selected outline heading`, async () => {
      const scenario = await startScenario({ storage: storageFor(headingFixture) })
      try {
        await scenario.enterMode(mode)
        await scenario.moveEditorCursorToLine(3)
        expect(scenario.editorCursorLine()).toBe(3)
        const beforeSource = scenario.editorSource()
        const beforeDirty = scenario.isDirty()
        const priorScroll = scenario.lastScrollRequest()
        await scenario.clickOutlineHeading('Level Four')
        await scenario.settleNavigation()

        expect(scenario.isDirty()).toBe(beforeDirty)
        expect(localStorage.getItem('sensiblemd-document')).toBe(beforeSource)
        expect(scenario.currentMode(), 'Outline navigation must not implicitly enter Read').toBe(mode)
        expect(scenario.editorSource()).toBe(beforeSource)
        expect(scenario.editorCursorLine()).toBe(15)
        if (mode === 'Split') {
          const preview = screen.getByRole('article', { name: 'Rendered Markdown preview' })
          const target = within(preview).getByRole('heading', { name: 'Level Four', level: 4 })
          expect(scenario.lastScrollRequest()).not.toBe(priorScroll)
          expect(scenario.lastScrollRequest()?.element).toBe(target)
        }
      } finally { scenario.unmount() }
    })
  }
})

describe('N03 / DOG-012: outline targets the exact rendered heading', () => {
  const cases = [
    { label: 'first duplicate', text: 'Repeat', level: 2, occurrence: 0 },
    { label: 'second duplicate', text: 'Repeat', level: 2, occurrence: 1 },
    { label: 'inline-formatted heading', text: 'Formatted heading', level: 3, occurrence: 0 },
    { label: 'h4 heading', text: 'Level Four', level: 4, occurrence: 0 },
    { label: 'h5 heading', text: 'Level Five', level: 5, occurrence: 0 },
    { label: 'h6 heading', text: 'Level Six', level: 6, occurrence: 0 },
  ]
  for (const targetCase of cases) {
    it(`scrolls to the ${targetCase.label} in the reader`, async () => {
      const scenario = await startScenario({ storage: storageFor(headingFixture) })
      try {
        await scenario.setReadingLayout('Scroll')
        await scenario.settleNavigation()
        const reader = screen.getByRole('article')
        const targets = within(reader).getAllByRole('heading', { name: targetCase.text, level: targetCase.level })
        const target = targets[targetCase.occurrence]
        expect(target).toBeDefined()
        const priorScroll = scenario.lastScrollRequest()
        await scenario.clickOutlineHeading(targetCase.text, targetCase.occurrence)
        await scenario.settleNavigation()

        // Element identity distinguishes duplicates even if their DOM IDs collide.
        const request = scenario.lastScrollRequest()
        expect(request?.element, 'The scroll target must be this exact heading, not another duplicate or surface').toBe(target)
        expect(request, 'The outline action must request a fresh reader scroll').not.toBe(priorScroll)
      } finally { scenario.unmount() }
    })
  }
})
