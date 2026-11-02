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
  args: { title: 'Example application', children: 'Hello World', layoutStorageKey: false, preferencesStorageKey: false },
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
export const SettingsAndPreferences: Story = {
  args: { ...DockedWorkspace.args, controlBar: 'Open File in the hamburger menu to try Settings, Preferences, and JSON configuration.' },
};
export const OverflowingPanel: Story = {
  args: {
    panels: [
      {
        id: 'long-content',
        title: 'Scrollable content',
        component: () => (
          <div style={{ padding: 24 }}>
            {Array.from({ length: 60 }, (_, index) => (
              <p key={index}>Line {index + 1} — the panel scrolls independently from the workbench.</p>
            ))}
          </div>
        ),
      },
    ],
  },
};
