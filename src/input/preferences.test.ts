import { expect, it, vi } from 'vitest';
import { readPreference, savePreference } from './preferences';

it.each([null, 'oops', 'Infinity', '-1', '5'])(
  'revient au défaut pour %s',
  (value) => {
    expect(readPreference({ getItem: () => value }, 'gain', 1, 0.25, 4)).toBe(
      1,
    );
  },
);
it('lit et écrit seulement un réglage validé, pas de données de jeu', () => {
  const getItem = vi.fn(() => '0.75');
  expect(readPreference({ getItem }, 'gain', 1, 0.25, 4)).toBe(0.75);
  const setItem = vi.fn();
  savePreference({ setItem }, 'gain', 0.75);
  expect(setItem).toHaveBeenCalledWith('marble.gain', '0.75');
});
it('reste utilisable si le navigateur interdit le stockage', () => {
  const fail = () => {
    throw new Error('blocked');
  };
  expect(readPreference({ getItem: fail }, 'gain', 1, 0.25, 4)).toBe(1);
  expect(() => savePreference({ setItem: fail }, 'volume', 0.5)).not.toThrow();
});
