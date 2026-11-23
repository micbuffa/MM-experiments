import { fitCatapultAxle } from './fitCatapultAxle';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import type { RollingActors } from '../emulation/rollingActors';
import { createRollingActor } from './createRollingActor';

// Native 20-step throw table (0x210ca..0x21116) mapped to the 22-pose catapult_throw.ase.mesh
// so the cup snaps up in 3 frames, holds high while the marble launches, then lowers.
const nativeThrowToPose = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
] as const;

/** Scene-owned imported mesh, with the procedural assembly retained as fallback. */
export function createRollingCatapult(scene: Scene, library: RollingActors) {
  const idle = library.models.catapult;
  const throwing = library.models.catapult_throw;
  if (!idle || !throwing) return false;
  const root = scene.getTransformNodeByName('level4-catapult');
  const axle = scene.getTransformNodeByName('level4-catapult-axle');
  const cup = scene.getMeshByName('level4-catapult-cup');
  if (!root || !axle || !cup) return false;
  const target = cup.computeWorldMatrix(true).getTranslation();
  const scale = 0.119;
  // The circular cup is centered at model Z=7.58, with its outer base at Y=-2.10
  // and inner bowl floor at Y=-1.45. Keep the inner bowl floor slightly above the tile!
  const position = {
    x: target.x,
    y: root.position.y,
    z: target.z - 7.58 * scale,
  };
  const actor = createRollingActor(scene, 'level4-imported-catapult', {
    ...library,
    models: {
      ...library.models,
      catapult: fitCatapultAxle(idle),
      catapult_throw: fitCatapultAxle(throwing),
    },
  });
  const update = (frame: number | undefined) => {
    const active = frame !== undefined;
    const poseIndex =
      frame !== undefined
        ? Math.min(
            throwing.poses.length - 1,
            nativeThrowToPose[Math.max(0, Math.min(19, Math.floor(frame)))] ??
              0,
          )
        : 0;
    actor.update(
      active ? 'catapult_throw' : 'catapult',
      poseIndex,
      position,
      0,
      2.1 * scale,
    );
  };
  update(0);
  update(undefined);
  axle.setEnabled(false);
  scene.getMeshByName('level4-catapult-bearing')?.setEnabled(false);
  Object.assign(scene.metadata, { setLevel4CatapultFrame: update });
  const meshes = scene.meshes.filter((mesh) =>
    mesh.name.startsWith('level4-imported-catapult-'),
  );
  const key = scene.getLightByName('key');
  if (key instanceof DirectionalLight) {
    key.excludedMeshes.push(...meshes);
    const light = new DirectionalLight(
      'level4-catapult-detail-light',
      key.direction.clone(),
      scene,
    );
    light.intensity = key.intensity;
    light.diffuse.copyFrom(key.diffuse);
    light.includedOnlyMeshes = meshes;
    light.position
      .copyFrom(new Vector3(target.x, target.y, target.z - 1))
      .subtractInPlace(key.direction.scale(10));
    light.shadowFrustumSize = 7;
    light.shadowMinZ = 0.1;
    light.shadowMaxZ = 22;
    const shadows = new ShadowGenerator(
      Math.min(2048, scene.getEngine().getCaps().maxTextureSize),
      light,
    );
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadows.bias = 0.0002;
    shadows.normalBias = 0.004;
    shadows.darkness = 0.1;
    for (const mesh of meshes) shadows.addShadowCaster(mesh, false);
    for (const mesh of scene.meshes)
      if (
        mesh.name === 'terrain-cliffs' ||
        mesh.name.startsWith('level4-catapult-masonry')
      )
        shadows.addShadowCaster(mesh, false);
    key
      .getShadowGenerator()
      ?.getShadowMap()
      ?.renderList?.push(...meshes);
  }
  return true;
}
