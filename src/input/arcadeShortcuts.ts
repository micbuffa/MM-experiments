import type { ArcadeButton, ArcadePlayer } from './buttonPulses';

interface ShortcutKey {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  isComposing: boolean;
}

/** Layout aliases requested for French and numeric keyboards. */
export function arcadeShortcut(event: ShortcutKey): {
  button: ArcadeButton;
  player: ArcadePlayer;
} | null {
  if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing)
    return null;
  switch (event.key) {
    case '5':
    case '(':
      return { button: 2, player: 0 };
    case '1':
    case '&':
      return { button: 3, player: 0 };
    case '2':
    case 'é':
      return { button: 3, player: 1 };
    default:
      return null;
  }
}
