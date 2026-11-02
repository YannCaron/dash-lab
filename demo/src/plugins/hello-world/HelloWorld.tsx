import { useI18n } from 'dash-lab';
import { useState } from 'react';
import { Button, Input } from 'antd';
import { useNotifications } from 'dash-lab';
export function HelloWorld() {
  const { t } = useI18n();
  const [name, setName] = useState('World');
  const [greeting, setGreeting] = useState<string | null>(null);
  const { notify } = useNotifications();
  return (
    <div className="hello-world">
      <p className="eyebrow">{t('YOUR FIRST WORKSPACE')}</p>
      <h1>
        {t('Hello World')}
        <span>.</span>
      </h1>
      <p className="hello-description">
        {t('A small beginning.')}
        <br />
        {t('A workbench for everything you build next.')}
      </p>
      <form
        className="hello-form"
        onSubmit={(event) => {
          event.preventDefault();
          const message = t('Hello, {name}!', { name: name.trim() || 'World' });
          setGreeting(message);
          notify({ title: message, description: t('Your Hello World plugin sent this notification.'), level: 'success' });
        }}
      >
        <label htmlFor="hello-name">{t("LET'S MAKE IT PERSONAL")}</label>
        <div className="hello-input-row">
          <Input id="hello-name" value={name} onChange={(event) => setName(event.target.value)} placeholder={t('Your name')} />
          <Button type="primary" htmlType="submit">
            {t('Say hello')}
            <span aria-hidden="true">↗</span>
          </Button>
        </div>
        <p className="hello-result" role="status">
          {greeting ?? t('Your first interaction is one hello away.')}
        </p>
      </form>
      <div className="hello-capabilities">
        <span>{t('REACT + TYPESCRIPT')}</span>
        <span>{t('DOCKABLE PANELS')}</span>
        <span>{t('MIT LICENSED')}</span>
      </div>
      <div className="hello-local">
        <span className="hello-local-mark" aria-hidden="true">
          ⌘
        </span>
        <div>
          <strong>{t('A local plugin. A real starting point.')}</strong>
          <p>{t("This panel lives in your application's plugins directory.")}</p>
        </div>
      </div>
    </div>
  );
}
