import { act, screen, within } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import * as collectionSearch from '../core/collection-search';
import { startScenario } from './scenario';

it.each([
  { strict: false, order: 'edit then activate' }, { strict: true, order: 'edit then activate' },
  { strict: false, order: 'activate then pending editor update' }, { strict: true, order: 'activate then pending editor update' },
])('keeps B source aligned when A editor work overlaps activation ($order, StrictMode=$strict)', async ({ strict, order }) => {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const searches = vi.spyOn(collectionSearch, 'searchCollection');
  const s = await startScenario({ strictMode: strict });
  const buffer = reads.mock.contexts.at(-1); reads.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A'], 'A.md', { lastModified: 1 }), new File(['# B'], 'B.md', { lastModified: 1 }),
    ]); await s.settle();
    const aId = document.querySelector('.app-shell')!.getAttribute('data-document-id');
    await s.enterMode('Write');
    const editor = EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
    const b = within(screen.getByRole('navigation', { name: 'Collection chapters' })).getByRole('button', { name: /B.md/ });
    const dispatch = () => editor.dispatch({ changes: { from: editor.state.doc.length, insert: ' pending A edit' } });
    act(() => {
      if (order === 'edit then activate') { dispatch(); b.click(); }
      else {
        b.click();
        // The active buffer has changed synchronously, but A's real editor and
        // its committed callback are still mounted until React commits.
        expect(buffer.snapshot().text).toBe('# B');
        expect(editor.state.doc.toString()).toBe('# A');
        dispatch();
      }
    });
    await s.settle();
    expect(s.documentName()).toBe('B.md');
    const documents = searches.mock.calls.at(-1)![0];
    const bEntry = documents.find(document => document.name === 'B.md')!;
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', bEntry.id);
    expect(bEntry.source).toBe('# B');
    expect.soft(buffer.snapshot().text).toBe('# B');
    expect.soft(localStorage.getItem('sensiblemd-document')).toBe('# B');
    expect.soft(buffer.snapshot().isDirty).toBe(false); expect.soft(s.isDirty()).toBe(false);
    if (order === 'edit then activate') {
      expect(documents.find(document => document.id === aId)?.source).toBe('# A pending A edit');
      await s.switchChapter('A.md');
      expect(buffer.snapshot().text).toBe('# A pending A edit'); expect(s.isDirty()).toBe(true);
    }
  } finally { s.unmount(); searches.mockRestore(); }
});
