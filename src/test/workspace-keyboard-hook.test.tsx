import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useWorkspaceKeyboard } from '../core/use-workspace-keyboard';

it('reads the latest save ref without replacing a listener when the original dependencies are unchanged', async () => {
  const first = vi.fn(); const latest = vi.fn();
  const keyboardSave = { current: first };
  const props = {
    view: 'read' as const, readingMode: 'continuous' as const, activeHeading: '', headings: [], keyboardSave,
    toggleView: vi.fn(), openPalette: vi.fn(), openSearch: vi.fn(), navigateHeading: vi.fn(), turnPage: vi.fn(),
  };
  const add = vi.spyOn(window, 'addEventListener'); const remove = vi.spyOn(window, 'removeEventListener');
  const hook = renderHook(() => useWorkspaceKeyboard(props));
  try {
    const registrations = add.mock.calls.filter(([type]) => type === 'keydown');
    expect(registrations).toHaveLength(1);
    keyboardSave.current = latest;
    hook.rerender();
    expect(add.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1);
    const event = new KeyboardEvent('keydown', { key: 's', metaKey: true, cancelable: true });
    await act(async () => { window.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
    expect(latest).toHaveBeenCalledOnce(); expect(first).not.toHaveBeenCalled();
    hook.unmount();
    expect(remove.mock.calls.filter(([type]) => type === 'keydown')).toEqual([['keydown', registrations[0][1]]]);
  } finally { hook.unmount(); add.mockRestore(); remove.mockRestore(); }
});
