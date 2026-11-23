import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticePose } from '../emulation/practicePose';
import type { RollingActors } from '../emulation/rollingActors';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { practiceWorldPoint } from '../game/modern/practiceProjection';
import { updateWormPose, type WormPose } from '../game/modern/wormPose';
import { createRollingActor } from './createRollingActor';
import { createWorm } from './createWorm';

function createAcidPool(
  scene: Scene,
  name: string,
  outerPaint: StandardMaterial,
  corePaint: StandardMaterial,
) {
  const root = new TransformNode(name, scene);
  // Two-lobe gelatinous amoeba: front pseudopod + trailing rear lobe that stretches during moves.
  const lead = CreateCylinder(
    `${name}-outer`,
    { diameter: 1.35, height: 0.08, tessellation: 14 },
    scene,
  );
  lead.parent = root;
  lead.position.y = 0.04;
  lead.material = outerPaint;
  const trail = CreateCylinder(
    `${name}-trail`,
    { diameter: 1.15, height: 0.075, tessellation: 14 },
    scene,
  );
  trail.parent = root;
  trail.position.y = 0.038;
  trail.material = outerPaint;
  const core = CreateCylinder(
    `${name}-core`,
    { diameter: 0.78, height: 0.13, tessellation: 12 },
    scene,
  );
  core.parent = root;
  core.position.y = 0.065;
  core.material = corePaint;
  root.setEnabled(false);
  return { root, lead, trail, core };
}

