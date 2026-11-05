import { MoonOutlined, SunOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n/I18nProvider.js';
import { useTheme } from './ThemeProvider.js';

/** An accessible theme switch bound to the nearest ThemeProvider. */
export function ThemeToggle() {
  const { t } = useI18n();
  const { mode, toggleTheme } = useTheme();
  const label = mode === 'light' ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <button type="button" className="dl-icon-button dl-theme-toggle" aria-label={t(label ?? '')} title={t(label ?? '')} onClick={toggleTheme}>
      {mode === 'light' ? <SunOutlined /> : <MoonOutlined />}
      <span className="dl-control-label">{t(mode === 'light' ? 'Light' : 'Dark')}</span>
    </button>
  );
}
