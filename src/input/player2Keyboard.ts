export const directions = ['up', 'left', 'down', 'right'] as const;
export type Direction = (typeof directions)[number];
export const directionButtons = { up: 4, left: 6, down: 5, right: 7 } as const;
export const keyboardLayouts = {
  azerty: ['z', 'q', 's', 'd'],
  qwerty: ['w', 'a', 's', 'd'],
  arrows: ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'],
} as const;
export type KeyboardLayout = keyof typeof keyboardLayouts | 'custom' | 'off';
export const defaultKeyboard = {
  layout: 'azerty',
  keys: keyboardLayouts.azerty,
} as const;
export interface KeyboardSettings {
  layout: KeyboardLayout;
  keys: readonly string[];
}

export function normalizeDirectionKey(key: string): string | null {
  if (/^Arrow(Up|Left|Down|Right)$/.test(key)) return key;
  const normalized = key.toLowerCase();
  // C, E, H and the arcade number keys already have actions.
  return /^\p{L}$/u.test(normalized) &&
    !['c', 'e', 'é', 'h'].includes(normalized)
    ? normalized
    : null;
}

export function readPlayer2Keyboard(
  storage: Pick<Storage, 'getItem'>,
): KeyboardSettings {
  try {
    const saved: unknown = JSON.parse(
      storage.getItem('marble.player2Keyboard') ?? 'null',
    );
    if (saved === null || typeof saved !== 'object' || !('layout' in saved))
      return defaultKeyboard;
    const { layout } = saved;
    if (layout === 'azerty' || layout === 'qwerty' || layout === 'arrows')
      return { layout, keys: keyboardLayouts[layout] };
    if (layout === 'off') return { layout, keys: [] };
    if (layout === 'custom' && 'keys' in saved && Array.isArray(saved.keys)) {
      const storedKeys: unknown[] = saved.keys;
      // H was a valid custom direction before it became the help shortcut.
      const replacement = keyboardLayouts.azerty.find(
        (key) => !storedKeys.includes(key),
      );
      const keys = storedKeys.map((key) => (key === 'h' ? replacement : key));
      if (
        keys.length === 4 &&
        new Set(keys).size === 4 &&
        keys.every(
          (key): key is string =>
            typeof key === 'string' && normalizeDirectionKey(key) === key,
        )
      )
        return { layout, keys };
    }
  } catch {
    // An unavailable storage or invalid value falls back to AZERTY.
  }
  return defaultKeyboard;
}

export function directionMotion(
  held: ReadonlySet<Direction>,
): [number, number] {
  return [
    30 * (Number(held.has('right')) - Number(held.has('left'))),
    30 * (Number(held.has('down')) - Number(held.has('up'))),
  ];
}
