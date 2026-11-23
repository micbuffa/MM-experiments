import { expect, it } from 'vitest';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  practiceArrowMesh,
  practiceArrowPaint,
  practiceCenterArrowMesh,
} from './createPracticeMarkings';

it('projects each arrow along the surveyed slope and skips a missing patch', () => {
  const cells = Array.from({ length: 15 }, () =>
    Array<TerrainCell>(15).fill(null),
  );
  cells[0]![14] = [0, 0, -1, -1];
  const terrain = { cells, origin: { x: 23, z: 23 }, lastScroll: -16069 };
  const left = practiceArrowMesh(terrain, false);
  expect(left.indices).toHaveLength(6);
  expect(left.positions.filter((_, index) => index % 3 === 1)).toEqual([
    0, 0, -1, -1,
  ]);
  expect(left.uvs.slice(0, 4)).toEqual([0, 0, 0.5, 0]);
  expect(practiceArrowMesh(terrain, true).indices).toEqual([]);
});

it('centers the bridge arrow on the screen diagonal and paints a single broad head', () => {
  const cells: TerrainCell[][] = [[[0, 0, 0, 0]]];
  const terrain = { cells, origin: { x: 40, z: 40 }, lastScroll: 0 };
  const arrow = practiceCenterArrowMesh(terrain);
  expect(arrow.uvs).toEqual([
    0.5,
    4 / 11,
    0.3,
    5 / 11,
    0.5,
    6 / 11,
    0.7,
    5 / 11,
  ]);
  const size = 101;
  const pixels = practiceArrowPaint(size, size, true);
  const alpha = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
  expect(alpha(50, 15)).toBeGreaterThan(0);
  expect(alpha(50, 21)).toBe(0);
  expect(alpha(75, 75)).toBeGreaterThan(0);
  expect(alpha(75, 60)).toBe(0);
});

it('paints a main arrow and two smaller points with visible gaps', () => {
  const size = 101;
  const pixels = practiceArrowPaint(size, size);
  const alpha = (x: number, y: number) => pixels[(y * size + x) * 4 + 3];
  expect([20, 60, 78, 90].map((y) => alpha(50, y))).toEqual([
    215, 215, 215, 215,
  ]);
  expect([72, 86, 98].map((y) => alpha(50, y))).toEqual([0, 0, 0]);
  expect(alpha(75, 60)).toBeGreaterThan(0);
  expect(alpha(75, 78)).toBe(0);
  expect(alpha(78, 74)).toBeGreaterThan(0);
  expect(alpha(72, 87)).toBeGreaterThan(0);
  expect(alpha(78, 87)).toBe(0);
});
