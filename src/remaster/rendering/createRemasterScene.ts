import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { CreateCylinder } from '@babylonjs/core/Meshes/Builders/cylinderBuilder';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import type { Mesh } from '@babylonjs/core/Meshes/mesh';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import type { PracticePose } from '../../emulation/practicePose';
import type { RollingActors } from '../../emulation/rollingActors';
import {
  isChasePracticeCamera,
  type PracticeCameraPreset,
} from '../../game/modern/practiceCameraSettings';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
  practiceFinishScroll,
  practiceOpeningScroll,
  projectPracticePoint,
} from '../../game/modern/practiceProjection';
import {
  intermediateOpeningScroll,
  level3OpeningScroll,
  level4OpeningScroll,
  level5FinishScroll,
  level5OpeningScroll,
  type PracticeTerrain,
} from '../../game/modern/practiceTerrain';
import type { RenderQuality } from '../../game/renderQuality';
import { createAcidDissolve } from '../../rendering/createAcidDissolve';
import { createBirdDeath } from '../../rendering/createBirdDeath';
import { createCameraOcclusion } from '../../rendering/createCameraOcclusion';
import { createMarbleSuction } from '../../rendering/createMarbleSuction';
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
import { createWorm } from '../../rendering/createWorm';
import {
  updateWormPose,
  type WormPose as RenderWormPose,
} from '../../game/modern/wormPose';
import { WORM_SCRIPT_ADDRESS } from '../level2/greenWorms/wormRomData';
import { setIntermediateBridgeStep } from '../../rendering/createIntermediateBridge';
import { setLevel3WaveProfile } from '../../rendering/createLevel3Materials';
import {
  setLevel4CatapultFrame,
  setLevel4HammerFrames,
  setLevel4Pistons,
  setLevel4VacuumExtensions,
} from '../../rendering/createLevel4Materials';
import { createLevel5Actors } from '../../rendering/createLevel5Actors';
import { updateLevel5PipeAnimation } from '../../rendering/createLevel5Terrain';
import { level5FinishDepth } from '../../rendering/level5DisplayTerrain';
import { sampleLayerHeight } from '../levels/remasterLevel';
import { REMASTER_RULES } from '../engine/physicsConstants';
import type { RemasterSnapshot } from '../engine/remasterSimulation';
import { createBroomSweep } from './createBroomSweep';

