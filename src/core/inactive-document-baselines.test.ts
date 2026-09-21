import { expect, it, vi } from 'vitest';
import { DocumentBuffer } from './document-buffer';
import { InactiveDocumentBaselines } from './inactive-document-baselines';
import { asDocumentId } from './identity';

const a = asDocumentId('a'), b = asDocumentId('b'), c = asDocumentId('c');

it('publishes one coherent activation snapshot and never resurrects old transaction versions', () => {
  const buffer = new DocumentBuffer('workspace', '# A');
  const ledger = new InactiveDocumentBaselines([a, b], a);
  buffer.replace('# Edited A', 'editor');
  const old = buffer.snapshot();
  const listener = vi.fn(); buffer.subscribe(listener);
  const next = buffer.replaceForActivation('# B', ledger.takeForActivation(b, old));
  expect(listener.mock.calls).toEqual([[next]]);
  expect(next).toMatchObject({ text: '# B', version: 2, savedVersion: 2, isDirty: false });
  const returned = buffer.replaceForActivation(old.text, ledger.takeForActivation(a, next));
  expect(returned).toMatchObject({ text: old.text, version: 3, savedVersion: 0, isDirty: true });
  expect(() => buffer.apply({ origin: 'editor', baseVersion: old.version, edits: [] })).toThrow('Stale transaction');
});

it('archives the live accepted save on departure and does not retain a second active baseline', () => {
  const buffer = new DocumentBuffer('workspace', '# A');
  const ledger = new InactiveDocumentBaselines([a, b], a);
  buffer.replace('# Edited A'); buffer.markSaved();
  expect(() => ledger.takeForActivation(a, buffer.snapshot())).toThrow('Target saved baseline is missing');
  buffer.replaceForActivation('# B', ledger.takeForActivation(b, buffer.snapshot()));
  const result = buffer.replaceForActivation('# Edited A', ledger.takeForActivation(a, buffer.snapshot()));
  expect(result).toMatchObject({ version: 3, savedVersion: 3, isDirty: false });
});

it.each([-1, 0.5, NaN, 1])('rejects invalid baseline %s without changing text/version or notifying', savedVersion => {
  const buffer = new DocumentBuffer('workspace', '# A');
  const before = buffer.snapshot(); const listener = vi.fn(); buffer.subscribe(listener);
  expect(() => buffer.replaceForActivation('# B', { kind: 'dirty', savedVersion })).toThrow('Invalid retained saved baseline');
  expect(buffer.snapshot()).toEqual(before); expect(listener).not.toHaveBeenCalled();
});

it('fails closed for a missing target without losing the outgoing baseline', () => {
  const buffer = new DocumentBuffer('workspace', '# A');
  const ledger = new InactiveDocumentBaselines([a, b], a);
  buffer.replace('# Edited'); const old = buffer.snapshot();
  expect(() => ledger.takeForActivation(c, old)).toThrow('Target saved baseline is missing');
  expect(buffer.snapshot()).toEqual(old);
  buffer.replaceForActivation('# B', ledger.takeForActivation(b, old));
  expect(ledger.takeForActivation(a, buffer.snapshot())).toEqual({ kind: 'dirty', savedVersion: 0 });
});

it('reimport discards old baseline records despite reused IDs', () => {
  const buffer = new DocumentBuffer('workspace', '# A');
  const ledger = new InactiveDocumentBaselines([a, b], a);
  buffer.replace('# Edited');
  buffer.replaceForActivation('# B', ledger.takeForActivation(b, buffer.snapshot()));
  ledger.reset([a, b], b);
  expect(ledger.takeForActivation(a, buffer.snapshot())).toEqual({ kind: 'clean' });
});

it('collision remap keeps the active baseline, removes the old key, and preserves unrelated C', () => {
  const buffer = new DocumentBuffer('workspace', '# A');
  const ledger = new InactiveDocumentBaselines([a, b, c], a);
  buffer.replace('# Live A'); ledger.remapActive(b); ledger.remapActive(b);
  buffer.replaceForActivation('# C', ledger.takeForActivation(c, buffer.snapshot()));
  expect(() => ledger.takeForActivation(a, buffer.snapshot())).toThrow('Target saved baseline is missing');
  expect(ledger.takeForActivation(b, buffer.snapshot())).toEqual({ kind: 'dirty', savedVersion: 0 });
});
