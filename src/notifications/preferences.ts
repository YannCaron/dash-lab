/** User choices for notification popups; history is always retained. */
export interface NotificationPreferences {
  /** Whether new notifications display a toast. */
  toastsEnabled: boolean;
  /** Default non-error duration: whole seconds between 1000 and 30000 milliseconds. */
  toastDurationMs: number;
}

export const defaultNotificationPreferences: NotificationPreferences = { toastsEnabled: true, toastDurationMs: 5000 };

export function validateNotificationPreferences(value: unknown): asserts value is NotificationPreferences {
  const preferences = value as Partial<NotificationPreferences> | null;
  if (
    !preferences ||
    typeof preferences.toastsEnabled !== 'boolean' ||
    typeof preferences.toastDurationMs !== 'number' ||
    !Number.isInteger(preferences.toastDurationMs / 1000) ||
    preferences.toastDurationMs < 1000 ||
    preferences.toastDurationMs > 30000
  )
    throw new Error('Notification preferences require a popup choice and a duration of 1–30 whole seconds.');
}
