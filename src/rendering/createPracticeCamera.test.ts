import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import {
  arcadeHeightScale,
  practiceFrustum,
  practiceOpeningScroll,
} from '../game/modern/practiceProjection';
import { createPracticeCamera } from './createPracticeCamera';

it('aligns horizontal axes and height with native arcade pixels', () => {
  const engine = new NullEngine({
    renderWidth: 640,
    renderHeight: 480,
    textureSize: 512,
    deterministicLockstep: false,
    lockstepMaxSteps: 4,
  });
  try {
    const scene = new Scene(engine);
    const camera = createPracticeCamera(scene, 20, 14);
    scene.render();
    const viewport = camera.viewport.toGlobal(336, 240);
    expect(viewport.x).toBeCloseTo(24);
    expect(viewport.x + viewport.width).toBeCloseTo(312);
    function project(x: number, z: number, y: number) {
      return Vector3.Project(
        new Vector3(x / 8 - 20, (y / 8) * arcadeHeightScale, z / 8 - 18),
        Matrix.IdentityReadOnly,
        scene.getTransformMatrix(),
        viewport,
      );
    }
    for (const [x, z, y, u, v] of [
      [140, 140, 0, 159, 48],
      [164, 140, -3, 135, 63],
      [140, 118, 2, 137, 35],
    ] as const) {
      const result = project(x, z, y);
      expect(result.x).toBeCloseTo(u, 2);
      expect(result.y).toBeCloseTo(v, 2);
    }
    const { top, bottom } = practiceFrustum(20, 14, practiceOpeningScroll + 20);
    camera.orthoTop = top;
    camera.orthoBottom = bottom;
    scene.render();
    const afterScroll = project(140, 140, 0);
    expect(afterScroll.x).toBeCloseTo(159, 2);
    expect(afterScroll.y).toBeCloseTo(28, 2);
    scene.dispose();
  } finally {
    engine.dispose();
  }
});
