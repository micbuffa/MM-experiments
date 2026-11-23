import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { expect, it } from 'vitest';
import {
  arcadeCellUnits,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import {
  createIntermediateTower,
  intermediateTowerStone,
} from './createIntermediateTower';

it('curves smoothly as an ogival dome with a horizontal belt and rounded crown', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const tower = createIntermediateTower(
      scene,
      'tower',
      new StandardMaterial('stone', scene),
    );
    const points = tower.getVerticesData(VertexBuffer.PositionKind)!;
    const heights = new Set<number>();
    const scale = arcadeHeightScale / arcadeCellUnits;
    for (let i = 0; i < points.length; i += 3) {
      const height = points[i + 1]! / scale;
      heights.add(Math.round(height * 10) / 10);
      if (Math.abs(height - 24.5) < 0.01) {
        // Near the crown the dome widens beyond a straight cone taper.
        expect(
          Math.max(Math.abs(points[i]!), Math.abs(points[i + 2]!)),
        ).toBeGreaterThan(2 * (1.5 / 26));
      }
    }
    expect([...heights].sort((a, b) => a - b)).toEqual([
      0, 5.5, 11, 16, 19.5, 22.5, 24.5, 25.5, 26,
    ]);
  } finally {
    engine.dispose();
  }
});

it('paints bold dark stone joints on the horizontal belt and panel borders', () => {
  expect(intermediateTowerStone(0.5, 0.25)).toBe(248);
  expect(intermediateTowerStone(0.5, 0.49)).toBeLessThan(110);
  expect(intermediateTowerStone(0.5, 0.51)).toBeLessThan(110);
  expect(intermediateTowerStone(0.02, 0.25)).toBeLessThan(110);
  expect(intermediateTowerStone(0.02, 0.7)).toBeLessThan(110);
});
