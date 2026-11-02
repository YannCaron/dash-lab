import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from 'zustand';
import { ConfigProvider } from 'antd';
import type { ConfigProviderProps } from 'antd';
import enUS from 'antd/locale/en_US.js';
import frFR from 'antd/locale/fr_FR.js';
import { createI18nStore } from './i18nStore.js';
import type { I18nControls, LanguageDefinition } from './i18nStore.js';

export const I18nContext = createContext<ReturnType<typeof createI18nStore> | null>(null);
const english = createI18nStore();
const readOnlyEnglish: I18nControls = Object.freeze({
  ...english.getInitialState(),
  setLocale: () => {
    throw new Error('Changing languages requires I18nProvider or Workbench.');
  },
});

/** Options for a localized application subtree. Keep initial language and catalog definitions stable while mounted. */
export interface I18nProviderProps {
  /** Content receiving translations and the language attribute. */
  children: ReactNode;
  /** Initial registered language; defaults to English. Workbench may restore a saved preference. */
  initialLocale?: string;
  /** Additional languages or English/French catalog extensions. */
  languages?: readonly LanguageDefinition[];
  /** Optional Ant Design locale catalogs for additional languages. */
  antdLocales?: Readonly<Record<string, NonNullable<ConfigProviderProps['locale']>>>;
}

/** Provides isolated, extensible language state. */
export function I18nProvider({ children, initialLocale = 'en', languages = [], antdLocales = {} }: I18nProviderProps) {
  const [store] = useState(() => createI18nStore(initialLocale, languages));
  const locale = useStore(store, (state) => state.locale);
  const importedLocale = antdLocales[locale] ?? (locale === 'fr' ? frFR : enUS);
  const antLocale = ('default' in importedLocale ? importedLocale.default : importedLocale) as typeof enUS;
  return (
    <I18nContext.Provider value={store}>
      <ConfigProvider locale={antLocale}>
        <div className="dl-i18n" lang={locale} style={{ height: '100%', minHeight: 0 }}>
          {children}
        </div>
      </ConfigProvider>
    </I18nContext.Provider>
  );
}

/** Read the nearest language state; standalone components default to read-only English. */
export function useI18n(): I18nControls {
  const store = useContext(I18nContext);
  const state = useStore(store ?? english);
  return store ? state : readOnlyEnglish;
}
