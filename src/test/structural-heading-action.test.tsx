import { act, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { DocumentBuffer } from '../core/document-buffer';
import * as collection from '../core/document-collection';
import { startScenario } from './scenario';

const source = '# Top\n\n## Target\n\nText.';
const editor = () => EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
const identity = () => {
  const shell = document.querySelector('.app-shell')!;
  return [shell.getAttribute('data-document-id'), shell.getAttribute('data-session-id')];
};

it.each(['Write', 'Split'] as const)('preserves structural apply, current line, caret/history, identity and save in %s', async mode => {
  const s = await startScenario();
  try {
    s.desktop.addFile('/Native.md', source); s.desktop.openDialogResult = '/Native.md'; await s.openDocument();
    await s.enterMode(mode); await s.moveEditorCursorToLine(3);
    const ids = identity(); const view = editor(); const caret = view.state.selection.main.head;
    const apply = vi.spyOn(DocumentBuffer.prototype, 'apply');
    const replaceCollection = vi.spyOn(collection, 'replaceCollectionDocument');
    try {
      await s.user.click(screen.getByRole('button', { name: 'Demote heading' }));
      const demoted = '# Top\n\n### Target\n\nText.';
      expect(apply).toHaveBeenCalledOnce();
      const buffer = apply.mock.contexts[0] as DocumentBuffer;
      expect(apply.mock.calls[0][0]).toStrictEqual({ origin: 'structural-command', baseVersion: buffer.snapshot().version - 1, edits: [{ from: 7, to: 9, insert: '###' }] });
      expect(buffer.snapshot().text).toBe(demoted);
      expect(s.editorSource()).toBe(demoted);
      expect(localStorage.getItem('sensiblemd-document')).toBe(demoted);
      expect(replaceCollection.mock.results.at(-1)!.value.find((d: { id: string }) => d.id === ids[0]).source).toBe(demoted);
      expect(s.isDirty()).toBe(true);
      expect(s.currentMode()).toBe(mode);
      expect(identity()).toEqual(ids);
      expect(editor()).toBe(view);
      expect(view.state.selection.main.head).toBe(0); // Existing downstream navigation projects to the first heading.
      await act(async () => { expect(undo(view)).toBe(true); });
      expect(s.editorSource()).toBe(source);
      expect(view.state.selection.main.head).toBe(caret);
      expect(s.isDirty()).toBe(true);
      await act(async () => { expect(redo(view)).toBe(true); });
      expect(s.editorSource()).toBe(demoted);
      expect(view.state.selection.main.head).toBe(demoted.length);
      await s.moveEditorCursorToLine(3);
      const before = buffer.snapshot().version; apply.mockClear();
      await s.user.click(screen.getByRole('button', { name: 'Promote heading' }));
      expect(apply).toHaveBeenCalledExactlyOnceWith({ origin: 'structural-command', baseVersion: before, edits: [{ from: 7, to: 10, insert: '##' }] });
      expect(buffer.snapshot().version).toBe(before + 1);
      expect(s.editorSource()).toBe(source);
      expect(s.isDirty()).toBe(true);
      expect(identity()).toEqual(ids);
      await s.save();
      expect(s.desktop.diskContents('/Native.md')).toBe(source);
      expect(s.isDirty()).toBe(false);
    } finally { apply.mockRestore(); replaceCollection.mockRestore(); }
  } finally { s.unmount(); }
});

it('keeps invalid structural commands as clean/dirty no-ops without buffer or collection changes', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': '# Top\n\nPlain text.\n\n###### Bottom' } });
  try {
    await s.enterMode('Write');
    const apply = vi.spyOn(DocumentBuffer.prototype, 'apply');
    const snapshots = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
    const replaceCollection = vi.spyOn(collection, 'replaceCollectionDocument');
    try {
      for (const dirty of [false, true]) {
        if (dirty) await s.appendToEditor('\nEdited.');
        for (const [line, name] of [[1, 'Promote heading'], [3, 'Promote heading'], [3, 'Demote heading'], [5, 'Demote heading']] as const) {
          await s.moveEditorCursorToLine(line);
          apply.mockClear(); replaceCollection.mockClear();
          const state = editor().state;
          const buffer = snapshots.mock.contexts.at(-1) as DocumentBuffer;
          const before = buffer.snapshot();
          await s.user.click(screen.getByRole('button', { name }));
          expect(apply).not.toHaveBeenCalled(); expect(replaceCollection).not.toHaveBeenCalled();
          expect(buffer.snapshot()).toStrictEqual(before);
          expect(editor().state).toBe(state);
          expect(s.isDirty()).toBe(dirty);
        }
      }
    } finally { apply.mockRestore(); snapshots.mockRestore(); replaceCollection.mockRestore(); }
  } finally { s.unmount(); }
});

it('updates only the active collection entry through the existing editor structural shortcut', async () => {
  const s = await startScenario();
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [new File([source], 'A.md', { type: 'text/markdown' }), new File(['# B'], 'B.md', { type: 'text/markdown' })]);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    await s.enterMode('Write'); await s.moveEditorCursorToLine(3);
    const change = vi.spyOn(collection, 'replaceCollectionDocument');
    try {
      editor().focus();
      await s.user.keyboard('{Control>}{Alt>}{ArrowDown}{/Alt}{/Control}');
      expect(s.editorSource()).toBe('# Top\n\n### Target\n\nText.');
      const prior = change.mock.lastCall![0];
      const result = change.mock.results.at(-1)!.value as collection.CollectionDocument[];
      expect(result[0].source).toBe(s.editorSource());
      expect(result[1]).toBe(prior[1]);
      expect(result[1].source).toBe('# B');
      expect(identity()[0]).toBe(result[0].id);
    } finally { change.mockRestore(); }
  } finally { s.unmount(); }
});
