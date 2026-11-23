import { level5FinishDepth } from './level5DisplayTerrain';
import { createBirdDeath } from './createBirdDeath';
import { createLevel5Actors } from './createLevel5Actors';
import { setArcadeTerrainPalette } from './arcadeTerrainPaint';
import { setLevel4Palette } from './level4PalettePaint';
import {
  setLevel4CatapultFrame,
  setLevel4HammerFrames,
  setLevel4Pistons,
  setLevel4VacuumExtensions,
} from './createLevel4Materials';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import type {
  PracticeMarblePose,
  PracticePose,
} from '../emulation/practicePose';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import {
  practiceFinishScroll,
  practiceOpeningScroll,
  practiceWorldPoint,
} from '../game/modern/practiceProjection';
import { createTerrainStudy } from './createTerrainStudy';
import { setIntermediateBridgeStep } from './createIntermediateBridge';
import { setLevel3WaveProfile } from './createLevel3Materials';
import { createPracticeGoalMaterial } from './createPracticeGoal';
import { createPracticeStartLift } from './createPracticeStartLift';
import { createLivePracticeCamera } from './createLivePracticeCamera';
import { createPracticeMarble } from './createPracticeMarble';
import { createPracticeRespawn } from './createPracticeRespawn';
import { createPracticeCatchUpLabel } from './createPracticeCatchUpLabel';
import type { RollingActors } from '../emulation/rollingActors';
import { createIntermediateActors } from './createIntermediateActors';
import { createScoreAward } from './createScoreAward';
import { createCameraOcclusion } from './createCameraOcclusion';
import { createMagicWand } from './createMagicWand';
import { createMarbleAnimation } from './createMarbleAnimation';
import { createMarbleSuction } from './createMarbleSuction';

