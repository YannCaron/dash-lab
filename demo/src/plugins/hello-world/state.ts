import { createStore } from 'zustand/vanilla';
import type { PluginStateHandler } from 'dash-lab';

export const helloState = createStore<{ name: string; greeting: string | null }>(() => ({ name: 'World', greeting: null }));

export const helloStateHandler: PluginStateHandler = {
  exportState: () => ({ version: 1, ...helloState.getState() }),
  importState(value) {
    if (
      !value ||
      typeof value !== 'object' ||
      !('version' in value) ||
      value.version !== 1 ||
      !('name' in value) ||
      typeof value.name !== 'string' ||
      !('greeting' in value) ||
      (value.greeting !== null && typeof value.greeting !== 'string')
    )
      throw new Error('Invalid Hello World state.');

    helloState.setState({ name: value.name, greeting: value.greeting }, true);
  },
};
