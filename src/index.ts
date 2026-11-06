export { Workbench } from './layout/Workbench.js';
export type { WorkbenchProps } from './layout/Workbench.js';
export { setFullscreen, toggleFullscreen, exitFullscreen } from './layout/fullscreen.js';
export { useCompactMode } from './layout/CompactContext.js';
export type { WorkbenchPanel } from './layout/panels.js';
export type { LayoutPreset } from './layout/layoutPersistence.js';
export { ThemeProvider, useTheme } from './theme/ThemeProvider.js';
export type { ThemeProviderProps } from './theme/ThemeProvider.js';
export { ThemeToggle } from './theme/ThemeToggle.js';
export type { ThemeControls, ThemeMode, ThemeFamily, MotionPreference } from './theme/themeStore.js';
export { NotificationProvider } from './notifications/NotificationProvider.js';
export type { NotificationProviderProps } from './notifications/NotificationProvider.js';
export { useNotifications } from './notifications/NotificationContext.js';
export { NotificationButton } from './notifications/NotificationButton.js';
export type { NotificationInput, NotificationItem, NotificationLevel, NotificationCenterState } from './notifications/notificationStore.js';
export { CommandRegistry } from './commands/CommandRegistry.js';
export type { CommandDefinition } from './commands/CommandRegistry.js';
export { CommandProvider } from './commands/CommandProvider.js';
export type { CommandProviderProps } from './commands/CommandProvider.js';
export { useCommands } from './commands/CommandContext.js';
export type { CommandControls } from './commands/CommandContext.js';
export type { ShortcutEvent, ShortcutPlatform } from './commands/shortcuts.js';
export { CommandPalette } from './commands/CommandPalette.js';
export type { CommandPaletteProps } from './commands/CommandPalette.js';
export type { NotificationPreferences } from './notifications/preferences.js';
export type { WorkbenchConfiguration, WorkbenchPreferences } from './settings/configuration.js';
export { decodeConfiguration } from './settings/configuration.js';
export { PluginRegistry, registerLocalPlugins } from './plugins/PluginRegistry.js';
export type { PluginStateValue, PluginStateSnapshot, PluginStateHandler } from './plugins/pluginState.js';
export { I18nProvider, useI18n } from './i18n/I18nProvider.js';
export type { I18nProviderProps } from './i18n/I18nProvider.js';
export type { I18nControls, LanguageDefinition, MessageCatalog, MessageParameters } from './i18n/i18nStore.js';
export type {
  WorkbenchPlugin,
  PluginAPI,
  PluginCommand,
  PluginCommandContext,
  PluginMenu,
  PluginItem,
  PluginContributions,
  PluginDisposer,
} from './plugins/PluginRegistry.js';
