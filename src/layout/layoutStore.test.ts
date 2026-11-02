import { describe, expect, it } from 'vitest';
import { createLayoutStore } from './layoutStore';

describe('workbench visibility', () => {
  it('restores the exact header and footer preferences after focus mode', () => {
    const store = createLayoutStore(false, true);
    store.getState().toggleFooter();
    store.getState().toggleFocus();
    expect(store.getState()).toMatchObject({ focusMode: true, headerVisible: false, footerVisible: false });
    store.getState().toggleFocus();
    expect(store.getState()).toMatchObject({ focusMode: false, headerVisible: false, footerVisible: false });
  });

  it('keeps separate application instances independent', () => {
    const first = createLayoutStore();
    const second = createLayoutStore();
    first.getState().toggleHeader();
    first.getState().toggleFocus();
    expect(second.getState()).toMatchObject({ headerVisible: true, footerVisible: true, focusMode: false });
  });
});
