import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from './Workbench.js';
import type { WorkbenchPanel } from './panels.js';
import { ThemeProvider } from '../theme/ThemeProvider.js';

const panels: readonly WorkbenchPanel[] = [
  {
    id: 'welcome',
    title: 'Welcome',
    component: () => (
      <div style={{ padding: 32 }}>
        <h1>Hello World</h1>
        <p>Drag this tab or try Focus mode.</p>
      </div>
    ),
  },
  {
    id: 'notes',
    title: 'Notes',
    component: () => <textarea aria-label="Notes" style={{ width: '100%', height: '100%' }} />,
    position: { referencePanel: 'welcome', direction: 'right' },
    initialWidth: 320,
  },
];

const meta = {
  title: 'Workbench/Shell',
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
export const DockedWorkspace: Story = { args: { panels, controlBar: 'Default workspace', monitoringBar: 'Ready', footer: 'Example application' } };
export const HiddenChrome: Story = { args: { ...DockedWorkspace.args, initialHeaderVisible: false, initialFooterVisible: false } };
export const DarkWorkspace: Story = {
  args: { ...DockedWorkspace.args },
  decorators: [
    (Story) => (
      <ThemeProvider initialMode="dark">
        <Story />
      </ThemeProvider>
    ),
  ],
};
