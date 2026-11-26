import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import type { PracticePose } from '../../emulation/practicePose';
import {
  isChasePracticeCamera,
  type PracticeCameraPreset,
} from '../../game/modern/practiceCameraSettings';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  practiceFinishScroll,
  practiceOpeningScroll,
} from '../../game/modern/practiceProjection';
import {
  intermediateOpeningScroll,
  type PracticeTerrain,
} from '../../game/modern/practiceTerrain';
import type { RenderQuality } from '../../game/renderQuality';
import { createCameraOcclusion } from '../../rendering/createCameraOcclusion';
import { createDizzyStars } from '../../rendering/createDizzyStars';
import { createLivePracticeCamera } from '../../rendering/createLivePracticeCamera';
import { createPracticeCatchUpLabel } from '../../rendering/createPracticeCatchUpLabel';
import { createPracticeGoalMaterial } from '../../rendering/createPracticeGoal';
import {
  createPracticeMarble,
  marbleRadius,
} from '../../rendering/createPracticeMarble';
import { createPracticeRespawn } from '../../rendering/createPracticeRespawn';
import { createPracticeStartLift } from '../../rendering/createPracticeStartLift';
import { applyPracticeShadowQuality } from '../../rendering/createPracticeSun';
import { createScoreAward } from '../../rendering/createScoreAward';
import { createTerrainStudy } from '../../rendering/createTerrainStudy';
import { REMASTER_RULES } from '../engine/physicsConstants';
import type { RemasterSnapshot } from '../engine/remasterSimulation';
import { createBroomSweep } from './createBroomSweep';

