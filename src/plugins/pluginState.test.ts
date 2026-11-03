import { describe, expect, it, vi } from 'vitest';
import { capturePluginStates, copyPluginStates, restorePluginStates } from './pluginState.js';
import type { PluginStateHandler, PluginStateSnapshot } from './pluginState.js';

describe('plugin state snapshots', () => {
  it('captures live JSON data as independent snapshots and leaves imported files independent', () => {
    let state = { version: 1, notes: ['first'] };
    const handler: PluginStateHandler = {
      exportState: () => state,
      importState: (value) => {
        state = value as typeof state;
      },
    };
    const handlers = { notes: handler };
    const saved = capturePluginStates(handlers);

    state.notes.push('unsaved');

    expect(saved).toEqual({ notes: { version: 1, notes: ['first'] } });

    restorePluginStates(handlers, saved, () => {});
    state.notes.push('after restore');

    expect(saved).toEqual({ notes: { version: 1, notes: ['first'] } });
    expect(capturePluginStates(handlers)).toEqual({ notes: { version: 1, notes: ['first', 'after restore'] } });
  });

  it('rejects lossy or non-JSON exports before returning a snapshot', () => {
    const circular: unknown[] = [];

    circular.push(circular);

    for (const value of [undefined, NaN, Infinity, 1n, () => {}, new Date(), new Map(), Promise.resolve(1), { missing: undefined }, new Array(1), circular]) {
      expect(() => capturePluginStates({ invalid: { exportState: () => value, importState() {} } })).toThrow('could not be exported: invalid');
    }
  });

  it('accepts null and shared acyclic objects and treats special IDs as ordinary own keys', () => {
    const shared = { value: 1 };
    const input = JSON.parse('{"__proto__":{"note":"own"},"constructor":null}') as PluginStateSnapshot;

    expect(copyPluginStates(input)).toEqual(input);
    expect(Object.hasOwn(copyPluginStates(input), '__proto__')).toBe(true);
    expect(copyPluginStates({ plugin: [null, false, shared, shared] })).toEqual({ plugin: [null, false, { value: 1 }, { value: 1 }] });
    expect(Object.prototype).not.toHaveProperty('note');

    for (const invalid of [null, [], 'data', { ' ': null }, { plugin: Infinity }]) expect(() => copyPluginStates(invalid)).toThrow();
  });

  it('leaves missing and unknown plugin IDs alone and does not inspect unrelated live state', () => {
    const missing = {
      exportState: vi.fn(() => {
        throw new Error('unused');
      }),
      importState: vi.fn(),
    };
    const apply = vi.fn();

    restorePluginStates({ missing }, { unknown: null }, apply);

    expect(missing.exportState).not.toHaveBeenCalled();
    expect(missing.importState).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledOnce();
  });

  it('restores null explicitly and does not expose input data to mutating callbacks', () => {
    let state: unknown = 'before';
    const input = { plugin: { values: [1] } };
    const handler: PluginStateHandler = {
      exportState: () => state,
      importState(value) {
        state = value;
        if (value && typeof value === 'object') (value as { values: number[] }).values.push(2);
      },
    };

    restorePluginStates({ plugin: handler }, input, () => {});

    expect(input).toEqual({ plugin: { values: [1] } });
    expect(state).toEqual({ values: [1, 2] });

    restorePluginStates({ plugin: handler }, { plugin: null }, () => {});

    expect(state).toBe(null);
  });

  it('rolls back earlier plugins and a partially mutated failing plugin before applying a layout', () => {
    const state: Record<string, unknown> = { first: 'old first', second: 'old second' };
    const order: string[] = [];
    const handlers = Object.fromEntries(
      Object.keys(state).map((id) => [
        id,
        {
          exportState: () => state[id],
          importState(value: unknown) {
            order.push(id);
            state[id] = value;
            if (value === 'invalid') throw new Error('Invalid version.');
          },
        },
      ]),
    );
    const apply = vi.fn();

    expect(() => restorePluginStates(handlers, { first: 'new', second: 'invalid' }, apply)).toThrow('Previous state was restored');
    expect(state).toEqual({ first: 'old first', second: 'old second' });
    expect(order).toEqual(['first', 'second', 'second', 'first']);
    expect(apply).not.toHaveBeenCalled();
  });

  it('rolls back plugin state when native layout restoration fails', () => {
    let state: unknown = 'old';
    const handlers = {
      plugin: {
        exportState: () => state,
        importState(value: unknown) {
          state = value;
        },
      },
    };

    expect(() =>
      restorePluginStates(handlers, { plugin: 'new' }, () => {
        throw new Error('Dockview failure');
      }),
    ).toThrow('Previous state was restored');
    expect(state).toBe('old');
  });

  it('reports incomplete rollback while still attempting every earlier participant', () => {
    let first: unknown = 'before';
    const handlers = {
      first: {
        exportState: () => first,
        importState(value: unknown) {
          first = value;
        },
      },
      broken: {
        exportState: () => null,
        importState() {
          throw new Error('Always fails');
        },
      },
    };

    expect(() => restorePluginStates(handlers, { first: 'after', broken: null }, () => {})).toThrow(AggregateError);
    expect(first).toBe('before');
  });

  it('does not import anything when rollback snapshots cannot be exported', () => {
    const first = { exportState: () => 'valid', importState: vi.fn() };
    const broken = { exportState: () => undefined, importState: vi.fn() };

    expect(() => restorePluginStates({ first, broken }, { first: 'new', broken: null }, () => {})).toThrow('could not be exported: broken');
    expect(first.importState).not.toHaveBeenCalled();
    expect(broken.importState).not.toHaveBeenCalled();
  });

  it('rejects promise-returning imports and rolls back their synchronous mutations', () => {
    let state: unknown = 'old';
    const handler = {
      exportState: () => state,
      importState(value: unknown) {
        state = value;
        if (value === 'new') return Promise.resolve();
      },
    };

    expect(() => restorePluginStates({ plugin: handler }, { plugin: 'new' }, () => {})).toThrow('Previous state was restored');
    expect(state).toBe('old');
  });
});
