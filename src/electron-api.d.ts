interface SensibleDocumentState {
  schemaVersion: 1
  documentId: string
  bookmarks: string[]
  activeHeading: string
  fontScale: number
  lineHeight: number
  contentWidth: number
  reducedMotion: boolean
}

interface Window {
  sensibleMD?: {
    platform: string
    openDocument: () => Promise<{ name: string; path: string; source: string } | null>
    saveOpenedDocument: (payload: { source: string }) => Promise<{ name: string }>
    onExternalDocumentChange: (listener: (change: { source: string }) => void) => () => void
    saveDocumentAs: (payload: { name: string; source: string }) => Promise<{ name: string; path: string } | null>
    loadDocumentState: (documentId: string) => Promise<SensibleDocumentState | null>
    saveDocumentState: (state: Omit<SensibleDocumentState, 'schemaVersion'>) => Promise<SensibleDocumentState>
  }
}