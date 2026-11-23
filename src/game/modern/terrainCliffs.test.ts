import { expect, it } from 'vitest';
import { terrainMesh } from './terrainMesh';
import { terrainCliffs } from './terrainCliffs';

it('adds a face where terrain meets a hole inside the crop', () => {
  const mesh = terrainMesh([[[0, 0, 0, 0], null]]);
  const sides = terrainCliffs(mesh, 2, 1, -2);
  expect(sides.positions).toEqual([
    0, 0, 0.5, 0, 0, -0.5, 0, -2, -0.5, 0, -2, 0.5,
  ]);
  expect(sides.indices).toHaveLength(6);
});

it('keeps level shared edges and the crop boundary free of faces', () => {
  const mesh = terrainMesh([
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  ]);
  expect(terrainCliffs(mesh, 2, 1, -2).indices).toEqual([]);
});

it('closes a shared step without extending the wall to the floor of the pit', () => {
  const mesh = terrainMesh([
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
    ],
  ]);
  const sides = terrainCliffs(mesh, 2, 1, -2);
  expect(sides.indices).toHaveLength(6);
  expect(sides.positions.filter((_, index) => index % 3 === 1)).toEqual([
    1, 1, 0, 0,
  ]);
});

it.each([1, -1])(
  'joins slopes that cross at the shared edge in either direction',
  (sign) => {
    const mesh = terrainMesh([
      [
        [0, sign, -sign, 0],
        [0, 0, 0, 0],
      ],
    ]);
    const sides = terrainCliffs(mesh, 2, 1, -2);
    expect(sides.indices).toHaveLength(6);
    expect(
      sides.positions.some(
        (x, index) =>
          index % 3 === 0 &&
          x === 0 &&
          sides.positions[index + 1] === 0 &&
          sides.positions[index + 2] === 0,
      ),
    ).toBe(true);
  },
);

it('uses one triangle if a step tapers to zero at one end', () => {
  const mesh = terrainMesh([
    [
      [0, 0, 1, 0],
      [0, 0, 0, 0],
    ],
  ]);
  expect(terrainCliffs(mesh, 2, 1, -2).indices).toHaveLength(3);
});
