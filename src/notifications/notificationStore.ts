import { createStore } from 'zustand/vanilla';
import { defaultNotificationPreferences, validateNotificationPreferences } from './preferences.js';
import type { NotificationPreferences } from './preferences.js';

/** Severity used by notifications and their accessible presentation. */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

/** Content of a new notification. */
export interface NotificationInput {
  /** Short, nonempty message. */
  title: string;
  /** Optional supporting text, rendered as plain text. */
  description?: string;
  /** Defaults to info. */
  level?: NotificationLevel;
  /** Toast duration in milliseconds; zero keeps it visible. Errors default to zero, other levels use the popup preference (initially 5000). */
  durationMs?: number;
}

/** A notification retained in the session history. */
export interface NotificationItem extends NotificationInput {
  /** Identifier unique within this notification center. */
  readonly id: string;
  /** Creation time as milliseconds since the Unix epoch. */
  readonly createdAt: number;
  /** Whether the user has acknowledged this notification. */
  readonly read: boolean;
  /** Resolved severity. */
  readonly level: NotificationLevel;
  /** Resolved toast duration. */
  readonly durationMs: number;
}

/** State and operations returned by useNotifications. */
export interface NotificationCenterState {
  /** Preferences for new notifications. */
  preferences: NotificationPreferences;
  /** Validate and replace popup preferences; disabling popups also dismisses active toasts. */
  setPreferences: (preferences: NotificationPreferences) => void;
  /** Bounded session history, newest first. */
  items: readonly NotificationItem[];
  /** IDs of visible toasts, newest first. */
  toasts: readonly string[];
  /** Whether the history dialog is open. */
  open: boolean;
  /** Add a notification and return its ID. */
  notify: (input: NotificationInput) => string;
  /** Hide a toast while retaining its history and unread state. */
  dismiss: (id: string) => void;
  /** Acknowledge an entry. */
  markRead: (id: string) => void;
  /** Acknowledge all current entries. */
  markAllRead: () => void;
  /** Remove an entry and its toast. */
  remove: (id: string) => void;
  /** Remove all entries and toasts. */
  clearHistory: () => void;
  /** Open or close history. */
  setOpen: (open: boolean) => void;
}

export function createNotificationStore(historyLimit = 100) {
  if (!Number.isInteger(historyLimit) || historyLimit < 1) throw new Error('Notification historyLimit must be a positive integer.');

  let sequence = 0;

  return createStore<NotificationCenterState>((set, get) => ({
    preferences: { ...defaultNotificationPreferences },
    setPreferences: (preferences) => {
      validateNotificationPreferences(preferences);
      set((state) => ({ preferences: { ...preferences }, toasts: preferences.toastsEnabled ? state.toasts : [] }));
    },
    items: [],
    toasts: [],
    open: false,
    notify: (input) => {
      if (!input.title.trim()) throw new Error('A notification title must not be empty.');

      const level = input.level ?? 'info';
      const durationMs = input.durationMs ?? (level === 'error' ? 0 : get().preferences.toastDurationMs);

      if (!Number.isFinite(durationMs) || durationMs < 0) throw new Error('Notification duration must be a nonnegative finite number.');

      const createdAt = Date.now();
      const item: NotificationItem = { ...input, title: input.title.trim(), id: `${createdAt}-${++sequence}`, createdAt, read: false, level, durationMs };

      set((state) => {
        const items = [item, ...state.items].slice(0, historyLimit);
        const retained = new Set(items.map((entry) => entry.id));

        return { items, toasts: state.preferences.toastsEnabled ? [item.id, ...state.toasts].filter((id) => retained.has(id)).slice(0, 3) : [] };
      });

      return item.id;
    },
    dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast !== id) })),
    markRead: (id) => set((state) => ({ items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)) })),
    markAllRead: () => set((state) => ({ items: state.items.map((item) => ({ ...item, read: true })) })),
    remove: (id) => set((state) => ({ items: state.items.filter((item) => item.id !== id), toasts: state.toasts.filter((toast) => toast !== id) })),
    clearHistory: () => set({ items: [], toasts: [] }),
    setOpen: (open) => set({ open }),
  }));
}
