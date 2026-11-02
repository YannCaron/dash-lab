import { useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { DockviewApi } from 'dockview-react';
import { useStore } from 'zustand';
import { DockWorkspace } from './DockWorkspace.js';
import { createLayoutStore } from './layoutStore.js';
import type { WorkbenchPanel } from './panels.js';
import { ThemeContext, ThemeProvider } from '../theme/ThemeProvider.js';
import { ThemeToggle } from '../theme/ThemeToggle.js';

/** Properties of the reusable application workbench. */
export interface WorkbenchProps {
  /** Accessible name of this application. */
  title: string;
  /** Optional text shown next to the application title. */
  subtitle?: string;
  /** Optional application mark displayed before the title. */
  logo?: ReactNode;
  /** Application actions displayed in the header. */
  headerActions?: ReactNode;
  /** Application controls displayed before the workbench controls. */
  controlBar?: ReactNode;
  /** Application monitoring information displayed below the controls. */
  monitoringBar?: ReactNode;
  /** Application footer content. */
  footer?: ReactNode;
  /** Initial panel definitions; keep this collection stable for the lifetime of the workbench. */
  panels?: readonly WorkbenchPanel[];
  /** Called once when Dockview has created the initial panels. */
  onWorkspaceReady?: (api: DockviewApi) => void;
  /** Whether the header is shown on first mount. Defaults to true. */
  initialHeaderVisible?: boolean;
  /** Whether the footer is shown on first mount. Defaults to true. */
  initialFooterVisible?: boolean;
  /** Fallback content displayed when no panels are supplied. */
  children?: ReactNode;
}

const emptyPanels: readonly WorkbenchPanel[] = [];

function ChromeIcon({ name }: { name: 'header' | 'footer' | 'focus' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      {name === 'focus' ? (
        <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />
      ) : (
        <>
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d={name === 'header' ? 'M3 9h18' : 'M3 15h18'} />
        </>
      )}
    </svg>
  );
}

/** Composes application chrome and a dockable workspace without owning application content. */
export function Workbench(props: WorkbenchProps) {
  const theme = useContext(ThemeContext);
  return theme ? (
    <WorkbenchShell {...props} />
  ) : (
    <ThemeProvider>
      <WorkbenchShell {...props} />
    </ThemeProvider>
  );
}

function WorkbenchShell({
  title,
  subtitle,
  logo,
  headerActions,
  controlBar,
  monitoringBar,
  footer,
  panels = emptyPanels,
  onWorkspaceReady,
  initialHeaderVisible = true,
  initialFooterVisible = true,
  children,
}: WorkbenchProps) {
  const [store] = useState(() => createLayoutStore(initialHeaderVisible, initialFooterVisible));
  const state = useStore(store);
  const exitFocus = useRef<HTMLButtonElement>(null);
  const enterFocus = useRef<HTMLButtonElement>(null);
  const wasFocused = useRef(false);

  useEffect(() => {
    if (state.focusMode) exitFocus.current?.focus();
    else if (wasFocused.current) enterFocus.current?.focus();
    wasFocused.current = state.focusMode;
  }, [state.focusMode]);

  return (
    <section
      className="dl-workbench"
      aria-label={title}
      data-focus-mode={state.focusMode}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && state.focusMode && !event.defaultPrevented) {
          event.preventDefault();
          state.toggleFocus();
        }
      }}
    >
      {!state.focusMode && state.headerVisible && (
        <header className="dl-header">
          <div className="dl-identity">
            {logo}
            <strong>{title}</strong>
            {subtitle && <span className="dl-subtitle">{subtitle}</span>}
          </div>
          <div className="dl-header-actions">{headerActions}</div>
        </header>
      )}

      {!state.focusMode && (
        <div className="dl-control-bar" role="toolbar" aria-label="Workbench controls">
          <div className="dl-application-controls">{controlBar}</div>
          <div className="dl-view-controls">
            <ThemeToggle />
            <span className="dl-divider" />
            <span className="dl-toolbar-label">VIEW</span>
            <button
              type="button"
              className="dl-icon-button"
              aria-label={state.headerVisible ? 'Hide header' : 'Show header'}
              title={state.headerVisible ? 'Hide header' : 'Show header'}
              aria-pressed={state.headerVisible}
              onClick={state.toggleHeader}
            >
              <ChromeIcon name="header" />
            </button>
            <button
              type="button"
              className="dl-icon-button"
              aria-label={state.footerVisible ? 'Hide footer' : 'Show footer'}
              title={state.footerVisible ? 'Hide footer' : 'Show footer'}
              aria-pressed={state.footerVisible}
              onClick={state.toggleFooter}
            >
              <ChromeIcon name="footer" />
            </button>
            <span className="dl-divider" />
            <button
              type="button"
              ref={enterFocus}
              className="dl-icon-button dl-focus-button"
              aria-label="Enter focus mode"
              title="Focus workspace"
              onClick={state.toggleFocus}
            >
              <ChromeIcon name="focus" />
              <span>Focus</span>
            </button>
          </div>
        </div>
      )}

      {!state.focusMode && monitoringBar && (
        <aside className="dl-monitoring-bar" aria-label="Monitoring">
          {monitoringBar}
        </aside>
      )}
      <main className="dl-workspace" aria-label="Workspace">
        {panels.length ? (
          <DockWorkspace panels={panels} onReady={onWorkspaceReady} />
        ) : (
          <div className="dl-empty-workspace">{children ?? 'No panels have been added to this workspace.'}</div>
        )}
      </main>
      {!state.focusMode && state.footerVisible && footer && <footer className="dl-footer">{footer}</footer>}
      {state.focusMode && (
        <button ref={exitFocus} type="button" className="dl-exit-focus" onClick={state.toggleFocus}>
          Exit focus mode <kbd>Esc</kbd>
        </button>
      )}
    </section>
  );
}
