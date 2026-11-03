import { themeFamilies } from '../theme/themeStore.js';
import type { ThemeFamily, ThemeMode, MotionPreference } from '../theme/themeStore.js';
import type { NotificationPreferences } from '../notifications/preferences.js';
import { validateNotificationPreferences } from '../notifications/preferences.js';
import { decodeLayout } from '../layout/layoutPersistence.js';
import type { SavedLayout } from '../layout/layoutPersistence.js';
import type { WorkbenchPanel } from '../layout/panels.js';
import { copyPluginStates } from '../plugins/pluginState.js';
import type { PluginStateSnapshot } from '../plugins/pluginState.js';

/** Preferences persisted independently from explicit layout checkpoints. */
export interface WorkbenchPreferences {
  /** Registered language ID; absent in older version-1 files, which default to English. */
  locale?: string;
  /** Active color scheme. */
  theme: ThemeMode;
  /** Palette; absent in older version-1 files, which use azure. */
  themeFamily?: ThemeFamily;
  /** Animation preference. */
  motion: MotionPreference;
  /** Popup visibility and default duration. */
  notifications: NotificationPreferences;
}

/** Portable configuration; includes opted-in plugin data and excludes notification history. */
export interface WorkbenchConfiguration {
  /** Identifies a dash-lab configuration file. */
  format: 'dash-lab';
  /** Supported configuration schema version. */
  version: 1;
  /** Current native layout and chrome visibility; null for a workbench without panels. */
  workspace: SavedLayout | null;
  /** Application preferences. */
  preferences: WorkbenchPreferences;
  /** JSON state keyed by plugin ID; absent in legacy version-1 files. */
  plugins?: PluginStateSnapshot;
}

export const configurationSizeLimit = 1_000_000;

export function validatePreferences(value: unknown): WorkbenchPreferences {
  const preferences = value as Partial<WorkbenchPreferences> | null;

  if (!preferences || !['light', 'dark'].includes(preferences.theme ?? '') || !['system', 'reduced'].includes(preferences.motion ?? '')) {
    throw new Error('Preferences have an invalid theme or animation choice.');
  }

  if (preferences.themeFamily !== undefined && !Object.hasOwn(themeFamilies, preferences.themeFamily))
    throw new Error('Preferences have an invalid theme family.');

  validateNotificationPreferences(preferences.notifications);

  if (preferences.locale !== undefined && (typeof preferences.locale !== 'string' || !/^[a-z]{2,8}(-[a-z0-9]{1,8})*$/i.test(preferences.locale)))
    throw new Error('Preferences have an invalid language identifier.');

  return {
    ...(preferences.locale === undefined ? {} : { locale: preferences.locale }),
    theme: preferences.theme!,
    ...(preferences.themeFamily === undefined ? {} : { themeFamily: preferences.themeFamily }),
    motion: preferences.motion!,
    notifications: { toastsEnabled: preferences.notifications.toastsEnabled, toastDurationMs: preferences.notifications.toastDurationMs },
  };
}

/** Validate a JSON configuration against the current application's panels before applying any changes. */
export function decodeConfiguration(text: string, panels: readonly WorkbenchPanel[]): WorkbenchConfiguration {
  if (new TextEncoder().encode(text).byteLength > configurationSizeLimit) throw new Error('Configuration exceeds the 1 MB limit.');

  const value = JSON.parse(text) as Partial<WorkbenchConfiguration> | null;

  if (!value || value.format !== 'dash-lab' || value.version !== 1) throw new Error('Configuration has an unsupported format or version.');

  const preferences = validatePreferences(value.preferences);

  if (value.workspace === undefined) throw new Error('Configuration is missing a workspace.');

  const workspace = value.workspace === null ? null : decodeLayout(JSON.stringify(value.workspace), panels);

  if (workspace === null && panels.length) throw new Error('Configuration is missing this application’s workspace.');

  if (workspace) delete workspace.plugins;

  return { format: 'dash-lab', version: 1, workspace, preferences, ...(value.plugins === undefined ? {} : { plugins: copyPluginStates(value.plugins) }) };
}
