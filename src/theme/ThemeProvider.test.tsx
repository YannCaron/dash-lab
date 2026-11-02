import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeProvider.js';

function ThemeProbe() {
  return createElement('output', null, useTheme().mode);
}

describe('theme provider composition', () => {
  it('keeps nested providers independent and scopes their CSS tokens', () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        initialMode: 'dark',
        children: [
          createElement(ThemeProbe, { key: 'outer' }),
          createElement(ThemeProvider, { key: 'inner', initialMode: 'light', children: createElement(ThemeProbe) }),
        ],
      }),
    );
    expect(html).toContain('<output>dark</output>');
    expect(html).toContain('<output>light</output>');
    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('data-theme="light"');
    expect(html).toContain('--dl-surface:#171e28');
    expect(html).toContain('--dl-surface:#ffffff');
  });

  it('explains a missing provider when a standalone consumer is rendered', () => {
    expect(() => renderToStaticMarkup(createElement(ThemeProbe))).toThrow('useTheme must be used inside');
  });
});
