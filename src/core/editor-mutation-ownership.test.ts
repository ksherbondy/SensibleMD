import { expect, it } from 'vitest';
import { EditorMutationOwnership } from './editor-mutation-ownership';
import { asDocumentId } from './identity';

it('uses activation object identity across batched A→B→A, independently of document identity', () => {
  const a = asDocumentId('doc-a'), owner = new EditorMutationOwnership(a);
  owner.mount(); const first = owner.initial, origin = { activation: first, lease: { live: true } };
  expect(owner.accepts(first, a, origin)).toBe(true);
  owner.invalidate(); expect(owner.accepts(first, a, origin)).toBe(false);
  owner.activate(asDocumentId('doc-b')); owner.invalidate(); const last = owner.activate(a);
  expect(owner.accepts(first, a, origin)).toBe(false);
  expect(owner.accepts(last, a, origin)).toBe(false);
  const fresh = { activation: last, lease: { live: true } };
  expect(owner.accepts(last, a, fresh)).toBe(true);
  expect(owner.accepts(last, asDocumentId('doc-b'), fresh)).toBe(false);
  owner.unmount(); expect(owner.accepts(last, a, fresh)).toBe(false);
  fresh.lease.live = false; owner.mount();
  expect(owner.accepts(last, a, fresh)).toBe(false);
  expect(owner.accepts(last, a, { activation: last, lease: { live: true } })).toBe(true);
});
