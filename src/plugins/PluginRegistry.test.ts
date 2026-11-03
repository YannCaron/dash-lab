import { memo } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { PluginRegistry, registerLocalPlugins } from './PluginRegistry.js';
import type { PluginAPI, WorkbenchPlugin } from './PluginRegistry.js';

const component = () => null;

describe('local plugin registration', () => {
  it('scopes optional state handlers to plugin IDs and freezes their copied registrations', () => {
    const registry = new PluginRegistry();
    const handler = { exportState: () => ({ note: 'saved' }), importState: vi.fn() };

    registry.registerPlugin({
      id: 'notes',
      activate(api) {
        api.registerState(handler);
      },
    });
    registry.registerPlugin({ id: 'stateless', activate() {} });

    handler.exportState = () => ({ note: 'changed callback' });

    const result = registry.seal();

    expect(Object.keys(result.stateHandlers)).toEqual(['notes']);
    expect(result.stateHandlers.notes?.exportState()).toEqual({ note: 'saved' });
    expect(Object.isFrozen(result.stateHandlers)).toBe(true);
    expect(Object.isFrozen(result.stateHandlers.notes)).toBe(true);
  });

  it('disposes and rolls back state registrations with normal startup contributions', () => {
    const registry = new PluginRegistry();
    const handler = { exportState: () => null, importState() {} };

    const dispose = registry.registerPlugin({
      id: 'removed',
      activate(api) {
        const remove = api.registerState(handler);

        remove();
        remove();
        api.registerState(handler);
      },
    });

    dispose();

    expect(() =>
      registry.registerPlugin({
        id: 'duplicate',
        activate(api) {
          api.registerState(handler);
          api.registerState(handler);
        },
      }),
    ).toThrow('Duplicate');

    expect(() =>
      registry.registerPlugin({
        id: 'invalid',
        activate(api) {
          api.registerState({ exportState: () => null } as Parameters<PluginAPI['registerState']>[0]);
        },
      }),
    ).toThrow('callbacks');

    let api: PluginAPI | undefined;

    registry.registerPlugin({
      id: 'sealed',
      activate(value) {
        api = value;
      },
    });

    expect(registry.seal().stateHandlers).toEqual({});
    expect(() => api!.registerState(handler)).toThrow('registration is closed');
  });

  it('collects all contribution kinds and freezes copied startup definitions', () => {
    const registry = new PluginRegistry();
    const panel = { id: 'panel', title: 'Original', component: memo(component) };

    registry.registerPlugin({
      id: 'example',
      activate(api) {
        api.registerPanel(panel);
        api.registerCommand({ id: 'example.run', title: 'Run', execute() {} });
        api.registerMenu({ id: 'menu', title: 'Run', commandId: 'example.run' });
        api.registerStatusItem({ id: 'status', component });
        api.registerMonitoringItem({ id: 'monitor', component });
      },
    });

    panel.title = 'Changed caller';

    const result = registry.seal();

    expect(result.pluginIds).toEqual(['example']);
    expect(result.panels[0]?.title).toBe('Original');
    expect(result.commands).toHaveLength(1);
    expect(result.menus).toHaveLength(1);
    expect(result.statusItems).toHaveLength(1);
    expect(result.monitoringItems).toHaveLength(1);
    expect(Object.isFrozen(result.panels)).toBe(true);
    expect(Object.isFrozen(result.panels[0])).toBe(true);
    expect(registry.seal()).toBe(result);
  });

  it('rolls back a failed activation without removing previously registered plugins', () => {
    const registry = new PluginRegistry();

    registry.registerPlugin({
      id: 'existing',
      activate: (api) => {
        api.registerPanel({ id: 'existing', title: 'Existing', component });
      },
    });

    expect(() =>
      registry.registerPlugin({
        id: 'broken',
        activate(api) {
          api.registerCommand({ id: 'broken.run', title: 'Run', execute() {} });
          api.registerStatusItem({ id: 'status', component });
          api.registerPanel({ id: 'existing', title: 'Duplicate', component });
        },
      }),
    ).toThrow('Duplicate');

    expect(registry.seal()).toMatchObject({ pluginIds: ['existing'], commands: [], statusItems: [] });
  });

  it('disposes startup registrations once and prevents a leaked API from registering later', () => {
    const registry = new PluginRegistry();
    const cleanup = vi.fn();
    let leaked: PluginAPI | undefined;

    const dispose = registry.registerPlugin({
      id: 'example',
      activate(api) {
        leaked = api;

        const remove = api.registerCommand({ id: 'example.run', title: 'Run', shortcut: 'Mod+Enter', execute() {} });

        remove();
        remove();
        api.registerCommand({ id: 'example.replacement', title: 'Run', shortcut: 'Mod+Enter', execute() {} });

        return cleanup;
      },
    });

    dispose();
    dispose();

    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(() => leaked!.registerStatusItem({ id: 'late', component })).toThrow('no longer active');
    expect(registry.seal().commands).toEqual([]);
  });

  it('rejects duplicate plugins, reserved IDs, conflicting shortcuts, and invalid definitions', () => {
    const registry = new PluginRegistry();
    const plugin: WorkbenchPlugin = { id: 'example', activate: () => {} };

    registry.registerPlugin(plugin);

    expect(() => registry.registerPlugin(plugin)).toThrow('Duplicate plugin');

    expect(() =>
      registry.registerPlugin({
        id: 'reserved',
        activate(api) {
          api.registerCommand({ id: 'workbench.bad', title: 'Bad', execute() {} });
        },
      }),
    ).toThrow('reserved');

    expect(() =>
      registry.registerPlugin({
        id: 'conflict',
        activate(api) {
          api.registerCommand({ id: 'one', title: 'One', shortcut: 'Mod+Enter', execute() {} });
          api.registerCommand({ id: 'two', title: 'Two', shortcut: 'Ctrl+Enter', execute() {} });
        },
      }),
    ).toThrow('Shortcut');

    expect(() => registry.registerPlugin({ id: '', activate: () => {} })).toThrow('Invalid');
    expect(registry.seal().commands).toEqual([]);
  });

  it('closes registration after mounting and disallows sealing from an activation callback', () => {
    const registry = new PluginRegistry();

    expect(() =>
      registry.registerPlugin({
        id: 'early',
        activate: () => {
          registry.seal();
        },
      }),
    ).toThrow('finish activating');

    const remove = registry.registerPlugin({ id: 'good', activate: () => {} });

    registry.seal();

    expect(() => remove()).toThrow('registration is closed');
    expect(() => registry.registerPlugin({ id: 'late', activate: () => {} })).toThrow('registration is closed');
  });

  it('loads eager Vite modules in path order and cleans up on an invalid module', () => {
    const first = { default: { id: 'a', activate: () => {} } };
    const last = { default: { id: 'z', activate: () => {} } };

    expect(registerLocalPlugins({ './z/index.ts': last, './a/index.ts': first }).seal().pluginIds).toEqual(['a', 'z']);

    const cleanup = vi.fn();

    expect(() => registerLocalPlugins({ a: { default: { id: 'a', activate: () => cleanup } }, b: { default: null as unknown as WorkbenchPlugin } })).toThrow(
      'Invalid',
    );

    expect(cleanup).toHaveBeenCalledOnce();
  });
});
