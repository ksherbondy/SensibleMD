import { readFileSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
async function setup() {
  const dir = await fs.mkdtemp(path.join(tmpdir(), 'native-save-binding-'));
  const a = path.join(dir, 'A.md'), b = path.join(dir, 'B.md');
  await fs.writeFile(a, '# A'); await fs.writeFile(b, '# B');
  const mainPath = path.resolve('electron/main.cjs'), nativeRequire = createRequire(mainPath);
  const handlers = new Map<string, Function>();
  let openPath = a;
  const sender = { id: 1, isDestroyed: () => false, send: vi.fn() };
  const writes = vi.fn(fs.writeFile), rename = vi.fn(fs.rename), remove = vi.fn(fs.rm);
  runInNewContext(readFileSync(mainPath, 'utf8'), {
    require: (name: string) => name === 'electron' ? {
      app: { getPath: () => dir }, ipcMain: { handle: (channel: string, handler: Function) => handlers.set(channel, handler) },
      dialog: { showOpenDialog: async () => ({ filePaths: [openPath] }) },
    } : name === 'node:fs' ? { watch: () => ({ close() {} }) }
      : name === 'node:fs/promises' ? { ...fs, writeFile: writes, rename, rm: remove }
      : name === './file-open-lifecycle.cjs' ? { installFileOpenLifecycle() {} } : nativeRequire(name),
    process, console, __dirname: path.dirname(mainPath), setTimeout, clearTimeout,
  });
  const invoke = (channel: string, payload?: unknown, from = sender) => handlers.get(channel)!({ sender: from }, payload);
  const open = async (filePath = a, from = sender) => { openPath = filePath; return invoke('document:open', undefined, from); };
  const opened = await open(); writes.mockClear(); rename.mockClear(); remove.mockClear();
  return { a, b, sender, invoke, open, opened, writes, rename, remove, dispose: () => fs.rm(dir, { recursive: true, force: true }) };
}

it.each(['missing document', 'missing session', 'empty document', 'empty session', 'wrong document', 'wrong session', 'wrong document type', 'wrong session type', 'different window', 'destroyed sender', 'null payload', 'invalid source'] as const)('rejects %s before any filesystem write', async variant => {
  const h = await setup();
  try {
    const payload: Record<string, unknown> = { documentId: h.opened.documentId, sessionId: h.opened.sessionId, source: '# Must not write' };
    if (variant === 'missing document') delete payload.documentId;
    if (variant === 'missing session') delete payload.sessionId;
    if (variant === 'empty document') payload.documentId = '';
    if (variant === 'empty session') payload.sessionId = '';
    if (variant === 'wrong document') payload.documentId = 'other';
    if (variant === 'wrong session') payload.sessionId = 'other';
    if (variant === 'wrong document type') payload.documentId = 1;
    if (variant === 'wrong session type') payload.sessionId = {};
    if (variant === 'invalid source') payload.source = 123;
    const sender = variant === 'different window' ? { ...h.sender, id: 2 } : variant === 'destroyed sender' ? { ...h.sender, isDestroyed: () => true } : h.sender;
    const result = h.invoke('document:save-opened', variant === 'null payload' ? null : payload, sender);
    if (variant === 'null payload' || variant === 'invalid source') await expect(result).rejects.toThrow('Invalid document save request');
    else expect(await result).toEqual({ error: 'binding-mismatch' });
    expect(h.writes).not.toHaveBeenCalled(); expect(h.rename).not.toHaveBeenCalled(); expect(h.remove).not.toHaveBeenCalled();
    expect(await fs.readFile(h.a, 'utf8')).toBe('# A'); expect(await fs.readFile(h.b, 'utf8')).toBe('# B');
  } finally { await h.dispose(); }
});

it.each([false, true])('rejects an obsolete native session after reopen (same document=%s)', async sameId => {
  const h = await setup();
  try {
    const newer = await h.open(sameId ? h.a : h.b);
    expect(newer.sessionId).not.toBe(h.opened.sessionId);
    h.writes.mockClear(); h.rename.mockClear();
    expect(await h.invoke('document:save-opened', { ...h.opened, source: '# Stale' })).toEqual({ error: 'binding-mismatch' });
    expect(h.writes).not.toHaveBeenCalled(); expect(h.rename).not.toHaveBeenCalled();
    expect(await h.invoke('document:save-opened', { documentId: newer.documentId, sessionId: newer.sessionId, source: '# Current' })).toEqual({ name: sameId ? 'A.md' : 'B.md' });
    expect(await fs.readFile(sameId ? h.a : h.b, 'utf8')).toBe('# Current');
  } finally { await h.dispose(); }
});

it('cannot borrow another window binding even when both windows opened the same document', async () => {
  const h = await setup();
  try {
    const otherSender = { ...h.sender, id: 2 }, other = await h.open(h.a, otherSender);
    h.writes.mockClear();
    expect(await h.invoke('document:save-opened', { ...other, source: '# Borrowed' })).toEqual({ error: 'binding-mismatch' });
    expect(h.writes).not.toHaveBeenCalled();
    expect(await h.invoke('document:save-opened', { ...other, source: '# Own window' }, otherSender)).toEqual({ name: 'A.md' });
  } finally { await h.dispose(); }
});

it('pins an accepted write to A when main authorizes B before A finishes', async () => {
  const h = await setup(); const reached = deferred(), release = deferred();
  try {
    h.rename.mockImplementation(async (from, to) => {
      if (to === h.a) { reached.resolve(); await release.promise; }
      return fs.rename(from, to);
    });
    const pending = h.invoke('document:save-opened', { ...h.opened, source: '# Accepted A' });
    await reached.promise;
    await h.open(h.b); release.resolve(); await pending;
    expect(await fs.readFile(h.a, 'utf8')).toBe('# Accepted A');
    expect(await fs.readFile(h.b, 'utf8')).toBe('# B');
    expect(await h.invoke('document:save-opened', { ...h.opened, source: '# Too late' })).toEqual({ error: 'binding-mismatch' });
  } finally { release.resolve(); await h.dispose(); }
});
