import {
  directions,
  keyboardLayouts,
  normalizeDirectionKey,
  readPlayer2Keyboard,
} from '../input/player2Keyboard';
import type {
  Direction,
  KeyboardLayout,
  KeyboardSettings,
} from '../input/player2Keyboard';

export function mountPlayer2Controls(
  storage: Pick<Storage, 'getItem' | 'setItem'>,
  options: AddEventListenerOptions,
  setDirection: (direction: Direction, pressed: boolean) => void,
) {
  const panel = document.querySelector<HTMLFieldSetElement>('#player-inputs')!;
  const layout = panel.querySelector<HTMLSelectElement>('#player2-layout')!;
  const labels = Array.from(
    panel.querySelectorAll<HTMLButtonElement>('[data-direction]'),
  );
  const message = panel.querySelector<HTMLOutputElement>('output')!;
  let settings = readPlayer2Keyboard(storage);
  let customKeys = settings.keys.length
    ? settings.keys
    : keyboardLayouts.azerty;
  let editing: number | null = null;
  const held = new Map<string, Direction>();
  const names = ['Haut', 'Gauche', 'Bas', 'Droite'];

  function release() {
    for (const direction of held.values()) setDirection(direction, false);
    held.clear();
  }
  function save(value: KeyboardSettings) {
    release();
    settings = value;
    try {
      storage.setItem('marble.player2Keyboard', JSON.stringify(value));
    } catch {
      // The layout still works for this session.
    }
    sync();
  }
  function sync() {
    layout.value = settings.layout;
    labels.forEach((button, index) => {
      button.textContent = `${names[index]} · ${settings.keys[index]?.toUpperCase() ?? '—'}`;
      button.disabled = settings.layout === 'off';
      button.dataset.key = settings.keys[index] ?? '';
    });
  }
  layout.addEventListener(
    'change',
    () => {
      editing = null;
      message.value = '';
      const value = layout.value as KeyboardLayout;
      const keys =
        value === 'off'
          ? []
          : value === 'custom'
            ? customKeys
            : keyboardLayouts[value];
      save({ layout: value, keys });
    },
    options,
  );
  labels.forEach((button, index) =>
    button.addEventListener(
      'click',
      () => {
        editing = index;
        message.value = `Appuyer sur une touche pour ${names[index]!.toLowerCase()}.`;
      },
      options,
    ),
  );
  panel.addEventListener(
    'focusout',
    (event) => {
      if (
        event.relatedTarget instanceof Node &&
        panel.contains(event.relatedTarget)
      )
        return;
      editing = null;
      message.value = '';
    },
    options,
  );
  panel.disabled = false;
  sync();
  return {
    keyDown(event: KeyboardEvent, playing: boolean) {
      if (editing !== null && event.key === 'Escape') {
        editing = null;
        message.value = '';
        return true;
      }
      if (event.ctrlKey || event.altKey || event.metaKey || event.isComposing)
        return false;
      const key = normalizeDirectionKey(event.key);
      if (editing !== null) {
        if (event.key === 'Tab') return false;
        if (event.repeat) return true;
        const keys = [...settings.keys];
        if (
          !key ||
          keys.some((existing, index) => existing === key && index !== editing)
        ) {
          message.value = 'Choisir une lettre ou une flèche libre.';
          return true;
        }
        keys[editing] = key;
        editing = null;
        message.value = 'Touche enregistrée.';
        customKeys = keys;
        save({ layout: 'custom', keys });
        return true;
      }
      if (
        !playing ||
        !key ||
        (event.target instanceof Element &&
          event.target.closest(
            'input, textarea, select, button, [contenteditable]',
          ))
      )
        return false;
      const direction = directions[settings.keys.indexOf(key)];
      if (!direction) return false;
      const identity = event.code || key;
      if (!event.repeat && !held.has(identity)) {
        held.set(identity, direction);
        setDirection(direction, true);
      }
      return true;
    },
    keyUp(event: KeyboardEvent) {
      const identity = event.code || normalizeDirectionKey(event.key) || '';
      const direction = held.get(identity);
      if (!direction) return false;
      held.delete(identity);
      setDirection(direction, false);
      return true;
    },
    release,
    dispose() {
      release();
      panel.disabled = true;
    },
  };
}
