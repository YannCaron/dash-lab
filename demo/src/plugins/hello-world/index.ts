import type { WorkbenchPlugin } from 'dash-lab';
import { useI18n } from 'dash-lab';
import { HelloWorld } from './HelloWorld';
import { helloStateHandler } from './state';

function StatusItem() {
  return useI18n().t('Hello World ready');
}

function MonitoringItem() {
  return useI18n().t('Local plugin active');
}

const plugin: WorkbenchPlugin = {
  id: 'hello-world',
  activate(api) {
    api.registerState(helloStateHandler);
    api.registerPanel({ id: 'hello', title: 'Hello World', component: HelloWorld });

    api.registerCommand({
      id: 'hello-world.greet',
      title: 'Say hello from the plugin',
      execute: ({ notify }) => {
        notify({ title: 'Hello from the local plugin!', level: 'success' });
      },
    });

    api.registerMenu({ id: 'hello-world.greet', title: 'Say hello', commandId: 'hello-world.greet' });
    api.registerStatusItem({ id: 'hello-world.status', component: StatusItem });
    api.registerMonitoringItem({ id: 'hello-world.monitoring', component: MonitoringItem });
  },
};

export default plugin;
