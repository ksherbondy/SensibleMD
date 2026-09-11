import { expect, it } from 'vitest';
import { paginateDocument } from './pagination';
import { parseSemanticDocument } from './semantic-document';

it('packs using supplied block heights rather than word counts', () => {
  const document = parseSemanticDocument('First.\n\nSecond.\n\nThird.', 0);
  const geometry = (height: number) => ({ availableHeight: 100, blocks: Object.fromEntries(document.nodes.map(n => [n.id, { height, marginTop: 0, marginBottom: 0 }])) });
  // This assertion fails against the word-count paginator: geometry has no effect.
  expect(paginateDocument(document, geometry(60))).toHaveLength(3);
  expect(paginateDocument(document, geometry(30))).toHaveLength(1);
});

it('includes non-collapsing margins and keeps oversized atomic blocks exactly once', () => {
  const document = parseSemanticDocument('# Heading\n\nParagraph.\n\n- item\n- next\n\n> Quote\n\n```txt\ncode\n```\n\n| A | B |\n| - | - |\n| x | y |\n\n---', 0);
  const blocks = Object.fromEntries(document.nodes.map(node => [node.id, { height: node.type === 'paragraph' ? 1000 : 40, marginTop: 10, marginBottom: 10 }]));
  const pages = paginateDocument(document, { availableHeight: 100, blocks });
  expect(pages).toHaveLength(6);
  expect(pages[0].fragments).toHaveLength(2); // Heading remains with oversized paragraph.
  expect(pages.flatMap(p => p.fragments.map(f => f.nodeId))).toEqual(document.nodes.map(n => n.id));
  expect(new Set(pages.flatMap(p => p.fragments.map(f => f.nodeId))).size).toBe(document.nodes.length);
  expect(pages.every(p => p.fragments.every(f => f.fragmentCount === 1 && !f.continuesOnNext))).toBe(true);
});
it('does not substitute word-count pages for unavailable or incomplete measurements', () => {
  const document = parseSemanticDocument('Text.\n\nMore text.', 0);
  expect(paginateDocument(document, { availableHeight: 100, blocks: {} })).toEqual([]);
  expect(paginateDocument(document, { availableHeight: 0, blocks: {} })).toEqual([]);
});
it('accounts for generated endnotes in the last atomic group', () => {
  const document = parseSemanticDocument('Text.\n\nMore text.', 0);
  const blocks = Object.fromEntries(document.nodes.map(n => [n.id, { height: 30, marginTop: 0, marginBottom: 0 }]));
  expect(paginateDocument(document, { availableHeight: 100, blocks, trailingHeight: 50 })).toHaveLength(2);
});
