/**
 * Safely controls fullscreen mode on document.documentElement.
 */
export function setFullscreen(active: boolean, target?: Element): void {
  if (typeof document === 'undefined') return;

  if (active) {
    const element = target ?? document.documentElement;

    if (!document.fullscreenElement && typeof element?.requestFullscreen === 'function') {
      element.requestFullscreen().catch(() => {});
    }
  } else {
    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      document.exitFullscreen().catch(() => {});
    }
  }
}

export function toggleFullscreen(target?: Element): void {
  if (typeof document === 'undefined') return;

  if (document.fullscreenElement) {
    if (typeof document.exitFullscreen === 'function') {
      document.exitFullscreen().catch(() => {});
    }
  } else {
    const element = target ?? document.documentElement;

    if (typeof element?.requestFullscreen === 'function') {
      element.requestFullscreen().catch(() => {});
    }
  }
}

export function exitFullscreen(): void {
  setFullscreen(false);
}
