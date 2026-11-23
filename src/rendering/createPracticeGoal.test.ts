import { expect, it } from 'vitest';
import {
  practiceFlagPaint,
  practiceFlagWave,
  practiceGoalPaint,
} from './createPracticeGoal';

it('changes the black and gray goal palette to blue and frames all four rows of the chute', () => {
  const idle = practiceGoalPaint('idle');
  const blue = practiceGoalPaint('blue');
  const red = practiceGoalPaint('red');
  const compact = practiceGoalPaint('intermediate');
  const pixel = (texture: Uint8Array, x: number, y: number) =>
    Array.from(texture.slice((128 * y + x) * 4, (128 * y + x) * 4 + 4));
  expect(pixel(idle, 18, 12)).toEqual([20, 20, 20, 255]);
  expect(pixel(blue, 18, 12)).toEqual([24, 25, 164, 255]);
  expect(pixel(blue, 90, 29)).toEqual([163, 170, 238, 255]);
  expect(pixel(red, 18, 12)).toEqual([166, 23, 23, 255]);
  // Lower two rows continue the framed paper down to the outer bottom border.
  expect(pixel(red, 90, 52)).toEqual([237, 166, 166, 255]);
  expect(pixel(idle, 68, 61)).toEqual([20, 20, 20, 255]);
  // Compact Intermediate GOAL keeps its border at y=33..35 and clears the rest.
  expect(pixel(compact, 68, 34)).toEqual([44, 44, 44, 255]);
  expect(pixel(compact, 90, 52)).toEqual([0, 0, 0, 0]);
  const grout = pixel(idle, 16, 12)[3]!;
  expect(grout).toBeGreaterThan(0);
  expect(grout).toBeLessThan(255);
  expect(pixel(blue, 16, 12)[3]).toBe(grout);
  expect(pixel(red, 16, 12)[3]).toBe(grout);
});

it('paints a checkerboard with two alternating rows of three squares', () => {
  const paint = practiceFlagPaint();
  expect(paint.length).toBe(6 * 4);
  const red = [0, 1, 2, 3, 4, 5].map((square) => paint[square * 4]);
  expect(red).toEqual([255, 25, 255, 25, 255, 25]);
});

it('keeps the flag attached to the pole while the free edge oscillates', () => {
  const first: number[] = [];
  const second: number[] = [];
  practiceFlagWave(first, 0, 0);
  practiceFlagWave(second, 0.15, 0);
  expect(first.slice(0, 3)).toEqual(second.slice(0, 3));
  expect(first.slice(27, 30)).toEqual(second.slice(27, 30));
  expect(first.slice(24, 27)).not.toEqual(second.slice(24, 27));
});

it('uses yellow rather than orange checks at the Aerial Race finish', () => {
  expect(Array.from(practiceFlagPaint('level3').slice(0, 4))).toEqual([
    255, 255, 128, 255,
  ]);
  const paint = practiceFlagPaint('level4');
  expect(Array.from(paint.slice(0, 4))).toEqual([255, 255, 128, 255]);
  expect(Array.from(paint.slice(4, 8))).toEqual([25, 21, 17, 255]);
});
