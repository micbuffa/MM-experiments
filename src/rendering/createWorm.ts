import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { WormPose } from '../game/modern/wormPose';

/** Scene owns all resources. Geometry buffers are reused for every native pose. */
export function createWorm(scene: Scene, name: string) {
  const root = new TransformNode(name, scene);
  const body = new Mesh(name + '-body', scene);
  body.parent = root;
  body.receiveShadows = true;
  const segments = 32,
    sides = 12;
  const positions = new Float32Array((segments + 1) * (sides + 1) * 3);
  const normals = new Float32Array(positions.length);
  const colors = new Float32Array((segments + 1) * (sides + 1) * 4);
  const indices: number[] = [];
  for (let i = 0; i <= segments; i++)
    for (let j = 0; j <= sides; j++) {
      const at = (i * (sides + 1) + j) * 4;
      const rib = i % 4 === 0 ? 0.42 : 1;
      colors.set([0.03 * rib, 0.68 * rib, 0.055 * rib, 1], at);
      if (i < segments && j < sides) {
        const a = i * (sides + 1) + j,
          b = a + sides + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  body.setVerticesData(VertexBuffer.PositionKind, positions, true);
  body.setVerticesData(VertexBuffer.NormalKind, normals, true);
  body.setVerticesData(VertexBuffer.ColorKind, colors);
  body.setIndices(indices);
  const green = new StandardMaterial(name + '-green', scene);
  green.diffuseColor.set(1, 1, 1);
  green.specularColor.set(0, 0, 0);
  green.backFaceCulling = false;
  body.material = green;
  const yellow = new StandardMaterial(name + '-yellow', scene);
  yellow.diffuseColor.set(1, 0.88, 0);
  yellow.specularColor.set(0, 0, 0);
  const red = new StandardMaterial(name + '-red', scene);
  red.diffuseColor.set(0.85, 0.045, 0.015);
  red.specularColor.set(0, 0, 0);
  const caps = [0, 1].map((i) => {
    const cap = CreateCylinder(
      name + '-end-' + i,
      { diameter: 0.84, height: 0.035, tessellation: 12 },
      scene,
    );
    cap.parent = root;
    cap.receiveShadows = true;
    cap.material = yellow;
    return cap;
  });
  const mouth = CreateCylinder(
    name + '-mouth',
    { diameter: 0.3, height: 0.045, tessellation: 10 },
    scene,
  );
  mouth.parent = caps[1]!;
  mouth.position.y = 0.025;
  mouth.material = red;
  const tongue = CreateBox(
    name + '-tongue',
    { width: 0.15, height: 0.035, depth: 0.4 },
    scene,
  );
  tongue.parent = caps[1]!;
  tongue.material = red;
  root.setEnabled(false);
  return {
    hide() {
      root.setEnabled(false);
    },
    update(pose: WormPose, point: { x: number; y: number; z: number }) {
      root.setEnabled(true);
      root.position.set(point.x, point.y + 0.04, point.z);
      root.rotation.y = pose.heading;
      const heightScale = 1.16;
      const cy =
        (Math.max(pose.tailY, pose.headY) / 2 + pose.arch) * heightScale;
      const cz = (pose.tailZ + pose.headZ) / 2;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments,
          u = 1 - t;
        const radius = 0.36 * (1 + pose.flare * (1.3 * (1 - t) - 0.8 * t));
        const x = t * pose.headX;
        const y =
          u * u * pose.tailY * heightScale +
          2 * u * t * cy +
          t * t * pose.headY * heightScale;
        const z = u * u * pose.tailZ + 2 * u * t * cz + t * t * pose.headZ;
        const dx = pose.headX;
        const dy =
          2 *
          (u * (cy - pose.tailY * heightScale) +
            t * (pose.headY * heightScale - cy));
        const dz = 2 * (u * (cz - pose.tailZ) + t * (pose.headZ - cz));
        const length = Math.hypot(dx, dy, dz) || 1;
        const tx = dx / length,
          ty = dy / length,
          tz = dz / length;
        const rx = 1 - tx * tx,
          ry = -tx * ty,
          rz = -tx * tz;
        const rl = Math.hypot(rx, ry, rz) || 1;
        const ax = rx / rl,
          ay = ry / rl,
          az = rz / rl;
        const bx = ty * az - tz * ay,
          by = tz * ax - tx * az,
          bz = tx * ay - ty * ax;
        for (let j = 0; j <= sides; j++) {
          const a = (j / sides) * Math.PI * 2;
          const nx = Math.cos(a) * ax + Math.sin(a) * bx,
            ny = Math.cos(a) * ay + Math.sin(a) * by,
            nz = Math.cos(a) * az + Math.sin(a) * bz;
          const at = (i * (sides + 1) + j) * 3;
          positions[at] = x + nx * radius;
          positions[at + 1] = Math.max(0, y + ny * radius);
          positions[at + 2] = z + nz * radius;
          normals[at] = nx;
          normals[at + 1] = ny;
          normals[at + 2] = nz;
        }
      }
      body.updateVerticesData(VertexBuffer.PositionKind, positions, true);
      body.updateVerticesData(VertexBuffer.NormalKind, normals);
      const tail = caps[0]!,
        head = caps[1]!;
      tail.scaling.set(1 + pose.flare * 1.3, 1, 1 + pose.flare * 1.3);
      head.scaling.set(1 - pose.flare * 0.8, 1, 1 - pose.flare * 0.8);
      tail.position.set(0, pose.tailY * heightScale, pose.tailZ);
      head.position.set(pose.headX, pose.headY * heightScale, pose.headZ);
      tail.rotation.x =
        pose.tailY === 0
          ? 0
          : Math.atan2(pose.tailZ - cz, pose.tailY * heightScale - cy);
      head.rotation.x =
        pose.headY === 0
          ? 0
          : Math.atan2(pose.headZ - cz, pose.headY * heightScale - cy);
      head.rotation.z =
        pose.headY === 0
          ? 0
          : -Math.atan2(pose.headX * 0.5, pose.headY * heightScale - cy);
      mouth.setEnabled(pose.mouth > 0);
      mouth.scaling.setAll(Math.max(0.01, pose.mouth));
      tongue.setEnabled(pose.tongue > 0);
      tongue.scaling.z = Math.max(0.01, pose.tongue);
      tongue.position.set(0, 0.055, 0.15 + pose.tongue * 0.16);
    },
  };
}
