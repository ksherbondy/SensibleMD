# SensibleMD Dogfooding Bugs - Round 2

Date: 2026-09-09

This file records issues found during packaged-app dogfooding after the refactor branch navigation, pagination, file lifecycle, transient UI, and editor-scroll work.

## Priority Summary

### P0

#### DOG2-001 - Exact Reading Position Is Lost Across Mode/Layout Changes

**Observed behavior**

When reading somewhere later in a document in Page or Spread mode, switching to Scroll, Write, or Split moves the user to the top instead of preserving the exact semantic reading position.

**Expected behavior**

A user should be able to:

1. Read at an exact passage.
2. Switch to Write or Split.
3. Arrive at the same passage.
4. Correct an error.
5. Save.
6. Switch back to Scroll, Page, or Spread.
7. Remain at the same semantic location.

This is a core SensibleMD interaction invariant.

**Acceptance criteria**

- Page -> Scroll preserves semantic position.
- Spread -> Scroll preserves semantic position.
- Page/Spread -> Write preserves semantic position.
- Page/Spread -> Split preserves semantic position.
- Write/Split -> Read preserves semantic position.
- Switching among Scroll/Page/Spread does not reset to document start.
- Source edits and save do not unnecessarily destroy the current reading location.

---

#### DOG2-002 - Page/Spread Requires Scrolling After Text Size Changes

**Observed behavior**

Increasing Text Size enlarges Page/Spread content until the user must scroll to read all text.

In Spread mode, each page can require independent scrolling.

**Expected behavior**

The user should never need to scroll an individual page in Page or Spread mode. Page/Spread should behave like discrete pages.

**Acceptance criteria**

- Increasing text size does not create vertically scrollable Page/Spread pages.
- Page content remains fully reachable without per-page scrolling.
- Spread pages remain aligned as a pair.
- Changing typography preserves semantic reading location.
- Pagination adjusts appropriately when typography changes.
- No content is clipped or made unreachable.

**Known architectural note**

The current bounded DOG-008 repair still uses fixed word capacities. Geometry-aware/measured pagination remains unfinished and is likely relevant to this issue.

---

### P1

#### DOG2-003 - Split View Layout Regression

**Observed behavior**

Split mode layout is visually broken:

- Accessibility/authoring diagnostics appear across the bottom.
- The Markdown editor is short and narrow at the top.
- The rendered preview is confined to a small area on the right.
- The preview cannot be scrolled properly.

**Expected behavior**

Split mode should provide a usable side-by-side authoring experience.

**Acceptance criteria**

- Editor and preview occupy useful, intentional proportions.
- Editor has full usable vertical height.
- Preview has full usable vertical height.
- Editor scrolls independently.
- Preview scrolls independently.
- Diagnostics do not collapse the primary editing surfaces.
- Layout remains usable across supported window sizes.

---

#### DOG2-004 - Content Width Setting Has No Visible Effect

**Observed behavior**

Changing Content Width does not visibly change the reading layout.

**Expected behavior**

Changing Content Width should clearly adjust the readable text column/page width where applicable.

**Acceptance criteria**

- Content Width visibly changes Scroll reading width.
- Applicable Page/Spread behavior responds consistently.
- The control does not appear functional while having no effect.
- Changing width preserves semantic reading location.

---

#### DOG2-005 - Line Spacing Setting Does Not Apply Consistently

**Observed behavior**

Line Spacing does not work in Scroll, Write, or Spread modes.

**Expected behavior**

The preference should affect all applicable reading/authoring surfaces consistently.

**Acceptance criteria**

- Line spacing applies in Scroll mode.
- Line spacing applies in Page mode.
- Line spacing applies in Spread mode.
- Line spacing applies in Write mode.
- Line spacing applies in Split editor/preview where appropriate.
- Changing line spacing preserves semantic location.

---

#### DOG2-006 - Text Size Does Not Apply to Write or Split

