export type CommandScope = "global" | "reader" | "editor" | "search" | "book";

export interface CommandDefinition {
  id: string;
  title: string;
  keywords: string[];
  shortcut?: string;
  scope: CommandScope;
  enabled: boolean;
  disabledReason?: string;
  execute: () => void;
}

export function matchCommands(commands: CommandDefinition[], query: string) {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return commands;
  return commands.filter((command) => {
    const candidate =
      `${command.title} ${command.keywords.join(" ")}`.toLocaleLowerCase();
    return terms.every((term) => candidate.includes(term));
  });
}
