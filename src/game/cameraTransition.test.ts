import { expect, it } from 'vitest';
import { cameraTransition } from './cameraTransition';
it('uses elapsed seconds, starts/ends exactly and clamps after completion', () => {
  expect(cameraTransition(0)).toBe(0);
  expect(cameraTransition(0.325)).toBeCloseTo(0.5);
  expect(cameraTransition(0.65)).toBe(1);
  expect(cameraTransition(10)).toBe(1);
  expect(cameraTransition(1, 2)).toBeCloseTo(0.5);
  expect(cameraTransition(0.1)).toBeLessThan(cameraTransition(0.2));
});
it.each([
  [-1, 1],
  [NaN, 1],
  [Infinity, 1],
  [0, 0],
  [0, -1],
  [0, Infinity],
])('rejects invalid seconds %s / %s', (elapsed, duration) => {
  expect(() => cameraTransition(elapsed, duration)).toThrow(RangeError);
});
