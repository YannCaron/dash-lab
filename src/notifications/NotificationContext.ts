import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { createNotificationStore, NotificationCenterState } from './notificationStore.js';

export const NotificationContext = createContext<ReturnType<typeof createNotificationStore> | null>(null);

/** Reads the nearest center; requires NotificationProvider or a Workbench ancestor. */
export function useNotifications(): NotificationCenterState {
  const store = useContext(NotificationContext);

  if (!store) throw new Error('useNotifications must be used inside NotificationProvider or Workbench.');

  return useStore(store);
}