export function createRemasterScene(
  engine: AbstractEngine,
  terrain: PracticeTerrain,
) {
  const isLevel2 = terrain.level === 'intermediate';
  const scene = createTerrainStudy(engine, undefined, terrain, true);
  const camera = createLivePracticeCamera(scene, terrain);
  const occlusion = createCameraOcclusion(scene, terrain);
  const first = createPracticeMarble(scene, 'remaster-marble-1', false);
  const second = createPracticeMarble(scene, 'remaster-marble-2', true);
  const firstRespawn = createPracticeRespawn(
    scene,
    'remaster-respawn-1',
    false,
  );
  const secondRespawn = createPracticeRespawn(
    scene,
    'remaster-respawn-2',
    true,
  );
  const firstCatchUp = createPracticeCatchUpLabel(
    scene,
    'remaster-catchup-1',
    false,
  );
  const secondCatchUp = createPracticeCatchUpLabel(
    scene,
    'remaster-catchup-2',
    true,
  );
  const firstDizzy = createDizzyStars(scene, 'remaster-dizzy-1');
  const secondDizzy = createDizzyStars(scene, 'remaster-dizzy-2');
  const firstBroom = createBroomSweep(scene, 'remaster-broom-1', false);
  const secondBroom = createBroomSweep(scene, 'remaster-broom-2', true);
  const firstAward = createScoreAward(scene, 'remaster-award-1', false);
  const secondAward = createScoreAward(scene, 'remaster-award-2', true);
  const updateStartLift = !isLevel2
    ? createPracticeStartLift(scene, terrain)
    : undefined;

  // Glossy obsidian material for Level 2+ Black Marble enemies.
  const blackMat = new StandardMaterial('remaster-black-marble-mat', scene);
  blackMat.diffuseColor.set(0.06, 0.06, 0.08);
  blackMat.specularColor.set(0.9, 0.92, 1.0);
  blackMat.specularPower = 64;
  const enemyMeshes = new Map<string, Mesh>();

  const finish =
    scene.getMeshByName('practice-finish') ??
    scene.getMeshByName('intermediate-finish');
  const goalIdle =
    finish?.material ?? createPracticeGoalMaterial(scene, 'idle', isLevel2);
  const goalBlue =
    scene.getMaterialByName('practice-goal-blue') ??
    createPracticeGoalMaterial(scene, 'blue', isLevel2);
  const goalRed =
    scene.getMaterialByName('practice-goal-red') ??
    createPracticeGoalMaterial(scene, 'red', isLevel2);

  const columns = terrain.cells[0]?.length ?? 91;
  const rows = terrain.cells.length;
  const marblePos = Vector3.Zero();
  const cameraForwardLocal = new Vector3(0, 0, 1);

  let frameCounter = 0;

  function computeArcadeScroll(worldX: number, worldZ: number): number {
    const cellX = worldX + columns / 2 + terrain.origin.x;
    const cellZ = worldZ + rows / 2 + terrain.origin.z;
    const openScroll = isLevel2
      ? intermediateOpeningScroll
      : practiceOpeningScroll;
    const endScroll = isLevel2 ? terrain.lastScroll : practiceFinishScroll;
    const raw = Math.round(
      openScroll + ((cellX + cellZ - 35) * arcadeCellUnits) / 2,
    );
    return Math.max(openScroll, Math.min(endScroll, raw));
  }

  return {
    scene,
    camera,

    setQuality(quality: RenderQuality) {
      applyPracticeShadowQuality(scene, quality);
    },

    getCameraForwardToRef(out: Vector3) {
      if (scene.activeCamera) {
        scene.activeCamera.getDirectionToRef(cameraForwardLocal, out);
      } else {
        out.set(0, 0, 1);
      }
    },

    sync(snapshot: RemasterSnapshot, dtSeconds: number) {
      frameCounter++;
      const p1 = snapshot.players[0];
      const p2 = snapshot.players[1];

      updateStartLift?.(snapshot.startLiftPhase);

      const p1Visible =
        p1 !== undefined &&
        p1.life !== 'shattered' &&
        p1.life !== 'falling' &&
        p1.life !== 'respawning';
      const p2Visible =
        p2 !== undefined &&
        p2.life !== 'shattered' &&
        p2.life !== 'falling' &&
        p2.life !== 'respawning';

      first.update(p1Visible ? p1.position : null);
      second.update(p2Visible ? p2.position : null);

      // Spiral respawn fragments (inward 45->1) or shatter burst (outward 5->45).
      const fragmentTicks = (
        life: string,
        timer: number,
      ): number | undefined => {
        if (life === 'respawning') {
          return Math.max(
            1,
            Math.min(
              45,
              Math.round((timer / REMASTER_RULES.respawnInvulnSeconds) * 45),
            ),
          );
        }
        if (life === 'shattered') {
          const progress =
            1 - Math.max(0, timer / REMASTER_RULES.shatterDurationSeconds);
          // Outward shard burst during the first 35% before the broom finishes sweeping.
          if (progress > 0.45) return undefined;
          return Math.max(
            4,
            Math.min(45, Math.round(4 + (progress / 0.45) * 41)),
          );
        }
        return undefined;
      };

      const shatterElapsed = (life: string, timer: number): number => {
        if (life !== 'shattered') return 0;
        return Math.max(
          0,
          Math.min(1, 1 - timer / REMASTER_RULES.shatterDurationSeconds),
        );
      };

      const p1Frag = p1 ? fragmentTicks(p1.life, p1.stateTimer) : undefined;
      const p2Frag = p2 ? fragmentTicks(p2.life, p2.stateTimer) : undefined;
      firstRespawn(p1Frag !== undefined && p1 ? p1.position : null, p1Frag);
      secondRespawn(p2Frag !== undefined && p2 ? p2.position : null, p2Frag);
      firstBroom.update(
        p1 && p1.life === 'shattered' ? p1.position : null,
        p1 ? shatterElapsed(p1.life, p1.stateTimer) : 0,
      );
      secondBroom.update(
        p2 && p2.life === 'shattered' ? p2.position : null,
        p2 ? shatterElapsed(p2.life, p2.stateTimer) : 0,
      );

      // Dizzy stars on hard bump or Black Marble hit.
      firstDizzy(
        p1 && p1.dizzyTimer > 0 && p1Visible ? p1.position : null,
        frameCounter,
      );
      secondDizzy(
        p2 && p2.dizzyTimer > 0 && p2Visible ? p2.position : null,
        frameCounter,
      );

      // Sync Black Marble AI enemies.
      for (const enemy of snapshot.enemies) {
        let mesh = enemyMeshes.get(enemy.id);
        if (!mesh) {
          mesh = CreateSphere(
            `remaster-enemy-${enemy.id}`,
            { diameter: marbleRadius * 2, segments: 18 },
            scene,
          );
          mesh.material = blackMat;
          enemyMeshes.set(enemy.id, mesh);
        }
        mesh.position.set(
          enemy.position.x,
          enemy.position.y + marbleRadius,
          enemy.position.z,
        );
      }

      if (finish) {
        finish.material =
          snapshot.goalOwner === 2
            ? goalRed
            : snapshot.goalOwner === 1
              ? goalBlue
              : goalIdle;
      }

      if (p1) {
        // In 2P mode follow whichever player is leading down the course.
        const leader =
          p2 && p2.position.x + p2.position.z > p1.position.x + p1.position.z
            ? p2
            : p1;
        const openScroll = isLevel2
          ? intermediateOpeningScroll
          : practiceOpeningScroll;
        const scroll =
          snapshot.phase === 'opening'
            ? openScroll
            : computeArcadeScroll(leader.position.x, leader.position.z);
        const syntheticPose: PracticePose = {
          marble: p1Visible ? 'visible' : 'hidden',
          x: (p1.position.x + columns / 2) * arcadeCellUnits,
          z: (p1.position.z + rows / 2) * arcadeCellUnits,
          height: arcadeGroundHeight,
          scroll,
          frame: frameCounter,
          ...(isLevel2 ? { level: 'intermediate' as const } : {}),
          ...(snapshot.phase === 'opening'
            ? { opening: snapshot.openingProgress }
            : {}),
          ...(p2
            ? {
                player2: {
                  marble: p2Visible ? 'visible' : 'hidden',
                  x: (p2.position.x + columns / 2) * arcadeCellUnits,
                  z: (p2.position.z + rows / 2) * arcadeCellUnits,
                  height: arcadeGroundHeight,
                },
              }
            : {}),
        };
        camera.update(syntheticPose, leader.position);

        // Floating "-5 SEC" notice on 2P catch-up.
        const swing = (timer: number) => Math.sin(timer * 18) * 6;
        firstCatchUp(
          p1.catchUpTimer > 0 ? p1.position : null,
          p1.catchUpTimer > 0 ? swing(p1.catchUpTimer) : undefined,
        );
        secondCatchUp(
          p2 && p2.catchUpTimer > 0 ? p2.position : null,
          p2 && p2.catchUpTimer > 0 ? swing(p2.catchUpTimer) : undefined,
        );

        // Floating time-bonus score award above marble on GOAL.
        firstAward(
          p1.scoreAward
            ? {
                marble: 'visible',
                x: 0,
                z: 0,
                height: 0,
                scoreAward: {
                  points: p1.scoreAward.points,
                  offset: swing(p1.scoreAward.timer),
                },
              }
            : undefined,
          p1.scoreAward ? p1.position : null,
        );
        secondAward(
          p2?.scoreAward
            ? {
                marble: 'visible',
                x: 0,
                z: 0,
                height: 0,
                scoreAward: {
                  points: p2.scoreAward.points,
                  offset: swing(p2.scoreAward.timer),
                },
              }
            : undefined,
          p2?.scoreAward ? p2.position : null,
        );

        const activePreset = camera.diagnostics.active;
        const shouldOcclude =
          activePreset !== 'opening' &&
          isChasePracticeCamera(activePreset as PracticeCameraPreset);
        marblePos.set(
          leader.position.x,
          leader.position.y + marbleRadius,
          leader.position.z,
        );
        occlusion(p1Visible ? marblePos : null, shouldOcclude, dtSeconds);
      }
    },

    dispose() {
      firstBroom.dispose();
      secondBroom.dispose();
      enemyMeshes.clear();
      scene.dispose();
    },
  };
}
