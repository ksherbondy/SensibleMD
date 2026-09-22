import { act, render } from '@testing-library/react';
import { useLayoutEffect } from 'react';
import { EditorView } from '@codemirror/view';
import { undo, redo } from '@codemirror/commands';
import { expect, it, vi } from 'vitest';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { EditorMutationOwnership, type EditorMutationOrigin } from '../core/editor-mutation-ownership';
import { asDocumentId } from '../core/identity';

const editor = () => EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
function AfterEditorCommit({ run }: { run: () => void }) {
  useLayoutEffect(run, [run]);
  return null;
}

it.each([false, true])('does not relabel old content when new callbacks commit (identical source=%s)', sameText => {
  const owner = new EditorMutationOwnership(asDocumentId('doc-a')); owner.mount();
  const a = owner.initial;
  const emitted = vi.fn(), accepted = vi.fn();
  const element = (activation: typeof a, value: string, run = () => {}) => <>
    <MarkdownEditor value={value} activation={activation} isActivationCurrent={token => owner.isCurrent(token)}
      onChange={(text, origin) => { emitted(text, origin); if (owner.accepts(activation, activation.documentId, origin)) accepted(text); }}
      cursorLine={1} onCursorLineChange={() => {}} onPromoteHeading={() => {}} onDemoteHeading={() => {}} jumpToLine={null} />
    <AfterEditorCommit run={run} />
  </>;
  const rendered = render(element(a, '# A'));
  const view = editor();
  owner.invalidate(); const b = owner.activate(asDocumentId('doc-b'));
  const value = sameText ? '# A' : '# B';
  rendered.rerender(element(b, value, () => {
    expect(view.state.doc.toString()).toBe('# A');
    // Child callback layout effect has run; its source projection has not.
    view.dispatch({ changes: { from: view.state.doc.length, insert: ' obsolete' } });
    expect(emitted).not.toHaveBeenCalled(); expect(accepted).not.toHaveBeenCalled();
  }));
  expect(editor()).toBe(view); expect(view.state.doc.toString()).toBe(value);
  expect(emitted).not.toHaveBeenCalled(); // B projection is not a mutation echo.
  act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: ' current' } }));
  expect(accepted).toHaveBeenCalledExactlyOnceWith(value + ' current');
  expect(emitted.mock.lastCall![1].activation).toBe(b);
  rendered.unmount();
});

it('adopts a new activation token even when identical text needs no projection transaction', () => {
  const owner = new EditorMutationOwnership(asDocumentId('doc-a')); owner.mount();
  const emitted = vi.fn();
  const element = (activation: typeof owner.initial) => <MarkdownEditor value="# Same" activation={activation}
    isActivationCurrent={token => owner.isCurrent(token)} onChange={emitted}
    cursorLine={1} onCursorLineChange={() => {}} onPromoteHeading={() => {}} onDemoteHeading={() => {}} jumpToLine={null} />;
  const r = render(element(owner.initial)); const view = editor(), state = view.state;
  owner.invalidate(); const next = owner.activate(asDocumentId('doc-a'));
  r.rerender(element(next)); expect(view.state).toBe(state);
  act(() => view.dispatch({ changes: { from: view.state.doc.length, insert: ' current' } }));
  expect(emitted.mock.lastCall![1].activation).toBe(next);
  r.unmount();
});

it('skips a projection whose activation has already departed', () => {
  const owner = new EditorMutationOwnership(asDocumentId('doc-a')); owner.mount();
  const emitted = vi.fn();
  const element = (value: string) => <MarkdownEditor value={value} activation={owner.initial}
    isActivationCurrent={token => owner.isCurrent(token)} onChange={emitted}
    cursorLine={1} onCursorLineChange={() => {}} onPromoteHeading={() => {}} onDemoteHeading={() => {}} jumpToLine={null} />;
  const r = render(element('# A')); owner.invalidate(); owner.activate(asDocumentId('doc-b'));
  r.rerender(element('# Late A'));
  expect(editor().state.doc.toString()).toBe('# A'); expect(emitted).not.toHaveBeenCalled(); r.unmount();
});

it('source projection does not echo, while later undo and redo remain ordinary mutations', () => {
  const owner = new EditorMutationOwnership(asDocumentId('doc-a')); owner.mount();
  const emitted = vi.fn();
  const element = (value: string) => <MarkdownEditor value={value} activation={owner.initial}
    isActivationCurrent={token => owner.isCurrent(token)} onChange={emitted}
    cursorLine={1} onCursorLineChange={() => {}} onPromoteHeading={() => {}} onDemoteHeading={() => {}} jumpToLine={null} />;
  const r = render(element('# A')), view = editor();
  r.rerender(element('# Restored')); expect(emitted).not.toHaveBeenCalled();
  act(() => { expect(undo(view)).toBe(true); }); expect(emitted.mock.lastCall![0]).toBe('# A');
  act(() => { expect(redo(view)).toBe(true); }); expect(emitted.mock.lastCall![0]).toBe('# Restored');
  expect(emitted).toHaveBeenCalledTimes(2); r.unmount();
});

it('StrictMode cleanup permanently revokes the first view lease while replacement setup works', () => {
  const owner = new EditorMutationOwnership(asDocumentId('doc-a')); owner.mount();
  const origins: EditorMutationOrigin[] = [];
  const r = render(<MarkdownEditor value="# A" activation={owner.initial}
    isActivationCurrent={token => owner.isCurrent(token)} onChange={(_text, origin) => origins.push(origin)}
    cursorLine={1} onCursorLineChange={() => {}} onPromoteHeading={() => {}} onDemoteHeading={() => {}} jumpToLine={null}
    onScrollAdapter={adapter => {
      if (adapter) editor().dispatch({ changes: { from: 0, to: 3, insert: '# A' } });
    }} />, { reactStrictMode: true });
  expect(origins).toHaveLength(2);
  expect(origins[0].lease.live).toBe(false); expect(origins[1].lease.live).toBe(true);
  expect(owner.accepts(owner.initial, owner.initial.documentId, origins[0])).toBe(false);
  expect(owner.accepts(owner.initial, owner.initial.documentId, origins[1])).toBe(true);
  r.unmount(); expect(origins[1].lease.live).toBe(false);
});
