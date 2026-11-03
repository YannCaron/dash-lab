import { useCallback, useEffect, useRef, useState } from 'react';
import type { DockviewApi, SerializedDockview } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import type { createLayoutStore } from './layoutStore.js';
import { decodeLayout, presetLayout, validateLayout } from './layoutPersistence.js';
import type { LayoutPreset, SavedLayout } from './layoutPersistence.js';
import { capturePluginStates, restorePluginStates } from '../plugins/pluginState.js';
import type { PluginStateHandler } from '../plugins/pluginState.js';

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
  stateHandlers: Readonly<Record<string, PluginStateHandler>>,
) {
  const baseline = useRef<SerializedDockview | null>(null);
  const initialized = useRef<DockviewApi | null>(null);
  const saved = useRef<SavedLayout | null>(null);
  const observed = useRef('');
  const flushPending = useRef<(() => void) | null>(null);
  const [hasSaved, setHasSaved] = useState(false);
  const [feedback, setFeedback] = useState<LayoutFeedback | null>(null);

  const reportError = useCallback((error: unknown) => {
    setFeedback({ message: error instanceof Error ? error.message : 'The layout could not be updated.', error: true });

    return false;
  }, []);

  const apply = useCallback(
    (snapshot: SavedLayout) => {
      if (!api) return false;

      flushPending.current?.();
      validateLayout(snapshot.layout, panels);

      const previous = api.toJSON();

      restorePluginStates(stateHandlers, snapshot.plugins ?? {}, () => {
        try {
          api.fromJSON(structuredClone(snapshot.layout), { reuseExistingPanels: true });
        } catch (error) {
          api.fromJSON(previous, { reuseExistingPanels: true });
          observed.current = JSON.stringify(api.toJSON());

          throw error;
        }

        observed.current = JSON.stringify(api.toJSON());
        store.getState().setVisibility(snapshot.headerVisible, snapshot.footerVisible);
      });

      return true;
    },
    [api, panels, stateHandlers, store],
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

  const capture = useCallback((): SavedLayout | null => {
    if (!api) return null;

    const { headerVisible, footerVisible } = store.getState();
    const snapshot: SavedLayout = { version: 1, layout: api.toJSON(), headerVisible, footerVisible };
    const plugins = capturePluginStates(stateHandlers);

    if (Object.keys(plugins).length) snapshot.plugins = plugins;

    validateLayout(snapshot.layout, panels);

    return structuredClone(snapshot);
  }, [api, panels, stateHandlers, store]);

  const persistSnapshot = useCallback(
    (snapshot: SavedLayout, silent = false) => {
      const text = JSON.stringify(snapshot);

      if (new TextEncoder().encode(text).byteLength > 1_000_000) throw new Error('Saved layout is too large.');

      saved.current = JSON.parse(text) as SavedLayout;
      setHasSaved(true);

      if (storageKey) {
        try {
          localStorage.setItem(storageKey, text);
        } catch {
          if (!silent) reportError(new Error('Layout kept for this session. Browser storage is unavailable or full.'));

          return false;
        }
      }

      if (!silent) setFeedback({ message: storageKey ? 'Layout saved.' : 'Layout saved for this session.', error: false });

      return true;
    },
    [reportError, storageKey],
  );

  const save = useCallback(
    (silent = false) => {
      try {
        const snapshot = capture();

        return snapshot ? persistSnapshot(snapshot, silent) : false;
      } catch (error) {
        return reportError(error);
      }
    },
    [capture, persistSnapshot, reportError],
  );

  useEffect(() => {
    if (!api) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    let automaticError = '';
    let size = { width: api.width, height: api.height };

    observed.current = JSON.stringify(api.toJSON());

    const persistAutomatically = (read: () => SavedLayout | null) => {
      try {
        const snapshot = read();

        if (!snapshot) return;
        if (!persistSnapshot(snapshot, true)) throw new Error('Layout kept for this session. Browser storage is unavailable or full.');

        automaticError = '';
      } catch (error) {
        const message = error instanceof Error ? error.message : 'The layout could not be updated.';

        if (message !== automaticError) reportError(error);

        automaticError = message;
      }
    };

    const flush = () => {
      if (timer === undefined) return;

      clearTimeout(timer);
      timer = undefined;

      persistAutomatically(capture);
    };

    flushPending.current = flush;

    if (!saved.current) {
      timer = setTimeout(flush, 200);
    }

    const layoutListener = api.onDidLayoutChange(({ reasons }) => {
      const text = JSON.stringify(api.toJSON());
      const resized = size.width !== api.width || size.height !== api.height;

      size = { width: api.width, height: api.height };

      if (text === observed.current) return;

      observed.current = text;

      if (!reasons.has('structure') && !reasons.has('activePanel') && (!reasons.has('geometry') || resized)) return;

      clearTimeout(timer);
      timer = setTimeout(flush, 200);
    });

    const visibilityListener = store.subscribe((state, previous) => {
      if (state.headerVisible === previous.headerVisible && state.footerVisible === previous.footerVisible) return;

      flush();

      // Chrome choices persist without replacing a custom arrangement with the selected preset.
      if (saved.current)
        persistAutomatically(() => saved.current && { ...saved.current, headerVisible: state.headerVisible, footerVisible: state.footerVisible });
    });

    const pageHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', pageHidden);

    return () => {
      layoutListener.dispose();
      visibilityListener();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', pageHidden);
      flush();
      flushPending.current = null;
    };
  }, [api, capture, persistSnapshot, reportError, store]);

  const restore = useCallback(() => {
    flushPending.current?.();

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

  return { save, restore, reset, selectPreset, capture, apply, hasSaved, feedback, ready: api !== null };
}
