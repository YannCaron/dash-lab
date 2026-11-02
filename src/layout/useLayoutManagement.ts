import { useCallback, useEffect, useRef, useState } from 'react';
import type { DockviewApi, SerializedDockview } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import type { createLayoutStore } from './layoutStore.js';
import { decodeLayout, presetLayout, validateLayout } from './layoutPersistence.js';
import type { LayoutPreset, SavedLayout } from './layoutPersistence.js';

export interface LayoutFeedback {
  message: string;
  error: boolean;
}

export function useLayoutManagement(
  api: DockviewApi | null,
  panels: readonly WorkbenchPanel[],
  store: ReturnType<typeof createLayoutStore>,
  storageKey: string | false,
  onReady: ((api: DockviewApi) => void) | undefined,
) {
  const baseline = useRef<SerializedDockview | null>(null);
  const initialized = useRef<DockviewApi | null>(null);
  const saved = useRef<SavedLayout | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [feedback, setFeedback] = useState<LayoutFeedback | null>(null);

  const reportError = useCallback((error: unknown) => {
    setFeedback({ message: error instanceof Error ? error.message : 'The layout could not be updated.', error: true });
    return false;
  }, []);

  const apply = useCallback(
    (snapshot: SavedLayout) => {
      if (!api) return false;
      validateLayout(snapshot.layout, panels);
      const previous = api.toJSON();
      try {
        api.fromJSON(structuredClone(snapshot.layout), { reuseExistingPanels: true });
      } catch (error) {
        api.fromJSON(previous, { reuseExistingPanels: true });
        throw error;
      }
      store.getState().setVisibility(snapshot.headerVisible, snapshot.footerVisible);
      return true;
    },
    [api, panels, store],
  );

  useEffect(() => {
    if (!api || initialized.current === api) return;
    initialized.current = api;
    baseline.current = structuredClone(api.toJSON());
    if (storageKey) {
      try {
        const text = localStorage.getItem(storageKey);
        if (text) {
          const snapshot = decodeLayout(text, panels);
          apply(snapshot);
          saved.current = snapshot;
          setHasSaved(true);
          setFeedback({ message: 'Saved layout restored.', error: false });
        }
      } catch (error) {
        reportError(error);
      }
    }
    onReady?.(api);
  }, [api, apply, onReady, panels, reportError, storageKey]);

  const save = useCallback(() => {
    if (!api) return false;
    try {
      const { headerVisible, footerVisible } = store.getState();
      const snapshot: SavedLayout = { version: 1, layout: api.toJSON(), headerVisible, footerVisible };
      validateLayout(snapshot.layout, panels);
      const text = JSON.stringify(snapshot);
      saved.current = JSON.parse(text) as SavedLayout;
      setHasSaved(true);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, text);
        } catch {
          return reportError(new Error('Layout kept for this session. Browser storage is unavailable or full.'));
        }
      }
      setFeedback({ message: storageKey ? 'Layout saved.' : 'Layout saved for this session.', error: false });
      return true;
    } catch (error) {
      return reportError(error);
    }
  }, [api, panels, reportError, storageKey, store]);

  const restore = useCallback(() => {
    if (!saved.current) return false;
    try {
      if (!apply(saved.current)) return false;
      setFeedback({ message: 'Saved layout restored.', error: false });
      return true;
    } catch (error) {
      return reportError(error);
    }
  }, [apply, reportError]);

  const selectPreset = useCallback(
    (preset: LayoutPreset) => {
      if (!api || !baseline.current) return false;
      try {
        const { headerVisible, footerVisible } = store.getState();
        apply({ version: 1, layout: presetLayout(baseline.current, preset, panels), headerVisible, footerVisible });
        setFeedback({ message: `${preset === 'default' ? 'Application' : preset === 'columns' ? 'Columns' : 'Rows'} layout selected.`, error: false });
        return true;
      } catch (error) {
        return reportError(error);
      }
    },
    [api, apply, panels, reportError, store],
  );

  const reset = useCallback(() => {
    if (!baseline.current) return false;
    try {
      const { headerVisible, footerVisible } = store.getInitialState();
      if (!apply({ version: 1, layout: baseline.current, headerVisible, footerVisible })) return false;
      setFeedback({ message: saved.current ? 'Application layout reset. Your saved layout is still available.' : 'Application layout reset.', error: false });
      return true;
    } catch (error) {
      return reportError(error);
    }
  }, [apply, reportError, store]);

  return { save, restore, reset, selectPreset, hasSaved, feedback, ready: api !== null };
}
