import { createStore } from 'zustand/vanilla';

/** Supported workbench color schemes. */
export type ThemeMode = 'light' | 'dark';

/** Color families, each available in light and dark. */
export type ThemeFamily = 'azure' | 'contrast' | 'emerald' | 'umber';

export const themeFamilies = { azure: 'Azure', contrast: 'High Contrast', emerald: 'Emerald', umber: 'Umber' } as const;

/** Follow the operating system or reduce motion unconditionally. */
export type MotionPreference = 'system' | 'reduced';

/** Theme state and actions available through useTheme. */
export interface ThemeControls {
  /** The active color scheme. */
  mode: ThemeMode;
  /** Active palette, independent of the light/dark scheme. */
  family: ThemeFamily;
  /** Select a palette without changing the light/dark scheme. */
  setFamily: (family: ThemeFamily) => void;
  /** Animation preference; the operating system's reduced-motion setting always takes priority. */
  motionPreference: MotionPreference;
  /** Select the animation preference. */
  setMotionPreference: (preference: MotionPreference) => void;
  /** Select a color scheme for this provider. */
  setMode: (mode: ThemeMode) => void;
  /** Switch between light and dark. */
  toggleTheme: () => void;
}

export function createThemeStore(mode: ThemeMode, family: ThemeFamily = 'azure') {
  return createStore<ThemeControls>((set) => ({
    mode,
    family,
    setFamily: (family) => set({ family }),
    motionPreference: 'system',
    setMotionPreference: (motionPreference) => set({ motionPreference }),
    setMode: (mode) => set({ mode }),
    toggleTheme: () => set((state) => ({ mode: state.mode === 'light' ? 'dark' : 'light' })),
  }));
}
