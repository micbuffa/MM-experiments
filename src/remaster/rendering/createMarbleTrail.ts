import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
// Register thin-instance helpers on Mesh for single-draw-call particle pool.
import '@babylonjs/core/Meshes/thinInstanceMesh';
import type { Scene } from '@babylonjs/core/scene';

interface TrailParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  baseScale: number;
}

/**
 * Lightweight, zero-allocation 3D motion trail behind a rolling marble.
 * Uses a single thin-instanced sphere mesh (1 draw call) with soft emissive glow.
 */
export function createMarbleTrail(scene: Scene, name: string, red: boolean) {
  const poolSize = 28;
  const proto = CreateSphere(
    `${name}-proto`,
    { diameter: 0.34, segments: 8 },
    scene,
  );
  const mat = new StandardMaterial(`${name}-mat`, scene);
  mat.disableLighting = true;
  mat.emissiveColor = red
    ? new Color3(1.0, 0.48, 0.38)
    : new Color3(0.45, 0.88, 1.0);
  mat.alpha = 0.72;
  mat.backFaceCulling = false;
  proto.material = mat;
  proto.isPickable = false;
  // Mandatory for moving thin-instance pools so BabylonJS never frustum-culls
  // the pool when the marble rolls away from world origin (0, 0, 0).
  proto.alwaysSelectAsActiveMesh = true;

  const particles: TrailParticle[] = Array.from({ length: poolSize }, () => ({
    x: 0,
    y: -999,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    age: 1,
    maxAge: 0.35,
    baseScale: 1,
  }));

  const matrices = new Float32Array(poolSize * 16);
  const tmpScale = Vector3.Zero();
  const tmpPos = Vector3.Zero();
  const idQuat = Quaternion.Identity();
  const tmpMat = Matrix.Identity();

  let cursor = 0;
  let spawnCarry = 0;
  let phase = 0;

  return {
    update(
      position: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      } | null,
      velocity: {
        readonly x: number;
        readonly y: number;
        readonly z: number;
      } | null,
      dtSeconds: number,
    ) {
      const dt = Math.min(0.1, Math.max(0, dtSeconds));
      phase += dt * 13.7;

      if (position && velocity) {
        const speed = Math.hypot(velocity.x, velocity.z);
        if (speed > 1.0) {
          // Light, readable emission proportional to speed (~14..38 particles/sec).
          const rate = Math.min(38, (speed - 0.8) * 3.8);
          spawnCarry += rate * dt;
          while (spawnCarry >= 1) {
            spawnCarry -= 1;
            const p = particles[cursor]!;
            cursor = (cursor + 1) % poolSize;
            const inv = 1 / Math.max(0.01, speed);
            const jitterX = Math.sin(phase + cursor * 2.1) * 0.16;
            const jitterZ = Math.cos(phase * 1.3 + cursor * 1.7) * 0.16;
            p.x = position.x - velocity.x * inv * 0.52 + jitterX;
            p.y = position.y + 0.38 + Math.abs(Math.sin(phase + cursor)) * 0.16;
            p.z = position.z - velocity.z * inv * 0.52 + jitterZ;
            p.vx = -velocity.x * 0.1 + jitterX * 0.85;
            p.vy = 0.36 + Math.min(0.45, speed * 0.03);
            p.vz = -velocity.z * 0.1 + jitterZ * 0.85;
            p.age = 0;
            p.maxAge = 0.32 + Math.min(0.2, speed * 0.015);
            p.baseScale = 0.72 + Math.min(0.68, speed * 0.05);
          }
        }
      }

      let anyAlive = false;
      for (let i = 0; i < poolSize; i++) {
        const p = particles[i]!;
        if (p.age < p.maxAge) {
          p.age += dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.z += p.vz * dt;
          p.vy *= Math.max(0, 1 - dt * 2.5);
          const life = Math.max(0, 1 - p.age / p.maxAge);
          const s = p.baseScale * life * life;
          if (s > 0.02) {
            anyAlive = true;
            tmpScale.set(s, s, s);
            tmpPos.set(p.x, p.y, p.z);
          } else {
            tmpScale.set(0, 0, 0);
            tmpPos.set(0, -999, 0);
          }
        } else {
          tmpScale.set(0, 0, 0);
          tmpPos.set(0, -999, 0);
        }
        Matrix.ComposeToRef(tmpScale, idQuat, tmpPos, tmpMat);
        tmpMat.copyToArray(matrices, i * 16);
      }

      proto.setEnabled(anyAlive);
      if (anyAlive) {
        proto.thinInstanceSetBuffer('matrix', matrices, 16, false);
      }
    },

    dispose() {
      proto.dispose();
      mat.dispose();
    },
  };
}
