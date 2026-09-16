import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SearchScope } from "../../core/collection-search";

interface WorkspaceSearchProps {
  searchScope: SearchScope;
  searchResults: readonly {
    documentId: string;
    documentName: string;
    nodeId: string;
    section: string;
    text: string;
    line: number;
  }[];
  searchIndex: number;
  matches: number;
  hasOrigin: boolean;
  onSelectScope: (scope: "document" | "collection") => void;
  onPrevious: () => void;
  onNext: () => void;
  onReturnToOrigin: () => void;
  onSelectResult: (index: number) => void;
}

export function WorkspaceSearch({
  searchScope,
  searchResults,
  searchIndex,
  matches,
  hasOrigin,
  onSelectScope,
  onPrevious,
  onNext,
  onReturnToOrigin,
  onSelectResult,
}: WorkspaceSearchProps) {
  return (
    <section className="search-results" aria-label="Search results">
      <header>
        <span>
          {searchIndex >= 0
            ? `${searchIndex + 1} of ${searchResults.length} results`
            : `${matches} matches in ${searchResults.length} document blocks`}
        </span>
        <div role="group" aria-label="Search scope">
          <button
            type="button"
            className={searchScope === "document" ? "selected" : ""}
            onClick={() => onSelectScope("document")}
          >
            This file
          </button>
          <button
            type="button"
            className={searchScope === "collection" ? "selected" : ""}
            onClick={() => onSelectScope("collection")}
          >
            All chapters
          </button>
        </div>
      </header>
      <div className="search-session-controls">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!searchResults.length}
          aria-label="Previous search result"
        >
          <ChevronLeft size={15} />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={!searchResults.length}
          aria-label="Next search result"
        >
          <ChevronRight size={15} />
        </button>
        <button
          type="button"
          onClick={onReturnToOrigin}
          disabled={!hasOrigin}
        >
          Return to origin
        </button>
      </div>
      {searchResults.slice(0, 8).map((result, index) => (
        <button
          type="button"
          key={`${result.documentId}-${result.nodeId}`}
          className={searchIndex === index ? "selected-result" : ""}
          onClick={() => onSelectResult(index)}
        >
          <strong>
            {result.documentName} · {result.section}
          </strong>
          <span>{result.text || result.section}</span>
          <small>Line {result.line}</small>
        </button>
      ))}
    </section>
  );
}
