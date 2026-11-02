import { useCallback, useContext, useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { CommandContext } from '../commands/CommandContext.js';
import type { CommandDefinition } from '../commands/CommandRegistry.js';
import { useTheme } from '../theme/ThemeProvider.js';
import { useNotifications } from '../notifications/NotificationContext.js';
import type { createLayoutStore } from './layoutStore.js';
import type { useLayoutManagement } from './useLayoutManagement.js';

interface ConfigurationActions {
  openSettings: () => void;
  openPreferences: () => void;
  importConfiguration: () => void;
  exportConfiguration: () => void;
  ready: boolean;
  busy: boolean;
}

export function useWorkbenchCommands(
  store: ReturnType<typeof createLayoutStore>,
  layout: ReturnType<typeof useLayoutManagement>,
  openPalette: () => void,
  configuration: ConfigurationActions,
) {
  const context = useContext(CommandContext);
  if (!context) throw new Error('Workbench command provider is missing.');
  const { registry, execute } = context;
  const { toggleTheme } = useTheme();
  const { setOpen, notify } = useNotifications();
  const currentLayout = useRef(layout);
  currentLayout.current = layout;
  const currentConfiguration = useRef(configuration);
  currentConfiguration.current = configuration;

  useEffect(() => {
    const commands: CommandDefinition[] = [
      { id: 'workbench.commands.open', title: 'Open command palette', shortcut: 'Mod+Shift+P', execute: openPalette },
      { id: 'workbench.settings.open', title: 'Open settings', execute: () => currentConfiguration.current.openSettings() },
      { id: 'workbench.preferences.open', title: 'Open preferences', execute: () => currentConfiguration.current.openPreferences() },
      {
        id: 'workbench.configuration.import',
        title: 'Import configuration',
        isEnabled: () => currentConfiguration.current.ready && !currentConfiguration.current.busy,
        execute: () => currentConfiguration.current.importConfiguration(),
      },
      {
        id: 'workbench.configuration.export',
        title: 'Export configuration',
        isEnabled: () => currentConfiguration.current.ready,
        execute: () => currentConfiguration.current.exportConfiguration(),
      },
      { id: 'workbench.theme.toggle', title: 'Toggle theme', shortcut: 'Mod+Alt+T', execute: toggleTheme },
      { id: 'workbench.focus.toggle', title: 'Toggle focus mode', shortcut: 'Mod+Alt+F', execute: () => store.getState().toggleFocus() },
      {
        id: 'workbench.focus.exit',
        title: 'Exit focus mode',
        shortcut: 'Escape',
        isEnabled: () => store.getState().focusMode,
        execute: () => store.getState().toggleFocus(),
      },
      { id: 'workbench.header.toggle', title: 'Toggle header', shortcut: 'Mod+Alt+H', execute: () => store.getState().toggleHeader() },
      { id: 'workbench.footer.toggle', title: 'Toggle footer', shortcut: 'Mod+Alt+B', execute: () => store.getState().toggleFooter() },
      { id: 'workbench.notifications.open', title: 'Open notifications', shortcut: 'Mod+Alt+N', execute: () => setOpen(true) },
      {
        id: 'workbench.layout.save',
        title: 'Save layout',
        shortcut: 'Mod+Alt+S',
        isEnabled: () => currentLayout.current.ready,
        execute: () => {
          currentLayout.current.save();
        },
      },
      {
        id: 'workbench.layout.restore',
        title: 'Restore saved layout',
        shortcut: 'Mod+Alt+R',
        isEnabled: () => currentLayout.current.ready && currentLayout.current.hasSaved,
        execute: () => {
          currentLayout.current.restore();
        },
      },
      {
        id: 'workbench.layout.reset',
        title: 'Reset layout',
        shortcut: 'Mod+Alt+0',
        isEnabled: () => currentLayout.current.ready,
        execute: () => {
          currentLayout.current.reset();
        },
      },
      ...(['default', 'columns', 'rows'] as const).map((preset, index): CommandDefinition => ({
        id: `workbench.layout.${preset}`,
        title: `Select ${preset} layout`,
        shortcut: `Mod+Alt+${index + 1}`,
        isEnabled: () => currentLayout.current.ready,
        execute: () => {
          currentLayout.current.selectPreset(preset);
        },
      })),
    ];
    const cleanup: (() => void)[] = [];
    try {
      for (const command of commands) cleanup.push(registry.register({ ...command, allowInEditable: true }));
    } catch (error) {
      cleanup.forEach((remove) => remove());
      throw error;
    }
    return () => cleanup.forEach((remove) => remove());
  }, [registry, store, toggleTheme, setOpen, openPalette]);

  return useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('dialog[open]')) return;
      const editable = !!target.closest('input, textarea, select, [role="textbox"]') || (target instanceof HTMLElement && target.isContentEditable);
      try {
        const command = registry.matchShortcut(event.nativeEvent, editable);
        if (command) {
          event.preventDefault();
          void execute(command.id).catch((error: unknown) =>
            notify({ title: 'Command could not run', description: error instanceof Error ? error.message : 'The action failed.', level: 'error' }),
          );
        }
      } catch (error) {
        notify({ title: 'Shortcut could not run', description: error instanceof Error ? error.message : 'The action is unavailable.', level: 'error' });
      }
    },
    [registry, execute, notify],
  );
}
