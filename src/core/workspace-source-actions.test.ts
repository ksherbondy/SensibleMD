import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from './document-buffer';
import { createCollection, type CollectionDocument } from './document-collection';
import { updateWorkspaceSource } from './workspace-source-actions';

it.each([false, true])('does nothing beyond reading the current buffer when text is identical (dirty=%s)', dirty => {
  const documents = createCollection([{ name: 'A.md', source: '# A' }]);
  const buffer = new DocumentBuffer(documents[0].id, '# A');
  if (dirty) buffer.replace('# Edited', 'editor');
  const before = buffer.snapshot();
  const replace = vi.spyOn(buffer, 'replace');
  const snapshot = vi.spyOn(buffer, 'snapshot');
  const setCollection = vi.fn(); const setSource = vi.fn(); const setIsDirty = vi.fn();
  updateWorkspaceSource(before.text, { buffer, activeDocumentId: documents[0].id, setCollection, setSource, setIsDirty });
  expect(snapshot).toHaveBeenCalledOnce();
  expect(replace).not.toHaveBeenCalled();
  expect(setCollection).not.toHaveBeenCalled(); expect(setSource).not.toHaveBeenCalled(); expect(setIsDirty).not.toHaveBeenCalled();
  expect(buffer.snapshot()).toStrictEqual(before);
});

it('orders buffer, collection enqueue, source and dirty commits while retaining the functional collection updater', () => {
  const documents = createCollection([{ name: 'A.md', source: '# A' }, { name: 'B.md', source: '# B' }]);
  const buffer = new DocumentBuffer(documents[0].id, '# A');
  const calls: string[] = [];
  let update: ((documents: CollectionDocument[]) => CollectionDocument[]) | undefined;
  const snapshot = buffer.snapshot.bind(buffer); const replace = buffer.replace.bind(buffer);
  vi.spyOn(buffer, 'snapshot').mockImplementation(() => { calls.push('snapshot'); return snapshot(); });
  vi.spyOn(buffer, 'replace').mockImplementation((source, origin) => {
    calls.push(`replace:${origin}`);
    return replace(source, origin);
  });
  updateWorkspaceSource('# New A', {
    buffer, activeDocumentId: documents[0].id,
    setCollection: callback => { calls.push('collection'); expect(snapshot().text).toBe('# New A'); update = callback; },
    setSource: source => { calls.push('source'); expect(source).toBe('# New A'); },
    setIsDirty: dirty => { calls.push('dirty'); expect(dirty).toBe(true); },
  });
  // DocumentBuffer.apply reads its own snapshot after replacing text.
  expect(calls).toEqual(['snapshot', 'replace:editor', 'snapshot', 'collection', 'source', 'dirty']);
  expect(snapshot()).toMatchObject({ version: 1, text: '# New A', savedVersion: 0, isDirty: true });
  const newerB = { ...documents[1], source: '# Updated B elsewhere' };
  const current = [documents[0], newerB];
  Object.freeze(current); Object.freeze(documents[0]); Object.freeze(newerB);
  const result = update!(current);
  expect(result).not.toBe(current);
  expect(result[0]).toEqual({ ...documents[0], source: '# New A' });
  expect(result[1]).toBe(newerB);
  expect(current[0].source).toBe('# A');
});
