import { useCallback, useEffect, useRef, useState } from 'react';
import { useTheme } from '../theme/ThemeProvider.js';
import { useNotifications } from '../notifications/NotificationContext.js';
import type { WorkbenchPanel } from '../layout/panels.js';
import type { useLayoutManagement } from '../layout/useLayoutManagement.js';
import { configurationSizeLimit, decodeConfiguration, validatePreferences } from './configuration.js';
import type { WorkbenchConfiguration, WorkbenchPreferences } from './configuration.js';
import { useI18n } from '../i18n/I18nProvider.js';

export function useWorkbenchConfiguration(layout: ReturnType<typeof useLayoutManagement>, panels: readonly WorkbenchPanel[], storageKey: string | false) {
  const { locale, setLocale, assertLocale, t } = useI18n();
  const { mode, motionPreference, setMode, setMotionPreference } = useTheme();
  const { preferences: notifications, setPreferences: setNotifications, notify } = useNotifications();
  const preferences: WorkbenchPreferences = { locale, theme: mode, motion: motionPreference, notifications };
  const serialized = JSON.stringify(preferences);
  const previous = useRef(serialized);
  const initialized = useRef(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const currentLayout = useRef(layout);

  currentLayout.current = layout;

  const apply = useCallback(
    (value: WorkbenchPreferences) => {
      const next = validatePreferences(value);

      assertLocale(next.locale ?? 'en');
      setLocale(next.locale ?? 'en');
      setMode(next.theme);
      setMotionPreference(next.motion);
      setNotifications(next.notifications);

      return next;
    },
    [setMode, setMotionPreference, setNotifications, setLocale, assertLocale],
  );

  const persist = useCallback(
    (value: WorkbenchPreferences) => {
      previous.current = JSON.stringify(value);

      if (!storageKey) return true;

      try {
        localStorage.setItem(storageKey, JSON.stringify({ version: 1, preferences: value }));

        return true;
      } catch {
        return false;
      }
    },
    [storageKey],
  );

  useEffect(() => {
    if (initialized.current) return;

    initialized.current = true;

    try {
      const text = storageKey ? localStorage.getItem(storageKey) : null;

      if (text) {
        if (text.length > configurationSizeLimit) throw new Error('Saved preferences exceed the size limit.');

        const saved = JSON.parse(text) as {
          version?: unknown;
          preferences?: unknown;
        } | null;

        if (!saved || saved.version !== 1) throw new Error('Saved preferences have an unsupported version.');

        const next = apply(validatePreferences(saved.preferences));

        previous.current = JSON.stringify(next);
      }
    } catch (error) {
      notify({
        title: t('Preferences could not be restored'),
        description: t(error instanceof Error ? error.message : 'Browser storage is unavailable.'),
        level: 'warning',
      });
    }

    setLoaded(true);
  }, [apply, notify, storageKey, t]);

  useEffect(() => {
    if (!loaded || serialized === previous.current) return;
    if (!persist(JSON.parse(serialized) as WorkbenchPreferences)) {
      notify({ title: t('Preferences kept for this session'), description: t('Browser storage is unavailable or full.'), level: 'warning' });
    }
  }, [loaded, serialized, persist, notify, t]);

  const savePreferences = useCallback(
    (value: WorkbenchPreferences) => {
      const persisted = persist(apply(value));

      notify({
        title: t(persisted ? (storageKey ? 'Preferences saved.' : 'Preferences applied for this session.') : 'Preferences kept for this session'),
        ...(persisted ? {} : { description: 'Browser storage is unavailable or full.' }),
        level: persisted ? 'success' : 'warning',
      });
    },
    [apply, persist, notify, storageKey, t],
  );

  const importFile = useCallback(
    async (file: File) => {
      setBusy(true);

      try {
        if (file.size > configurationSizeLimit) throw new Error('Configuration exceeds the 1 MB limit.');

        const configuration = decodeConfiguration(await file.text(), panels);

        assertLocale(configuration.preferences.locale ?? 'en');

        if (configuration.workspace && !currentLayout.current.apply(configuration.workspace)) throw new Error('The workspace is not ready yet.');

        const preferencesSaved = persist(apply(configuration.preferences));
        const layoutSaved = !configuration.workspace || currentLayout.current.save(true);
        const persisted = preferencesSaved && layoutSaved;

        notify({
          title: t(persisted ? 'Configuration imported.' : 'Configuration imported for this session'),
          ...(persisted ? {} : { description: 'Browser storage is unavailable or full. Export a copy to keep these choices.' }),
          level: persisted ? 'success' : 'warning',
        });
      } catch (error) {
        notify({
          title: t('Configuration could not be imported'),
          description: t(error instanceof Error ? error.message : 'The file could not be read.'),
          level: 'error',
        });
      } finally {
        setBusy(false);
      }
    },
    [apply, panels, persist, notify, assertLocale, t],
  );

  const exportConfiguration = useCallback(() => {
    const configuration: WorkbenchConfiguration = {
      format: 'dash-lab',
      version: 1,
      workspace: currentLayout.current.capture(),
      preferences: JSON.parse(serialized) as WorkbenchPreferences,
    };

    if (panels.length && !configuration.workspace) throw new Error('The workspace is not ready yet.');

    const text = JSON.stringify(configuration, null, 2);

    if (new TextEncoder().encode(text).byteLength > configurationSizeLimit) throw new Error('Configuration exceeds the 1 MB limit.');

    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = 'dash-lab-configuration.json';
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify({ title: t('Configuration exported.'), level: 'success' });
  }, [serialized, panels.length, notify, t]);

  const chooseImport = useCallback(() => input.current?.click(), []);

  return { preferences, savePreferences, importFile, chooseImport, exportConfiguration, input, busy, ready: loaded && (!panels.length || layout.ready) };
}
