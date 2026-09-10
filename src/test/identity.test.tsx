import { describe, expect, it } from "vitest";
import { FakeDesktop } from "./electron-double";
import { startScenario } from "./scenario";

const documentIdOf = () =>
  document.querySelector(".app-shell")?.getAttribute("data-document-id") ?? "";
const sessionIdOf = () =>
  document.querySelector(".app-shell")?.getAttribute("data-session-id") ?? "";

describe("document identity in the running application", () => {
  it("gives same-named files in different directories different identities", async () => {
    const desktop = new FakeDesktop()
      .addFile("/Users/reader/project-a/notes.md", "# Project A")
      .addFile("/Users/reader/project-b/notes.md", "# Project B");
    const scenario = await startScenario({ desktop });

    desktop.openDialogResult = "/Users/reader/project-a/notes.md";
    await scenario.openDocument();
    const first = documentIdOf();

    desktop.openDialogResult = "/Users/reader/project-b/notes.md";
    await scenario.openDocument();
    const second = documentIdOf();

    expect(first).toBe(
      desktop.documentIdFor("/Users/reader/project-a/notes.md"),
    );
    expect(second).toBe(
      desktop.documentIdFor("/Users/reader/project-b/notes.md"),
    );
    expect(first).not.toBe(second);
    scenario.unmount();
  });

  it("only ever asks for saved state belonging to the active document", async () => {
    const desktop = new FakeDesktop()
      .addFile(
        "/Users/reader/project-a/notes.md",
        "# Project A\n\nAlpha paragraph.",
      )
      .addFile(
        "/Users/reader/project-b/notes.md",
        "# Project B\n\nBeta paragraph.",
      );
    const scenario = await startScenario({ desktop });

    desktop.openDialogResult = "/Users/reader/project-a/notes.md";
    await scenario.openDocument();
    await scenario.settle();
    const first = documentIdOf();

    desktop.openDialogResult = "/Users/reader/project-b/notes.md";
    await scenario.openDocument();
    await scenario.settle();
    const second = documentIdOf();

    const requested = new Set(
      desktop.stateRequests.map((request) => request.documentId),
    );
    expect(requested.has(first)).toBe(true);
    expect(requested.has(second)).toBe(true);
    expect(first).not.toBe(second);
    // Nothing outside the two documents actually opened was ever requested.
    expect(
      [...requested].every(
        (id) =>
          id === first || id === second || id === scenario.welcomeDocumentId,
      ),
    ).toBe(true);
    scenario.unmount();
  });

  it("does not let one document read another document's recovery snapshot", async () => {
    const desktop = new FakeDesktop()
      .addFile("/Users/reader/project-a/notes.md", "# Project A")
      .addFile("/Users/reader/project-b/notes.md", "# Project B");
    const scenario = await startScenario({ desktop });

    desktop.openDialogResult = "/Users/reader/project-a/notes.md";
    await scenario.openDocument();
    await desktop.api.saveRecoverySnapshot({
      documentId: documentIdOf(),
      version: 1,
      source: "# Project A unsaved",
    });

    desktop.openDialogResult = "/Users/reader/project-b/notes.md";
    await scenario.openDocument();
    await scenario.settle();

    expect(await desktop.api.loadRecoverySnapshot(documentIdOf())).toBeNull();
    scenario.unmount();
  });

  it("establishes an ephemeral session for a desktop document and none for the sample", async () => {
    const desktop = new FakeDesktop().addFile(
      "/Users/reader/guide.md",
      "# Guide",
    );
    desktop.openDialogResult = "/Users/reader/guide.md";
    const scenario = await startScenario({ desktop });

    expect(sessionIdOf()).toBe("");

    await scenario.openDocument();
    const session = sessionIdOf();
    expect(session).not.toBe("");

    await scenario.openDocument();
    expect(sessionIdOf()).not.toBe(session);
    expect(documentIdOf()).toBe(
      desktop.documentIdFor("/Users/reader/guide.md"),
    );
    scenario.unmount();
  });

  it("keeps the sample document under one fixed identity across restarts", async () => {
    const first = await startScenario();
    const originalId = documentIdOf();
    first.unmount();

    const second = await startScenario({
      storage: {
        "sensiblemd-document": "# Edited sample",
        "sensiblemd-name": "Welcome.md",
      },
    });
    expect(documentIdOf()).toBe(originalId);
    second.unmount();
  });
});
