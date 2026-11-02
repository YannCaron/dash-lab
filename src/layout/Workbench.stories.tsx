import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from './Workbench';

const meta = {
  title: 'Workbench/Foundation',
  component: Workbench,
  args: { title: 'Example application', children: 'Hello World' },
  decorators: [
    (Story) => (
      <div style={{ height: '100vh' }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Workbench>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
