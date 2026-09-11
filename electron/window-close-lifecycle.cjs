// Native controls, menu roles and BrowserWindow.close() all enter this lifecycle.
function installWindowCloseLifecycle({ app, window, ipcMain, dialog }) {
  let quitting = false
  let closeRequested = false
  let pending = null
  let sequence = 0
  const beforeQuit = () => { quitting = true }
  app.on('before-quit', beforeQuit)
  window.on('close', (event) => {
    if (quitting) return
    if (pending) { event.preventDefault(); return }
    closeRequested = true
  })
  const owns = (event) => !window.isDestroyed() && event.sender === window.webContents && event.senderFrame === window.webContents.mainFrame
  const prevented = async (event) => {
    // Application quit is deliberately outside this window-close guard.
    if (quitting) { event.preventDefault(); return }
    if (!closeRequested || pending) return
    closeRequested = false
    const request = { id: String(++sequence) }
    pending = request
    let choice = 'cancel'
    try {
      const { response } = await dialog.showMessageBox(window, {
        type: 'warning',
        message: 'Save changes before closing this window?',
        detail: 'Your unsaved changes will be lost if you discard them.',
        buttons: ['Save', 'Discard', 'Cancel'],
        defaultId: 0,
        cancelId: 2,
        noLink: true,
      })
      choice = ['save', 'discard', 'cancel'][response] ?? 'cancel'
    } catch { /* A failed dialog cancels the close. */ }
    if (pending !== request || window.isDestroyed() || window.webContents.isDestroyed() || quitting) return
    window.webContents.send('window:close-decision', { id: request.id, choice })
  }
  window.webContents.on('will-prevent-unload', prevented)
  const complete = (event, result) => {
    if (!owns(event) || !pending || result?.id !== pending.id || typeof result.allow !== 'boolean') return
    pending = null
    if (result.allow) window.close() // Renderer rechecks the live buffer in beforeunload.
  }
  ipcMain.on('window:close-complete', complete)
  window.once('closed', () => {
    pending = null
    app.removeListener('before-quit', beforeQuit)
    ipcMain.removeListener('window:close-complete', complete)
  })
}
module.exports = { installWindowCloseLifecycle }
