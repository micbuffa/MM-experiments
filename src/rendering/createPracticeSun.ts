import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import {
  arcadeCellUnits,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';

/** Keep the measured azimuth and raise the sun to match the shorter arcade silhouettes. */
export function practiceSunDirection() {
  // Approximate median in native pixels over the three corners of the left side rail.
  const screenRight = 22;
  const screenDown = 3;
  const postHeight = 6;
  const difference = screenRight / arcadeCellUnits;
  // Remove the vertical projection of the drop before inverting the ground axes.
  const sum = (2 * (screenDown - postHeight)) / arcadeCellUnits;
  const x = (sum - difference) / 2;
  const z = (sum + difference) / 2;
  const elevation = (24 * Math.PI) / 180;
  return new Vector3(x, -Math.hypot(x, z) * Math.tan(elevation), z).normalize();
}

/** Arcade frame at 306 px: center tower apex (159,65), shadow tip (238,84). */
export function intermediateSunDirection() {
  const height = 34; // 26 from the tower and 8 from its raised base.
  const difference = 79;
  const sum = 2 * (19 - height);
  return new Vector3(
    (sum - difference) / 2,
    -height * arcadeHeightScale,
    (sum + difference) / 2,
  ).normalize();
}

export function createPracticeSun(
  scene: Scene,
  depth: number,
  level?: 'intermediate',
) {
  const intermediate = level === 'intermediate';
  const ray = intermediate
    ? intermediateSunDirection()
    : practiceSunDirection();
  const key = new DirectionalLight('key', ray, scene);
  key.intensity = 2.35;
  key.position.copyFrom(key.direction).scaleInPlace(-1.15 * depth);
  key.shadowMinZ = 0.1;
  key.shadowMaxZ = 2.5 * depth;
  key.shadowFrustumSize = 1.2 * depth;
  // The standard import registers the shadow generator scene component.
  const size =
    intermediate || depth > 60
      ? Math.min(4096, scene.getEngine().getCaps().maxTextureSize)
      : 1024;
  const shadows = new ShadowGenerator(size, key);
  shadows.filter = ShadowGenerator.FILTER_NONE;
  shadows.bias = intermediate ? 0.0005 : 0.00045;
  shadows.normalBias = intermediate ? 0.011 : 0.01;
  shadows.darkness = 0.025;
  return shadows;
}
