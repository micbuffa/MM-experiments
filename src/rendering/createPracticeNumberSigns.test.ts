import { expect, it } from 'vitest';
import {
  practiceNumberSignMesh,
  practiceNumberSignPaint,
  practiceNumberSignPlacements,
} from './createPracticeNumberSigns';
import type { TerrainCell } from '../game/modern/terrainMesh';

it('places all three number signs with arrows toward their respective ramps', () => {
  const cells = Array.from({ length: 80 }, () =>
    Array<TerrainCell>(80).fill([0, 0, 0, 0]),
  );
  const terrain = { cells, origin: { x: 0, z: 0 }, lastScroll: 0 };
  const signs = practiceNumberSignPlacements.map((placement) =>
    practiceNumberSignMesh(terrain, placement),
  );
  expect(signs.map(({ positions }) => positions.slice(0, 3))).toEqual([
    [26, 0, 14],
    [9, 0, 21],
    [19, 0, 31],
  ]);
  expect(signs[0]?.uvs.slice(0, 4)).toEqual([0, 0, 1 / 6, 0]);
  expect(signs[1]?.uvs.slice(0, 4)).toEqual([0, 0, 0, 1 / 4]);
});

it('uses both paint colors, draws the arrow and leaves the surrounding paving clear', () => {
  const paint = practiceNumberSignPaint();
  const pixel = (x: number, y: number) =>
    Array.from(paint.slice((96 * y + x) * 4, (96 * y + x) * 4 + 4));
  expect(pixel(4, 3)).toEqual([177, 42, 40, 255]);
  expect(pixel(2, 3)).toEqual([255, 237, 230, 255]);
  expect(pixel(83, 32).slice(0, 3)).toEqual(pixel(4, 3).slice(0, 3));
  expect(pixel(83, 32)[3]).toBeLessThan(pixel(83, 34)[3]!);
  expect(pixel(83, 15)).toEqual([0, 0, 0, 0]);
});

it('reverses the asymmetric numeral strokes on the left-facing sign only', () => {
  const regular = practiceNumberSignPaint(false);
  const mirrored = practiceNumberSignPaint(true);
  const sample = (paint: Uint8Array, x: number, y: number) =>
    paint.slice((96 * y + x) * 4, (96 * y + x) * 4 + 3);
  // The upper vertical stroke of 6 swaps sides within the same red tile.
  expect(sample(regular, 51, 41)).toEqual(new Uint8Array([255, 237, 230]));
  expect(sample(mirrored, 59, 41)).toEqual(sample(regular, 51, 41));
  expect(sample(mirrored, 51, 41)).toEqual(sample(regular, 59, 41));
  expect(mirrored.slice((96 * 32 + 64) * 4, 96 * 33 * 4)).toEqual(
    regular.slice((96 * 32 + 64) * 4, 96 * 33 * 4),
  );
});
