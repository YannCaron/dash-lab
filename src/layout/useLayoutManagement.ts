import { useCallback, useEffect, useRef, useState } from 'react';
import type { DockviewApi, SerializedDockview } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import type { createLayoutStore } from './layoutStore.js';
import { decodeLayout, presetLayout, validateLayout } from './layoutPersistence.js';
import type { LayoutPreset, SavedLayout } from './layoutPersistence.js';
import { capturePluginStates, restorePluginStates } from '../plugins/pluginState.js';
import type { PluginStateHandler } from '../plugins/pluginState.js';
import { applyPanelVisibility } from './panelVisibility.js';

export interface LayoutFeedback {
  message: string;
  error: boolean;
}

function normalLayout(api: DockviewApi): SerializedDockview {
  const layout = api.toJSON();

  // Keep maximization in checkpoint metadata rather than Dockview's grid location.
  delete (layout.grid as { maximizedNode?: unknown }).maximizedNode;

  return layout;
}

export function useLayoutManagement(
  api: DockviewApi | null,
  panels: readonly WorkbenchPanel[],
  store: ReturnType<typeof createLayoutStore>,
  storageKey: string | false,
  onReady: ((api: DockviewApi) => void) | undefined,
  stateHandlers: Readonly<Record<string, PluginStateHandler>>,
  onInitialize?: (api: DockviewApi) => void,
) {
  const baseline = useRef<SerializedDockview | null>(null);
  const initialized = useRef<DockviewApi | null>(null);
  const saved = useRef<SavedLayout | null>(null);
  const observed = useRef('');
  const flushPending = useRef<(() => void) | null>(null);
  const applying = useRef(false);
  const maximizedLayout = useRef<SerializedDockview | null>(null);
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

      const previous = structuredClone(maximizedLayout.current ?? normalLayout(api));
      const previousHidden = store.getState().hiddenPanels;
      const previousMaximized = store.getState().maximizedPanel;
      const previousSize = { width: api.width, height: api.height };

      restorePluginStates(stateHandlers, snapshot.plugins ?? {}, () => {
        applying.current = true;

        try {
          api.exitMaximizedGroup();
          maximizedLayout.current = null;

          if (previousMaximized) api.layout(snapshot.layout.grid.width, snapshot.layout.grid.height);

          api.fromJSON(structuredClone(snapshot.layout), { reuseExistingPanels: true });
          api.exitMaximizedGroup();
          store.getState().setHiddenPanels(snapshot.hiddenPanels ?? []);
          applyPanelVisibility(api, store.getState().hiddenPanels);
          store.getState().setVisibility(snapshot.headerVisible, snapshot.footerVisible);
          const maximized = snapshot.maximizedPanel ?? null;

          if (maximized) {
            api.getPanel(maximized)?.api.setActive();
            maximizedLayout.current = normalLayout(api);

            api.getPanel(maximized)?.api.maximize();

            if (previousMaximized) api.layout(previousSize.width, previousSize.height);
          }

          store.getState().setMaximizedPanel(maximized);
        } catch (error) {
          api.layout(previous.grid.width, previous.grid.height);
          api.fromJSON(previous, { reuseExistingPanels: true });
          api.exitMaximizedGroup();
          store.getState().setHiddenPanels(previousHidden);
          applyPanelVisibility(api, previousHidden);

          maximizedLayout.current = previousMaximized ? previous : null;

          if (previousMaximized) api.getPanel(previousMaximized)?.api.maximize();

          api.layout(previousSize.width, previousSize.height);

          store.getState().setMaximizedPanel(previousMaximized);
          observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));

          throw error;
        } finally {
          applying.current = false;
        }

        observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));
      });

      return true;
    },
    [api, panels, stateHandlers, store],
  );

  useEffect(() => {
    if (!api || initialized.current === api) return;

    initialized.current = api;
    onInitialize?.(api);
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
    store.getState().setMaximizedPanel(api.panels.find((panel) => panel.api.isMaximized() && panel.api.isActive)?.id ?? null);
  }, [api, apply, onInitialize, onReady, panels, reportError, storageKey, store]);

  const capture = useCallback((): SavedLayout | null => {
    if (!api) return null;

    const { headerVisible, footerVisible, hiddenPanels, maximizedPanel } = store.getState();
    const snapshot: SavedLayout = { version: 1, layout: structuredClone(maximizedLayout.current ?? normalLayout(api)), headerVisible, footerVisible };

    if (hiddenPanels.length) snapshot.hiddenPanels = [...hiddenPanels];
    if (maximizedPanel) snapshot.maximizedPanel = maximizedPanel;
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

    observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));

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
      const resized = size.width !== api.width || size.height !== api.height;

      size = { width: api.width, height: api.height };

      if (applying.current || store.getState().maximizedPanel) return;

      const text = JSON.stringify(normalLayout(api));

      if (text === observed.current) return;

      observed.current = text;

      if (!reasons.has('structure') && !reasons.has('activePanel') && (!reasons.has('geometry') || resized)) return;

      clearTimeout(timer);
      timer = setTimeout(flush, 200);
    });

    const visibilityListener = store.subscribe((state, previous) => {
      if (applying.current) return;

      if (state.maximizedPanel !== previous.maximizedPanel) {
        flush();
        observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));
        persistAutomatically(() => (saved.current ? { ...saved.current, maximizedPanel: state.maximizedPanel } : capture()));

        return;
      }

      if (state.hiddenPanels !== previous.hiddenPanels) {
        flush();

        applying.current = true;

        try {
          const previousSize = { width: api.width, height: api.height };

          if (maximizedLayout.current) {
            api.layout(maximizedLayout.current.grid.width, maximizedLayout.current.grid.height);
            api.exitMaximizedGroup();
          }

          applyPanelVisibility(api, state.hiddenPanels);

          if (state.maximizedPanel) {
            api.getPanel(state.maximizedPanel)?.api.setActive();
            maximizedLayout.current = normalLayout(api);
            api.getPanel(state.maximizedPanel)?.api.maximize();
            api.layout(previousSize.width, previousSize.height);
          }
        } finally {
          applying.current = false;
        }

        observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));
        persistAutomatically(capture);

        return;
      }

      if (state.headerVisible === previous.headerVisible && state.footerVisible === previous.footerVisible) return;

      flush();

      // Chrome choices persist without replacing a custom arrangement with the selected preset.
      if (saved.current)
        persistAutomatically(() => saved.current && { ...saved.current, headerVisible: state.headerVisible, footerVisible: state.footerVisible });
    });

    const maximizedListener = api.onDidMaximizedGroupChange((event) => {
      if (applying.current) return;

      if (event.isMaximized) maximizedLayout.current ??= normalLayout(api);
      else if (maximizedLayout.current) {
        applying.current = true;

        try {
          api.layout(maximizedLayout.current.grid.width, maximizedLayout.current.grid.height);
          api.fromJSON(structuredClone(maximizedLayout.current), { reuseExistingPanels: true });
          applyPanelVisibility(api, store.getState().hiddenPanels);
          maximizedLayout.current = null;
        } finally {
          applying.current = false;
        }
      }

      store.getState().setMaximizedPanel(event.isMaximized ? (event.group.activePanel?.id ?? null) : null);
      observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));
    });
    const activeListener = api.onDidActivePanelChange((event) => {
      if (!applying.current && event.panel?.api.isMaximized()) store.getState().setMaximizedPanel(event.panel.id);
    });

    const pageHidden = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', pageHidden);

    return () => {
      layoutListener.dispose();
      visibilityListener();
      maximizedListener.dispose();
      activeListener.dispose();
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
        const { headerVisible, footerVisible, hiddenPanels } = store.getState();

        apply({ version: 1, layout: presetLayout(baseline.current, preset, panels), headerVisible, footerVisible, hiddenPanels });

        if (saved.current?.maximizedPanel && !persistSnapshot({ ...saved.current, maximizedPanel: null }, true)) {
          return reportError(new Error('Layout kept for this session. Browser storage is unavailable or full.'));
        }

        setFeedback({ message: `${preset === 'default' ? 'Application' : preset === 'columns' ? 'Columns' : 'Rows'} layout selected.`, error: false });

        return true;
      } catch (error) {
        return reportError(error);
      }
    },
    [api, apply, panels, persistSnapshot, reportError, store],
  );

  const reset = useCallback(() => {
    if (!baseline.current) return false;

    try {
      const { headerVisible, footerVisible } = store.getInitialState();

      if (!apply({ version: 1, layout: baseline.current, headerVisible, footerVisible })) return false;

      if (saved.current?.maximizedPanel && !persistSnapshot({ ...saved.current, maximizedPanel: null }, true)) {
        return reportError(new Error('Layout kept for this session. Browser storage is unavailable or full.'));
      }

      setFeedback({ message: saved.current ? 'Application layout reset. Your saved layout is still available.' : 'Application layout reset.', error: false });

      return true;
    } catch (error) {
      return reportError(error);
    }
  }, [apply, persistSnapshot, reportError, store]);

  const toggleMaximized = useCallback(
    (id: string) => {
      const panel = api?.getPanel(id);

      if (!api || !panel || store.getState().hiddenPanels.includes(id)) return;

      flushPending.current?.();

      const maximized = store.getState().maximizedPanel === id ? null : id;
      const previousSize = { width: api.width, height: api.height };
      const wasMaximized = maximizedLayout.current !== null;

      applying.current = true;

      try {
        if (maximizedLayout.current) {
          api.layout(maximizedLayout.current.grid.width, maximizedLayout.current.grid.height);
        }

        api.exitMaximizedGroup();
        maximizedLayout.current = null;
        panel.api.setActive();

        if (maximized) {
          maximizedLayout.current = normalLayout(api);

          panel.api.maximize();

          if (wasMaximized) api.layout(previousSize.width, previousSize.height);
        }
      } finally {
        applying.current = false;
      }

      store.getState().setMaximizedPanel(maximized);
      observed.current = JSON.stringify(maximizedLayout.current ?? normalLayout(api));
    },
    [api, store],
  );

  const restoreMaximized = useCallback(() => {
    const id = store.getState().maximizedPanel;

    if (id) toggleMaximized(id);
  }, [store, toggleMaximized]);

  const setPanelVisible = useCallback(
    (id: string, visible: boolean) => {
      if (!api || !panels.some((panel) => panel.id === id)) return;

      const hidden = store.getState().hiddenPanels;

      if (visible === !hidden.includes(id)) return;

      if (!visible && store.getState().maximizedPanel === id) restoreMaximized();

      store.getState().setHiddenPanels(visible ? hidden.filter((panelId) => panelId !== id) : [...hidden, id]);

      if (visible) api.getPanel(id)?.api.setActive();
    },
    [api, panels, store, restoreMaximized],
  );

  return { save, restore, reset, selectPreset, capture, apply, setPanelVisible, toggleMaximized, restoreMaximized, hasSaved, feedback, ready: api !== null };
}
