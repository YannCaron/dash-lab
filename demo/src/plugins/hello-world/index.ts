import type { WorkbenchPlugin } from 'dash-lab';
import { HelloWorld } from './HelloWorld';

const plugin: WorkbenchPlugin = {
  id: 'hello-world',
  activate(api) {
    api.registerPanel({ id: 'hello', title: 'Hello World', component: HelloWorld });
    api.registerCommand({
      id: 'hello-world.greet',
      title: 'Say hello from the plugin',
      execute: ({ notify }) => {
        notify({ title: 'Hello from the local plugin!', level: 'success' });
      },
    });
    api.registerMenu({ id: 'hello-world.greet', title: 'Say hello', commandId: 'hello-world.greet' });
    api.registerStatusItem({ id: 'hello-world.status', component: () => 'Hello World ready' });
    api.registerMonitoringItem({ id: 'hello-world.monitoring', component: () => 'Local plugin active' });
  },
};
export default plugin;
