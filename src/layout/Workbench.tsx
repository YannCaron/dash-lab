import { CompressOutlined, ExpandOutlined, BorderHorizontalOutlined, SearchOutlined } from '@ant-design/icons';
import { I18nContext, I18nProvider, useI18n } from '../i18n/I18nProvider.js';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DockviewApi } from 'dockview-react';
import { useStore } from 'zustand';
import { ConfigProvider } from 'antd';
import { CompactContext } from './CompactContext.js';
import { PanelControlsContext } from './PanelControlsContext.js';
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
  /** Configure initial panel sizes/selection before capturing the Application preset and loading a saved layout. Called once; keep panel identities intact. */
  onWorkspaceInitialize?: (api: DockviewApi) => void;
  /** Whether the header is shown on first mount. Defaults to true. */
  initialHeaderVisible?: boolean;
  /** Whether the footer is shown on first mount. Defaults to true. */
  initialFooterVisible?: boolean;
  /** Browser storage key for the automatically saved custom layout. Defaults to a title-based key; false keeps it in memory. Keep stable while mounted. */
  layoutStorageKey?: string | false;
  /** Storage key for automatically saved preferences. Defaults to a title-based key; false keeps preferences in memory. Keep stable while mounted. */
  preferencesStorageKey?: string | false;
  /** Fallback content displayed when no panels are supplied. */
  children?: ReactNode;
}

const emptyPanels: readonly WorkbenchPanel[] = [];

/** Composes application chrome and a dockable workspace without owning application content. */
export function Workbench(props: WorkbenchProps) {
  const language = useContext(I18nContext);

  return language ? (
    <WorkbenchTheme {...props} />
  ) : (
    <I18nProvider>
      <WorkbenchTheme {...props} />
    </I18nProvider>
  );
}

