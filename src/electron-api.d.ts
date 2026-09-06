interface SensibleDocumentState {
  schemaVersion: 1
  documentId: string
  bookmarks: string[]
  activeHeading: string
  position?: { nodeId?: string; nodeFingerprint?: string; headingPath?: string[]; textAnchor?: { exact: string; prefix: string; suffix: string } }
  fontScale: number
  lineHeight: number
  contentWidth: number
  reducedMotion: boolean
}

interface Window {
  sensibleMD?: {
    platform: string
    openDocument: () => Promise<{ name: string; source: string } | null>
    listRecentDocuments: () => Promise<Array<{ index: number; name: string }>>
    openRecentDocument: (index: number) => Promise<{ name: string; source: string } | null>
    saveOpenedDocument: (payload: { source: string }) => Promise<{ name: string }>
    onExternalDocumentChange: (listener: (change: { source: string }) => void) => () => void
    saveDocumentAs: (payload: { name: string; source: string }) => Promise<{ name: string; path: string } | null>
    saveRecoverySnapshot: (payload: { documentId: string; version: number; source: string }) => Promise<{ version: number }>
    loadRecoverySnapshot: (documentId: string) => Promise<{ documentId: string; version: number; source: string; savedAt: string } | null>
    loadDocumentState: (documentId: string) => Promise<SensibleDocumentState | null>
    saveDocumentState: (state: Omit<SensibleDocumentState, 'schemaVersion'>) => Promise<SensibleDocumentState>
  }
}