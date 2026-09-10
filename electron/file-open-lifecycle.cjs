const path = require('node:path')

function markdownArgument(argv, cwd, platform = process.platform, packaged = true) {
  const paths = platform === 'win32' ? path.win32 : path
  const file = argv.slice(packaged ? 1 : 2).find((arg) => !arg.startsWith('-') && !/^[a-z][a-z0-9+.-]*:\/\//i.test(arg) && paths.extname(arg).toLowerCase() === '.md')
  return file ? paths.resolve(cwd, file) : null
}

function installFileOpenLifecycle({ app, ipcMain, createWindow, openDocument, beforeReady = async () => {}, platform = process.platform, argv = process.argv, cwd = process.cwd() }) {
  const paths = platform === 'win32' ? path.win32 : path
  if (!app.requestSingleInstanceLock()) { app.quit(); return }
  let window = null
  let ready = false
  let initialized = false
  let pending = null
  let inFlight = null
  let sequence = 0
  const foreground = () => {
    if (!initialized) return
    if (!window || window.isDestroyed()) {
      window = createWindow()
      ready = false
      const owned = window
      window.on('closed', () => { if (window === owned) { window = null; ready = false; inFlight = null; pending = null } })
    }
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
  }
  const pump = () => {
    if (!ready || !window || window.isDestroyed() || window.webContents.isDestroyed() || inFlight || !pending) return
    inFlight = { ...pending, senderId: window.webContents.id, accepted: false }
    pending = null
    window.webContents.send('document:os-open-request', { id: inFlight.id, name: paths.basename(inFlight.filePath) })
  }
  const request = (filePath) => {
    if (typeof filePath !== 'string' || paths.extname(filePath).toLowerCase() !== '.md') return
    pending = { id: String(++sequence), filePath: paths.resolve(filePath) }
    foreground()
    pump()
  }
  // Registered synchronously: macOS can send open-file before ready.
  app.on('open-file', (event, filePath) => { event.preventDefault(); request(filePath) })
  app.on('second-instance', (_event, args, workingDirectory) => {
    const file = markdownArgument(args, workingDirectory, platform, app.isPackaged)
    if (file) request(file)
    else foreground()
  })
  app.on('activate', foreground)
  app.on('window-all-closed', () => { if (platform !== 'darwin') app.quit() })
  const owns = (event) => window && !window.isDestroyed() && event.sender === window.webContents
  ipcMain.on('document:os-ready', (event) => { if (owns(event)) { ready = true; pump() } })
  ipcMain.handle('document:os-open', async (event, id) => {
    if (!owns(event) || !inFlight || inFlight.id !== id || inFlight.senderId !== event.sender.id || inFlight.accepted) throw new Error('No matching OS file-open request')
    inFlight.accepted = true
    return openDocument(event, inFlight.filePath)
  })
  ipcMain.on('document:os-complete', (event, id) => {
    if (!owns(event) || inFlight?.id !== id) return
    inFlight = null
    pump()
  })
  if (platform !== 'darwin') {
    const file = markdownArgument(argv, cwd, platform, app.isPackaged)
    if (file) request(file)
  }
  app.whenReady().then(async () => { await beforeReady(); initialized = true; foreground(); pump() })
}

module.exports = { installFileOpenLifecycle, markdownArgument }
