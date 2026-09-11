import { paginateTestDocument as paginateDocument } from "./pagination-geometry";
import { act, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { startScenario } from "./scenario";
import {
  ControlledIntersectionObserver as Observer,
  scrollRequests,
} from "./dom-polyfills";
import { parseSemanticDocument } from "../core/semantic-document";

const source =
  "# One section\n\n" +
  Array.from(
    { length: 9 },
    (_, i) => `Passage ${i} ${"word ".repeat(60)}`,
  ).join("\n\n");
const model = parseSemanticDocument(source, 0);
const start = () =>
  startScenario({ storage: { "sensiblemd-document": source } });
const nodeForPage = (capacity: number, page: number) =>
  model.nodes.find(
    (n) => n.id === paginateDocument(model, capacity)[page].fragments[0].nodeId,
  )!;

describe("DOG2-001 semantic passage continuity", () => {
  it.each(["Page", "Spread"] as const)(
    "%s → Scroll reveals the anchored paragraph, not its heading",
    async (layout) => {
      const s = await start();
      try {
        await s.setReadingLayout(layout);
        await s.clickNextPage();
        const node = nodeForPage(
          130,
          s.visiblePageNumbers()[0] - 1,
        );
        scrollRequests.length = 0;
        await s.setReadingLayout("Scroll");
        await s.settleNavigation();
        expect(s.lastScrollRequest()?.elementId).toBe(`reader-node-${node.id}`);
        expect(s.currentMode()).toBe("Read");
        await s.setReadingLayout(layout);
        expect(s.visiblePageNumbers()).toContain(
          paginateDocument(model, 130).findIndex(
            (p) => p.fragments.some((f) => f.nodeId === node.id),
          ) + 1,
        );
      } finally {
        s.unmount();
      }
    },
  );
  it.each(["Write", "Split"] as const)(
    "Page → %s projects the paragraph into the editor",
    async (mode) => {
      const s = await start();
      try {
        await s.setReadingLayout("Page");
        await s.clickNextPage();
        const node = nodeForPage(130, s.visiblePageNumbers()[0] - 1);
        scrollRequests.length = 0;
        await s.enterMode(mode);
        await s.settleNavigation();
        expect(s.currentMode()).toBe(mode);
        expect(s.editorCursorLine()).toBe(node.range.line);
        if (mode === "Split")
          expect(s.lastScrollRequest()?.elementId).toBe(
            `reader-node-${node.id}`,
          );
        expect(s.editorSource()).toBe(source);
        expect(s.isDirty()).toBe(false);
      } finally {
        s.unmount();
      }
    },
  );
  it("Write → Read reveals the paragraph at the editor cursor", async () => {
    const s = await start();
    try {
      await s.enterMode("Write");
      const node = model.nodes[5];
      await s.moveEditorCursorToLine(node.range.line);
      scrollRequests.length = 0;
      await s.enterMode("Read");
      await s.settleNavigation();
      expect(s.lastScrollRequest()?.elementId).toBe(`reader-node-${node.id}`);
      expect(s.isDirty()).toBe(false);
    } finally {
      s.unmount();
    }
  });
  it("Scroll → Page derives its page from the observed paragraph and round trips", async () => {
    const s = await start();
    try {
      const node = model.nodes[5];
      const target = document.getElementById(`reader-node-${node.id}`)!;
      fireEvent.wheel(document.querySelector(".document-reader")!);
      fireEvent.scroll(document);
      await act(async () =>
        Observer.instances
          .findLast((o) => o.targets.has(target))!
          .emit([target]),
      );
      await s.setReadingLayout("Page");
      expect(s.visiblePageNumbers()).toContain(
        paginateDocument(model).findIndex((p) =>
          p.fragments.some((f) => f.nodeId === node.id),
        ) + 1,
      );
      scrollRequests.length = 0;
      await s.setReadingLayout("Scroll");
      await s.settleNavigation();
      expect(s.lastScrollRequest()?.elementId).toBe(target.id);
    } finally {
      s.unmount();
    }
  });
});
