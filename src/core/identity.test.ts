import { describe, expect, it } from 'vitest'
import { asDocumentId, browserDocumentId, identityDigest, inMemoryDocumentId, isDocumentId, WELCOME_DOCUMENT_ID } from './identity'
import { adjacentCollectionDocument, createCollection } from './document-collection'
import { NavigationHistory } from './navigation-history'

describe('identity primitives', () => {
  it('accepts identifiers the main process can use as a filename component', () => {
    expect(isDocumentId(WELCOME_DOCUMENT_ID)).toBe(true)
    expect(isDocumentId(browserDocumentId({ name: 'notes.md', size: 12, lastModified: 3 }))).toBe(true)
    expect(isDocumentId(inMemoryDocumentId({ name: 'notes.md', source: '# Notes' }))).toBe(true)
  })

  it('rejects identifiers containing path separators or traversal', () => {
    expect(isDocumentId('../escape')).toBe(false)
    expect(isDocumentId('nested/id')).toBe(false)
    expect(isDocumentId('')).toBe(false)
    expect(() => asDocumentId('../escape')).toThrow('Invalid document identifier')
  })

  it('derives digests without depending on host locale or Unicode form', () => {
    const composed = 'Re\u0301sume\u0301'
    const precomposed = 'R\u00e9sum\u00e9'
    expect(identityDigest(composed)).toBe(identityDigest(precomposed))
    expect(identityDigest('Notes')).not.toBe(identityDigest('notes'))
  })

  it('keeps browser file identity stable while the file is unmodified', () => {
    const file = { name: 'guide.md', size: 400, lastModified: 1_700_000_000_000 }
    expect(browserDocumentId(file)).toBe(browserDocumentId({ ...file }))
    expect(browserDocumentId(file)).not.toBe(browserDocumentId({ ...file, lastModified: 1_700_000_000_001 }))
    expect(browserDocumentId(file)).not.toBe(browserDocumentId({ ...file, name: 'other.md' }))
  })
})

describe('collection identity', () => {
  it('does not derive identity from position in the collection', () => {
    const intro = { id: asDocumentId('doc-intro'), name: 'Intro.md', source: '# Intro' }
    const guide = { id: asDocumentId('doc-guide'), name: 'Guide.md', source: '# Guide' }
    const before = createCollection([intro, guide])
    const after = createCollection([{ id: asDocumentId('doc-preface'), name: 'Preface.md', source: '# Preface' }, intro, guide])

    expect(after.map((document) => document.id)).toContain(before[0].id)
    expect(after.map((document) => document.id)).toContain(before[1].id)
  })

  it('gives same-named documents from different sources distinct identities', () => {
    const [first, second] = createCollection([
      { id: asDocumentId('doc-project-a-notes'), name: 'notes.md', source: '# A' },
      { id: asDocumentId('doc-project-b-notes'), name: 'notes.md', source: '# B' },
    ])
    expect(first.id).not.toBe(second.id)
  })

  it('never yields two documents sharing an identity', () => {
    const duplicate = { name: 'notes.md', source: '# Same' }
    const documents = createCollection([duplicate, duplicate, duplicate])
    expect(new Set(documents.map((document) => document.id)).size).toBe(3)
  })

  it('navigates a collection by identity rather than by name', () => {
    const documents = createCollection([
      { id: asDocumentId('doc-one'), name: 'notes.md', source: '# One' },
      { id: asDocumentId('doc-two'), name: 'notes.md', source: '# Two' },
    ])
    expect(adjacentCollectionDocument(documents, documents[0].id, 'next')?.id).toBe(documents[1].id)
    expect(adjacentCollectionDocument(documents, documents[1].id, 'previous')?.id).toBe(documents[0].id)
  })
})

describe('navigation history identity', () => {
  it('distinguishes the same heading id in two different documents', () => {
    const history = new NavigationHistory()
    const first = asDocumentId('doc-chapter-one')
    const second = asDocumentId('doc-chapter-two')

    history.visit({ documentId: first, headingId: 'heading-0-0', reason: 'manual' })
    history.visit({ documentId: second, headingId: 'heading-0-0', reason: 'manual' })

    expect(history.canGoBack()).toBe(true)
    expect(history.back()).toMatchObject({ documentId: first, headingId: 'heading-0-0' })
  })

  it('still collapses a repeat visit to the same place in the same document', () => {
    const history = new NavigationHistory()
    const document = asDocumentId('doc-chapter-one')

    history.visit({ documentId: document, headingId: 'heading-0-0', reason: 'manual' })
    history.visit({ documentId: document, headingId: 'heading-0-0', reason: 'outline' })

    expect(history.canGoBack()).toBe(false)
  })
})
