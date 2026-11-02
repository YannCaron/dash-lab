import { useState } from 'react';
import { Button, Input } from 'antd';
import { useNotifications } from 'dash-lab';

export function HelloWorld() {
  const [name, setName] = useState('World');
  const [greeting, setGreeting] = useState<string | null>(null);
  const { notify } = useNotifications();

  return (
    <div className="hello-world">
      <p className="eyebrow">YOUR FIRST WORKSPACE</p>
      <h1>
        Hello World<span>.</span>
      </h1>
      <p className="hello-description">
        A small beginning.
        <br />A workbench for everything you build next.
      </p>
      <form
        className="hello-form"
        onSubmit={(event) => {
          event.preventDefault();
          const message = `Hello, ${name.trim() || 'World'}!`;
          setGreeting(message);
          notify({ title: message, description: 'Your Hello World plugin sent this notification.', level: 'success' });
        }}
      >
        <label htmlFor="hello-name">LET'S MAKE IT PERSONAL</label>
        <div className="hello-input-row">
          <Input id="hello-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
          <Button type="primary" htmlType="submit">
            Say hello <span aria-hidden="true">↗</span>
          </Button>
        </div>
        <p className="hello-result" role="status">
          {greeting ?? 'Your first interaction is one hello away.'}
        </p>
      </form>
      <div className="hello-capabilities">
        <span>REACT + TYPESCRIPT</span>
        <span>DOCKABLE PANELS</span>
        <span>MIT LICENSED</span>
      </div>
      <div className="hello-local">
        <span className="hello-local-mark" aria-hidden="true">
          ⌘
        </span>
        <div>
          <strong>A local plugin. A real starting point.</strong>
          <p>This panel lives in your application's plugins directory.</p>
        </div>
      </div>
    </div>
  );
}
