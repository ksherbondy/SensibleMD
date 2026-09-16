import { act, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { startScenario } from './scenario';

const source = '# Alpha\n\nAlpha text.\n\n## Beta\n\nBeta text.\n\n## Gamma\n\nGamma text.';
const active = () => document.querySelector('.outline-item[aria-current="location"]')?.textContent;
async function press(key: string, options: KeyboardEventInit = {}, target: EventTarget = window, prevented = false) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  if (prevented) event.preventDefault();
  await act(async () => { target.dispatchEvent(event); });
  return event;
}

it('preserves E toggle branches, broad modifier handling and Save XOR/case distinctions', async () => {
  const s = await startScenario();
  try {
    expect((await press('e')).defaultPrevented).toBe(false);
    expect(s.currentMode()).toBe('Read');
    expect((await press('E', { metaKey: true })).defaultPrevented).toBe(true);
    expect(s.currentMode()).toBe('Write');
    expect((await press('e', { ctrlKey: true })).defaultPrevented).toBe(true);
    expect(s.currentMode()).toBe('Read');
    await s.enterMode('Split');
    expect((await press('e', { metaKey: true })).defaultPrevented).toBe(true);
    expect(s.currentMode()).toBe('Read');
    await press('E', { metaKey: true, ctrlKey: true, altKey: true, shiftKey: true, isComposing: true, repeat: true }, window, true);
    expect(s.currentMode()).toBe('Write'); // Non-S branches intentionally lack Save's exclusions.
    s.desktop.addFile('/Keys.md', '# Keys'); s.desktop.openDialogResult = '/Keys.md'; await s.openDocument();
    await s.enterMode('Write'); await s.appendToEditor('\nEdit');
    expect((await press('s', { metaKey: true, ctrlKey: true })).defaultPrevented).toBe(false);
    expect(s.desktop.writes).toHaveLength(0);
    expect((await press('S', { ctrlKey: true })).defaultPrevented).toBe(true);
    expect(s.desktop.writes).toHaveLength(1);
  } finally { s.unmount(); }
});

it('preserves palette focus/transient state and search query/scope reopening with K/F', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    const input = screen.getByRole('textbox', { name: 'Search document' });
    await s.user.type(input, 'text');
    await s.user.click(screen.getByRole('button', { name: 'All chapters' }));
    await s.user.keyboard('{Escape}');
    expect(screen.queryByRole('region', { name: 'Search results' })).toBeNull();
    expect((await press('F', { ctrlKey: true, altKey: true, repeat: true })).defaultPrevented).toBe(true);
    expect(input).toHaveFocus(); expect(input).toHaveValue('text');
    expect(screen.getByRole('button', { name: 'All chapters' })).toHaveClass('selected');
    await s.user.click(screen.getByRole('button', { name: 'Reading settings' }));
    expect((await press('K', { metaKey: true, shiftKey: true })).defaultPrevented).toBe(true);
    await screen.findByRole('dialog', { name: 'Command palette' });
    expect(screen.getByRole('textbox', { name: 'Search commands' })).toHaveFocus();
    expect(screen.getByRole('region', { name: 'Reading settings' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Search results' })).toBeInTheDocument();
    await s.user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Reading settings' })).toHaveFocus();
  } finally { s.unmount(); }
});

it('preserves Alt heading navigation, Read-only gating and latest headings after activation', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  try {
    await s.clickOutlineHeading('Alpha');
    expect((await press('ArrowDown', { altKey: true })).defaultPrevented).toBe(true);
    expect(active()).toBe('Beta');
    await press('ArrowDown', { altKey: true }, screen.getByRole('textbox', { name: 'Search document' }));
    expect(active()).toBe('Gamma'); // Editing exclusion belongs only to page turns.
    expect((await press('ArrowUp', { altKey: true })).defaultPrevented).toBe(true);
    expect(active()).toBe('Beta');
    for (const mode of ['Write', 'Split'] as const) {
      await s.enterMode(mode);
      expect((await press('ArrowDown', { altKey: true })).defaultPrevented).toBe(false);
      expect((await press('ArrowUp', { altKey: true })).defaultPrevented).toBe(false);
      expect(active()).toBe('Beta');
    }
    s.desktop.addFile('/New.md', '# New one\n\n## New two'); s.desktop.openDialogResult = '/New.md'; await s.openDocument();
    await s.clickOutlineHeading('New one'); await press('ArrowDown', { altKey: true });
    expect(active()).toBe('New two');
  } finally { s.unmount(); }
});

