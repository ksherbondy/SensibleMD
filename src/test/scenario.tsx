import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { EditorView } from "@codemirror/view";
import App, { starterDocument } from "../App";
import { WELCOME_DOCUMENT_ID } from "../core/identity";
import { FakeDesktop } from "./electron-double";
import { CallScheduler } from "./scheduler";
import { scrollRequests, type ScrollRequest } from "./dom-polyfills";

type DocumentMode = "Read" | "Write" | "Split";

export interface ScenarioOptions {
  home?: boolean;
  desktop?: FakeDesktop;
  /** Seed browser storage before the application reads it during mount. */
  storage?: Record<string, string>;
}

export interface Scenario {
  readonly desktop: FakeDesktop;
  readonly scheduler: CallScheduler;
  readonly user: UserEvent;
  /** Identity of the bundled sample, which the application starts on. */
  readonly welcomeDocumentId: string;
  /** Let queued microtasks and effects settle. */
  settle: () => Promise<void>;
  unmount: () => void;

  documentName: () => string;
  isDirty: () => boolean;
  status: () => string;
  chapterNames: () => string[];
  outlineHeadings: () => string[];
  currentMode: () => DocumentMode;
  visiblePageLabel: () => string;
  /** Mounted, accessible pages; jsdom cannot establish CSS viewport visibility. */
  visiblePageNumbers: () => number[];
  lastScrollRequest: () => ScrollRequest | undefined;
  editorCursorLine: () => number;
  editorSource: () => string;

  openDocument: () => Promise<void>;
  save: () => Promise<void>;
  enterMode: (mode: "Read" | "Write" | "Split") => Promise<void>;
  setReadingLayout: (layout: "Scroll" | "Page" | "Spread") => Promise<void>;
  clickNextPage: () => Promise<void>;
  clickPreviousPage: () => Promise<void>;
  /** occurrence is zero-based within outline buttons with the exact label. */
  clickOutlineHeading: (
    headingText: string,
    occurrence?: number,
  ) => Promise<void>;
  moveEditorCursorToLine: (line: number) => Promise<void>;
  /** Wait for already queued navigation RAF callbacks, then settle React effects. */
  settleNavigation: () => Promise<void>;
  setEditorSource: (source: string) => Promise<void>;
  appendToEditor: (text: string) => Promise<void>;
  switchChapter: (name: string) => Promise<void>;
  restoreRecovery: () => Promise<void>;
  discardRecovery: () => Promise<void>;
  reloadFromDisk: () => Promise<void>;
}

function requireShell() {
  const shell = document.querySelector(".app-shell");
  if (!shell) throw new Error("Application shell is not mounted");
  return shell;
}

function editorView() {
  const host = document.querySelector(".markdown-editor .cm-editor");
  if (!(host instanceof HTMLElement))
    throw new Error(
      'Source editor is not mounted. Call enterMode("Write") or enterMode("Split") first.',
    );
  const view = EditorView.findFromDOM(host);
  if (!view)
    throw new Error("Source editor is mounted but has no CodeMirror view");
  return view;
}

