import { describe, expect, it } from 'vitest';
import { createThemeStore } from './themeStore.js';
import { palettes } from './palettes.js';

function luminance(hex: string) {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722;
}

function contrast(first: string, second: string) {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

describe('theme state', () => {
  it('supports explicit selection and switching without sharing state between providers', () => {
    const first = createThemeStore('dark');
    const second = createThemeStore('light');
    first.getState().toggleTheme();
    expect(first.getState().mode).toBe('light');
    first.getState().setMode('dark');
    expect(first.getState().mode).toBe('dark');
    expect(second.getState().mode).toBe('light');
  });
});

describe('theme readability', () => {
  for (const [name, palette] of Object.entries(palettes)) {
    it(`${name} provides readable body text, secondary text, and primary-button text`, () => {
      expect(contrast(palette['--dl-text'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette['--dl-muted'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette['--dl-on-accent'], palette['--dl-accent'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette['--dl-warning'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette['--dl-error'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
    });
  }
});
