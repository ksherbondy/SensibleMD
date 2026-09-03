export type NavigationReason = 'search' | 'outline' | 'bookmark' | 'link' | 'manual' | 'history'
export interface NavigationEntry { documentId?: string; headingId: string; reason: NavigationReason }

export class NavigationHistory {
  private entries: NavigationEntry[] = []
  private index = -1

  visit(entry: NavigationEntry) {
    if (this.entries[this.index]?.headingId === entry.headingId) return
    this.entries = [...this.entries.slice(0, this.index + 1), entry]
    this.index = this.entries.length - 1
  }

  back() {
    if (this.index <= 0) return null
    this.index -= 1
    return this.entries[this.index]
  }

  forward() {
    if (this.index < 0 || this.index >= this.entries.length - 1) return null
    this.index += 1
    return this.entries[this.index]
  }

  canGoBack() { return this.index > 0 }
  canGoForward() { return this.index >= 0 && this.index < this.entries.length - 1 }
}