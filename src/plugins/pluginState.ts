/** JSON data accepted in a plugin checkpoint or configuration file. */
export type PluginStateValue = null | boolean | number | string | PluginStateValue[] | { [key: string]: PluginStateValue };

/** Plugin-owned JSON data, keyed by the plugin's stable ID. */
export type PluginStateSnapshot = Record<string, PluginStateValue>;

/** Synchronous callbacks registered at startup; import must validate before updating the plugin's store. */
export interface PluginStateHandler {
  /** Return JSON data. Include a plugin-specific version when the data format may evolve. */
  exportState: () => unknown;
  /** Validate untrusted JSON and replace live state without remounting panels. Return void; asynchronous imports are unsupported. */
  importState: (state: unknown) => void;
}

type StateHandlers = Readonly<Record<string, PluginStateHandler>>;

function copyValue(value: unknown, ancestors = new Set<object>()): PluginStateValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  if (typeof value !== 'object' || ancestors.has(value)) throw new Error('Plugin state must contain finite, non-circular JSON data.');
  if (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    throw new Error('Plugin state must use plain JSON objects and arrays.');

  ancestors.add(value);

  try {
    return Array.isArray(value)
      ? Array.from(value, (entry) => copyValue(entry, ancestors))
      : Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyValue(entry, ancestors)]));
  } finally {
    ancestors.delete(value);
  }
}

export function copyPluginStates(value: unknown): PluginStateSnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Plugin states must be an object keyed by plugin ID.');

  const states = copyValue(value) as PluginStateSnapshot;

  if (Object.keys(states).some((id) => !id.trim())) throw new Error('Plugin state IDs must not be empty.');

  return states;
}

export function capturePluginStates(handlers: StateHandlers): PluginStateSnapshot {
  return Object.fromEntries(
    Object.entries(handlers).map(([id, handler]) => {
      try {
        return [id, copyValue(handler.exportState())];
      } catch (cause) {
        throw new Error(`Plugin state could not be exported: ${id}`, { cause });
      }
    }),
  );
}

function importState(id: string, handler: PluginStateHandler, state: PluginStateValue) {
  const result: unknown = handler.importState(copyValue(state));

  if (result !== undefined) throw new Error(`Plugin state import must be synchronous and return void: ${id}`);
}

export function restorePluginStates(handlers: StateHandlers, snapshot: PluginStateSnapshot, apply: () => void) {
  const states = copyPluginStates(snapshot);
  const participating = Object.entries(handlers).filter(([id]) => Object.hasOwn(states, id));

  if (!participating.length) return apply();

  const previous = capturePluginStates(Object.fromEntries(participating));
  const attempted: typeof participating = [];

  try {
    for (const [id, handler] of participating) {
      attempted.push([id, handler]);
      importState(id, handler, states[id]!);
    }

    apply();
  } catch (cause) {
    const failures: unknown[] = [cause];

    for (const [id, handler] of attempted.reverse()) {
      try {
        importState(id, handler, previous[id]!);
      } catch (error) {
        failures.push(error);
      }
    }

    if (failures.length > 1) throw new AggregateError(failures, 'Plugin state restoration failed and rollback was incomplete.', { cause });

    throw new Error('Plugin state restoration failed. Previous state was restored.', { cause });
  }
}
