import { expect, it } from 'vitest';
import { iceBasinHeight } from './iceBasin';
it('keeps the six measured slope bands and their geometric symmetry', () => {
  const levels = [16097, 16099, 16103, 16109, 16113, 16115, 16116];
  for (let r = 0; r <= 6; r++)
    for (const [dx, dz] of [
      [r, 0],
      [r, r],
      [0, r],
      [-r, 0],
      [-r, -r],
      [0, -r],
    ]) {
      expect(iceBasinHeight(99 + dx!, 101 + dz!)).toBe(levels[r]);
    }
  expect(iceBasinHeight(99.5, 101)).toBe(16098);
  expect(iceBasinHeight(120, 120)).toBe(16116);
  expect(iceBasinHeight(97, 100)).toBe(iceBasinHeight(101, 102));
});
