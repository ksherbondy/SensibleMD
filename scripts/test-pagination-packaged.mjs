// Real Chromium layout verification in an isolated packaged macOS application.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const profile = await mkdtemp(path.join(tmpdir(), 'sensiblemd-pagination-smoke-'));
const executable = process.argv[2] ?? path.resolve('dist/mac-arm64/SensibleMD.app/Contents/MacOS/SensibleMD');
const environment = { ...process.env };
delete environment.ELECTRON_RUN_AS_NODE;
const child = spawn(executable, ['--inspect-brk=0'], { env: environment, stdio: ['ignore', 'pipe', 'pipe'] });
let socket;
let seq = 0;
const pending = new Map();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const deadline = setTimeout(() => { console.error('Packaged smoke timed out'); child.kill(); process.exitCode = 1; }, 120000);
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
    pending.set(id, (message) => { clearTimeout(timeout); if (message.error) reject(new Error(JSON.stringify(message.error))); else resolve(message.result); });
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
  const words = 'Measured typography wraps this ordinary Markdown passage into actual rendered lines. '.repeat(3);
  const markdown = Array.from({ length: 8 }, (_, i) => `# Section ${i + 1}\n\n${words} A${i}.\n\n${words} B${i}.\n\n${words} C${i}.`).join('\n\n')
    + '\n\n- List item\n- Another item\n\n> Quoted text\n\n```txt\nCode block\n```\n\n| A | B |\n| - | - |\n| one | two |\n\n---';
  const file = path.join(profile, 'layout.md');
  await writeFile(file, markdown);
  await evaluate(`smokeElectron.dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [${JSON.stringify(file)}] })`);
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`!!document.querySelector('.outline-item')`));
  await renderer(`globalThis.layoutErrors = []; window.addEventListener('error', e => layoutErrors.push(e.message));`);
  const settle = async () => {
    await renderer(`document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))`);
    await until(() => renderer(`document.querySelector('.book-pages')?.getAttribute('aria-busy') === 'false'`));
  };
  const mode = async name => {
    await renderer(`Array.from(document.querySelectorAll('[aria-label="Reading layout"] button')).find(b => b.textContent === ${JSON.stringify(name)}).click()`);
    await settle();
  };
  const preference = async (label, value) => {
    await renderer(`(() => {
      if (!document.querySelector('.settings-popover')) document.querySelector('[aria-label="Reading settings"]').click();
    })()`);
    await renderer(`(() => {
      const input = Array.from(document.querySelectorAll('.settings-popover label')).find(l => l.textContent.includes(${JSON.stringify(label)})).querySelector('input');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(String(value))});
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await settle();
  };
  const count = () => renderer(`Number(document.querySelector('.page-controls span').textContent.split('of')[1])`);
  const anchor = async () => { await renderer(`Array.from(document.querySelectorAll('.outline-item')).find(b => b.textContent.includes('Section 6')).click()`); await settle(); };
  const anchorVisible = () => renderer(`(() => { const button = document.querySelector('.outline-item[aria-current="location"]'); return button?.textContent.includes('Section 6') && Array.from(document.querySelectorAll('.book-pages h1')).some(h => h.textContent === 'Section 6'); })()`);
  await mode('Page');
  await anchor();
  await preference('Text size', 85); const small = await count();
  await preference('Text size', 150); const large = await count();
  assert.ok(large > small, `font size: ${small} -> ${large}`); assert.equal(await anchorVisible(), true);
  console.log(`PASS real font-size repagination ${small} -> ${large}, semantic target retained`);
  await preference('Text size', 100);
  await preference('Line spacing', 1.3); const tight = await count();
  await preference('Line spacing', 2.4); const loose = await count();
  assert.ok(loose > tight, `line height: ${tight} -> ${loose}`); assert.equal(await anchorVisible(), true);
  console.log(`PASS real line-height repagination ${tight} -> ${loose}`);
  await preference('Line spacing', 1.72);
  await preference('Content width', 480); const thin = await count();
  await preference('Content width', 1040); const wide = await count();
  assert.ok(thin > wide, `content width: ${thin} -> ${wide}`); assert.equal(await anchorVisible(), true);
  console.log(`PASS real content-width repagination ${thin} -> ${wide}`);
  await mode('Spread'); assert.equal(await anchorVisible(), true);
  await mode('Page'); assert.equal(await anchorVisible(), true);
  console.log('PASS Page/Spread preserves semantic target');
  // Sidebar and future panel resizing must work without BrowserWindow resizing.
  const geometry = () => renderer(`({ width: document.querySelector('.book-pages').getBoundingClientRect().width, tracks: getComputedStyle(document.querySelector('.book-pages')).gridTemplateColumns.split(' ').map(parseFloat), gap: parseFloat(getComputedStyle(document.querySelector('.book-pages')).columnGap), columns: document.querySelector('.book-reader').dataset.columns })`);
  await evaluate('smokeWindow.setSize(1100, 900)'); await settle();
  for (const layout of ['Page', 'Spread']) {
    await mode(layout); await anchor();
    const before = await geometry();
    const bounds = await evaluate('smokeWindow.getBounds()');
    await renderer(`document.querySelector('[aria-label="Close outline"]').click()`); await settle();
    const after = await geometry();
    assert.ok(after.width > before.width, 'closing outline must expand available page grid');
    assert.ok(after.tracks[0] > before.tracks[0], 'page tracks must expand');
    assert.ok(after.gap > before.gap, 'gutter must follow reader container');
    if (layout === 'Spread') assert.equal(after.tracks.length, 2);
    assert.deepEqual(await evaluate('smokeWindow.getBounds()'), bounds);
    assert.equal(await renderer(`Array.from(document.querySelectorAll('.book-pages h1')).some(h => h.textContent === 'Section 6')`), true);
    await renderer(`document.querySelector('[aria-label="Open outline"]').click()`); await settle();
    assert.equal(await anchorVisible(), true);
    console.log('PASS ' + layout + ' outline toggle recomputes page tracks/gutter and retains semantic target with fixed window bounds');
  }
  await evaluate('smokeWindow.setSize(900, 900)'); await mode('Spread'); await anchor();
  assert.equal((await geometry()).columns, '1');
  await renderer(`document.querySelector('[aria-label="Close outline"]').click()`); await settle();
  assert.equal((await geometry()).columns, '2');
  await renderer(`document.querySelector('[aria-label="Open outline"]').click()`); await settle();
  assert.equal(await anchorVisible(), true);
  await mode('Page');
  const panelBefore = await geometry();
  await renderer(`document.querySelector('.workspace').style.gridTemplateColumns = '400px minmax(0, 1fr)'`); await settle();
  assert.ok((await geometry()).width < panelBefore.width);
  assert.equal(await anchorVisible(), true);
  await renderer(`document.querySelector('.workspace').style.gridTemplateColumns = ''`); await settle();
  console.log('PASS container-only spread collapse/expansion and panel resizing');

  await evaluate('smokeWindow.setSize(1000, 760)'); await settle(); const narrowWindow = await count();
  await evaluate('smokeWindow.setSize(1600, 1050)'); await settle(); const wideWindow = await count();
  assert.notEqual(narrowWindow, wideWindow); assert.equal(await anchorVisible(), true);
  console.log(`PASS real window geometry repaginates ${narrowWindow} -> ${wideWindow}`);
  // Visit every physical page and assert exact one-to-one semantic coverage.
  await renderer(`Array.from(document.querySelectorAll('.outline-item')).find(b => b.textContent === 'Section 1').click()`); await settle();
  const model = (await import('../src/core/semantic-document.ts')).parseSemanticDocument(markdown, 0);
  const expected = model.nodes.map(n => n.type === 'heading' ? n.id : `reader-node-${n.id}`);
  const actual = [];
  for (let page = 0; page < await count(); page++) {
    actual.push(...await renderer(`Array.from(document.querySelectorAll('.book-pages .page-content > *')).map(e => e.id)`));
    assert.equal(await renderer(`Array.from(document.querySelectorAll('.book-pages .book-page')).every(p => p.scrollHeight <= p.clientHeight + 2)`), true, 'ordinary pages must fit their measured geometry');
    if (page + 1 < await count()) { await renderer(`document.querySelector('[aria-label="Next page"]').click()`); await settle(); }
  }
  assert.deepEqual(actual, expected);
  console.log(`PASS ${expected.length} semantic blocks rendered exactly once; normal pages fit including margins/footer`);
  const stable = await count();
  await renderer(`document.fonts.dispatchEvent(new Event('loadingdone'))`); await settle();
  assert.equal(await count(), stable);
  await evaluate('for (let i = 0; i < 12; i++) smokeWindow.setSize(1100 + i * 20, 820 + i * 10)'); await settle();
  assert.deepEqual(await renderer('layoutErrors'), []);
  console.log('PASS font-ready invalidation and rapid resize settle without observer errors');
  // A late media geometry change must update packing through ResizeObserver.
  await writeFile(file, '# Image\n\n![Local test image](favicon.svg)\n\nTrailing paragraph.');
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('Trailing paragraph.')`));
  await mode('Page');
  await until(() => renderer(`document.querySelector('.pagination-measurement img')?.naturalWidth > 0`));
  await settle();
  const beforeMedia = await count();
  await renderer(`(() => { const style = document.createElement('style'); style.textContent = '.page-content img { width: 120px; height: 1200px; }'; document.head.append(style); })()`);
  await settle();
  assert.ok(await count() > beforeMedia);
  assert.equal(await renderer(`(() => { const p = document.querySelector('.book-pages .book-page'); p.scrollTop = p.scrollHeight; return p.scrollTop > 0 && p.querySelector('img').naturalWidth > 0; })()`), true);
  console.log('PASS late image geometry repaginates; whole image remains scrollable');
  for (const [kind, content] of [
    ['code', '```txt\n' + 'code line\n'.repeat(100) + 'FINAL-TAIL\n```'],
    ['list', Array.from({length:100}, (_, i) => '- List item ' + i).join('\n') + '\n- FINAL-TAIL'],
    ['blockquote', '> ' + words.repeat(30) + ' FINAL-TAIL'],
    ['table', '| A | B |\n| - | - |\n' + '| row | value |\n'.repeat(100) + '| FINAL-TAIL | end |'],
  ]) {
    await writeFile(file, '# Oversized ' + kind + '\n\n' + content);
    await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
    await until(() => renderer(`document.body.innerText.includes(${JSON.stringify('Oversized ')} + ${JSON.stringify(kind)})`));
    await mode('Page');
    assert.equal(await count(), 1);
    assert.equal(await renderer(`(() => { const p = document.querySelector('.book-pages .book-page'); p.scrollTop = p.scrollHeight; return p.scrollTop > 0 && p.textContent.includes('FINAL-TAIL'); })()`), true);
    console.log('PASS oversized atomic ' + kind + ' remains complete and reachable');
  }
  // An oversized atomic paragraph remains complete and vertically reachable.
  await writeFile(file, '# Oversized\n\n' + words.repeat(20) + ' FINAL-TAIL');
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('Oversized')`));
  await mode('Page');
  assert.equal(await count(), 1);
  assert.equal(await renderer(`(() => { const p = document.querySelector('.book-pages .book-page'); p.scrollTop = p.scrollHeight; return p.scrollTop > 0 && p.textContent.includes('FINAL-TAIL') && p.getAttribute('tabindex') === '0' && getComputedStyle(p).overflowY === 'auto'; })()`), true);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  console.log('PASS oversized whole paragraph remains complete, focusable and scrollable; no dirty-state mutation');
} finally {
  clearTimeout(deadline);
  socket?.close();
  child.kill();
  await new Promise((resolve) => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
}
