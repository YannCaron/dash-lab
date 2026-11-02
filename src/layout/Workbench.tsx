import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DockviewApi } from 'dockview-react';
import { useStore } from 'zustand';
import { DockWorkspace } from './DockWorkspace.js';
import { createLayoutStore } from './layoutStore.js';
import type { WorkbenchPanel } from './panels.js';
import { ThemeContext, ThemeProvider } from '../theme/ThemeProvider.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';
import { LayoutControls } from './LayoutControls.js';
import { useLayoutManagement } from './useLayoutManagement.js';
import { NotificationContext, useNotifications } from '../notifications/NotificationContext.js';
import { NotificationProvider } from '../notifications/NotificationProvider.js';
import { NotificationButton } from '../notifications/NotificationButton.js';
import { CommandContext } from '../commands/CommandContext.js';
import { CommandProvider } from '../commands/CommandProvider.js';
import { useWorkbenchCommands } from './useWorkbenchCommands.js';
import { CommandPalette } from '../commands/CommandPalette.js';
import { ApplicationMenu } from '../settings/ApplicationMenu.js';
import { SettingsDialog } from '../settings/SettingsDialog.js';
import type { SettingsPage } from '../settings/SettingsDialog.js';
import { useWorkbenchConfiguration } from '../settings/useWorkbenchConfiguration.js';
import { emptyContributions, PluginContext, usePluginCommands } from '../plugins/PluginContext.js';
import type { PluginRegistry } from '../plugins/PluginRegistry.js';

/** Properties of the reusable application workbench. */
export interface WorkbenchProps {
  /** Accessible name of this application. */
  title: string;
  /** Optional text shown next to the application title. */
  subtitle?: string;
  /** Optional application mark displayed before the title. */
  logo?: ReactNode;
  /** Application actions displayed in the header. */
  headerActions?: ReactNode;
  /** Application controls displayed before the workbench controls. */
  controlBar?: ReactNode;
  /** Application monitoring information displayed below the controls. */
  monitoringBar?: ReactNode;
  /** Application footer content. */
  footer?: ReactNode;
  /** Initial panel definitions; keep this collection stable for the lifetime of the workbench. */
  panels?: readonly WorkbenchPanel[];
  /** Startup plugin registry; contributions are sealed on mount. Keep stable until the workbench is unmounted. */
  plugins?: PluginRegistry;
  /** Called once after the initial panels and any compatible saved layout are ready. */
  onWorkspaceReady?: (api: DockviewApi) => void;
  /** Whether the header is shown on first mount. Defaults to true. */
  initialHeaderVisible?: boolean;
  /** Whether the footer is shown on first mount. Defaults to true. */
  initialFooterVisible?: boolean;
  /** Browser storage key for explicitly saved layouts. Defaults to a title-based key; false keeps saves in memory. Keep stable while mounted. */
  layoutStorageKey?: string | false;
  /** Storage key for automatically saved preferences. Defaults to a title-based key; false keeps preferences in memory. Keep stable while mounted. */
  preferencesStorageKey?: string | false;
  /** Fallback content displayed when no panels are supplied. */
  children?: ReactNode;
}

const emptyPanels: readonly WorkbenchPanel[] = [];

function ChromeIcon({ name }: { name: 'view' | 'focus' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {name === 'focus' ? (
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M3 9h18M3 15h18" />
        </>
      )}
    </svg>
  );
}

/** Composes application chrome and a dockable workspace without owning application content. */
export function Workbench(props: WorkbenchProps) {
  const theme = useContext(ThemeContext);
  return theme ? (
    <WorkbenchNotifications {...props} />
  ) : (
    <ThemeProvider>
      <WorkbenchNotifications {...props} />
    </ThemeProvider>
  );
}

function WorkbenchNotifications(props: WorkbenchProps) {
  const notifications = useContext(NotificationContext);
  return notifications ? (
    <WorkbenchCommands {...props} />
  ) : (
    <NotificationProvider>
      <WorkbenchCommands {...props} />
    </NotificationProvider>
  );
}

function WorkbenchCommands(props: WorkbenchProps) {
  const commands = useContext(CommandContext);
  return commands ? (
    <WorkbenchShell {...props} />
  ) : (
    <CommandProvider>
      <WorkbenchShell {...props} />
    </CommandProvider>
  );
}

