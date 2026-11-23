import { expect, it } from 'vitest';
import { terrainMesh } from './terrainMesh';

it('preserves an open gap and the four corner heights of a ramp', () => {
  const mesh = terrainMesh([[[1, 1, 0, 0], null, [0, 0, 0, 0]]]);
  expect(mesh.positions).toEqual([
    -1.5, 1, -0.5, -0.5, 1, -0.5, -0.5, 0, 0.5, -1.5, 0, 0.5, 0.5, 0, -0.5, 1.5,
    0, -0.5, 1.5, 0, 0.5, 0.5, 0, 0.5,
  ]);
  expect(mesh.indices).toEqual([0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7]);
  expect(mesh.uvs.slice(-8)).toEqual([2, 0, 3, 0, 3, 1, 2, 1]);
});

it('supports empty terrain', () => {
  expect(terrainMesh([])).toEqual({ positions: [], indices: [], uvs: [] });
});

it('leaves partial voids open and discards isolated corner samples', () => {
  const mesh = terrainMesh([
    [
      [2, 2, null, 1],
      [null, null, null, 2],
    ],
  ]);
  expect(mesh.indices).toEqual([0, 1, 2]);
  expect(mesh.positions).toHaveLength(9);
});

it('splits non-coplanar folded cells into two independent triangles for crisp crease normals', () => {
  const mesh = terrainMesh([[[0, 0, 0, 1]]]);
  expect(mesh.positions).toHaveLength(18);
  expect(mesh.indices).toEqual([0, 1, 2, 3, 4, 5]);
});
