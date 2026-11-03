import { useState } from 'react';
import type { ReactNode } from 'react';
import { NotificationContext } from './NotificationContext.js';
import { createNotificationStore } from './notificationStore.js';
import { NotificationViewport } from './NotificationViewport.js';

/** Options for a session notification center. */
export interface NotificationProviderProps {
  /** Application content that can publish and inspect notifications. */
  children: ReactNode;
  /** Maximum retained entries. Defaults to 100; keep stable while mounted. */
  historyLimit?: number;
}

/** Provides an isolated center, toast stack, and accessible history dialog. */
export function NotificationProvider({ children, historyLimit = 100 }: NotificationProviderProps) {
  const [store] = useState(() => createNotificationStore(historyLimit));

  return (
    <NotificationContext.Provider value={store}>
      {children}
      <NotificationViewport />
    </NotificationContext.Provider>
  );
}
