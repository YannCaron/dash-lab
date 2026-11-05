import { createContext } from 'react';

export const PanelControlsContext = createContext<{
  hiddenPanels: readonly string[];
  setPanelVisible: (id: string, visible: boolean) => void;
  maximizedPanel: string | null;
  toggleMaximized: (id: string) => void;
} | null>(null);
