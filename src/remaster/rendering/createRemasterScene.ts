import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
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
import type { PracticeTerrain } from '../../game/modern/practiceTerrain';
import type { RenderQuality } from '../../game/renderQuality';
import { createCameraOcclusion } from '../../rendering/createCameraOcclusion';
import { createLivePracticeCamera } from '../../rendering/createLivePracticeCamera';
import { createPracticeGoalMaterial } from '../../rendering/createPracticeGoal';
import { createPracticeMarble } from '../../rendering/createPracticeMarble';
import { createPracticeRespawn } from '../../rendering/createPracticeRespawn';
import { applyPracticeShadowQuality } from '../../rendering/createPracticeSun';
import { createTerrainStudy } from '../../rendering/createTerrainStudy';
import { REMASTER_RULES } from '../engine/physicsConstants';
import type { RemasterSnapshot } from '../engine/remasterSimulation';

export function createRemasterScene(
  engine: AbstractEngine,
  terrain: PracticeTerrain,
) {
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

  const finish = scene.getMeshByName('practice-finish');
  const goalIdle =
    finish?.material ?? createPracticeGoalMaterial(scene, 'idle', false);
  const goalBlue =
    scene.getMaterialByName('practice-goal-blue') ??
    createPracticeGoalMaterial(scene, 'blue', false);
  const goalRed =
    scene.getMaterialByName('practice-goal-red') ??
    createPracticeGoalMaterial(scene, 'red', false);

  const columns = terrain.cells[0]?.length ?? 91;
  const rows = terrain.cells.length;
  const marblePos = Vector3.Zero();
  const cameraForwardLocal = new Vector3(0, 0, 1);

  // Synthetic PracticePose reused across frames (zero allocation) to drive existing camera.
  let frameCounter = 0;

  function computeArcadeScroll(worldX: number, worldZ: number): number {
    const cellX = worldX + columns / 2 + terrain.origin.x;
    const cellZ = worldZ + rows / 2 + terrain.origin.z;
    // Matches 68010 isometric scroll formula along (x + z) / 2.
    const raw = Math.round(
      practiceOpeningScroll + ((cellX + cellZ - 35) * arcadeCellUnits) / 2,
    );
    return Math.max(practiceOpeningScroll, Math.min(practiceFinishScroll, raw));
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

      const respawnTicks = (timer: number) =>
        Math.max(
          1,
          Math.min(
            45,
            Math.round((timer / REMASTER_RULES.respawnInvulnSeconds) * 45),
          ),
        );
      firstRespawn(
        p1 && p1.life === 'respawning' ? p1.position : null,
        p1 && p1.life === 'respawning'
          ? respawnTicks(p1.stateTimer)
          : undefined,
      );
      secondRespawn(
        p2 && p2.life === 'respawning' ? p2.position : null,
        p2 && p2.life === 'respawning'
          ? respawnTicks(p2.stateTimer)
          : undefined,
      );

      if (finish) {
        finish.material =
          snapshot.goalOwner === 2
            ? goalRed
            : snapshot.goalOwner === 1
              ? goalBlue
              : goalIdle;
      }

      if (p1) {
        const scroll =
          snapshot.phase === 'opening'
            ? practiceOpeningScroll
            : computeArcadeScroll(p1.position.x, p1.position.z);
        const syntheticPose: PracticePose = {
          marble: p1Visible ? 'visible' : 'hidden',
          x: (p1.position.x + columns / 2) * arcadeCellUnits,
          z: (p1.position.z + rows / 2) * arcadeCellUnits,
          height: arcadeGroundHeight,
          scroll,
          frame: frameCounter,
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
        camera.update(syntheticPose, p1.position);

        const activePreset = camera.diagnostics.active;
        const shouldOcclude =
          activePreset !== 'opening' &&
          isChasePracticeCamera(activePreset as PracticeCameraPreset);
        marblePos.set(p1.position.x, p1.position.y + 0.675, p1.position.z);
        occlusion(p1Visible ? marblePos : null, shouldOcclude, dtSeconds);
      }
    },

    dispose() {
      scene.dispose();
    },
  };
}
