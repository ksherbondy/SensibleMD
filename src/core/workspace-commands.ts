import type { CommandDefinition } from "./commands";

type Direction = "next" | "previous";

export interface WorkspaceCommandFacts {
  recentDocuments: ReadonlyArray<{ index: number; name: string }>;
  saveUnavailable: boolean;
  enabled: {
    "file.close": boolean;
    "file.save": boolean;
    "reader.nextHeading": boolean;
    "reader.previousHeading": boolean;
    "reader.nextParagraph": boolean;
    "reader.previousParagraph": boolean;
    "reader.nextLink": boolean;
    "reader.nextImage": boolean;
    "reader.nextTable": boolean;
    "reader.nextCodeBlock": boolean;
    "reader.copyCurrentParagraph": boolean;
    "reader.copyCurrentCodeBlock": boolean;
    "history.back": boolean;
    "history.forward": boolean;
    "book.nextPage": boolean;
    "book.previousPage": boolean;
    "book.nextChapter": boolean;
    "book.previousChapter": boolean;
    "search.nextResult": boolean;
    "search.previousResult": boolean;
    "search.returnToOrigin": boolean;
    "bookmark.addCurrentPosition": boolean;
    "accessibility.showCurrentContext": boolean;
    "editor.enterRawMode": boolean;
    "editor.enterSplitMode": boolean;
    "reader.enterRenderedMode": boolean;
  };
}

export interface WorkspaceCommandActions {
  openDocument: () => void;
  openRecentDocument: (index: number) => void;
  openCollection: () => void;
  closeDocument: () => void;
  saveFile: () => void;
  downloadCopy: () => void;
  navigateHeading: (direction: Direction) => void;
  navigateStructure: (type: "paragraph" | "link" | "image" | "table" | "code", direction: Direction) => void;
  copyCurrentNode: (type: "paragraph" | "code") => void;
  goThroughHistory: (direction: "back" | "forward") => void;
  turnPage: (direction: Direction) => void;
  navigateChapter: (direction: Direction) => void;
  navigateSearchResults: (direction: Direction) => void;
  returnToSearchOrigin: () => void;
  toggleBookmark: () => void;
  showCurrentContext: () => void;
  enterMode: (mode: "read" | "write" | "split") => void;
  showAuthoringChecks: () => void;
  showDiagnostics: (filter: "error" | "warning" | "all") => void;
  showReadingSettings: () => void;
}

