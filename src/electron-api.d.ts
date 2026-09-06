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

interface SensibleOpenedDocument {
  /** Stable identity owned by the main process. */
  documentId: string
  /** Ephemeral identity for this open document in this window. Never persisted. */
  sessionId: string
  name: string
  source: string
}

interface Window {
  sensibleMD?: {
    platform: string
    openDocument: () => Promise<SensibleOpenedDocument | null>
    listRecentDocuments: () => Promise<Array<{ index: number; name: string }>>
    openRecentDocument: (index: number) => Promise<SensibleOpenedDocument | null>
    saveOpenedDocument: (payload: { source: string }) => Promise<{ name: string }>
    onExternalDocumentChange: (listener: (change: { source: string }) => void) => () => void
    saveDocumentAs: (payload: { name: string; source: string }) => Promise<{ name: string; path: string } | null>
    saveRecoverySnapshot: (payload: { documentId: string; version: number; source: string }) => Promise<{ version: number }>
    loadRecoverySnapshot: (documentId: string) => Promise<{ documentId: string; version: number; source: string; savedAt: string } | null>
    loadDocumentState: (documentId: string) => Promise<SensibleDocumentState | null>
    saveDocumentState: (state: Omit<SensibleDocumentState, 'schemaVersion'>) => Promise<SensibleDocumentState>
  }
}