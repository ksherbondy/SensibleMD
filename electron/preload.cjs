const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('sensibleMD', Object.freeze({
  platform: process.platform,
  openDocument: () => ipcRenderer.invoke('document:open'),
  saveOpenedDocument: (payload) => ipcRenderer.invoke('document:save-opened', payload),
  onExternalDocumentChange: (listener) => { const handler = (_event, change) => listener(change); ipcRenderer.on('document:external-change', handler); return () => ipcRenderer.removeListener('document:external-change', handler) },
  saveDocumentAs: (payload) => ipcRenderer.invoke('document:save-as', payload),
  loadDocumentState: (documentId) => ipcRenderer.invoke('state:load', documentId),
  saveDocumentState: (payload) => ipcRenderer.invoke('state:save', payload),
}))