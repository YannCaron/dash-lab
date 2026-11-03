import { describe, expect, it } from 'vitest';
import { Orientation } from 'dockview-react';
import type { SerializedDockview } from 'dockview-react';
import { decodeLayout, presetLayout, validateLayout } from './layoutPersistence.js';
import type { WorkbenchPanel } from './panels.js';

const panels: readonly WorkbenchPanel[] = ['one', 'two'].map((id) => ({ id, title: id, component: () => null }));

const baseline: SerializedDockview = {
  grid: {
    width: 1200,
    height: 800,
    orientation: Orientation.HORIZONTAL,
    root: { type: 'leaf', data: { id: 'group', views: ['one', 'two'], activeView: 'one' } },
  },
  panels: Object.fromEntries(panels.map(({ id }) => [id, { id, contentComponent: id }])),
  activeGroup: 'group',
};

const snapshot = () => ({ version: 1, layout: structuredClone(baseline), headerVisible: false, footerVisible: true });

describe('saved layout compatibility', () => {
  it('round-trips a versioned layout with its visibility preferences', () => {
    expect(decodeLayout(JSON.stringify(snapshot()), panels)).toEqual(snapshot());
  });

  it('rejects corrupt JSON, unknown versions, and malformed visibility preferences', () => {
    expect(() => decodeLayout('{', panels)).toThrow();
    expect(() => decodeLayout(JSON.stringify({ ...snapshot(), version: 2 }), panels)).toThrow('unsupported format');
    expect(() => decodeLayout(JSON.stringify({ ...snapshot(), headerVisible: 'false' }), panels)).toThrow('unsupported format');
  });

  it('rejects layouts from an incompatible application before loading them', () => {
    expect(() => decodeLayout(JSON.stringify(snapshot()), panels.slice(0, 1))).toThrow('incompatible');

    const changed = snapshot();

    changed.layout.panels.one!.contentComponent = 'unknown';

    expect(() => decodeLayout(JSON.stringify(changed), panels)).toThrow('unknown panel component');
  });

  it('rejects duplicate, missing, and inconsistent panel placement', () => {
    const duplicate = snapshot();

    duplicate.layout.grid.root = { type: 'leaf', data: { id: 'group', views: ['one', 'one'] } };

    expect(() => decodeLayout(JSON.stringify(duplicate), panels)).toThrow('duplicate');

    const missing = snapshot();

    missing.layout.grid.root = { type: 'leaf', data: { id: 'group', views: ['one'] } };

    expect(() => decodeLayout(JSON.stringify(missing), panels)).toThrow('missing panels');

    const active = snapshot();

    active.layout.activeGroup = 'missing';

    expect(() => decodeLayout(JSON.stringify(active), panels)).toThrow('active group');
  });

  it('rejects invalid dimensions and separate browser windows', () => {
    const invalid = snapshot();

    invalid.layout.grid.width = -1;

    expect(() => validateLayout(invalid.layout, panels)).toThrow('dimensions');
    expect(() => validateLayout({ ...baseline, popoutGroups: [{}] }, panels)).toThrow('separate browser windows');
  });
});

describe('layout presets', () => {
  it('builds valid columns and rows without mutating the application baseline', () => {
    const original = structuredClone(baseline);

    for (const mode of ['columns', 'rows'] as const) {
      const result = presetLayout(baseline, mode, panels);

      expect(() => validateLayout(result, panels)).not.toThrow();
      expect(result.grid.orientation).toBe(mode === 'columns' ? Orientation.HORIZONTAL : Orientation.VERTICAL);
      expect(result.panels).toEqual(baseline.panels);

      result.panels.one!.title = 'Changed copy';
    }

    expect(baseline).toEqual(original);
    expect(presetLayout(baseline, 'default', panels)).toEqual(baseline);
  });
});
