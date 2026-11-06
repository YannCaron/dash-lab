import { useI18n } from '../i18n/I18nProvider.js';
import type { useLayoutManagement } from './useLayoutManagement.js';
import { useState } from 'react';
import { Dropdown } from 'antd';
import {
  CheckOutlined,
  EyeInvisibleOutlined,
  AppstoreOutlined,
  LayoutOutlined,
  ColumnWidthOutlined,
  ColumnHeightOutlined,
  TableOutlined,
} from '@ant-design/icons';
import type { WorkbenchPanel } from './panels.js';

function LayoutIcon({ kind }: { kind: 'default' | 'columns' | 'rows' | 'custom' }) {
  const Icon = { default: LayoutOutlined, columns: ColumnWidthOutlined, rows: ColumnHeightOutlined, custom: TableOutlined }[kind];

  return <Icon />;
}

export function LayoutControls({
  layout,
  panels,
  hiddenPanels,
}: {
  layout: ReturnType<typeof useLayoutManagement>;
  panels: readonly WorkbenchPanel[];
  hiddenPanels: readonly string[];
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="dl-layout-controls" role="group" aria-label={t('Layout management')}>
      <span className="dl-toolbar-label">{t('LAYOUT')}</span>
      <Dropdown
        open={open}
        onOpenChange={(next, info) => {
          if (info.source !== 'menu') setOpen(next);
        }}
        trigger={['click']}
        menu={{
          items: panels
            .filter((panel) => !panel.closeable)
            .map((panel) => ({
              key: panel.id,
              label: t(panel.title),
              role: 'menuitemcheckbox',
              'aria-checked': !hiddenPanels.includes(panel.id),
              icon: hiddenPanels.includes(panel.id) ? <EyeInvisibleOutlined /> : <CheckOutlined />,
              onClick: () => layout.setPanelVisible(panel.id, hiddenPanels.includes(panel.id)),
            })),
        }}
      >
        <button
          type="button"
          className="dl-icon-button"
          data-visible-tabs-trigger
          aria-label={t('Visible tabs')}
          title={t('Visible tabs')}
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!layout.ready}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          <AppstoreOutlined />
        </button>
      </Dropdown>
      {(['default', 'columns', 'rows'] as const).map((preset) => {
        const title = preset === 'default' ? 'Application layout' : preset === 'columns' ? 'Columns layout' : 'Rows layout';

        return (
          <button
            key={preset}
            type="button"
            className="dl-icon-button"
            aria-label={t(title ?? '')}
            title={t(title ?? '')}
            disabled={!layout.ready}
            onClick={() => layout.selectPreset(preset)}
          >
            <LayoutIcon kind={preset} />
          </button>
        );
      })}
      <button
        type="button"
        className="dl-icon-button"
        aria-label={t('Custom layout')}
        title={t('Restore custom layout')}
        disabled={!layout.ready || !layout.hasSaved}
        onClick={layout.restore}
      >
        <LayoutIcon kind="custom" />
      </button>
    </div>
  );
}
