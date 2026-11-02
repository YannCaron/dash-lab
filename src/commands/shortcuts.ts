/** Platform used to resolve the portable Mod modifier. */
export type ShortcutPlatform = 'mac' | 'other';
/** Native keyboard properties required by the framework-independent matcher. */
export type ShortcutEvent = Pick<
  KeyboardEvent,
  'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey' | 'repeat' | 'isComposing' | 'defaultPrevented' | 'getModifierState'
>;

const aliases: Record<string, string> = { esc: 'escape', space: ' ', spacebar: ' ', plus: '+', return: 'enter' };
const modifierNames = new Map([
  ['ctrl', 'ctrl'],
  ['control', 'ctrl'],
  ['meta', 'meta'],
  ['cmd', 'meta'],
  ['command', 'meta'],
  ['alt', 'alt'],
  ['option', 'alt'],
  ['shift', 'shift'],
]);

function keyName(key: string) {
  const lower = key.toLowerCase();
  return aliases[lower] ?? lower;
}

export function eventSignature(event: Pick<ShortcutEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'>) {
  return `${Number(event.ctrlKey)}${Number(event.metaKey)}${Number(event.altKey)}${Number(event.shiftKey)}:${keyName(event.key)}`;
}

export function parseShortcut(shortcut: string, platform: ShortcutPlatform) {
  const parts = shortcut.split('+').map((part) => part.trim().toLowerCase());
  const rawKey = parts.pop();
  if (
    !rawKey ||
    !(
      /^[a-z0-9]$/.test(rawKey) ||
      /^(f[1-9]|f1[0-9]|f2[0-4]|enter|return|escape|esc|space|plus|tab|backspace|delete|insert|home|end|pageup|pagedown|arrowup|arrowdown|arrowleft|arrowright)$/.test(
        rawKey,
      )
    )
  ) {
    throw new Error(`Invalid shortcut key: ${shortcut}`);
  }
  const modifiers = new Set<string>();
  const portableModifier = platform === 'mac' ? 'meta' : 'ctrl';
  for (const part of parts) {
    const modifier = part === 'mod' ? portableModifier : modifierNames.get(part);
    if (!modifier || modifiers.has(modifier)) throw new Error(`Invalid or repeated shortcut modifier: ${shortcut}`);
    modifiers.add(modifier);
  }
  return eventSignature({
    key: keyName(rawKey),
    ctrlKey: modifiers.has('ctrl'),
    metaKey: modifiers.has('meta'),
    altKey: modifiers.has('alt'),
    shiftKey: modifiers.has('shift'),
  });
}
