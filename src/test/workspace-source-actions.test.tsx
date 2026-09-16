import { act, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import type { MarkdownEditor } from '../components/MarkdownEditor';
import { DocumentBuffer } from '../core/document-buffer';
import * as collection from '../core/document-collection';
import { startScenario } from './scenario';

const captured = vi.hoisted(() => ({ props: null as ComponentProps<typeof MarkdownEditor> | null }));
vi.mock('../components/MarkdownEditor', async importOriginal => {
  const actual = await importOriginal<typeof import('../components/MarkdownEditor')>();
  return { MarkdownEditor: (props: ComponentProps<typeof MarkdownEditor>) => {
    captured.props = props;
    return <actual.MarkdownEditor {...props} />;
  } };
});
const editor = () => EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
const identity = () => {
  const shell = document.querySelector('.app-shell')!;
  return [shell.getAttribute('data-document-id'), shell.getAttribute('data-session-id')];
};

it.each(['Write', 'Split'] as const)('preserves identical echoes, buffer origin/version, identity, caret/undo and direct save in %s', async mode => {
  const s = await startScenario();
  const original = '# Native\n\nText.';
  try {
    s.desktop.addFile('/Native.md', original); s.desktop.openDialogResult = '/Native.md'; await s.openDocument();
    await s.clickOutlineHeading('Native'); await s.enterMode(mode);
    const ids = identity(); const view = editor();
    const replace = vi.spyOn(DocumentBuffer.prototype, 'replace');
    const snapshot = vi.spyOn(DocumentBuffer.prototype, 'snapshot');
    const replaceCollection = vi.spyOn(collection, 'replaceCollectionDocument');
    try {
      const initialEditorState = view.state;
      await act(async () => captured.props!.onChange(original));
      const buffer = snapshot.mock.contexts.at(-1) as DocumentBuffer;
      expect(buffer).toBeInstanceOf(DocumentBuffer);
      const before = buffer.snapshot();
      expect(replace).not.toHaveBeenCalled();
      expect(replaceCollection).not.toHaveBeenCalled();
      expect(view.state).toBe(initialEditorState);
      expect(s.isDirty()).toBe(false);
      expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
      const next = original + ' Edited';
      await act(async () => view.dispatch({ changes: { from: original.length, insert: ' Edited' }, selection: { anchor: next.length } }));
      expect(replace).toHaveBeenCalledExactlyOnceWith(next, 'editor');
      expect(replace.mock.contexts[0]).toBe(buffer);
      expect(buffer.snapshot().version).toBe(before.version + 1);
      expect(buffer.snapshot().text).toBe(next);
      expect(captured.props!.value).toBe(next);
      expect(localStorage.getItem('sensiblemd-document')).toBe(next);
      expect(replaceCollection.mock.lastCall?.slice(1)).toEqual([ids[0], next]);
      expect(replaceCollection.mock.results.at(-1)!.value.find((d: { id: string }) => d.id === ids[0]).source).toBe(next);
      expect(s.isDirty()).toBe(true);
      expect(identity()).toEqual(ids);
      expect(s.currentMode()).toBe(mode);
      expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Native');
      expect(view.state.selection.main.head).toBe(next.length);
      const version = buffer.snapshot().version;
      replace.mockClear(); replaceCollection.mockClear();
      const editedState = view.state;
      await act(async () => captured.props!.onChange(next));
      expect(replace).not.toHaveBeenCalled(); expect(replaceCollection).not.toHaveBeenCalled();
      expect(buffer.snapshot().version).toBe(version);
      expect(s.isDirty()).toBe(true);
      expect(view.state).toBe(editedState);
      await s.enterMode(mode === 'Write' ? 'Split' : 'Write');
      expect(editor()).toBe(view);
      expect(view.state.selection.main.head).toBe(0); // Existing mode projection returns to the selected heading.
      await act(async () => { expect(undo(view)).toBe(true); });
      expect(s.editorSource()).toBe(original);
      expect(captured.props!.value).toBe(original);
      expect(s.isDirty()).toBe(true); // Existing React dirty semantics do not compare against saved text.
      await act(async () => { expect(redo(view)).toBe(true); });
      expect(s.editorSource()).toBe(next);
      expect(view.state.selection.main.head).toBe(next.length);
      expect(identity()).toEqual(ids);
      await s.save();
      expect(s.desktop.diskContents('/Native.md')).toBe(next);
      expect(s.isDirty()).toBe(false);
      expect(identity()).toEqual(ids);
    } finally { replace.mockRestore(); snapshot.mockRestore(); replaceCollection.mockRestore(); }
  } finally { s.unmount(); }
});

it('edits only the active collection entry and uses the current callback after a document switch', async () => {
  const s = await startScenario();
  try {
    await s.user.upload(document.querySelector<HTMLInputElement>('input[multiple]')!, [new File(['# A'], 'A.md', { type: 'text/markdown' }), new File(['# B'], 'B.md', { type: 'text/markdown' })]);
    await waitFor(() => expect(s.documentName()).toBe('A.md'));
    await s.enterMode('Write');
    const replaceCollection = vi.spyOn(collection, 'replaceCollectionDocument');
    try {
      await s.appendToEditor('\nA edit');
      const previous = replaceCollection.mock.lastCall![0];
      const result = replaceCollection.mock.results.at(-1)!.value as collection.CollectionDocument[];
      expect(result[0].source).toBe('# A\nA edit');
      expect(result[1]).toBe(previous[1]);
      expect(result[1].source).toBe('# B');
      await s.switchChapter('B.md'); await s.enterMode('Write');
      await s.appendToEditor('\nB edit');
      const latest = replaceCollection.mock.results.at(-1)!.value as collection.CollectionDocument[];
      expect(latest.map(d => d.source)).toEqual(['# A\nA edit', '# B\nB edit']);
      expect(captured.props!.value).toBe('# B\nB edit');
      expect(identity()[0]).toBe(latest[1].id);
    } finally { replaceCollection.mockRestore(); }
  } finally { s.unmount(); }
});
