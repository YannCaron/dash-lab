import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Workbench } from './Workbench.js';

describe('Workbench public entry point', () => {
  it('preserves application content and its accessible application name', () => {
    const html = renderToStaticMarkup(createElement(Workbench, { title: 'Geo Lab' }, createElement('button', null, 'Explore')));

    expect(html).toContain('aria-label="Geo Lab"');
    expect(html).toContain('<button>Explore</button>');
  });
});