function WorkbenchShell({
  title,
  subtitle,
  logo,
  headerActions,
  controlBar,
  monitoringBar,
  footer,
  panels: applicationPanels = emptyPanels,
  plugins,
  onWorkspaceReady,
  initialHeaderVisible = true,
  initialFooterVisible = true,
  layoutStorageKey,
  preferencesStorageKey,
  children,
}: WorkbenchProps) {
  const [contributions] = useState(() => plugins?.seal() ?? emptyContributions);
  const panels = useMemo(() => [...contributions.panels, ...applicationPanels], [contributions, applicationPanels]);
  const [store] = useState(() => createLayoutStore(initialHeaderVisible, initialFooterVisible));
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [storageKey] = useState(() => layoutStorageKey ?? `dash-lab:${encodeURIComponent(title)}:layout:v1`);
  const layout = useLayoutManagement(api, panels, store, storageKey, onWorkspaceReady);
  const [preferenceKey] = useState(() => preferencesStorageKey ?? `dash-lab:${encodeURIComponent(title)}:preferences:v1`);
  const configuration = useWorkbenchConfiguration(layout, panels, preferenceKey);
  const [settingsPage, setSettingsPage] = useState<SettingsPage | null>(null);
  const closeSettings = useCallback(() => setSettingsPage(null), []);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);
  const handleKeyDown = useWorkbenchCommands(store, layout, openPalette, {
    openSettings: () => setSettingsPage('settings'),
    openPreferences: () => setSettingsPage('preferences'),
    importConfiguration: configuration.chooseImport,
    exportConfiguration: configuration.exportConfiguration,
    ready: configuration.ready,
    busy: configuration.busy,
  });
  usePluginCommands(contributions);
  const root = useRef<HTMLElement>(null);
  const { notify } = useNotifications();
  const reportedFeedback = useRef(layout.feedback);
  const state = useStore(store);
  const exitFocus = useRef<HTMLButtonElement>(null);
  const enterFocus = useRef<HTMLButtonElement>(null);
  const wasFocused = useRef(false);

  useEffect(() => {
    if (document.activeElement === document.body) root.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (layout.feedback && reportedFeedback.current !== layout.feedback) {
      reportedFeedback.current = layout.feedback;
      notify({ title: layout.feedback.message, level: layout.feedback.error ? 'error' : 'info' });
    }
  }, [layout.feedback, notify]);

  useEffect(() => {
    if (state.focusMode) exitFocus.current?.focus();
    else if (wasFocused.current) enterFocus.current?.focus();
    wasFocused.current = state.focusMode;
  }, [state.focusMode]);

  return (
    <PluginContext.Provider value={contributions}>
      <section className="dl-workbench" ref={root} tabIndex={-1} aria-label={title} data-focus-mode={state.focusMode} onKeyDown={handleKeyDown}>
        {!state.focusMode && state.headerVisible && (
          <header className="dl-header">
            <div className="dl-identity">
              {logo}
              <strong>{title}</strong>
              {subtitle && <span className="dl-subtitle">{subtitle}</span>}
            </div>
            <div className="dl-header-actions">{headerActions}</div>
          </header>
        )}

        {!state.focusMode && (
          <div className="dl-control-bar" role="toolbar" aria-label="Workbench controls">
            <div className="dl-application-controls">
              <ApplicationMenu />
              {controlBar}
            </div>
            <div className="dl-view-controls">
              <button
                type="button"
                className="dl-icon-button dl-palette-trigger"
                aria-label="Open command palette"
                aria-haspopup="dialog"
                aria-expanded={paletteOpen}
                title="Commands (Ctrl/⌘+Shift+P)"
                onClick={openPalette}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <circle cx="10" cy="10" r="6" />
                  <path d="m15 15 6 6" />
                </svg>
                <span>Commands</span>
              </button>
              <span className="dl-divider" />
              <NotificationButton />
              <span className="dl-divider" />
              <LayoutControls layout={layout} />
              <span className="dl-divider" />
              <ThemeToggle />
              <span className="dl-divider" />
              <button
                type="button"
                className="dl-icon-button"
                aria-label={state.headerVisible || state.footerVisible ? 'Hide header and footer' : 'Show header and footer'}
                title="Toggle header and footer (Ctrl/⌘+Alt+V)"
                aria-pressed={state.headerVisible !== state.footerVisible ? 'mixed' : state.headerVisible}
                onClick={state.toggleView}
              >
                <ChromeIcon name="view" />
                <span>View</span>
              </button>
              <span className="dl-divider" />
              <button
                type="button"
                ref={enterFocus}
                className="dl-icon-button dl-focus-button"
                aria-label="Enter focus mode"
                title="Focus workspace"
                onClick={state.toggleFocus}
              >
                <ChromeIcon name="focus" />
                <span>Focus</span>
              </button>
            </div>
          </div>
        )}

        {!state.focusMode && (monitoringBar || contributions.monitoringItems.length > 0) && (
          <aside className="dl-monitoring-bar" aria-label="Monitoring">
            {monitoringBar}
            {contributions.monitoringItems.map(({ id, component: Component }) => (
              <span key={id} data-plugin-monitoring-item={id}>
                <Component />
              </span>
            ))}
          </aside>
        )}
        <main className="dl-workspace" aria-label="Workspace">
          {panels.length ? (
            <DockWorkspace panels={panels} onReady={setApi} />
          ) : (
            <div className="dl-empty-workspace">{children ?? 'No panels have been added to this workspace.'}</div>
          )}
        </main>
        {!state.focusMode && state.footerVisible && (footer || contributions.statusItems.length > 0) && (
          <footer className="dl-footer">
            {footer}
            {contributions.statusItems.map(({ id, component: Component }) => (
              <span key={id} data-plugin-status-item={id}>
                <Component />
              </span>
            ))}
          </footer>
        )}
        <CommandPalette open={paletteOpen} onClose={closePalette} />
        <SettingsDialog page={settingsPage} onClose={closeSettings} configuration={configuration} layout={layout} store={store} />
        <input
          type="file"
          ref={configuration.input}
          hidden
          accept="application/json,.json"
          aria-label="Import configuration file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) void configuration.importFile(file);
          }}
        />
        {state.focusMode && (
          <button ref={exitFocus} type="button" className="dl-exit-focus" onClick={state.toggleFocus}>
            Exit focus mode <kbd>Esc</kbd>
          </button>
        )}
      </section>
    </PluginContext.Provider>
  );
}
