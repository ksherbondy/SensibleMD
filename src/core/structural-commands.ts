import type { SourceEdit } from "./document-buffer";

export function changeHeadingLevel(
  source: string,
  lineNumber: number,
  direction: "promote" | "demote",
): SourceEdit | null {
  const lines = source.split("\n");
  const lineIndex = lineNumber - 1;
  const line = lines[lineIndex];
  const match = /^(#{1,6})(\s+.+)$/.exec(line ?? "");
  if (!match) return null;
  const currentLevel = match[1].length;
  const nextLevel =
    direction === "promote" ? currentLevel - 1 : currentLevel + 1;
  if (nextLevel < 1 || nextLevel > 6) return null;
  const offset = lines
    .slice(0, lineIndex)
    .reduce((total, current) => total + current.length + 1, 0);
  return {
    from: offset,
    to: offset + currentLevel,
    insert: "#".repeat(nextLevel),
  };
}
