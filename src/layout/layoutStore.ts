import { createStore } from 'zustand/vanilla';

interface LayoutState {
  headerVisible: boolean;
  footerVisible: boolean;
  focusMode: boolean;
  compact: boolean;
  hiddenPanels: readonly string[];
  setHiddenPanels: (ids: readonly string[]) => void;
  maximizedPanel: string | null;
  setMaximizedPanel: (id: string | null) => void;
  setCompact: (compact: boolean) => void;
  toggleCompact: () => void;
  toggleHeader: () => void;
  toggleFooter: () => void;
  toggleView: () => void;
  toggleFocus: () => void;
  setFocusMode: (focusMode: boolean) => void;
  setVisibility: (headerVisible: boolean, footerVisible: boolean) => void;
}

export function createLayoutStore(headerVisible = true, footerVisible = true) {
  return createStore<LayoutState>((set) => ({
    headerVisible,
    footerVisible,
    focusMode: false,
    compact: false,
    hiddenPanels: [],
    setHiddenPanels: (hiddenPanels) => set({ hiddenPanels }),
    maximizedPanel: null,
    setMaximizedPanel: (maximizedPanel) => set({ maximizedPanel }),
    setCompact: (compact) => set({ compact }),
    toggleCompact: () => set((state) => ({ compact: !state.compact })),
    toggleHeader: () => set((state) => ({ headerVisible: !state.headerVisible })),
    toggleFooter: () => set((state) => ({ footerVisible: !state.footerVisible })),
    toggleView: () =>
      set((state) => ({ headerVisible: !(state.headerVisible || state.footerVisible), footerVisible: !(state.headerVisible || state.footerVisible) })),
    toggleFocus: () => set((state) => ({ focusMode: !state.focusMode })),
    setFocusMode: (focusMode) => set({ focusMode }),
    setVisibility: (headerVisible, footerVisible) => set({ headerVisible, footerVisible }),
  }));
}
