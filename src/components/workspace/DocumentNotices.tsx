interface DocumentNoticesProps {
  hasExternalChange: boolean;
  recoveryNotice: { savedAt: string } | null;
  onKeepEditing: () => void;
  onReload: () => void;
  onDiscard: () => void;
  onRestore: () => void;
}

export function DocumentNotices({
  hasExternalChange,
  recoveryNotice,
  onKeepEditing,
  onReload,
  onDiscard,
  onRestore,
}: DocumentNoticesProps) {
  return (
    <>
      {hasExternalChange && (
        <section className="external-change-notice" role="alert">
          <strong>This file changed outside SensibleMD.</strong>
          <p>
            Your unsaved edits are still intact. Choose which version to
            keep.
          </p>
          <div>
            <button type="button" onClick={onKeepEditing}>
              Keep editing
            </button>
            <button type="button" onClick={onReload}>
              Reload from disk
            </button>
          </div>
        </section>
      )}
      {recoveryNotice !== null && (
        <section className="recovery-notice" role="alert">
          <strong>Unsaved changes are available.</strong>
          <p>
            A recovery snapshot from{" "}
            {new Date(recoveryNotice.savedAt).toLocaleString()} differs
            from this document.
          </p>
          <div>
            <button type="button" onClick={onDiscard}>
              Discard recovery
            </button>
            <button type="button" onClick={onRestore}>
              Restore changes
            </button>
          </div>
        </section>
      )}
    </>
  );
}
