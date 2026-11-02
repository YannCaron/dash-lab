import { createElement, useContext } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ConfigProvider } from 'antd';
import { describe, expect, it } from 'vitest';
import { createI18nStore } from './i18nStore.js';
import { I18nProvider, useI18n } from './I18nProvider.js';
import { ThemeProvider } from '../theme/ThemeProvider.js';

function Probe() {
  const { t } = useI18n();
  const ant = useContext(ConfigProvider.ConfigContext);
  return createElement('output', null, `${t('File')}|${ant.locale?.locale}`);
}
describe('internationalization', () => {
  it('defaults to English and changes language without changing the store instance', () => {
    const store = createI18nStore();
    expect(store.getState().t('Settings')).toBe('Settings');
    store.getState().setLocale('fr');
    expect(store.getState().t('Settings')).toBe('Réglages');
    const state = store.getState();
    state.setLocale('fr');
    expect(store.getState()).toBe(state);
    expect(createI18nStore().getState().locale).toBe('en');
  });

  it('extends catalogs and falls back to English and then the literal key', () => {
    const messages = { File: 'Datei' };
    const store = createI18nStore('de', [
      { id: 'en', label: 'English', messages: { 'app.title': 'My application' } },
      { id: 'de', label: 'Deutsch', messages },
    ]);
    messages.File = 'Changed caller';
    expect(store.getState().t('File')).toBe('Datei');
    expect(store.getState().t('app.title')).toBe('My application');
    expect(store.getState().t('Unknown message')).toBe('Unknown message');
    expect(store.getState().t('toString')).toBe('toString');
  });

  it('interpolates plain text and leaves unknown parameters visible', () => {
    const state = createI18nStore('fr').getState();
    expect(state.t('Hello, {name}!', { name: '<script>' })).toBe('Bonjour, <script> !');
    expect(state.t('Hello, {name}!')).toContain('{name}');
    expect(state.t('{count} unread notifications', { count: 3 })).toBe('3 notifications non lues');
  });

  it('rejects unknown languages without changing the active language', () => {
    const store = createI18nStore('fr');
    expect(() => store.getState().setLocale('unknown')).toThrow('not registered');
    expect(store.getState().locale).toBe('fr');
    expect(() => createI18nStore('unknown')).toThrow('not registered');
    expect(() => createI18nStore('en', [{ id: '', label: 'Missing', messages: {} }])).toThrow('require');
  });

  it('isolates nested providers and integrates Ant Design inside an existing theme provider', () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        children: createElement(I18nProvider, {
          initialLocale: 'fr',
          children: [createElement(Probe, { key: 'fr' }), createElement(I18nProvider, { key: 'en', children: createElement(Probe) })],
        }),
      }),
    );
    expect(html).toContain('Fichier|fr');
    expect(html).toContain('File|en');
    expect(html).toContain('lang="fr"');
  });
});
