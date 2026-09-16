import { expect, it } from 'vitest';
import { createReaderStatePayload, type ReaderStatePayloadInput } from './reader-state-payload';
import { parseSemanticDocument } from './semantic-document';

const model = parseSemanticDocument('# Title\n\nParagraph.', 0);
const heading = model.headings[0].id;
const paragraph = model.navigableNodes.find(n => n.type === 'paragraph')!.id;
const input = (): ReaderStatePayloadInput => ({
  documentId: 'document-A', bookmarks: ['second', 'first'], activeHeading: heading,
  semanticDocument: model, activeNodeId: paragraph,
  fontScale: 190, lineHeight: 0.9, contentWidth: 1200, reducedMotion: true,
});
function freezeDeep(value: object) {
  for (const child of Object.values(value)) if (child && typeof child === 'object') freezeDeep(child);
  Object.freeze(value);
}

it('accepts frozen inputs without mutation and preserves raw values and bookmark identity/order in fresh payloads', () => {
  const values = input();
  const before = structuredClone(values);
  freezeDeep(values);
  const first = createReaderStatePayload(values);
  const second = createReaderStatePayload(values);
  expect(values).toStrictEqual(before);
  expect(first).toStrictEqual(second);
  expect(first).not.toBe(second);
  expect(first.bookmarks).toBe(values.bookmarks);
  expect(first).toMatchObject({ documentId: 'document-A', bookmarks: ['second', 'first'], activeHeading: heading, fontScale: 190, lineHeight: 0.9, contentWidth: 1200, reducedMotion: true });
  expect(Object.keys(first)).toEqual(['documentId', 'bookmarks', 'activeHeading', 'position', 'fontScale', 'lineHeight', 'contentWidth', 'reducedMotion']);
});

it('uses a node before heading, falls back only for an empty node ID, and does not resolve an invalid nonempty ID', () => {
  expect(createReaderStatePayload(input()).position?.nodeId).toBe(paragraph);
  expect(createReaderStatePayload({ ...input(), activeNodeId: '' }).position?.nodeId).toBe(heading);
  const invalid = createReaderStatePayload({ ...input(), activeNodeId: 'missing' });
  expect(invalid.activeHeading).toBe(heading);
  expect(invalid.position).toBeUndefined();
  expect(Object.hasOwn(invalid, 'position')).toBe(true);
});

it('keeps an explicit undefined position for an empty model without adding schema/session or changing identity', () => {
  const empty = createReaderStatePayload({ ...input(), semanticDocument: parseSemanticDocument('', 0), activeNodeId: '', activeHeading: '' });
  expect(empty).toStrictEqual({ documentId: 'document-A', bookmarks: ['second', 'first'], activeHeading: '', position: undefined, fontScale: 190, lineHeight: 0.9, contentWidth: 1200, reducedMotion: true });
  expect(Object.hasOwn(empty, 'position')).toBe(true);
});
