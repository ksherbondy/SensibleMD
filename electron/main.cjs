const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron')
const fs = require('node:fs/promises')
const { watch } = require('node:fs')
const path = require('node:path')

const isDevelopment = process.argv.includes('--dev')
const authorizedDocumentPaths = new Map()
const authorizedDocumentWatchers = new Map()

function metadataPath(documentId) {
  if (!/^[a-z0-9-]{1,80}$/i.test(documentId)) throw new Error('Invalid document identifier')
  return path.join(app.getPath('userData'), 'documents', `${documentId}.json`)
}

async function writeJsonAtomically(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const temporaryPath = `${filePath}.tmp`
  await fs.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf8')
  await fs.rename(temporaryPath, filePath)
}

ipcMain.handle('document:open', async (event) => {
  const result = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdown', 'txt'] }] })
  if (result.canceled || !result.filePaths[0]) return null
  const filePath = result.filePaths[0]
  authorizedDocumentWatchers.get(event.sender.id)?.close()
  authorizedDocumentPaths.set(event.sender.id, filePath)
  const watcher = watch(filePath, async () => {
    try { event.sender.send('document:external-change', { source: await fs.readFile(filePath, 'utf8') }) } catch {}
  })
  authorizedDocumentWatchers.set(event.sender.id, watcher)
  return { name: path.basename(filePath), path: filePath, source: await fs.readFile(filePath, 'utf8') }
})

ipcMain.handle('document:save-opened', async (event, payload) => {
  if (!payload || typeof payload.source !== 'string') throw new Error('Invalid document save request')
  const filePath = authorizedDocumentPaths.get(event.sender.id)
  if (!filePath) throw new Error('No authorized document is open')
  await fs.writeFile(filePath, payload.source, 'utf8')
  return { name: path.basename(filePath) }
})

ipcMain.handle('document:save-as', async (_event, payload) => {
  if (!payload || typeof payload.source !== 'string' || typeof payload.name !== 'string') throw new Error('Invalid document save request')
  const result = await dialog.showSaveDialog({ defaultPath: payload.name.endsWith('.md') ? payload.name : `${payload.name}.md`, filters: [{ name: 'Markdown', extensions: ['md'] }] })
  if (result.canceled || !result.filePath) return null
  await fs.writeFile(result.filePath, payload.source, 'utf8')
  return { name: path.basename(result.filePath), path: result.filePath }
})

ipcMain.handle('state:load', async (_event, documentId) => {
  try {
    const data = JSON.parse(await fs.readFile(metadataPath(documentId), 'utf8'))
    return data?.schemaVersion === 1 && data.documentId === documentId ? data : null
  } catch { return null }
})

ipcMain.handle('state:save', async (_event, payload) => {
  if (!payload || typeof payload.documentId !== 'string' || !Array.isArray(payload.bookmarks) || typeof payload.fontScale !== 'number') throw new Error('Invalid document state')
  const state = { schemaVersion: 1, documentId: payload.documentId, bookmarks: payload.bookmarks.filter((item) => typeof item === 'string'), activeHeading: typeof payload.activeHeading === 'string' ? payload.activeHeading : '', fontScale: Math.max(85, Math.min(150, payload.fontScale)), lineHeight: typeof payload.lineHeight === 'number' ? Math.max(1.3, Math.min(2.4, payload.lineHeight)) : 1.72, contentWidth: typeof payload.contentWidth === 'number' ? Math.max(480, Math.min(1040, payload.contentWidth)) : 760, reducedMotion: Boolean(payload.reducedMotion) }
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

app.whenReady().then(() => {
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
  authorizedDocumentPaths.delete(contents.id)
})