export async function startScenario(
  options: ScenarioOptions = {},
): Promise<Scenario> {
  const desktop = options.desktop ?? new FakeDesktop();
  for (const [key, value] of Object.entries(options.storage ?? {}))
    localStorage.setItem(key, value);
  desktop.install();

  const user = userEvent.setup();
  // Legacy scenarios explicitly load their fixture; real startup is Home.
  const view = render(
    <App
      initialDocument={
        options.home
          ? undefined
          : {
              id: WELCOME_DOCUMENT_ID,
              name: localStorage.getItem("sensiblemd-name") ?? "Welcome.md",
              source:
                localStorage.getItem("sensiblemd-document") ?? starterDocument,
              sessionId: null,
              canSaveDirectly: false,
            }
      }
    />,
  );
  const settle = async () => {
    await act(async () => {
      await Promise.resolve();
    });
  };
  await settle();

  const clickByName = async (name: string | RegExp) => {
    await user.click(screen.getByRole("button", { name }));
    await settle();
  };

  const dispatchToEditor = async (
    transaction: Parameters<EditorView["dispatch"]>[0],
  ) => {
    const editor = editorView();
    await act(async () => {
      editor.dispatch(transaction);
    });
    await settle();
  };

  return {
    desktop,
    scheduler: desktop.scheduler,
    user,
    welcomeDocumentId: WELCOME_DOCUMENT_ID,
    settle,
    unmount: () => {
      view.unmount();
      desktop.uninstall();
    },

    documentName: () =>
      requireShell().querySelector(".document-title > span")?.textContent ?? "",
    isDirty: () => requireShell().getAttribute("data-dirty") === "true",
    status: () => document.querySelector(".app-status")?.textContent ?? "",
    chapterNames: () =>
      Array.from(document.querySelectorAll(".chapter-list button")).map(
        (button) => button.textContent?.replace(/^\d+/, "") ?? "",
      ),
    outlineHeadings: () =>
      Array.from(document.querySelectorAll(".outline-item")).map(
        (button) => button.textContent ?? "",
      ),
    currentMode: () => {
      const group = screen.getByRole("group", { name: "Document mode" });
      const selected = within(group)
        .getAllByRole("button")
        .find(
          (button) =>
            button.classList.contains("selected") ||
            button.getAttribute("aria-pressed") === "true",
        );
      const label = selected?.textContent;
      if (label !== "Read" && label !== "Write" && label !== "Split")
        throw new Error("No selected document mode");
      return label;
    },
    visiblePageLabel: () =>
      document.querySelector(".page-controls > span")?.textContent ?? "",
    visiblePageNumbers: () =>
      screen
        .queryAllByRole("article", { name: /^Page \d+$/ })
        .map((page) => Number(page.getAttribute("aria-label")?.slice(5))),
    lastScrollRequest: () => scrollRequests.at(-1),
    editorCursorLine: () => {
      const editor = editorView();
      return editor.state.doc.lineAt(editor.state.selection.main.head).number;
    },
    editorSource: () => editorView().state.doc.toString(),

    setReadingLayout: async (layout) => {
      await user.click(
        within(screen.getByRole("group", { name: "Reading layout" })).getByRole(
          "button",
          { name: layout },
        ),
      );
      await settle();
    },
    clickNextPage: () => clickByName("Next page"),
    clickPreviousPage: () => clickByName("Previous page"),
    clickOutlineHeading: async (headingText, occurrence = 0) => {
      const outline = screen.getByRole("complementary", {
        name: "Document outline",
      });
      const buttons = within(outline).getAllByRole("button", {
        name: headingText,
      });
      const button = buttons[occurrence];
      if (!button)
        throw new Error(
          `Outline heading ${JSON.stringify(headingText)} occurrence ${occurrence} is missing`,
        );
      await user.click(button);
      await settle();
    },
    moveEditorCursorToLine: async (line) => {
      const editor = editorView();
      await act(async () => {
        editor.focus();
      });
      await dispatchToEditor({
        selection: { anchor: editor.state.doc.line(line).from },
      });
    },
    settleNavigation: async () => {
      // A frame barrier uses jsdom's existing RAF; no fake clock or observer needed.
      await act(async () => {
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      });
      await settle();
    },

    openDocument: () => clickByName("Open Markdown file"),
    save: () => clickByName("Save Markdown file"),

    enterMode: async (mode) => {
      const group = screen.getByRole("group", { name: "Document mode" });
      await user.click(within(group).getByRole("button", { name: mode }));
      await settle();
      if (mode !== "Read") await waitFor(() => editorView());
    },

    setEditorSource: async (source) => {
      const editor = editorView();
      await dispatchToEditor({
        changes: { from: 0, to: editor.state.doc.length, insert: source },
      });
    },

    appendToEditor: async (text) => {
      const editor = editorView();
      await dispatchToEditor({
        changes: { from: editor.state.doc.length, insert: text },
      });
    },

    switchChapter: async (name) => {
      const nav = screen.getByRole("navigation", {
        name: "Collection chapters",
      });
      await user.click(
        within(nav).getByRole("button", {
          name: new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        }),
      );
      await settle();
    },

    restoreRecovery: () => clickByName("Restore changes"),
    discardRecovery: () => clickByName("Discard recovery"),
    reloadFromDisk: () => clickByName("Reload from disk"),
  };
}
