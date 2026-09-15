import { X } from "lucide-react";

interface WorkspaceOutlineProps {
  collection: readonly { id: string; name: string }[];
  headings: readonly { id: string; level: number; text: string }[];
  activeDocumentId: string;
  activeHeading: string;
  outlineOpen: boolean;
  wordCount: number;
  onClose: () => void;
  onSelectDocument: (documentId: string) => void;
  onSelectHeading: (headingId: string) => void;
}

export function WorkspaceOutline({
  collection,
  headings,
  activeDocumentId,
  activeHeading,
  outlineOpen,
  wordCount,
  onClose,
  onSelectDocument,
  onSelectHeading,
}: WorkspaceOutlineProps) {
  return (
    <aside
      className={`outline-panel ${outlineOpen ? "" : "collapsed"}`}
      aria-label="Document outline"
    >
      <div className="panel-heading">
        <span>
          {collection.length > 1
            ? `Chapters · ${collection.length}`
            : "Outline"}
        </span>
        <button
          type="button"
          className="icon-button small"
          onClick={onClose}
          aria-label="Close outline"
        >
          <X size={16} />
        </button>
      </div>
      {collection.length > 1 && (
        <nav className="chapter-list" aria-label="Collection chapters">
          {collection.map((document, index) => (
            <button
              type="button"
              key={document.id}
              onClick={() => onSelectDocument(document.id)}
              className={document.id === activeDocumentId ? "active" : ""}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              {document.name}
            </button>
          ))}
        </nav>
      )}
      <nav>
        {headings.length ? (
          headings.map((heading) => (
            <button
              type="button"
              key={heading.id}
              onClick={() => onSelectHeading(heading.id)}
              aria-current={
                activeHeading === heading.id ? "location" : undefined
              }
              className={`outline-item level-${heading.level} ${activeHeading === heading.id ? "active" : ""}`}
            >
              {heading.text}
            </button>
          ))
        ) : (
          <p className="empty-state">Headings will appear here.</p>
        )}
      </nav>
      <div className="outline-footer">
        <span>{wordCount.toLocaleString()} words</span>
        <span>{headings.length} sections</span>
      </div>
    </aside>
  );
}
