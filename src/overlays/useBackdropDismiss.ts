import { useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

function outside(dialog: HTMLDialogElement, x: number, y: number) {
  const bounds = dialog.getBoundingClientRect();
  return x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom;
}

export function useBackdropDismiss(onDismiss: () => void) {
  const pressedOutside = useRef(false);
  return {
    onPointerDown: (event: PointerEvent<HTMLDialogElement>) => {
      pressedOutside.current = event.button === 0 && event.target === event.currentTarget && outside(event.currentTarget, event.clientX, event.clientY);
    },
    onPointerCancel: () => {
      pressedOutside.current = false;
    },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      const dismiss = pressedOutside.current && event.target === event.currentTarget && outside(event.currentTarget, event.clientX, event.clientY);
      pressedOutside.current = false;
      if (dismiss) onDismiss();
    },
  };
}
