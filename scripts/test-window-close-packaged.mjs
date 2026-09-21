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
  // Exercise baseline custody through real browser import and CodeMirror input.
  const importBaselineCollection = async () => {
    await renderer(`(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['# Baseline A'], 'BaselineA.md', {type: 'text/markdown'})); const input = document.querySelector('input[type=file]'); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    await until(() => renderer(`!!document.querySelector('input[multiple]')`));
    await renderer(`(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['# Baseline A'], 'BaselineA.md', {type: 'text/markdown'})); transfer.items.add(new File(['# Baseline B'], 'BaselineB.md', {type: 'text/markdown'})); const input = document.querySelector('input[multiple]'); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles: true})); })()`);
    await until(() => renderer(`document.querySelectorAll('.chapter-list button').length === 2`));
  };
  const selectBaselineChapter = async name => {
    await renderer(`Array.from(document.querySelectorAll('.chapter-list button')).find(b => b.textContent.includes(${JSON.stringify(name)})).click()`);
    await until(() => renderer(`document.querySelector('.document-title > span')?.textContent === ${JSON.stringify(name)}`));
  };
  await importBaselineCollection();
  await selectBaselineChapter('BaselineB.md');
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  await renderer(`document.querySelector('[aria-label="Close document"]').click()`);
  await until(async () => (await renderer('document.body.innerText')).includes('No document open'));
  console.log('PASS packaged untouched chapter stays clean and Close Document succeeds');

  await importBaselineCollection();
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('unsaved baseline ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  const editedBaselineSource = await renderer(`localStorage.getItem('sensiblemd-document')`);
  await selectBaselineChapter('BaselineB.md');
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  await selectBaselineChapter('BaselineA.md');
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'true');
  assert.equal(await renderer(`localStorage.getItem('sensiblemd-document')`), editedBaselineSource);
  await renderer(`document.querySelector('[aria-label="Close document"]').click()`);
  await until(() => renderer(`document.querySelector('.app-status')?.textContent === 'Save your changes before closing this document.'`));
  console.log('PASS packaged edited A survives untouched B round trip and still refuses Close Document');
  const baselineFile = path.join(profile, 'BaselineSaved.md');
  await evaluate(`smokeElectron.dialog.showSaveDialog = async () => ({canceled: false, filePath: ${JSON.stringify(baselineFile)}})`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => renderer(`document.querySelector('.document-title > span')?.textContent === 'BaselineSaved.md' && document.querySelector('.app-shell').dataset.dirty === 'false'`));
  assert.equal(await readFile(baselineFile, 'utf8'), editedBaselineSource);
  await selectBaselineChapter('BaselineB.md');
  await selectBaselineChapter('BaselineSaved.md');
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  assert.equal(await renderer(`localStorage.getItem('sensiblemd-document')`), editedBaselineSource);
  await delay(150);
  await renderer(`document.querySelector('[aria-label="Close document"]').click()`);
  await until(async () => (await renderer('document.body.innerText')).includes('No document open'));
  console.log('PASS packaged Save As remap retains a clean baseline on departure/return and closes');

  // Wrong-file regression: real renderer activation, IPC and temporary files.
  await importBaselineCollection();
  // Put the cross-document link into A using the real editor.
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText(${JSON.stringify('[Go to B](BaselineB.md)\n\n')})`);
  const boundAFile = path.join(profile, 'BoundA.md'), boundBFile = path.join(profile, 'BoundB.md');
  await evaluate(`smokeElectron.dialog.showSaveDialog = async () => ({canceled: false, filePath: ${JSON.stringify(boundAFile)}})`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => renderer(`document.querySelector('.document-title > span')?.textContent === 'BoundA.md' && document.querySelector('.app-shell').dataset.dirty === 'false'`));
  const aBinding = await renderer(`({documentId: document.querySelector('.app-shell').dataset.documentId, sessionId: document.querySelector('.app-shell').dataset.sessionId})`);
  const boundASource = await readFile(boundAFile, 'utf8');
  for (const badBinding of [{}, {...aBinding, documentId: 'wrong-document'}, {...aBinding, sessionId: 'stale-session'}]) {
    assert.deepEqual(await renderer(`window.sensibleMD.saveOpenedDocument(${JSON.stringify({...badBinding, source: '# Must not overwrite'})})`), {error: 'binding-mismatch'});
    assert.equal(await readFile(boundAFile, 'utf8'), boundASource);
  }
  console.log('PASS packaged main rejects missing/mismatched direct-save bindings without altering A');
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Read').click()`);
  await until(() => renderer(`!!Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'Go to B')`));
  await renderer(`Array.from(document.querySelectorAll('a')).find(a => a.textContent === 'Go to B').click()`);
  await until(() => renderer(`document.querySelector('.document-title > span')?.textContent === 'BaselineB.md'`));
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.sessionId`), '');
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('edited B ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  const boundBSource = await renderer(`localStorage.getItem('sensiblemd-document')`);
  await evaluate(`globalThis.bindingCancelDialogs = 0; smokeElectron.dialog.showSaveDialog = async () => { bindingCancelDialogs++; return {canceled: true}; }`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => evaluate('bindingCancelDialogs === 1'));
  assert.equal(await readFile(boundAFile, 'utf8'), boundASource);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'true');
  console.log('PASS packaged browser B revokes A binding and Save As cancellation preserves A and dirty B');
  await evaluate(`smokeElectron.dialog.showSaveDialog = async () => ({canceled: false, filePath: ${JSON.stringify(boundBFile)}})`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => renderer(`document.querySelector('.document-title > span')?.textContent === 'BoundB.md' && document.querySelector('.app-shell').dataset.dirty === 'false'`));
  assert.equal(await readFile(boundBFile, 'utf8'), boundBSource);
  assert.deepEqual(await renderer(`window.sensibleMD.saveOpenedDocument(${JSON.stringify({...aBinding, source: '# Stale A request'})})`), {error: 'binding-mismatch'});
  assert.equal(await readFile(boundAFile, 'utf8'), boundASource);
  assert.equal(await readFile(boundBFile, 'utf8'), boundBSource);
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('direct B ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  const directBSource = await renderer(`localStorage.getItem('sensiblemd-document')`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'false'`));
  assert.equal(await readFile(boundBFile, 'utf8'), directBSource);
  assert.equal(await readFile(boundAFile, 'utf8'), boundASource);
  console.log('PASS packaged B adoption/direct save uses B only; obsolete A session is rejected');
  await delay(150);
  await renderer(`document.querySelector('[aria-label="Close document"]').click()`);
  await until(async () => (await renderer('document.body.innerText')).includes('No document open'));

  // Save As gate: reuse the real renderer's browser-import path to begin
  // without native direct-save capability. Only native dialog results are injected.
  const saveAsFile = path.join(profile, 'adopted.md');
  await evaluate(`globalThis.saveAsDialogs = 0; globalThis.saveAsMode = 'cancel'; smokeElectron.dialog.showSaveDialog = async () => { saveAsDialogs++; if (saveAsMode === 'cancel') return { canceled: true }; return new Promise(resolve => { globalThis.resolveSaveAs = resolve; }); }; globalThis.saveAsCloseDialogs = 0; smokeElectron.dialog.showMessageBox = async () => { saveAsCloseDialogs++; return { response: 0 }; };`);
  await renderer(`(() => { const transfer = new DataTransfer(); transfer.items.add(new File(['# Browser draft'], 'Draft.md', {type: 'text/markdown'})); const input = document.querySelector('input[type=file]'); input.files = transfer.files; input.dispatchEvent(new Event('change', {bubbles: true})); })()`);
  await until(() => renderer(`!!document.querySelector('[aria-label="Save"]')`));
  const initialSaveAsId = await renderer(`document.querySelector('.app-shell').dataset.documentId`);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.sessionId`), '');
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('invocation ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  const invocationSource = await renderer(`localStorage.getItem('sensiblemd-document')`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => evaluate('saveAsDialogs === 1'));
  await delay(100);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.documentId`), initialSaveAsId);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.sessionId`), '');
  assert.equal(await renderer(`localStorage.getItem('sensiblemd-document')`), invocationSource);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'true');
  await assert.rejects(readFile(saveAsFile), { code: 'ENOENT' });
  console.log('PASS packaged browser document invokes Save As; cancellation preserves identity/source/dirty state');
  await evaluate(`saveAsMode = 'held'`);
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => evaluate('saveAsDialogs === 2 && typeof resolveSaveAs === "function"'));
  await evaluate('smokeWindow.close()');
  await until(() => evaluate('saveAsCloseDialogs === 1'));
  await delay(100);
  assert.equal(await evaluate('smokeWindow.isDestroyed()'), false);
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('newer ')`);
  await until(() => renderer(`localStorage.getItem('sensiblemd-document') !== ${JSON.stringify(invocationSource)}`));
  const newerSource = await renderer(`localStorage.getItem('sensiblemd-document')`);
  assert.notEqual(newerSource, invocationSource);
  await evaluate(`resolveSaveAs({ canceled: false, filePath: ${JSON.stringify(saveAsFile)} })`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.documentId !== ${JSON.stringify(initialSaveAsId)}`));
  // Derive only after native adoption: canonical realpath requires the new file to exist.
  const adoptedId = await evaluate(`process.mainModule.require('./document-identity.cjs').deriveDocumentId(${JSON.stringify(saveAsFile)})`);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.documentId`), adoptedId);
  assert.notEqual(adoptedId, initialSaveAsId);
  assert.ok(await renderer(`document.querySelector('.app-shell').dataset.sessionId`));
  assert.equal(await renderer(`document.querySelector('.document-title > span').textContent`), 'adopted.md');
  assert.equal(await readFile(saveAsFile, 'utf8'), invocationSource);
  assert.equal(await renderer(`localStorage.getItem('sensiblemd-document')`), newerSource);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'true');
  assert.equal(await evaluate('smokeWindow.isDestroyed()'), false);
  console.log('PASS packaged held Save As writes invocation source, adopts native ID/session/name, retains newer edits, and vetoes pending close');
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'false'`));
  assert.equal(await readFile(saveAsFile, 'utf8'), newerSource);
  assert.equal(await evaluate('saveAsDialogs'), 2);
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('subsequent ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  const closingSource = await renderer(`localStorage.getItem('sensiblemd-document')`);
  await evaluate('smokeWindow.close()');
  await until(() => evaluate('smokeWindow.isDestroyed()'));
  assert.equal(await readFile(saveAsFile, 'utf8'), closingSource);
  assert.equal(await evaluate('saveAsDialogs'), 2);
  console.log('PASS adopted file uses direct Save for subsequent edits and native save-close');
  await evaluate("smokeElectron.app.emit('activate')");
  await until(() => evaluate('smokeElectron.BrowserWindow.getAllWindows().length > 0'));
  await evaluate('smokeWindow = smokeElectron.BrowserWindow.getAllWindows()[0]');
  await until(async () => (await renderer('document.body.innerText')).includes('No document open'));
  const file = path.join(profile, 'fixture.md');
  await writeFile(file, '# Original\n\nText');
  await evaluate(`smokeElectron.dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [${JSON.stringify(file)}] }); globalThis.dialogCount = 0; globalThis.dialogResponse = 2; smokeElectron.dialog.showMessageBox = async () => { dialogCount++; return { response: dialogResponse }; };`);
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Markdown')).click()`);
  await until(async () => (await renderer('document.body.innerText')).includes('Original'));
  // Reader metadata gate: real debounce/native persistence, then a fresh workspace
  // with browser storage cleared so it cannot stand in for native restoration.
  await renderer(`document.querySelector('.outline-item').click()`);
  await until(() => renderer(`!document.querySelector('.bookmark-button').disabled`));
  await renderer(`document.querySelector('.bookmark-button').click(); document.querySelector('[aria-label="Reading settings"]').click()`);
  await until(() => renderer(`document.querySelectorAll('.settings-popover input[type=range]').length === 3`));
  await renderer(`(() => { const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; const sliders = document.querySelectorAll('.settings-popover input[type=range]'); ['135', '2.05', '880'].forEach((value, i) => { set.call(sliders[i], value); sliders[i].dispatchEvent(new Event('input', {bubbles:true})); sliders[i].dispatchEvent(new Event('change', {bubbles:true})); }); document.querySelector('.settings-popover input[type=checkbox]').click(); })()`);
  const readerId = await renderer(`document.querySelector('.app-shell').dataset.documentId`);
  const metadataPath = path.join(profile, 'documents', readerId + '.json');
  await until(async () => {
    try { const state = JSON.parse(await readFile(metadataPath, 'utf8')); return state.fontScale === 135 && state.lineHeight === 2.05 && state.contentWidth === 880 && state.reducedMotion && state.bookmarks.length === 1 && !!state.position; }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
  });
  const persistedReader = JSON.parse(await readFile(metadataPath, 'utf8'));
  assert.equal(persistedReader.documentId, readerId);
  assert.equal(persistedReader.position.nodeId, persistedReader.activeHeading);
  assert.deepEqual(persistedReader.bookmarks, [persistedReader.activeHeading]);
  await renderer(`document.querySelector('[aria-label="Close document"]').click()`);
  await until(async () => (await renderer('document.body.innerText')).includes('No document open'));
  await renderer(`localStorage.clear(); Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Open Markdown')).click()`);
  await until(() => renderer(`document.querySelector('.app-shell')?.style.getPropertyValue('--reader-scale') === '135%'`));
  assert.deepEqual(await renderer(`(() => { const shell = document.querySelector('.app-shell'); return { id: shell.dataset.documentId, scale: shell.style.getPropertyValue('--reader-scale'), line: shell.style.getPropertyValue('--reader-line-height'), width: shell.style.getPropertyValue('--reader-width'), motion: shell.classList.contains('reduced-motion'), heading: document.querySelector('.outline-item[aria-current="location"]')?.textContent, bookmarked: document.querySelector('.bookmark-button').classList.contains('saved-bookmark') }; })()`), {
    id: readerId, scale: '135%', line: '2.05', width: '880px', motion: true, heading: 'Original', bookmarked: true,
  });
  console.log('PASS packaged reader metadata debounce persists settings/bookmark/position and restores after Close Document/reopen without browser storage');
  assert.deepEqual(await renderer(`Array.from(document.querySelectorAll('.topbar-actions button')).filter(b => ['Save', 'Download copy'].includes(b.getAttribute('aria-label'))).map(b => ({label: b.getAttribute('aria-label'), title: b.title, disabled: b.disabled, saveIcon: !!b.querySelector('.lucide-save'), downloadIcon: !!b.querySelector('.lucide-download')}))`), [
    {label: 'Save', title: 'Save', disabled: true, saveIcon: true, downloadIcon: false},
    {label: 'Download copy', title: 'Download copy', disabled: false, saveIcon: false, downloadIcon: true},
  ]);
  console.log('PASS separate toolbar Save and Download copy icons, labels and enabled states');
  await renderer(`Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Write').click()`);
  await until(() => renderer(`!!document.querySelector('.cm-content')`));
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('edited ')`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'true'`));
  const exported = path.join(profile, 'export.md');
  await evaluate(`globalThis.downloadDone = false; smokeWindow.webContents.session.once('will-download', (_event, item) => { item.setSavePath(${JSON.stringify(exported)}); item.once('done', (_event, state) => { downloadDone = state; }); });`);
  await renderer(`document.querySelector('[aria-label="Download copy"]').click()`);
  await until(() => evaluate(`downloadDone === 'completed'`));
  assert.match(await readFile(exported, 'utf8'), /edited/);
  assert.equal(await readFile(file, 'utf8'), '# Original\n\nText');
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'true');
  console.log('PASS real Download copy exports edits, preserves original and stays dirty');
  await renderer(`document.querySelector('[aria-label="Save"]').click()`);
  await until(() => renderer(`document.querySelector('.app-shell').dataset.dirty === 'false'`));
  assert.match(await readFile(file, 'utf8'), /edited/);
  console.log('PASS toolbar Save modifies original and marks document clean');
  await renderer(`document.querySelector('.cm-content').focus()`);
  await evaluate(`smokeWindow.webContents.insertText('more ')`);
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
