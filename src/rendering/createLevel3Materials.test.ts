import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { expect, it } from 'vitest';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  createLevel3Wave,
  isLevel3TurquoiseCurb,
  level3Goal,
  setLevel3WaveProfile,
  createLevel3TurquoiseSpike,
} from './createLevel3Materials';

it('keeps the native wave amplitude, upward normals and stable geometry for unchanged live samples', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const cells = Array.from({ length: 110 }, () =>
      Array<TerrainCell>(110).fill([0, 0, 0, 0]),
    );
    const wave = createLevel3Wave(scene, cells, true)!;
    const ys = () =>
      wave
        .getVerticesData(VertexBuffer.PositionKind)!
        .filter((_, i) => i % 3 === 1);
    const base = ys()[0]!;
    setLevel3WaveProfile(scene, Array<number>(22).fill(1));
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(
      ys().every(
        (y) => Math.abs(y - base - (30 * Math.sqrt(2 / 3)) / 8) < 0.00001,
      ),
    ).toBe(true);
    expect(
      wave
        .getVerticesData(VertexBuffer.NormalKind)!
        .filter((_, i) => i % 3 === 1)
        .every((y) => y > 0.99),
    ).toBe(true);
    const positions = [...wave.getVerticesData(VertexBuffer.PositionKind)!];
    setLevel3WaveProfile(scene, Array<number>(22).fill(1));
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(wave.getVerticesData(VertexBuffer.PositionKind)).toEqual(positions);
    expect(wave.receiveShadows).toBe(false);
    expect(scene.getMeshByName('level3-wave-sides')!.receiveShadows).toBe(
      false,
    );
    setLevel3WaveProfile(scene, Array<number>(22).fill(0));
    scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(ys().every((y) => Math.abs(y - base) < 0.00001)).toBe(true);
    const spike = createLevel3TurquoiseSpike(scene, cells)!;
    const heights = spike
      .getVerticesData(VertexBuffer.PositionKind)!
      .filter((_, i) => i % 3 === 1);
    expect(Math.max(...heights) - Math.min(...heights)).toBeCloseTo(
      (16 * Math.sqrt(2 / 3)) / 8,
      4,
    );
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('starts the Level 3 GOAL decal one tile past the turquoise curbs and covers the full finish pad', () => {
  expect(isLevel3TurquoiseCurb(level3Goal.x, level3Goal.z - 1)).toBe(true);
  expect(isLevel3TurquoiseCurb(level3Goal.x, level3Goal.z)).toBe(false);
  expect(level3Goal).toEqual({ x: 92, z: 101, width: 4, length: 10 });
});
