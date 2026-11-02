import type { ThemeMode } from './themeStore.js';

export const palettes = {
  light: {
    '--dl-canvas': '#f4f6f9',
    '--dl-surface': '#ffffff',
    '--dl-raised': '#eaf0f4',
    '--dl-text': '#202b3b',
    '--dl-muted': '#647287',
    '--dl-border': '#dce3eb',
    '--dl-accent': '#087f82',
    '--dl-accent-soft': '#e1f2ef',
    '--dl-on-accent': '#ffffff',
    '--dl-success': '#247659',
    '--dl-warning': '#8a5b06',
    '--dl-error': '#bd3342',
  },
  dark: {
    '--dl-canvas': '#10151d',
    '--dl-surface': '#171e28',
    '--dl-raised': '#222d3a',
    '--dl-text': '#e6edf5',
    '--dl-muted': '#9baabd',
    '--dl-border': '#2d3949',
    '--dl-accent': '#66d4c5',
    '--dl-accent-soft': '#183b3c',
    '--dl-on-accent': '#102824',
    '--dl-success': '#76c6a1',
    '--dl-warning': '#f2bf68',
    '--dl-error': '#ff9da7',
  },
} satisfies Record<ThemeMode, Record<string, string>>;
