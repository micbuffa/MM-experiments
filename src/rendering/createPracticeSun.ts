import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { RenderQuality } from '../game/renderQuality';
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
  // 2048x2048 gives ~17 shadow texels/tile at 4x lower fillrate than 4096x4096 on integrated GPUs.
  const size =
    intermediate || depth > 60
      ? Math.min(2048, scene.getEngine().getCaps().maxTextureSize)
      : 1024;
  const shadows = new ShadowGenerator(size, key);
  shadows.filter = ShadowGenerator.FILTER_NONE;
  shadows.bias = intermediate ? 0.0005 : 0.00045;
  shadows.normalBias = intermediate ? 0.011 : 0.01;
  shadows.darkness = 0.025;
  return shadows;
}

export type ShadowRefreshMode = 'once' | 'every-frame' | 'half-rate';

/** Configure how often the directional sun shadow map re-renders. */
export function setPracticeShadowRefresh(
  scene: Scene,
  mode: ShadowRefreshMode,
) {
  const generator = scene.getLightByName('key')?.getShadowGenerator();
  if (!(generator instanceof ShadowGenerator)) return;
  const map = generator.getShadowMap();
  if (!map) return;
  map.refreshRate =
    mode === 'once'
      ? RenderTargetTexture.REFRESHRATE_RENDER_ONCE
      : mode === 'half-rate'
        ? 2
        : RenderTargetTexture.REFRESHRATE_RENDER_ONEVERYFRAME;
}

/** Trigger a single shadow map re-render on the next frame for static-cached levels. */
export function invalidatePracticeShadows(scene: Scene) {
  const generator = scene.getLightByName('key')?.getShadowGenerator();
  if (!(generator instanceof ShadowGenerator)) return;
  const map = generator.getShadowMap();
  if (!map || map.refreshRate !== RenderTargetTexture.REFRESHRATE_RENDER_ONCE)
    return;
  map.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
}

/** Disable expensive PCF filtering in Eco mode for integrated GPUs and low-battery laptops. */
export function applyPracticeShadowQuality(
  scene: Scene,
  quality: RenderQuality,
) {
  const generator = scene.getLightByName('key')?.getShadowGenerator();
  if (!(generator instanceof ShadowGenerator)) return;
  if (quality === 'eco') {
    generator.usePercentageCloserFiltering = false;
    generator.filter = ShadowGenerator.FILTER_NONE;
  } else {
    generator.usePercentageCloserFiltering = true;
  }
}