function WorkbenchTheme(props: WorkbenchProps) {
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
  onWorkspaceInitialize,
  initialHeaderVisible = true,
  initialFooterVisible = true,
  layoutStorageKey,
  preferencesStorageKey,
  children,
}: WorkbenchProps) {
  const { t } = useI18n();
  const [contributions] = useState(() => plugins?.seal() ?? emptyContributions);
  const panels = useMemo(() => [...contributions.panels, ...applicationPanels], [contributions, applicationPanels]);
  const [store] = useState(() => createLayoutStore(initialHeaderVisible, initialFooterVisible));
  const [api, setApi] = useState<DockviewApi | null>(null);
  const [storageKey] = useState(() => layoutStorageKey ?? `dash-lab:${encodeURIComponent(title)}:layout:v1`);
  const layout = useLayoutManagement(api, panels, store, storageKey, onWorkspaceReady, contributions.stateHandlers, onWorkspaceInitialize);
  const [preferenceKey] = useState(() => preferencesStorageKey ?? `dash-lab:${encodeURIComponent(title)}:preferences:v1`);
  const configuration = useWorkbenchConfiguration(layout, panels, preferenceKey, contributions.stateHandlers, store);
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
  const previousMaximized = useRef<string | null>(null);

  useEffect(() => {
    const id = state.maximizedPanel ?? previousMaximized.current;

    if (id) {
      const button = [...(root.current?.querySelectorAll<HTMLButtonElement>('[data-panel-maximize]') ?? [])].find((node) => node.dataset.panelMaximize === id);

      if (button && !state.hiddenPanels.includes(id)) button.focus();
      else root.current?.querySelector<HTMLButtonElement>('[data-visible-tabs-trigger]')?.focus();
    }

    previousMaximized.current = state.maximizedPanel;
  }, [state.maximizedPanel, state.hiddenPanels]);

  useEffect(() => {
    if (document.activeElement === document.body) root.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (layout.feedback && reportedFeedback.current !== layout.feedback) {
      reportedFeedback.current = layout.feedback;
      notify({ title: t(layout.feedback.message), level: layout.feedback.error ? 'error' : 'info' });
    }
  }, [layout.feedback, notify, t]);

  useEffect(() => {
    if (state.focusMode) exitFocus.current?.focus();
    else if (wasFocused.current) enterFocus.current?.focus();

    wasFocused.current = state.focusMode;
  }, [state.focusMode]);

  return (
    <PluginContext.Provider value={contributions}>
      <CompactContext.Provider value={state.compact}>
        <PanelControlsContext.Provider
          value={{
            hiddenPanels: state.hiddenPanels,
            setPanelVisible: layout.setPanelVisible,
            maximizedPanel: state.maximizedPanel,
            toggleMaximized: layout.toggleMaximized,
          }}
        >
          <ConfigProvider componentSize={state.compact ? 'small' : 'middle'}>
            <section
              className="dl-workbench"
              ref={root}
              tabIndex={-1}
              aria-label={t(title ?? '')}
              data-focus-mode={state.focusMode}
              data-compact={state.compact}
              data-maximized-panel={state.maximizedPanel ?? undefined}
              onKeyDown={handleKeyDown}
            >
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
                <div className="dl-control-bar" role="toolbar" aria-label={t('Workbench controls')}>
                  <div className="dl-application-controls">
                    <ApplicationMenu />
                    {controlBar}
                  </div>
                  <div className="dl-view-controls">
                    <button
                      type="button"
                      className="dl-icon-button dl-palette-trigger"
                      aria-label={t('Open command palette')}
                      aria-haspopup="dialog"
                      aria-expanded={paletteOpen}
                      title={t('Commands (Ctrl/\u2318+Shift+P)')}
                      onClick={openPalette}
                    >
                      <SearchOutlined />
                      <span className="dl-control-label">{t('Commands')}</span>
                    </button>
                    <span className="dl-divider" />
                    <NotificationButton />
                    <span className="dl-divider" />
                    <LayoutControls layout={layout} panels={panels} hiddenPanels={state.hiddenPanels} />
                    <button
                      type="button"
                      className="dl-icon-button"
                      aria-label={t('Compact mode')}
                      title={t('Compact mode')}
                      aria-pressed={state.compact}
                      onClick={state.toggleCompact}
                    >
                      <CompressOutlined />
                    </button>
                    <span className="dl-divider" />
                    <ThemeToggle />
                    <span className="dl-divider" />
                    <button
                      type="button"
                      className="dl-icon-button"
                      aria-label={t(state.headerVisible || state.footerVisible ? 'Hide header and footer' : 'Show header and footer')}
                      title={t('Toggle header and footer (Ctrl/\u2318+Alt+V)')}
                      aria-pressed={state.headerVisible !== state.footerVisible ? 'mixed' : state.headerVisible}
                      onClick={state.toggleView}
                    >
                      <BorderHorizontalOutlined />
                      <span className="dl-control-label">{t('View')}</span>
                    </button>
                    <span className="dl-divider" />
                    <button
                      type="button"
                      ref={enterFocus}
                      className="dl-icon-button dl-focus-button"
                      aria-label={t('Enter focus mode')}
                      title={t('Focus workspace')}
                      onClick={state.toggleFocus}
                    >
                      <ExpandOutlined />
                      <span className="dl-control-label">{t('Focus')}</span>
                    </button>
                  </div>
                </div>
              )}

              {!state.focusMode && (monitoringBar || contributions.monitoringItems.length > 0) && (
                <aside className="dl-monitoring-bar dl-compact-optional" aria-label={t('Monitoring')}>
                  {monitoringBar}
                  {contributions.monitoringItems.map(({ id, component: Component }) => (
                    <span key={id} data-plugin-monitoring-item={id}>
                      <Component />
                    </span>
                  ))}
                </aside>
              )}
              <main className="dl-workspace" aria-label={t('Workspace')}>
                {panels.length > 0 && state.hiddenPanels.length === panels.length && (
                  <p className="dl-hidden-workspace" role="status">
                    {t('All tabs are hidden. Use Visible tabs to show a panel.')}
                  </p>
                )}
                {panels.length ? (
                  <DockWorkspace panels={panels} onReady={setApi} />
                ) : (
                  <div className="dl-empty-workspace">{children ?? t('No panels have been added to this workspace.')}</div>
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
                aria-label={t('Import configuration file')}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  event.target.value = '';

                  if (file) void configuration.importFile(file);
                }}
              />
              {state.focusMode && (
                <button ref={exitFocus} type="button" className="dl-exit-focus" onClick={state.toggleFocus}>
                  {t('Exit focus mode')}
                  <kbd>{t('Esc')}</kbd>
                </button>
              )}
            </section>
          </ConfigProvider>
        </PanelControlsContext.Provider>
      </CompactContext.Provider>
    </PluginContext.Provider>
  );
}
