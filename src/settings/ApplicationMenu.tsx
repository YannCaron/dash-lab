import { useI18n } from '../i18n/I18nProvider.js';
import { useContext, useRef, useState } from 'react';
import { Dropdown } from 'antd';
import { useTheme } from '../theme/ThemeProvider.js';
import { themeFamilies } from '../theme/themeStore.js';
import type { ThemeFamily } from '../theme/themeStore.js';
import { useCommands } from '../commands/CommandContext.js';
import { PluginContext } from '../plugins/PluginContext.js';

export function ApplicationMenu() {
  const { t } = useI18n();
  const { family, setFamily } = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { execute, canExecute } = useCommands();
  const { menus } = useContext(PluginContext);

  const available = (id: string) => {
    try {
      return canExecute(id);
    } catch {
      return false;
    }
  };

  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      autoFocus
      destroyOnHidden
      menu={{
        'aria-label': t('Application menu'),
        triggerSubMenuAction: 'click',
        selectable: true,
        selectedKeys: [`theme:${family}`],
        items: [
          {
            key: 'file',
            label: t('File'),
            children: [
              { key: 'workbench.settings.open', label: t('Settings') },
              { key: 'workbench.preferences.open', label: t('Preferences') },
              { type: 'divider' },
              { key: 'workbench.configuration.import', label: t('Import configuration…'), disabled: !canExecute('workbench.configuration.import') },
              { key: 'workbench.configuration.export', label: t('Export configuration…'), disabled: !canExecute('workbench.configuration.export') },
            ],
          },
          {
            key: 'theme',
            label: t('Theme'),
            children: Object.entries(themeFamilies).map(([id, label]) => ({ key: `theme:${id}`, label: t(label) })),
          },
          ...(menus.length
            ? [
                {
                  key: 'plugins',
                  label: t('Plugins'),
                  children: menus.map((menu) => ({ key: `plugin-menu:${menu.id}`, label: t(menu.title), disabled: !available(menu.commandId) })),
                },
              ]
            : []),
        ],
        onClick: ({ key }) => {
          setOpen(false);
          trigger.current?.focus();

          if (key.startsWith('theme:')) {
            setFamily(key.slice(6) as ThemeFamily);

            return;
          }

          const menu = menus.find((menu) => `plugin-menu:${menu.id}` === key);

          void execute(menu?.commandId ?? key);
        },
        onKeyDown: (event) => {
          if (event.key === 'Escape') {
            setOpen(false);
            trigger.current?.focus();
            event.stopPropagation();
          }
        },
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="dl-icon-button dl-menu-trigger"
        aria-label={t('Open application menu')}
        aria-haspopup="menu"
        aria-expanded={open}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </Dropdown>
  );
}
