import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { startScenario } from "./scenario";

describe("DOG-007 transient dismissal", () => {
  it("dismisses search with Escape and reopens the same query and scope", async () => {
    const s = await startScenario();
    try {
      const input = screen.getByRole("textbox", { name: "Search document" });
      await s.user.type(input, "reader");
      await s.user.click(screen.getByRole("button", { name: "All chapters" }));
      const results = screen.getByRole("region", {
        name: "Search results",
      }).textContent;
      await s.user.keyboard("{Escape}");
      expect(
        screen.queryByRole("region", { name: "Search results" }),
      ).not.toBeInTheDocument();
      expect(input).toHaveValue("reader");
      await s.user.keyboard("{Control>}f{/Control}");
      expect(
        screen.getByRole("region", { name: "Search results" }).textContent,
      ).toBe(results);
      expect(screen.getByRole("button", { name: "All chapters" })).toHaveClass(
        "selected",
      );
      await s.user.keyboard("{Escape}");
      await s.user.click(input);
      expect(
        screen.getByRole("region", { name: "Search results" }),
      ).toBeInTheDocument();
    } finally {
      s.unmount();
    }
  });
  it("dismisses settings by Escape, click-away and trigger while retaining preferences", async () => {
    const s = await startScenario();
    try {
      const trigger = screen.getByRole("button", { name: "Reading settings" });
      await s.user.click(trigger);
      const panel = screen.getByRole("region", { name: "Reading settings" });
      const slider = within(panel).getAllByRole("slider")[0];
      fireEvent.change(slider, { target: { value: "125" } });
      await s.user.click(slider);
      expect(panel).toBeInTheDocument();
      await s.user.keyboard("{Escape}");
      expect(panel).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      await s.user.click(trigger);
      expect(
        within(
          screen.getByRole("region", { name: "Reading settings" }),
        ).getAllByRole("slider")[0],
      ).toHaveValue("125");
      await s.user.click(
        screen.getByRole("textbox", { name: "Search document" }),
      );
      expect(
        screen.queryByRole("region", { name: "Reading settings" }),
      ).not.toBeInTheDocument();
      await s.user.click(trigger);
      await s.user.click(trigger);
      expect(
        screen.queryByRole("region", { name: "Reading settings" }),
      ).not.toBeInTheDocument();
    } finally {
      s.unmount();
    }
  });
  it("dismisses palette by Escape and backdrop while retaining its query", async () => {
    const s = await startScenario();
    try {
      const trigger = screen.getByRole("button", {
        name: "Show command palette",
      });
      await s.user.click(trigger);
      const input = await screen.findByRole("textbox", {
        name: "Search commands",
      });
      await s.user.type(input, "settings");
      await s.user.keyboard("{Escape}");
      expect(
        screen.queryByRole("dialog", { name: "Command palette" }),
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
      await s.user.click(trigger);
      expect(
        await screen.findByRole("textbox", { name: "Search commands" }),
      ).toHaveValue("settings");
      await s.user.click(
        screen.getByRole("textbox", { name: "Search commands" }),
      );
      const dialog = screen.getByRole("dialog", { name: "Command palette" });
      await s.user.click(dialog.parentElement!);
      expect(dialog).not.toBeInTheDocument();
      await s.user.click(trigger);
      expect(
        await screen.findByRole("textbox", { name: "Search commands" }),
      ).toHaveValue("settings");
      await s.user.click(
        screen.getByRole("button", { name: /Show Reading Settings/ }),
      );
      expect(
        screen.queryByRole("dialog", { name: "Command palette" }),
      ).not.toBeInTheDocument();
      expect(
        screen.getByRole("region", { name: "Reading settings" }),
      ).toBeInTheDocument();
    } finally {
      s.unmount();
    }
  });
});
