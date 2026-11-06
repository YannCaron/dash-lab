import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { exitFullscreen, setFullscreen, toggleFullscreen } from './fullscreen.js';

interface FakeElement {
  requestFullscreen: ReturnType<typeof vi.fn>;
}

interface FakeDocument {
  fullscreenElement: FakeElement | null;
  documentElement: FakeElement;
  exitFullscreen: ReturnType<typeof vi.fn>;
}

describe('fullscreen helpers in SSR', () => {
  it('safely handles missing document without throwing', () => {
    expect(() => setFullscreen(true)).not.toThrow();
    expect(() => setFullscreen(false)).not.toThrow();
    expect(() => toggleFullscreen()).not.toThrow();
    expect(() => exitFullscreen()).not.toThrow();
  });
});

describe('fullscreen helpers with DOM', () => {
  let fakeDoc: FakeDocument;

  beforeEach(() => {
    fakeDoc = {
      fullscreenElement: null,
      documentElement: {
        requestFullscreen: vi.fn().mockResolvedValue(undefined),
      },
      exitFullscreen: vi.fn().mockResolvedValue(undefined),
    };

    (globalThis as unknown as { document: FakeDocument | undefined }).document = fakeDoc;
  });

  afterEach(() => {
    delete (globalThis as unknown as { document?: FakeDocument }).document;
  });

  it('requests fullscreen when active is true and not currently in fullscreen', () => {
    setFullscreen(true);
    expect(fakeDoc.documentElement.requestFullscreen).toHaveBeenCalledOnce();
    expect(fakeDoc.exitFullscreen).not.toHaveBeenCalled();
  });

  it('does not request fullscreen when already in fullscreen', () => {
    fakeDoc.fullscreenElement = fakeDoc.documentElement;

    setFullscreen(true);
    expect(fakeDoc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it('exits fullscreen when active is false and currently in fullscreen', () => {
    fakeDoc.fullscreenElement = fakeDoc.documentElement;

    setFullscreen(false);
    expect(fakeDoc.exitFullscreen).toHaveBeenCalledOnce();
    expect(fakeDoc.documentElement.requestFullscreen).not.toHaveBeenCalled();
  });

  it('does not exit fullscreen when active is false and not in fullscreen', () => {
    setFullscreen(false);
    expect(fakeDoc.exitFullscreen).not.toHaveBeenCalled();
  });

  it('safely catches errors when requestFullscreen rejects', async () => {
    fakeDoc.documentElement.requestFullscreen.mockRejectedValueOnce(new Error('Fullscreen not allowed'));

    expect(() => setFullscreen(true)).not.toThrow();
  });

  it('safely catches errors when exitFullscreen rejects', async () => {
    fakeDoc.fullscreenElement = fakeDoc.documentElement;
    fakeDoc.exitFullscreen.mockRejectedValueOnce(new Error('Exit not allowed'));

    expect(() => exitFullscreen()).not.toThrow();
  });

  it('toggleFullscreen toggles between request and exit based on current state', () => {
    toggleFullscreen();
    expect(fakeDoc.documentElement.requestFullscreen).toHaveBeenCalledOnce();

    fakeDoc.fullscreenElement = fakeDoc.documentElement;
    toggleFullscreen();
    expect(fakeDoc.exitFullscreen).toHaveBeenCalledOnce();
  });
});
