import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticeMarblePose } from '../emulation/practicePose';
import { marbleRadius } from './createPracticeMarble';

export function createMarbleSuction(scene: Scene, name: string, red: boolean) {
  const nozzles = Array.from({ length: 6 }, (_, index) =>
    scene.getMeshByName(`level4-vacuum-${index}-mouth`),
  );
  const material = new StandardMaterial(`${name}-material`, scene);
  material.diffuseColor.set(red ? 0.9 : 0.11, 0.17, red ? 0.15 : 0.95);
  const fragments = Array.from({ length: 8 }, (_, index) => {
    const mesh = CreateBox(`${name}-${index}`, { size: 0.24 }, scene);
    mesh.material = material;
    mesh.setEnabled(false);
    return mesh;
  });
  const target = new Vector3();
  const forward = new Vector3(0, 0, 1);
  const approach = new Vector3();
  return (
    suction: PracticeMarblePose['suction'],
    source: { x: number; y: number; z: number } | null,
  ) => {
    if (!suction || !source) {
      for (const mesh of fragments) mesh.setEnabled(false);
      return false;
    }
    const y = source.y + marbleRadius;
    const nozzle = nozzles[suction.vacuumIndex ?? -1];
    target.set(source.x, y + 0.45, source.z);
    approach.set(0, 0, 0);
    if (nozzle?.isEnabled()) {
      const matrix = nozzle.computeWorldMatrix(true);
      matrix.getTranslationToRef(target);
      Vector3.TransformNormalToRef(forward, matrix, approach);
    }
    for (let index = 0; index < fragments.length; index++) {
      const mesh = fragments[index]!;
      const elapsed = suction.progress * 1.65 - index * 0.075;
      const t = Math.max(0, Math.min(1, elapsed));
      const angle = (index * Math.PI) / 4 + t * 4;
      const spread = (0.28 + Math.sin(t * Math.PI) * 0.2) * (1 - t);
      const bend = Math.sin(t * Math.PI);
      mesh.setEnabled(elapsed < 1);
      mesh.position.set(
        source.x +
          (target.x - source.x) * t +
          approach.x * bend +
          Math.cos(angle) * spread,
        y + (target.y - y) * t + bend * 0.32,
        source.z +
          (target.z - source.z) * t +
          approach.z * bend +
          Math.sin(angle) * spread,
      );
      mesh.rotation.set(t * 6, angle, t * 3);
      mesh.scaling.setAll(1 - t * 0.8);
    }
    return true;
  };
}
