import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { I18nProvider } from '../i18n/I18nProvider.js';
import { Workbench } from './Workbench.js';

describe('Workbench public entry point', () => {
  it('preserves application content and its accessible application name', () => {
    const html = renderToStaticMarkup(createElement(Workbench, { title: 'Geo Lab' }, createElement('button', null, 'Explore')));

    expect(html).toContain('aria-label="Geo Lab"');
    expect(html).toContain('<button>Explore</button>');
  });

  it('renders the fullscreen button in the control bar with localized label and keeps header and control bar visible', () => {
    const html = renderToStaticMarkup(
      createElement(I18nProvider, {
        initialLocale: 'fr',
        children: createElement(Workbench, { title: 'Geo Lab', children: 'Content' }),
      }),
    );

    expect(html).toContain('class="dl-header"');
    expect(html).toContain('class="dl-control-bar"');
    expect(html).toContain('dl-fullscreen-button');
    expect(html).toContain('Plein écran');
  });
});
