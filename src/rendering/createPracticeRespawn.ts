import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import type { Scene } from '@babylonjs/core/scene';
import { arcadeCellUnits } from '../game/modern/practiceProjection';
import { marbleRadius } from './createPracticeMarble';

const fragmentCount = 8;
const firstOrbitTick = 45;
const pixelsPerWorldUnit = arcadeCellUnits * Math.SQRT2;

export function createPracticeRespawn(
  scene: Scene,
  name: string,
  red: boolean,
) {
  const shell = new StandardMaterial(`${name}-fragment-shell`, scene);
  shell.diffuseColor.set(red ? 0.55 : 0.04, 0.06, red ? 0.025 : 0.55);
  shell.emissiveColor.set(red ? 0.32 : 0.03, 0.015, red ? 0.01 : 0.35);
  shell.specularColor.set(0, 0, 0);
  const fragments = Array.from({ length: fragmentCount }, (_, i) => {
    const fragment = CreatePolyhedron(
      `${name}-fragment-${i}`,
      { type: 0, sizeX: 0.24, sizeY: 0.33, sizeZ: 0.18 },
      scene,
    );
    fragment.material = shell;
    // Keep the orbit visible when its lower half crosses the terrain in projection.
    fragment.renderingGroupId = 1;
    fragment.setEnabled(false);
    return fragment;
  });
  const right = Vector3.Zero();
  const up = Vector3.Zero();

  return (
    position: { x: number; y: number; z: number } | null,
    ticks?: number,
  ) => {
    const camera = scene.activeCamera;
    if (!camera || !position || ticks === undefined || ticks > firstOrbitTick) {
      for (const fragment of fragments) fragment.setEnabled(false);
      return;
    }
    camera.getDirectionToRef(Vector3.RightReadOnly, right);
    camera.getDirectionToRef(Vector3.UpReadOnly, up);
    // Fit the orbit to the arcade sprites in native pixels, then scale to world units.
    const radiusX = (4 + 2.9 * ticks) / pixelsPerWorldUnit;
    const radiusY = (4 + 1.35 * ticks) / pixelsPerWorldUnit;
    const centerRise = ticks / pixelsPerWorldUnit;
    // As the counter falls, the positive angle advances counterclockwise on screen.
    const phase = -0.56 - 0.16 * ticks;
    for (const [i, fragment] of fragments.entries()) {
      const angle = phase + (i * 2 * Math.PI) / fragmentCount;
      const x = Math.cos(angle) * radiusX;
      const y = centerRise + Math.sin(angle) * radiusY;
      fragment.position.set(
        position.x + right.x * x + up.x * y,
        position.y + marbleRadius + right.y * x + up.y * y,
        position.z + right.z * x + up.z * y,
      );
      fragment.rotation.set(angle * 1.7, angle, angle * 0.6);
      fragment.setEnabled(true);
    }
  };
}
