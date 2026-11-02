import type { useLayoutManagement } from './useLayoutManagement.js';

function LayoutIcon({ kind }: { kind: 'default' | 'columns' | 'rows' | 'save' | 'restore' | 'reset' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {kind === 'save' ? (
        <>
          <path d="M4 3h13l3 3v15H4zM8 3v6h8V3M8 21v-8h8v8" />
        </>
      ) : kind === 'restore' ? (
        <>
          <path d="M3 10a9 9 0 1 1 1 7M3 4v6h6M12 7v5l3 2" />
        </>
      ) : kind === 'reset' ? (
        <>
          <path d="M4 10a8 8 0 1 1 1 7M4 4v6h6" />
          <path d="m10 10 5 5m0-5-5 5" />
        </>
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          {kind === 'columns' ? <path d="M9 4v16m6-16v16" /> : kind === 'rows' ? <path d="M3 10h18M3 15h18" /> : <path d="M15 4v16m0-8h6" />}
        </>
      )}
    </svg>
  );
}

export function LayoutControls({ layout }: { layout: ReturnType<typeof useLayoutManagement> }) {
  return (
    <div className="dl-layout-controls" role="group" aria-label="Layout management">
      <span className="dl-toolbar-label">LAYOUT</span>
      {(['default', 'columns', 'rows'] as const).map((preset) => {
        const title = preset === 'default' ? 'Application layout' : preset === 'columns' ? 'Columns layout' : 'Rows layout';
        return (
          <button
            key={preset}
            type="button"
            className="dl-icon-button"
            aria-label={title}
            title={title}
            disabled={!layout.ready}
            onClick={() => layout.selectPreset(preset)}
          >
            <LayoutIcon kind={preset} />
          </button>
        );
      })}
      <span className="dl-divider" />
      <button type="button" className="dl-icon-button" aria-label="Save layout" title="Save layout" disabled={!layout.ready} onClick={layout.save}>
        <LayoutIcon kind="save" />
      </button>
      <button
        type="button"
        className="dl-icon-button"
        aria-label="Restore saved layout"
        title="Restore saved layout"
        disabled={!layout.ready || !layout.hasSaved}
        onClick={layout.restore}
      >
        <LayoutIcon kind="restore" />
      </button>
      <button type="button" className="dl-icon-button" aria-label="Reset layout" title="Reset layout" disabled={!layout.ready} onClick={layout.reset}>
        <LayoutIcon kind="reset" />
      </button>
    </div>
  );
}
