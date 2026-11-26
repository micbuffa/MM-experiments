import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreatePolyhedron } from '@babylonjs/core/Meshes/Builders/polyhedronBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { Vec3 } from '../levels/remasterLevel';

const CRUMB_OFFSETS = [
  [-0.42, 0.08, -0.25],
  [0.35, 0.07, -0.32],
  [-0.18, 0.09, 0.36],
  [0.44, 0.08, 0.22],
  [0.05, 0.07, -0.12],
  [-0.52, 0.06, 0.12],
  [0.2, 0.08, 0.44],
] as const;

/**
 * Procedural 3D arcade broom + scattered shattered-marble crumbs on the floor
 * that get swept away before the marble respawns (classic Marble Madness animation).
 */
export function createBroomSweep(scene: Scene, name: string, red = false) {
  const root = new TransformNode(`${name}-root`, scene);
  const crumbsRoot = new TransformNode(`${name}-crumbs-root`, scene);

  const woodMat = new StandardMaterial(`${name}-wood`, scene);
  woodMat.diffuseColor.set(0.62, 0.36, 0.16);
  woodMat.specularColor.set(0.2, 0.15, 0.1);

  const bandMat = new StandardMaterial(`${name}-band`, scene);
  bandMat.diffuseColor.set(0.75, 0.18, 0.14);
  bandMat.specularColor.set(0.3, 0.2, 0.2);

  const strawMat = new StandardMaterial(`${name}-straw`, scene);
  strawMat.diffuseColor.set(0.92, 0.78, 0.34);
  strawMat.emissiveColor.set(0.18, 0.14, 0.04);
  strawMat.specularColor.set(0.15, 0.12, 0.05);

  const crumbMat = new StandardMaterial(`${name}-crumb`, scene);
  crumbMat.diffuseColor.set(red ? 0.85 : 0.12, 0.14, red ? 0.08 : 0.88);
  crumbMat.emissiveColor.set(red ? 0.28 : 0.04, 0.04, red ? 0.02 : 0.32);

  // Wooden broom handle
  const handle = CreateCylinder(
    `${name}-handle`,
    { diameter: 0.14, height: 3.0, tessellation: 10 },
    scene,
  );
  handle.parent = root;
  handle.position.set(0, 2.25, 0);
  handle.material = woodMat;
  handle.renderingGroupId = 1;

  // Red binding collar
  const collar = CreateCylinder(
    `${name}-collar`,
    { diameterTop: 0.24, diameterBottom: 0.42, height: 0.24, tessellation: 10 },
    scene,
  );
  collar.parent = root;
  collar.position.set(0, 0.78, 0);
  collar.material = bandMat;
  collar.renderingGroupId = 1;

  // Flared flat straw bristle head
  const bristles = CreateBox(
    `${name}-bristles`,
    { width: 1.05, height: 0.72, depth: 0.26 },
    scene,
  );
  bristles.parent = root;
  bristles.position.set(0, 0.36, 0);
  bristles.material = strawMat;
  bristles.renderingGroupId = 1;

  // Scattered shattered-marble crumbs sitting on the floor
  const crumbs = CRUMB_OFFSETS.map(([ox, oy, oz], i) => {
    const c = CreatePolyhedron(
      `${name}-crumb-${i}`,
      { type: 0, sizeX: 0.18, sizeY: 0.11, sizeZ: 0.16 },
      scene,
    );
    c.parent = crumbsRoot;
    c.position.set(ox, oy, oz);
    c.rotation.set(i * 0.7, i * 1.3, i * 0.4);
    c.material = crumbMat;
    c.renderingGroupId = 1;
    return c;
  });

  root.setEnabled(false);
  crumbsRoot.setEnabled(false);

  return {
    /**
     * @param position World floor position of the shattered marble, or null to hide.
     * @param elapsed Normalized shatter elapsed in [0..1] (0..0.2 = crumbs appear, 0.2..0.96 = broom sweeps them away).
     */
    update(position: Vec3 | null, elapsed: number) {
      if (!position || elapsed <= 0 || elapsed >= 1) {
        root.setEnabled(false);
        crumbsRoot.setEnabled(false);
        return;
      }
      // Show crumbs on the floor from shatter moment until the broom finishes sweeping them away.
      const crumbRemain = Math.max(0, 1 - Math.max(0, (elapsed - 0.32) / 0.52));
      if (crumbRemain > 0.02) {
        crumbsRoot.setEnabled(true);
        const drift = Math.max(0, elapsed - 0.32) * 1.4;
        crumbsRoot.position.set(
          position.x + drift * 0.5,
          position.y,
          position.z - drift * 0.35,
        );
        for (const c of crumbs) {
          c.scaling.setAll(crumbRemain);
        }
      } else {
        crumbsRoot.setEnabled(false);
      }

      // Broom swoops in at 0.20, performs 3 sweep strokes, lifts away at 0.96.
      if (elapsed < 0.2) {
        root.setEnabled(false);
        return;
      }
      const progress = Math.min(1, (elapsed - 0.2) / 0.78);
      root.setEnabled(true);
      const liftY =
        progress < 0.15
          ? (1 - progress / 0.15) * 2.2
          : progress > 0.85
            ? ((progress - 0.85) / 0.15) * 2.4
            : 0;
      const strokePhase = ((progress - 0.15) / 0.7) * Math.PI * 6;
      const sweep =
        progress >= 0.15 && progress <= 0.85 ? Math.sin(strokePhase) : 0;
      root.position.set(
        position.x + sweep * 0.65,
        position.y + liftY,
        position.z - sweep * 0.45,
      );
      root.rotation.set(0.28, Math.PI * 0.25, -0.35 + sweep * 0.28);
    },

    dispose() {
      root.dispose(false, true);
      crumbsRoot.dispose(false, true);
      woodMat.dispose();
      bandMat.dispose();
      strawMat.dispose();
      crumbMat.dispose();
    },
  };
}
