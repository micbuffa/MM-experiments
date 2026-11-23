import { expect, it } from 'vitest';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import {
  intermediateFinishCell,
  intermediateRimCell,
  intermediateWaveCell,
} from './intermediateRims';

it.each([
  [14, 17],
  [24, 17],
  [9, 25],
  [19, 25],
  [29, 25],
])(
  'gives the well at %i, %i a level closed rim and a lower interior',
  (left, back) => {
    const diagonal = [0, 0, 0, -1] as const;
    const cells = Array.from({ length: 5 }, (_, z) =>
      Array.from({ length: 6 }, (_, x) =>
        intermediateRimCell(diagonal, left + x, back - 1 + z),
      ),
    );
    const rim = cells[1]![0]!;
    expect(new Set(rim).size).toBe(1);
    expect(cells[1]).toEqual(Array<TerrainCell>(6).fill(rim));
    expect(cells[4]).toEqual(Array<TerrainCell>(6).fill(rim));
    expect(cells[2]![0]).toEqual(rim);
    expect(cells[2]![1]![0]).toBeLessThan(rim[0]!);
    const walls = terrainCliffs(terrainMesh(cells), 6, 5, -4);
    for (let i = 0; i < walls.positions.length; i += 12) {
      const [bx, , bz, ax, , az] = walls.positions.slice(i, i + 6);
      expect(ax === bx || az === bz).toBe(true);
    }
  },
);

it('continues only the measured straight cliff edges and leaves other cutouts in place', () => {
  const cut = [2, 2, 1, null] as const;
  expect(intermediateRimCell(cut, 7, 22)).toEqual([2, 2, 1, 1]);
  expect(intermediateRimCell(cut, 37, 22)).toEqual([2, 2, 1, 1]);
  expect(intermediateRimCell(cut, 18, 36)).toEqual([2, 2, 1, 1]);
  expect(intermediateRimCell([2, 2, 2, -4], 29, 33)).toEqual([2, 2, 2, 2]);
  expect(intermediateRimCell(cut, 100, 106)).toEqual([2, 2, 1, 1]);
  expect(intermediateRimCell([null, 2, 1, 1], 65, 58)).toEqual([2, 2, 1, 1]);
  expect(intermediateRimCell(cut, 75, 71)).toBe(cut);
});

it.each([1, -1])(
  'keeps a continuous diagonal at both heights of the survey edge (%i)',
  (side) => {
    const size = 30;
    const cells = Array.from({ length: size }, (_, z) =>
      Array.from({ length: size }, (_, x) => {
        const distance = (x - z) * side;
        return distance >= 19 &&
          distance <= 21 &&
          x > 0 &&
          z > 0 &&
          x < size - 1 &&
          z < size - 1
          ? intermediateRimCell([2, 2, 2, 2], x, z)
          : null;
      }),
    );
    const walls = terrainCliffs(terrainMesh(cells), size, size, -6).positions;
    const edges: number[][] = [];
    for (let i = 0; i < walls.length; i += 12) {
      const face = walls.slice(i, i + 12);
      const first = side * (face[0]! - face[2]!);
      const second = side * (face[3]! - face[5]!);
      expect(Math.max(first, second)).toBeLessThanOrEqual(21);
      if (first === 21 && second === 21) edges.push(face);
    }
    expect(edges).toHaveLength(7);
    for (const face of edges) {
      for (let i = 0; i < face.length; i += 3)
        expect(side * (face[i]! - face[i + 2]!)).toBe(21);
      expect([face[7], face[10]]).toEqual([-6, -6]);
    }
  },
);

it('keeps each angle tile flush with the level of its own platform', () => {
  expect(intermediateRimCell([2, 2, 2, -4], 64, 74)).toEqual([2, 2, 2, 2]);
  expect(intermediateRimCell([-4, -4, -4, 2], 64, 78)).toEqual([
    -4, -4, -4, -4,
  ]);
});

it('keeps the face by the first pipe free of triangular rises', () => {
  expect(intermediateRimCell([-2, -2, -2, 0], 62, 71)).toEqual([
    -2, -2, -2, -2,
  ]);
});

it('closes the finish bowl around shared survey heights and preserves missing corners', () => {
  const cells = Array.from({ length: 98 }, () =>
    Array<TerrainCell>(95).fill(null),
  );
  cells[95]![91] = [1, 1, 1, 1];
  cells[96]![90] = [2, 2, 2, 2];
  cells[96]![91] = [-3, -3, -3, -3];
  expect(intermediateFinishCell([2, 1, 1, 1], cells, 90, 95)).toEqual([
    2, 1, -3, 2,
  ]);
  expect(intermediateFinishCell([2, 1, 1, null], cells, 90, 95)).toEqual([
    2,
    1,
    -3,
    null,
  ]);
});

it('joins the paved wave across its lanes without filling the holes or distorting the flat exit', () => {
  const surveyed = [0, 1, 1, -1] as const;
  const lanes = [75, 76, 77].map((z) => [
    intermediateWaveCell(surveyed, 75, z),
    intermediateWaveCell([1, 0, 0, -1], 76, z),
  ]);
  const surface = terrainMesh(lanes);
  const walls = terrainCliffs(surface, 2, 3, -5);
  expect(walls.indices).toHaveLength(0);
  expect(new Set(surface.positions.filter((_, i) => i % 3 === 1))).toEqual(
    new Set([0, 1]),
  );
  expect(intermediateWaveCell(null, 77, 78)).toBeNull();
  expect(intermediateWaveCell([0, 0, 0, 0], 79, 81)).toEqual([0, 0, 0, 0]);
});
