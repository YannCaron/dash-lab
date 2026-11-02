import { describe, expect, it } from 'vitest';
import { searchCommands } from './searchCommands.js';
import type { CommandDefinition } from './CommandRegistry.js';

const commands: readonly CommandDefinition[] = [
  { id: 'layout.restore', title: 'Restore saved layout', execute: () => {} },
  { id: 'layout.save', title: 'Save layout', execute: () => {} },
  { id: 'workspace.focus', title: 'Focus workspace', execute: () => {} },
  { id: 'demo.greet', title: 'Écrire un message', execute: () => {} },
];

describe('command search', () => {
  it('ranks direct title matches above identifier matches and supports multiple words', () => {
    expect(searchCommands(commands, 'save', []).map((command) => command.id)).toEqual(['layout.save', 'layout.restore']);
    expect(searchCommands(commands, 'layout save', []).map((command) => command.id)).toEqual(['layout.save', 'layout.restore']);
  });
  it('supports case folding, accents, identifier search and fuzzy abbreviations', () => {
    expect(searchCommands(commands, 'ECRIRE', [])[0]?.id).toBe('demo.greet');
    expect(searchCommands(commands, 'workspace.focus', [])[0]?.id).toBe('workspace.focus');
    expect(searchCommands(commands, 'rstsvd', [])[0]?.id).toBe('layout.restore');
    expect(searchCommands(commands, 'not-a-command', [])).toEqual([]);
  });
  it('shows recent existing commands first only for an empty query, preserving registration order otherwise', () => {
    expect(searchCommands(commands, ' ', ['removed', 'workspace.focus', 'layout.save']).map((command) => command.id)).toEqual([
      'workspace.focus',
      'layout.save',
      'layout.restore',
      'demo.greet',
    ]);
    expect(searchCommands(commands, 'save', ['layout.restore'])[0]?.id).toBe('layout.save');
  });
});
