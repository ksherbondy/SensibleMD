import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useNativeSaveBinding } from '../core/use-native-save-binding';
import { asDocumentId, asSessionId } from '../core/identity';
import { saveWorkspaceDocumentDirectly } from '../core/workspace-save-actions';

it.each([false, true])('revokes/replaces the live binding before a React commit (StrictMode=%s)', strict => {
  const { result, unmount } = renderHook(() => useNativeSaveBinding(null), { reactStrictMode: strict });
  const first = { documentId: asDocumentId('a'), sessionId: asSessionId('one') };
  const second = { documentId: asDocumentId('a'), sessionId: asSessionId('two') };
  const previousRender = result.current;
  act(() => {
    previousRender.installBinding(first);
    expect(previousRender.readBinding()).toBe(first);
    expect(previousRender.binding).toBeNull();
    previousRender.revokeBinding();
    expect(previousRender.readBinding()).toBeNull();
    previousRender.installBinding(second);
    expect(previousRender.readBinding()).toBe(second);
  });
  expect(result.current.binding).toBe(second); unmount();
});

it('a successful disk response cannot mark saved after binding loss even if buffer version is unchanged', async () => {
  const markSaved = vi.fn(() => ({ isDirty: false })), dirty = vi.fn(), clear = vi.fn(), status = vi.fn();
  const save = vi.fn(async () => ({ name: 'A.md' }));
  await saveWorkspaceDocumentDirectly({
    savedDocumentId: 'a', savedSessionId: 'one', savedVersion: 7, source: '# A',
    saveOpenedDocument: save, readCurrentVersion: () => 7, ownsBinding: () => false,
    revokeBinding: vi.fn(), markSaved, setIsDirty: dirty, setAppStatus: status, clearSavedRecovery: clear,
  });
  expect(save).toHaveBeenCalledExactlyOnceWith({ documentId: 'a', sessionId: 'one', source: '# A' });
  expect(markSaved).not.toHaveBeenCalled(); expect(dirty).not.toHaveBeenCalled(); expect(clear).not.toHaveBeenCalled(); expect(status).not.toHaveBeenCalled();
});
