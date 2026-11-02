import { useCallback, useMemo } from 'react';
import { DockviewDefaultTab, DockviewReact, themeDark, themeLight } from 'dockview-react';
import type { DockviewApi, DockviewReadyEvent, IDockviewPanelHeaderProps } from 'dockview-react';
import type { WorkbenchPanel } from './panels.js';
import { validatePanels } from './panels.js';
import { useTheme } from '../theme/ThemeProvider.js';

function PanelTab(props: IDockviewPanelHeaderProps) {
  return <DockviewDefaultTab {...props} hideClose />;
}

export function DockWorkspace({ panels, onReady }: { panels: readonly WorkbenchPanel[]; onReady?: ((api: DockviewApi) => void) | undefined }) {
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
      for (const { id, title, position, initialWidth, initialHeight } of panels) {
        api.addPanel({
          id,
          title,
          component: id,
          ...(position ? { position } : {}),
          ...(initialWidth === undefined ? {} : { initialWidth }),
          ...(initialHeight === undefined ? {} : { initialHeight }),
        });
      }

      if (panels[0]) api.getPanel(panels[0].id)?.api.setActive();
      onReady?.(api);
    },
    [panels, onReady],
  );

  return (
    <DockviewReact className="dl-dock" components={components} defaultTabComponent={PanelTab} onReady={ready} theme={dockTheme} defaultRenderer="always" />
  );
}
