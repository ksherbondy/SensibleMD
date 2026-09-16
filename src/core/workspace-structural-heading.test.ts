import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from './document-buffer';
import { createCollection, type CollectionDocument } from './document-collection';
import { applyWorkspaceStructuralHeadingChange } from './workspace-source-actions';

it.each([['# A', 'promote'], ['###### A', 'demote']] as const)('returns before any buffer read/write or state commit for invalid %s %s', (source, direction) => {
  const documents = createCollection([{ name: 'A.md', source }]);
  const buffer = new DocumentBuffer(documents[0].id, source);
  const snapshot = vi.spyOn(buffer, 'snapshot'); const apply = vi.spyOn(buffer, 'apply');
  const setCollection = vi.fn(); const setSource = vi.fn(); const setIsDirty = vi.fn();
  applyWorkspaceStructuralHeadingChange(direction, { source, editorLine: 1, buffer, activeDocumentId: documents[0].id, setCollection, setSource, setIsDirty });
  expect(snapshot).not.toHaveBeenCalled(); expect(apply).not.toHaveBeenCalled();
  expect(setCollection).not.toHaveBeenCalled(); expect(setSource).not.toHaveBeenCalled(); expect(setIsDirty).not.toHaveBeenCalled();
});

it('preserves exact apply/baseVersion and snapshot timing including the deferred collection read', () => {
  const documents = createCollection([{ name: 'A.md', source: '# A' }, { name: 'B.md', source: '# B' }]);
  const calls: string[] = [];
  let text = '# A'; let version = 7;
  const state = () => ({ id: documents[0].id, text, version, savedVersion: 7, isDirty: version !== 7 });
  const buffer: Pick<DocumentBuffer, 'snapshot' | 'apply'> = {
    snapshot: vi.fn(() => { calls.push('snapshot'); return state(); }),
    apply: vi.fn(transaction => {
      calls.push('apply');
      expect(transaction).toStrictEqual({ origin: 'structural-command', baseVersion: 7, edits: [{ from: 0, to: 1, insert: '##' }] });
      text = '## A'; version++;
      return state();
    }),
  };
  let update: ((documents: CollectionDocument[]) => CollectionDocument[]) | undefined;
  applyWorkspaceStructuralHeadingChange('demote', {
    source: '# A', editorLine: 1, buffer, activeDocumentId: documents[0].id,
    setCollection: callback => { calls.push('collection'); update = callback; },
    setSource: source => { calls.push('source'); expect(source).toBe('## A'); },
    setIsDirty: dirty => { calls.push('dirty'); expect(dirty).toBe(true); },
  });
  expect(calls).toEqual(['snapshot', 'apply', 'collection', 'snapshot', 'source', 'dirty']);
  expect(buffer.apply).toHaveBeenCalledOnce();
  // The original updater reads the live buffer when React applies it; it does not cache apply's text.
  text = '## Later buffer text';
  const newerB = { ...documents[1], source: '# Later B' };
  const current = [documents[0], newerB];
  Object.freeze(current); Object.freeze(documents[0]); Object.freeze(newerB);
  const result = update!(current);
  expect(calls.at(-1)).toBe('snapshot');
  expect(buffer.snapshot).toHaveBeenCalledTimes(3);
  expect(result[0]).toEqual({ ...documents[0], source: text });
  expect(result[1]).toBe(newerB);
  expect(current[0].source).toBe('# A');
});
