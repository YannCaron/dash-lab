import { useEffect } from 'react';
import { Button } from 'antd';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from '../layout/Workbench.js';
import { useNotifications } from '../notifications/NotificationContext.js';
import { useCommands } from './CommandContext.js';

function ExampleAction() {
  const { register, execute } = useCommands();
  const { notify } = useNotifications();

  useEffect(
    () =>
      register({
        id: 'story.greet',
        title: 'Say hello',
        shortcut: 'Mod+Enter',
        execute: () => {
          notify({ title: 'Hello from a command', level: 'success' });
        },
      }),
    [register, notify],
  );

  return (
    <Button
      onClick={() => {
        void execute('story.greet');
      }}
    >
      Run action · Ctrl/⌘+Enter
    </Button>
  );
}

const meta = {
  title: 'Workbench/Commands',
  component: Workbench,
  args: {
    title: 'Command example',
    preferencesStorageKey: false,
    layoutStorageKey: false,
    controlBar: <ExampleAction />,
    children: 'Click the command button or use its shortcut. Try Ctrl/⌘+Alt+T for the built-in theme command.',
  },
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
export const AnimatedDialogs: StoryObj<typeof meta> = {
  args: {
    children: 'Open Commands, Settings, Preferences, or Notifications. Close with Escape, the backdrop, or the close button to preview entry and exit motion.',
  },
};
