import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from '../layout/Workbench.js';
import { PluginRegistry } from './PluginRegistry.js';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

const notes = createStore(() => ({ text: '' }));

function NotesPanel() {
  const text = useStore(notes, (state) => state.text);

  return (
    <div style={{ padding: 32 }}>
      <p>Edit a note, then save/restore the layout or export/import configuration.</p>
      <textarea aria-label="Plugin note" value={text} onChange={(event) => notes.setState({ text: event.target.value })} />
    </div>
  );
}

const plugins = new PluginRegistry();

plugins.registerPlugin({
  id: 'example',
  activate(api) {
    api.registerState({
      exportState: () => notes.getState(),
      importState(value) {
        if (!value || typeof value !== 'object' || !('text' in value) || typeof value.text !== 'string') throw new Error('Invalid note state.');

        notes.setState({ text: value.text }, true);
      },
    });

    api.registerPanel({
      id: 'plugin-panel',
      title: 'Plugin panel',
      component: NotesPanel,
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
