const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('sensibleMD', Object.freeze({
  platform: process.platform,
  onOsOpenRequest: (listener) => { const handler = (_event, request) => listener(request); ipcRenderer.on('document:os-open-request', handler); ipcRenderer.send('document:os-ready'); return () => ipcRenderer.removeListener('document:os-open-request', handler) },
  openOsDocument: (id) => ipcRenderer.invoke('document:os-open', id),
  completeOsOpen: (id) => ipcRenderer.send('document:os-complete', id),
  openDocument: () => ipcRenderer.invoke('document:open'),
  listRecentDocuments: () => ipcRenderer.invoke('recent:list'),
  openRecentDocument: (index) => ipcRenderer.invoke('recent:open', index),
  saveOpenedDocument: (payload) => ipcRenderer.invoke('document:save-opened', payload),
  onExternalDocumentChange: (listener) => { const handler = (_event, change) => listener(change); ipcRenderer.on('document:external-change', handler); return () => ipcRenderer.removeListener('document:external-change', handler) },
  saveDocumentAs: (payload) => ipcRenderer.invoke('document:save-as', payload),
  saveRecoverySnapshot: (payload) => ipcRenderer.invoke('recovery:save', payload),
  clearRecoverySnapshot: (documentId) => ipcRenderer.invoke('recovery:clear', documentId),
  loadRecoverySnapshot: (documentId) => ipcRenderer.invoke('recovery:load', documentId),
  loadDocumentState: (documentId) => ipcRenderer.invoke('state:load', documentId),
  saveDocumentState: (payload) => ipcRenderer.invoke('state:save', payload),
}))