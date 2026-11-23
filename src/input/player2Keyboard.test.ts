import { expect, it } from 'vitest';
import {
  directionMotion,
  keyboardLayouts,
  normalizeDirectionKey,
  readPlayer2Keyboard,
} from './player2Keyboard';

it('restores the default, named layouts and custom direction keys', () => {
  const read = (value: unknown) =>
    readPlayer2Keyboard({ getItem: () => JSON.stringify(value) });
  expect(read(null)).toEqual({
    layout: 'azerty',
    keys: keyboardLayouts.azerty,
  });
  expect(read({ layout: 'qwerty', keys: ['a'] }).keys).toEqual(
    keyboardLayouts.qwerty,
  );
  expect(read({ layout: 'arrows' }).keys).toEqual(keyboardLayouts.arrows);
  expect(read({ layout: 'off' }).keys).toEqual([]);
  expect(read({ layout: 'custom', keys: ['i', 'j', 'k', 'l'] }).layout).toBe(
    'custom',
  );
  expect(read({ layout: 'custom', keys: ['h', 'z', 's', 'l'] })).toEqual({
    layout: 'custom',
    keys: ['q', 'z', 's', 'l'],
  });
  expect(read({ layout: 'custom', keys: ['i', 'i', 'k', 'l'] }).layout).toBe(
    'azerty',
  );
  expect(readPlayer2Keyboard({ getItem: () => '{' }).layout).toBe('azerty');
});

it('accepts printable letters and arrows while preserving cabinet shortcuts', () => {
  expect(normalizeDirectionKey('W')).toBe('w');
  expect(normalizeDirectionKey('ArrowUp')).toBe('ArrowUp');
  for (const key of ['C', 'e', 'é', 'H', '5', 'Escape', ' '])
    expect(normalizeDirectionKey(key)).toBeNull();
});

it('combines perpendicular directions and cancels opposing buttons', () => {
  expect(directionMotion(new Set(['right', 'up']))).toEqual([30, -30]);
  expect(directionMotion(new Set(['left', 'down']))).toEqual([-30, 30]);
  expect(directionMotion(new Set(['left', 'right', 'up', 'down']))).toEqual([
    0, 0,
  ]);
});
