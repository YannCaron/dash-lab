import { useRef, useState } from 'react';
import { Dropdown } from 'antd';
import { useCommands } from '../commands/CommandContext.js';

export function ApplicationMenu() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { execute, canExecute } = useCommands();
  return (
    <Dropdown
      open={open}
      onOpenChange={setOpen}
      trigger={['click']}
      autoFocus
      destroyOnHidden
      menu={{
        'aria-label': 'Application menu',
        triggerSubMenuAction: 'click',
        items: [
          {
            key: 'file',
            label: 'File',
            children: [
              { key: 'workbench.settings.open', label: 'Settings' },
              { key: 'workbench.preferences.open', label: 'Preferences' },
              { type: 'divider' },
              { key: 'workbench.configuration.import', label: 'Import configuration…', disabled: !canExecute('workbench.configuration.import') },
              { key: 'workbench.configuration.export', label: 'Export configuration…', disabled: !canExecute('workbench.configuration.export') },
            ],
          },
        ],
        onClick: ({ key }) => {
          setOpen(false);
          trigger.current?.focus();
          void execute(key);
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
        aria-label="Open application menu"
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
