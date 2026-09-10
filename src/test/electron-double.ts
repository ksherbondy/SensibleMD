import { identityDigest } from "../core/identity";
import { CallScheduler } from "./scheduler";

type SensibleAPI = NonNullable<Window["sensibleMD"]>;
type ExternalChangeListener = (change: { source: string }) => void;

export interface RecoveryRecord {
  documentId: string;
  version: number;
  source: string;
  savedAt: string;
}
export interface WriteRecord {
  path: string;
  source: string;
}

export interface FakeDesktopOptions {
  scheduler?: CallScheduler;
  platform?: string;
}

function basename(filePath: string) {
  return filePath.split("/").pop() ?? filePath;
}

/**
 * In-memory stand-in for the Electron main process. It reproduces the behaviour of
 * `electron/main.cjs` as it exists today, including its known defects, so that later
 * sprints can assert the behaviour actually changed.
 */
export class FakeDesktop {
  readonly scheduler: CallScheduler;
  readonly platform: string;
  readonly files = new Map<string, string>();
  readonly writes: WriteRecord[] = [];
  readonly recoveryLatest = new Map<string, RecoveryRecord>();
  readonly recoveryPrevious = new Map<string, RecoveryRecord>();
  readonly documentState = new Map<string, SensibleDocumentState>();
  readonly sessions: Array<{
    sessionId: string;
    documentId: string;
    filePath: string;
  }> = [];
  /** Every identifier the renderer has asked main to read or write, in order. */
  readonly stateRequests: Array<{
    operation: "load" | "save";
    documentId: string;
  }> = [];
  readonly recoveryRequests: Array<{
    operation: "load" | "save";
    documentId: string;
  }> = [];
  recents: string[] = [];
  authorizedPath: string | null = null;
  /** Path the next Open dialog returns. `null` models the user cancelling. */
  openDialogResult: string | null = null;
  /** Path the next Save As dialog returns. `null` models the user cancelling. */
  saveAsDialogResult: string | null = null;
  readonly failures = {
    open: false,
    save: false,
    saveAs: false,
    recents: false,
    state: false,
    recovery: false,
  };
  private osListener:
    | ((request: { id: string; name: string }) => void)
    | undefined;
  private osFile: string | null = null;
  emitOsOpen(filePath: string) {
    this.osFile = filePath;
    this.osListener?.({ id: filePath, name: basename(filePath) });
  }
  private readonly externalListeners = new Set<ExternalChangeListener>();
  private previousApi: Window["sensibleMD"];
  private installed = false;
  readonly api: SensibleAPI;

  constructor(options: FakeDesktopOptions = {}) {
    this.scheduler = options.scheduler ?? new CallScheduler();
    this.platform = options.platform ?? "darwin";
    this.api = this.createApi();
  }

  addFile(filePath: string, source: string) {
    this.files.set(filePath, source);
    return this;
  }

  /** Content on disk, as an external editor would see it. */
  diskContents(filePath: string) {
    return this.files.get(filePath) ?? null;
  }

  /**
   * Path-derived identity, mirroring the main process. Symlink resolution is not
   * modelled here; electron/document-identity.test.ts covers that against a real
   * filesystem.
   */
  documentIdFor(filePath: string) {
    return `doc-${identityDigest(filePath)}`;
  }

  /** Simulate an external editor writing the file and the watcher noticing. */
  emitExternalChange(source: string, filePath = this.authorizedPath) {
    if (filePath) this.files.set(filePath, source);
    for (const listener of this.externalListeners) listener({ source });
  }

  install() {
    if (this.installed) throw new Error("FakeDesktop is already installed");
    this.previousApi = window.sensibleMD;
    window.sensibleMD = this.api;
    this.installed = true;
    return this;
  }

  uninstall() {
    if (!this.installed) return;
    window.sensibleMD = this.previousApi;
    this.externalListeners.clear();
    this.osListener = undefined;
    this.installed = false;
  }

  private authorize(filePath: string) {
    this.authorizedPath = filePath;
    this.recents = [
      filePath,
      ...this.recents.filter((item) => item !== filePath),
    ].slice(0, 12);
    const source = this.files.get(filePath);
    if (source === undefined) throw new Error(`ENOENT: ${filePath}`);
    const sessionId = crypto.randomUUID();
    this.sessions.push({
      sessionId,
      documentId: this.documentIdFor(filePath),
      filePath,
    });
    return {
      documentId: this.documentIdFor(filePath),
      sessionId,
      name: basename(filePath),
      source,
    };
  }

