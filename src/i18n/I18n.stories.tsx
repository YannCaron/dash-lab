import { Button, Empty } from 'antd';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Workbench } from '../layout/Workbench.js';
import { I18nProvider, useI18n } from './I18nProvider.js';

function LanguageButton() {
  const { locale, setLocale } = useI18n();

  return <Button onClick={() => setLocale(locale === 'en' ? 'fr' : 'en')}>English / Français</Button>;
}

const meta = {
  title: 'Workbench/Languages',
  component: Workbench,
  args: { title: 'Language example', preferencesStorageKey: false, layoutStorageKey: false, controlBar: <LanguageButton />, children: <Empty /> },
  decorators: [
    (Story) => (
      <I18nProvider>
        <div style={{ height: '100vh' }}>
          <Story />
        </div>
      </I18nProvider>
    ),
  ],
} satisfies Meta<typeof Workbench>;

export default meta;
export const Default: StoryObj<typeof meta> = {};
