import type { ComponentType } from 'react';

/** A panel supplied by an application; list reference panels before their dependants. */
export interface WorkbenchPanel {
  /** Unique, nonempty identifier within this workbench. */
  id: string;
  /** Human-readable tab title. */
  title: string;
  /** React content rendered inside the docked panel. */
  component: ComponentType;
  /** Initial position relative to an earlier panel. */
  position?: { referencePanel: string; direction: 'left' | 'right' | 'above' | 'below' | 'within' };
  /** Preferred initial panel width in pixels. */
  initialWidth?: number;
  /** Preferred initial panel height in pixels. */
  initialHeight?: number;
}

export function validatePanels(panels: readonly WorkbenchPanel[]) {
  const ids = new Set<string>();

  for (const panel of panels) {
    if (!panel.id.trim() || !panel.title.trim()) throw new Error('Panel identifiers and titles must not be empty.');
    if (ids.has(panel.id)) throw new Error(`Duplicate panel identifier: ${panel.id}`);
    if (panel.position && !ids.has(panel.position.referencePanel)) throw new Error(`Panel ${panel.id} must reference an earlier panel.`);
    if ([panel.initialWidth, panel.initialHeight].some((size) => size !== undefined && (!Number.isFinite(size) || size <= 0))) {
      throw new Error(`Panel ${panel.id} dimensions must be positive finite numbers.`);
    }

    ids.add(panel.id);
  }
}
