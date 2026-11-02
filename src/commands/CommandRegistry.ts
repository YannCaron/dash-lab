import { eventSignature, parseShortcut } from './shortcuts.js';
import type { ShortcutEvent, ShortcutPlatform } from './shortcuts.js';

/** An application action, callable by ID and optionally by keyboard. */
export interface CommandDefinition {
  /** Unique identifier within this registry. Workbench reserves the workbench.* namespace. */
  readonly id: string;
  /** Human-readable action name. */
  readonly title: string;
  /** Key combination, for example Mod+Alt+S or Mod+Enter. Mod means Command on macOS and Control elsewhere. */
  readonly shortcut?: string;
  /** Handler; asynchronous commands remain unavailable until this promise settles. */
  readonly execute: () => void | Promise<void>;
  /** Optional predicate evaluated at execution time. */
  readonly isEnabled?: () => boolean;
  /** Permit the shortcut inside text inputs and contenteditable regions. Defaults to false. */
  readonly allowInEditable?: boolean;
}

interface RegisteredCommand {
  definition: CommandDefinition;
  signature: string | undefined;
}

/** A framework-independent command registry with conflict detection and disposable registrations. */
export class CommandRegistry {
  private readonly entries = new Map<string, RegisteredCommand>();
  private readonly running = new Set<RegisteredCommand>();
  private readonly listeners = new Set<() => void>();
  private snapshot: readonly CommandDefinition[] = [];

  /** Selects how Mod is resolved. Defaults to Control; the React provider detects the browser platform. */
  constructor(private readonly platform: ShortcutPlatform = 'other') {}

  private publish() {
    this.snapshot = Object.freeze([...this.entries.values()].map((entry) => entry.definition));
    for (const listener of this.listeners) listener();
  }

  /** Register an action. Duplicate IDs and equivalent shortcuts throw before changing the registry. Returns an idempotent unregister function. */
  readonly register = (command: CommandDefinition): (() => void) => {
    const definition = Object.freeze({ ...command });
    if (!definition.id.trim() || !definition.title.trim()) throw new Error('Command IDs and titles must not be empty.');
    if (this.entries.has(definition.id)) throw new Error(`Command already registered: ${definition.id}`);
    const signature = definition.shortcut ? parseShortcut(definition.shortcut, this.platform) : undefined;
    if (signature && [...this.entries.values()].some((entry) => entry.signature === signature))
      throw new Error(`Shortcut already registered: ${definition.shortcut}`);
    const entry: RegisteredCommand = { definition, signature };
    this.entries.set(definition.id, entry);
    this.publish();

    return () => {
      if (this.entries.get(definition.id) !== entry) return;
      this.entries.delete(definition.id);
      this.publish();
    };
  };

  /** Return a stable snapshot suitable for external-store subscriptions. */
  readonly getCommands = (): readonly CommandDefinition[] => this.snapshot;

  /** Subscribe to registration and execution-state changes; returns an unsubscribe function. */
  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Whether the command exists, is enabled, and is not already running. Predicate errors propagate. */
  readonly canExecute = (id: string): boolean => {
    const entry = this.entries.get(id);
    return !!entry && !this.running.has(entry) && (entry.definition.isEnabled?.() ?? true);
  };

  /** Execute by ID. Resolves false for unknown, disabled, or running actions; handler and predicate errors reject. */
  readonly execute = async (id: string): Promise<boolean> => {
    const entry = this.entries.get(id);
    if (!entry || !this.canExecute(id)) return false;
    this.running.add(entry);
    this.publish();
    try {
      await entry.definition.execute();
      return true;
    } finally {
      this.running.delete(entry);
      this.publish();
    }
  };

  /** Find an enabled keyboard action, respecting composition, repeats, prior handlers, AltGraph, and text-entry policy. */
  readonly matchShortcut = (event: ShortcutEvent, inEditable = false): CommandDefinition | undefined => {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.getModifierState('AltGraph')) return;
    const signature = eventSignature(event);
    for (const { definition, signature: candidate } of this.entries.values()) {
      if (signature === candidate && (!inEditable || definition.allowInEditable) && this.canExecute(definition.id)) return definition;
    }
  };
}
