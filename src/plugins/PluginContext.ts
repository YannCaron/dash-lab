import { useI18n } from '../i18n/I18nProvider.js';
import { createContext, useEffect } from 'react';
import { useCommands } from '../commands/CommandContext.js';
import { useNotifications } from '../notifications/NotificationContext.js';
import { PluginRegistry } from './PluginRegistry.js';
import type { PluginContributions } from './PluginRegistry.js';
export const emptyContributions = new PluginRegistry().seal();
export const PluginContext = createContext<PluginContributions>(emptyContributions);
export function usePluginCommands(contributions: PluginContributions) {
  const { t } = useI18n();
  const { register, execute } = useCommands();
  const { notify } = useNotifications();
  useEffect(() => {
    const cleanup: (() => void)[] = [];
    try {
      for (const command of contributions.commands) {
        cleanup.push(register({ ...command, execute: () => command.execute({ notify, executeCommand: execute }) }));
      }
    } catch (error) {
      cleanup.reverse().forEach((remove) => remove());
      cleanup.length = 0;
      notify({
        title: t('Plugin commands could not be registered'),
        description: t(error instanceof Error ? error.message : 'Command registration failed.'),
        level: 'error',
      });
    }
    return () => cleanup.reverse().forEach((remove) => remove());
  }, [contributions, register, execute, notify, t]);
}
