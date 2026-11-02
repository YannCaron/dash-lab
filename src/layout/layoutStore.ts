import { createStore } from 'zustand/vanilla';

interface LayoutState {
  headerVisible: boolean;
  footerVisible: boolean;
  focusMode: boolean;
  toggleHeader: () => void;
  toggleFooter: () => void;
  toggleFocus: () => void;
  setVisibility: (headerVisible: boolean, footerVisible: boolean) => void;
}

export function createLayoutStore(headerVisible = true, footerVisible = true) {
  return createStore<LayoutState>((set) => ({
    headerVisible,
    footerVisible,
    focusMode: false,
    toggleHeader: () => set((state) => ({ headerVisible: !state.headerVisible })),
    toggleFooter: () => set((state) => ({ footerVisible: !state.footerVisible })),
    toggleFocus: () => set((state) => ({ focusMode: !state.focusMode })),
    setVisibility: (headerVisible, footerVisible) => set({ headerVisible, footerVisible }),
  }));
}
