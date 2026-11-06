import { MenuOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n/I18nProvider.js';
import { useContext, useRef, useState } from 'react';
import { Dropdown } from 'antd';
import { useTheme } from '../theme/ThemeProvider.js';
import { themeFamilies } from '../theme/themeStore.js';
import type { ThemeFamily } from '../theme/themeStore.js';
import { useCommands } from '../commands/CommandContext.js';
import { PluginContext } from '../plugins/PluginContext.js';
import type { PluginMenu } from '../plugins/PluginRegistry.js';

export function ApplicationMenu() {
  const { t } = useI18n();
  const { family, setFamily } = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { execute, canExecute, commands } = useCommands();
  const { menus } = useContext(PluginContext);

  const available = (id: string) => {
    try {
      return canExecute(id);
    } catch {
      return false;
    }
  };

  const topMenus = menus.filter((menu) => menu.section === 'top');
  const fileMenus = menus.filter((menu) => menu.section === 'file');
  const pluginMenus = menus.filter((menu) => !menu.section || menu.section === 'plugins');

  const createMenuItem = (menu: PluginMenu) => {
    const command = commands.find((item) => item.id === menu.commandId);
    const shortcut = menu.shortcut ?? command?.shortcut;

    return {
      key: `plugin-menu:${menu.id}`,
      label: t(menu.title),
      extra: shortcut,
      disabled: !available(menu.commandId),
    };
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
          ...topMenus.map(createMenuItem),
          ...(topMenus.length ? [{ type: 'divider' as const }] : []),
          {
            key: 'file',
            label: t('File'),
            children: [
              ...fileMenus.map(createMenuItem),
              ...(fileMenus.length ? [{ type: 'divider' as const }] : []),
              { key: 'workbench.settings.open', label: t('Settings') },
              { key: 'workbench.preferences.open', label: t('Preferences') },
              { type: 'divider' as const },
              { key: 'workbench.configuration.import', label: t('Import configuration…'), disabled: !canExecute('workbench.configuration.import') },
              { key: 'workbench.configuration.export', label: t('Export configuration…'), disabled: !canExecute('workbench.configuration.export') },
            ],
          },
          {
            key: 'theme',
            label: t('Theme'),
            children: Object.entries(themeFamilies).map(([id, label]) => ({ key: `theme:${id}`, label: t(label) })),
          },
          ...(pluginMenus.length
            ? [
                {
                  key: 'plugins',
                  label: t('Plugins'),
                  children: pluginMenus.map(createMenuItem),
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
        <MenuOutlined />
      </button>
    </Dropdown>
  );
}
