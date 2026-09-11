const { installWindowCloseLifecycle } = require('./window-close-lifecycle.cjs')
const { app, BrowserWindow, dialog, ipcMain, shell, screen } = require('electron')
const fs = require('node:fs/promises')
const { watch } = require('node:fs')
const path = require('node:path')
const { createSessionId, deriveDocumentId } = require('./document-identity.cjs')
const { archiveStateFromPreviousIdentityScheme } = require('./legacy-state.cjs')

const { installFileOpenLifecycle } = require('./file-open-lifecycle.cjs')

const isDevelopment = process.argv.includes('--dev')
const authorizedDocumentSessions = new Map()
const authorizedDocumentWatchers = new Map()
const recentFilesPath = () => path.join(app.getPath('userData'), 'recent-files.json')
const windowStatePath = () => path.join(app.getPath('userData'), 'window-state.json')

const DEFAULT_WINDOW_BOUNDS = {
  width: 1280,
  height: 860,
}

const MIN_WINDOW_WIDTH = 900
const MIN_WINDOW_HEIGHT = 600
let windowStateSaveTimer = null

function rectanglesIntersect(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  )
}

function isValidWindowBounds(bounds) {
  return (
    bounds &&
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height) &&
    bounds.width >= MIN_WINDOW_WIDTH &&
    bounds.height >= MIN_WINDOW_HEIGHT
  )
}

function loadWindowBounds() {
  try {
    const filePath = windowStatePath()
    const source = require('node:fs').readFileSync(filePath, 'utf8')
    const state = JSON.parse(source)

    if (state?.schemaVersion !== 1 || !isValidWindowBounds(state.bounds)) {
      return null
    }

    return state.bounds
  } catch {
    return null
  }
}

function getRestorableWindowBounds() {
  const savedBounds = loadWindowBounds()
  if (!savedBounds) return null

  const displays = screen.getAllDisplays()
  const isVisible = displays.some((display) =>
    rectanglesIntersect(savedBounds, display.workArea),
  )

  if (!isVisible) return null

  const display = screen.getDisplayMatching(savedBounds)
  const workArea = display.workArea

  const width = Math.min(
    Math.max(savedBounds.width, MIN_WINDOW_WIDTH),
    workArea.width,
  )
  const height = Math.min(
    Math.max(savedBounds.height, MIN_WINDOW_HEIGHT),
    workArea.height,
  )

  const maxX = workArea.x + workArea.width - width
  const maxY = workArea.y + workArea.height - height

  return {
    x: Math.min(Math.max(savedBounds.x, workArea.x), maxX),
    y: Math.min(Math.max(savedBounds.y, workArea.y), maxY),
    width,
    height,
  }
}

function scheduleWindowBoundsSave(window) {
  if (
    window.isDestroyed() ||
    window.isMinimized() ||
    window.isMaximized() ||
    window.isFullScreen()
  ) {
    return
  }

  const bounds = window.getBounds()

  clearTimeout(windowStateSaveTimer)
  windowStateSaveTimer = setTimeout(() => {
    writeJsonAtomically(windowStatePath(), {
      schemaVersion: 1,
      bounds,
    }).catch((error) => {
      console.error('Could not save window state:', error)
    })
  }, 200)
}

function metadataPath(documentId) {
  if (!/^[a-z0-9-]{1,80}$/i.test(documentId)) throw new Error('Invalid document identifier')
  return path.join(app.getPath('userData'), 'documents', `${documentId}.json`)
}

function recoveryPath(documentId, name) {
  if (!/^[a-z0-9-]{1,80}$/i.test(documentId)) throw new Error('Invalid document identifier')
  return path.join(app.getPath('userData'), 'recovery', documentId, `${name}.json`)
}

