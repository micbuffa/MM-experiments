import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CABINET } from '../game/venueLayout';
import type { decorTools } from './decorTools';

export function createTrackball(
  { material, sphere }: ReturnType<typeof decorTools>,
  name: string,
  color: string,
  position: [number, number, number],
) {
  const mat = material(name + '-material', color);
  mat.specularPower = 88;
  mat.specularColor.set(0.36, 0.36, 0.36);
  const radius = CABINET.trackballRadius;
  const mesh = sphere(name, 2 * radius, position, mat);

  // Color variations are attached to the resin, so they move with the sphere.
  const positions = mesh.getVerticesData(VertexBuffer.PositionKind)!;
  const colors = [];
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]! / radius;
    const y = positions[i + 1]! / radius;
    const z = positions[i + 2]! / radius;
    const shade = 0.82 + 0.14 * Math.sin(8 * x + 4 * Math.cos(4 * y - 3 * z));
    colors.push(shade, shade, shade, 1);
  }
  mesh.setVerticesData(VertexBuffer.ColorKind, colors);

  const orientation = Quaternion.Identity();
  const step = Quaternion.Identity();
  const axis = Vector3.Zero();
  mesh.rotationQuaternion = orientation;
  return {
    mesh,
    roll(x: number, y: number) {
      const distance = Math.hypot(x, y);
      if (!Number.isFinite(distance))
        throw new RangeError('Invalid trackball command');
      if (distance === 0) return;
      axis.set(-y, 0, -x);
      const angle = Math.min(distance * 0.006, Math.PI / 4);
      Quaternion.RotationAxisToRef(axis, angle, step);
      step.multiplyToRef(orientation, orientation).normalize();
    },
  };
}
