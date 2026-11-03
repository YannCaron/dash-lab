const nativeExitSupport = new WeakMap<Document, boolean>();
const closingDialogs = new WeakMap<HTMLDialogElement, { promise: Promise<void>; finish: () => void }>();

function supportsNativeExit(dialog: HTMLDialogElement): boolean {
  const document = dialog.ownerDocument;
  const cached = nativeExitSupport.get(document);

  if (cached !== undefined) return cached;

  let supported = false;

  if (document.defaultView?.CSS.supports('overlay', 'auto') && document.defaultView.CSS.supports('transition-behavior', 'allow-discrete')) {
    const probe = document.createElement('div');

    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;transition:display 1s allow-discrete !important;display:block';
    document.body.appendChild(probe);
    document.defaultView.getComputedStyle(probe).getPropertyValue('display');
    probe.style.display = 'none';
    supported = document.defaultView.getComputedStyle(probe).display !== 'none';
    probe.remove();
  }

  nativeExitSupport.set(document, supported);

  return supported;
}

export function openDialog(dialog: HTMLDialogElement | null): void {
  if (!dialog) return;

  const pending = closingDialogs.get(dialog);

  closingDialogs.delete(dialog);
  pending?.finish();
  dialog.removeAttribute('data-closing');

  if (!dialog.open) dialog.showModal();
}

export function closeDialog(dialog: HTMLDialogElement | null): Promise<void> {
  if (!dialog?.open) return Promise.resolve();

  const pending = closingDialogs.get(dialog);

  if (pending) return pending.promise;

  if (supportsNativeExit(dialog)) {
    dialog.close();

    return Promise.resolve();
  }

  // Keep unsupported browsers in the top layer until their visual transition finishes.
  dialog.ownerDocument.defaultView?.getComputedStyle(dialog).getPropertyValue('opacity');
  dialog.setAttribute('data-closing', '');

  const animations = dialog.getAnimations({ subtree: true }).filter((animation) => (animation.effect as KeyframeEffect | null)?.target === dialog);

  if (!animations.length) {
    dialog.removeAttribute('data-closing');
    dialog.close();

    return Promise.resolve();
  }

  let finish!: () => void;
  const finished = new Promise<void>((resolve) => {
    finish = resolve;
  });
  const duration = Math.max(...animations.map((animation) => Number(animation.effect?.getComputedTiming().endTime ?? 0)));
  const timer = setTimeout(() => finish(), Number.isFinite(duration) ? Math.min(duration + 100, 2000) : 2000);
  const closing = {
    finish: () => {
      clearTimeout(timer);
      finish();
    },
    promise: finished.then(() => {
      if (closingDialogs.get(dialog) !== closing) return;

      closingDialogs.delete(dialog);
      dialog.removeAttribute('data-closing');

      if (dialog.open) dialog.close();
    }),
  };

  closingDialogs.set(dialog, closing);
  void Promise.allSettled(animations.map((animation) => animation.finished)).then(closing.finish);

  return closing.promise;
}
