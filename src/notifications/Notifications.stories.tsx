import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from 'antd';
import { ThemeProvider } from '../theme/ThemeProvider.js';
import { NotificationProvider } from './NotificationProvider.js';
import { NotificationButton } from './NotificationButton.js';
import { useNotifications } from './NotificationContext.js';

function Examples() {
  const { notify } = useNotifications();

  return (
    <div style={{ display: 'flex', gap: 12, padding: 24 }}>
      <NotificationButton />
      <Button onClick={() => notify({ title: 'Your work is saved', level: 'success' })}>Send success</Button>
      <Button danger onClick={() => notify({ title: 'A sample error', description: 'Dismiss the toast and find it again in history.', level: 'error' })}>
        Send error
      </Button>
    </div>
  );
}

const meta = {
  title: 'Workbench/Notifications',
  component: Examples,
  decorators: [
    (Story) => (
      <ThemeProvider>
        <NotificationProvider>
          <Story />
        </NotificationProvider>
      </ThemeProvider>
    ),
  ],
} satisfies Meta<typeof Examples>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
