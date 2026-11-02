import { Button, Input, Tag } from 'antd';
import { Workbench, useNotifications } from 'dash-lab';
import type { WorkbenchPanel } from 'dash-lab';
import { HelloWorld } from './plugins/hello-world';

function WorkspaceGuide() {
  return (
    <div className="demo-guide">
      <p className="eyebrow">MAKE YOURSELF AT HOME</p>
      <h2>Your space, your way.</h2>
      <p>Drag a tab to move a panel. Pull the edges to give an idea more room.</p>
      <ol className="demo-steps">
        <li>
          <span>01</span>
          <div>
            <strong>Shape your workspace</strong>
            <p>Dock panels beside or below each other.</p>
          </div>
        </li>
        <li>
          <span>02</span>
          <div>
            <strong>Clear the distractions</strong>
            <p>Hide the header or footer, or enter Focus mode.</p>
          </div>
        </li>
        <li>
          <span>03</span>
          <div>
            <strong>Make something yours</strong>
            <p>Replace this local demo with your application.</p>
          </div>
        </li>
      </ol>
      <div className="demo-note">
        <span className="status-dot" />
        All panels are live React components.
      </div>
    </div>
  );
}

function Playground() {
  const { notify } = useNotifications();
  return (
    <div className="demo-playground">
      <p className="eyebrow">A LITTLE ROOM TO EXPERIMENT</p>
      <h2>Keep an idea here.</h2>
      <label htmlFor="demo-note">Your workspace note</label>
      <Input.TextArea id="demo-note" placeholder="What will you build next?" autoSize={{ minRows: 3, maxRows: 6 }} />
      <p className="demo-hint">Your note stays while you move panels or use Focus mode.</p>
      <div className="demo-notification-controls">
        <Button size="small" onClick={() => notify({ title: 'A workspace update', description: 'A regular informational notification.', level: 'info' })}>
          Send info
        </Button>
        <Button
          size="small"
          onClick={() => notify({ title: 'Check your workspace', description: 'An example warning from the Playground.', level: 'warning' })}
        >
          Send warning
        </Button>
        <Button
          size="small"
          danger
          onClick={() => notify({ title: 'Example error', description: 'A sticky error. Dismiss it when you are ready.', level: 'error' })}
        >
          Send error
        </Button>
      </div>
    </div>
  );
}

const panels: readonly WorkbenchPanel[] = [
  { id: 'hello', title: 'Hello World', component: HelloWorld },
  { id: 'guide', title: 'Getting started', component: WorkspaceGuide, position: { referencePanel: 'hello', direction: 'right' }, initialWidth: 360 },
  { id: 'playground', title: 'Playground', component: Playground, position: { referencePanel: 'guide', direction: 'below' }, initialHeight: 280 },
];

export function DemoApplication() {
  return (
    <Workbench
      title="dash.lab"
      subtitle="Build once. Create many."
      logo={
        <span className="demo-logo" aria-hidden="true">
          d<span>.</span>
        </span>
      }
      headerActions={<Tag variant="outlined">HELLO WORLD DEMO</Tag>}
      controlBar={
        <>
          <span className="demo-workspace-icon" aria-hidden="true">
            ▦
          </span>
          <strong className="demo-workspace-name">Hello World</strong>
          <span className="demo-breadcrumb">/</span>
          <span className="demo-breadcrumb">Workspace</span>
        </>
      }
      monitoringBar={
        <>
          <span className="demo-status">
            <span className="status-dot" />
            Workspace ready
          </span>
          <span>3 panels</span>
          <span>Local demo</span>
          <span className="demo-monitor-end">YOUR NEXT IDEA STARTS HERE</span>
        </>
      }
      footer={
        <>
          <span>
            <span className="status-dot" />
            All systems ready
          </span>
          <span>
            dash-lab v0.1.0<span className="demo-footer-separator">·</span>MIT licensed
          </span>
        </>
      }
      panels={panels}
    />
  );
}
