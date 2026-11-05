import { AppstoreOutlined } from '@ant-design/icons';
import { useI18n } from '@cyann/dash-lab';
import { Button, Input, Tag } from 'antd';
import { Workbench, useNotifications } from '@cyann/dash-lab';
import type { WorkbenchPanel } from '@cyann/dash-lab';
import { plugins } from './plugins';
import { CommandExamples } from './CommandExamples';

function WorkspaceGuide() {
  const { t } = useI18n();

  return (
    <div className="demo-guide">
      <p className="eyebrow">{t('MAKE YOURSELF AT HOME')}</p>
      <h2>{t('Your space, your way.')}</h2>
      <p>{t('Drag a tab to move a panel. Pull the edges to give an idea more room.')}</p>
      <ol className="demo-steps">
        <li>
          <span>01</span>
          <div>
            <strong>{t('Shape your workspace')}</strong>
            <p>{t('Dock panels beside or below each other.')}</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>{t('Clear the distractions')}</strong>
            <p>{t('Hide the header or footer, or enter Focus mode.')}</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>{t('Make something yours')}</strong>
            <p>{t('Replace this local demo with your application.')}</p>
          </div>
        </li>
      </ol>
      <div className="demo-note">
        <span className="status-dot" />
        {t('All panels are live React components.')}
      </div>
      <details className="demo-shortcuts">
        <summary>{t('Keyboard shortcuts')}</summary>
        <p>
          <kbd>{t('Ctrl/\u2318 + Alt + F')}</kbd>
          {t('Focus')}
        </p>
        <p>
          <kbd>{t('Ctrl/\u2318 + Alt + T')}</kbd>
          {t('Theme')}
        </p>
        <p>
          <kbd>{t('Ctrl/\u2318 + Alt + S')}</kbd>
          {t('Save layout')}
        </p>
        <p>
          <kbd>{t('Ctrl/\u2318 + Alt + N')}</kbd>
          {t('Notifications')}
        </p>
        <p>
          <kbd>{t('Esc')}</kbd>
          {t('Leave Focus mode')}
        </p>
      </details>
    </div>
  );
}

function Playground() {
  const { t } = useI18n();
  const { notify } = useNotifications();

  return (
    <div className="demo-playground">
      <p className="eyebrow">{t('A LITTLE ROOM TO EXPERIMENT')}</p>
      <h2>{t('Keep an idea here.')}</h2>
      <label htmlFor="demo-note">{t('Your workspace note')}</label>
      <Input.TextArea id="demo-note" placeholder={t('What will you build next?')} autoSize={{ minRows: 3, maxRows: 6 }} />
      <p className="demo-hint">{t('Your note stays while you move panels or use Focus mode.')}</p>
      <div className="demo-notification-controls">
        <Button size="small" onClick={() => notify({ title: t('A workspace update'), description: t('A regular informational notification.'), level: 'info' })}>
          {t('Send info')}
        </Button>
        <Button
          size="small"
          onClick={() => notify({ title: t('Check your workspace'), description: t('An example warning from the Playground.'), level: 'warning' })}
        >
          {t('Send warning')}
        </Button>
        <Button
          size="small"
          danger
          onClick={() => notify({ title: t('Example error'), description: t('A sticky error. Dismiss it when you are ready.'), level: 'error' })}
        >
          {t('Send error')}
        </Button>
      </div>
      <CommandExamples />
    </div>
  );
}

const panels: readonly WorkbenchPanel[] = [
  { id: 'guide', title: 'Getting started', component: WorkspaceGuide, position: { referencePanel: 'hello', direction: 'right' }, initialWidth: 360 },
  { id: 'playground', title: 'Playground', component: Playground, position: { referencePanel: 'guide', direction: 'below' }, initialHeight: 280 },
];

export function DemoApplication() {
  const { t } = useI18n();

  return (
    <Workbench
      title={t('dash.lab')}
      subtitle="Build once. Create many."
      logo={
        <span className="demo-logo" aria-hidden="true">
          d<span>.</span>
        </span>
      }
      headerActions={<Tag variant="outlined">{t('HELLO WORLD DEMO')}</Tag>}
      controlBar={
        <>
          <span className="demo-workspace-icon" aria-hidden="true">
            <AppstoreOutlined />
          </span>
          <strong className="demo-workspace-name">{t('Hello World')}</strong>
          <span className="demo-breadcrumb">/</span>
          <span className="demo-breadcrumb">{t('Workspace')}</span>
        </>
      }
      monitoringBar={
        <>
          <span className="demo-status">
            <span className="status-dot" />
            {t('Workspace ready')}
          </span>
          <span>{t('{count} panels', { count: panels.length + plugins.seal().panels.length })}</span>
          <span>{t('Local demo')}</span>
          <span className="demo-monitor-end">{t('YOUR NEXT IDEA STARTS HERE')}</span>
        </>
      }
      footer={
        <>
          <span>
            <span className="status-dot" />
            {t('All systems ready')}
          </span>
          <span>
            {t('dash-lab v0.1.0')}
            <span className="demo-footer-separator">·</span>
            {t('MIT licensed')}
          </span>
        </>
      }
      panels={panels}
      plugins={plugins}
    />
  );
}
