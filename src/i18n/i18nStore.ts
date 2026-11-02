import { createStore } from 'zustand/vanilla';
import { french } from './messages.js';

/** Translation values interpolated as plain text using {name} placeholders. */
export type MessageParameters = Readonly<Record<string, string | number>>;
/** A message catalog; English source messages also serve as built-in keys. */
export type MessageCatalog = Readonly<Record<string, string>>;
/** An additional language or an extension to the English/French catalogs. */
export interface LanguageDefinition {
  /** BCP 47 language identifier, for example de or fr-CA. */
  id: string;
  /** Native name displayed in Preferences. */
  label: string;
  /** Messages added to this language's catalog; missing keys fall back to English. */
  messages: MessageCatalog;
}
/** Language state and actions exposed by useI18n. */
export interface I18nControls {
  /** Active language identifier. */
  locale: string;
  /** Available languages in registration order. */
  locales: readonly Readonly<{ id: string; label: string }>[];
  /** Select a registered language without remounting content. */
  setLocale: (locale: string) => void;
  /** Verify that a language exists before applying a configuration. */
  assertLocale: (locale: string) => void;
  /** Translate a key, interpolate plain-text parameters, and fall back to English or the key itself. */
  t: (message: string, parameters?: MessageParameters) => string;
}

export function createI18nStore(initialLocale = 'en', additions: readonly LanguageDefinition[] = []) {
  const languages = new Map<string, LanguageDefinition>([
    ['en', { id: 'en', label: 'English', messages: {} }],
    ['fr', { id: 'fr', label: 'Français', messages: french }],
  ]);
  for (const definition of additions) {
    if (!definition.id.trim() || !definition.label.trim()) throw new Error('Languages require an ID and display name.');
    new Intl.DateTimeFormat(definition.id);
    if (Object.values(definition.messages).some((value) => typeof value !== 'string')) throw new Error('Translation values must be strings.');
    languages.set(definition.id, { ...definition, messages: Object.freeze({ ...languages.get(definition.id)?.messages, ...definition.messages }) });
  }
  const assertLocale = (locale: string) => {
    if (!languages.has(locale)) throw new Error(`Language is not registered: ${locale}`);
  };
  const translator =
    (locale: string): I18nControls['t'] =>
    (message, parameters = {}) => {
      const catalog = languages.get(locale)!.messages;
      const template = Object.hasOwn(catalog, message)
        ? catalog[message]!
        : Object.hasOwn(languages.get('en')!.messages, message)
          ? languages.get('en')!.messages[message]!
          : message;
      return template.replace(/\{(\w+)\}/g, (token: string, name: string) => (Object.hasOwn(parameters, name) ? String(parameters[name]) : token));
    };
  assertLocale(initialLocale);
  return createStore<I18nControls>((set, get) => ({
    locale: initialLocale,
    locales: Object.freeze([...languages.values()].map(({ id, label }) => Object.freeze({ id, label }))),
    assertLocale,
    t: translator(initialLocale),
    setLocale: (locale) => {
      assertLocale(locale);
      if (get().locale !== locale) set({ locale, t: translator(locale) });
    },
  }));
}
