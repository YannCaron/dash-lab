import { useI18n } from '../i18n/I18nProvider.js';
import { useTheme } from './ThemeProvider.js';

/** An accessible theme switch bound to the nearest ThemeProvider. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { mode, toggleTheme } = useTheme();
  const label = mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <button type="button" className="dl-icon-button dl-theme-toggle" aria-label={t(label ?? '')} title={t(label ?? '')} onClick={toggleTheme}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {mode === 'light' ? (
          <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" />
          </>
        ) : (
          <path d="M20.5 13A9 9 0 0 1 11 3.5 8.8 8.8 0 1 0 20.5 13Z" />
        )}
      </svg>
      <span className="dl-control-label">{t(mode === 'light' ? 'Light' : 'Dark')}</span>
    </button>
  );
}
