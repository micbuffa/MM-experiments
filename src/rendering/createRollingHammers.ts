import { level4HammerSpriteSequence } from '../emulation/level4Hammers';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { Scene } from '@babylonjs/core/scene';
import type { RollingActors } from '../emulation/rollingActors';
import { createRollingActor } from './createRollingActor';

// Repeated sprites and the return to the first poses follow the ROM exactly.
// The corresponding imported 3D poses remain an approximation of the arcade sprites.
// Native 15-step swing table (0x22346..0x2237e) mapped to the 42-pose hammer.ase.mesh.
const spriteToPose = [0, 2, 3, 4, 6, 7, 8, 10, 12] as const;
const nativeStepToPose = level4HammerSpriteSequence.map(
  (sprite) => spriteToPose[sprite],
);

/** Scene-owned imported hammer meshes, retaining the procedural assembly as fallback. */
export function createRollingHammers(
  scene: Scene,
  library: RollingActors,
  live = false,
) {
  const model = library.models.hammer;
  if (!model) return false;
  const hammerScale = 0.088;
  const baseHeight = -15.2 * hammerScale;
  const entries: {
    index: number;
    actor: ReturnType<typeof createRollingActor>;
    meshes: Mesh[];
    position: { x: number; y: number; z: number };
  }[] = [];
  const allMeshes: Mesh[] = [];

  for (let index = 0; index < 4; index++) {
    const pivot = scene.getTransformNodeByName(`level4-hammer-${index}`);
    const base = scene.getMeshByName(`level4-hammer-${index}-base`);
    if (!pivot || !base) continue;
    const position = {
      x: base.position.x + 0.45,
      y: pivot.position.y - 0.65,
      z: base.position.z,
    };
    const actor = createRollingActor(
      scene,
      `level4-imported-hammer-${index}`,
      library,
    );
    const idlePoses = [6, 0, 6, 0] as const;
    const initialPose = live ? 0 : (idlePoses[index] ?? 0);
    actor.update('hammer', initialPose, position, 0, baseHeight);
    base.setEnabled(false);
    pivot.setEnabled(false);
    const partMeshes: Mesh[] = [];
    for (const mesh of scene.meshes) {
      if (mesh.name.startsWith(`level4-imported-hammer-${index}-`)) {
        mesh.scaling.setAll(hammerScale);
        if (initialPose === 0 || initialPose >= 14) mesh.setEnabled(false);
        partMeshes.push(mesh as Mesh);
        allMeshes.push(mesh as Mesh);
      }
    }
    entries.push({ index, actor, meshes: partMeshes, position });
  }
  if (!entries.length) return false;

  const setEntryPose = (entry: (typeof entries)[number], poseIndex: number) => {
    const visible = poseIndex >= 2 && poseIndex <= 13;
    if (!visible) {
      for (const mesh of entry.meshes) mesh.setEnabled(false);
      return;
    }
    entry.actor.update('hammer', poseIndex, entry.position, 0, baseHeight);
    for (const mesh of entry.meshes) mesh.scaling.setAll(hammerScale);
  };

  const idlePoses = [6, 0, 6, 0] as const;
  const applyFrames = (frames: readonly (number | undefined)[] | undefined) => {
    const active = frames?.some((step) => step !== undefined) ?? false;
    for (const entry of entries) {
      const step = frames?.[entry.index];
      const pose =
        !active && !live
          ? (idlePoses[entry.index] ?? 0)
          : step !== undefined && step > 0
            ? (nativeStepToPose[Math.max(0, Math.min(14, Math.floor(step)))] ??
              0)
            : 0;
      setEntryPose(entry, pose);
    }
  };

  scene.metadata ??= {};
  Object.assign(scene.metadata, { setLevel4HammerFrames: applyFrames });

  const key = scene.getLightByName('key');
  if (key instanceof DirectionalLight && allMeshes.length) {
    key.excludedMeshes.push(...allMeshes);
    const center = entries[Math.floor(entries.length / 2)]!.position;
    const light = new DirectionalLight(
      'level4-hammers-detail-light',
      key.direction.clone(),
      scene,
    );
    light.intensity = key.intensity;
    light.diffuse.copyFrom(key.diffuse);
    light.includedOnlyMeshes = allMeshes;
    light.position
      .copyFrom(new Vector3(center.x, center.y, center.z))
      .subtractInPlace(key.direction.scale(10));
    light.shadowFrustumSize = 10;
    light.shadowMinZ = 0.1;
    light.shadowMaxZ = 24;
    const shadows = new ShadowGenerator(
      Math.min(2048, scene.getEngine().getCaps().maxTextureSize),
      light,
    );
    shadows.usePercentageCloserFiltering = true;
    shadows.filteringQuality = ShadowGenerator.QUALITY_HIGH;
    shadows.bias = 0.0002;
    shadows.normalBias = 0.004;
    shadows.darkness = 0.1;
    for (const mesh of allMeshes) shadows.addShadowCaster(mesh, false);
    key
      .getShadowGenerator()
      ?.getShadowMap()
      ?.renderList?.push(...allMeshes);
  }
  return true;
}
