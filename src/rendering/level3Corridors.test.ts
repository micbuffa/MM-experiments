import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { expect, it } from 'vitest';
import { level3DisplayTerrain } from './createLevel3Materials';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import { terrainCliffs } from '../game/modern/terrainCliffs';

const height = (h: number) => ((h - 16384) * Math.sqrt(2 / 3)) / 8;
const empty = () =>
  Array.from({ length: 118 }, () => Array<TerrainCell>(118).fill(null));

it('restores continuous flat corridor paving instead of wall-height folded triangles', () => {
  const cells = empty();
  const low = height(16366);
  for (const x of [34, 35]) {
    cells[27]![x] = [0, 0, 0, 0];
    cells[28]![x] = [low, low, low, 0];
  }
  const display = level3DisplayTerrain(cells);
  for (const x of [34, 35])
    expect(display[28]![x]).toEqual([low, low, low, low]);
  const surface = terrainMesh(display);
  const walls = terrainCliffs(surface, 118, 118, -30);
  const normals: number[] = [];
  VertexData.ComputeNormals(surface.positions, surface.indices, normals);
  expect(normals.filter((_, i) => i % 3 === 1).every((y) => y > 0.999)).toBe(
    true,
  );
  // No internal cliff at the join of the two low floor tiles.
  for (let i = 0; i < walls.indices.length; i += 3) {
    const tri = walls.indices.slice(i, i + 3);
    expect(
      tri.every(
        (v) =>
          Math.abs(walls.positions[v * 3]! + 59 - 35) < 0.001 &&
          walls.positions[v * 3 + 2]! + 59 >= 28 &&
          walls.positions[v * 3 + 2]! + 59 <= 29,
      ),
    ).toBe(false);
  }
  const wallNormals: number[] = [];
  VertexData.ComputeNormals(walls.positions, walls.indices, wallNormals);
  expect(
    wallNormals.filter((_, i) => i % 3 === 1).every((y) => Math.abs(y) < 0.001),
  ).toBe(true);
  expect(cells[28]![34]![3]).toBe(0);
});

it('preserves the real corridor gradient and the steep exit ramp', () => {
  const cells = empty();
  cells[20]![25] = [height(16374), height(16373), height(16373), 0];
  cells[43]![30] = [height(16366), height(16359), height(16359), height(16359)];
  cells[70]![70] = [height(16366), height(16366), height(16366), 0];
  const display = level3DisplayTerrain(cells);
  expect(display[20]![25]).toEqual([
    height(16374),
    height(16373),
    height(16373),
    height(16374),
  ]);
  expect(display[43]![30]).toEqual([
    height(16366),
    height(16359),
    height(16359),
    height(16366),
  ]);
  expect(display[70]![70]).toEqual(cells[70]![70]);
});
