import { act, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import * as collectionSearch from '../core/collection-search';
import { startScenario } from './scenario';

it.each([
  { strict: false, batched: false }, { strict: true, batched: false },
  { strict: false, batched: true }, { strict: true, batched: true },
])('retains A structural source when activating B (StrictMode=$strict, batched=$batched)', async ({ strict, batched }) => {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const searches = vi.spyOn(collectionSearch, 'searchCollection');
  const s = await startScenario({ strictMode: strict });
  const buffer = reads.mock.contexts.at(-1); reads.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A'], 'A.md', { lastModified: 1 }),
      new File(['# B'], 'B.md', { lastModified: 1 }),
    ]); await s.settle();
    const aId = document.querySelector('.app-shell')!.getAttribute('data-document-id');
    await s.enterMode('Write'); await s.moveEditorCursorToLine(1);
    const demote = screen.getByRole('button', { name: 'Demote heading' });
    const b = within(screen.getByRole('navigation', { name: 'Collection chapters' })).getByRole('button', { name: /B.md/ });
    if (batched) {
      // Exercise publication before React commits, without replacing production
      // callbacks or delaying/mock-implementing the collection setter.
      act(() => { demote.click(); expect(buffer.snapshot().text).toBe('## A'); b.click(); });
      await s.settle();
    } else {
      await s.user.click(demote); await s.switchChapter('B.md');
    }
    expect(s.documentName()).toBe('B.md');
    expect(buffer.snapshot()).toMatchObject({ text: '# B', isDirty: false });
    expect(localStorage.getItem('sensiblemd-document')).toBe('# B');
    const documents = searches.mock.calls.at(-1)![0];
    expect.soft(documents.find(document => document.id === aId)?.source).toBe('## A');
    expect(documents.find(document => document.name === 'B.md')?.source).toBe('# B');
    await s.switchChapter('A.md');
    expect.soft(buffer.snapshot().text).toBe('## A');
    expect.soft(localStorage.getItem('sensiblemd-document')).toBe('## A');
    expect(s.isDirty()).toBe(true); expect(buffer.snapshot().isDirty).toBe(true);
  } finally { s.unmount(); searches.mockRestore(); }
});
