import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deferred } from "./scheduler";
import { startScenario } from "./scenario";

const close = async (scenario: Awaited<ReturnType<typeof startScenario>>) => {
  await scenario.user.click(
    screen.getByRole("button", { name: "Close document" }),
  );
  await scenario.settle();
};

describe("DOG-001 Close Document", () => {
  it("closes to a true empty workspace, preserves reader memory, then opens another file cleanly", async () => {
    const scenario = await startScenario({
      storage: { "sensiblemd-document": "# First\n\n## Remember me" },
    });
    try {
      await scenario.clickOutlineHeading("Remember me");
      const memory = localStorage.getItem("sensiblemd-reader-memory");
      await close(scenario);
      expect(
        screen.getByRole("heading", { name: "No document open" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("group", { name: "Document mode" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("complementary", { name: "Document outline" }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Save Markdown file" }),
      ).not.toBeInTheDocument();
      expect(document.querySelector(".app-shell")).not.toHaveAttribute(
        "data-document-id",
      );
      expect(localStorage.getItem("sensiblemd-reader-memory")).toBe(memory);
      scenario.desktop.addFile("/Next.md", "# Next\n\nNew text.");
      scenario.desktop.openDialogResult = "/Next.md";
      await scenario.openDocument();
      expect(scenario.documentName()).toBe("Next.md");
      expect(screen.getByRole("heading", { name: "Next" })).toBeInTheDocument();
      expect(scenario.outlineHeadings()).toEqual(["Next"]);
      expect(scenario.isDirty()).toBe(false);
      await scenario.enterMode("Write");
      await scenario.appendToEditor(" edited");
      await scenario.save();
      expect(scenario.desktop.diskContents("/Next.md")).toBe(
        "# Next\n\nNew text. edited",
      );
    } finally {
      scenario.unmount();
    }
  });

  it("refuses dirty close, keeps edits after failed/cancelled saving, and closes after a successful save", async () => {
    const scenario = await startScenario({
      storage: { "sensiblemd-document": "# Draft" },
    });
    try {
      await scenario.enterMode("Write");
      await scenario.appendToEditor("\n\nUnsaved writing.");
      await close(scenario);
      expect(scenario.status()).toMatch(/save.*before closing/i);
      expect(scenario.editorSource()).toBe("# Draft\n\nUnsaved writing.");
      expect(scenario.isDirty()).toBe(true);
      await scenario.save(); // cancelled Save As
      await close(scenario);
      expect(scenario.isDirty()).toBe(true);
      scenario.desktop.failures.saveAs = true;
      await scenario.save();
      await close(scenario);
      expect(scenario.isDirty()).toBe(true);
      scenario.desktop.failures.saveAs = false;
      scenario.desktop.saveAsDialogResult = "/Draft.md";
      await scenario.save();
      await close(scenario);
      expect(
        screen.getByRole("heading", { name: "No document open" }),
      ).toBeInTheDocument();
      expect(scenario.desktop.diskContents("/Draft.md")).toBe(
        "# Draft\n\nUnsaved writing.",
      );
    } finally {
      scenario.unmount();
    }
  });

  it("remains empty when reopening is cancelled or fails, and ignores old external changes", async () => {
    const scenario = await startScenario();
    try {
      await close(scenario);
      await scenario.openDocument();
      expect(
        screen.getByRole("heading", { name: "No document open" }),
      ).toBeInTheDocument();
      scenario.desktop.failures.open = true;
      await scenario.openDocument();
      expect(
        screen.getByRole("heading", { name: "No document open" }),
      ).toBeInTheDocument();
      scenario.desktop.emitExternalChange("# Old event");
      await scenario.settle();
      expect(
        screen.queryByRole("heading", { name: "Old event" }),
      ).not.toBeInTheDocument();
    } finally {
      scenario.unmount();
    }
  });
  it("does not close newer edits when an older in-flight save finishes", async () => {
    const scenario = await startScenario({
      storage: { "sensiblemd-document": "# Draft" },
    });
    try {
      await scenario.enterMode("Write");
      await scenario.appendToEditor(" first edit");
      scenario.desktop.saveAsDialogResult = "/Draft.md";
      scenario.scheduler.useManualOrder();
      await scenario.save();
      await scenario.appendToEditor(" newer edit");
      scenario.scheduler.release("document:save-as");
      await scenario.settle();
      await close(scenario);
      expect(scenario.isDirty()).toBe(true);
      expect(scenario.editorSource()).toBe("# Draft first edit newer edit");
      expect(scenario.desktop.diskContents("/Draft.md")).toBe(
        "# Draft first edit",
      );
      expect(
        screen.queryByRole("heading", { name: "No document open" }),
      ).not.toBeInTheDocument();
    } finally {
      scenario.scheduler.useAutomaticOrder();
      scenario.unmount();
    }
  });

  it("flushes outgoing reader state, preserves recovery records, and restores the same file after close", async () => {
    const scenario = await startScenario();
    try {
      scenario.desktop.addFile("/Reading.md", "# Start\n\n## Remember");
      scenario.desktop.openDialogResult = "/Reading.md";
      await scenario.openDocument();
      await scenario.clickOutlineHeading("Remember");
      const id = scenario.desktop.documentIdFor("/Reading.md");
      const recovery = {
        documentId: id,
        version: 0,
        source: "# Recovery copy",
        savedAt: "2026-01-01T00:00:00Z",
      };
      scenario.desktop.recoveryLatest.set(id, recovery);
      await close(scenario);
      const saved = scenario.desktop.documentState.get(id);
      expect(saved?.activeHeading).toBeTruthy();
      expect(scenario.desktop.recoveryLatest.get(id)).toEqual(recovery);
      await scenario.openDocument();
      expect(
        document.querySelector('.outline-item[aria-current="location"]'),
      ).toHaveTextContent("Remember");
      expect(scenario.isDirty()).toBe(false);
      expect(scenario.desktop.documentState.get(id)?.activeHeading).toBe(
        saved?.activeHeading,
      );
    } finally {
      scenario.unmount();
    }
  });

  it("keeps the document open if its final reader-state write fails", async () => {
    const scenario = await startScenario();
    try {
      scenario.desktop.failures.state = true;
      await close(scenario);
      expect(
        screen.queryByRole("heading", { name: "No document open" }),
      ).not.toBeInTheDocument();
      expect(scenario.status()).toMatch(/reader state could not be saved/i);
    } finally {
      scenario.unmount();
    }
  });

  it("does not apply a late recovery result from the closed workspace to the next file", async () => {
    const scenario = await startScenario();
    const late = deferred<{
      documentId: string;
      version: number;
      source: string;
      savedAt: string;
    } | null>();
    const load = vi
      .spyOn(scenario.desktop.api, "loadRecoverySnapshot")
      .mockImplementationOnce(() => late.promise);
    try {
      scenario.desktop.addFile("/A.md", "# A").addFile("/B.md", "# B");
      scenario.desktop.openDialogResult = "/A.md";
      await scenario.openDocument();
      await close(scenario);
      scenario.desktop.openDialogResult = "/B.md";
      await scenario.openDocument();
      late.resolve({
        documentId: scenario.desktop.documentIdFor("/A.md"),
        version: 1,
        source: "# Old recovery",
        savedAt: "2026-01-01T00:00:00Z",
      });
      await scenario.settle();
      expect(scenario.documentName()).toBe("B.md");
      expect(
        screen.queryByRole("button", { name: "Restore changes" }),
      ).not.toBeInTheDocument();
      expect(scenario.isDirty()).toBe(false);
    } finally {
      load.mockRestore();
      scenario.unmount();
    }
  });
});
