import { useNotifications } from './NotificationContext.js';

/** Opens the nearest notification history and displays its unread count. */
export function NotificationButton() {
  const { items, setOpen } = useNotifications();
  const unread = items.filter((item) => !item.read).length;
  return (
    <button
      type="button"
      className="dl-icon-button dl-notification-button"
      aria-label="Open notifications"
      title={`Notifications (${unread} unread)`}
      onClick={() => setOpen(true)}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M5 16h14l-2-3V9a5 5 0 0 0-10 0v4zM9 20h6" />
      </svg>
      {unread > 0 && (
        <span className="dl-notification-count" aria-label={`${unread} unread notifications`}>
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  );
}
