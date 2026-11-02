import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { WorkbenchPreferences } from './configuration.js';
import type { useWorkbenchConfiguration } from './useWorkbenchConfiguration.js';
import type { useLayoutManagement } from '../layout/useLayoutManagement.js';
import type { createLayoutStore } from '../layout/layoutStore.js';
import { useStore } from 'zustand';
import { useCommands } from '../commands/CommandContext.js';

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
  const dialog = useRef<HTMLDialogElement>(null);
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
      ref={dialog}
      className="dl-settings-dialog"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id={titleId}>{page === 'preferences' ? 'Preferences' : 'Settings'}</h2>
        <button ref={close} type="button" className="dl-icon-button" aria-label="Close settings" onClick={onClose}>
          ×
        </button>
      </header>
      {page === 'preferences' ? (
        <form onSubmit={submit}>
          <p>Choose how this application looks and notifies you.</p>
          <label className="dl-settings-field">
            Color theme
            <select value={draft.theme} onChange={(event) => setDraft({ ...draft, theme: event.target.value as WorkbenchPreferences['theme'] })}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="dl-settings-field">
            Animations
            <select value={draft.motion} onChange={(event) => setDraft({ ...draft, motion: event.target.value as WorkbenchPreferences['motion'] })}>
              <option value="system">Follow system</option>
              <option value="reduced">Reduce motion</option>
            </select>
          </label>
          <label className="dl-settings-check">
            <input
              type="checkbox"
              checked={draft.notifications.toastsEnabled}
              onChange={(event) => setDraft({ ...draft, notifications: { ...draft.notifications, toastsEnabled: event.target.checked } })}
            />
            Show notification popups
          </label>
          <label className="dl-settings-field">
            Popup duration (seconds)
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
            History is always available. Errors remain visible until dismissed. System reduced-motion preferences always apply.
          </p>
          {error && (
            <p role="alert" className="dl-settings-error">
              {error}
            </p>
          )}
          <footer>
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dl-settings-primary">
              Apply preferences
            </button>
          </footer>
        </form>
      ) : (
        <div>
          <p>Changes apply immediately. Save the layout to restore it on your next visit.</p>
          <fieldset>
            <legend>Workspace</legend>
            <label className="dl-settings-check">
              <input type="checkbox" checked={state.headerVisible} onChange={state.toggleHeader} />
              Show header
            </label>
            <label className="dl-settings-check">
              <input type="checkbox" checked={state.footerVisible} onChange={state.toggleFooter} />
              Show footer
            </label>
            <div className="dl-settings-actions">
              <button type="button" disabled={!layout.ready} onClick={() => layout.save()}>
                Save workspace layout
              </button>
              <button type="button" disabled={!layout.ready} onClick={() => layout.reset()}>
                Reset workspace layout
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>Configuration</legend>
            <p>Transfer the layout and preferences as a JSON file. Panel contents and notification history stay in this session.</p>
            <div className="dl-settings-actions">
              <button
                type="button"
                disabled={!configuration.ready || configuration.busy}
                onClick={() => {
                  void execute('workbench.configuration.import');
                }}
              >
                Import configuration
              </button>
              <button
                type="button"
                disabled={!configuration.ready}
                onClick={() => {
                  void execute('workbench.configuration.export');
                }}
              >
                Export configuration
              </button>
            </div>
            {configuration.busy && <p role="status">Reading configuration…</p>}
          </fieldset>
          <footer>
            <button type="button" onClick={onClose}>
              Close
            </button>
          </footer>
        </div>
      )}
    </dialog>
  );
}
