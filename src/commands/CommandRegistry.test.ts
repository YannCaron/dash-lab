import { describe, expect, it, vi } from 'vitest';
import { CommandRegistry } from './CommandRegistry.js';
import type { ShortcutEvent } from './shortcuts.js';

function key(overrides: Partial<ShortcutEvent> = {}): ShortcutEvent {
  return {
    key: 'Enter',
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    defaultPrevented: false,
    getModifierState: () => false,
    ...overrides,
  };
}

describe('command lifecycle', () => {
  it('registers, executes and disposes commands without stale cleanup removing replacements', async () => {
    const registry = new CommandRegistry();
    const execute = vi.fn();
    const remove = registry.register({ id: 'example', title: 'Example', execute });

    expect(await registry.execute('example')).toBe(true);
    expect(execute).toHaveBeenCalledOnce();

    remove();

    const replacement = registry.register({ id: 'example', title: 'Replacement', execute });

    remove();

    expect(registry.getCommands()[0]?.title).toBe('Replacement');

    replacement();

    expect(await registry.execute('example')).toBe(false);
  });

  it('rejects ID and normalized shortcut conflicts before altering existing actions', () => {
    const registry = new CommandRegistry();
    const command = { id: 'one', title: 'One', shortcut: 'Mod+Enter', execute: () => {} };

    registry.register(command);

    expect(() => registry.register(command)).toThrow('already registered');
    expect(() => registry.register({ ...command, id: 'two', shortcut: 'Control+Return' })).toThrow('Shortcut already registered');
    expect(registry.getCommands()).toHaveLength(1);
  });

  it('copies registrations so later mutations of the caller object cannot corrupt IDs', () => {
    const registry = new CommandRegistry();
    const command = { id: 'one', title: 'One', execute: () => {} };
    const remove = registry.register(command);

    command.id = 'changed';

    expect(registry.canExecute('one')).toBe(true);

    remove();

    expect(registry.getCommands()).toHaveLength(0);
  });

  it('returns false for disabled and unknown actions, and rechecks dynamic availability', async () => {
    const registry = new CommandRegistry();
    const execute = vi.fn();
    let enabled = false;

    registry.register({ id: 'one', title: 'One', isEnabled: () => enabled, execute });

    expect(await registry.execute('missing')).toBe(false);
    expect(await registry.execute('one')).toBe(false);

    enabled = true;

    expect(await registry.execute('one')).toBe(true);
    expect(execute).toHaveBeenCalledOnce();
  });

  it('prevents overlapping execution and releases the running state after completion and rejection', async () => {
    const registry = new CommandRegistry();
    let finish!: () => void;

    registry.register({
      id: 'wait',
      title: 'Wait',
      execute: () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    });

    const running = registry.execute('wait');

    expect(registry.canExecute('wait')).toBe(false);
    expect(await registry.execute('wait')).toBe(false);

    finish();

    expect(await running).toBe(true);
    expect(registry.canExecute('wait')).toBe(true);

    registry.register({
      id: 'fail',
      title: 'Fail',
      execute: async () => {
        throw new Error('Expected failure');
      },
    });

    await expect(registry.execute('fail')).rejects.toThrow('Expected failure');

    expect(registry.canExecute('fail')).toBe(true);
  });

  it('provides stable snapshots and unsubscribes listeners', () => {
    const registry = new CommandRegistry();

    expect(registry.getCommands()).toBe(registry.getCommands());

    const listener = vi.fn();
    const unsubscribe = registry.subscribe(listener);
    const before = registry.getCommands();
    const remove = registry.register({ id: 'one', title: 'One', execute: () => {} });

    expect(registry.getCommands()).not.toBe(before);
    expect(listener).toHaveBeenCalledOnce();

    unsubscribe();
    remove();

    expect(listener).toHaveBeenCalledOnce();
  });
});

describe('keyboard matching', () => {
  it('resolves Mod for each platform and requires exact modifiers', () => {
    const windows = new CommandRegistry('other');
    const mac = new CommandRegistry('mac');

    for (const registry of [windows, mac]) registry.register({ id: 'one', title: 'One', shortcut: 'Mod+Enter', execute: () => {} });

    expect(windows.matchShortcut(key())?.id).toBe('one');
    expect(mac.matchShortcut(key())).toBeUndefined();
    expect(mac.matchShortcut(key({ ctrlKey: false, metaKey: true }))?.id).toBe('one');
    expect(windows.matchShortcut(key({ shiftKey: true }))).toBeUndefined();
    expect(() => mac.register({ id: 'two', title: 'Two', shortcut: 'Cmd+Enter', execute: () => {} })).toThrow('Shortcut already registered');
  });

  it('ignores text entry unless explicitly allowed, repeated keys, composition, prior handlers and AltGraph', () => {
    const registry = new CommandRegistry();
    const remove = registry.register({ id: 'one', title: 'One', shortcut: 'Ctrl+Enter', execute: () => {} });

    expect(registry.matchShortcut(key(), true)).toBeUndefined();

    for (const event of [key({ repeat: true }), key({ isComposing: true }), key({ defaultPrevented: true }), key({ getModifierState: () => true })])
      expect(registry.matchShortcut(event)).toBeUndefined();

    remove();
    registry.register({ id: 'one', title: 'One', shortcut: 'Ctrl+Enter', allowInEditable: true, execute: () => {} });

    expect(registry.matchShortcut(key(), true)?.id).toBe('one');
  });

  it('rejects malformed shortcuts and handles case-insensitive keys and disabled actions', () => {
    const registry = new CommandRegistry();

    for (const shortcut of ['Ctrl+', 'Control+Ctrl+S', 'Unknown+S', 'Ctrl+NotAKey'])
      expect(() => registry.register({ id: shortcut, title: 'Invalid', shortcut, execute: () => {} })).toThrow();

    registry.register({ id: 'one', title: 'One', shortcut: 'ctrl+shift+a', execute: () => {} });
    registry.register({ id: 'off', title: 'Off', shortcut: 'Ctrl+Enter', isEnabled: () => false, execute: () => {} });

    expect(registry.matchShortcut(key({ key: 'A', shiftKey: true }))?.id).toBe('one');
    expect(registry.matchShortcut(key())).toBeUndefined();
  });
});
