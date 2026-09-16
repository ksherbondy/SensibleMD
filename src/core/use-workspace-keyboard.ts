import { useEffect, type RefObject } from "react";

interface WorkspaceKeyboardInputs {
  view: "read" | "write" | "split";
  readingMode: "continuous" | "single" | "spread";
  activeHeading: string;
  headings: readonly { id: string }[];
  keyboardSave: RefObject<(() => void) | null>;
  toggleView: () => void;
  openPalette: () => void;
  openSearch: () => void;
  navigateHeading: (direction: "next" | "previous") => void;
  turnPage: (direction: "next" | "previous") => void;
}

// Current renderer adapter only; native accelerators remain a separate integration.
export function useWorkspaceKeyboard({
  view,
  readingMode,
  activeHeading,
  headings,
  keyboardSave,
  toggleView,
  openPalette,
  openSearch,
  navigateHeading,
  turnPage,
}: WorkspaceKeyboardInputs): void {
  // Preserve the original dependency identities and registration cadence. App
  // currently rebuilds headings each render; do not add callback dependencies here.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === "s" && event.metaKey !== event.ctrlKey &&
        !event.shiftKey && !event.altKey && !event.isComposing && !event.defaultPrevented
      ) {
        event.preventDefault();
        if (!event.repeat) keyboardSave.current?.();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "e") {
        event.preventDefault();
        toggleView();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openPalette();
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        openSearch();
        document.getElementById("document-search")?.focus();
      }
      if (view === "read" && event.altKey && event.key === "ArrowDown") {
        event.preventDefault();
        navigateHeading("next");
      }
      if (view === "read" && event.altKey && event.key === "ArrowUp") {
        event.preventDefault();
        navigateHeading("previous");
      }
      const target = event.target;
      const editingTarget =
        target instanceof Element &&
        target.closest('input, textarea, [contenteditable="true"]');
      if (view === "read" && readingMode !== "continuous" && !editingTarget) {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          turnPage("next");
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          turnPage("previous");
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeHeading, headings, readingMode, view]);
}
