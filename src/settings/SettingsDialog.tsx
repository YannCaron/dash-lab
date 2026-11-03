import { useI18n } from '../i18n/I18nProvider.js';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { WorkbenchPreferences } from './configuration.js';
import type { useWorkbenchConfiguration } from './useWorkbenchConfiguration.js';
import type { useLayoutManagement } from '../layout/useLayoutManagement.js';
import type { createLayoutStore } from '../layout/layoutStore.js';
import { useStore } from 'zustand';
import { useCommands } from '../commands/CommandContext.js';
import { useBackdropDismiss } from '../overlays/useBackdropDismiss.js';

export type SettingsPage = 'settings' | 'preferences';
export function SettingsDialog({
  page,
  onClose,
  configuration,
  layout,
  store,
}: {
  page: SettingsPage | null;
  onClose: () => void;
  configuration: ReturnType<typeof useWorkbenchConfiguration>;
  layout: ReturnType<typeof useLayoutManagement>;
  store: ReturnType<typeof createLayoutStore>;
}) {
  const { t, locales } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const backdrop = useBackdropDismiss(onClose);
  const close = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<WorkbenchPreferences>(configuration.preferences);
  const [error, setError] = useState('');
  const titleId = useId();
  const state = useStore(store);
  const { execute } = useCommands();
  const preferences = useRef(configuration.preferences);

  preferences.current = configuration.preferences;

  useEffect(() => {
    if (page) {
      setDraft(structuredClone(preferences.current));
      setError('');

      if (!dialog.current?.open) dialog.current?.showModal();

      close.current?.focus();
    } else dialog.current?.close();
  }, [page]);

  const submit = (event: FormEvent) => {
    event.preventDefault();

    try {
      configuration.savePreferences(draft);
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Preferences could not be applied.');
    }
  };

  return (
    <dialog
      {...backdrop}
      ref={dialog}
      className="dl-settings-dialog dl-modal"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{t(page === 'preferences' ? 'Preferences' : 'Settings')}</h2>
        <button ref={close} type="button" className="dl-icon-button dl-dialog-close" aria-label={t('Close settings')} onClick={onClose}>
          ×
        </button>
      </header>
      {page === 'preferences' ? (
        <form onSubmit={submit}>
          <p>{t('Choose how this application looks and notifies you.')}</p>
          <label className="dl-settings-field">
            {t('Color theme')}
            <select value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value as WorkbenchPreferences['theme'] })}>
              <option value="light">{t('Light')}</option>
              <option value="dark">{t('Dark')}</option>
            </select>
          </label>
          <label className="dl-settings-field">
            {t('Animations')}
            <select value={draft.motion} onChange={(event) => setDraft({ ...draft, motion: event.target.value as WorkbenchPreferences['motion'] })}>
              <option value="system">{t('Follow system')}</option>
              <option value="reduced">{t('Reduce motion')}</option>
            </select>
          </label>
          <label className="dl-settings-field">
            {t('Language')}
            <select aria-label={t('Language')} value={draft.locale ?? 'en'} onChange={(event) => setDraft({ ...draft, locale: event.target.value })}>
              {locales.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
          </label>
          <label className="dl-settings-check">
            <input
              type="checkbox"
              checked={draft.notifications.toastsEnabled}
              onChange={(event) => setDraft({ ...draft, notifications: { ...draft.notifications, toastsEnabled: event.target.checked } })}
            />
            {t('Show notification popups')}
          </label>
          <label className="dl-settings-field">
            {t('Popup duration (seconds)')}
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              required
              value={Number.isFinite(draft.notifications.toastDurationMs) ? draft.notifications.toastDurationMs / 1000 : ''}
              onChange={(event) => setDraft({ ...draft, notifications: { ...draft.notifications, toastDurationMs: event.target.valueAsNumber * 1000 } })}
            />
          </label>
          <p className="dl-settings-hint">
            {t('History is always available. Errors remain visible until dismissed. System reduced-motion preferences always apply.')}
          </p>
          {error && (
            <p role="alert" className="dl-settings-error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose}>
              {t('Cancel')}
            </button>
            <button type="submit" className="dl-settings-primary">
              {t('Apply preferences')}
            </button>
          </footer>
        </form>
      ) : (
        <div>
          <p>{t('Changes apply immediately. Save the layout to restore it on your next visit.')}</p>
          <fieldset>
            <legend>{t('Workspace')}</legend>
            <label className="dl-settings-check">
              <input type="checkbox" checked={state.headerVisible} onChange={state.toggleHeader} />
              {t('Show header')}
            </label>
            <label className="dl-settings-check">
              <input type="checkbox" checked={state.footerVisible} onChange={state.toggleFooter} />
              {t('Show footer')}
            </label>
            <div className="dl-settings-actions">
              <button type="button" disabled={!layout.ready} onClick={() => layout.save()}>
                {t('Save workspace layout')}
              </button>
              <button type="button" disabled={!layout.ready} onClick={() => layout.reset()}>
                {t('Reset workspace layout')}
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>{t('Configuration')}</legend>
            <p>{t('Transfer layout, preferences, and participating plugin data as a JSON file. Notification history stays in this session.')}</p>
            <div className="dl-settings-actions">
              <button
                type="button"
                disabled={!configuration.ready || configuration.busy}
                onClick={() => {
                  void execute('workbench.configuration.import');
                }}
              >
                {t('Import configuration')}
              </button>
              <button
                type="button"
                disabled={!configuration.ready}
                onClick={() => {
                  void execute('workbench.configuration.export');
                }}
              >
                {t('Export configuration')}
              </button>
            </div>
            {configuration.busy && <p role="status">{t('Reading configuration\u2026')}</p>}
          </fieldset>
          <footer>
            <button type="button" onClick={onClose}>
              {t('Close')}
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
