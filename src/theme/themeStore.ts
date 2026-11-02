import { createStore } from 'zustand/vanilla';

/** Supported workbench color schemes. */
export type ThemeMode = 'light' | 'dark';

/** Theme state and actions available through useTheme. */
export interface ThemeControls {
  /** The active color scheme. */
  mode: ThemeMode;
  /** Select a color scheme for this provider. */
  setMode: (mode: ThemeMode) => void;
  /** Switch between light and dark. */
  toggleTheme: () => void;
}

export function createThemeStore(mode: ThemeMode) {
  return createStore<ThemeControls>((set) => ({
    mode,
    setMode: (mode) => set({ mode }),
    toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
  }));
}
