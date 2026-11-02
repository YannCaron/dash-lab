import { createStore } from 'zustand/vanilla';

/** Supported workbench color schemes. */
export type ThemeMode = 'light' | 'dark';

/** Follow the operating system or reduce motion unconditionally. */
export type MotionPreference = 'system' | 'reduced';

/** Theme state and actions available through useTheme. */
export interface ThemeControls {
  /** The active color scheme. */
  mode: ThemeMode;
  /** Animation preference; the operating system's reduced-motion setting always takes priority. */
  motionPreference: MotionPreference;
  /** Select the animation preference. */
  setMotionPreference: (preference: MotionPreference) => void;
  /** Select a color scheme for this provider. */
  setMode: (mode: ThemeMode) => void;
  /** Switch between light and dark. */
  toggleTheme: () => void;
}

export function createThemeStore(mode: ThemeMode) {
  return createStore<ThemeControls>((set) => ({
    mode,
    motionPreference: 'system',
    setMotionPreference: (motionPreference) => set({ motionPreference }),
    setMode: (mode) => set({ mode }),
    toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
  }));
}