  private createApi(): SensibleAPI {
    return {
      platform: this.platform,

      onOsOpenRequest: (listener) => {
        this.osListener = listener;
        return () => {
          this.osListener = undefined;
        };
      },
      openOsDocument: async (id) => {
        if (id !== this.osFile) throw new Error("Unknown OS request");
        return this.authorize(id);
      },
      completeOsOpen: () => {
        this.osFile = null;
      },
      openDocument: () =>
        this.scheduler.schedule("document:open", () => {
          if (this.failures.open)
            throw new Error("The Markdown file could not be opened.");
          if (!this.openDialogResult) return null;
          return this.authorize(this.openDialogResult);
        }),

      listRecentDocuments: () =>
        this.scheduler.schedule("recent:list", () => {
          if (this.failures.recents)
            throw new Error("Recent files are unavailable.");
          return this.recents.map((filePath, index) => ({
            index,
            name: basename(filePath),
          }));
        }),

      // Positional lookup, matching the current main process. Sprint 4 replaces this
      // with an opaque capability identifier.
      openRecentDocument: (index: number) =>
        this.scheduler.schedule("recent:open", () => {
          if (this.failures.open)
            throw new Error("The recent file could not be opened.");
          const filePath = this.recents[index];
          if (!filePath) return null;
          try {
            return this.authorize(filePath);
          } catch {
            return null;
          }
        }),

      saveOpenedDocument: (payload: { source: string }) =>
        this.scheduler.schedule("document:save-opened", () => {
          if (this.failures.save)
            throw new Error("The file could not be saved.");
          const filePath = this.authorizedPath;
          if (!filePath) throw new Error("No authorized document is open");
          this.files.set(filePath, payload.source);
          this.writes.push({ path: filePath, source: payload.source });
          return { name: basename(filePath) };
        }),

      // Note: does not adopt the destination as the authorized document, matching the
      // current main process. Sprint 2 changes that.
      saveDocumentAs: (payload: { name: string; source: string }) =>
        this.scheduler.schedule("document:save-as", () => {
          if (this.failures.saveAs)
            throw new Error("The file could not be saved.");
          if (!this.saveAsDialogResult) return null;
          const filePath = this.saveAsDialogResult;
          this.files.set(filePath, payload.source);
          this.writes.push({ path: filePath, source: payload.source });
          return { name: basename(filePath), path: filePath };
        }),

      onExternalDocumentChange: (listener: ExternalChangeListener) => {
        this.externalListeners.add(listener);
        return () => {
          this.externalListeners.delete(listener);
        };
      },

      saveRecoverySnapshot: (payload: {
        documentId: string;
        version: number;
        source: string;
      }) =>
        this.scheduler.schedule("recovery:save", () => {
          this.recoveryRequests.push({
            operation: "save",
            documentId: payload.documentId,
          });
          if (this.failures.recovery)
            throw new Error("Recovery snapshot could not be saved.");
          const existing = this.recoveryLatest.get(payload.documentId);
          if (existing) this.recoveryPrevious.set(payload.documentId, existing);
          this.recoveryLatest.set(payload.documentId, {
            documentId: payload.documentId,
            version: payload.version,
            source: payload.source,
            savedAt: new Date().toISOString(),
          });
          return { version: payload.version };
        }),

      loadRecoverySnapshot: (documentId: string) =>
        this.scheduler.schedule("recovery:load", () => {
          this.recoveryRequests.push({ operation: "load", documentId });
          if (this.failures.recovery)
            throw new Error("Recovery check is unavailable.");
          return this.recoveryLatest.get(documentId) ?? null;
        }),

      loadDocumentState: (documentId: string) =>
        this.scheduler.schedule("state:load", () => {
          this.stateRequests.push({ operation: "load", documentId });
          if (this.failures.state)
            throw new Error("Desktop settings are unavailable.");
          return this.documentState.get(documentId) ?? null;
        }),

      saveDocumentState: (
        state: Omit<SensibleDocumentState, "schemaVersion">,
      ) =>
        this.scheduler.schedule("state:save", () => {
          this.stateRequests.push({
            operation: "save",
            documentId: state.documentId,
          });
          if (this.failures.state)
            throw new Error("Desktop settings could not be saved.");
          const stored: SensibleDocumentState = { ...state, schemaVersion: 1 };
          this.documentState.set(state.documentId, stored);
          return stored;
        }),
    };
  }
}
