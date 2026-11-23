import { expect, it } from 'vitest';
import { arcadeShortcut } from './arcadeShortcuts';
const key = {
  ctrlKey: false,
  altKey: false,
  metaKey: false,
  isComposing: false,
};
it.each([
  ['5', 2, 0],
  ['(', 2, 0],
  ['1', 3, 0],
  ['&', 3, 0],
  ['2', 3, 1],
  ['é', 3, 1],
])('maps %s to button %s on player port %s', (value, button, player) => {
  expect(arcadeShortcut({ ...key, key: String(value) })).toEqual({
    button,
    player,
  });
});
it.each(['ctrlKey', 'altKey', 'metaKey', 'isComposing'] as const)(
  'ignores %s',
  (modifier) => {
    expect(arcadeShortcut({ ...key, key: '5', [modifier]: true })).toBeNull();
  },
);
it.each(['Escape', 'Space', '3', 'É', 'a'])(
  'ignores unrelated key %s',
  (value) => {
    expect(arcadeShortcut({ ...key, key: value })).toBeNull();
  },
);
