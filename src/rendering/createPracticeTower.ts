import type { Material } from '@babylonjs/core/Materials/material';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';

export const practiceTowerPlatform = { offset: -1, size: 3, height: 16366 };

const corners = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
] as const;

export function createPracticeSpike(
  scene: Scene,
  name: string,
  stone: Material,
) {
  const mesh = new Mesh(name, scene);
  mesh.material = stone;
  const radius = 0.68;
  const rise = (16 * arcadeHeightScale) / arcadeCellUnits;
  const data = new VertexData();
  data.positions = [];
  data.indices = [];
  data.uvs = [];
  for (const [side, [ax, az]] of corners.entries()) {
    const [bx, bz] = corners[(side + 1) % 4]!;
    data.positions.push(
      ax * radius,
      0,
      az * radius,
      bx * radius,
      0,
      bz * radius,
      0,
      rise,
      0,
    );
    data.indices.push(3 * side, 3 * side + 1, 3 * side + 2);
    data.uvs.push(0, 0.52, 1, 0.52, 0.5, 0.98);
  }
  data.normals = [];
  VertexData.ComputeNormals(data.positions, data.indices, data.normals);
  data.applyToMesh(mesh);
  return mesh;
}

export function createPracticeTower(
  scene: Scene,
  name: string,
  stone: Material,
) {
  const mesh = new Mesh(name, scene);
  mesh.material = stone;
  const baseRadius = practiceTowerPlatform.size / 2;
  const baseCenter = practiceTowerPlatform.offset + baseRadius;
  const shoulderRadius = 0.72;
  // Keep every ring and the apex over the square platform centre.
  const skirtDrop =
    ((16370 - practiceTowerPlatform.height) * arcadeHeightScale) /
    arcadeCellUnits;
  const shoulder = 0.2 + skirtDrop;
  const tip = 2.0 + skirtDrop;
  const data = new VertexData();
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];

  for (const [side, [ax, az]] of corners.entries()) {
    const [bx, bz] = corners[(side + 1) % 4]!;
    function at(u: number, v: number, relief = 0) {
      const radius = baseRadius + (shoulderRadius - baseRadius) * v;
      const center = baseCenter;
      return [
        center + (ax + (bx - ax) * u) * radius + (ax + bx) * relief,
        shoulder * v + relief,
        center + (az + (bz - az) * u) * radius + (az + bz) * relief,
      ];
    }
    function quad(
      lowerEdge: readonly [number, number],
      upperEdge: readonly [number, number],
      bottom: number,
      top: number,
      relief: number,
    ) {
      const start = positions.length / 3;
      positions.push(
        ...at(lowerEdge[0], bottom, relief),
        ...at(lowerEdge[1], bottom, relief),
        ...at(upperEdge[1], top, relief),
        ...at(upperEdge[0], top, relief),
      );
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }

    // Recessed mortar remains visible between the three stones.
    quad([0, 1], [0, 1], 0, 1, 0);
    for (let vertex = 0; vertex < 4; vertex++) uvs.push(0.01, 0.25);
    for (const [lower, upper] of [
      [
        [0.025, 0.26],
        [0.025, 0.115],
      ],
      [
        [0.295, 0.705],
        [0.15, 0.85],
      ],
      [
        [0.74, 0.975],
        [0.885, 0.975],
      ],
    ] as const) {
      quad(lower, upper, 0.04, 0.95, 0.01);
      uvs.push(0, 0.035, 1, 0.035, 1, 0.465, 0, 0.465);
    }

    const start = positions.length / 3;
    positions.push(...at(0, 1), ...at(1, 1), baseCenter, tip, baseCenter);
    indices.push(start, start + 1, start + 2);
    uvs.push(0, 0.52, 1, 0.52, 0.5, 0.98);
  }
  data.positions = positions;
  data.indices = indices;
  data.uvs = uvs;
  data.normals = [];
  VertexData.ComputeNormals(positions, indices, data.normals);
  data.applyToMesh(mesh);
  return mesh;
}