// Called each render: facts are current availability, actions retain that render's closures.
export function createWorkspaceCommands({ facts, actions }: {
  facts: WorkspaceCommandFacts;
  actions: WorkspaceCommandActions;
}): CommandDefinition[] {
  return [
    {
      id: "app.openFile",
      title: "Open Markdown File",
      keywords: ["document", "file"],
      shortcut: "Cmd/Ctrl+O",
      scope: "global",
      enabled: true,
      execute: () => void actions.openDocument(),
    },
    ...facts.recentDocuments.map((recent) => ({
      id: `app.openRecent.${recent.index}`,
      title: `Open Recent: ${recent.name}`,
      keywords: ["recent", "document", "file"],
      scope: "global" as const,
      enabled: true,
      execute: () => void actions.openRecentDocument(recent.index),
    })),
    {
      id: "app.openCollection",
      title: "Open Markdown Collection",
      keywords: ["chapters", "book", "multiple files"],
      scope: "global",
      enabled: true,
      execute: actions.openCollection,
    },
    {
      id: "file.close",
      title: "Close Document",
      keywords: ["document", "close"],
      scope: "global",
      enabled: facts.enabled["file.close"],
      execute: () => void actions.closeDocument(),
    },
    {
      id: "file.save",
      title: "Save",
      keywords: ["document", "save"],
      shortcut: "Cmd/Ctrl+S",
      scope: "global",
      enabled: facts.enabled["file.save"],
      disabledReason: facts.enabled["file.save"] ? undefined : facts.saveUnavailable ? "Native saving is unavailable. Use Download copy to export." : "No unsaved changes.",
      execute: actions.saveFile,
    },
    {
      id: "file.downloadCopy",
      title: "Download copy",
      keywords: ["document", "export", "download"],
      scope: "global",
      enabled: true,
      execute: actions.downloadCopy,
    },
    {
      id: "reader.nextHeading",
      title: "Next Heading",
      keywords: ["navigate", "forward", "section"],
      shortcut: "Alt+Down",
      scope: "reader",
      enabled:
        facts.enabled["reader.nextHeading"],
      disabledReason: "No next heading is available.",
      execute: () => actions.navigateHeading("next"),
    },
    {
      id: "reader.previousHeading",
      title: "Previous Heading",
      keywords: ["navigate", "back", "section"],
      shortcut: "Alt+Up",
      scope: "reader",
      enabled:
        facts.enabled["reader.previousHeading"],
      disabledReason: "No previous heading is available.",
      execute: () => actions.navigateHeading("previous"),
    },
    {
      id: "reader.nextParagraph",
      title: "Next Paragraph",
      keywords: ["navigate", "forward", "text"],
      scope: "reader",
      enabled:
        facts.enabled["reader.nextParagraph"],
      disabledReason: "No next paragraph is available.",
      execute: () => actions.navigateStructure("paragraph", "next"),
    },
    {
      id: "reader.previousParagraph",
      title: "Previous Paragraph",
      keywords: ["navigate", "back", "text"],
      scope: "reader",
      enabled:
        facts.enabled["reader.previousParagraph"],
      disabledReason: "No previous paragraph is available.",
      execute: () => actions.navigateStructure("paragraph", "previous"),
    },
    {
      id: "reader.nextLink",
      title: "Next Link",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        facts.enabled["reader.nextLink"],
      disabledReason: "No next link is available.",
      execute: () => actions.navigateStructure("link", "next"),
    },
    {
      id: "reader.nextImage",
      title: "Next Image",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        facts.enabled["reader.nextImage"],
      disabledReason: "No next image is available.",
      execute: () => actions.navigateStructure("image", "next"),
    },
    {
      id: "reader.nextTable",
      title: "Next Table",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        facts.enabled["reader.nextTable"],
      disabledReason: "No next table is available.",
      execute: () => actions.navigateStructure("table", "next"),
    },
    {
      id: "reader.nextCodeBlock",
      title: "Next Code Block",
      keywords: ["navigate", "forward"],
      scope: "reader",
      enabled:
        facts.enabled["reader.nextCodeBlock"],
      disabledReason: "No next code block is available.",
      execute: () => actions.navigateStructure("code", "next"),
    },
    {
      id: "reader.copyCurrentParagraph",
      title: "Copy Current Paragraph",
      keywords: ["reader", "clipboard", "text"],
      scope: "reader",
      enabled:
        facts.enabled["reader.copyCurrentParagraph"],
      disabledReason: "No paragraph is available to copy.",
      execute: () => actions.copyCurrentNode("paragraph"),
    },
    {
      id: "reader.copyCurrentCodeBlock",
      title: "Copy Current Code Block",
      keywords: ["reader", "clipboard", "code"],
      scope: "reader",
      enabled:
        facts.enabled["reader.copyCurrentCodeBlock"],
      disabledReason: "No code block is available to copy.",
      execute: () => actions.copyCurrentNode("code"),
    },
    {
      id: "history.back",
      title: "Go Back",
      keywords: ["history", "previous location"],
      scope: "reader",
      enabled: facts.enabled["history.back"],
      disabledReason: "No previous reading location is available.",
      execute: () => actions.goThroughHistory("back"),
    },
    {
      id: "history.forward",
      title: "Go Forward",
      keywords: ["history", "next location"],
      scope: "reader",
      enabled: facts.enabled["history.forward"],
      disabledReason: "No forward reading location is available.",
      execute: () => actions.goThroughHistory("forward"),
    },
    {
      id: "book.nextPage",
      title: "Next Page",
      keywords: ["book", "forward", "turn"],
      shortcut: "Right Arrow",
      scope: "book",
      enabled:
        facts.enabled["book.nextPage"],
      disabledReason: "No next page is available.",
      execute: () => actions.turnPage("next"),
    },
    {
      id: "book.previousPage",
      title: "Previous Page",
      keywords: ["book", "back", "turn"],
      shortcut: "Left Arrow",
      scope: "book",
      enabled: facts.enabled["book.previousPage"],
      disabledReason: "No previous page is available.",
      execute: () => actions.turnPage("previous"),
    },
    {
      id: "book.nextChapter",
      title: "Next Chapter",
      keywords: ["book", "collection", "forward"],
      scope: "book",
      enabled:
        facts.enabled["book.nextChapter"],
      disabledReason: "No next chapter is available.",
      execute: () => actions.navigateChapter("next"),
    },
    {
      id: "book.previousChapter",
      title: "Previous Chapter",
      keywords: ["book", "collection", "back"],
      scope: "book",
      enabled:
        facts.enabled["book.previousChapter"],
      disabledReason: "No previous chapter is available.",
      execute: () => actions.navigateChapter("previous"),
    },
    {
      id: "search.nextResult",
      title: "Next Search Result",
      keywords: ["find", "forward", "match"],
      scope: "search",
      enabled: facts.enabled["search.nextResult"],
      disabledReason: "Enter a search query with results first.",
      execute: () => actions.navigateSearchResults("next"),
    },
    {
      id: "search.previousResult",
      title: "Previous Search Result",
      keywords: ["find", "back", "match"],
      scope: "search",
      enabled: facts.enabled["search.previousResult"],
      disabledReason: "Enter a search query with results first.",
      execute: () => actions.navigateSearchResults("previous"),
    },
    {
      id: "search.returnToOrigin",
      title: "Return to Search Origin",
      keywords: ["find", "back", "reading position"],
      scope: "search",
      enabled: facts.enabled["search.returnToOrigin"],
      disabledReason:
        "Search result navigation has not moved from a reading position.",
      execute: actions.returnToSearchOrigin,
    },
    {
      id: "bookmark.addCurrentPosition",
      title: "Toggle Current Bookmark",
      keywords: ["save", "section"],
      scope: "reader",
      enabled: facts.enabled["bookmark.addCurrentPosition"],
      disabledReason: "Navigate to a heading before bookmarking it.",
      execute: actions.toggleBookmark,
    },
    {
      id: "accessibility.showCurrentContext",
      title: "Show Current Section Context",
      keywords: ["accessibility", "summary", "describe", "section"],
      scope: "reader",
      enabled: facts.enabled["accessibility.showCurrentContext"],
      execute: actions.showCurrentContext,
    },
    {
      id: "editor.enterRawMode",
      title: "Enter Writing Mode",
      keywords: ["edit", "source"],
      shortcut: "Cmd/Ctrl+E",
      scope: "global",
      enabled: facts.enabled["editor.enterRawMode"],
      disabledReason: "Already in writing mode.",
      execute: () => actions.enterMode("write"),
    },
    {
      id: "editor.enterSplitMode",
      title: "Enter Split Preview",
      keywords: ["edit", "source", "rendered", "side by side"],
      scope: "global",
      enabled: facts.enabled["editor.enterSplitMode"],
      disabledReason: "Already in split preview.",
      execute: () => actions.enterMode("split"),
    },
    {
      id: "reader.enterRenderedMode",
      title: "Enter Reading Mode",
      keywords: ["preview", "rendered"],
      shortcut: "Cmd/Ctrl+E",
      scope: "global",
      enabled: facts.enabled["reader.enterRenderedMode"],
      disabledReason: "Already in reading mode.",
      execute: () => actions.enterMode("read"),
    },
    {
      id: "accessibility.openFindings",
      title: "Show Authoring Checks",
      keywords: ["accessibility", "diagnostics", "issues"],
      scope: "editor",
      enabled: true,
      execute: actions.showAuthoringChecks,
    },
    {
      id: "diagnostics.showErrors",
      title: "Show Diagnostic Errors",
      keywords: ["accessibility", "findings", "filter"],
      scope: "editor",
      enabled: true,
      execute: () => actions.showDiagnostics("error"),
    },
    {
      id: "diagnostics.showWarnings",
      title: "Show Diagnostic Warnings",
      keywords: ["accessibility", "findings", "filter"],
      scope: "editor",
      enabled: true,
      execute: () => actions.showDiagnostics("warning"),
    },
    {
      id: "diagnostics.showAll",
      title: "Show All Diagnostics",
      keywords: ["accessibility", "findings", "filter"],
      scope: "editor",
      enabled: true,
      execute: () => actions.showDiagnostics("all"),
    },
    {
      id: "settings.show",
      title: "Show Reading Settings",
      keywords: ["text", "size", "preferences"],
      scope: "global",
      enabled: true,
      execute: actions.showReadingSettings,
    },
  ];
}
