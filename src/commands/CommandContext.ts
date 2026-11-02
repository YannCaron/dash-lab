import { createContext, useContext, useMemo, useSyncExternalStore } from 'react';
import type { CommandDefinition, CommandRegistry } from './CommandRegistry.js';

export const CommandContext = createContext<{ registry: CommandRegistry; execute: (id: string) => Promise<boolean> } | null>(null);

/** Commands and operations supplied by the nearest CommandProvider. */
export interface CommandControls {
  /** Registered actions in registration order. */
  commands: readonly CommandDefinition[];
  /** Register an action and receive its cleanup function. */
  register: CommandRegistry['register'];
  /** Execute an action, reporting failures to the nearest notification center when one is present. */
  execute: (id: string) => Promise<boolean>;
  /** Check current availability. */
  canExecute: CommandRegistry['canExecute'];
}

/** Access the nearest registry through React; requires CommandProvider or a Workbench ancestor. */
export function useCommands(): CommandControls {
  const context = useContext(CommandContext);
  if (!context) throw new Error('useCommands must be used inside CommandProvider or Workbench.');
  const commands = useSyncExternalStore(context.registry.subscribe, context.registry.getCommands, context.registry.getCommands);
  return useMemo(
    () => ({ commands, register: context.registry.register, execute: context.execute, canExecute: context.registry.canExecute }),
    [commands, context],
  );
}
