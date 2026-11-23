import { expect, it } from 'vitest';
import { practiceFinishScroll } from '../game/modern/practiceProjection';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import {
  extendPracticeDescentCliffs,
  practiceChannelTerrain,
} from './practiceChannelTerrain';

it('deepens the terminal cliffs under the chute without moving the lip or internal steps', () => {
  const early = [2, 0, 2, 1, 0, 2, 1, -6, 2, 2, -6, 2];
  const late = [30, -4, 20, 29, -5, 20, 29, -6, 20, 30, -6, 20];
  const step = [30, -4, 20, 29, -4, 20, 29, -5, 20, 30, -5, 20];
  const walls = [...early, ...late, ...step];
  extendPracticeDescentCliffs(walls, -6, 45.5, 45.5);
  expect(walls.slice(0, 12)).toEqual(early);
  expect(walls.slice(12, 18)).toEqual(late.slice(0, 6));
  expect(walls.slice(18, 24)).toEqual([29, -13, 20, 30, -13, 20]);
  expect(walls.slice(24)).toEqual(step);
});

it.each([
  [49, 48],
  [49, 54],
  [59, 60],
  [62, 65],
  [77, 66],
])('welds channel tiles across height samples near cell %s, %s', (x, z) => {
  const cells: TerrainCell[][] = [
    [
      [0, -0.1, -0.2, 0],
      [-0.5, -0.6, -0.75, -0.7],
    ],
    [
      [0, -0.3, -0.5, 0],
      [-0.6, -0.8, -0.75, -0.7],
    ],
  ];
  const display = practiceChannelTerrain({
    cells,
    origin: { x, z },
    lastScroll: 0,
  });
  expect(display[0]![0]![0]).toBe(0);
  expect(display[0]![0]![1]).toBeCloseTo(-0.3);
  expect(display[0]![0]![2]).toEqual(display[1]![1]![0]);
  expect(terrainCliffs(terrainMesh(display), 2, 2, -3).indices).toEqual([]);
  expect(cells[0]![1]![0]).toBe(-0.5);
});

it('completes the squares above the orange cliff and preserves the other openings', () => {
  const cut = [0, 0, 0, null] as const;
  const cells = [
    [cut, cut, cut],
    [null, null, null],
  ];
  const display = practiceChannelTerrain({
    cells,
    origin: { x: 36, z: 51 },
    lastScroll: 0,
  });
  expect(display[0]).toEqual([cut, [0, 0, 0, 0], [0, 0, 0, 0]]);
  const walls = terrainCliffs(terrainMesh(display), 3, 2, -3).positions;
  expect(
    walls.some(
      (value, index) =>
        index % 12 === 2 && value === 0 && walls[index + 3] === 0,
    ),
  ).toBe(true);
  expect(display[1]).toEqual([null, null, null]);
});

it('continues the final bank to a straight edge while leaving a real gap beyond the flagged span', () => {
  const cut = [0, -0.5, -0.3, null] as const;
  const display = practiceChannelTerrain({
    cells: [
      [cut, cut, cut],
      [null, null, null],
    ],
    origin: { x: 78, z: 67 },
    lastScroll: 0,
  });
  expect(display[0]![0]![3]).not.toBeNull();
  expect(display[0]![1]![3]).not.toBeNull();
  expect(display[0]![2]![3]).toBeNull();
  expect(display[1]).toEqual([null, null, null]);
});

it('replaces the sampled ridge under each pyramid with a flat landing', () => {
  const cells: TerrainCell[][] = [
    [
      [0, 0, 2, 2],
      [0, 0, 0, 0],
    ],
  ];
  expect(
    practiceChannelTerrain({
      cells,
      origin: { x: 44, z: 31 },
      lastScroll: 0,
    })[0],
  ).toEqual([
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]);
});

it('clips outer corners along both diagonal boundaries of the complete Practice survey', () => {
  const flat: TerrainCell = [0, 0, 0, 0];
  const right = practiceChannelTerrain({
    cells: [[flat, flat]],
    origin: { x: 28, z: 8 },
    lastScroll: practiceFinishScroll,
  });
  expect(right[0]![0]).toEqual([0, 0, 0, 0]);
  expect(right[0]![1]).toEqual([0, null, 0, 0]);

  const left = practiceChannelTerrain({
    cells: [[flat, flat]],
    origin: { x: 8, z: 29 },
    lastScroll: practiceFinishScroll,
  });
  expect(left[0]![0]).toEqual([0, 0, 0, null]);
  expect(left[0]![1]).toEqual([0, 0, 0, 0]);

  const tip = practiceChannelTerrain({
    cells: [[[-2, -2, -2, null]]],
    origin: { x: 62, z: 82 },
    lastScroll: practiceFinishScroll,
  });
  expect(tip[0]![0]).toEqual([-2, -2, -2, -2]);
});
