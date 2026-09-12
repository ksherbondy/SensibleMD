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
    await until(() => renderer(`!!document.querySelector('.scroll-reader') || document.querySelector('.book-pages')?.getAttribute('aria-busy') === 'false'`));
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
  const verifySheets = async () => {
    const g = await renderer(`(() => {
      const reader = document.querySelector('.book-reader');
      const nav = reader.querySelector('.page-controls').getBoundingClientRect();
      const toolbar = document.querySelector('.reader-toolbar').getBoundingClientRect();
      const sheets = Array.from(reader.querySelectorAll('.book-pages .book-page'));
      return sheets.map(p => {
        const rect = p.getBoundingClientRect(); const css = getComputedStyle(p);
        p.scrollTop = p.scrollHeight;
        return { height: rect.height, top: rect.top, topGap: rect.top - toolbar.bottom,
          bottomGap: nav.top - rect.bottom, overflow: css.overflowY, scroll: p.scrollTop,
          footer: !!p.querySelector('footer'), internalNumber: /Page \\d/.test(p.textContent) };
      });
    })()`);
    assert.ok(g.length > 0);
    for (const sheet of g) {
      assert.ok(sheet.height > 0);
      assert.equal(sheet.overflow, 'clip'); assert.equal(sheet.scroll, 0);
      assert.equal(sheet.footer, false); assert.equal(sheet.internalNumber, false);
      assert.ok(sheet.topGap >= 20 && sheet.bottomGap >= 20, JSON.stringify(sheet));
      assert.ok(Math.abs(sheet.topGap - sheet.bottomGap) < 1, 'balanced outer gaps');
      assert.equal(sheet.height, g[0].height); assert.equal(sheet.top, g[0].top);
    }
    assert.match(await renderer(`document.querySelector('.page-controls').textContent`), /Page \d+ of \d+/);
    return g[0].height;
  };
  const scrollGeometry = () => renderer(`(() => {
    const surface = document.querySelector('.scroll-reader .document-reader');
    const rect = surface.getBoundingClientRect();
    const frame = surface.parentElement.getBoundingClientRect();
    const footer = document.querySelector('.scroll-navigation').getBoundingClientRect();
    const status = document.querySelector('.statusbar').getBoundingClientRect();
    const column = surface.querySelector('.reading-column').getBoundingClientRect();
    const target = Array.from(surface.querySelectorAll('h1')).find(h => h.textContent === 'Section 6').getBoundingClientRect();
    return { bottom: rect.bottom, footerTop: footer.top, footerBottom: footer.bottom,
      statusTop: status.top, leftGap: rect.left - frame.left, rightGap: frame.right - rect.right,
      width: rect.width, column: column.width, targetVisible: target.top >= rect.top - 1 && target.top < rect.bottom,
      outerScroll: document.documentElement.scrollTop, overflow: getComputedStyle(surface).overflowY };
  })()`);
  const verifyScroll = async () => {
    const g = await scrollGeometry();
    assert.ok(g.bottom <= g.footerTop && g.footerBottom <= g.statusTop, JSON.stringify(g));
    assert.ok(g.leftGap >= 24 && g.rightGap >= 24);
    assert.equal(g.overflow, 'auto'); assert.equal(g.outerScroll, 0);
    return g;
  };
  await mode('Scroll'); await anchor(); await delay(400);
  const initialScroll = await verifyScroll();
  assert.equal(initialScroll.targetVisible, true);
  await renderer(`document.querySelector('[aria-label="Close outline"]').click()`); await settle();
  const expandedScroll = await verifyScroll();
  assert.ok(expandedScroll.width > initialScroll.width); assert.equal(expandedScroll.targetVisible, true);
  await renderer(`document.querySelector('[aria-label="Open outline"]').click()`); await settle();
  assert.equal((await verifyScroll()).targetVisible, true);
  await preference('Content width', 480); const thinScroll = await verifyScroll();
  await preference('Content width', 1040); const wideScroll = await verifyScroll();
  assert.ok(wideScroll.column > thinScroll.column); assert.equal(wideScroll.targetVisible, true);
  assert.equal(wideScroll.width, thinScroll.width, 'content preference constrains inner column, not outer frame');
  await renderer(`(() => { const p = document.querySelector('.document-reader'); p.scrollTop = p.scrollHeight; })()`); await settle();
  await verifyScroll();
  assert.equal(await renderer(`(() => { const p = document.querySelector('.document-reader'); return p.scrollTop > 0 && p.querySelector('.reading-column').lastElementChild.getBoundingClientRect().bottom <= p.getBoundingClientRect().bottom; })()`), true);
  await anchor(); await delay(400);
  await evaluate('smokeWindow.setSize(1100, 800)'); await settle();
  assert.equal((await verifyScroll()).targetVisible, true);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  console.log('PASS Scroll footer occupies layout space, text ends above controls, gutters and inner width respond to outline/preferences/resize, semantic target retained');
  await mode('Page');
  await verifySheets();
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
    const sheetHeight = await verifySheets();
    const before = await geometry();
    const bounds = await evaluate('smokeWindow.getBounds()');
    await renderer(`document.querySelector('[aria-label="Close outline"]').click()`); await settle();
    const after = await geometry();
    assert.equal(await verifySheets(), sheetHeight);
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
  const fixedHeight = await verifySheets();
  for (let page = 0; page < await count(); page++) {
    assert.equal(await verifySheets(), fixedHeight, "short and full sheets retain identical height");
    actual.push(...await renderer(`Array.from(document.querySelectorAll('.book-pages .page-content > *')).map(e => e.id)`));
    assert.equal(await renderer(`Array.from(document.querySelectorAll('.book-pages .page-content')).every(p => !p.classList.contains('oversized-block') && p.scrollHeight <= p.clientHeight + 2)`), true, 'ordinary pages must fit their measured geometry');
    if (page + 1 < await count()) { await renderer(`document.querySelector('[aria-label="Next page"]').click()`); await settle(); }
  }
  assert.deepEqual(actual, expected);
  console.log(`PASS ${expected.length} semantic blocks rendered exactly once; normal pages fit including margins and padding`);
  const stable = await count();
  await renderer(`document.fonts.dispatchEvent(new Event('loadingdone'))`); await settle();
  assert.equal(await count(), stable);
  await evaluate('for (let i = 0; i < 12; i++) smokeWindow.setSize(1100 + i * 20, 820 + i * 10)'); await settle();
  assert.deepEqual(await renderer('layoutErrors'), []);
  await verifySheets();
  console.log('PASS fixed sheet heights, balanced reader gaps, external-only numbering and no page scrolling');
  console.log('PASS font-ready invalidation and rapid resize settle without observer errors');
  // Short content cannot collapse the physical sheet; oversized content cannot grow it.
  await writeFile(file, '# Short\n\nOne short paragraph.');
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('One short paragraph.')`));
  await mode('Page');
  const shortHeight = await verifySheets();
  assert.equal(await count(), 1);
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
  assert.equal(await renderer(`(() => { const sheet = document.querySelector('.book-pages .book-page'); sheet.scrollTop = sheet.scrollHeight; const p = sheet.querySelector('.oversized-block'); if (!p) return false; p.scrollTop = p.scrollHeight; return sheet.scrollTop === 0 && getComputedStyle(sheet).overflowY === 'clip' && p.scrollTop > 0 && p.querySelector('img').naturalWidth > 0; })()`), true);
  assert.equal(await verifySheets(), shortHeight);
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
    assert.equal(await renderer(`(() => { const sheet = document.querySelector('.book-pages .book-page'); sheet.scrollTop = sheet.scrollHeight; const p = sheet.querySelector('.oversized-block'); if (!p) return false; p.scrollTop = p.scrollHeight; return sheet.scrollTop === 0 && getComputedStyle(sheet).overflowY === 'clip' && p.scrollTop > 0 && p.textContent.includes('FINAL-TAIL'); })()`), true);
    assert.equal(await verifySheets(), shortHeight);
    console.log('PASS oversized atomic ' + kind + ' remains complete and reachable');
  }
  // An oversized atomic paragraph remains complete and vertically reachable.
  await writeFile(file, '# Oversized\n\n' + words.repeat(20) + ' FINAL-TAIL');
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('Oversized')`));
  await mode('Page');
  assert.equal(await count(), 1);
  assert.equal(await renderer(`(() => { const sheet = document.querySelector('.book-pages .book-page'); sheet.scrollTop = sheet.scrollHeight; const p = sheet.querySelector('.oversized-block'); if (!p) return false; p.scrollTop = p.scrollHeight; return sheet.scrollTop === 0 && getComputedStyle(sheet).overflowY === 'clip' && p.scrollTop > 0 && p.textContent.includes('FINAL-TAIL') && p.getAttribute('tabindex') === '0' && getComputedStyle(p).overflowY === 'auto'; })()`), true);
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  assert.equal(await verifySheets(), shortHeight);
  console.log('PASS oversized whole paragraph remains complete, focusable and scrollable; no dirty-state mutation');
  // Compare actual computed Markdown tokens across every rendered presentation.
  const themeSource = '# Theme\n\n## Two\n\n### Three\n\n#### Four\n\n##### Five\n\n###### Six\n\nParagraph **strong** and *emphasis* with `inline` and [link](https://example.com).\n\n- Unordered\n\n1. Ordered\n\n> Quotation\n\n```txt\ncode sample\n```\n\n---\n\n| A | B |\n| - | - |\n| one | two |';
  await writeFile(file, themeSource);
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('Theme')`));
  const selectors = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'ul', 'ol', 'li', 'blockquote', 'pre', 'pre code', 'p code', 'strong', 'em', 'a', 'hr', 'table', 'th', 'td'];
  const styles = root => renderer(`(() => {
    const root = document.querySelector(${JSON.stringify(root)});
    return Object.fromEntries(${JSON.stringify(selectors)}.flatMap(selector => {
      const element = root.querySelector(selector); if (!element) return [];
      const css = getComputedStyle(element);
      const properties = ['color', 'backgroundColor', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'padding', 'marginTop', 'marginBottom', 'borderTopColor', 'borderTopWidth', 'borderLeftColor', 'borderLeftWidth', 'borderRadius', 'textDecorationLine'];
      return [[selector, Object.fromEntries(properties.map(key => [key, css[key]]))]];
    }));
  })()`);
  await mode('Scroll'); await preference('Text size', 100);
  const canonical = await styles('.document-reader');
  assert.equal(Object.keys(canonical).length, selectors.length);
  const contrast = (foreground, background) => {
    const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const a = luminance(foreground), b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  };
  assert.equal(canonical.pre.backgroundColor, 'rgb(23, 59, 50)');
  assert.equal(canonical['pre code'].color, 'rgb(236, 245, 233)');
  assert.ok(contrast(canonical['pre code'].color, canonical.pre.backgroundColor) >= 4.5);
  assert.equal(canonical.strong.backgroundColor, 'rgb(244, 215, 123)');
  assert.ok(contrast(canonical.strong.color, canonical.strong.backgroundColor) >= 4.5);
  for (const layout of ['Page', 'Spread']) {
    await mode(layout);
    await renderer(`Array.from(document.querySelectorAll('.outline-item')).find(b => b.textContent === 'Theme').click()`); await settle();
    const combined = {};
    for (;;) {
      // Compare the first occurrence in source order, as in the continuous render.
      for (const [token, style] of Object.entries(await styles('.book-pages'))) combined[token] ??= style;
      if (await renderer(`document.querySelector('[aria-label="Next page"]').disabled`)) break;
      await renderer(`document.querySelector('[aria-label="Next page"]').click()`); await settle();
    }
    assert.deepEqual(combined, canonical, layout + ' Markdown theme matches Scroll');
    assert.deepEqual(await styles('.pagination-measurement'), canonical, 'measurement theme matches visible theme');
  }
  await renderer(`Array.from(document.querySelectorAll('[aria-label="Document mode"] button')).find(b => b.textContent === 'Split').click()`);
  await until(() => renderer(`!!document.querySelector('.authoring-preview')`));
  assert.deepEqual(await styles('.authoring-preview'), canonical, 'Split Markdown theme matches Scroll');
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  console.log('PASS 21 Markdown token styles match Scroll/Page/Spread/Split and measurement; dark code and yellow strong text exceed 4.5:1 contrast');
  const checksSource = '# Checks document\n\n### Skipped heading\n\n![](missing.png)\n\n' + Array.from({ length: 150 }, (_, i) => 'Paragraph ' + i + '.').join('\n\n');
  await writeFile(file, checksSource);
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('Checks document')`));
  const authoringMode = async name => {
    await renderer(`Array.from(document.querySelectorAll('[aria-label="Document mode"] button')).find(b => b.textContent === ${JSON.stringify(name)}).click()`);
    await until(() => renderer(`!!document.querySelector('.cm-scroller')`));
    await renderer(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  };
  const checksGeometry = () => renderer(`(() => {
    const box = selector => { const p = document.querySelector(selector), b = p?.getBoundingClientRect(); return b ? { left: b.left, right: b.right, top: b.top, bottom: b.bottom, width: b.width, height: b.height } : null; };
    return { editor: box('.editor-shell'), preview: box('.authoring-preview'), panel: box('.findings-panel'), filters: box('.diagnostics-filter'), layout: box('.editor-layout') };
  })()`);
  const toggleChecks = async name => {
    await renderer(`document.querySelector(${JSON.stringify('[aria-label="' + name + ' authoring checks"]')}).click()`);
    await renderer(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
  };
  await evaluate('smokeWindow.setSize(1600, 1000)');
  for (const view of ['Write', 'Split']) {
    await authoringMode(view);
    const g = await checksGeometry();
    assert.ok(g.panel.left >= (g.preview ?? g.editor).right - 1, view + ' checks are right-side');
    assert.ok(g.panel.width >= 240 && g.panel.width <= 280);
    assert.ok(g.filters.left >= g.panel.left && g.filters.right <= g.panel.right && g.filters.top >= g.panel.top && g.filters.bottom <= g.panel.bottom);
    if (view === 'Split') assert.ok(g.editor.width >= 300 && g.preview.width >= 300);
    await renderer(`(() => { document.querySelector('.cm-scroller').scrollTop = 160; const p = document.querySelector('.authoring-preview'); if (p) p.scrollTop = 160; })()`);
    await renderer(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const positions = () => renderer(`({ editor: document.querySelector('.cm-scroller').scrollTop, preview: document.querySelector('.authoring-preview')?.scrollTop ?? null })`);
    const beforePositions = await positions();
    await toggleChecks('Hide');
    const collapsed = await checksGeometry();
    assert.equal(collapsed.panel.width, 0); assert.ok(collapsed.editor.width > g.editor.width);
    if (view === 'Split') assert.ok(collapsed.preview.width > g.preview.width);
    assert.deepEqual(await positions(), beforePositions, 'collapse retains pane scroll positions');
    await toggleChecks('Show');
    assert.deepEqual(await positions(), beforePositions, 'reopen retains pane scroll positions');
  }
  await renderer(`Array.from(document.querySelectorAll('.diagnostics-filter button')).find(b => b.textContent === 'Warnings').click()`);
  const warningFindings = await renderer(`document.querySelector('.findings-panel').textContent`);
  await toggleChecks('Hide'); await authoringMode('Write');
  assert.equal(await renderer(`document.querySelector('.findings-panel').hidden`), true);
  await authoringMode('Split'); await toggleChecks('Show');
  assert.equal(await renderer(`document.querySelector('.findings-panel').textContent`), warningFindings);
  // Exercise the renderer fallback below the desktop's normal minimum width.
  await evaluate('smokeWindow.setMinimumSize(400, 500)');
  for (const width of [1100, 500]) {
    await evaluate(`smokeWindow.setSize(${width}, 900)`);
    await renderer(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`);
    const g = await checksGeometry();
    assert.ok(g.editor.width >= 250 && g.preview.width >= 250 && g.editor.height > 100 && g.preview.height > 100);
    assert.ok(g.panel.right <= g.layout.right + 1 && g.panel.bottom <= g.layout.bottom + 1);
    if (width === 1100) assert.ok(g.panel.left >= g.preview.right - 1);
    else assert.ok(g.panel.top >= g.preview.bottom - 1, 'very narrow checks use bounded bottom row');
    await toggleChecks('Hide');
    const c = await checksGeometry();
    assert.ok(c.editor.right <= c.layout.right && c.preview.right <= c.layout.right);
    await toggleChecks('Show');
  }
  assert.equal(await renderer(`document.querySelector('.app-shell').dataset.dirty`), 'false');
  console.log('PASS shared right-side Write/Split checks, in-panel filters, collapse width and scroll retention, filter/mode persistence, and narrow layouts');
  // Exercise real CodeMirror layout with deliberately different source/render heights.
  let syncSource = Array.from({ length: 24 }, (_, i) => '# Sync ' + i + '\n\n' + words.repeat(2) + '\n\n- List item\n- More text\n\n```txt\n' + 'code line\n'.repeat(2 + i % 5) + '```').join('\n\n');
  await writeFile(file, syncSource);
  await renderer(`document.querySelector('[aria-label="Open Markdown file"]').click()`);
  await until(() => renderer(`document.body.innerText.includes('Sync 0')`));
  await evaluate('smokeWindow.setSize(1600, 1000)'); await authoringMode('Split');
  // Test-only access to the installed CodeMirror view; no production bridge is exposed.
  await renderer(`globalThis.syncEditor = document.querySelector('.cm-content').cmTile.root.view; globalThis.syncScrolls = 0; globalThis.syncBehaviors = []; document.querySelector('.authoring-preview').addEventListener('scroll', () => syncScrolls++); syncEditor.scrollDOM.addEventListener('scroll', () => syncScrolls++); const syncPreview = document.querySelector('.authoring-preview'); const nativeScroll = syncPreview.scrollTo.bind(syncPreview); syncPreview.scrollTo = options => { syncBehaviors.push(options.behavior); nativeScroll(options); }; void 0;`);
  const syncSettle = async () => { await renderer(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))`); await delay(150); };
  const syncNodes = () => import('../src/core/semantic-document.ts').then(m => m.parseSemanticDocument(syncSource, 0).nodes);
  const assertAligned = async () => {
    const nodes = await syncNodes();
    const result = await renderer(`(() => {
      const nodes = ${JSON.stringify(nodes)};
      const p = document.querySelector('.authoring-preview'), e = syncEditor.scrollDOM;
      const offset = syncEditor.lineBlockAtHeight(e.getBoundingClientRect().top + e.clientHeight / 3 - syncEditor.documentTop + 1).from;
      const sourceNode = nodes.findLast(n => n.range.start <= offset);
      const targetY = p.getBoundingClientRect().top + p.clientHeight / 3;
      const rendered = nodes.filter(n => { const el = p.querySelector('[id="' + (n.type === 'heading' ? n.id : 'reader-node-' + n.id) + '"]'); return el && el.getBoundingClientRect().top <= targetY + 1; }).at(-1);
      return { editor: sourceNode?.id, preview: rendered?.id, editorHeight: e.clientHeight, previewHeight: p.clientHeight };
    })()`);
    assert.equal(result.editor, result.preview, JSON.stringify(result));
  };
  const editorDrive = async section => {
    const offset = syncSource.indexOf('# Sync ' + section + '\n');
    await renderer(`(() => {
      const e = syncEditor.scrollDOM;
      e.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
      e.scrollTop += syncEditor.documentTop + syncEditor.lineBlockAt(${offset}).top - e.getBoundingClientRect().top - e.clientHeight / 3 + 4;
    })()`);
    await syncSettle(); await assertAligned();
  };
  const previewDrive = async section => {
    await renderer(`(() => {
      const p = document.querySelector('.authoring-preview');
      const h = Array.from(p.querySelectorAll('h1')).find(h => h.textContent === ${JSON.stringify('Sync ' + section)});
      p.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, bubbles: true }));
      p.scrollTop += h.getBoundingClientRect().top - p.getBoundingClientRect().top - p.clientHeight / 3 + 4;
    })()`);
    await syncSettle(); await assertAligned();
  };
  await editorDrive(8); await previewDrive(15);
  const settledPositions = () => renderer(`({ editor: syncEditor.scrollDOM.scrollTop, preview: document.querySelector('.authoring-preview').scrollTop, events: syncScrolls })`);
  const stableSync = await settledPositions(); await delay(250);
  assert.deepEqual(await settledPositions(), stableSync, 'programmatic projection must settle without oscillation');
  await renderer(`document.querySelector('.authoring-preview').style.height = '65%'`); await syncSettle();
  await editorDrive(10); await previewDrive(17);
  await renderer(`Array.from(document.querySelectorAll('.outline-item')).find(b => b.textContent === 'Sync 12').click()`); await syncSettle();
  await assertAligned();
  assert.equal(await renderer(`syncEditor.state.doc.lineAt(syncEditor.state.selection.main.head).text`), '# Sync 12');
  await authoringMode('Write'); await authoringMode('Split'); await syncSettle();
  await assertAligned();
  // Same document, new offsets and DOM IDs after an edit.
  const prefix = '# Inserted section\n\nNew introduction.\n\n';
  syncSource = prefix + syncSource;
  await renderer(`syncEditor.dispatch({ changes: { from: 0, insert: ${JSON.stringify(prefix)} } })`); await syncSettle();
  await editorDrive(9); await previewDrive(19);
  await renderer(`(() => { if (!document.querySelector('.settings-popover')) document.querySelector('[aria-label="Reading settings"]').click(); const input = Array.from(document.querySelectorAll('.settings-popover label')).find(l => l.textContent.includes('Reduce motion')).querySelector('input'); if (!input.checked) input.click(); })()`);
  await editorDrive(11); await previewDrive(20);
  assert.equal(await renderer(`document.querySelector('.app-shell').classList.contains('reduced-motion')`), true);
  assert.equal(await renderer(`syncBehaviors.every(behavior => behavior === 'instant')`), true);
  assert.equal(await renderer(`syncEditor.state.doc.toString()`), syncSource);
  console.log('PASS semantic Split editor/preview drivers, unequal pane heights, outline selection and alignment, no oscillation, Write/Split transitions, post-edit mappings and reduced motion');



} finally {
  clearTimeout(deadline);
  socket?.close();
  child.kill();
  await new Promise((resolve) => child.exitCode !== null ? resolve() : child.once('exit', resolve));
  await rm(profile, { recursive: true, force: true });
}
