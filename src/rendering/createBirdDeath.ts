import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import type { Scene } from '@babylonjs/core/scene';
import type { BirdDeath } from '../emulation/birdDeath';
import { arcadeCellUnits } from '../game/modern/practiceProjection';
import { marbleRadius } from './createPracticeMarble';

/** Native fragment offsets drive the presentation; no extra timer or motion. */
export function createBirdDeath(scene: Scene, name: string, red: boolean) {
  const paint = new StandardMaterial(name + '-paint', scene);
  paint.diffuseColor.set(red ? 0.9 : 0.08, 0.12, red ? 0.05 : 0.95);
  paint.emissiveColor.set(red ? 0.45 : 0.04, 0.03, red ? 0.02 : 0.5);
  paint.specularColor.set(0, 0, 0);
  const meshes = Array.from({ length: 8 }, (_, i) => {
    const mesh = CreatePolyhedron(
      `${name}-${i}`,
      { type: 0, sizeX: 0.24, sizeY: 0.33, sizeZ: 0.18 },
      scene,
    );
    mesh.material = paint;
    mesh.renderingGroupId = 1;
    mesh.setEnabled(false);
    return mesh;
  });
  const right = Vector3.Zero(),
    up = Vector3.Zero();
  const pixels = arcadeCellUnits * Math.SQRT2;
  return (
    death: BirdDeath | undefined,
    point: { x: number; y: number; z: number } | null,
  ) => {
    for (const mesh of meshes) mesh.setEnabled(false);
    if (!death || !point || !scene.activeCamera) return false;
    scene.activeCamera.getDirectionToRef(Vector3.RightReadOnly, right);
    scene.activeCamera.getDirectionToRef(Vector3.UpReadOnly, up);
    for (const fragment of death.fragments) {
      const mesh = meshes[fragment.id];
      if (!mesh) continue;
      const x = fragment.x / pixels,
        y = -fragment.y / pixels;
      mesh.position.set(
        point.x + right.x * x + up.x * y,
        point.y + marbleRadius + right.y * x + up.y * y,
        point.z + right.z * x + up.z * y,
      );
      mesh.rotation.set(
        fragment.id * 0.6,
        fragment.id * 0.7,
        fragment.id * 0.4,
      );
      mesh.setEnabled(true);
    }
    return true;
  };
}
