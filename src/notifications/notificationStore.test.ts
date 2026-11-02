import { describe, expect, it } from 'vitest';
import { createNotificationStore } from './notificationStore.js';

describe('notification history', () => {
  it('disables popups without losing history and applies duration preferences to new non-error toasts', () => {
    const center = createNotificationStore();
    center.getState().notify({ title: 'Existing' });
    center.getState().setPreferences({ toastsEnabled: false, toastDurationMs: 2000 });
    center.getState().notify({ title: 'Silent error', level: 'error' });
    expect(center.getState().toasts).toEqual([]);
    expect(center.getState().items).toHaveLength(2);
    expect(center.getState().items[0]).toMatchObject({ title: 'Silent error', durationMs: 0, read: false });
    center.getState().setPreferences({ toastsEnabled: true, toastDurationMs: 2000 });
    const id = center.getState().notify({ title: 'Timed' });
    expect(center.getState().toasts).toEqual([id]);
    expect(center.getState().items[0]?.durationMs).toBe(2000);
    center.getState().notify({ title: 'Explicit', durationMs: 125 });
    expect(center.getState().items[0]?.durationMs).toBe(125);
  });

  it('rejects invalid popup preferences before changing state and copies accepted input', () => {
    const center = createNotificationStore();
    const original = center.getState();
    for (const toastDurationMs of [0, 500, 1500, 31000, NaN]) {
      expect(() => original.setPreferences({ toastsEnabled: false, toastDurationMs })).toThrow('1–30');
      expect(center.getState()).toBe(original);
    }
    const preferences = { toastsEnabled: false, toastDurationMs: 1000 };
    original.setPreferences(preferences);
    preferences.toastsEnabled = true;
    expect(center.getState().preferences.toastsEnabled).toBe(false);
  });
  it('keeps dismissed toasts in unread history until explicitly acknowledged', () => {
    const center = createNotificationStore();
    const id = center.getState().notify({ title: 'Saved', level: 'success' });
    const original = center.getState().items[0];
    center.getState().dismiss(id);
    expect(center.getState().toasts).toEqual([]);
    expect(center.getState().items[0]).toMatchObject({ title: 'Saved', read: false });
    center.getState().markRead(id);
    expect(center.getState().items[0]?.read).toBe(true);
    expect(original?.read).toBe(false);
  });

  it('bounds newest-first history and removes evicted toast references', () => {
    const center = createNotificationStore(2);
    const first = center.getState().notify({ title: 'First' });
    const second = center.getState().notify({ title: 'Second' });
    const third = center.getState().notify({ title: 'Third' });
    expect(new Set([first, second, third]).size).toBe(3);
    expect(center.getState().items.map((item) => item.title)).toEqual(['Third', 'Second']);
    expect(center.getState().toasts).toEqual([third, second]);
  });

  it('limits the visible stack to three while retaining the full bounded history', () => {
    const center = createNotificationStore();
    for (let index = 0; index < 5; index++) center.getState().notify({ title: `Message ${index}` });
    expect(center.getState().items).toHaveLength(5);
    expect(center.getState().toasts).toHaveLength(3);
  });

  it('supports acknowledgment, individual removal, and clearing history', () => {
    const center = createNotificationStore();
    const id = center.getState().notify({ title: 'One' });
    center.getState().notify({ title: 'Two' });
    center.getState().markAllRead();
    expect(center.getState().items.every((item) => item.read)).toBe(true);
    center.getState().remove(id);
    expect(center.getState().items).toHaveLength(1);
    expect(center.getState().toasts).not.toContain(id);
    center.getState().clearHistory();
    expect(center.getState()).toMatchObject({ items: [], toasts: [] });
  });

  it('keeps separate centers independent and makes error toasts sticky by default', () => {
    const first = createNotificationStore();
    const second = createNotificationStore();
    first.getState().notify({ title: 'Failure', level: 'error' });
    first.getState().setOpen(true);
    expect(first.getState().items[0]?.durationMs).toBe(0);
    expect(second.getState()).toMatchObject({ items: [], toasts: [], open: false });
  });

  it('rejects invalid retention limits and notification content', () => {
    for (const limit of [0, -1, 1.5, NaN]) expect(() => createNotificationStore(limit)).toThrow('positive integer');
    const center = createNotificationStore();
    expect(() => center.getState().notify({ title: ' ' })).toThrow('must not be empty');
    for (const durationMs of [-1, NaN, Infinity]) expect(() => center.getState().notify({ title: 'Invalid', durationMs })).toThrow('nonnegative');
  });
});
