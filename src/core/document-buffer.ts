export type TransactionOrigin = 'editor' | 'structural-command' | 'external-reload' | 'undo' | 'redo' | 'recovery' | 'programmatic'

export interface SourceEdit {
  from: number
  to: number
  insert: string
}

export interface SourceTransaction {
  origin: TransactionOrigin
  baseVersion: number
  edits: SourceEdit[]
}

export interface DocumentSnapshot {
  id: string
  text: string
  version: number
  savedVersion: number
  isDirty: boolean
}

export class DocumentBuffer {
  readonly id: string
  private text: string
  private version = 0
  private savedVersion = 0
  private readonly listeners = new Set<(snapshot: DocumentSnapshot) => void>()

  constructor(id: string, initialText: string) {
    this.id = id
    this.text = initialText
  }

  snapshot(): DocumentSnapshot {
    return { id: this.id, text: this.text, version: this.version, savedVersion: this.savedVersion, isDirty: this.version !== this.savedVersion }
  }

  apply(transaction: SourceTransaction): DocumentSnapshot {
    if (transaction.baseVersion !== this.version) throw new Error(`Stale transaction: expected version ${this.version}, received ${transaction.baseVersion}`)
    const edits = [...transaction.edits].sort((left, right) => right.from - left.from)
    let nextText = this.text
    for (const edit of edits) {
      if (edit.from < 0 || edit.to < edit.from || edit.to > nextText.length) throw new Error('Invalid source edit range')
      nextText = `${nextText.slice(0, edit.from)}${edit.insert}${nextText.slice(edit.to)}`
    }
    this.text = nextText
    this.version += 1
    const snapshot = this.snapshot()
    this.listeners.forEach((listener) => listener(snapshot))
    return snapshot
  }

  replace(text: string, origin: TransactionOrigin = 'programmatic'): DocumentSnapshot {
    return this.apply({ origin, baseVersion: this.version, edits: [{ from: 0, to: this.text.length, insert: text }] })
  }

  markSaved(): DocumentSnapshot {
    this.savedVersion = this.version
    const snapshot = this.snapshot()
    this.listeners.forEach((listener) => listener(snapshot))
    return snapshot
  }

  subscribe(listener: (snapshot: DocumentSnapshot) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}