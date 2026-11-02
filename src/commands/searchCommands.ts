import type { CommandDefinition } from './CommandRegistry.js';

function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function tokenScore(text: string, token: string) {
  const index = text.indexOf(token);
  if (index >= 0) return index === 0 ? 0 : 10 + index;
  let position = 0;
  let gaps = 0;
  for (const character of token) {
    const next = text.indexOf(character, position);
    if (next < 0) return Infinity;
    gaps += next - position;
    position = next + 1;
  }
  return 100 + gaps;
}

export function searchCommands(commands: readonly CommandDefinition[], query: string, recent: readonly string[]) {
  const tokens = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return commands
    .map((command, order) => ({
      command,
      order,
      score: tokens.reduce((sum, token) => sum + Math.min(tokenScore(normalize(command.title), token), tokenScore(normalize(command.id), token) + 30), 0),
      recent: recent.includes(command.id) ? recent.indexOf(command.id) : Infinity,
    }))
    .filter((result) => Number.isFinite(result.score))
    .sort((first, second) => first.score - second.score || (tokens.length ? 0 : first.recent - second.recent) || first.order - second.order)
    .map((result) => result.command);
}
