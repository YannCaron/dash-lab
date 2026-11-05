import { useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { DockviewReact, themeDark, themeLight } from 'dockview-react';
import { CloseOutlined } from '@ant-design/icons';
import { PanelVisibilityContext } from './PanelVisibilityContext.js';
import type { DockviewApi, DockviewReadyEvent, IDockviewPanelHeaderProps } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import { validatePanels } from './panels.js';
import { useTheme } from '../theme/ThemeProvider.js';
import { useI18n } from '../i18n/I18nProvider.js';

function PanelTab(props: IDockviewPanelHeaderProps) {
  const { t } = useI18n();
  const visibility = useContext(PanelVisibilityContext);
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
      onPointerUp={(event) => {
        if (event.button === 1) visibility?.setPanelVisible(props.api.id, false);
      }}
    >
      <span className="dl-panel-tab-title">{title}</span>
      <button
        type="button"
        className="dl-tab-action"
        aria-label={t('Hide tab: {title}', { title })}
        title={t('Hide tab: {title}', { title })}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          const trigger = event.currentTarget.closest('.dl-workbench')?.querySelector<HTMLButtonElement>('[data-visible-tabs-trigger]');

          visibility?.setPanelVisible(props.api.id, false);
          trigger?.focus();
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

  useEffect(() => {
    for (const panel of panels) currentApi.current?.getPanel(panel.id)?.api.setTitle(t(panel.title));
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
    <DockviewReact className="dl-dock" components={components} defaultTabComponent={PanelTab} onReady={ready} theme={dockTheme} defaultRenderer="always" />
  );
}
