import { Orientation } from 'dockview-react';
import type { SerializedDockview } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import { copyPluginStates } from '../plugins/pluginState.js';
import type { PluginStateSnapshot } from '../plugins/pluginState.js';

/** Built-in arrangements for the application's initial panels. */
export type LayoutPreset = 'default' | 'columns' | 'rows';

/** Versioned native workspace checkpoint, including explicitly registered plugin state. */
export interface SavedLayout {
  /** Checkpoint schema version. */
  version: 1;
  /** Dockview's serialized arrangement. */
  layout: SerializedDockview;
  /** Header visibility outside Focus mode. */
  headerVisible: boolean;
  /** Footer visibility outside Focus mode. */
  footerVisible: boolean;
  /** Hidden panel IDs; panels remain registered and mounted. Absent in legacy checkpoints. */
  hiddenPanels?: readonly string[];
  /** Opted-in plugin state; absent in legacy layout checkpoints. */
  plugins?: PluginStateSnapshot;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateLayout(value: unknown, panels: readonly WorkbenchPanel[]): asserts value is SerializedDockview {
  if (!record(value) || !record(value.grid) || !record(value.panels)) throw new Error('Saved layout has an invalid structure.');

  const expected = new Set(panels.map((panel) => panel.id));
  const definitions = value.panels;

  if (Object.keys(definitions).length !== expected.size || Object.keys(definitions).some((id) => !expected.has(id))) {
    throw new Error('Saved layout is incompatible with the current panels.');
  }

  for (const id of expected) {
    const panel = definitions[id];

    if (!record(panel) || panel.id !== id || panel.contentComponent !== id) throw new Error('Saved layout references an unknown panel component.');
  }

  const grid = value.grid;

  if (
    ![Orientation.HORIZONTAL, Orientation.VERTICAL].includes(grid.orientation as Orientation) ||
    ![grid.width, grid.height].every((size) => typeof size === 'number' && Number.isFinite(size) && size > 0)
  ) {
    throw new Error('Saved layout has invalid dimensions or orientation.');
  }

  const seen = new Set<string>();
  const groups = new Set<string>();

  function group(data: unknown) {
    if (!record(data) || typeof data.id !== 'string' || groups.has(data.id) || !Array.isArray(data.views) || !data.views.length) {
      throw new Error('Saved layout contains an invalid panel group.');
    }

    groups.add(data.id);

    for (const id of data.views) {
      if (typeof id !== 'string' || !expected.has(id) || seen.has(id)) throw new Error('Saved layout has missing, duplicate, or unknown panels.');

      seen.add(id);
    }

    if (data.activeView !== undefined && !data.views.includes(data.activeView)) throw new Error('Saved layout has an invalid active panel.');
  }

  function node(data: unknown, depth = 0) {
    if (!record(data) || depth > 32 || (data.size !== undefined && (typeof data.size !== 'number' || !Number.isFinite(data.size) || data.size < 0))) {
      throw new Error('Saved layout contains an invalid split.');
    }

    if (data.type === 'leaf') group(data.data);
    else if (data.type === 'branch' && Array.isArray(data.data)) data.data.forEach((child) => node(child, depth + 1));
    else throw new Error('Saved layout contains an invalid split.');
  }

  node(grid.root);

  if (value.floatingGroups !== undefined) {
    if (!Array.isArray(value.floatingGroups)) throw new Error('Saved layout has invalid floating groups.');

    for (const floating of value.floatingGroups) {
      if (!record(floating) || !record(floating.position)) throw new Error('Saved layout has invalid floating groups.');
      if (record(floating.grid)) node(floating.grid.root);
      else group(floating.data);
    }
  }

  if (value.popoutGroups !== undefined && (!Array.isArray(value.popoutGroups) || value.popoutGroups.length)) {
    throw new Error('Layouts with separate browser windows are not supported.');
  }

  if (seen.size !== expected.size) throw new Error('Saved layout has missing panels.');
  if (value.activeGroup !== undefined && !groups.has(value.activeGroup as string)) throw new Error('Saved layout has an invalid active group.');
}

export function decodeLayout(text: string, panels: readonly WorkbenchPanel[]): SavedLayout {
  if (new TextEncoder().encode(text).byteLength > 1_000_000) throw new Error('Saved layout is too large.');

  const value: unknown = JSON.parse(text);

  if (!record(value) || value.version !== 1 || typeof value.headerVisible !== 'boolean' || typeof value.footerVisible !== 'boolean') {
    throw new Error('Saved layout has an unsupported format.');
  }

  validateLayout(value.layout, panels);

  if (
    value.hiddenPanels !== undefined &&
    (!Array.isArray(value.hiddenPanels) ||
      new Set(value.hiddenPanels).size !== value.hiddenPanels.length ||
      value.hiddenPanels.some((id: unknown) => typeof id !== 'string' || !panels.some((panel) => panel.id === id)))
  ) {
    throw new Error('Saved layout contains invalid hidden panels.');
  }

  return {
    version: 1,
    layout: value.layout,
    headerVisible: value.headerVisible,
    footerVisible: value.footerVisible,
    ...(value.hiddenPanels === undefined ? {} : { hiddenPanels: [...value.hiddenPanels] as string[] }),
    ...(value.plugins === undefined ? {} : { plugins: copyPluginStates(value.plugins) }),
  };
}

export function presetLayout(baseline: SerializedDockview, preset: LayoutPreset, panels: readonly WorkbenchPanel[]): SerializedDockview {
  if (preset === 'default') return structuredClone(baseline);

  const orientation = preset === 'columns' ? Orientation.HORIZONTAL : Orientation.VERTICAL;
  const size = orientation === Orientation.HORIZONTAL ? baseline.grid.width : baseline.grid.height;

  return {
    grid: {
      ...baseline.grid,
      orientation,
      root: {
        type: 'branch',
        data: panels.map(({ id }) => ({
          type: 'leaf',
          size: size / panels.length,
          data: { id: `dash-lab-${id}`, views: [id], activeView: id },
        })),
      },
    },
    panels: structuredClone(baseline.panels),
    ...(panels[0] ? { activeGroup: `dash-lab-${panels[0].id}` } : {}),
  };
}
