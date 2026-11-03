import { useI18n } from '../i18n/I18nProvider.js';
import { useEffect, useId, useRef } from 'react';
import { useNotifications } from './NotificationContext.js';
import { NotificationToasts } from './NotificationToasts.js';
import { useDialogDismiss } from '../overlays/useDialogDismiss.js';
import { closeDialog, openDialog } from '../overlays/dialogMotion.js';

export function NotificationViewport() {
  const { t, locale } = useI18n();
  const { items, open, setOpen, markRead, markAllRead, remove, clearHistory } = useNotifications();
  const dialog = useRef<HTMLDialogElement>(null);
  const dismissal = useDialogDismiss(() => setOpen(false));
  const closeButton = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const unread = items.filter((item) => !item.read).length;

  useEffect(() => {
    if (open) {
      openDialog(dialog.current);
      closeButton.current?.focus();
    } else void closeDialog(dialog.current);
  }, [open]);

  return (
    <>
      <NotificationToasts />
      <dialog {...dismissal} ref={dialog} className="dl-notification-center dl-modal" aria-labelledby={titleId}>
        <header className="dl-notification-heading">
          <div>
            <h2 id={titleId}>{t('Notifications')}</h2>
            <p>{t('{unread} unread · {count} in history', { unread, count: items.length })}</p>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="dl-icon-button dl-dialog-close"
            aria-label={t('Close notifications')}
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </header>
        <div className="dl-notification-actions">
          <button type="button" disabled={!unread} onClick={markAllRead}>
            {t('Mark all read')}
          </button>
          <button type="button" disabled={!items.length} onClick={clearHistory}>
            {t('Clear history')}
          </button>
        </div>
        <div className="dl-notification-history">
          {!items.length && (
            <div className="dl-notification-empty">
              <h3>{t("You're all caught up.")}</h3>
              <p>{t('New notifications will appear here.')}</p>
            </div>
          )}
          {items.map((item) => (
            <article key={item.id} className="dl-notification-entry" data-level={item.level} data-read={item.read}>
              <div className="dl-notification-meta">
                <span>{t(item.level)}</span>
                <time dateTime={new Date(item.createdAt).toISOString()}>
                  {new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(item.createdAt)}
                </time>
              </div>
              <h3>{item.title}</h3>
              {item.description && <p>{item.description}</p>}
              <div className="dl-notification-entry-actions">
                {!item.read && (
                  <button type="button" aria-label={t('Mark as read: {title}', { title: item.title })} onClick={() => markRead(item.id)}>
                    {t('Mark as read')}
                  </button>
                )}
                <button type="button" aria-label={t('Remove notification: {title}', { title: item.title })} onClick={() => remove(item.id)}>
                  {t('Remove')}
                </button>
              </div>
            </article>
          ))}
        </div>
      </dialog>
    </>
  );
}
