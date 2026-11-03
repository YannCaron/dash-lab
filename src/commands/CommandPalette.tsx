import { useI18n } from '../i18n/I18nProvider.js';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useCommands } from './CommandContext.js';
import { useNotifications } from '../notifications/NotificationContext.js';
import { searchCommands } from './searchCommands.js';
import { useDialogDismiss } from '../overlays/useDialogDismiss.js';
import { closeDialog, openDialog } from '../overlays/dialogMotion.js';

/** Options for the controlled command palette. */
export interface CommandPaletteProps {
  /** Whether the palette should be open. */
  open: boolean;
  /** Requests closure after dismissal or selection. */
  onClose: () => void;
}
/** Searches and executes the nearest registry's commands; requires command and notification providers. */
export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const { t } = useI18n();
  const dismissal = useDialogDismiss(onClose);
  const { commands, canExecute, execute } = useCommands();
  const { notify } = useNotifications();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [recent, setRecent] = useState<readonly string[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const prefix = useId();
  const listId = `${prefix}-commands`;

  const results = useMemo(
    () =>
      searchCommands(
        commands.filter((command) => command.id !== 'workbench.commands.open').map((command) => ({ ...command, title: t(command.title) })),
        query,
        recent,
      ),
    [commands, query, recent, t],
  );

  const entries = results.map((command, index) => {
    try {
      return { command, index, enabled: canExecute(command.id), error: '' };
    } catch (error) {
      return { command, index, enabled: false, error: error instanceof Error ? error.message : 'Availability check failed.' };
    }
  });

  const enabled = entries.filter((entry) => entry.enabled);
  const active = enabled.find((entry) => entry.command.id === selected) ?? enabled[0];
  const activeId = active ? `${prefix}-command-${active.index}` : undefined;

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);

      openDialog(dialog.current);

      input.current?.focus();
    } else void closeDialog(dialog.current);
  }, [open]);

  useEffect(() => {
    if (open && activeId) document.getElementById(activeId)?.scrollIntoView({ block: 'nearest' });
  }, [open, activeId]);

  const run = async (id: string) => {
    try {
      if (!canExecute(id)) return;

      onClose();
      await closeDialog(dialog.current);

      if (dialog.current?.open) return;

      if (await execute(id)) setRecent((previous) => [id, ...previous.filter((entry) => entry !== id)].slice(0, 6));
    } catch (error) {
      notify({ title: t('Command could not run'), description: t(error instanceof Error ? error.message : 'The action failed.'), level: 'error' });
    }
  };

  return (
    <dialog {...dismissal} ref={dialog} className="dl-command-palette dl-modal" aria-label={t('Command palette')}>
      <div className="dl-palette-search">
        <span aria-hidden="true">&gt;</span>
        <input
          ref={input}
          role="combobox"
          aria-label={t('Search commands')}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={activeId}
          autoComplete="off"
          placeholder={t('Type a command\u2026')}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelected(null);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.repeat) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();

              if (!enabled.length) return;

              const index = enabled.findIndex((entry) => entry.command.id === active?.command.id);
              const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;

              setSelected(enabled[next]!.command.id);
            } else if (event.key === 'Enter') {
              event.preventDefault();

              if (active) void run(active.command.id);
            }
          }}
        />
        <button type="button" className="dl-icon-button dl-dialog-close" aria-label={t('Close command palette')} onClick={onClose}>
          ×
        </button>
      </div>
      <div id={listId} className="dl-palette-results" role="listbox" aria-label={t('Commands')}>
        {entries.map(({ command, index, enabled: available, error }) => (
          <div
            key={command.id}
            id={`${prefix}-command-${index}`}
            role="option"
            aria-selected={active?.command.id === command.id}
            aria-disabled={!available}
            className="dl-palette-option"
            title={t((error || undefined) ?? '')}
            onMouseDown={(event) => event.preventDefault()}
            onMouseMove={() => {
              if (available) setSelected(command.id);
            }}
            onClick={() => {
              if (available) void run(command.id);
            }}
          >
            <span>
              {command.title}
              {error && (
                <small>
                  {t('Unavailable:')}
                  {error}
                </small>
              )}
            </span>
            {command.shortcut && <kbd>{command.shortcut}</kbd>}
            {!available && <span className="dl-palette-unavailable">{t('Unavailable')}</span>}
          </div>
        ))}
        {!entries.length && <p className="dl-palette-empty">{t(commands.length ? 'No commands match your search.' : 'No commands are registered yet.')}</p>}
      </div>
      <footer className="dl-palette-footer">
        <span role="status">
          {entries.length} {t(entries.length === 1 ? 'command' : 'commands')}
        </span>
        <span>
          <kbd>↑ ↓</kbd>
          {t('navigate')}
          <kbd>{t('Enter')}</kbd>
          {t('run')}
          <kbd>{t('Esc')}</kbd>
          {t('close')}
        </span>
      </footer>
    </dialog>
  );
}
