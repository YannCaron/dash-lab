import type { ThemeMode } from './themeStore.js';

export const palettes = {
  light: {
    '--dl-canvas': '#eaf0f6',
    '--dl-surface': '#ffffff',
    '--dl-raised': '#f5f7fa',
    '--dl-text': '#142c48',
    '--dl-muted': '#526c8d',
    '--dl-border': '#d4dfed',
    '--dl-accent': '#315ec3',
    '--dl-accent-soft': '#eaf0ff',
    '--dl-on-accent': '#ffffff',
    '--dl-success': '#247659',
    '--dl-warning': '#8a5b06',
    '--dl-error': '#bd3342',
  },
  dark: {
    '--dl-canvas': '#10151b',
    '--dl-surface': '#171c24',
    '--dl-raised': '#202731',
    '--dl-text': '#dde8f6',
    '--dl-muted': '#9db0cb',
    '--dl-border': '#2d3747',
    '--dl-accent': '#8bb8ff',
    '--dl-accent-soft': '#213453',
    '--dl-on-accent': '#0d203e',
    '--dl-success': '#76c6a1',
    '--dl-warning': '#f2bf68',
    '--dl-error': '#ff9da7',
  },
} satisfies Record<ThemeMode, Record<string, string>>;
