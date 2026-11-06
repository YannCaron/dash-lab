import { describe, expect, it } from 'vitest';
import { createLayoutStore } from './layoutStore.js';

describe('workbench visibility', () => {
  it('uses one view action to hide both chrome regions and restore both from a hidden view', () => {
    for (const [header, footer] of [
      [true, true],
      [true, false],
      [false, true],
    ]) {
      const store = createLayoutStore(header, footer);

      store.getState().toggleView();

      expect(store.getState()).toMatchObject({ headerVisible: false, footerVisible: false, focusMode: false });

      store.getState().toggleView();

      expect(store.getState()).toMatchObject({ headerVisible: true, footerVisible: true });
    }
  });

  it('restores the exact header and footer preferences after focus mode', () => {
    const store = createLayoutStore(false, true);

    store.getState().toggleFooter();
    store.getState().toggleFocus();

    expect(store.getState()).toMatchObject({ focusMode: true, headerVisible: false, footerVisible: false });

    store.getState().toggleFocus();

    expect(store.getState()).toMatchObject({ focusMode: false, headerVisible: false, footerVisible: false });
  });

  it('allows explicitly setting focus mode on or off', () => {
    const store = createLayoutStore();

    store.getState().setFocusMode(true);
    expect(store.getState().focusMode).toBe(true);

    store.getState().setFocusMode(false);
    expect(store.getState().focusMode).toBe(false);

    // Calling setFocusMode with same value is idempotent
    store.getState().setFocusMode(false);
    expect(store.getState().focusMode).toBe(false);
  });

  it('keeps separate application instances independent', () => {
    const first = createLayoutStore();
    const second = createLayoutStore();

    first.getState().toggleHeader();
    first.getState().toggleFocus();

    expect(second.getState()).toMatchObject({ headerVisible: true, footerVisible: true, focusMode: false });
  });
});