export function createIntermediateActors(
  scene: Scene,
  terrain: PracticeTerrain,
  library: RollingActors,
) {
  const black = createRollingActor(scene, 'arcade-actor-0', library);
  const worms = Array.from({ length: 4 }, (_, i) =>
    createWorm(scene, 'arcade-worm-' + (i + 1)),
  );
  const hasAmoebaMesh = Boolean(library.models['amoeba_stretch']);
  const amoebaActors = hasAmoebaMesh
    ? Array.from({ length: 8 }, (_, i) =>
        createRollingActor(scene, `arcade-amoeba-${i}`, library),
      )
    : [];
  const amoebaPoseCount = library.models['amoeba_stretch']?.poses.length ?? 12;
  const acidOuter = new StandardMaterial('arcade-acid-outer', scene);
  acidOuter.diffuseColor.set(0.04, 0.54, 0.08);
  acidOuter.emissiveColor.set(0.02, 0.16, 0.03);
  acidOuter.specularColor.set(0.18, 0.45, 0.16);
  acidOuter.alpha = 0.62;
  acidOuter.disableDepthWrite = true;
  const acidCore = new StandardMaterial('arcade-acid-core', scene);
  acidCore.diffuseColor.set(0.12, 0.72, 0.14);
  acidCore.emissiveColor.set(0.04, 0.24, 0.05);
  acidCore.specularColor.set(0.25, 0.55, 0.2);
  acidCore.alpha = 0.52;
  acidCore.disableDepthWrite = true;
  const acids = hasAmoebaMesh
    ? []
    : Array.from({ length: 8 }, (_, i) =>
        createAcidPool(scene, `arcade-acid-${i}`, acidOuter, acidCore),
      );
  const headings = new Float64Array(4);
  const seen = new Uint8Array(4);
  const seenAcid = new Uint8Array(8);
  const acidInitialized = new Uint8Array(8);
  const acidPos = new Float64Array(8 * 3);
  const acidTrailPos = new Float64Array(8 * 3);
  const acidHeading = new Float64Array(8);
  const acidPhase = new Float64Array(8);
  const acidPoint = { x: 0, y: 0, z: 0 };
  const rig: WormPose = {
    tailY: 0,
    tailZ: 0,
    headY: 1,
    headX: 0,
    headZ: 0,
    arch: 0,
    heading: 0,
    mouth: 0,
    tongue: 0,
    flare: 0,
  };
  return (pose: PracticePose | null) => {
    seen.fill(0);
    seenAcid.fill(0);
    black.hide();
    const tick = (pose?.frame ?? 0) * 0.12;
    for (const actor of pose?.actors ?? []) {
      const point = practiceWorldPoint(
        actor.x,
        actor.z,
        actor.height,
        terrain.cells[0]!.length,
        terrain.cells.length,
        terrain.origin,
        6,
        0x200,
      );
      if (!point) continue;
      if (actor.kind === 'black') {
        black.update('blacky', 0, point);
        continue;
      }
      if (actor.kind === 'acid') {
        const idx = actor.id - 10;
        if (idx < 0 || idx >= 8) continue;
        seenAcid[idx] = 1;
        const o = idx * 3;
        const dx = point.x - acidPos[o]!;
        const dz = point.z - acidPos[o + 2]!;
        const dist = Math.hypot(dx, dz);
        let moved = 0;
        if (!acidInitialized[idx] || dist > 3.5) {
          acidPos[o] = acidTrailPos[o] = point.x;
          acidPos[o + 1] = acidTrailPos[o + 1] = point.y;
          acidPos[o + 2] = acidTrailPos[o + 2] = point.z;
          acidPhase[idx] = 0;
          acidInitialized[idx] = 1;
        } else {
          // Front pseudopod advances smoothly while trailing lobe catches up with organic lag.
          const maxStep = 0.11;
          const step = dist > 0.001 ? Math.min(dist, maxStep) / dist : 0;
          const mx = dx * step;
          const mz = dz * step;
          moved = Math.hypot(mx, mz);
          acidPos[o] = acidPos[o]! + mx;
          acidPos[o + 1] = acidPos[o + 1]! + (point.y - acidPos[o + 1]!) * 0.25;
          acidPos[o + 2] = acidPos[o + 2]! + mz;
          acidTrailPos[o] =
            acidTrailPos[o]! + (acidPos[o]! - acidTrailPos[o]!) * 0.1;
          acidTrailPos[o + 1] = acidPos[o + 1]!;
          acidTrailPos[o + 2] =
            acidTrailPos[o + 2]! +
            (acidPos[o + 2]! - acidTrailPos[o + 2]!) * 0.1;
          if (dist > 0.04) acidHeading[idx] = Math.atan2(dx, dz);
        }
        const heading = acidHeading[idx]!;
        const amoeba = amoebaActors[idx];
        if (amoeba) {
          // Advance stretch morph continuously over each 1-tile stride; relax to round when idle.
          if (moved > 0.004) {
            acidPhase[idx] = (acidPhase[idx]! + moved * 0.95) % 1;
          } else {
            acidPhase[idx] = acidPhase[idx]! * 0.85;
          }
          acidPoint.x = acidPos[o]!;
          acidPoint.y = acidPos[o + 1]!;
          acidPoint.z = acidPos[o + 2]!;
          amoeba.update(
            'amoeba_stretch',
            acidPhase[idx]! * amoebaPoseCount,
            acidPoint,
            heading,
            0.06,
          );
          continue;
        }
        const pool = acids[idx];
        if (!pool) continue;
        pool.root.setEnabled(true);
        const tx = acidTrailPos[o]! - acidPos[o]!;
        const tz = acidTrailPos[o + 2]! - acidPos[o + 2]!;
        const lag = Math.min(0.85, Math.hypot(tx, tz));
        const pulse = Math.sin(tick + idx * 1.1) * 0.08;
        pool.root.position.set(acidPos[o]!, acidPos[o + 1]!, acidPos[o + 2]!);
        pool.root.rotation.y = heading;
        pool.lead.scaling.set(
          1 - lag * 0.22 + pulse,
          1,
          1 + lag * 0.35 - pulse,
        );
        pool.trail.position.set(0, 0.038, -lag * 0.85);
        pool.trail.scaling.set(
          0.95 - lag * 0.18 - pulse,
          1,
          0.95 + lag * 0.28 + pulse,
        );
        pool.core.position.set(0, 0.065, -lag * 0.32);
        pool.core.scaling.set(1 - lag * 0.15, 1, 1 + lag * 0.3);
        continue;
      }
      const i = actor.id - 1,
        worm = worms[i];
      if (!worm) continue;
      seen[i] = 1;
      if (actor.heading) headings[i] = actor.heading;
      updateWormPose(
        rig,
        actor.state,
        actor.script,
        actor.scriptFrame,
        actor.phase,
        headings[i]!,
      );
      headings[i] = rig.heading;
      worm.update(rig, point);
    }
    for (const [i, worm] of worms.entries()) if (!seen[i]) worm.hide();
    for (let i = 0; i < 8; i++)
      if (!seenAcid[i]) {
        amoebaActors[i]?.hide();
        acids[i]?.root.setEnabled(false);
        acidInitialized[i] = 0;
        acidPhase[i] = 0;
      }
  };
}
