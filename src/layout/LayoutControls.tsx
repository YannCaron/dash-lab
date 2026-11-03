import { useI18n } from '../i18n/I18nProvider.js';
import type { useLayoutManagement } from './useLayoutManagement.js';

function LayoutIcon({ kind }: { kind: 'default' | 'columns' | 'rows' | 'custom' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      {kind === 'columns' ? (
        <path d="M9 4v16m6-16v16" />
      ) : kind === 'rows' ? (
        <path d="M3 10h18M3 15h18" />
      ) : kind === 'custom' ? (
        <path d="M11 4v16M3 12h8m0-3h10" />
      ) : (
        <path d="M15 4v16m0-8h6" />
      )}
    </svg>
  );
}

export function LayoutControls({ layout }: { layout: ReturnType<typeof useLayoutManagement> }) {
  const { t } = useI18n();

  return (
    <div className="dl-layout-controls" role="group" aria-label={t('Layout management')}>
      <span className="dl-toolbar-label">{t('LAYOUT')}</span>
      {(['default', 'columns', 'rows'] as const).map((preset) => {
        const title = preset === 'default' ? 'Application layout' : preset === 'columns' ? 'Columns layout' : 'Rows layout';

        return (
          <button
            key={preset}
            type="button"
            className="dl-icon-button"
            aria-label={t(title ?? '')}
            title={t(title ?? '')}
            disabled={!layout.ready}
            onClick={() => layout.selectPreset(preset)}
          >
            <LayoutIcon kind={preset} />
          </button>
        );
      })}
      <button
        type="button"
        className="dl-icon-button"
        aria-label={t('Custom layout')}
        title={t('Restore custom layout')}
        disabled={!layout.ready || !layout.hasSaved}
        onClick={layout.restore}
      >
        <LayoutIcon kind="custom" />
      </button>
    </div>
  );
}
