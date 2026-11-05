import { createContext } from 'react';

export const PanelVisibilityContext = createContext<{
  hiddenPanels: readonly string[];
  setPanelVisible: (id: string, visible: boolean) => void;
} | null>(null);
