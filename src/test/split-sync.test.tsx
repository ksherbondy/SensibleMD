import { act, fireEvent } from '@testing-library/react';
import { EditorView } from '@codemirror/view';
import { expect, it, vi } from 'vitest';
import { connectSplit, type SplitEditor } from '../core/split-sync';
import { parseSemanticDocument } from '../core/semantic-document';
import { startScenario } from './scenario';

const source = '# Alpha\n\nFirst.\n\n# Beta\n\nSecond.\n\n# Gamma\n\nThird.';
const model = parseSemanticDocument(source, 0);
async function frame() { await act(async () => { await new Promise(resolve => requestAnimationFrame(resolve)); }); }
function fixture() {
  const preview = document.createElement('article');
  document.body.append(preview);
  Object.defineProperty(preview, 'clientHeight', { value: 300 });
  vi.spyOn(preview, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 500, 300));
  const rectangles = model.nodes.map((node, index) => {
    const element = document.createElement(node.type === 'heading' ? 'h1' : 'p');
    element.id = node.type === 'heading' ? node.id : `reader-node-${node.id}`;
    preview.append(element);
    return vi.spyOn(element, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, index * 400 - preview.scrollTop, 500, 400));
  });
  let offset = 0;
  let currentSource = source;
  let revision = 0;
  const work = { interruptCurrentContext: () => { revision++; }, capture: () => { const r = revision; return () => revision === r; } };
  const editor: SplitEditor = { scrollDOM: document.createElement('div'), source: () => currentSource, offsetAtAnchor: () => offset, reveal: vi.fn() };
  const observe = vi.fn();
  const bridge = connectSplit(model, editor, preview, work, observe);
  return { preview, editor, bridge, observe, rectangles, setOffset: (n: number) => { offset = n; }, stale: () => { currentSource = 'changed'; }, dispose: () => { bridge.dispose(); preview.remove(); } };
}
it('editor scroll selects a source node, reveals preview at its own anchor, and cannot echo back', async () => {
  const f = fixture();
  try {
    f.setOffset(model.nodes[2].range.start);
    fireEvent.wheel(f.editor.scrollDOM); fireEvent.scroll(f.editor.scrollDOM); await frame();
    expect(f.preview.scrollTop).toBe(700); // Node top 800 minus preview anchor 100, not editor pixels.
    expect(f.observe).toHaveBeenCalledWith(model.nodes[2]);
    fireEvent.scroll(f.preview); await frame();
    expect(f.editor.reveal).not.toHaveBeenCalled();
    expect(f.observe).toHaveBeenCalledTimes(1);
  } finally { f.dispose(); }
});
it('preview scroll resolves cached block geometry to source; only fresh user input can change driver', async () => {
  const f = fixture();
  try {
    f.preview.scrollTop = 1500;
    fireEvent.wheel(f.preview); fireEvent.scroll(f.preview); await frame();
    expect(f.editor.reveal).toHaveBeenCalledWith(model.nodes[4].range.start);
    const reads = f.rectangles.map(rect => rect.mock.calls.length);
    fireEvent.scroll(f.editor.scrollDOM); fireEvent.scroll(f.preview); await frame();
    expect(f.editor.reveal).toHaveBeenCalledTimes(1);
    expect(f.rectangles.map(rect => rect.mock.calls.length)).toEqual(reads);
    f.setOffset(model.nodes[1].range.start);
    fireEvent.wheel(f.editor.scrollDOM); fireEvent.scroll(f.editor.scrollDOM); await frame();
    expect(f.preview.scrollTop).toBe(300);
  } finally { f.dispose(); }
});
it('programmatic navigation and stale source/lifetime work never drive fresh navigation', async () => {
  const f = fixture();
  try {
    f.bridge.navigate(model.nodes[2].range.start); await frame();
    expect(f.editor.reveal).toHaveBeenCalledWith(model.nodes[2].range.start);
    expect(f.observe).not.toHaveBeenCalled();
    fireEvent.scroll(f.editor.scrollDOM); fireEvent.scroll(f.preview); await frame();
    expect(f.editor.reveal).toHaveBeenCalledTimes(1);
    fireEvent.wheel(f.preview); fireEvent.scroll(f.preview); f.stale(); await frame();
    expect(f.observe).not.toHaveBeenCalled();
    f.bridge.navigate(0); f.bridge.dispose(); await frame();
    expect(f.editor.reveal).toHaveBeenCalledTimes(1);
  } finally { f.dispose(); }
});
it('a newer opposite-pane gesture cancels queued scroll work', async () => {
  const f = fixture();
  try {
    fireEvent.wheel(f.editor.scrollDOM); fireEvent.scroll(f.editor.scrollDOM);
    f.preview.scrollTop = 1500;
    fireEvent.wheel(f.preview); fireEvent.scroll(f.preview); await frame();
    expect(f.editor.reveal).toHaveBeenCalledWith(model.nodes[4].range.start);
    expect(f.observe).toHaveBeenCalledTimes(1);
  } finally { f.dispose(); }
});
it('the mounted CodeMirror scrollport drives preview through the current semantic model', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.enterMode('Split'); await s.settleNavigation();
    const editor = EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
    const preview = document.querySelector<HTMLElement>('.authoring-preview')!;
    const target = preview.querySelector<HTMLElement>(`[id="${model.nodes[2].id}"]`)!;
    const codeMirrorLookup = vi.spyOn(editor, 'lineBlockAtHeight').mockImplementation(() => editor.lineBlockAt(model.nodes[2].range.start));
    const scroll = vi.spyOn(preview, 'scrollTo');
    const selection = editor.state.selection;
    const focus = document.activeElement;
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 800, 500, 50));
    fireEvent.wheel(editor.scrollDOM); fireEvent.scroll(editor.scrollDOM); await frame();
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }));
    expect(editor.state.selection).toBe(selection);
    expect(document.activeElement).toBe(focus);
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Beta');
    expect(s.editorSource()).toBe(source); expect(s.isDirty()).toBe(false);
    codeMirrorLookup.mockRestore();
  } finally { s.unmount(); }
});

