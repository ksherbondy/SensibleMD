import { testPageGeometry, ControlledResizeObserver } from "./pagination-geometry";
import { act, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { startScenario } from "./scenario";

const section = (n: number) =>
  `# Section ${n}\n\n${"word ".repeat(80)}Tail ${n}.`;
const source = Array.from({ length: 5 }, (_, i) => section(i + 1)).join("\n\n");

function mediaWidth(initial: boolean) {
  testPageGeometry.width = initial ? 500 : 760;
  return {
    resize: async (narrow: boolean) => {
      await act(async () => {
        testPageGeometry.width = narrow ? 500 : 760;
        ControlledResizeObserver.instances.forEach(observer => observer.emit());
        await new Promise(resolve => requestAnimationFrame(resolve));
      });
    },
    restore: () => { testPageGeometry.width = 760; },
  };
}

describe("DOG-008 paginated reader", () => {
  it("renders an oversized paragraph intact with reference links, emphasis and hard breaks", async () => {
    const markdown =
      "# Big\n\nStart **bold**  \nNext [reference][ref] " +
      "word ".repeat(300) +
      "END\n\n[ref]: https://example.com";
    const scenario = await startScenario({
      storage: { "sensiblemd-document": markdown },
    });
    try {
      await scenario.setReadingLayout("Page");
      expect(scenario.visiblePageLabel()).toBe("Page 1 of 1");
      const page = screen.getByRole("article", { name: "Page 1" });
      expect(page).not.toHaveAttribute("tabindex");
      expect(page.querySelectorAll("p")).toHaveLength(1);
      expect(page.querySelector("strong")).toHaveTextContent("bold");
      expect(page.querySelector("br")).not.toBeNull();
      expect(
        within(page).getByRole("link", { name: "reference" }),
      ).toHaveAttribute("href", "https://example.com");
      expect(page.querySelector("p")?.textContent).toContain("END");
      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
      expect(scenario.isDirty()).toBe(false);
      expect(localStorage.getItem("sensiblemd-document")).toBe(markdown);
    } finally {
      scenario.unmount();
    }
  });

  it.each([false, true])(
    "visits all pages forward/backward in Spread (narrow=%s)",
    async (narrow) => {
      const media = mediaWidth(narrow);
      const scenario = await startScenario({
        storage: { "sensiblemd-document": source },
      });
      try {
        await scenario.setReadingLayout("Spread");
        const forward = new Set<number>();
        while (true) {
          for (const number of scenario.visiblePageNumbers()) {
            forward.add(number);
            expect(
              within(
                screen.getByRole("article", { name: `Page ${number}` }),
              ).getByRole("heading", { name: `Section ${number}` }),
            ).toBeInTheDocument();
          }
          if (
            screen
              .getByRole("button", { name: "Next page" })
              .hasAttribute("disabled")
          )
            break;
          await scenario.clickNextPage();
        }
        expect([...forward]).toEqual([1, 2, 3, 4, 5]);
        while (
          !screen
            .getByRole("button", { name: "Previous page" })
            .hasAttribute("disabled")
        )
          await scenario.clickPreviousPage();
        expect(scenario.visiblePageNumbers()).toEqual(narrow ? [1] : [1, 2]);
      } finally {
        scenario.unmount();
        media.restore();
      }
    },
  );

  it("preserves a right-page semantic target across wide/narrow Spread and Page", async () => {
    const media = mediaWidth(false);
    const scenario = await startScenario({
      storage: { "sensiblemd-document": source },
    });
    try {
      await scenario.clickOutlineHeading("Section 2");
      await scenario.setReadingLayout("Spread");
      expect(scenario.visiblePageNumbers()).toEqual([1, 2]);
      await media.resize(true);
      expect(scenario.visiblePageNumbers()).toEqual([2]);
      await scenario.clickNextPage();
      expect(scenario.visiblePageNumbers()).toEqual([3]);
      await scenario.clickPreviousPage();
      await scenario.setReadingLayout("Page");
      expect(scenario.visiblePageNumbers()).toEqual([2]);
      await media.resize(false);
      await scenario.setReadingLayout("Spread");
      expect(scenario.visiblePageNumbers()).toEqual([1, 2]);
      expect(
        document.querySelector('.outline-item[aria-current="location"]'),
      ).toHaveTextContent("Section 2");
    } finally {
      scenario.unmount();
      media.restore();
    }
  });

  it("shows an empty state rather than a blank or unreachable page for definitions only", async () => {
    const scenario = await startScenario({
      storage: { "sensiblemd-document": "[ref]: https://example.com" },
    });
    try {
      await scenario.setReadingLayout("Page");
      expect(scenario.visiblePageNumbers()).toEqual([]);
      expect(scenario.visiblePageLabel()).toBe("Page 0 of 0");
      expect(screen.getByText("No readable content.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
      expect(
        screen.getByRole("button", { name: "Previous page" }),
      ).toBeDisabled();
    } finally {
      scenario.unmount();
    }
  });
  it("keeps the anchored page through three-page spread turns and presentation changes", async () => {
    const media = mediaWidth(false);
    const scenario = await startScenario({
      storage: { "sensiblemd-document": [1, 2, 3].map(section).join("\n\n") },
    });
    try {
      await scenario.clickOutlineHeading("Section 2");
      await scenario.setReadingLayout("Spread");
      expect(scenario.visiblePageNumbers()).toEqual([1, 2]);
      await scenario.setReadingLayout("Page");
      expect(scenario.visiblePageNumbers()).toEqual([2]);
      await scenario.setReadingLayout("Spread");
      await scenario.clickNextPage();
      expect(scenario.visiblePageNumbers()).toEqual([3]);
      expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
      await scenario.clickNextPage();
      await media.resize(true);
      expect(scenario.visiblePageNumbers()).toEqual([3]);
      expect(
        document.querySelector('.outline-item[aria-current="location"]'),
      ).toHaveTextContent("Section 3");
      await media.resize(false);
      await scenario.clickPreviousPage();
      expect(scenario.visiblePageNumbers()).toEqual([1, 2]);
      await scenario.clickNextPage();
      expect(scenario.visiblePageNumbers()).toEqual([3]);
      await scenario.setReadingLayout("Page");
      expect(scenario.visiblePageNumbers()).toEqual([3]);
    } finally {
      scenario.unmount();
      media.restore();
    }
  });

  it("resolves definitions across pages and renders complete footnotes once on the final page", async () => {
    const markdown =
      "# First\n\nA [reference][ref] with a note[^note]. " +
      "word ".repeat(80) +
      "\n\n# Second\n\n" +
      "word ".repeat(80) +
      '\n\n[ref]: https://example.com "Reference title"\n\n[^note]: Footnote **emphasis** and [reference][ref].\n\n    Another footnote paragraph.';
    const scenario = await startScenario({
      storage: { "sensiblemd-document": markdown },
    });
    try {
      await scenario.setReadingLayout("Page");
      expect(scenario.visiblePageLabel()).toBe("Page 1 of 2");
      const first = screen.getByRole("article", { name: "Page 1" });
      expect(
        within(first).getByRole("link", { name: "reference" }),
      ).toHaveAttribute("href", "https://example.com");
      expect(
        within(first).getByRole("link", { name: "reference" }),
      ).toHaveAttribute("title", "Reference title");
      const noteLink = first.querySelector("a[data-footnote-ref]")!;
      expect(noteLink).not.toBeNull();
      const destination = noteLink.getAttribute("href")!.slice(1);
      const referenceId = noteLink.id;
      const labelId = noteLink.getAttribute("aria-describedby")!;
      expect(noteLink).not.toHaveAttribute("target", "_blank");
      expect(first.querySelector("[data-footnotes]")).toBeNull();
      await scenario.clickNextPage();
      const last = screen.getByRole("article", { name: "Page 2" });
      const notes = last.querySelector("[data-footnotes]")!;
      expect(notes).not.toBeNull();
      expect(notes).toHaveTextContent("Another footnote paragraph.");
      expect(notes.querySelector("strong")).toHaveTextContent("emphasis");
      expect(
        within(notes as HTMLElement).getByRole("link", { name: "reference" }),
      ).toHaveAttribute("href", "https://example.com");
      expect(document.getElementById(destination)).toBeInTheDocument();
      expect(document.getElementById(labelId)).toHaveTextContent("Footnotes");
      expect(notes.querySelector("a[data-footnote-backref]")).toHaveAttribute(
        "href",
        `#${referenceId}`,
      );
      await scenario.setReadingLayout("Spread");
      expect(document.querySelectorAll(".book-pages [data-footnotes]")).toHaveLength(1);
      expect(scenario.isDirty()).toBe(false);
      expect(localStorage.getItem("sensiblemd-document")).toBe(markdown);
    } finally {
      scenario.unmount();
    }
  });
});
