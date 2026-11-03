import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from '../layout/Workbench.js';
import { PluginRegistry } from './PluginRegistry.js';

const plugins = new PluginRegistry();

plugins.registerPlugin({
  id: 'example',
  activate(api) {
    api.registerPanel({
      id: 'plugin-panel',
      title: 'Plugin panel',
      component: () => <div style={{ padding: 32 }}>Open Plugins → Say hello or search the command palette.</div>,
    });

    api.registerCommand({
      id: 'example.greet',
      title: 'Say hello',
      execute: ({ notify }) => {
        notify({ title: 'Hello from a local plugin', level: 'success' });
      },
    });

    api.registerMenu({ id: 'example.greet', title: 'Say hello', commandId: 'example.greet' });
    api.registerStatusItem({ id: 'example.status', component: () => 'Plugin ready' });
    api.registerMonitoringItem({ id: 'example.monitor', component: () => 'Monitoring contribution' });
  },
});

const meta = {
  title: 'Workbench/Plugins',
  component: Workbench,
  args: { title: 'Plugin example', plugins, layoutStorageKey: false, preferencesStorageKey: false },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Workbench>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
