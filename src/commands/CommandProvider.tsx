import { useI18n } from '../i18n/I18nProvider.js';
import { useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { CommandRegistry } from './CommandRegistry.js';
import { CommandContext } from './CommandContext.js';
import { NotificationContext } from '../notifications/NotificationContext.js';

/** Options for an application command registry. */
export interface CommandProviderProps {
  /** Components that register or execute actions. */
  children: ReactNode;
  /** Optional existing registry. Keep stable while mounted. */
  registry?: CommandRegistry;
}

/** Provides a registry and routes execution failures into the nearest notification center. */
export function CommandProvider({ children, registry: supplied }: CommandProviderProps) {
  const [registry] = useState(
    () => supplied ?? new CommandRegistry(typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? 'mac' : 'other'),
  );
  const { t } = useI18n();
  const notifications = useContext(NotificationContext);
  const execute = useCallback(
    async (id: string) => {
      try {
        return await registry.execute(id);
      } catch (error) {
        if (!notifications) throw error;
        const command = registry.getCommands().find((entry) => entry.id === id);
        notifications.getState().notify({
          title: t('Command failed: {title}', { title: t(command?.title ?? id) }),
          description: t(error instanceof Error ? error.message : 'The action could not be completed.'),
          level: 'error',
        });
        return false;
      }
    },
    [registry, notifications, t],
  );
  const context = useMemo(() => ({ registry, execute }), [registry, execute]);
  return <CommandContext.Provider value={context}>{children}</CommandContext.Provider>;
}
