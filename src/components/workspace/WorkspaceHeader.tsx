import type { ChangeEventHandler, RefObject } from "react";
import {
  BookOpen,
  Check,
  Command,
  Download,
  FileText,
  FolderOpen,
  Save,
  Settings2,
  X,
} from "lucide-react";

interface WorkspaceHeaderProps {
  documentName: string;
  isDirty: boolean;
  closeDisabled: boolean;
  saveEnabled: boolean;
  settingsOpen: boolean;
  fileInput: RefObject<HTMLInputElement | null>;
  collectionInput: RefObject<HTMLInputElement | null>;
  settingsTrigger: RefObject<HTMLButtonElement | null>;
  onOpenDocument: () => void;
  onCloseDocument: () => void;
  onSave: () => void;
  onDownloadCopy: () => void;
  onToggleSettings: () => void;
  onShowCommandPalette: () => void;
  onFileChange: ChangeEventHandler<HTMLInputElement>;
  onCollectionChange: ChangeEventHandler<HTMLInputElement>;
}

export function WorkspaceHeader({
  documentName,
  isDirty,
  closeDisabled,
  saveEnabled,
  settingsOpen,
  fileInput,
  collectionInput,
  settingsTrigger,
  onOpenDocument,
  onCloseDocument,
  onSave,
  onDownloadCopy,
  onToggleSettings,
  onShowCommandPalette,
  onFileChange,
  onCollectionChange,
}: WorkspaceHeaderProps) {
  return (
    <>
      <header className="topbar">
        <div className="brand" aria-label="SensibleMD">
          <span className="brand-mark">
            <BookOpen size={20} />
          </span>
          <span>SensibleMD</span>
        </div>
        <div className="document-title">
          <FileText size={16} />
          <span>{documentName}</span>
          <span className="saved">
            {!isDirty && <Check size={14} />}
            {isDirty ? "Unsaved changes" : "No unsaved changes"}
          </span>
        </div>
        <div className="topbar-actions">
          <button
            className="icon-button"
            type="button"
            onClick={onOpenDocument}
            aria-label="Open Markdown file"
            title="Open Markdown file"
          >
            <FolderOpen size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onCloseDocument}
            disabled={closeDisabled}
            aria-label="Close document"
            title="Close document"
          >
            <X size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onSave}
            disabled={!saveEnabled}
            aria-label="Save"
            title="Save"
          >
            <Save size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onDownloadCopy}
            aria-label="Download copy"
            title="Download copy"
          >
            <Download size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            ref={settingsTrigger}
            onClick={onToggleSettings}
            aria-label="Reading settings"
            aria-expanded={settingsOpen}
            title="Reading settings"
          >
            <Settings2 size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={onShowCommandPalette}
            aria-label="Show command palette"
            title="Show command palette (Cmd/Ctrl+K)"
          >
            <Command size={18} />
          </button>
        </div>
        <input
          ref={fileInput}
          className="visually-hidden"
          type="file"
          accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
          onChange={onFileChange}
        />
      </header>
      <input
        ref={collectionInput}
        className="visually-hidden"
        type="file"
        multiple
        accept=".md,.markdown,.mdown,.txt,text/markdown,text/plain"
        onChange={onCollectionChange}
      />
    </>
  );
}
