import { expect, it } from 'vitest';
import { videoFit, videoFrustum } from './videoLayout';

it.each([
  [4 / 3, 1, 1],
  [16 / 9, 1, 4 / 3],
  [1, 4 / 3, 1],
])('centre une image %s dans un tube 4:3', (source, x, y) => {
  expect(videoFit(source, 4 / 3)).toEqual({ x, y });
});

it.each([
  [4 / 3, 2],
  [4 / 3, 0.7],
  [2, 2],
])('cadre %s dans %s sans rogner ni déformer', (source, viewport) => {
  const frame = videoFrustum(source, viewport);
  expect(frame.right / frame.top).toBeCloseTo(viewport);
  expect(frame.right).toBeGreaterThan(source);
  expect(frame.top).toBeGreaterThan(1);
  expect(frame.left).toBe(-frame.right);
  expect(frame.bottom).toBe(-frame.top);
});
it.each([0, -1, NaN, Infinity])('refuse un aspect invalide %s', (value) => {
  expect(() => videoFrustum(value, 1)).toThrow(RangeError);
  expect(() => videoFrustum(1, value)).toThrow(RangeError);
});
