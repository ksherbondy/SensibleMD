import { EventEmitter } from 'node:events';
import { createRequire } from 'node:module';
import { describe, expect, it, vi } from 'vitest';
const { installWindowCloseLifecycle } = createRequire(import.meta.url)('./window-close-lifecycle.cjs');
function setup() {
  const app = new EventEmitter();
  const ipcMain = new EventEmitter();
  const dialog = { showMessageBox: vi.fn(async () => ({ response: 2 })) };
  let dirty = false;
  let destroyed = false;
  const contents = Object.assign(new EventEmitter(), { mainFrame: {}, send: vi.fn(), isDestroyed: () => destroyed });
  const window = Object.assign(new EventEmitter(), {
    webContents: contents, isDestroyed: () => destroyed,
    close: () => {
      const event = { preventDefault: vi.fn() };
      window.emit('close', event);
      if (event.preventDefault.mock.calls.length) return;
      if (dirty) {
        const unload = { preventDefault: vi.fn() };
        contents.emit('will-prevent-unload', unload);
        if (!unload.preventDefault.mock.calls.length) return;
      }
      destroyed = true;
      window.emit('closed');
    },
  });
  installWindowCloseLifecycle({ app, window, ipcMain, dialog });
  const event = { sender: contents, senderFrame: contents.mainFrame };
  return { app, ipcMain, dialog, window, contents, event, dirty: (value: boolean) => { dirty = value; } };
}
describe('native BrowserWindow close coordination', () => {
  it('clean close is normal and has no dialog', () => {
    const s = setup(); s.window.close();
    expect(s.window.isDestroyed()).toBe(true);
    expect(s.dialog.showMessageBox).not.toHaveBeenCalled();
  });
  it.each(['default Cmd+W close role', 'native close control', 'BrowserWindow.close()'])('%s reaches the same guarded close event', async () => {
    const s = setup(); s.dirty(true); s.window.close(); await Promise.resolve();
    expect(s.window.isDestroyed()).toBe(false);
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1);
    expect(s.dialog.showMessageBox.mock.calls[0]).toEqual([s.window, expect.objectContaining({ buttons: ['Save', 'Discard', 'Cancel'], cancelId: 2 })]);
    expect(s.contents.send).toHaveBeenCalledWith('window:close-decision', { id: '1', choice: 'cancel' });
  });
  it('repeated requests produce one dialog, Cancel resets the request for retry', async () => {
    const s = setup(); s.dirty(true); s.window.close(); s.window.close(); await Promise.resolve();
    s.window.close();
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(1);
    s.ipcMain.emit('window:close-complete', s.event, { id: '1', allow: false });
    expect(s.window.isDestroyed()).toBe(false);
    s.window.close(); expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(2);
  });
  it('valid approval retries normal close and rejects stale or foreign-frame approvals', async () => {
    const s = setup(); s.dirty(true); s.window.close(); await Promise.resolve();
    s.ipcMain.emit('window:close-complete', { ...s.event, senderFrame: {} }, { id: '1', allow: true });
    s.ipcMain.emit('window:close-complete', s.event, { id: 'old', allow: true });
    expect(s.window.isDestroyed()).toBe(false);
    s.dirty(false);
    s.ipcMain.emit('window:close-complete', s.event, { id: '1', allow: true });
    expect(s.window.isDestroyed()).toBe(true);
    expect(s.ipcMain.listenerCount('window:close-complete')).toBe(0);
  });
  it('a final dirty veto cannot be overridden by an earlier approval', async () => {
    const s = setup(); s.dirty(true); s.window.close(); await Promise.resolve();
    s.ipcMain.emit('window:close-complete', s.event, { id: '1', allow: true });
    expect(s.window.isDestroyed()).toBe(false);
    expect(s.dialog.showMessageBox).toHaveBeenCalledTimes(2);
  });
  it('application quit preserves its existing behavior without a window-close dialog', () => {
    const s = setup(); s.dirty(true); s.app.emit('before-quit'); s.window.close();
    expect(s.window.isDestroyed()).toBe(true);
    expect(s.dialog.showMessageBox).not.toHaveBeenCalled();
  });
  it('reload veto does not start a window-close dialog', () => {
    const s = setup(); s.contents.emit('will-prevent-unload', { preventDefault: vi.fn() });
    expect(s.dialog.showMessageBox).not.toHaveBeenCalled();
  });
});
