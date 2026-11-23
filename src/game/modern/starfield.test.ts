import { expect, it } from 'vitest';
import { starfieldPixels } from './starfield';
it('builds a reproducible dark sky with bright stars and opaque pixels', () => {
  const a = starfieldPixels(256, 128, 1984);
  expect(a).toEqual(starfieldPixels(256, 128, 1984));
  expect(a).not.toEqual(starfieldPixels(256, 128, 1985));
  let dark = 0,
    bright = 0;
  for (let i = 0; i < a.length; i += 4) {
    expect(a[i + 3]).toBe(255);
    if (a[i]! < 5 && a[i + 1]! < 5) dark++;
    if (a[i]! > 150) bright++;
  }
  expect(dark).toBeGreaterThan(20000);
  expect(bright).toBeGreaterThan(100);
});
it.each([
  [0, 10],
  [16, 0],
  [16.5, 8],
  [4096, 8],
  [16, 2048],
])('rejects invalid dimensions %s × %s', (width, height) => {
  expect(() => starfieldPixels(width, height)).toThrow();
});
