import { expect, it, vi } from 'vitest';
import { createWorkspaceCommands, type WorkspaceCommandActions, type WorkspaceCommandFacts } from './workspace-commands';

function facts(enabled: boolean): WorkspaceCommandFacts {
  return {
    recentDocuments: [{ index: 7, name: 'Seven.md' }],
    saveUnavailable: false,
    enabled: {
      'file.close': enabled, 'file.save': enabled,
      'reader.nextHeading': enabled, 'reader.previousHeading': enabled,
      'reader.nextParagraph': enabled, 'reader.previousParagraph': enabled,
      'reader.nextLink': enabled, 'reader.nextImage': enabled,
      'reader.nextTable': enabled, 'reader.nextCodeBlock': enabled,
      'reader.copyCurrentParagraph': enabled, 'reader.copyCurrentCodeBlock': enabled,
      'history.back': enabled, 'history.forward': enabled,
      'book.nextPage': enabled, 'book.previousPage': enabled,
      'book.nextChapter': enabled, 'book.previousChapter': enabled,
      'search.nextResult': enabled, 'search.previousResult': enabled,
      'search.returnToOrigin': enabled, 'bookmark.addCurrentPosition': enabled,
      'accessibility.showCurrentContext': enabled,
      'editor.enterRawMode': enabled, 'editor.enterSplitMode': enabled,
      'reader.enterRenderedMode': enabled,
    },
  };
}

function actions(): WorkspaceCommandActions {
  return {
    openDocument: vi.fn(), openRecentDocument: vi.fn(), openCollection: vi.fn(),
    closeDocument: vi.fn(), saveFile: vi.fn(), downloadCopy: vi.fn(),
    navigateHeading: vi.fn(), navigateStructure: vi.fn(), copyCurrentNode: vi.fn(),
    goThroughHistory: vi.fn(), turnPage: vi.fn(), navigateChapter: vi.fn(),
    navigateSearchResults: vi.fn(), returnToSearchOrigin: vi.fn(), toggleBookmark: vi.fn(),
    showCurrentContext: vi.fn(), enterMode: vi.fn(), showAuthoringChecks: vi.fn(),
    showDiagnostics: vi.fn(), showReadingSettings: vi.fn(),
  };
}

it('constructs without side effects and keeps separate invocations tied to their supplied actions and facts', () => {
  const firstFacts = facts(false);
  Object.freeze(firstFacts.enabled);
  Object.freeze(firstFacts.recentDocuments[0]);
  Object.freeze(firstFacts.recentDocuments);
  Object.freeze(firstFacts);
  const firstActions = Object.freeze(actions());
  const first = createWorkspaceCommands({ facts: firstFacts, actions: firstActions });
  const secondActions = Object.freeze(actions());
  const second = createWorkspaceCommands({ facts: facts(true), actions: secondActions });
  for (const action of [...Object.values(firstActions), ...Object.values(secondActions)]) expect(action).not.toHaveBeenCalled();
  expect(first).not.toBe(second);
  expect(first.find(c => c.id === 'file.save')!.enabled).toBe(false);
  expect(second.find(c => c.id === 'file.save')!.enabled).toBe(true);
  second.find(c => c.id === 'file.save')!.execute();
  expect(secondActions.saveFile).toHaveBeenCalledOnce();
  expect(firstActions.saveFile).not.toHaveBeenCalled();
  first.find(c => c.id === 'app.openRecent.7')!.execute();
  expect(firstActions.openRecentDocument).toHaveBeenCalledExactlyOnceWith(7);
  expect(secondActions.openRecentDocument).not.toHaveBeenCalled();
});
