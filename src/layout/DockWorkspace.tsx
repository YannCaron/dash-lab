import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { DockviewReact, themeDark, themeLight } from 'dockview-react';
import { CloseOutlined, ExpandOutlined, ShrinkOutlined } from '@ant-design/icons';
import { PanelControlsContext } from './PanelControlsContext.js';
import type { DockviewApi, DockviewReadyEvent, IDockviewPanelHeaderProps } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import { validatePanels } from './panels.js';
import { useTheme } from '../theme/ThemeProvider.js';
import { useI18n } from '../i18n/I18nProvider.js';

const PanelsContext = createContext<readonly WorkbenchPanel[]>([]);

function PanelTab(props: IDockviewPanelHeaderProps) {
  const { t } = useI18n();
  const visibility = useContext(PanelControlsContext);
  const panels = useContext(PanelsContext);
  const panel = panels.find((item) => item.id === props.api.id);
  const isCloseable = panel?.closeable || !!panel?.onClose;
  const maximized = visibility?.maximizedPanel === props.api.id;
  const title = useSyncExternalStore(
    useCallback(
      (changed) => {
        const listener = props.api.onDidTitleChange(changed);

        return () => listener.dispose();
      },
      [props.api],
    ),
    () => props.api.title ?? props.api.id,
  );

  return (
    <div
      className="dl-panel-tab"
      hidden={visibility?.hiddenPanels.includes(props.api.id)}
      onDoubleClick={(event) => {
        event.stopPropagation();
        if (!(event.target as HTMLElement).closest('button')) visibility?.toggleMaximized(props.api.id);
      }}
      onPointerUp={(event) => {
        if (event.button === 1) {
          if (panel?.onClose) panel.onClose();
          else if (isCloseable) props.api.close();
          else visibility?.setPanelVisible(props.api.id, false);
        }
      }}
    >
      <span className="dl-panel-tab-title">{title}</span>
      <button
        type="button"
        className="dl-tab-action"
        data-panel-maximize={props.api.id}
        aria-label={t(maximized ? 'Restore tab: {title}' : 'Maximize tab: {title}', { title })}
        title={t(maximized ? 'Restore tab: {title}' : 'Maximize tab: {title}', { title })}
        aria-pressed={maximized}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          visibility?.toggleMaximized(props.api.id);
        }}
      >
        {maximized ? <ShrinkOutlined /> : <ExpandOutlined />}
      </button>
      <button
        type="button"
        className="dl-tab-action"
        aria-label={t(isCloseable ? 'Close tab: {title}' : 'Hide tab: {title}', { title })}
        title={t(isCloseable ? 'Close tab: {title}' : 'Hide tab: {title}', { title })}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (panel?.onClose) {
            panel.onClose();
          } else if (isCloseable) {
            props.api.close();
          } else {
            const trigger = event.currentTarget.closest('.dl-workbench')?.querySelector<HTMLButtonElement>('[data-visible-tabs-trigger]');

            visibility?.setPanelVisible(props.api.id, false);
            trigger?.focus();
          }
        }}
      >
        <CloseOutlined />
      </button>
    </div>
  );
}

export function DockWorkspace({ panels, onReady }: { panels: readonly WorkbenchPanel[]; onReady?: ((api: DockviewApi) => void) | undefined }) {
  const { t } = useI18n();
  const currentApi = useRef<DockviewApi | null>(null);
  const controls = useContext(PanelControlsContext);

  useEffect(() => {
    for (const panel of panels) currentApi.current?.getPanel(panel.id)?.api.setTitle(t(panel.title));
  }, [panels, t]);

  useEffect(() => {
    const api = currentApi.current;
    if (!api) return;

    const currentPanels = api.panels;
    const currentIds = new Set(currentPanels.map((p) => p.id));
    const targetIds = new Set(panels.map((p) => p.id));

    for (const p of currentPanels) {
      if (!targetIds.has(p.id)) {
        p.api.close();
      }
    }

    for (const panel of panels) {
      if (!currentIds.has(panel.id)) {
        api.addPanel({
          id: panel.id,
          title: t(panel.title),
          component: panel.id,
          ...(panel.position ? { position: panel.position } : {}),
          ...(panel.initialWidth === undefined ? {} : { initialWidth: panel.initialWidth }),
          ...(panel.initialHeight === undefined ? {} : { initialHeight: panel.initialHeight }),
        });
      }
    }
  }, [panels, t]);

  const { mode } = useTheme();
  const dockTheme = useMemo(() => ({ ...(mode === 'dark' ? themeDark : themeLight), name: `dash-lab-${mode}`, gap: 8 }), [mode]);

  const components = useMemo(() => {
    validatePanels(panels);

    return Object.fromEntries(
      panels.map(({ id, component: Component }) => [
        id,
        () => (
          <div className="dl-panel-content">
            <Component />
          </div>
        ),
      ]),
    );
  }, [panels]);

  const ready = useCallback(
    ({ api }: DockviewReadyEvent) => {
      currentApi.current = api;

      for (const { id, title, position, initialWidth, initialHeight } of panels) {
        api.addPanel({
          id,
          title: t(title),
          component: id,
          ...(position ? { position } : {}),
          ...(initialWidth === undefined ? {} : { initialWidth }),
          ...(initialHeight === undefined ? {} : { initialHeight }),
        });
      }

      if (panels[0]) api.getPanel(panels[0].id)?.api.setActive();

      onReady?.(api);
    },
    [panels, onReady, t],
  );

  return (
    <PanelsContext.Provider value={panels}>
      <DockviewReact
        className="dl-dock"
        components={components}
        defaultTabComponent={PanelTab}
        onReady={ready}
        theme={dockTheme}
        defaultRenderer="always"
        disableDnd={!!controls?.maximizedPanel}
      />
    </PanelsContext.Provider>
  );
}
