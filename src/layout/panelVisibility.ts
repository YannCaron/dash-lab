import type { DockviewApi } from 'dockview-react';

export function applyPanelVisibility(api: DockviewApi, hiddenPanels: readonly string[]) {
  const hidden = new Set(hiddenPanels);

  for (const group of api.groups) {
    const visible = group.panels.filter((panel) => !hidden.has(panel.id));

    group.api.setVisible(visible.length > 0);

    if (visible.length && (!group.activePanel || hidden.has(group.activePanel.id))) visible[0]!.api.setActive();
  }
}
