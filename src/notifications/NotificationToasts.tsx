import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider.js';
import { useNotifications } from './NotificationContext.js';
import type { NotificationItem } from './notificationStore.js';

function Toast({ item, exiting, onExited }: { item: NotificationItem; exiting: boolean; onExited: (id: string) => void }) {
  const { t } = useI18n();
  const { dismiss } = useNotifications();
  const element = useRef<HTMLElement>(null);

  useEffect(() => {
    if (exiting || item.durationMs === 0) return;

    const timer = setTimeout(() => dismiss(item.id), item.durationMs);

    return () => clearTimeout(timer);
  }, [dismiss, exiting, item.id, item.durationMs]);

  useLayoutEffect(() => {
    if (!exiting || !element.current) return;

    const animations = element.current.getAnimations();

    if (!animations.length) {
      onExited(item.id);

      return;
    }

    let cancelled = false;
    const finish = () => {
      if (!cancelled) onExited(item.id);
    };
    const duration = Math.max(...animations.map((animation) => Number(animation.effect?.getComputedTiming().endTime) || 0));
    const timer = setTimeout(finish, Math.min(duration, 2000) + 100);

    void Promise.allSettled(animations.map((animation) => animation.finished)).then(finish);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [exiting, item.id, onExited]);

  return (
    <article
      ref={element}
      className="dl-notification-toast"
      data-level={item.level}
      data-exiting={exiting || undefined}
      inert={exiting}
      aria-hidden={exiting || undefined}
      role={exiting ? undefined : item.level === 'error' ? 'alert' : 'status'}
    >
      <div>
        <strong>{item.title}</strong>
        {item.description && <p>{item.description}</p>}
      </div>
      <button type="button" className="dl-icon-button" aria-label={t('Dismiss notification: {title}', { title: item.title })} onClick={() => dismiss(item.id)}>
        ×
      </button>
    </article>
  );
}

export function NotificationToasts() {
  const { t } = useI18n();
  const { items, toasts } = useNotifications();
  const active = useMemo(() => toasts.flatMap((id) => items.find((item) => item.id === id) ?? []), [items, toasts]);
  const [present, setPresent] = useState<readonly NotificationItem[]>(active);
  const onExited = useCallback((id: string) => setPresent((current) => current.filter((item) => item.id !== id)), []);

  useLayoutEffect(() => {
    setPresent((current) => [
      ...active.filter((item) => !current.some((entry) => entry.id === item.id)),
      ...current.map((item) => active.find((entry) => entry.id === item.id) ?? item),
    ]);
  }, [active, toasts]);

  return (
    <div className="dl-notification-toasts" aria-label={t('Recent notifications')}>
      {present.map((item) => (
        <Toast key={item.id} item={item} exiting={!toasts.includes(item.id)} onExited={onExited} />
      ))}
    </div>
  );
}
