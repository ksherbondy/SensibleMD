import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import { startScenario } from './scenario';

it.each([
  ['collection selection', false], ['collection selection', true],
  ['next chapter', false], ['next chapter', true],
] as const)('does not manufacture unsaved changes when activating an untouched chapter via %s (StrictMode=%s)', async (route, strictMode) => {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ strictMode, storage: { 'sensiblemd-document': '# Initial' } });
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A'], 'A.md', { type: 'text/markdown' }),
      new File(['# B'], 'B.md', { type: 'text/markdown' }),
    ]);
    await s.settle();
    const buffer = reads.mock.contexts.find(value => value instanceof DocumentBuffer);
    if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
    const before = buffer.snapshot();
    expect(before).toMatchObject({ text: '# A', version: 1, savedVersion: 1, isDirty: false });
    expect(s.isDirty()).toBe(false);
    const aId = document.querySelector('.app-shell')!.getAttribute('data-document-id');
    if (route === 'collection selection') await s.switchChapter('B.md');
    else await s.user.click(screen.getByRole('button', { name: 'Next chapter' }));
    await s.settle();
    expect(s.documentName()).toBe('B.md');
    expect(document.querySelector('.app-shell')).not.toHaveAttribute('data-document-id', aId);
    expect(document.querySelector('.app-shell')).toHaveAttribute('data-session-id', '');
    expect(localStorage.getItem('sensiblemd-document')).toBe('# B');
    expect(s.isDirty()).toBe(false);
    expect(buffer.snapshot().text).toBe('# B');
    expect(buffer.snapshot().version).toBe(before.version + 1);
    // No user edit occurred. A clean activation must not become unsaved solely
    // because the single workspace buffer was reused for another document.
    expect.soft(buffer.snapshot().isDirty).toBe(false);
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    await s.settle();
    expect.soft(s.status()).not.toBe('Save your changes before closing this document.');
    expect(screen.queryByText('No document open')).toBeInTheDocument();
  } finally { s.unmount(); reads.mockRestore(); }
});

it.each([
  ['collection selection', false], ['collection selection', true],
  ['chapter navigation', false], ['chapter navigation', true],
] as const)('retains edited A across an untouched B round trip via %s (StrictMode=%s)', async (route, strictMode) => {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario({ strictMode });
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A'], 'A.md', { type: 'text/markdown' }),
      new File(['# B'], 'B.md', { type: 'text/markdown' }),
    ]);
    await s.settle();
    const buffer = reads.mock.contexts.find(value => value instanceof DocumentBuffer);
    if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
    const savedA = buffer.snapshot();
    await s.enterMode('Write'); await s.appendToEditor(' unsaved A');
    const editedA = buffer.snapshot();
    expect(s.isDirty()).toBe(true); expect(editedA.isDirty).toBe(true);
    expect(editedA.savedVersion).toBe(savedA.savedVersion);
    await s.enterMode('Read');
    if (route === 'collection selection') await s.switchChapter('B.md');
    else await s.user.click(screen.getByRole('button', { name: 'Next chapter' }));
    await s.settle();
    expect(buffer.snapshot().text).toBe('# B'); expect(s.isDirty()).toBe(false);
    expect.soft(buffer.snapshot().isDirty).toBe(false);
    if (route === 'collection selection') await s.switchChapter('A.md');
    else await s.user.click(screen.getByRole('button', { name: 'Previous chapter' }));
    await s.settle();
    expect(buffer.snapshot().text).toBe('# A unsaved A');
    expect(localStorage.getItem('sensiblemd-document')).toBe('# A unsaved A');
    expect(buffer.snapshot().version).toBeGreaterThan(editedA.version);
    expect.soft(s.isDirty()).toBe(true);
    expect.soft(buffer.snapshot().isDirty).toBe(true);
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(s.status()).toBe('Save your changes before closing this document.');
    expect(screen.queryByText('No document open')).toBeNull();
  } finally { s.unmount(); reads.mockRestore(); }
});

it('retains edited A when the outgoing path bypasses both collection activation handlers and B is subsequently saved', async () => {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const s = await startScenario();
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File(['# A\n\n[Go to B](B.md)'], 'A.md', { type: 'text/markdown' }),
      new File(['# B'], 'B.md', { type: 'text/markdown' }),
    ]);
    await s.settle();
    const buffer = reads.mock.contexts.find(value => value instanceof DocumentBuffer);
    if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
    await s.enterMode('Write'); await s.appendToEditor(' unsaved A');
    const editedA = buffer.snapshot();
    await s.enterMode('Read');
    // This invokes followInternalLink, not switchDocument or navigateChapter.
    await s.user.click(screen.getByRole('link', { name: 'Go to B' }));
    await s.settle(); expect(s.documentName()).toBe('B.md');
    s.desktop.saveAsDialogResult = '/SavedB.md'; await s.save();
    expect(s.isDirty()).toBe(false); expect(buffer.snapshot().isDirty).toBe(false);
    expect(s.desktop.diskContents('/SavedB.md')).toBe('# B');
    await s.switchChapter('A.md');
    expect(buffer.snapshot().text).toBe(editedA.text);
    expect.soft(s.isDirty()).toBe(true);
    expect.soft(buffer.snapshot().isDirty).toBe(true);
    await s.user.click(screen.getByRole('button', { name: 'Close document' }));
    expect(s.status()).toBe('Save your changes before closing this document.');
  } finally { s.unmount(); reads.mockRestore(); }
});