it('preserves page-turn gates, editing-target exclusions and latest page state', async () => {
  const s = await startScenario({ storage: { 'sensiblemd-document': source } });
  const hosts: HTMLElement[] = [];
  try {
    expect((await press('ArrowRight')).defaultPrevented).toBe(false);
    await s.setReadingLayout('Page'); await s.clickOutlineHeading('Alpha');
    const first = s.visiblePageLabel();
    for (const tag of ['input', 'textarea', 'div']) {
      const host = document.createElement(tag);
      if (tag === 'div') host.setAttribute('contenteditable', 'true');
      document.body.append(host); hosts.push(host);
      const target = tag === 'div' ? host.appendChild(document.createElement('span')) : host;
      for (const key of ['ArrowLeft', 'ArrowRight']) expect((await press(key, {}, target)).defaultPrevented).toBe(false);
      expect(s.visiblePageLabel()).toBe(first);
    }
    expect((await press('ArrowRight')).defaultPrevented).toBe(true);
    expect(s.visiblePageNumbers()).toEqual([2]);
    expect((await press('ArrowRight', { repeat: true, isComposing: true, metaKey: true, altKey: true })).defaultPrevented).toBe(true);
    expect(s.visiblePageNumbers()).toEqual([3]);
    expect((await press('ArrowLeft')).defaultPrevented).toBe(true);
    expect(s.visiblePageNumbers()).toEqual([2]);
    for (const mode of ['Write', 'Split'] as const) {
      await s.enterMode(mode);
      expect((await press('ArrowRight')).defaultPrevented).toBe(false);
      expect((await press('ArrowLeft')).defaultPrevented).toBe(false);
    }
    await s.enterMode('Read'); await s.setReadingLayout('Scroll');
    expect((await press('ArrowLeft')).defaultPrevented).toBe(false);
  } finally { hosts.forEach(h => h.remove()); s.unmount(); }
});

it('keeps one shortcut listener across rerenders and removes it on unmount/remount', async () => {
  const activeListeners = new Set<EventListenerOrEventListenerObject>();
  const add = window.addEventListener.bind(window); const remove = window.removeEventListener.bind(window);
  const addSpy = vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
    if (type === 'keydown' && typeof listener === 'function' && listener.name === 'onKeyDown') {
      activeListeners.add(listener); expect(activeListeners.size).toBe(1);
    }
    add(type, listener, options);
  });
  const removeSpy = vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
    if (type === 'keydown' && typeof listener === 'function' && listener.name === 'onKeyDown') activeListeners.delete(listener);
    remove(type, listener, options);
  });
  try {
    for (let i = 0; i < 2; i++) {
      const s = await startScenario();
      try {
        expect(activeListeners.size).toBe(1);
        const before = [...activeListeners][0];
        await s.user.click(screen.getByRole('button', { name: 'Reading settings' }));
        expect(activeListeners.size).toBe(1);
        expect([...activeListeners][0]).not.toBe(before); // Fresh headings currently cause registration on every render.
        await press('e', { ctrlKey: true }); expect(s.currentMode()).toBe('Write');
      } finally { s.unmount(); }
      expect(activeListeners.size).toBe(0);
      expect((await press('e', { ctrlKey: true })).defaultPrevented).toBe(false);
    }
  } finally { addSpy.mockRestore(); removeSpy.mockRestore(); }
});
