const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const { watch } = require('node:fs')
const path = require('node:path')
const { createSessionId, deriveDocumentId } = require('./document-identity.cjs')
const { archiveStateFromPreviousIdentityScheme } = require('./legacy-state.cjs')

const isDevelopment = process.argv.includes('--dev')
const authorizedDocumentSessions = new Map()
const authorizedDocumentWatchers = new Map()
const recentFilesPath = () => path.join(app.getPath('userData'), 'recent-files.json')

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

async function openAuthorizedDocument(event, filePath) {
  authorizedDocumentWatchers.get(event.sender.id)?.close()
  const documentId = await deriveDocumentId(filePath)
  const sessionId = createSessionId()
  authorizedDocumentSessions.set(event.sender.id, { sessionId, documentId, filePath })
  const watcher = watch(filePath, async () => {
    try { event.sender.send('document:external-change', { source: await fs.readFile(filePath, 'utf8') }) } catch {}
  })
  authorizedDocumentWatchers.set(event.sender.id, watcher)
  await rememberRecentFile(filePath)
  return { documentId, sessionId, name: path.basename(filePath), source: await fs.readFile(filePath, 'utf8') }
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

ipcMain.handle('document:save-as', async (_event, payload) => {
  if (!payload || typeof payload.source !== 'string' || typeof payload.name !== 'string') throw new Error('Invalid document save request')
  const result = await dialog.showSaveDialog({ defaultPath: payload.name.endsWith('.md') ? payload.name : `${payload.name}.md`, filters: [{ name: 'Markdown', extensions: ['md'] }] })
  if (result.canceled || !result.filePath) return null
  await writeTextAtomically(result.filePath, payload.source)
  return { name: path.basename(result.filePath), path: result.filePath }
})

ipcMain.handle('recovery:save', async (_event, payload) => {
  if (!payload || typeof payload.documentId !== 'string' || typeof payload.source !== 'string' || !Number.isInteger(payload.version)) throw new Error('Invalid recovery snapshot')
  const latestPath = recoveryPath(payload.documentId, 'latest')
  const previousPath = recoveryPath(payload.documentId, 'previous')
  await fs.mkdir(path.dirname(latestPath), { recursive: true })
  try { await fs.rename(latestPath, previousPath) } catch {}
  await writeJsonAtomically(latestPath, { schemaVersion: 1, documentId: payload.documentId, version: payload.version, source: payload.source, savedAt: new Date().toISOString() })
  return { version: payload.version }
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
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'SensibleMD',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (isDevelopment) window.loadURL('http://127.0.0.1:5175')
  else window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(async () => {
  await archiveStateFromPreviousIdentityScheme(app.getPath('userData')).catch((error) => { console.error('Could not archive state from a previous identity scheme:', error) })
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('web-contents-destroyed', (_event, contents) => {
  authorizedDocumentWatchers.get(contents.id)?.close()
  authorizedDocumentWatchers.delete(contents.id)
  authorizedDocumentSessions.delete(contents.id)
})