export function createLivePracticeView(
  engine: AbstractEngine,
  terrain: PracticeTerrain,
  actors?: RollingActors,
) {
  const columns = terrain.cells[0]!.length;
  const rows = terrain.cells.length;
  const intermediate = terrain.level === 'intermediate';
  const level3 = terrain.level === 'level3';
  const level4 = terrain.level === 'level4';
  const level5 = terrain.level === 'level5';
  const extended = intermediate || level3 || level4 || level5;
  const complete = extended || terrain.lastScroll === practiceFinishScroll;
  const scene = createTerrainStudy(engine, undefined, terrain, true, actors);
  const camera = createLivePracticeCamera(scene, terrain);
  const occlusion = createCameraOcclusion(scene);
  let previousFrame: number | undefined;
  let previousPalette: PracticePose['terrainPalette'];
  const first = createPracticeMarble(scene, 'practice-player', false, actors);
  const second = createPracticeMarble(scene, 'practice-player-2', true, actors);
  const firstSuction = level4
    ? createMarbleSuction(scene, 'suction-1', false)
    : undefined;
  const secondSuction = level4
    ? createMarbleSuction(scene, 'suction-2', true)
    : undefined;
  const firstBirdDeath = level5
    ? createBirdDeath(scene, 'bird-death-1', false)
    : undefined;
  const secondBirdDeath = level5
    ? createBirdDeath(scene, 'bird-death-2', true)
    : undefined;
  const firstAnimation = actors
    ? createMarbleAnimation(scene, 'player-animation-1', actors, false)
    : undefined;
  const secondAnimation = actors
    ? createMarbleAnimation(scene, 'player-animation-2', actors, true)
    : undefined;
  const updateActors =
    extended && actors
      ? level5
        ? createLevel5Actors(scene, terrain, actors)
        : createIntermediateActors(scene, terrain, actors)
      : undefined;
  const firstScore = createScoreAward(scene, 'award-1', false);
  const secondScore = createScoreAward(scene, 'award-2', true);
  const firstWand = createMagicWand(scene, 'wand-1');
  const secondWand = createMagicWand(scene, 'wand-2');
  const firstBonus = createPracticeCatchUpLabel(
    scene,
    'practice-bonus-1',
    false,
    true,
  );
  const secondBonus = createPracticeCatchUpLabel(
    scene,
    'practice-bonus-2',
    true,
    true,
  );
  const firstBonus3 = createPracticeCatchUpLabel(
    scene,
    'practice-bonus3-1',
    false,
    '+3',
  );
  const secondBonus3 = createPracticeCatchUpLabel(
    scene,
    'practice-bonus3-2',
    true,
    '+3',
  );
  const firstRespawn = createPracticeRespawn(scene, 'practice-player', false);
  const secondRespawn = createPracticeRespawn(scene, 'practice-player-2', true);
  const firstCatchUp = createPracticeCatchUpLabel(
    scene,
    'practice-player',
    false,
  );
  const secondCatchUp = createPracticeCatchUpLabel(
    scene,
    'practice-player-2',
    true,
  );
  const generator = scene.getLightByName('key')?.getShadowGenerator();
  const shadows = generator instanceof ShadowGenerator ? generator : undefined;
  let marbleShadows = false;
  const updateStartLift = extended
    ? undefined
    : createPracticeStartLift(scene, terrain, shadows);
  const finish = scene.getMeshByName(
    level5
      ? 'level5-finish'
      : intermediate
        ? 'intermediate-finish'
        : level3
          ? 'level3-finish'
          : level4
            ? 'level4-finish'
            : 'practice-finish',
  );
  const goalIdle = scene.getMaterialByName(
    extended ? 'practice-goal-intermediate' : 'practice-goal-idle',
  );
  const goalBlue =
    scene.getMaterialByName('practice-goal-blue') ??
    createPracticeGoalMaterial(scene, 'blue', extended);
  const goalRed =
    scene.getMaterialByName('practice-goal-red') ??
    createPracticeGoalMaterial(scene, 'red', extended);

  let firstFinisher: 1 | 2 | undefined;
  function worldPosition(pose: PracticeMarblePose | undefined) {
    const arcadeView = scene.activeCamera?.name === 'practice-reference-camera';
    const depth =
      pose && level5
        ? level5FinishDepth(pose.x, pose.z, pose.height, arcadeView)
        : 0;
    return pose && (pose.marble !== 'hidden' || pose.animation !== undefined)
      ? practiceWorldPoint(
          pose.x + depth,
          pose.z + depth,
          pose.height + depth,
          columns,
          rows,
          terrain.origin,
          complete ? 6 : 0,
          extended ? 0x200 : 0x100,
        )
      : null;
  }
  function clear() {
    occlusion(null, false, 0.1);
    previousFrame = undefined;
    firstWand?.(undefined, null);
    secondWand?.(undefined, null);
    firstScore(undefined, null);
    secondScore(undefined, null);
    firstBonus(null);
    secondBonus(null);
    firstBonus3(null);
    secondBonus3(null);
    firstBirdDeath?.(undefined, null);
    secondBirdDeath?.(undefined, null);
    firstAnimation?.(undefined, null);
    secondAnimation?.(undefined, null);
    updateActors?.(null);
    updateStartLift?.(undefined);
    if (level4) {
      setLevel4VacuumExtensions(scene, undefined);
      setLevel4CatapultFrame(scene, undefined);
      setLevel4HammerFrames(scene, undefined);
      setLevel4Pistons(scene, undefined);
    }
    firstSuction?.(undefined, null);
    secondSuction?.(undefined, null);
    first.update(null);
    second.update(null);
    firstRespawn(null);
    secondRespawn(null);
    firstCatchUp(null);
    secondCatchUp(null);
    return false;
  }

  return {
    scene,
    camera,
    setMarbleShadows(enabled: boolean) {
      if (!shadows || enabled === marbleShadows) return;
      marbleShadows = enabled;
      for (const { marble } of [first, second]) {
        if (enabled) shadows.addShadowCaster(marble, false);
        else shadows.removeShadowCaster(marble, false);
      }
    },
    update(pose: PracticePose | null) {
      if (
        pose &&
        !pose.atGoal &&
        !pose.player2?.atGoal &&
        pose.goalOwner === undefined
      )
        firstFinisher = undefined;
      if (finish) {
        const owner =
          pose?.goalOwner ??
          (pose?.atGoal ? 1 : pose?.player2?.atGoal ? 2 : undefined);
        if (pose?.opening !== undefined) firstFinisher = undefined;
        firstFinisher = pose?.goalOwner ?? firstFinisher ?? owner;
        finish.material =
          firstFinisher === 2
            ? goalRed
            : firstFinisher === 1
              ? goalBlue
              : goalIdle;
      }
      if (!pose || pose.level !== terrain.level) return clear();
      const scroll =
        intermediate || level5
          ? pose.scroll
          : Math.max(
              practiceOpeningScroll,
              Math.min(terrain.lastScroll, pose.scroll),
            );
      if (!complete && scroll !== pose.scroll) return clear();

      const firstPoint = worldPosition(pose);
      const secondPoint = worldPosition(pose.player2);
      const firstPosition = pose.marble === 'visible' ? firstPoint : null;
      const secondPosition =
        pose.player2?.marble === 'visible' ? secondPoint : null;
      if (
        !complete &&
        !pose.player2 &&
        pose.marble === 'visible' &&
        !firstPosition
      )
        return clear();

      updateStartLift?.(pose.startLift);
      if (intermediate) setIntermediateBridgeStep(scene, pose.bridgeStep ?? 0);
      if (level3) setLevel3WaveProfile(scene, pose.waveProfile);
      if (pose.terrainPalette !== previousPalette) {
        if (level4) setLevel4Palette(scene, pose.terrainPalette);
        else setArcadeTerrainPalette(scene, pose.terrainPalette);
        previousPalette = pose.terrainPalette;
      }
      if (level4) {
        setLevel4VacuumExtensions(
          scene,
          pose.vacuumExtensions,
          pose.vacuumMouthFrames,
        );
        setLevel4CatapultFrame(scene, pose.catapultFrame);
        setLevel4HammerFrames(scene, pose.hammerFrames);
        setLevel4Pistons(scene, pose.pistons);
      }
      camera.update(
        scroll === pose.scroll ? pose : { ...pose, scroll },
        firstPosition ?? secondPosition,
      );
      const seconds =
        pose.frame !== undefined && previousFrame !== undefined
          ? Math.max(0, pose.frame - previousFrame) / 60
          : 1 / 60;
      previousFrame = pose.frame;
      occlusion(
        firstPosition ?? secondPosition ?? firstPoint ?? secondPoint,
        camera.diagnostics.active === 'chase',
        seconds,
      );
      const animatedFirst = firstAnimation?.(pose, firstPoint);
      const animatedSecond = secondAnimation?.(pose.player2, secondPoint);
      const suctionFirst = firstSuction?.(pose.suction, firstPoint);
      const suctionSecond = secondSuction?.(pose.player2?.suction, secondPoint);
      const birdFirst = firstBirdDeath?.(pose.birdDeath, firstPoint);
      const birdSecond = secondBirdDeath?.(
        pose.player2?.birdDeath,
        secondPoint,
      );
      first.update(
        animatedFirst || suctionFirst || birdFirst ? null : firstPosition,
      );
      second.update(
        animatedSecond || suctionSecond || birdSecond ? null : secondPosition,
      );
      first.marble.scaling.y = pose.magic?.stretch ?? 1;
      second.marble.scaling.y = pose.player2?.magic?.stretch ?? 1;
      firstWand?.(pose, firstPoint);
      secondWand?.(pose.player2, secondPoint);
      firstScore(pose, firstPoint);
      secondScore(pose.player2, secondPoint);
      firstBonus(
        pose.timeBonusSeconds === 3 ? null : firstPoint,
        pose.timeBonusSeconds === 3 ? undefined : pose.timeBonusOffset,
      );
      firstBonus3(
        pose.timeBonusSeconds === 3 ? firstPoint : null,
        pose.timeBonusSeconds === 3 ? pose.timeBonusOffset : undefined,
      );
      secondBonus(
        pose.player2?.timeBonusSeconds === 3 ? null : secondPoint,
        pose.player2?.timeBonusSeconds === 3
          ? undefined
          : pose.player2?.timeBonusOffset,
      );
      secondBonus3(
        pose.player2?.timeBonusSeconds === 3 ? secondPoint : null,
        pose.player2?.timeBonusSeconds === 3
          ? pose.player2?.timeBonusOffset
          : undefined,
      );
      updateActors?.(pose);
      firstRespawn(firstPoint, pose.respawnTicks);
      secondRespawn(secondPoint, pose.player2?.respawnTicks);
      firstCatchUp(firstPosition, pose.catchUpOffset);
      secondCatchUp(secondPosition, pose.player2?.catchUpOffset);
      return true;
    },
  };
}
