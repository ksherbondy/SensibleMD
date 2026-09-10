import type { DocumentId } from "./identity";

export type NavigationReason =
  | "search"
  | "outline"
  | "bookmark"
  | "link"
  | "manual"
  | "history";
export interface NavigationEntry {
  documentId?: DocumentId;
  headingId: string;
  reason: NavigationReason;
}

export class NavigationHistory {
  private entries: NavigationEntry[] = [];
  private index = -1;

  visit(entry: NavigationEntry) {
    const current = this.entries[this.index];
    // Heading ids are only unique within a document, so both parts must match.
    if (
      current?.headingId === entry.headingId &&
      current.documentId === entry.documentId
    )
      return;
    this.entries = [...this.entries.slice(0, this.index + 1), entry];
    this.index = this.entries.length - 1;
  }

  back() {
    if (this.index <= 0) return null;
    this.index -= 1;
    return this.entries[this.index];
  }

  forward() {
    if (this.index < 0 || this.index >= this.entries.length - 1) return null;
    this.index += 1;
    return this.entries[this.index];
  }

  canGoBack() {
    return this.index > 0;
  }
  canGoForward() {
    return this.index >= 0 && this.index < this.entries.length - 1;
  }
}
