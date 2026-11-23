import { expect, it } from 'vitest';
import { countChangedPixels } from './staticRegion';

it('counts changed pixels once across channels in a top-down region of a bottom-up image', () => {
  const before = new Uint8Array(64),
    after = before.slice();
  after[52] = 1;
  after[53] = 2;
  after[59] = 3;
  after[4] = 4; // Bottom row, excluded from top strip.
  expect(countChangedPixels(before, after, 4, 4, [1, 0, 3, 1])).toBe(2);
  expect(countChangedPixels(before, before, 4, 4, [0, 0, 4, 4])).toBe(0);
});
it('rejects incompatible sizes and invalid bounds', () => {
  const pixels = new Uint8Array(64);
  expect(() =>
    countChangedPixels(pixels, new Uint8Array(60), 4, 4, [0, 0, 4, 4]),
  ).toThrow();
  for (const region of [
    [-1, 0, 4, 4],
    [0, 0, 5, 4],
    [0, 0, 4, 5],
    [1, 0, 1, 4],
    [0, -1, 4, 4],
    [0, 0, 4, 0],
    [0.5, 0, 4, 4],
  ] as const) {
    expect(() => countChangedPixels(pixels, pixels, 4, 4, region)).toThrow();
  }
  expect(() =>
    countChangedPixels(pixels, pixels, 0, 4, [0, 0, 4, 4]),
  ).toThrow();
});
