import { BellOutlined } from '@ant-design/icons';
import { useI18n } from '../i18n/I18nProvider.js';
import { useNotifications } from './NotificationContext.js';

/** Opens the nearest notification history and displays its unread count. */
export function NotificationButton() {
  const { t } = useI18n();
  const { items, setOpen } = useNotifications();
  const unread = items.filter((item) => !item.read).length;

  return (
    <button
      type="button"
      className="dl-icon-button dl-notification-button"
      aria-label={t('Open notifications')}
      title={t('Notifications ({count} unread)', { count: unread })}
      onClick={() => setOpen(true)}
    >
      <BellOutlined />
      {unread > 0 && (
        <span className="dl-notification-count" aria-label={t('{count} unread notifications', { count: unread })}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
