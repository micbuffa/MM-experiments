import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { RollingActors } from '../emulation/rollingActors';
import { createMarbleMaterial } from './createMarbleMaterial';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Scene } from '@babylonjs/core/scene';

export const marbleRadius = 0.675;

export function createPracticeMarble(
  scene: Scene,
  name: string,
  red = false,
  library?: RollingActors,
) {
  const model = library?.models.player;
  const marble = model
    ? new Mesh(name, scene)
    : CreateSphere(name, { diameter: marbleRadius * 2, segments: 20 }, scene);
  if (model) {
    marble.setVerticesData(
      VertexBuffer.PositionKind,
      model.poses[0]!.positions.map((value) => value * 0.119),
    );
    marble.setVerticesData(
      VertexBuffer.NormalKind,
      Array.from(model.poses[0]!.normals),
    );
    marble.setVerticesData(VertexBuffer.UVKind, Array.from(model.uvs));
    marble.setIndices(
      Object.values(model.groups).flatMap((indices) => Array.from(indices)),
    );
  }
  marble.material = createMarbleMaterial(scene, red);

  const orientation = Quaternion.Identity();
  const rotation = Quaternion.Identity();
  const axis = Vector3.Zero();
  marble.rotationQuaternion = orientation;
  marble.setEnabled(false);
  let hasPreviousPose = false;
  return {
    marble,
    update(position: { x: number; y: number; z: number } | null) {
      // The disabled mesh is excluded from both the scene and the shadow map.
      marble.setEnabled(position !== null);
      if (!position) {
        hasPreviousPose = false;
        return;
      }
      if (hasPreviousPose) {
        const dx = position.x - marble.position.x;
        const dz = position.z - marble.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance > 0) {
          axis.set(dz, 0, -dx);
          Quaternion.RotationAxisToRef(axis, distance / marbleRadius, rotation);
          rotation.multiplyToRef(orientation, orientation).normalize();
        }
      }
      hasPreviousPose = true;
      // The arcade height is at ground level when the marble is resting.
      marble.position.set(position.x, position.y + marbleRadius, position.z);
    },
  };
}
