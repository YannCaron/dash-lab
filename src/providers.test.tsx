import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { CommandProvider, CommandRegistry, I18nProvider, ThemeProvider, Workbench, useCommands, useI18n, useNotifications, useTheme } from './index.js';
import { NotificationContext } from './notifications/NotificationContext.js';
import { createNotificationStore } from './notifications/notificationStore.js';

function CommandProbe() {
  return createElement(
    'output',
    null,
    useCommands()
      .commands.map((command) => command.id)
      .join(','),
  );
}

function NotificationProbe() {
  return createElement(
    'output',
    null,
    useNotifications()
      .items.map((item) => item.title)
      .join(','),
  );
}

function ThemeProbe() {
  return createElement('output', null, useTheme().mode);
}

describe('provider and hook contracts', () => {
  it('explains missing command, notification, and theme providers', () => {
    expect(() => renderToStaticMarkup(createElement(CommandProbe))).toThrow('CommandProvider');
    expect(() => renderToStaticMarkup(createElement(NotificationProbe))).toThrow('NotificationProvider');
    expect(() => renderToStaticMarkup(createElement(ThemeProbe))).toThrow('ThemeProvider');
  });

  it('reads the nearest command provider without mixing independent registries', () => {
    const first = new CommandRegistry();
    const second = new CommandRegistry();

    first.register({ id: 'first', title: 'First', execute() {} });
    second.register({ id: 'second', title: 'Second', execute() {} });

    const html = renderToStaticMarkup(
      createElement(CommandProvider, {
        registry: first,
        children: [
          createElement(CommandProbe, { key: 'outer' }),
          createElement(CommandProvider, { key: 'inner', registry: second, children: createElement(CommandProbe) }),
        ],
      }),
    );

    expect(html).toBe('<output>first</output><output>second</output>');
  });

  it('resolves the nearest notification center through its stable actions', () => {
    const first = createNotificationStore();
    const second = createNotificationStore();

    first.getState().notify({ title: 'First history' });
    function StoreProbe() {
      return createElement('output', null, useNotifications().notify === first.getState().notify ? 'first' : 'second');
    }

    const html = renderToStaticMarkup(
      createElement(NotificationContext.Provider, {
        value: first,
        children: [
          createElement(StoreProbe, { key: 'outer' }),
          createElement(NotificationContext.Provider, { key: 'inner', value: second, children: createElement(StoreProbe) }),
        ],
      }),
    );

    expect(html).toBe('<output>first</output><output>second</output>');
    expect(second.getState().items).toEqual([]);
  });

  it('composes inherited theme and language providers without duplicating workbench services', () => {
    const html = renderToStaticMarkup(
      createElement(ThemeProvider, {
        initialMode: 'dark',
        children: createElement(I18nProvider, {
          initialLocale: 'fr',
          children: createElement(Workbench, { title: 'Test', layoutStorageKey: false, preferencesStorageKey: false, children: 'Content' }),
        }),
      }),
    );

    expect(html).toContain('data-theme="dark"');
    expect(html).toContain('Ouvrir la palette de commandes');
    expect(html.match(/class="dl-notification-center\b/g)).toHaveLength(1);
    expect(html.match(/class="dl-command-palette\b/g)).toHaveLength(1);
  });

  it('offers read-only English outside a language provider', () => {
    function Probe() {
      const state = useI18n();

      expect(() => state.setLocale('fr')).toThrow('I18nProvider');

      return createElement('output', null, state.t('File'));
    }

    expect(renderToStaticMarkup(createElement(Probe))).toBe('<output>File</output>');
  });
});
