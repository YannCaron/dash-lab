import { describe, expect, it } from 'vitest';
import { Orientation } from 'dockview-react';
import { decodeConfiguration } from './configuration.js';
import type { WorkbenchConfiguration } from './configuration.js';
import type { WorkbenchPanel } from '../layout/panels.js';

const panels: readonly WorkbenchPanel[] = [{ id: 'welcome', title: 'Welcome', component: () => null }];

const fixture = (): WorkbenchConfiguration => ({
  format: 'dash-lab',
  version: 1,
  preferences: { theme: 'dark', motion: 'reduced', notifications: { toastsEnabled: false, toastDurationMs: 2000 } },
  workspace: {
    version: 1,
    headerVisible: false,
    footerVisible: true,
    layout: {
      grid: {
        width: 1200,
        height: 800,
        orientation: Orientation.HORIZONTAL,
        root: { type: 'leaf', data: { id: 'group', views: ['welcome'], activeView: 'welcome' } },
      },
      panels: { welcome: { id: 'welcome', contentComponent: 'welcome' } },
      activeGroup: 'group',
    },
  },
});

describe('configuration files', () => {
  it('round-trips compact mode and accepts legacy normal-density preferences', () => {
    expect(decodeConfiguration(JSON.stringify(fixture()), panels).preferences.compact).toBeUndefined();

    for (const compact of [true, false]) {
      const input = fixture();

      input.preferences.compact = compact;

      expect(decodeConfiguration(JSON.stringify(input), panels).preferences.compact).toBe(compact);
    }

    for (const compact of [null, 1, 'true']) {
      expect(() => decodeConfiguration(JSON.stringify({ ...fixture(), preferences: { ...fixture().preferences, compact } }), panels)).toThrow('compact');
    }
  });
  it('round-trips palette choices, preserves legacy files, and rejects unknown families', () => {
    expect(decodeConfiguration(JSON.stringify(fixture()), panels).preferences.themeFamily).toBeUndefined();

    for (const themeFamily of ['azure', 'contrast', 'emerald', 'umber']) {
      const input = fixture();
      const preferences = { ...input.preferences, themeFamily };

      expect(decodeConfiguration(JSON.stringify({ ...input, preferences }), panels).preferences).toEqual(preferences);
    }

    for (const themeFamily of ['blue', null, {}, 42, '__proto__']) {
      expect(() => decodeConfiguration(JSON.stringify({ ...fixture(), preferences: { ...fixture().preferences, themeFamily } }), panels)).toThrow('family');
    }
  });

  it('round-trips optional plugin state independently of layout and leaves legacy files unchanged', () => {
    const input = { ...fixture(), plugins: { notes: { version: 1, text: 'saved' }, nullable: null } };
    const decoded = decodeConfiguration(JSON.stringify(input), panels);

    expect(decoded).toEqual(input);
    expect(decodeConfiguration(JSON.stringify(fixture()), panels)).not.toHaveProperty('plugins');
    expect(decodeConfiguration(JSON.stringify({ ...input, workspace: null }), []).plugins).toEqual(input.plugins);
    expect(decoded.plugins).not.toBe(input.plugins);
    expect(decoded.workspace).not.toHaveProperty('plugins');

    for (const plugins of [null, [], 'invalid', { ' ': null }]) {
      expect(() => decodeConfiguration(JSON.stringify({ ...fixture(), plugins }), panels)).toThrow('Plugin');
    }

    expect(() => decodeConfiguration(JSON.stringify({ ...fixture(), plugins: { value: 1 } }).replace('"value":1', '"value":1e400'), panels)).toThrow('finite');
  });

  it('accepts version-1 preferences without a language and validates new language values', () => {
    const legacy = fixture();

    expect(decodeConfiguration(JSON.stringify(legacy), panels).preferences.locale).toBeUndefined();

    legacy.preferences.locale = 'fr';

    expect(decodeConfiguration(JSON.stringify(legacy), panels).preferences.locale).toBe('fr');

    for (const locale of ['', '../fr', 42, null])
      expect(() => decodeConfiguration(JSON.stringify({ ...legacy, preferences: { ...legacy.preferences, locale } }), panels)).toThrow('language');
  });

  it('round-trips workspace and preferences and returns an independent configuration', () => {
    const input = fixture();
    const decoded = decodeConfiguration(JSON.stringify(input), panels);

    expect(decoded).toEqual(input);

    decoded.preferences.notifications.toastsEnabled = true;

    expect(input.preferences.notifications.toastsEnabled).toBe(false);
  });

  it('supports workbenches without panels while rejecting missing or foreign workspaces', () => {
    const empty = { ...fixture(), workspace: null };

    expect(decodeConfiguration(JSON.stringify(empty), []).workspace).toBe(null);
    expect(() => decodeConfiguration(JSON.stringify(empty), panels)).toThrow('missing');
    expect(() => decodeConfiguration(JSON.stringify(fixture()), [])).toThrow('incompatible');
  });

  it('rejects invalid JSON, formats, versions, and oversized files', () => {
    expect(() => decodeConfiguration('{', panels)).toThrow();

    for (const input of [null, { ...fixture(), format: 'other' }, { ...fixture(), version: 2 }]) {
      expect(() => decodeConfiguration(JSON.stringify(input), panels)).toThrow('unsupported');
    }

    expect(() => decodeConfiguration(' '.repeat(1_000_001), panels)).toThrow('1 MB');
    expect(() => decodeConfiguration('é'.repeat(500_001), panels)).toThrow('1 MB');
  });

  it('validates every preference and the native layout before accepting a file', () => {
    const preferences = fixture().preferences;

    for (const invalid of [
      null,
      { ...preferences, theme: 'blue' },
      { ...preferences, motion: 'always' },
      { ...preferences, notifications: {} },
      { ...preferences, notifications: { toastsEnabled: 'yes', toastDurationMs: 5000 } },
    ]) {
      expect(() => decodeConfiguration(JSON.stringify({ ...fixture(), preferences: invalid }), panels)).toThrow();
    }

    const invalid = fixture();

    invalid.workspace!.layout.panels.welcome!.contentComponent = 'foreign';

    expect(() => decodeConfiguration(JSON.stringify(invalid), panels)).toThrow('unknown panel');
  });

  it('whitelists preference fields instead of carrying arbitrary application data', () => {
    const input = fixture();

    const decoded = decodeConfiguration(
      JSON.stringify({
        ...input,
        history: ['secret'],
        preferences: { ...input.preferences, content: 'secret', notifications: { ...input.preferences.notifications, items: ['secret'] } },
      }),
      panels,
    );

    expect(decoded).toEqual(input);
  });
});