it('edited source rebuilds Split mappings and Write/Split transitions retain navigation', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.enterMode('Split');
    const changed = '# Inserted\n\nNew text.\n\n' + source;
    await s.setEditorSource(changed); await s.settleNavigation();
    const model = parseSemanticDocument(changed, 1);
    const beta = model.headings.find(node => node.text === 'Beta')!;
    const editor = EditorView.findFromDOM(document.querySelector('.cm-editor')!)!;
    const lookup = vi.spyOn(editor, 'lineBlockAtHeight').mockImplementation(() => editor.lineBlockAt(beta.range.start));
    const preview = document.querySelector<HTMLElement>('.authoring-preview')!;
    const scroll = vi.spyOn(preview, 'scrollTo');
    fireEvent.wheel(editor.scrollDOM); fireEvent.scroll(editor.scrollDOM); await frame();
    expect(scroll).toHaveBeenCalled();
    expect(document.querySelector('.outline-item[aria-current="location"]')).toHaveTextContent('Beta');
    lookup.mockRestore();
    await s.enterMode('Write'); await s.enterMode('Split'); await s.settleNavigation();
    expect(s.editorCursorLine()).toBe(beta.range.line);
    expect(s.editorSource()).toBe(changed);
    expect(s.isDirty()).toBe(true);
  } finally { s.unmount(); }
});
it('programmatic source-line jumps retain their exact offset within a semantic block', async () => {
  const f = fixture();
  try {
    const offset = model.nodes[3].range.start + 2;
    f.bridge.navigate(offset); await frame();
    expect(f.editor.reveal).toHaveBeenCalledWith(offset);
    expect(f.preview.scrollTop).toBe(1100);
    expect(f.observe).not.toHaveBeenCalled();
  } finally { f.dispose(); }
});
