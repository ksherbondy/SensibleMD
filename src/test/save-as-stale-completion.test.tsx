import { act } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';
import { deferred } from './scheduler';

it.each([false, true])('held Save As for A must not adopt its identity over subsequently activated B (StrictMode: %s)', async strictMode => {
  const s = await startScenario({ strictMode, storage: { 'sensiblemd-document': '# A', 'sensiblemd-name': 'A.md' } });
  const completion = deferred<SensibleOpenedDocument | null>();
  // Hold the renderer completion rather than asserting fake filesystem behavior.
  const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs').mockReturnValueOnce(completion.promise);
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A'], 'A.md', { type: 'text/markdown' }),
      new File(['# B'], 'B.md', { type: 'text/markdown' }),
    ]);
    await s.settle();
    await s.save();
    expect(saveAs).toHaveBeenCalledExactlyOnceWith({ name: 'A.md', source: '# A' });
    // Chapter activation does not change the native authorization/session, so
    // the main-process Save As session guard cannot invalidate this transition.
    await s.switchChapter('B.md');
    await s.enterMode('Write'); await s.appendToEditor(' newer edits');
    const bId = document.querySelector('.app-shell')!.getAttribute('data-document-id')!;
    const bSession = document.querySelector('.app-shell')!.getAttribute('data-session-id');
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', bId);
    expect(s.documentName()).toBe('B.md');
    expect(s.chapterNames()).toEqual(['A.md', 'B.md']);
    await act(async () => completion.resolve({
      documentId: s.desktop.documentIdFor('/SavedA.md'),
      sessionId: 'held-save-as-session', name: 'SavedA.md', source: '# A',
    }));
    // B's source survives, but all ownership must remain attached to B as well.
    expect(s.editorSource()).toBe('# B newer edits');
    expect(s.isDirty()).toBe(true);
    expect(s.chapterNames()).toEqual(['A.md', 'B.md']);
    expect.soft(document.querySelector('.app-shell')).toHaveAttribute('data-document-id', bId);
    expect.soft(document.querySelector('.app-shell')).toHaveAttribute('data-session-id', bSession);
    expect.soft(s.documentName()).toBe('B.md');
    await s.switchChapter('B.md');
    await s.switchChapter('A.md');
    // The saved A collection entry must not have been replaced with B's text.
    expect.soft(localStorage.getItem('sensiblemd-document')).toBe('# A');
  } finally { s.unmount(); saveAs.mockRestore(); }
});
