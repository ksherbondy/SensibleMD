import { describe, expect, it } from 'vitest'
import { CallScheduler } from './scheduler'
import { FakeDesktop } from './electron-double'
import { startScenario } from './scenario'

describe('CallScheduler', () => {
  it('resolves immediately in automatic order', async () => {
    const scheduler = new CallScheduler()
    await expect(scheduler.schedule('state:load', () => 'loaded')).resolves.toBe('loaded')
  })

  it('lets a test resolve a later call before an earlier one', async () => {
    const scheduler = new CallScheduler()
    scheduler.useManualOrder()
    const settled: string[] = []
    const first = scheduler.schedule('state:load', () => 'A').then((value) => { settled.push(value) })
    const second = scheduler.schedule('state:load', () => 'B').then((value) => { settled.push(value) })

    expect(scheduler.pending('state:load')).toHaveLength(2)
    scheduler.releaseLatest('state:load')
    await second
    expect(settled).toEqual(['B'])

    scheduler.release('state:load')
    await first
    expect(settled).toEqual(['B', 'A'])
  })

  it('can leave a call permanently unsettled', async () => {
    const scheduler = new CallScheduler()
    scheduler.useManualOrder()
    let settled = false
    void scheduler.schedule('recovery:load', () => 'never').then(() => { settled = true })

    scheduler.abandon('recovery:load')
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(scheduler.pending()).toHaveLength(0)
  })

  it('reports which channels are waiting', () => {
    const scheduler = new CallScheduler()
    scheduler.useManualOrder()
    void scheduler.schedule('document:open', () => null)
    void scheduler.schedule('recovery:load', () => null)
    expect(scheduler.pending().map((call) => call.channel)).toEqual(['document:open', 'recovery:load'])
    expect(scheduler.pending('recovery:load')).toHaveLength(1)
  })
})

describe('FakeDesktop', () => {
  it('authorizes an opened file and writes saves back to it', async () => {
    const desktop = new FakeDesktop().addFile('/Users/reader/notes.md', '# Notes')
    desktop.openDialogResult = '/Users/reader/notes.md'

    const opened = await desktop.api.openDocument()
    expect(opened).toMatchObject({ name: 'notes.md', source: '# Notes', documentId: desktop.documentIdFor('/Users/reader/notes.md') })
    expect(opened?.sessionId).toEqual(expect.any(String))

    await desktop.api.saveOpenedDocument({ source: '# Notes edited' })
    expect(desktop.diskContents('/Users/reader/notes.md')).toBe('# Notes edited')
    expect(desktop.writes).toEqual([{ path: '/Users/reader/notes.md', source: '# Notes edited' }])
  })

  it('refuses a direct save when no document is authorized', async () => {
    const desktop = new FakeDesktop()
    await expect(desktop.api.saveOpenedDocument({ source: 'x' })).rejects.toThrow('No authorized document is open')
  })

  it('records recents and rotates recovery snapshots', async () => {
    const desktop = new FakeDesktop().addFile('/a/one.md', 'one').addFile('/b/two.md', 'two')
    desktop.openDialogResult = '/a/one.md'
    await desktop.api.openDocument()
    desktop.openDialogResult = '/b/two.md'
    await desktop.api.openDocument()

    expect(await desktop.api.listRecentDocuments()).toEqual([{ index: 0, name: 'two.md' }, { index: 1, name: 'one.md' }])

    await desktop.api.saveRecoverySnapshot({ documentId: 'doc', version: 1, source: 'first' })
    await desktop.api.saveRecoverySnapshot({ documentId: 'doc', version: 2, source: 'second' })
    expect((await desktop.api.loadRecoverySnapshot('doc'))?.source).toBe('second')
    expect(desktop.recoveryPrevious.get('doc')?.source).toBe('first')
  })

  it('delivers external change events to subscribers', async () => {
    const desktop = new FakeDesktop().addFile('/a/one.md', 'one')
    desktop.openDialogResult = '/a/one.md'
    await desktop.api.openDocument()

    const seen: string[] = []
    const unsubscribe = desktop.api.onExternalDocumentChange(({ source }) => { seen.push(source) })
    desktop.emitExternalChange('changed on disk')
    unsubscribe()
    desktop.emitExternalChange('ignored')

    expect(seen).toEqual(['changed on disk'])
    expect(desktop.diskContents('/a/one.md')).toBe('ignored')
  })

  it('can be made to fail a boundary call', async () => {
    const desktop = new FakeDesktop()
    desktop.failures.state = true
    await expect(desktop.api.loadDocumentState('doc')).rejects.toThrow('Desktop settings are unavailable.')
  })
})

describe('scenario harness', () => {
  it('mounts the application and exposes document state', async () => {
    const scenario = await startScenario()
    expect(scenario.documentName()).toBe('Welcome.md')
    expect(scenario.isDirty()).toBe(false)
    expect(scenario.outlineHeadings()).toContain('Start where you are')
    scenario.unmount()
  })

  it('drives a real edit through the source editor', async () => {
    const scenario = await startScenario()
    await scenario.enterMode('Write')
    await scenario.appendToEditor('\n\n## Added by the harness\n')

    expect(scenario.isDirty()).toBe(true)
    await scenario.enterMode('Read')
    expect(scenario.outlineHeadings()).toContain('Added by the harness')
    scenario.unmount()
  })

  it('opens a desktop document through the real open path', async () => {
    const desktop = new FakeDesktop().addFile('/Users/reader/guide.md', '# Guide\n\nBody text.')
    desktop.openDialogResult = '/Users/reader/guide.md'
    const scenario = await startScenario({ desktop })

    await scenario.openDocument()

    expect(scenario.documentName()).toBe('guide.md')
    expect(scenario.outlineHeadings()).toEqual(['Guide'])
    scenario.unmount()
  })

  it('holds a boundary call open so a test can act mid-flight', async () => {
    const desktop = new FakeDesktop().addFile('/Users/reader/guide.md', '# Guide')
    desktop.openDialogResult = '/Users/reader/guide.md'
    const scenario = await startScenario({ desktop })

    scenario.scheduler.useManualOrder()
    await scenario.openDocument()
    expect(scenario.scheduler.pending('document:open')).toHaveLength(1)
    expect(scenario.documentName()).toBe('Welcome.md')

    scenario.scheduler.useAutomaticOrder()
    await scenario.settle()
    await scenario.settle()
    expect(scenario.documentName()).toBe('guide.md')
    scenario.unmount()
  })
})