export function createRemasterScene(
  engine: AbstractEngine,
  terrain: PracticeTerrain,
  actors?: RollingActors,
) {
  const isLevel2 = terrain.level === 'intermediate';
  const isLevel3 = terrain.level === 'level3';
  const isLevel4 = terrain.level === 'level4';
  const isLevel5 = terrain.level === 'level5';
  const scene = createTerrainStudy(engine, undefined, terrain, true, actors);
  const updateLevel5Actors =
    isLevel5 && actors ? createLevel5Actors(scene, terrain, actors) : undefined;
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
  const firstBonus3 = createPracticeCatchUpLabel(
    scene,
    'remaster-bonus3-1',
    false,
    '+3',
  );
  const secondBonus3 = createPracticeCatchUpLabel(
    scene,
    'remaster-bonus3-2',
    true,
    '+3',
  );
  const firstDizzy = createDizzyStars(scene, 'remaster-dizzy-1');
  const secondDizzy = createDizzyStars(scene, 'remaster-dizzy-2');
  const firstBroom = createBroomSweep(scene, 'remaster-broom-1', false);
  const secondBroom = createBroomSweep(scene, 'remaster-broom-2', true);
  const firstAcid = createAcidDissolve(scene, 'remaster-acid-1', false);
  const secondAcid = createAcidDissolve(scene, 'remaster-acid-2', true);
  const firstSuction = isLevel4
    ? createMarbleSuction(scene, 'remaster-suction-1', false)
    : undefined;
  const secondSuction = isLevel4
    ? createMarbleSuction(scene, 'remaster-suction-2', true)
    : undefined;
  const firstBirdDeath = isLevel5
    ? createBirdDeath(scene, 'remaster-bird-death-1', false)
    : undefined;
  const secondBirdDeath = isLevel5
    ? createBirdDeath(scene, 'remaster-bird-death-2', true)
    : undefined;
  const firstAward = createScoreAward(scene, 'remaster-award-1', false);
  const secondAward = createScoreAward(scene, 'remaster-award-2', true);
  const updateStartLift =
    !isLevel2 && !isLevel3 && !isLevel4 && !isLevel5
      ? createPracticeStartLift(scene, terrain)
      : undefined;

  // Glossy obsidian material for Level 2+ Black Marble enemies.
  const blackMat = new StandardMaterial('remaster-black-marble-mat', scene);
  blackMat.diffuseColor.set(0.06, 0.06, 0.08);
  blackMat.specularColor.set(0.9, 0.92, 1.0);
  blackMat.specularPower = 64;
  const enemyMeshes = new Map<string, Mesh>();
  const wormVisuals = [0, 1, 2, 3].map((index) =>
    createWorm(scene, `remaster-worm-${index}`),
  );
  const wormPoses: RenderWormPose[] = [0, 1, 2, 3].map(() => ({
    tailY: 0,
    tailZ: 0,
    headY: 0,
    headX: 0,
    headZ: 0,
    arch: 0,
    heading: 0,
    mouth: 0,
    tongue: 0,
    flare: 0,
  }));

  const finish =
    scene.getMeshByName('practice-finish') ??
    scene.getMeshByName('intermediate-finish') ??
    scene.getMeshByName('level3-finish') ??
    scene.getMeshByName('level4-finish');
  const goalIdle =
    finish?.material ??
    createPracticeGoalMaterial(scene, 'idle', isLevel2 || isLevel3 || isLevel4);
  const goalBlue =
    scene.getMaterialByName('practice-goal-blue') ??
    createPracticeGoalMaterial(scene, 'blue', isLevel2 || isLevel3 || isLevel4);
  const goalRed =
    scene.getMaterialByName('practice-goal-red') ??
    createPracticeGoalMaterial(scene, 'red', isLevel2 || isLevel3 || isLevel4);

  // Level 3 translucent gelatinous acid amoebas (7 pools, two-lobe pseudopod rigs).
  const amoebaOuter = isLevel3
    ? new StandardMaterial('remaster-amoeba-outer', scene)
    : undefined;
  const amoebaCore = isLevel3
    ? new StandardMaterial('remaster-amoeba-core', scene)
    : undefined;
  if (amoebaOuter && amoebaCore) {
    amoebaOuter.diffuseColor.set(0.05, 0.58, 0.09);
    amoebaOuter.emissiveColor.set(0.02, 0.18, 0.04);
    amoebaOuter.specularColor.set(0.2, 0.5, 0.2);
    amoebaOuter.alpha = 0.66;
    amoebaOuter.disableDepthWrite = true;
    amoebaCore.diffuseColor.set(0.14, 0.78, 0.16);
    amoebaCore.emissiveColor.set(0.05, 0.28, 0.06);
    amoebaCore.specularColor.set(0.25, 0.6, 0.22);
    amoebaCore.alpha = 0.58;
    amoebaCore.disableDepthWrite = true;
  }
  const amoebaVisuals = isLevel3
    ? Array.from({ length: 7 }, (_, i) => {
        const root = new TransformNode(`remaster-amoeba-${i}`, scene);
        const lead = CreateCylinder(
          `remaster-amoeba-lead-${i}`,
          { diameter: 1.35, height: 0.09, tessellation: 14 },
          scene,
        );
        lead.parent = root;
        lead.position.y = 0.045;
        lead.material = amoebaOuter!;
        const trail = CreateCylinder(
          `remaster-amoeba-trail-${i}`,
          { diameter: 1.12, height: 0.08, tessellation: 14 },
          scene,
        );
        trail.parent = root;
        trail.position.y = 0.04;
        trail.material = amoebaOuter!;
        const core = CreateCylinder(
          `remaster-amoeba-core-${i}`,
          { diameter: 0.76, height: 0.14, tessellation: 12 },
          scene,
        );
        core.parent = root;
        core.position.y = 0.07;
        core.material = amoebaCore!;
        root.setEnabled(false);
        return { root, lead, trail, core };
      })
    : [];

  const columns = terrain.cells[0]?.length ?? 91;
  const rows = terrain.cells.length;
  const heightLayerRef = {
    id: 'scene-height',
    columns,
    rows,
    origin: terrain.origin,
    cells: terrain.cells,
    defaultSurface: 'stone' as const,
  };
  const marblePos = Vector3.Zero();
  const cameraForwardLocal = new Vector3(0, 0, 1);

  let frameCounter = 0;

  function computeArcadeScroll(
    worldX: number,
    worldY: number,
    worldZ: number,
  ): number {
    const arcadeX = (worldX + columns / 2 + terrain.origin.x) * arcadeCellUnits;
    const arcadeZ = (worldZ + rows / 2 + terrain.origin.z) * arcadeCellUnits;
    const arcadeH =
      arcadeGroundHeight + (worldY * arcadeCellUnits) / arcadeHeightScale;
    const openScroll = isLevel5
      ? level5OpeningScroll
      : isLevel4
        ? level4OpeningScroll
        : isLevel3
          ? level3OpeningScroll
          : isLevel2
            ? intermediateOpeningScroll
            : practiceOpeningScroll;
    const endScroll = isLevel5
      ? level5FinishScroll
      : isLevel4
        ? -15120
        : isLevel3
          ? -15220
          : isLevel2
            ? -15120
            : practiceFinishScroll;
    const minScroll = Math.min(openScroll, endScroll);
    const maxScroll = Math.max(openScroll, endScroll);
    // projectPracticePoint accounts for both isometric (x+z)/2 and terrain height drop.
    // Subtract 115px so the marble stays centered in the 240px viewport with lookahead below.
    const projY = projectPracticePoint(arcadeX, arcadeZ, arcadeH).y;
    const raw = Math.round(practiceOpeningScroll + projY - 115);
    return Math.max(minScroll, Math.min(maxScroll, raw));
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
        !p1.pipeHidden &&
        !p1.wormSwallowed &&
        p1.life !== 'shattered' &&
        p1.life !== 'birdDead' &&
        p1.life !== 'melting' &&
        p1.life !== 'suctioned' &&
        p1.life !== 'respawning';
      const p2Visible =
        p2 !== undefined &&
        !p2.pipeHidden &&
        !p2.wormSwallowed &&
        p2.life !== 'shattered' &&
        p2.life !== 'birdDead' &&
        p2.life !== 'melting' &&
        p2.life !== 'suctioned' &&
        p2.life !== 'respawning';

      const escherVisualPos = (player: typeof p1) => {
        if (!player) return null;
        if (!isLevel5) return player.position;
        const arcadeView = camera.diagnostics.active === 'arcade';
        const ax =
          (player.position.x + terrain.origin.x + columns / 2) *
          arcadeCellUnits;
        const az =
          (player.position.z + terrain.origin.z + rows / 2) * arcadeCellUnits;
        const ah =
          arcadeGroundHeight +
          (player.position.y * arcadeCellUnits) / arcadeHeightScale;
        const shift = level5FinishDepth(ax, az, ah, arcadeView);
        if (shift === 0) return player.position;
        const cellShift = shift / arcadeCellUnits;
        return {
          x: player.position.x + cellShift,
          y: player.position.y + cellShift * arcadeHeightScale,
          z: player.position.z + cellShift,
        };
      };
      first.update(p1Visible ? escherVisualPos(p1) : null);
      second.update(p2Visible ? escherVisualPos(p2) : null);
      if (isLevel2) setIntermediateBridgeStep(scene, snapshot.bridgePhase * 6);
      if (isLevel4 && snapshot.level4) {
        setLevel4VacuumExtensions(
          scene,
          snapshot.level4.vacuumExtensions,
          snapshot.level4.vacuumMouthFrames,
        );
        setLevel4Pistons(scene, snapshot.level4.pistons);
        setLevel4CatapultFrame(scene, snapshot.level4.catapultFrame);
        setLevel4HammerFrames(scene, snapshot.level4.hammerFrames);
      }
      if (isLevel3) {
        setLevel3WaveProfile(scene, snapshot.waveProfile);
        for (let i = 0; i < amoebaVisuals.length; i++) {
          const vis = amoebaVisuals[i]!;
          const a = snapshot.amoebas[i];
          if (!a) {
            vis.root.setEnabled(false);
            continue;
          }
          const wx = a.cellX - terrain.origin.x - columns / 2;
          const wz = a.cellZ - terrain.origin.z - rows / 2;
          const wy = sampleLayerHeight(heightLayerRef, wx, wz) ?? 0;
          const pulse = Math.sin(frameCounter * 0.12 + i * 1.1) * 0.08;
          const stretch = 0.25 + 0.2 * Math.sin(a.stridePhase * Math.PI * 2);
          vis.root.setEnabled(true);
          vis.root.position.set(wx, wy, wz);
          vis.root.rotation.y = a.heading;
          vis.lead.scaling.set(
            1 - stretch * 0.25 + pulse,
            1,
            1 + stretch * 0.38 - pulse,
          );
          vis.trail.position.set(0, 0.04, -stretch * 0.85);
          vis.trail.scaling.set(
            0.95 - stretch * 0.18 - pulse,
            1,
            0.95 + stretch * 0.3 + pulse,
          );
          vis.core.position.set(0, 0.07, -stretch * 0.3);
          vis.core.scaling.set(1 - stretch * 0.15, 1, 1 + stretch * 0.28);
        }
      }

      for (let i = 0; i < wormVisuals.length; i++) {
        const worm = snapshot.worms[i];
        const visual = wormVisuals[i]!;
        if (!worm || !worm.active) {
          visual.hide();
          continue;
        }
        updateWormPose(
          wormPoses[i]!,
          worm.state,
          WORM_SCRIPT_ADDRESS[worm.script],
          worm.frame,
          worm.phase,
          worm.heading,
        );
        visual.update(wormPoses[i]!, {
          x: worm.x / arcadeCellUnits - terrain.origin.x - columns / 2,
          y:
            ((worm.height - arcadeGroundHeight) * arcadeHeightScale) /
            arcadeCellUnits,
          z: worm.z / arcadeCellUnits - terrain.origin.z - rows / 2,
        });
      }

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
      const birdDeathFor = (player: typeof p1) => {
        if (!player || player.life !== 'birdDead') return undefined;
        const progress = Math.max(0, Math.min(1, 1 - player.stateTimer / 1.2));
        // ROM state 0x0b: 8 polyhedral fragments spiral outward and scatter (NO broom sweep!)
        const radiusPx = progress * 34;
        const spin = progress * Math.PI * 2.2;
        return {
          progress,
          fragments: Array.from({ length: 8 }, (_, id) => {
            const angle = spin + (id * Math.PI) / 4;
            return {
              id,
              x: Math.cos(angle) * radiusPx,
              y: Math.sin(angle) * radiusPx * 0.72 - progress * 10,
            };
          }),
        };
      };
      firstBirdDeath?.(birdDeathFor(p1), p1 ? p1.position : null);
      secondBirdDeath?.(birdDeathFor(p2), p2 ? p2.position : null);
      const meltElapsed = (life: string, timer: number): number =>
        life === 'melting' ? Math.max(0, Math.min(1, 1 - timer / 1.15)) : 0;
      firstAcid(
        p1 && p1.life === 'melting' ? p1.position : null,
        p1 ? meltElapsed(p1.life, p1.stateTimer) : 0,
      );
      secondAcid(
        p2 && p2.life === 'melting' ? p2.position : null,
        p2 ? meltElapsed(p2.life, p2.stateTimer) : 0,
      );
      firstSuction?.(
        p1 && p1.life === 'suctioned'
          ? {
              progress: Math.max(0, Math.min(1, 1 - p1.stateTimer / 0.95)),
              ...(p1.suctionVacuumIndex !== undefined
                ? { vacuumIndex: p1.suctionVacuumIndex }
                : {}),
            }
          : undefined,
        p1 && p1.life === 'suctioned' ? p1.position : null,
      );
      secondSuction?.(
        p2 && p2.life === 'suctioned'
          ? {
              progress: Math.max(0, Math.min(1, 1 - p2.stateTimer / 0.95)),
              ...(p2.suctionVacuumIndex !== undefined
                ? { vacuumIndex: p2.suctionVacuumIndex }
                : {}),
            }
          : undefined,
        p2 && p2.life === 'suctioned' ? p2.position : null,
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

      // Sync Black Marble AI enemies (hide any eliminated enemy that fell off the course).
      const activeEnemyIds = new Set<string>();
      for (const enemy of snapshot.enemies) {
        activeEnemyIds.add(enemy.id);
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
        mesh.setEnabled(true);
        mesh.position.set(
          enemy.position.x,
          enemy.position.y + marbleRadius,
          enemy.position.z,
        );
      }
      for (const [id, mesh] of enemyMeshes) {
        if (!activeEnemyIds.has(id)) mesh.setEnabled(false);
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
        // In 2P mode follow whichever player is leading along the course direction.
        const dir = isLevel5 ? -1 : 1;
        const leader =
          p2 &&
          (p2.position.x + p2.position.z) * dir >
            (p1.position.x + p1.position.z) * dir
            ? p2
            : p1;
        const openScroll = isLevel5
          ? level5OpeningScroll
          : isLevel4
            ? level4OpeningScroll
            : isLevel3
              ? level3OpeningScroll
              : isLevel2
                ? intermediateOpeningScroll
                : practiceOpeningScroll;
        // Freeze camera scroll at lastSafe while falling so the marble visibly
        // plummets off the bottom edge of the screen (matches original arcade).
        const camAnchor =
          leader.life === 'falling' ? leader.lastSafe : leader.position;
        const scroll =
          snapshot.phase === 'opening'
            ? openScroll
            : computeArcadeScroll(camAnchor.x, camAnchor.y, camAnchor.z);
        const syntheticPose: PracticePose = {
          marble: p1Visible ? 'visible' : 'hidden',
          x: (p1.position.x + columns / 2) * arcadeCellUnits,
          z: (p1.position.z + rows / 2) * arcadeCellUnits,
          height: arcadeGroundHeight,
          scroll,
          frame: frameCounter,
          ...(isLevel5
            ? {
                level: 'level5' as const,
                level5Actors: snapshot.level5Actors,
              }
            : isLevel4
              ? { level: 'level4' as const }
              : isLevel3
                ? { level: 'level3' as const }
                : isLevel2
                  ? { level: 'intermediate' as const }
                  : {}),
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
        if (isLevel5 && updateLevel5Actors) {
          updateLevel5Actors(syntheticPose);
        }
        if (isLevel5) {
          updateLevel5PipeAnimation(
            scene,
            Boolean(p1.pipeHidden || p2?.pipeHidden),
            dtSeconds,
          );
        }
        camera.update(syntheticPose, leader.position);

        // Floating "-5 SEC" catch-up and "+3 SEC" mini-enemy bonus notices.
        const swing = (timer: number) => Math.sin(timer * 18) * 6;
        firstCatchUp(
          p1.catchUpTimer > 0 ? p1.position : null,
          p1.catchUpTimer > 0 ? swing(p1.catchUpTimer) : undefined,
        );
        secondCatchUp(
          p2 && p2.catchUpTimer > 0 ? p2.position : null,
          p2 && p2.catchUpTimer > 0 ? swing(p2.catchUpTimer) : undefined,
        );
        firstBonus3(
          p1.timeBonusTimer > 0 ? p1.position : null,
          p1.timeBonusTimer > 0 ? swing(p1.timeBonusTimer) : undefined,
        );
        secondBonus3(
          p2 && p2.timeBonusTimer > 0 ? p2.position : null,
          p2 && p2.timeBonusTimer > 0 ? swing(p2.timeBonusTimer) : undefined,
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
