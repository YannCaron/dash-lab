import { describe, expect, it } from 'vitest';
import { createThemeStore } from './themeStore.js';
import { familyPalettes } from './palettes.js';

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

    first.getState().setMotionPreference('reduced');

    expect(first.getState().motionPreference).toBe('reduced');
    expect(second.getState().motionPreference).toBe('system');

    first.getState().setFamily('emerald');
    first.getState().toggleTheme();

    expect(first.getState().family).toBe('emerald');
    expect(second.getState().family).toBe('azure');
  });
});

describe('theme readability', () => {
  for (const [family, schemes] of Object.entries(familyPalettes)) {
    for (const [mode, palette] of Object.entries(schemes)) {
      const name = `${family} ${mode}`;
      it(`${name} provides readable body text, secondary text, and primary-button text`, () => {
        expect(contrast(palette['--dl-text'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette['--dl-muted'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette['--dl-on-accent'], palette['--dl-accent'])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette['--dl-warning'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette['--dl-error'], palette['--dl-surface'])).toBeGreaterThanOrEqual(4.5);

        if (family === 'contrast') {
          for (const background of ['--dl-canvas', '--dl-surface', '--dl-raised', '--dl-accent-soft'] as const) {
            expect(contrast(palette['--dl-text'], palette[background])).toBeGreaterThanOrEqual(7);
            expect(contrast(palette['--dl-muted'], palette[background])).toBeGreaterThanOrEqual(7);
          }

          expect(contrast(palette['--dl-on-accent'], palette['--dl-accent'])).toBeGreaterThanOrEqual(7);
          expect(contrast(palette['--dl-border'], palette['--dl-surface'])).toBeGreaterThanOrEqual(3);
        }
      });
    }
  }
});
