import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import { expect, it } from 'vitest';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { level4DisplayTerrain } from './createLevel4Materials';
import { level4LandingNormals } from './level4LandingNormals';

it('gives both triangles of a landing tile the same unit normal without changing other tiles', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  cells[91]![82] = [0, 0.1, 0.5, 0.2];
  cells[10]![10] = [0, 0.1, 0.5, 0.2];
  const surface = terrainMesh(cells);
  const normals: number[] = [];
  VertexData.ComputeNormals(surface.positions, surface.indices, normals);
  const original = [...normals];
  const result = level4LandingNormals(surface, normals, 130, 130);
  const landing: number[][] = [];
  for (let i = 0; i < surface.positions.length; i += 3) {
    const n = result.slice(i, i + 3);
    if (surface.positions[i]! + 65 >= 82) landing.push(n);
    else expect(n).toEqual(original.slice(i, i + 3));
  }
  expect(landing).toHaveLength(6);
  for (const normal of landing) {
    expect(normal).toEqual(landing[0]);
    expect(Math.hypot(...normal)).toBeCloseTo(1);
  }
  expect(normals).toEqual(original);
  expect(
    level4LandingNormals(
      surface,
      normals.map(() => 0),
      130,
      130,
    ).every((n) => n === 0),
  ).toBe(true);
});

it('shares every landing edge and emits no vertical wall at the flat-to-ramp join', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  for (let z = 91; z < 95; z++)
    for (let x = 80; x < 87; x++) cells[z]![x] = [0, 0.1, 0.3, 0.2];
  const display = level4DisplayTerrain(cells);
  for (let z = 91; z < 95; z++)
    for (let x = 80; x < 86; x++) {
      const a = display[z]![x]!,
        b = display[z]![x + 1]!;
      expect(a[1]).toBe(b[0]);
      expect(a[2]).toBe(b[3]);
    }
  for (let z = 91; z < 94; z++)
    for (let x = 80; x < 87; x++) {
      const a = display[z]![x]!,
        b = display[z + 1]![x]!;
      expect(a[3]).toBe(b[0]);
      expect(a[2]).toBe(b[1]);
    }
  const walls = terrainCliffs(terrainMesh(display), 130, 130, -40);
  for (let i = 0; i < walls.indices.length; i += 3) {
    const atJoin = walls.indices
      .slice(i, i + 3)
      .every((v) => Math.abs(walls.positions[v * 3]! + 65 - 82) < 0.0001);
    expect(atJoin).toBe(false);
  }
});
