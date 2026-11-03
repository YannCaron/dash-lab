import type { ComponentType } from 'react';
import { CommandRegistry } from '../commands/CommandRegistry.js';
import type { CommandDefinition } from '../commands/CommandRegistry.js';
import type { WorkbenchPanel } from '../layout/panels.js';
import type { NotificationInput } from '../notifications/notificationStore.js';

/** Removes a startup registration or plugin. Unloading after mounting is unsupported. */
export type PluginDisposer = () => void;

/** Services available when a plugin command runs inside a workbench. */
export interface PluginCommandContext {
  /** Publish a notification into the workbench's center. */
  notify: (notification: NotificationInput) => string;
  /** Run another registered command through normal availability and error handling. */
  executeCommand: (id: string) => Promise<boolean>;
}

/** A command contributed at startup, receiving live workbench services when executed. */
export interface PluginCommand extends Omit<CommandDefinition, 'execute'> {
  /** Run the action synchronously or asynchronously. */
  execute: (context: PluginCommandContext) => void | Promise<void>;
}

/** An action displayed under the application's Plugins menu. */
export interface PluginMenu {
  /** Unique menu contribution ID. */
  id: string;
  /** Visible label. */
  title: string;
  /** Command invoked when selected; may reference a built-in command. */
  commandId: string;
}

/** A React component rendered in the footer or monitoring bar. */
export interface PluginItem {
  /** Unique identifier within this contribution kind. */
  id: string;
  /** Component rendered inside the workbench's providers. */
  component: ComponentType;
}

/** Scoped startup registration API. Each method returns an idempotent disposer. */
export interface PluginAPI {
  /** Add a docked panel; plugin panels precede application panels. */
  registerPanel: (panel: WorkbenchPanel) => PluginDisposer;
  /** Add a command; workbench.* IDs are reserved. */
  registerCommand: (command: PluginCommand) => PluginDisposer;
  /** Add a command-backed menu action. */
  registerMenu: (menu: PluginMenu) => PluginDisposer;
  /** Add a footer component. */
  registerStatusItem: (item: PluginItem) => PluginDisposer;
  /** Add a monitoring-bar component. */
  registerMonitoringItem: (item: PluginItem) => PluginDisposer;
}

/** A trusted plugin bundled from a local application directory. */
export interface WorkbenchPlugin {
  /** Unique, nonempty plugin identifier. */
  id: string;
  /** Register contributions synchronously; optionally return resource cleanup for startup disposal. */
  activate: (api: PluginAPI) => void | PluginDisposer;
}

/** Immutable contributions captured when a workbench mounts. */
export interface PluginContributions {
  /** Registered plugin IDs in startup order. */
  readonly pluginIds: readonly string[];
  /** Docked panels in registration order. */
  readonly panels: readonly WorkbenchPanel[];
  /** Registered commands. */
  readonly commands: readonly PluginCommand[];
  /** Menu actions. */
  readonly menus: readonly PluginMenu[];
  /** Footer components. */
  readonly statusItems: readonly PluginItem[];
  /** Monitoring components. */
  readonly monitoringItems: readonly PluginItem[];
}

function isComponent(value: unknown) {
  if (typeof value === 'function') return true;
  if (!value || typeof value !== 'object' || !('$$typeof' in value)) return false;

  return ['react.memo', 'react.forward_ref', 'react.lazy'].some((name) => value.$$typeof === Symbol.for(name));
}

/** Collects startup contributions transactionally, then freezes them for the mounted workbench. */
export class PluginRegistry {
  private readonly plugins = new Set<string>();
  private readonly panels = new Map<string, WorkbenchPanel>();
  private readonly commands = new Map<string, PluginCommand>();
  private readonly menus = new Map<string, PluginMenu>();
  private readonly statusItems = new Map<string, PluginItem>();
  private readonly monitoringItems = new Map<string, PluginItem>();
  private readonly commandValidator = new CommandRegistry();
  private snapshot: PluginContributions | undefined;
  private activating = 0;

  private assertMutable() {
    if (this.snapshot) throw new Error('Plugin registration is closed. Create a new registry and remount the workbench.');
  }

  private add<T extends { id: string }>(collection: Map<string, T>, value: T, undo: PluginDisposer[]): PluginDisposer {
    this.assertMutable();

    if (!value || typeof value.id !== 'string' || !value.id.trim()) throw new Error('A contribution requires a nonempty ID.');
    if (collection.has(value.id)) throw new Error(`Duplicate plugin contribution: ${value.id}`);

    const entry = Object.freeze({ ...value });

    collection.set(entry.id, entry);

    const remove = () => {
      this.assertMutable();

      if (collection.get(entry.id) === entry) collection.delete(entry.id);
    };

    undo.push(remove);

    return remove;
  }

