import { createRequire } from "node:module";
import {
  mkdtemp,
  mkdir,
  rm,
  symlink,
  writeFile,
  rename,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { asDocumentId, browserDocumentId } from "../core/identity";
import { createCollection } from "../core/document-collection";
import { NavigationHistory } from "../core/navigation-history";
import { FakeDesktop } from "./electron-double";
import { startScenario } from "./scenario";
import { resolveInternalMarkdownLink } from "../core/internal-links";

const require = createRequire(import.meta.url);
const { deriveDocumentId } =
  require("../../electron/document-identity.cjs") as {
    deriveDocumentId: (filePath: string) => Promise<string>;
  };
const { archiveStateFromPreviousIdentityScheme } =
  require("../../electron/legacy-state.cjs") as {
    archiveStateFromPreviousIdentityScheme: (
      userDataPath: string,
    ) => Promise<{ archived: string[]; archiveRoot?: string }>;
  };

async function temporaryTree() {
  const root = await mkdtemp(path.join(tmpdir(), "sensiblemd-invariant-"));
  return { root, cleanup: () => rm(root, { recursive: true, force: true }) };
}

/**
 * Behavioural contract for the `v0.1-reference` build.
 *
 * Each sprint in docs/remediation-plan.md converts its own stubs into real tests.
 * These are deliberately written as statements about the product, not about the
 * current implementation, so they survive the Sprint 13 architecture refactor.
 */

describe("invariants: identity (Sprint 1)", () => {
  it("two same-named files in different directories never share persisted state", async () => {
    const desktop = new FakeDesktop()
      .addFile("/Users/reader/project-a/notes.md", "# Project A")
      .addFile("/Users/reader/project-b/notes.md", "# Project B");
    const scenario = await startScenario({ desktop });

    desktop.openDialogResult = "/Users/reader/project-a/notes.md";
    await scenario.openDocument();
    await scenario.settle();
    await desktop.api.saveRecoverySnapshot({
      documentId: desktop.documentIdFor("/Users/reader/project-a/notes.md"),
      version: 1,
      source: "# Project A unsaved",
    });

    desktop.openDialogResult = "/Users/reader/project-b/notes.md";
    await scenario.openDocument();
    await scenario.settle();

    const requestedForB = desktop.recoveryRequests
      .filter((request) => request.operation === "load")
      .at(-1);
    expect(requestedForB?.documentId).toBe(
      desktop.documentIdFor("/Users/reader/project-b/notes.md"),
    );
    expect(
      await desktop.api.loadRecoverySnapshot(requestedForB!.documentId),
    ).toBeNull();
    scenario.unmount();
  });

  it("a stable DocumentId survives an application restart for an unchanged file", async () => {
    const { root, cleanup } = await temporaryTree();
    const filePath = path.join(root, "notes.md");
    await writeFile(filePath, "# Notes");

    expect(await deriveDocumentId(filePath)).toBe(
      await deriveDocumentId(filePath),
    );

    const browserFile = {
      name: "notes.md",
      size: 7,
      lastModified: 1_700_000_000_000,
    };
    expect(browserDocumentId(browserFile)).toBe(
      browserDocumentId({ ...browserFile }),
    );
    await cleanup();
  });

  it("renaming or moving a file has documented, tested identity behaviour", async () => {
    const { root, cleanup } = await temporaryTree();
    await mkdir(path.join(root, "elsewhere"), { recursive: true });
    const before = path.join(root, "notes.md");
    await writeFile(before, "# Notes");
    const original = await deriveDocumentId(before);

    const renamed = path.join(root, "renamed.md");
    await rename(before, renamed);
    expect(await deriveDocumentId(renamed)).not.toBe(original);

    const moved = path.join(root, "elsewhere", "renamed.md");
    await rename(renamed, moved);
    expect(await deriveDocumentId(moved)).not.toBe(
      await deriveDocumentId(renamed),
    );
    await cleanup();
  });

  it("a symlinked file and its target have documented, tested identity behaviour", async () => {
    const { root, cleanup } = await temporaryTree();
    const target = path.join(root, "notes.md");
    const linkPath = path.join(root, "current.md");
    await writeFile(target, "# Notes");
    await symlink(target, linkPath);

    expect(await deriveDocumentId(linkPath)).toBe(
      await deriveDocumentId(target),
    );
    await cleanup();
  });

  it("inserting a document into a collection does not change other documents' identities", () => {
    const intro = {
      id: asDocumentId("doc-intro"),
      name: "Intro.md",
      source: "# Intro",
    };
    const guide = {
      id: asDocumentId("doc-guide"),
      name: "Guide.md",
      source: "# Guide",
    };
    const before = createCollection([intro, guide]).map(
      (document) => document.id,
    );
    const after = createCollection([
      {
        id: asDocumentId("doc-preface"),
        name: "Preface.md",
        source: "# Preface",
      },
      intro,
      guide,
    ]).map((document) => document.id);

    expect(after.slice(1)).toEqual(before);
  });

  it("navigation history distinguishes the same heading id in two different documents", () => {
    const history = new NavigationHistory();
    history.visit({
      documentId: asDocumentId("doc-one"),
      headingId: "heading-0-0",
      reason: "manual",
    });
    history.visit({
      documentId: asDocumentId("doc-two"),
      headingId: "heading-0-0",
      reason: "manual",
    });

    expect(history.canGoBack()).toBe(true);
  });

  it("legacy state written under a previous identity scheme is preserved, not deleted", async () => {
    const { root, cleanup } = await temporaryTree();
    await mkdir(path.join(root, "documents"), { recursive: true });
    await writeFile(
      path.join(root, "documents", "notes-md-0.json"),
      '{"documentId":"notes-md-0"}',
    );

    const result = await archiveStateFromPreviousIdentityScheme(root);

    expect(result.archived).toContain("documents");
    expect(result.archiveRoot).toBeDefined();
    await cleanup();
  });
});

describe("invariants: save and dirty state (Sprint 2)", () => {
  it.todo(
    "a completed save never marks edits made after that save began as persisted",
  );
  it.todo(
    "an edit to one chapter stays dirty after switching to another chapter",
  );
  it.todo(
    "replacing the collection while any chapter is dirty requires an explicit decision",
  );
  it.todo(
    "closing the application with unsaved work requires an explicit decision",
  );
  it.todo(
    "an unresolved disk conflict cannot be overwritten by an ordinary save",
  );
  it.todo("a failed save leaves the document dirty and reports the failure");
  it.todo(
    "Save As adopts the destination so the next save writes to the same file",
  );
  it.todo("the header never reports saved while unsaved edits exist");
});

describe("invariants: recovery and persistence (Sprint 3)", () => {
  it.todo(
    "a document session never applies another session's recovery snapshot",
  );
  it.todo(
    "a document session never applies another session's external-change event",
  );
  it.todo("a late-resolving state load for a previous document is discarded");
  it.todo(
    "reader state is never persisted under a newly active document before its own state loads",
  );
  it.todo("continuous editing still produces periodic recovery snapshots");
  it.todo("a recovery snapshot is cleared after a successful save");
  it.todo("a discarded recovery snapshot does not reappear on the next launch");
  it.todo("out-of-order metadata writes never leave older state on disk");
  it.todo("a failed open never changes the currently authorized document");
  it.todo(
    "corrupt or unknown persisted state never prevents a document from opening",
  );
});

describe("invariants: Electron capabilities (Sprint 4)", () => {
  it.todo("privileged IPC rejects a sender that is not the trusted renderer");
  it.todo("the renderer cannot navigate away from the application origin");
  it.todo("a packaged build has no code path that loads a development server");
  it.todo(
    "recovery and state cannot be read for an identifier the renderer was not granted",
  );
  it.todo("filesystem paths are never returned across the preload boundary");
  it.todo("oversized IPC payloads are rejected rather than silently clamped");
  it.todo(
    "a watcher error degrades to a warning instead of terminating the process",
  );
  it.todo("watcher registrations are released when the window is destroyed");
  it.todo(
    "a content security policy is present in both the document and the response headers",
  );
  it.todo("unused permissions are denied by default");
});

describe("invariants: rendering identity (Sprint 5)", () => {
  it.todo("every semantic heading maps to exactly one rendered DOM heading");
  it.todo("every rendered navigable node maps to exactly one semantic node");
  it.todo("headings at every level from one to six are navigable");
  it.todo("two headings with identical text resolve to distinct targets");
  it.todo("a heading containing inline formatting still resolves");
});

describe("invariants: pagination and reading position (Sprint 6)", () => {
  it.todo("pagination never rewrites or reparses partial Markdown source");
  it.todo("every page fragment corresponds to a whole semantic block");
  it.todo(
    "an oversized block remains fully reachable rather than being clipped",
  );
  it.todo("no page-turn operation skips a page at any viewport width");
  it.todo("changing reading layout never changes document meaning");
  it.todo("a newly opened document never renders a blank page");
  it.todo(
    "scrolling without navigating still updates the remembered reading position",
  );
  it.todo("Reduced Motion never causes programmatic smooth movement");
});

describe("invariants: runtime behaviour (Sprint 7)", () => {
  it.todo("a single keystroke parses the active document at most once");
  it.todo("editing one chapter does not reparse the rest of the collection");
  it.todo("document contents are not written to browser storage");
  it.todo(
    "corrupt browser storage never prevents the application from starting",
  );
  it.todo(
    "opening an oversized document degrades deliberately rather than freezing",
  );
});

describe("invariants: Markdown interpretation (Sprint 8)", () => {
  it.todo(
    "the parser and the accessibility analyzer agree on what a heading is",
  );
  it.todo("no diagnostic is raised for content inside a fenced code block");
  it.todo(
    "reference links, autolinks and parenthesised URLs are modelled as links",
  );
  it.todo("headings in non-Latin scripts are not reported as symbol-only");
  it.todo("duplicate heading slugs are disambiguated deterministically");
});

describe("invariants: resources and network (Sprint 9)", () => {
  it.todo("opening a local document makes no network request");
  it.todo("a relative image inside the document directory renders");
  it.todo("a resource request cannot escape the authorized document root");
  it.todo(
    "encoded, double-encoded and symlinked traversal attempts are rejected",
  );
  it.todo(
    "a sibling directory sharing a name prefix with the root is not treated as inside it",
  );
  it.todo("remote images are blocked until explicitly permitted");
  it.todo(
    "permitting remote images does not weaken the renderer content security policy",
  );
});

describe("invariants: accessibility and interaction (Sprint 10)", () => {
  it.todo("the recovery decision is presented as a focus-managed modal dialog");
  it.todo("closing a popover returns focus to the control that opened it");
  it.todo("mode and layout controls expose their selected state non-visually");
  it.todo("the command palette is fully operable from the keyboard");
  it.todo("diagnostic explanation and remediation are presented to the user");
  it.todo("the selected search result is always visible in the result list");
  it.todo(
    "accessibility findings are presented as assistance, not certification",
  );
});

describe("invariants: hostile input (Sprint 12)", () => {
  it.todo("script elements in Markdown never execute");
  it.todo("event handler attributes do not survive rendering");
  it("javascript: and file: links are inert", () => {
    const collection = createCollection([
      {
        id: asDocumentId("test-document"),
        name: "test.md",
        source: "# Test",
      },
    ]);

    const currentDocumentId = collection[0].id;

    expect(
      resolveInternalMarkdownLink(
        collection,
        currentDocumentId,
        "javascript:alert(1)",
      ),
    ).toBeNull();

    expect(
      resolveInternalMarkdownLink(
        collection,
        currentDocumentId,
        "file:///etc/passwd",
      ),
    ).toBeNull();
    expect(
      resolveInternalMarkdownLink(
        collection,
        currentDocumentId,
        "data:text/html,<script>alert(1)</script>",
      ),
    ).toBeNull();

    expect(
      resolveInternalMarkdownLink(
        collection,
        currentDocumentId,
        "ftp://example.com",
      ),
    ).toBeNull();

    expect(
      resolveInternalMarkdownLink(
        collection,
        currentDocumentId,
        "mailto:test@example.com",
      ),
    ).toBeNull();
  });
  it.todo("embedded frames and objects are removed");
  it.todo("hostile SVG content is neutralised");
  it.todo("no Markdown input can cause privileged renderer navigation");
});
