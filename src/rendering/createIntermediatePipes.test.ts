import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import { createIntermediatePipes } from './createIntermediatePipes';
import {
  intermediatePipeFloorIndices,
  pipeSeamStrip,
} from './intermediatePipeSurfaces';

it('keeps the supplied normals and uses a neutral lining', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const normals = [0, 0, 1, 0.6, 0, 0.8, 0, 0, 1];
    const [shell, interior] = createIntermediatePipes(
      scene,
      {
        positions: [0, 0, 0, 0, 1, 0, 1, 0, 0],
        normals,
        shell: [0, 1, 2],
        interior: [0, 2, 1],
      },
      { positions: [3, 0, 11, 4, 0, 11, 4, 0, 12], indices: [0, 1, 2] },
    );
    expect(
      scene.getMeshByName('intermediate-pipes-floor')?.receiveShadows,
    ).toBe(true);
    expect(shell?.getVerticesData(VertexBuffer.NormalKind)).toEqual(normals);
    const lining = interior?.material;
    expect(lining).toBeInstanceOf(StandardMaterial);
    expect((lining as StandardMaterial).diffuseColor.asArray()).toEqual([
      0.26, 0.26, 0.28,
    ]);
  } finally {
    engine.dispose();
  }
});

it('clips a seam to a thin band of the actual shell', () => {
  const points = [
    new Vector3(-1, 0, 0),
    new Vector3(1, 0, 0),
    new Vector3(1, 0, 1),
  ];
  const strip = pipeSeamStrip(points, 'x', 0);
  expect(strip).toHaveLength(4);
  expect(strip.every((p) => Math.abs(p.x) < 0.037 && p.y === 0)).toBe(true);
  expect(Math.max(...strip.map((p) => p.x))).toBeCloseTo(0.036);
  expect(pipeSeamStrip(points, 'x', 2)).toEqual([]);
});

it('assigns the whole tile inside each outlet without overlapping the landing', () => {
  const points = [
    3, 2, 11, 4, 3, 11, 4, 3, 12, 17, 2, 29, 18, 2, 29, 18, 2, 30, 4, 3, 11, 5,
    3, 11, 4, 3, 12, 17, 2, 30, 18, 2, 30, 18, 2, 31,
  ];
  expect(
    intermediatePipeFloorIndices(
      points,
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    ),
  ).toEqual({
    lining: [0, 1, 2, 3, 4, 5],
    paving: [6, 7, 8, 9, 10, 11],
  });
});