async function writeTextAtomically(filePath, source) {
  const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`)
  try {
    await fs.writeFile(temporaryPath, source, 'utf8')
    await fs.rename(temporaryPath, filePath)
  } catch (error) {
    await fs.rm(temporaryPath, { force: true }).catch(() => {})
    throw error
  }
}

async function writeJsonAtomically(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(temporaryPath, filePath)
}

async function loadRecentFiles() {
  try {
    const data = JSON.parse(await fs.readFile(recentFilesPath(), 'utf8'))
    return Array.isArray(data?.items) ? data.items.filter((item) => typeof item?.path === 'string' && typeof item?.name === 'string').slice(0, 12) : []
  } catch { return [] }
}

async function rememberRecentFile(filePath) {
  const items = await loadRecentFiles()
  const next = [{ path: filePath, name: path.basename(filePath) }, ...items.filter((item) => item.path !== filePath)].slice(0, 12)
  await writeJsonAtomically(recentFilesPath(), { schemaVersion: 1, items: next })
  return next
}

async function openAuthorizedDocument(event, filePath, isCurrent = () => true) {
  const documentId = await deriveDocumentId(filePath)
  const source = await fs.readFile(filePath, 'utf8')
  if (event.sender.isDestroyed() || !isCurrent()) throw new Error('The requesting window closed')
  const sessionId = createSessionId()
  // Watch the containing directory so atomic replacement does not leave the
  // watcher attached to the previous inode. Only this document is read.
  const watcher = watch(path.dirname(filePath), async (_eventType, filename) => {
    if (filename && filename.toString() !== path.basename(filePath)) return;
    try {
      const changedSource = await fs.readFile(filePath, 'utf8')
      if (!event.sender.isDestroyed() && authorizedDocumentSessions.get(event.sender.id)?.sessionId === sessionId) event.sender.send('document:external-change', { source: changedSource })
    } catch {}
  })
  try {
    if (!isCurrent()) throw new Error('The active document changed')
    await rememberRecentFile(filePath)
  } catch (error) { watcher.close(); throw error }
  authorizedDocumentWatchers.get(event.sender.id)?.close()
  authorizedDocumentSessions.set(event.sender.id, { sessionId, documentId, filePath })
  authorizedDocumentWatchers.set(event.sender.id, watcher)
  return { documentId, sessionId, name: path.basename(filePath), source }
}

ipcMain.handle('document:open', async (event) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }] })
  if (result.canceled || !result.filePaths[0]) return null
  const filePath = result.filePaths[0]
  return openAuthorizedDocument(event, filePath)
})

ipcMain.handle('recent:list', async () => (await loadRecentFiles()).map((item, index) => ({ index, name: item.name })))

ipcMain.handle('recent:open', async (event, index) => {
  if (!Number.isInteger(index) || index < 0 || index > 11) throw new Error('Invalid recent document')
  const item = (await loadRecentFiles())[index]
  if (!item) return null
  try { return await openAuthorizedDocument(event, item.path) } catch { return null }
})

ipcMain.handle('document:save-opened', async (event, payload) => {
  if (!payload || typeof payload.source !== 'string') throw new Error('Invalid document save request')
  const session = authorizedDocumentSessions.get(event.sender.id)
  if (!session) throw new Error('No authorized document is open')
  await writeTextAtomically(session.filePath, payload.source)
  return { name: path.basename(session.filePath) }
})

ipcMain.handle('document:save-as', async (event, payload) => {
  if (!payload || typeof payload.source !== 'string' || typeof payload.name !== 'string') throw new Error('Invalid document save request')
  const previousSession = authorizedDocumentSessions.get(event.sender.id)
  const isCurrent = () => !event.sender.isDestroyed() && authorizedDocumentSessions.get(event.sender.id) === previousSession
  const result = await dialog.showSaveDialog({ defaultPath: payload.name.endsWith('.md') ? payload.name : `${payload.name}.md`, filters: [{ name: 'Markdown', extensions: ['md'] }] })
  if (result.canceled || !result.filePath) return null
  if (!isCurrent()) throw new Error('The active document changed')
  await writeTextAtomically(result.filePath, payload.source)
  return openAuthorizedDocument(event, result.filePath, isCurrent)
})

// Preserve invocation order for writes and deletion of each document's recovery.
const recoveryOperations = new Map()
function queueRecovery(documentId, operation) {
  recoveryPath(documentId, 'latest')
  const result = (recoveryOperations.get(documentId) ?? Promise.resolve()).catch(() => {}).then(operation)
  recoveryOperations.set(documentId, result)
  const cleanup = () => { if (recoveryOperations.get(documentId) === result) recoveryOperations.delete(documentId) }
  result.then(cleanup, cleanup)
  return result
}

ipcMain.handle('recovery:clear', (_event, documentId) => queueRecovery(documentId, async () => {
  await fs.rm(recoveryPath(documentId, 'latest'), { force: true })
  await fs.rm(recoveryPath(documentId, 'previous'), { force: true })
}))

ipcMain.handle('recovery:save', async (_event, payload) => {
  if (!payload || typeof payload.documentId !== 'string' || typeof payload.source !== 'string' || !Number.isInteger(payload.version)) throw new Error('Invalid recovery snapshot')
  return queueRecovery(payload.documentId, async () => {
    const latestPath = recoveryPath(payload.documentId, 'latest')
    const previousPath = recoveryPath(payload.documentId, 'previous')
    await fs.mkdir(path.dirname(latestPath), { recursive: true })
    try { await fs.rename(latestPath, previousPath) } catch {}
    await writeJsonAtomically(latestPath, { schemaVersion: 1, documentId: payload.documentId, version: payload.version, source: payload.source, savedAt: new Date().toISOString() })
    return { version: payload.version }
  })
})

ipcMain.handle('recovery:load', async (_event, documentId) => {
  try {
    const snapshot = JSON.parse(await fs.readFile(recoveryPath(documentId, 'latest'), 'utf8'))
    return snapshot?.schemaVersion === 1 && snapshot.documentId === documentId && typeof snapshot.source === 'string' ? snapshot : null
  } catch { return null }
})

ipcMain.handle('state:load', async (_event, documentId) => {
  try {
    const data = JSON.parse(await fs.readFile(metadataPath(documentId), 'utf8'))
    return data?.schemaVersion === 1 && data.documentId === documentId ? data : null
  } catch { return null }
})

ipcMain.handle('state:save', async (_event, payload) => {
  if (!payload || typeof payload.documentId !== 'string' || !Array.isArray(payload.bookmarks) || typeof payload.fontScale !== 'number') throw new Error('Invalid document state')
  const position = payload.position && typeof payload.position === 'object' && typeof payload.position.nodeFingerprint === 'string' ? { nodeId: typeof payload.position.nodeId === 'string' ? payload.position.nodeId : undefined, nodeFingerprint: payload.position.nodeFingerprint, headingPath: Array.isArray(payload.position.headingPath) ? payload.position.headingPath.filter((item) => typeof item === 'string') : undefined, textAnchor: payload.position.textAnchor && typeof payload.position.textAnchor === 'object' && typeof payload.position.textAnchor.exact === 'string' ? { exact: payload.position.textAnchor.exact, prefix: typeof payload.position.textAnchor.prefix === 'string' ? payload.position.textAnchor.prefix : '', suffix: typeof payload.position.textAnchor.suffix === 'string' ? payload.position.textAnchor.suffix : '' } : undefined } : undefined
  const state = { schemaVersion: 1, documentId: payload.documentId, bookmarks: payload.bookmarks.filter((item) => typeof item === 'string'), activeHeading: typeof payload.activeHeading === 'string' ? payload.activeHeading : '', position, fontScale: Math.max(85, Math.min(150, payload.fontScale)), lineHeight: typeof payload.lineHeight === 'number' ? Math.max(1.3, Math.min(2.4, payload.lineHeight)) : 1.72, contentWidth: typeof payload.contentWidth === 'number' ? Math.max(480, Math.min(1040, payload.contentWidth)) : 760, reducedMotion: Boolean(payload.reducedMotion) }
  await writeJsonAtomically(metadataPath(payload.documentId), state)
  return state
})

function createWindow() {
  const restoredBounds = getRestorableWindowBounds()

  const window = new BrowserWindow({
    ...(restoredBounds ?? DEFAULT_WINDOW_BOUNDS),
    minWidth: MIN_WINDOW_WIDTH,
    minHeight: MIN_WINDOW_HEIGHT,
    title: 'SensibleMD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  installWindowCloseLifecycle({ app, window, ipcMain, dialog })

  window.on('move', () => scheduleWindowBoundsSave(window))
  window.on('resize', () => scheduleWindowBoundsSave(window))

  const contentsId = window.webContents.id
  window.webContents.once('destroyed', () => {
    authorizedDocumentWatchers.get(contentsId)?.close()
    authorizedDocumentWatchers.delete(contentsId)
    authorizedDocumentSessions.delete(contentsId)
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
  event.preventDefault()

  if (url.startsWith('https:')) {
    shell.openExternal(url)
  }
  })

  window.webContents.session.setPermissionCheckHandler(() => {
  return false
})

  window.webContents.session.setPermissionRequestHandler(
  (_webContents, _permission, callback) => {
    callback(false)
  })

  if (isDevelopment) window.loadURL('http://127.0.0.1:5175')
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  return window
}

installFileOpenLifecycle({
  app, ipcMain, createWindow, openDocument: openAuthorizedDocument,
  beforeReady: () => archiveStateFromPreviousIdentityScheme(app.getPath('userData')).catch((error) => { console.error('Could not archive state from a previous identity scheme:', error) }),
})