  /** Activate a local plugin; failures roll back every contribution from that activation. */
  registerPlugin(plugin: WorkbenchPlugin): PluginDisposer {
    this.assertMutable();

    if (!plugin || typeof plugin.id !== 'string' || !plugin.id.trim() || typeof plugin.activate !== 'function') throw new Error('Invalid plugin definition.');
    if (this.plugins.has(plugin.id)) throw new Error(`Duplicate plugin: ${plugin.id}`);

    const id = plugin.id;
    const undo: PluginDisposer[] = [];
    let active = true;
    let cleanup: void | PluginDisposer;

    const scoped =
      <T>(register: (value: T) => PluginDisposer) =>
      (value: T) => {
        if (!active) throw new Error(`Plugin ${id} is no longer active.`);

        return register(value);
      };

    const item = (collection: Map<string, PluginItem>, value: PluginItem) => {
      if (!isComponent(value?.component)) throw new Error('A plugin item requires a React component.');

      return this.add(collection, value, undo);
    };

    const api: PluginAPI = {
      registerPanel: scoped((panel) => {
        if (!panel?.title?.trim() || !isComponent(panel.component)) throw new Error('A plugin panel requires a title and React component.');

        return this.add(this.panels, { ...panel, ...(panel.position ? { position: Object.freeze({ ...panel.position }) } : {}) }, undo);
      }),
      registerCommand: scoped((command) => {
        if (typeof command?.execute !== 'function') throw new Error('A plugin command requires an execute function.');
        if (command?.id?.startsWith('workbench.')) throw new Error('The workbench.* command namespace is reserved.');

        const unregister = this.commandValidator.register({ ...command, execute: () => {} });

        undo.push(unregister);

        const remove = this.add(this.commands, command, undo);

        return () => {
          remove();
          unregister();
        };
      }),
      registerMenu: scoped((menu) => {
        if (!menu?.title?.trim() || !menu.commandId?.trim()) throw new Error('A plugin menu requires a title and command ID.');

        return this.add(this.menus, menu, undo);
      }),
      registerStatusItem: scoped((value) => item(this.statusItems, value)),
      registerMonitoringItem: scoped((value) => item(this.monitoringItems, value)),
    };

    this.plugins.add(id);
    this.activating++;

    try {
      cleanup = plugin.activate(Object.freeze(api));

      if (cleanup !== undefined && typeof cleanup !== 'function')
        throw new Error('Plugin activation must be synchronous and return void or a cleanup function.');
    } catch (error) {
      active = false;
      undo.reverse().forEach((remove) => remove());
      this.plugins.delete(id);

      throw new Error(`Plugin ${id} could not start: ${error instanceof Error ? error.message : 'Activation failed.'}`, { cause: error });
    } finally {
      this.activating--;
    }

    return () => {
      this.assertMutable();

      if (!active) return;

      active = false;
      undo.reverse().forEach((remove) => remove());
      this.plugins.delete(id);
      cleanup?.();
    };
  }

  /** Freeze contributions once; called automatically by Workbench. Later calls return the same snapshot. */
  seal(): PluginContributions {
    if (this.activating) throw new Error('Plugins must finish activating before the registry is sealed.');
    if (!this.snapshot) {
      this.snapshot = Object.freeze({
        pluginIds: Object.freeze([...this.plugins]),
        panels: Object.freeze([...this.panels.values()]),
        commands: Object.freeze([...this.commands.values()]),
        menus: Object.freeze([...this.menus.values()]),
        statusItems: Object.freeze([...this.statusItems.values()]),
        monitoringItems: Object.freeze([...this.monitoringItems.values()]),
      });
    }

    return this.snapshot;
  }
}

/** Register Vite's eager local-plugin modules in deterministic path order. No filesystem or network access occurs. */
export function registerLocalPlugins(modules: Record<string, { default: WorkbenchPlugin }>): PluginRegistry {
  const registry = new PluginRegistry();
  const cleanup: PluginDisposer[] = [];

  try {
    for (const path of Object.keys(modules).sort()) cleanup.push(registry.registerPlugin(modules[path]!.default));

    return registry;
  } catch (error) {
    cleanup.reverse().forEach((remove) => remove());

    throw error;
  }
}
