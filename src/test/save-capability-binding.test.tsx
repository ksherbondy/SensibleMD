import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from '../core/document-buffer';
import * as collectionSearch from '../core/collection-search';
import { startScenario } from './scenario';

const id = () => document.querySelector('.app-shell')!.getAttribute('data-document-id');
const session = () => document.querySelector('.app-shell')!.getAttribute('data-session-id');

// Safety regression: deliberately fails until save capability is bound to the
// active document. All disk writes here are in the FakeDesktop in-memory map.
it.each([false, true])('does not save browser chapter B over native A after internal-link activation (StrictMode=%s)', async strictMode => {
  const reads = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
  const searches = vi.spyOn(collectionSearch, 'searchCollection');
  const s = await startScenario({ strictMode });
  const buffer = reads.mock.contexts.at(-1); reads.mockRestore();
  if (!(buffer instanceof DocumentBuffer)) throw new Error('Expected workspace buffer');
  const aSource = '# A\n\n[Go to B](B.md)', bSource = '# B';
  const direct = vi.spyOn(s.desktop.api, 'saveOpenedDocument');
  const saveAs = vi.spyOn(s.desktop.api, 'saveDocumentAs');
  const collection = () => searches.mock.calls.at(-1)![0];
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [
      new File([aSource], 'A.md', { lastModified: 1 }),
      new File([bSource], 'B.md', { lastModified: 1 }),
    ]); await s.settle();
    const browserA = id(), browserB = collection()[1].id;
    expect(session()).toBe(''); expect(s.isDirty()).toBe(false);
    expect(collection()).toEqual([
      { id: browserA, name: 'A.md', source: aSource },
      { id: browserB, name: 'B.md', source: bSource },
    ]);
    // Clean browser A can invoke Save: it has no direct-save capability.
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    s.desktop.saveAsDialogResult = '/NativeA.md'; await s.save();
    const nativeA = s.desktop.documentIdFor('/NativeA.md'), nativeSession = session();
    expect(id()).toBe(nativeA); expect(nativeSession).toBeTruthy();
    expect(s.desktop.authorizedPath).toBe('/NativeA.md');
    expect(s.desktop.diskContents('/NativeA.md')).toBe(aSource);
    expect(collection()).toEqual([
      { id: nativeA, name: 'NativeA.md', source: aSource },
      { id: browserB, name: 'B.md', source: bSource },
    ]);
    expect(buffer.snapshot()).toMatchObject({ text: aSource, isDirty: false });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(saveAs).toHaveBeenCalledOnce();

    await s.user.click(screen.getByRole('link', { name: 'Go to B' })); await s.settle();
    expect(id()).toBe(browserB); expect(s.documentName()).toBe('B.md');
    expect(buffer.snapshot()).toMatchObject({ text: bSource, isDirty: false });
    expect(s.isDirty()).toBe(false);
    // A browser-only target must not inherit A's renderer save binding.
    // These soft assertions retain the end-to-end wrong-file write evidence.
    expect.soft(session()).toBe('');
    expect(s.desktop.authorizedPath).toBe('/NativeA.md');
    expect.soft(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
    await s.enterMode('Write'); await s.appendToEditor(' edited B');
    const editedB = buffer.snapshot().text;
    expect(collection()).toEqual([
      { id: nativeA, name: 'NativeA.md', source: aSource },
      { id: browserB, name: 'B.md', source: editedB },
    ]);
    expect(s.isDirty()).toBe(true); expect(buffer.snapshot().isDirty).toBe(true);
    direct.mockClear(); saveAs.mockClear();
    s.desktop.saveAsDialogResult = null; // A correct Save As branch would cancel without writing.
    await s.save();
    expect(id()).toBe(browserB);
    expect(collection()).toEqual([
      { id: nativeA, name: 'NativeA.md', source: aSource },
      { id: browserB, name: 'B.md', source: editedB },
    ]);

    expect.soft(direct).not.toHaveBeenCalled();
    expect.soft(saveAs).toHaveBeenCalledExactlyOnceWith({ name: 'B.md', source: editedB });
    expect.soft(s.desktop.diskContents('/NativeA.md')).toBe(aSource);
    expect.soft(s.isDirty()).toBe(true);
    expect.soft(buffer.snapshot().isDirty).toBe(true);
  } finally { s.unmount(); searches.mockRestore(); direct.mockRestore(); saveAs.mockRestore(); }
});
