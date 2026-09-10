import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { startScenario } from "./scenario";
import { FakeDesktop } from "./electron-double";
import { parseSemanticDocument } from "../core/semantic-document";
import { createSemanticPosition } from "../core/semantic-position";

describe("DOG-001B Home and OS open", () => {
  it("starts at Home with recents without restoring or opening any file", async () => {
    const desktop = new FakeDesktop().addFile("/Recent.md", "# Recent");
    desktop.recents = ["/Recent.md"];
    const scenario = await startScenario({
      desktop,
      home: true,
      storage: { "sensiblemd-document": "# Old browser document" },
    });
    try {
      expect(
        screen.getByRole("heading", { name: "No document open" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Open recent Recent.md" }),
      ).toBeInTheDocument();
      expect(desktop.sessions).toHaveLength(0);
      await scenario.user.click(
        screen.getByRole("button", { name: "Open recent Recent.md" }),
      );
      await scenario.settle();
      expect(
        screen.getByRole("heading", { name: "Recent" }),
      ).toBeInTheDocument();
    } finally {
      scenario.unmount();
    }
  });
  it("opens the requested file, restores its reader location, then accepts another OS file", async () => {
    const source = "# Start\n\n## Saved section";
    const desktop = new FakeDesktop()
      .addFile("/Requested.md", source)
      .addFile("/Next.md", "# Next");
    const documentId = desktop.documentIdFor("/Requested.md");
    const model = parseSemanticDocument(source, 0);
    desktop.documentState.set(documentId, {
      schemaVersion: 1,
      documentId,
      bookmarks: [],
      activeHeading: model.headings[1].id,
      position: createSemanticPosition(model, model.headings[1].id)!,
      fontScale: 100,
      lineHeight: 1.72,
      contentWidth: 760,
      reducedMotion: false,
    });
    const scenario = await startScenario({ desktop, home: true });
    try {
      await act(async () => desktop.emitOsOpen("/Requested.md"));
      await scenario.settleNavigation();
      expect(scenario.documentName()).toBe("Requested.md");
      expect(
        document.querySelector('.outline-item[aria-current="location"]'),
      ).toHaveTextContent("Saved section");
      expect(scenario.lastScrollRequest()?.element).toBe(
        screen.getByRole("heading", { name: "Saved section" }),
      );
      await act(async () => desktop.emitOsOpen("/Next.md"));
      await scenario.settle();
      expect(scenario.documentName()).toBe("Next.md");
      await scenario.user.click(
        screen.getByRole("button", { name: "Close document" }),
      );
      await scenario.settle();
      expect(
        screen.getByRole("heading", { name: "No document open" }),
      ).toBeInTheDocument();
    } finally {
      scenario.unmount();
    }
  });
  it("does not authorize an OS replacement while the active document has unsaved changes", async () => {
    const scenario = await startScenario();
    try {
      await scenario.enterMode("Write");
      await scenario.appendToEditor(" unsaved");
      const source = scenario.editorSource();
      scenario.desktop.addFile("/Other.md", "# Other");
      await act(async () => scenario.desktop.emitOsOpen("/Other.md"));
      expect(scenario.editorSource()).toBe(source);
      expect(scenario.isDirty()).toBe(true);
      expect(scenario.desktop.authorizedPath).toBeNull();
    } finally {
      scenario.unmount();
    }
  });
});