**Observed behavior**

Text Size works in reading modes but does not affect Write or Split authoring surfaces.

**Expected behavior**

Text size preferences should behave consistently across reading and authoring surfaces unless a deliberate separate editor preference is introduced.

**Acceptance criteria**

- Text Size visibly affects Write mode.
- Text Size visibly affects Split editor.
- Split preview remains consistent with reader typography.
- Changing size does not reset cursor/semantic position.

---

#### DOG2-007 - Keyboard Shortcuts Incomplete

**Observed behavior**

Not all documented keyboard shortcuts work. Cmd/Ctrl+O was specifically observed as non-functional.

**Expected behavior**

Displayed/documented shortcuts should work consistently on supported platforms.

**Acceptance criteria**

- Cmd+O works on macOS.
- Ctrl+O works on Windows/Linux.
- All currently advertised shortcuts are audited.
- Unsupported shortcuts are either implemented or removed from UI/help text.
- Shortcuts do not fire while inappropriate text-entry targets own the command.

---

#### DOG2-008 - Home Screen Does Not Match SensibleMD UI

**Observed behavior**

The Home/No Document screen works functionally but appears as an unstyled/basic page rather than part of the SensibleMD application.

**Expected behavior**

Home should reuse the established SensibleMD shell and visual language.

**Desired layout**

- Keep normal SensibleMD top bar/application chrome.
- Use the outline/sidebar area for Recent Files.
- Main area should contain a calm empty state.
- Suggested main message:
  - Thank the user for using SensibleMD.
  - State that no document is currently open.
  - Ask them to open a Markdown file or choose a recent file.
- Provide a clear Open Markdown File action.
- Hide or disable document-only controls when no document is open.

**Acceptance criteria**

- Home visually matches the reader application.
- Recent files appear in the sidebar using existing list styles.
- Main empty state uses existing typography, spacing, colors, and controls.
- No raw browser/default-looking buttons.
- No lifecycle/file-open behavior changes as part of the visual repair.

---

#### DOG2-009 - Search Results Do Not Collapse After Navigation

**Observed behavior**

Search works and a result can be selected, but after navigating to the result the search results remain open. The user currently has to delete the query to make the search UI disappear.

**Expected behavior**

Selecting a search result should dismiss/collapse the transient search results while preserving the query for easy reopening.

**Acceptance criteria**

- Clicking a result navigates to the target.
- Search results collapse after navigation.
- Query text is preserved.
- Reopening search restores the prior query/results where appropriate.
- Escape still dismisses search.
- Search navigation does not change document mode unexpectedly.

---

### P2

#### DOG2-010 - Scroll Reading Needs Left-Side Padding

**Observed behavior**

In Scroll mode, document text sits directly against the outline panel or against the app/window edge when the outline is closed.

**Expected behavior**

The reading surface should maintain comfortable horizontal breathing room regardless of outline state.

**Acceptance criteria**

- Scroll mode has consistent left/right content padding.
- Closing the outline does not place text against the window edge.
- Opening the outline does not place text directly against the divider.
- Padding remains reasonable across window sizes and Content Width settings.

---

## Manual Verification Still Needed

The following areas should receive additional packaged-app testing as work continues:

- Exact semantic continuity across all Read/Write/Split/layout transitions.
- Page/Spread behavior at multiple font sizes and window sizes.
- Split editor and preview scrolling.
- Trackpad, mouse-wheel, PageUp/PageDown, Home/End, and arrow-key behavior.
- Complete shortcut audit.
- Search dismissal and focus behavior.
- Home screen behavior and accessibility.
- Windows/Linux native integration when builds are available.

## Notes

- This list is intentionally based on immediately observed packaged-app behavior and is not exhaustive.
- Previously accepted N01-N05 and bounded DOG-008 work should remain regression-protected.
- Fixes should remain bounded and should not reopen accepted architecture unless a regression test proves it necessary.
