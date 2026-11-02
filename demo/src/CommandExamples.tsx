import { useI18n } from 'dash-lab';
import { useEffect } from 'react';
import { Button } from 'antd';
import { useCommands, useNotifications } from 'dash-lab';
export function CommandExamples() {
  const { t } = useI18n();
  const { register, execute } = useCommands();
  const { notify } = useNotifications();
  useEffect(() => {
    const removeGreeting = register({
      id: 'demo.notify',
      title: 'Send a demo notification',
      shortcut: 'Mod+Enter',
      execute: () => {
        notify({ title: t('Command executed'), description: t('The same action works from a button or keyboard shortcut.'), level: 'success' });
      },
    });
    const removeFailure = register({
      id: 'demo.fail',
      title: 'Example failed action',
      execute: async () => {
        throw new Error('This is a demonstration failure. The workspace is still ready.');
      },
    });
    return () => {
      removeGreeting();
      removeFailure();
    };
  }, [register, notify]);
  return (
    <div className="demo-command-examples">
      <p className="demo-hint">
        {t('Try an application command.')}
        <kbd>{t('Ctrl/\u2318 + Enter')}</kbd>
        {t('runs it outside text fields.')}
      </p>
      <div className="demo-notification-controls">
        <Button
          size="small"
          onClick={() => {
            void execute('demo.notify');
          }}
        >
          {t('Send via command')}
        </Button>
        <Button
          size="small"
          onClick={() => {
            void execute('demo.fail');
          }}
        >
          {t('Try failed command')}
        </Button>
      </div>
    </div>
  );
}
