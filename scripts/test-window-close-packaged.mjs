// Local macOS packaged smoke test. Dialog responses are injected; OS control and
// assistive-technology interaction still require manual verification.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(path.join(tmpdir(), 'sensiblemd-close-smoke-'));
const executable = process.argv[2] ?? path.resolve('dist/mac-arm64/SensibleMD.app/Contents/MacOS/SensibleMD');
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, ['--inspect-brk=0'], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
let socket;
let seq = 0;
const pending = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = setTimeout(() => { console.error('Packaged smoke timed out'); child.kill(); process.exitCode = 1; }, 45000);
try {
  const url = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code) => reject(new Error(`Exited before debugger: ${code}`)));
    child.stderr.on('data', (data) => {
      const match = String(data).match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/);
      if (match) resolve(match[0]);
    });
  });
  socket = new WebSocket(url);
  await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
  socket.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    const handler = pending.get(message.id);
    if (handler) { pending.delete(message.id); handler(message); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq;
    const timeout = setTimeout(() => reject(new Error(`Debugger call timed out: ${method}`)), 8000);
    pending.set(id, (message) => { clearTimeout(timeout); message.error ? reject(new Error(JSON.stringify(message.error))) : resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, awaitPromise: !expression.includes('app.setPath'), returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await call('Runtime.enable');
  await call('Debugger.enable');
  await call('Runtime.runIfWaitingForDebugger');
  await delay(200);
  await evaluate(`globalThis.smokeElectron = process.mainModule.require('electron'); smokeElectron.app.setPath('userData', ${JSON.stringify(profile)});`);
  await call('Debugger.resume');
  const until = async (check) => {
    for (let i = 0; i < 100; i++) { if (await check()) return; await delay(50); }
    throw new Error('Condition timed out');
  };
  await until(() => evaluate('smokeElectron.BrowserWindow.getAllWindows().length > 0'));
  await evaluate('globalThis.smokeWindow = smokeElectron.BrowserWindow.getAllWindows()[0]');
  const renderer = (code) => evaluate(`smokeWindow.webContents.executeJavaScript(${JSON.stringify(code)})`);
  await until(async () => (await renderer('document.body.innerText')).includes('No document open'));
  assert.match(await evaluate('smokeWindow.webContents.getURL()'), /^file:/);
  console.log('PASS packaged file:// launch (no dev server)');
  const file = path.join(profile, 'fixture.md');
  await writeFile(file, '# Original\n\nText');
  await evaluate(`smokeElectron.dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [${JSON.stringify(file)}] }); globalThis.dialogCount = 0; globalThis.dialogResponse = 2; smokeElectron.dialog.showMessageBox = async () => { dialogCount++; return { response: dialogResponse }; };`);
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Markdown')).click()`);
  await until(async () => (await renderer('document.body.innerText')).includes('Original'));
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('edited ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  await evaluate('smokeWindow.close(); smokeWindow.close()');
  await until(() => evaluate('dialogCount === 1'));
  await delay(100);
  assert.equal(await evaluate('smokeWindow.isDestroyed()'), false);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'true');
  console.log('PASS dirty BrowserWindow.close / Cancel / duplicate request');
  await evaluate('dialogResponse = 0; smokeWindow.close()');
  await until(() => evaluate('smokeWindow.isDestroyed()'));
  assert.match(await readFile(file, 'utf8'), /edited/);
  console.log('PASS Save through existing IPC and final native window closure');
  const reopen = async () => {
    await evaluate("smokeElectron.app.emit('activate')");
    await until(() => evaluate('smokeElectron.BrowserWindow.getAllWindows().length > 0'));
    await evaluate('smokeWindow = smokeElectron.BrowserWindow.getAllWindows()[0]');
    await until(async () => (await renderer('document.body.innerText')).includes('No document open'));
    await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Markdown')).click()`);
    await until(() => renderer(`!!document.querySelector('[aria-label="Close document"]')`));
  };
  await reopen();
  const dialogsBeforeClean = await evaluate('dialogCount');
  await evaluate('smokeWindow.close()');
  await until(() => evaluate('smokeWindow.isDestroyed()'));
  assert.equal(await evaluate('dialogCount'), dialogsBeforeClean);
  console.log('PASS clean document closes without a dialog');
  await reopen();
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  const diskBeforeDiscard = await readFile(file, 'utf8');
  await evaluate(`smokeWindow.webContents.insertText('discard me ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  await delay(1700);
  const documentId = await renderer(`document.querySelector('.app-shell').dataset.documentId`);
  await evaluate('dialogResponse = 1; smokeWindow.close()');
  await until(() => evaluate('smokeWindow.isDestroyed()'));
  assert.equal(await readFile(file, 'utf8'), diskBeforeDiscard);
  await assert.rejects(readFile(path.join(profile, 'recovery', documentId, 'latest.json')), { code: 'ENOENT' });
  console.log('PASS Discard closes, preserves disk and clears recovery');

} finally {
  clearTimeout(deadline);
  socket?.close();
  child.kill();
  await new Promise((resolve) => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
}
