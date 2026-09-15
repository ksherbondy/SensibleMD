import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { expect, it, vi } from 'vitest';

it('blocks renderer navigation/windows and delegates only current HTTPS policy to the shell', () => {
  const mainPath = path.resolve('electron/main.cjs');
  const nativeRequire = createRequire(mainPath);
  const openExternal = vi.fn().mockResolvedValue(undefined);
  let window: TestWindow;
  let openWindow: (details: { url: string }) => { action: string };
  class TestWindow extends EventEmitter {
    webContents = Object.assign(new EventEmitter(), {
      id: 1,
      setWindowOpenHandler: (handler: typeof openWindow) => { openWindow = handler; },
      session: { setPermissionCheckHandler: vi.fn(), setPermissionRequestHandler: vi.fn() },
    });
    loadFile = vi.fn();
    loadURL = vi.fn();
  }
  runInNewContext(readFileSync(mainPath, 'utf8'), {
    require: (name: string) => name === 'electron' ? {
      app: { getPath: () => '/nonexistent-sensiblemd-characterization-profile' },
      BrowserWindow: TestWindow, ipcMain: { handle: vi.fn() }, shell: { openExternal },
    } : name === './file-open-lifecycle.cjs' ? { installFileOpenLifecycle: ({ createWindow }: { createWindow: () => TestWindow }) => { window = createWindow(); } }
      : name === './window-close-lifecycle.cjs' ? { installWindowCloseLifecycle: vi.fn() }
        : nativeRequire(name),
    process: { argv: [] }, console, __dirname: path.dirname(mainPath), setTimeout, clearTimeout,
  });
  for (const url of ['https://example.com/path', 'http://example.com', 'mailto:test@example.com', 'file:///tmp/note.md', 'javascript:alert(1)']) {
    openExternal.mockClear();
    expect(openWindow!({ url })).toEqual({ action: 'deny' });
    expect(openExternal.mock.calls).toEqual(url.startsWith('https:') ? [[url]] : []);
    openExternal.mockClear();
    const event = { preventDefault: vi.fn() };
    window!.webContents.emit('will-navigate', event, url);
    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(openExternal.mock.calls).toEqual(url.startsWith('https:') ? [[url]] : []);
  }
  expect(window!.loadFile).toHaveBeenCalledWith(path.resolve('dist/index.html'));
});
