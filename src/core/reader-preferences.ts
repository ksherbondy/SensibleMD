export interface ReaderPreferences { fontScale: number; lineHeight: number; contentWidth: number; reducedMotion: boolean }

export const defaultReaderPreferences: ReaderPreferences = { fontScale: 100, lineHeight: 1.72, contentWidth: 760, reducedMotion: false }

export function normalizeReaderPreferences(value: Partial<ReaderPreferences>): ReaderPreferences {
  return {
    fontScale: Math.max(85, Math.min(150, value.fontScale ?? defaultReaderPreferences.fontScale)),
    lineHeight: Math.max(1.3, Math.min(2.4, value.lineHeight ?? defaultReaderPreferences.lineHeight)),
    contentWidth: Math.max(480, Math.min(1040, value.contentWidth ?? defaultReaderPreferences.contentWidth)),
    reducedMotion: Boolean(value.reducedMotion),
  }
}