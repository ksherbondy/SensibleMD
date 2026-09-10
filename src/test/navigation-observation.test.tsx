import { act, fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { startScenario } from "./scenario";
import { ControlledIntersectionObserver as Observer } from "./dom-polyfills";

const source = "# Alpha\n\nFirst paragraph.\n\n## Beta\n\nSecond paragraph.";
const start = () =>
  startScenario({ storage: { "sensiblemd-document": source } });
const active = () =>
  document.querySelector('.outline-item[aria-current="location"]')?.textContent;
const observer = () => {
  const current = Observer.instances.findLast((item) => item.targets.size > 0);
  if (!current) throw new Error("No active reader observer");
  return current;
};
const scroll = () => {
  const reader = document.querySelector(".document-reader")!;
  fireEvent.wheel(reader);
  fireEvent.scroll(document);
};
const emit = async (current: Observer, targets: Element[]) => {
  await act(async () => current.emit(targets));
};

describe("N04 passive navigation observation", () => {
  it("N04-1 follows user scroll, resolves ties in source order, and never projects or steals focus", async () => {
    const scenario = await start();
    try {
      const beta = screen.getByRole("heading", { name: "Beta" });
      const alpha = screen.getByRole("heading", { name: "Alpha" });
      const current = observer();
      const focus = document.activeElement;
      const request = scenario.lastScrollRequest();
      await emit(current, [beta]); // Initial visibility alone is not user navigation.
      expect(active()).not.toBe("Beta");
      scroll();
      await emit(current, [beta, alpha]);
      expect(active()).toBe("Alpha");
      scroll();
      await emit(current, [screen.getByText("Second paragraph.")]);
      expect(active()).toBe("Beta");
      expect(document.activeElement).toBe(focus);
      expect(scenario.lastScrollRequest()).toBe(request);
    } finally {
      scenario.unmount();
    }
  });

  it("N04-2 rejects old and fresh visibility callbacks after explicit navigation until user scrolls again", async () => {
    const scenario = await start();
    try {
      const old = observer();
      const alpha = screen.getByRole("heading", { name: "Alpha" });
      scroll();
      await scenario.clickOutlineHeading("Beta");
      await scenario.settleNavigation();
      await emit(old, [alpha]);
      fireEvent.scroll(document);
      await emit(observer(), [alpha]);
      expect(active()).toBe("Beta");
      scroll();
      await emit(observer(), [alpha]);
      expect(active()).toBe("Alpha");
    } finally {
      scenario.unmount();
    }
  });

  for (const [id, mode] of [
    ["N04-3", "Write"],
    ["N04-4", "Split"],
  ] as const) {
    it(`${id} follows ${mode} cursor without changing source, mode or dirty state`, async () => {
      const scenario = await start();
      try {
        await scenario.enterMode(mode);
        const dirty = scenario.isDirty();
        await scenario.moveEditorCursorToLine(7);
        expect(active()).toBe("Beta");
        await scenario.moveEditorCursorToLine(3);
        expect(active()).toBe("Alpha");
        expect(scenario.currentMode()).toBe(mode);
        expect(scenario.editorSource()).toBe(source);
        expect(scenario.isDirty()).toBe(dirty);
      } finally {
        scenario.unmount();
      }
    });
  }

  it("N04-5 rejects queued document A observations after opening document B", async () => {
    const scenario = await start();
    try {
      const old = observer();
      const alpha = screen.getByRole("heading", { name: "Alpha" });
      scroll();
      // Identical source means node IDs collide: document identity must still revoke A.
      scenario.desktop.addFile("/B.md", source);
      scenario.desktop.openDialogResult = "/B.md";
      await scenario.openDocument();
      await scenario.clickOutlineHeading("Beta");
      await emit(old, [alpha]);
      expect(scenario.documentName()).toBe("B.md");
      expect(active()).toBe("Beta");
    } finally {
      scenario.unmount();
    }
  });
});
