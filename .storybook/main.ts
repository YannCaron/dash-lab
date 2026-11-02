import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  framework: { name: '@storybook/react-vite', options: { builder: { viteConfigPath: 'vite.storybook.config.ts' } } },
  core: { disableTelemetry: true },
  typescript: { reactDocgen: false },
};

export default config;
