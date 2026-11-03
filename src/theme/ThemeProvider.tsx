import { createContext, useContext, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider, theme } from 'antd';
import type { ThemeConfig } from 'antd';
import { useStore } from 'zustand';
import { createThemeStore } from './themeStore.js';
import type { ThemeControls, ThemeMode, ThemeFamily } from './themeStore.js';
import { familyPalettes } from './palettes.js';

export const ThemeContext = createContext<ReturnType<typeof createThemeStore> | null>(null);

/** Options for an independently themed application subtree. */
export interface ThemeProviderProps {
  /** Content receiving CSS tokens and the matching Ant Design theme. */
  children: ReactNode;
  /** Color scheme used on first mount. Defaults to light. */
  initialMode?: ThemeMode;
  /** Palette used on first mount. Defaults to azure. */
  initialFamily?: ThemeFamily;
}

/** Provides scoped CSS tokens, isolated theme state, and Ant Design configuration. */
export function ThemeProvider({ children, initialMode = 'light', initialFamily = 'azure' }: ThemeProviderProps) {
  const [store] = useState(() => createThemeStore(initialMode, initialFamily));
  const family = useStore(store, (state) => state.family);
  const mode = useStore(store, (state) => state.mode);
  const motionPreference = useStore(store, (state) => state.motionPreference);
  const [systemReducedMotion, setReducedMotion] = useState(() => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const reducedMotion = systemReducedMotion || motionPreference === 'reduced';
  const root = useRef<HTMLDivElement>(null);
  const themeId = useId();
  const tokens = familyPalettes[family][mode];

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(media.matches);

    update();
    media.addEventListener('change', update);

    return () => media.removeEventListener('change', update);
  }, []);

  const antTheme = useMemo<ThemeConfig>(
    () => ({
      inherit: false,
      algorithm: mode === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      cssVar: { key: themeId },
      token: {
        colorPrimary: tokens['--dl-accent'],
        colorBgContainer: tokens['--dl-surface'],
        colorBgElevated: tokens['--dl-surface'],
        colorBgLayout: tokens['--dl-canvas'],
        colorText: tokens['--dl-text'],
        colorTextSecondary: tokens['--dl-muted'],
        colorTextLightSolid: tokens['--dl-on-accent'],
        colorBorder: tokens['--dl-border'],
        colorBorderSecondary: tokens['--dl-border'],
        colorSuccess: tokens['--dl-success'],
        colorWarning: tokens['--dl-warning'],
        colorError: tokens['--dl-error'],
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: family === 'contrast' ? 16 : 13,
        borderRadius: 5,
        controlHeight: family === 'contrast' ? 40 : 34,
        // Changing Ant Design's motion flag can remount its subtree.
        motionDurationFast: reducedMotion ? '0s' : '0.1s',
        motionDurationMid: reducedMotion ? '0s' : '0.2s',
        motionDurationSlow: reducedMotion ? '0s' : '0.3s',
      },
    }),
    [family, mode, reducedMotion, themeId, tokens],
  );

  return (
    <ThemeContext.Provider value={store}>
      <ConfigProvider theme={antTheme} getPopupContainer={(trigger) => trigger?.closest<HTMLElement>('.dl-theme') ?? root.current ?? document.body}>
        <div
          ref={root}
          className="dl-theme"
          data-theme={mode}
          data-theme-family={family}
          data-motion={motionPreference}
          style={{ ...tokens, colorScheme: mode }}
        >
          {children}
        </div>
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

/** Reads and changes the nearest provider's theme; requires a ThemeProvider ancestor. */
export function useTheme(): ThemeControls {
  const store = useContext(ThemeContext);

  if (!store) throw new Error('useTheme must be used inside ThemeProvider or Workbench.');

  return useStore(store);
}
