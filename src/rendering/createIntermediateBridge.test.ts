import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import {
  arcadeCellUnits,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  createIntermediateBridge,
  intermediateBridgeCell,
  intermediateBridgeRise,
  intermediateBridgeStepRise,
  setIntermediateBridgeStep,
} from './createIntermediateBridge';

it('replaces the surveyed deck and spike with an opening and a lower landing', () => {
  expect(intermediateBridgeCell(61, 56)).toBeNull();
  expect(intermediateBridgeCell(60, 59)).toBeNull();
  const upper = intermediateBridgeCell(60, 55)!;
  const lower = intermediateBridgeCell(65, 56)!;
  expect(new Set(upper).size).toBe(1);
  expect(new Set(lower).size).toBe(1);
  expect(upper[0]! - lower[0]!).toBeCloseTo(
    (44 * arcadeHeightScale) / arcadeCellUnits,
  );
  expect(intermediateBridgeCell(61, 60)).toBeUndefined();
});

it('keeps the pauses and repeats the surveyed lift every 144 frames', () => {
  const observedFrames = [
    [3328, 0],
    [3352, 3],
    [3360, 8],
    [3368, 13],
    [3376, 16],
    [3408, 13],
    [3416, 8],
    [3424, 3],
    [3432, 0],
  ] as const;
  for (const [frame, height] of observedFrames) {
    const relative = frame - 3288;
    const toArcadeUnits = arcadeCellUnits / arcadeHeightScale;
    expect(
      Math.round(intermediateBridgeRise(relative / 60) * toArcadeUnits),
    ).toBe(height);
    expect(intermediateBridgeRise((relative + 144) / 60)).toBeCloseTo(
      intermediateBridgeRise(relative / 60),
    );
  }
});

it('synchronizes the live bridge deck and positions the spoked wheel on the left of the piston', () => {
  expect(intermediateBridgeStepRise(0)).toBe(0);
  expect(intermediateBridgeStepRise(6)).toBeCloseTo(
    (16 * arcadeHeightScale) / arcadeCellUnits,
  );
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const terrain: PracticeTerrain = {
      level: 'intermediate',
      origin: { x: 0, z: 0 },
      lastScroll: -15846,
      cells: Array.from({ length: 70 }, () =>
        Array<TerrainCell>(70).fill([0, 0, 0, 0]),
      ),
    };
    const paving = new StandardMaterial('paving', scene);
    createIntermediateBridge(scene, terrain, paving, true);
    const slab = scene.getMeshByName('intermediate-bridge-slab')!;
    const flatY = slab.position.y;
    setIntermediateBridgeStep(scene, 6);
    expect(slab.position.y).toBeGreaterThan(flatY + 0.5);
    setIntermediateBridgeStep(scene, 0);
    expect(slab.position.y).toBeCloseTo(flatY);
    const wheelHub = scene.getTransformNodeByName(
      'intermediate-bridge-wheel-hub',
    )!;
    const piston = scene.getMeshByName('intermediate-bridge-piston')!;
    wheelHub.computeWorldMatrix(true);
    piston.computeWorldMatrix(true);
    // In arcade projection u = z - x, smaller u places the wheel to the left of the piston.
    const wheelU =
      wheelHub.getAbsolutePosition().z - wheelHub.getAbsolutePosition().x;
    const pistonU =
      piston.getAbsolutePosition().z - piston.getAbsolutePosition().x;
    expect(wheelU).toBeLessThan(pistonU - 1);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
