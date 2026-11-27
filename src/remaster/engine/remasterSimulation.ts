import {
  isInsideGoal,
  sampleLayerHeight,
  sampleSurfaceAt,
  type RemasterLevelV1,
  type RemasterSurfaceKind,
  type Vec3,
} from '../levels/remasterLevel';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../../game/modern/practiceProjection';
import {
  level3OpeningScroll,
  level6OpeningScroll,
} from '../../game/modern/practiceTerrain';
import { bridgeState } from '../level2/bridgeCycle';
import {
  decideBridgeCrossing,
  LEVEL2_BRIDGE_FOOTPRINT,
} from '../level2/bridgeCrossing';
import {
  beginPipeTraversal,
  pipeTraversalAt,
  probePipeEntry,
  type PipeTraversal,
} from '../level2/pipeTeleport';
import {
  arcadeToWorld as romArcadeToWorld,
  worldToArcade as romWorldToArcade,
} from '../level2/romUnits';
import {
  bumpEnemyMarble,
  createEnemyMarbleState,
  stepEnemyMarble,
  type EnemyPlayerView,
  type EnemyMarbleState,
} from '../level2/blackMarbleController';
import {
  LEVEL2_BLACK_MARBLE,
  LEVEL2_ZONE_BOUNDARIES,
  type EnemyMarbleSpec,
} from '../level2/blackMarbleRom';
import { cellOf, nextZone } from '../level2/enemyZones';
import { LEVEL3_WORM_SPAWNS } from '../level2/greenWorms/wormRomData';
import {
  arcadeScrollForPoint,
  createWormWorld,
  PlayerArcadeState,
  readWormPose,
  scrollRow,
  stepWorms,
  type WormPlayer,
  type WormPose,
  type WormWorld,
} from '../level2/greenWorms/wormSimulation';
import { REMASTER_PHYSICS, REMASTER_RULES } from './physicsConstants';
import { isIceAtWorld } from './romSurfaceZones';
import { resolveSurfaceRules, surfaceTransition } from './surfaceRules';
import {
  createLevel3Amoebas,
  probeLevel3CopperPipe,
  sampleLevel3WaveAt,
  sampleLevel3WaveProfile,
  stepLevel3Amoebas,
  touchesLevel3Amoeba,
  type Level3AmoebaSnapshot,
  type Level3AmoebaState,
} from '../level3/level3Mechanics';
import { LEVEL3_COPPER_PIPE } from '../level3/level3RomData';
import {
  evaluateLevel4HammerStrike,
  evaluateLevel4Hammers,
  evaluateLevel4PistonBump,
  evaluateLevel4Pistons,
  evaluateLevel4VacuumPull,
  evaluateLevel4Vacuums,
  isInLevel4PistonTriggerZone,
  isInsideLevel4CatapultCup,
  isNearLevel4Vacuum,
  resolveLevel4HammerSeparation,
  type Level4MechanismSnapshot,
} from '../level4/level4Mechanics';
import type { Level5Actor } from '../../emulation/level5Actors';
import {
  createLevel5ActorsState,
  isInsideLevel5EscherReturn,
  isInsideLevel5EscherTeleport,
  isInsideLevel5RedPipeEntry,
  readLevel5ActorsSnapshot,
  stepLevel5Actors,
  type Level5ActorsState,
} from '../level5/level5Mechanics';
import {
  LEVEL5_ESCHER_TELEPORT,
  LEVEL5_RED_Y_PIPE,
} from '../level5/level5RomData';
import { LEVEL4_BLACK_MARBLE, LEVEL4_CATAPULT } from '../level4/level4RomData';
import {
  computeLevel6MazePhase,
  createLevel6Amoebas,
  findNearestLevel6Respawn,
  isInsideLevel6SquarePit,
  isLevel6DynamicMazeCell,
} from '../level6/level6Mechanics';
import {
  LEVEL6_BLACK_MARBLE,
  LEVEL6_SQUARE_PIT_TELEPORT,
  LEVEL6_WORM_SPAWNS,
} from '../level6/level6RomData';

export type RemasterPhase = 'opening' | 'playing' | 'finished' | 'gameOver';
export type StartLiftPhase = 1 | 2 | 3 | 4 | 5;

export type MarbleLifeState =
  | 'active'
  | 'shattered'
  | 'birdDead'
  | 'melting'
  | 'suctioned'
  | 'falling'
  | 'respawning'
  | 'goal';

export interface PlayerInput {
  /** Normalized horizontal command in world XZ plane (-1..1). */
  readonly x: number;
  readonly z: number;
  readonly boost?: boolean;
  /** Optional responsiveness / agility multiplier from UI slider (default 1.0). */
  readonly agility?: number;
}

export interface PhysicsMarbleSnapshot {
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly grounded: boolean;
  /** Peak downward impact speed recorded during the last physics step. */
  readonly impactSpeed: number;
  /** Peak horizontal velocity change from a wall or obstacle bounce. */
  readonly wallImpactSpeed?: number;
}

/** Injectable physics backend (Havok in browser, deterministic stub in unit tests). */
export interface RemasterPhysicsBackend {
  applyPlayerForce(
    playerIndex: 0 | 1,
    fx: number,
    fz: number,
    boosting?: boolean,
    agility?: number,
  ): void;
  teleportMarble(playerIndex: 0 | 1, position: Vec3): void;
  /** Reposition a supported marble without resetting its linear velocity. */
  setMarblePosition(playerIndex: 0 | 1, position: Vec3): void;
  setMarbleVelocity?(playerIndex: 0 | 1, velocity: Vec3): void;
  setMarbleKinematic(playerIndex: 0 | 1, kinematic: boolean): void;
  setMarbleSurface?(playerIndex: 0 | 1, surface: RemasterSurfaceKind): void;
  applyEnemyForce?(enemyIndex: number, fx: number, fz: number): void;
  teleportEnemy?(enemyIndex: number, position: Vec3): void;
  setEnemyKinematic?(enemyIndex: number, kinematic: boolean): void;
  readEnemy?(enemyIndex: number): PhysicsMarbleSnapshot;
  resolveBilliardCollision?(
    playerIndex: 0 | 1,
    enemyIndex: number,
    restitution?: number,
  ): number;
  resolvePlayerBilliardCollision?(restitution?: number): number;
  setLevel6MazePhase?(phase: 0 | 1 | 2 | 3): void;
  step(dt: number): void;
  readMarble(playerIndex: 0 | 1): PhysicsMarbleSnapshot;
}

export type RemasterEvent =
  | { readonly type: 'start' }
  | {
      readonly type: 'impact';
      readonly player: 1 | 2;
      readonly intensity: number;
    }
  | {
      readonly type: 'wallBounce';
      readonly player: 1 | 2;
      readonly intensity: number;
    }
  | {
      readonly type: 'marbleClack';
      readonly player: 1 | 2;
      readonly intensity: number;
    }
  | {
      readonly type: 'pvpClack';
      readonly player: 1 | 2;
      readonly intensity: number;
    }
  | { readonly type: 'shatter'; readonly player: 1 | 2 }
  | { readonly type: 'dizzy'; readonly player: 1 | 2 }
  | { readonly type: 'fall'; readonly player: 1 | 2 }
  | { readonly type: 'respawn'; readonly player: 1 | 2 }
  | { readonly type: 'wormEat'; readonly player: 1 | 2 }
  | { readonly type: 'pipeEnter'; readonly player: 1 | 2 }
  | { readonly type: 'iceEnter'; readonly player: 1 | 2 }
  | { readonly type: 'iceLeave'; readonly player: 1 | 2 }
  | { readonly type: 'acidDissolve'; readonly player: 1 | 2 }
  | { readonly type: 'suction'; readonly player: 1 | 2 }
  | { readonly type: 'catapult'; readonly player: 1 | 2 }
  | { readonly type: 'birdDeath'; readonly player: 1 | 2 }
  | {
      readonly type: 'miniSquash';
      readonly player: 1 | 2;
      readonly kind: 'black' | 'worm' | 'acid';
    }
  | {
      readonly type: 'catchUp';
      readonly player: 1 | 2;
      readonly penaltySeconds: number;
    }
  | {
      readonly type: 'goal';
      readonly player: 1 | 2;
      readonly timeBonus: number;
    }
  | { readonly type: 'countdownTick'; readonly remainingSeconds: number }
  | { readonly type: 'gameOver' };

export interface RemasterPlayerState {
  readonly id: 1 | 2;
  readonly life: MarbleLifeState;
  readonly position: Vec3;
  readonly velocity: Vec3;
  readonly grounded: boolean;
  readonly surface: RemasterSurfaceKind;
  readonly score: number;
  readonly remainingTime: number;
  readonly stateTimer: number;
  readonly catchUpTimer: number;
  readonly timeBonusTimer: number;
  readonly dizzyTimer: number;
  readonly scoreAward:
    { readonly points: number; readonly timer: number } | undefined;
  readonly lastSafe: Vec3;
  readonly maxProgress: number;
  readonly pipeHidden: boolean;
  readonly wormSwallowed: boolean;
  readonly suctionVacuumIndex: number | undefined;
}

export interface RemasterEnemyState {
  readonly id: string;
  readonly kind: 'blackMarble';
  readonly position: Vec3;
  readonly shattered?: boolean;
  readonly shatterTimer?: number;
}

export type RemasterWormState = WormPose;

export interface RemasterSnapshot {
  readonly phase: RemasterPhase;
  readonly openingProgress: number;
  readonly startLiftPhase: StartLiftPhase | undefined;
  readonly bridgePhase: number;
  readonly remainingTime: number;
  readonly twoPlayers: boolean;
  readonly players: readonly RemasterPlayerState[];
  readonly enemies: readonly RemasterEnemyState[];
  readonly worms: readonly RemasterWormState[];
  readonly amoebas: readonly Level3AmoebaSnapshot[];
  readonly waveProfile: readonly number[] | undefined;
  readonly level4: Level4MechanismSnapshot | undefined;
  readonly level5Actors: readonly Level5Actor[];
  readonly level6MazePhase?: 0 | 1 | 2 | 3;
  readonly bridgeStep: number;
  readonly goalOwner: 1 | 2 | undefined;
  readonly events: readonly RemasterEvent[];
}

interface MutablePlayer {
  id: 1 | 2;
  life: MarbleLifeState;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  grounded: boolean;
  surface: RemasterSurfaceKind;
  score: number;
  remainingTime: number;
  stateTimer: number;
  catchUpTimer: number;
  timeBonusTimer: number;
  dizzyTimer: number;
  scoreAward: { points: number; timer: number } | undefined;
  lastSafe: { x: number; y: number; z: number };
  maxProgress: number;
  pipeTraversal: PipeTraversal | undefined;
  pipeElapsed: number;
  pipeEntryPos: Vec3 | undefined;
  pipeExitPos: Vec3 | undefined;
  level3PipeActive: boolean;
  level5PipeActive: boolean;
  escherCooldown: number;
  bridgeSupported: boolean;
  waveSupported: boolean;
  airbornePeakY: number;
  airborneHorizVel: { x: number; z: number } | undefined;
  wasGrounded: boolean;
  airborneFallPlayed: boolean;
  onRomIce: boolean;
  iceGlideVel: { x: number; z: number } | undefined;
  zone: number;
  prevCell: { x: number; z: number };
  wormSwallowed: boolean;
  suctionVacuumIndex: number | undefined;
  respawnGraceTimer: number;
  catapultDwell: number;
  catapultCooldown: number;
  hazardBumpCooldown: number;
}

interface MutableEnemy {
  id: string;
  kind: 'blackMarble';
  home: { x: number; y: number; z: number };
  patrolCenter: { x: number; z: number };
  climbing: boolean;
  reachedPlateau: boolean;
  position: { x: number; y: number; z: number };
  velocity: { x: number; z: number };
  patrolRadius: number;
  patrolAngle: number;
  hitCooldown: number;
  eliminated: boolean;
  shatterTimer: number;
  airbornePeakY: number;
  wasGrounded: boolean;
  lastHitBy: 0 | 1 | undefined;
  lastHitTimer: number;
  controllerSpec: EnemyMarbleSpec | undefined;
  controllerState: EnemyMarbleState | undefined;
}

export function createRemasterSimulation(
  level: RemasterLevelV1,
  physics: RemasterPhysicsBackend,
  twoPlayers = false,
  random: () => number = Math.random,
) {
  const mainLayer = level.heightLayers[0];
  const START_LIFT_IDLE_DELAY = 2.2;
  const START_LIFT_DURATION = 1.4;
  let phase: RemasterPhase = 'opening';
  let openingElapsed = 0;
  let playElapsed = 0;
  let startIdleSeconds = 0;
  let startLiftTimer = -1;
  let pvpClackCooldown = 0;
  let remainingTime = level.timerSeconds;
  let timerFrozen = false;
  let lastWholeSecond = Math.ceil(level.timerSeconds);
  let goalOwner: 1 | 2 | undefined;

  function progressAlong(pos: Vec3): number {
    return (pos.x + pos.z) * 0.5 * level.direction;
  }

  function makePlayer(id: 1 | 2, spawn: Vec3): MutablePlayer {
    const startH = mainLayer
      ? (sampleLayerHeight(mainLayer, spawn.x, spawn.z) ?? spawn.y)
      : spawn.y;
    const pos = { x: spawn.x, y: startH, z: spawn.z };
    return {
      id,
      life: 'active',
      position: { ...pos },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      surface: sampleSurfaceAt(level, pos.x, pos.z),
      score: 0,
      remainingTime: level.timerSeconds,
      stateTimer: 0,
      catchUpTimer: 0,
      timeBonusTimer: 0,
      dizzyTimer: 0,
      scoreAward: undefined,
      lastSafe: { ...pos },
      maxProgress: progressAlong(pos),
      pipeTraversal: undefined,
      pipeElapsed: 0,
      pipeEntryPos: undefined,
      pipeExitPos: undefined,
      level3PipeActive: false,
      level5PipeActive: false,
      escherCooldown: 0,
      bridgeSupported: false,
      waveSupported: false,
      airbornePeakY: pos.y,
      airborneHorizVel: undefined,
      wasGrounded: true,
      airborneFallPlayed: false,
      onRomIce: false,
      iceGlideVel: undefined,
      zone: 0,
      prevCell: cellOf({
        x: pos.x + (mainLayer?.origin.x ?? 0) + (mainLayer?.columns ?? 0) / 2,
        z: pos.z + (mainLayer?.origin.z ?? 0) + (mainLayer?.rows ?? 0) / 2,
      }),
      wormSwallowed: false,
      suctionVacuumIndex: undefined,
      respawnGraceTimer: 0,
      catapultDwell: 0,
      catapultCooldown: 0,
      hazardBumpCooldown: 0,
    };
  }

  function makeEnemies(): MutableEnemy[] {
    return level.enemies.map((e) => {
      const h = mainLayer
        ? (sampleLayerHeight(mainLayer, e.position.x, e.position.z) ??
          e.position.y)
        : e.position.y;
      const pos = { x: e.position.x, y: h, z: e.position.z };
      // On Level 2, the Black Marble spawns on the ramp and climbs up onto the
      // upper wells plateau (x - 16, z - 4) before switching to patrol/chase.
      const isLevel2Ramp =
        level.courseIndex === 2 && e.id === 'level2-black-marble';
      const isLevel4Deck =
        level.courseIndex === 4 && e.id === 'level4-black-marble';
      const isLevel6Deck =
        level.courseIndex === 6 && e.id === 'level6-black-marble';
      const controllerSpec = isLevel2Ramp
        ? LEVEL2_BLACK_MARBLE
        : isLevel4Deck
          ? LEVEL4_BLACK_MARBLE
          : isLevel6Deck
            ? LEVEL6_BLACK_MARBLE
            : undefined;
      return {
        id: e.id,
        kind: e.kind,
        home: { ...pos },
        patrolCenter: isLevel2Ramp
          ? { x: pos.x - 16, z: pos.z - 4 }
          : { x: pos.x, z: pos.z },
        climbing: isLevel2Ramp,
        reachedPlateau: isLevel4Deck || isLevel6Deck,
        position: { ...pos },
        velocity: { x: 0, z: 0 },
        patrolRadius: e.patrolRadius,
        patrolAngle: 0,
        hitCooldown: 0,
        eliminated: false,
        shatterTimer: 0,
        airbornePeakY: pos.y,
        wasGrounded: true,
        lastHitBy: undefined,
        lastHitTimer: 0,
        controllerSpec,
        controllerState: controllerSpec ? createEnemyMarbleState() : undefined,
      };
    });
  }

  let enemies: MutableEnemy[] = makeEnemies();
  let lastWormViewRow: number | undefined;
  function makeWormWorld(): WormWorld | undefined {
    if (level.courseIndex === 2) return createWormWorld();
    if (level.courseIndex === 3) {
      return createWormWorld({ spawns: LEVEL3_WORM_SPAWNS });
    }
    if (level.courseIndex === 6) {
      return createWormWorld({ spawns: LEVEL6_WORM_SPAWNS });
    }
    return undefined;
  }

  let wormWorld: WormWorld | undefined = makeWormWorld();
  let amoebas: Level3AmoebaState[] =
    level.courseIndex === 3
      ? createLevel3Amoebas()
      : level.courseIndex === 6
        ? createLevel6Amoebas()
        : [];
  let catapultAnimElapsed = -1;
  let level4PistonsTriggered = false;
  let level4PistonElapsed = 0;
  let level4PistonPattern = 0;
  let level4HammerPattern = Math.floor(random() * 4) & 3;
  let level5State: Level5ActorsState | undefined =
    level.courseIndex === 5 ? createLevel5ActorsState(random) : undefined;
  let level6MazePhase: 0 | 1 | 2 | 3 = 0;

  const players: MutablePlayer[] = twoPlayers
    ? [makePlayer(1, level.spawns.player1), makePlayer(2, level.spawns.player2)]
    : [makePlayer(1, level.spawns.player1)];

  function placePlayersAtSpawn() {
    for (let i = 0; i < players.length; i++) {
      const p = players[i]!;
      const idx = i as 0 | 1;
      physics.setMarbleKinematic(idx, true);
      physics.teleportMarble(idx, p.position);
    }
    for (let i = 0; i < enemies.length; i++) {
      physics.setEnemyKinematic?.(i, false);
      physics.teleportEnemy?.(i, enemies[i]!.home);
    }
  }

  placePlayersAtSpawn();

  function computeStartLift(): StartLiftPhase | undefined {
    if (
      level.courseIndex !== 1 ||
      phase !== 'playing' ||
      startLiftTimer < 0 ||
      startLiftTimer >= START_LIFT_DURATION
    ) {
      return undefined;
    }
    const seq: readonly StartLiftPhase[] = [1, 2, 3, 4, 5, 5, 5, 4, 3, 2, 1];
    const idx = Math.floor((startLiftTimer / START_LIFT_DURATION) * seq.length);
    return seq[Math.max(0, Math.min(seq.length - 1, idx))];
  }

  function snapshot(events: RemasterEvent[]): RemasterSnapshot {
    const bridge = bridgeState(playElapsed);
    return {
      phase,
      openingProgress: Math.min(
        1,
        openingElapsed / REMASTER_RULES.openingDurationSeconds,
      ),
      startLiftPhase: computeStartLift(),
      bridgePhase: bridge.smoothStep / 6,
      bridgeStep: bridge.step,
      remainingTime,
      twoPlayers,
      players: players.map((p) => ({
        id: p.id,
        life: p.life,
        position: { ...p.position },
        velocity: { ...p.velocity },
        grounded: p.grounded,
        surface: p.surface,
        score: p.score,
        remainingTime: p.remainingTime,
        stateTimer: p.stateTimer,
        catchUpTimer: p.catchUpTimer,
        timeBonusTimer: p.timeBonusTimer,
        dizzyTimer: p.dizzyTimer,
        scoreAward: p.scoreAward ? { ...p.scoreAward } : undefined,
        lastSafe: { ...p.lastSafe },
        maxProgress: p.maxProgress,
        pipeHidden:
          p.pipeTraversal !== undefined ||
          p.level3PipeActive ||
          p.level5PipeActive,
        wormSwallowed: p.wormSwallowed,
        suctionVacuumIndex: p.suctionVacuumIndex,
      })),
      enemies: enemies
        .filter((e) => !e.eliminated)
        .map((e) => ({
          id: e.id,
          kind: e.kind,
          position: { ...e.position },
          ...(e.shatterTimer > 0
            ? { shattered: true, shatterTimer: e.shatterTimer }
            : {}),
        })),
      worms: wormSnapshots(),
      amoebas: amoebas.map((a) => ({
        id: a.id,
        cellX: a.cellX,
        cellZ: a.cellZ,
        heading: a.heading,
        stridePhase: a.stridePhase,
      })),
      waveProfile:
        level.courseIndex === 3
          ? sampleLevel3WaveProfile(playElapsed)
          : undefined,
      level4:
        level.courseIndex === 4
          ? (() => {
              const vac = evaluateLevel4Vacuums(playElapsed);
              const catFrame =
                catapultAnimElapsed >= 0 &&
                catapultAnimElapsed < LEVEL4_CATAPULT.animationDurationSeconds
                  ? Math.min(19, Math.floor(catapultAnimElapsed * 30))
                  : undefined;
              return {
                vacuumExtensions: vac.extensions,
                vacuumMouthFrames: vac.mouthFrames,
                pistons: level4PistonsTriggered
                  ? evaluateLevel4Pistons(
                      level4PistonElapsed,
                      level4PistonPattern,
                    )
                  : [],
                catapultFrame: catFrame,
                hammerFrames: evaluateLevel4Hammers(
                  playElapsed,
                  level4HammerPattern,
                ),
              };
            })()
          : undefined,
      level5Actors: level5State ? readLevel5ActorsSnapshot(level5State) : [],
      ...(level.courseIndex === 6 ? { level6MazePhase } : {}),
      goalOwner,
      events,
    };
  }

  function worldToArcade(position: Vec3) {
    const layer = mainLayer;
    return {
      x:
        (position.x + (layer?.columns ?? 0) / 2 + (layer?.origin.x ?? 0)) *
        arcadeCellUnits,
      z:
        (position.z + (layer?.rows ?? 0) / 2 + (layer?.origin.z ?? 0)) *
        arcadeCellUnits,
      height:
        arcadeGroundHeight + (position.y * arcadeCellUnits) / arcadeHeightScale,
    };
  }

  function arcadeToWorld(x: number, z: number, height: number) {
    const layer = mainLayer;
    return {
      x:
        x / arcadeCellUnits -
        (layer?.origin.x ?? 0) -
        (layer?.columns ?? 0) / 2,
      y: ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits,
      z: z / arcadeCellUnits - (layer?.origin.z ?? 0) - (layer?.rows ?? 0) / 2,
    };
  }

  function wormGroundHeight(x: number, z: number): number {
    const position = arcadeToWorld(x, z, arcadeGroundHeight);
    const height = mainLayer
      ? sampleLayerHeight(mainLayer, position.x, position.z)
      : null;
    return height === null
      ? arcadeGroundHeight
      : arcadeGroundHeight + (height * arcadeCellUnits) / arcadeHeightScale;
  }

  function updatePipeTraversals(dt: number, events: RemasterEvent[]) {
    if (level.courseIndex !== 2 || !mainLayer) return;
    const frame = {
      originX: mainLayer.origin.x,
      originZ: mainLayer.origin.z,
      columns: mainLayer.columns,
      rows: mainLayer.rows,
    };
    const arcadePlayers = players.map((player) => {
      const point = romWorldToArcade(player.position, frame);
      return { x: point.x, z: point.z };
    });

    for (let i = 0; i < players.length; i++) {
      const player = players[i]!;
      const idx = i as 0 | 1;
      if (player.pipeTraversal) {
        const traversal = player.pipeTraversal;
        player.pipeElapsed += dt;
        // Give the full 0x35 pipe SFX (~0.92 s) time to play and smoothly glide
        // the camera from entry to exit before releasing the marble.
        const pipeDuration = 1.05;
        const traversalFrame = pipeTraversalAt(player.pipeElapsed);
        if (!traversalFrame.released || player.pipeElapsed < pipeDuration) {
          if (player.pipeEntryPos && player.pipeExitPos) {
            const rawT = Math.min(1, player.pipeElapsed / pipeDuration);
            const t = rawT * rawT * (3 - 2 * rawT);
            player.position = {
              x:
                player.pipeEntryPos.x +
                (player.pipeExitPos.x - player.pipeEntryPos.x) * t,
              y:
                player.pipeEntryPos.y +
                (player.pipeExitPos.y - player.pipeEntryPos.y) * t,
              z:
                player.pipeEntryPos.z +
                (player.pipeExitPos.z - player.pipeEntryPos.z) * t,
            };
          }
          physics.setMarbleKinematic(idx, true);
          continue;
        }
        const exitPos = player.pipeExitPos ?? player.position;
        player.position = { ...exitPos };
        player.pipeTraversal = undefined;
        player.pipeElapsed = 0;
        player.pipeEntryPos = undefined;
        player.pipeExitPos = undefined;
        // Scale exit velocity (0.55x) so the marble rolls smoothly out of the
        // pipe mouth instead of rocketing across the track in Havok.
        player.velocity = {
          x: traversal.exitVelocityWorld.x * 0.55,
          y: 0,
          z: traversal.exitVelocityWorld.z * 0.55,
        };
        player.score += traversal.pipe.exitScore;
        player.scoreAward = {
          points: traversal.pipe.exitScore,
          timer: 2,
        };
        // Re-anchor at the pipe mouth before switching back to DYNAMIC so Havok
        // never injects an ANIMATED teleport velocity impulse.
        physics.teleportMarble(idx, player.position);
        physics.setMarbleKinematic(idx, false);
        physics.setMarbleVelocity?.(idx, player.velocity);
        continue;
      }

      if (player.life !== 'active') continue;
      const point = romWorldToArcade(player.position, frame);
      const probe = probePipeEntry(point);
      if (probe.kind === 'mouth') {
        // ROM 0x2a3d2: drop-pipe mouth zeroes horizontal velocity and lets gravity pull straight down.
        player.velocity.x = 0;
        player.velocity.z = 0;
        physics.setMarbleVelocity?.(idx, player.velocity);
        continue;
      }
      if (probe.kind !== 'enter') continue;
      const others = arcadePlayers.filter((_, otherIndex) => otherIndex !== i);
      const traversal = beginPipeTraversal(probe.pipe, probe.entry, others);
      // Align exit coordinates with the open 3D visual pipe mouths on main
      // (drop-pipe mouth at cell 69.0, 76.8; Y-pipe outlet at cell 83.6, 95.3).
      const exitArcade =
        traversal.pipe.id === 'drop-pipe'
          ? {
              x: (traversal.usedAlternateExit ? 68.6 : 69.0) * arcadeCellUnits,
              z: 76.8 * arcadeCellUnits,
            }
          : {
              x: 83.6 * arcadeCellUnits,
              z: (traversal.usedAlternateExit ? 94.8 : 95.3) * arcadeCellUnits,
            };
      const exitBase = romArcadeToWorld(
        {
          x: exitArcade.x,
          z: exitArcade.z,
          height: arcadeGroundHeight,
        },
        frame,
      );
      const exitHeight = sampleLayerHeight(mainLayer, exitBase.x, exitBase.z);
      const finalExit: Vec3 = {
        ...exitBase,
        y: exitHeight ?? exitBase.y,
      };
      player.pipeEntryPos = { ...player.position };
      player.pipeExitPos = finalExit;
      player.velocity = { x: 0, y: 0, z: 0 };
      player.airbornePeakY = finalExit.y;
      player.wasGrounded = true;
      player.pipeTraversal = traversal;
      player.pipeElapsed = 0;
      physics.setMarbleKinematic(idx, true);
      physics.teleportMarble(idx, finalExit);
      events.push({ type: 'pipeEnter', player: player.id });
    }
  }

  function updateBridgeCrossing(dt: number, events: RemasterEvent[]) {
    if (level.courseIndex !== 2 || !mainLayer) return;
    const frame = {
      originX: mainLayer.origin.x,
      originZ: mainLayer.origin.z,
      columns: mainLayer.columns,
      rows: mainLayer.rows,
    };
    const bridge = bridgeState(playElapsed);
    const f = LEVEL2_BRIDGE_FOOTPRINT;
    const deckLen = 4;
    const platformY = romArcadeToWorld({ x: 0, z: 0, height: 0x3f88 }, frame).y;
    const freeEdgeWorldZ = romArcadeToWorld(
      { x: 0, z: f.freeEdge * arcadeCellUnits, height: 0x3f88 },
      frame,
    ).z;
    const sinA = Math.sin(bridge.angleRadians);
    const cosA = Math.cos(bridge.angleRadians);
    const slopeAccelZ = Math.abs(REMASTER_PHYSICS.gravityY) * sinA * cosA;

    for (let i = 0; i < players.length; i++) {
      const player = players[i]!;
      if (player.life !== 'active' || player.pipeTraversal) continue;
      const idx = i as 0 | 1;
      const point = romWorldToArcade(player.position, frame);
      const cellX = point.x / arcadeCellUnits;
      const cellZ = point.z / arcadeCellUnits;
      const inLateral = cellX >= f.lateralMin && cellX < f.lateralMax;
      const inDeckSpan = cellZ >= f.freeEdge && cellZ <= f.freeEdge + deckLen;

      // 1. Approaching the free edge (z < 56) from the approach plateau:
      if (inLateral && cellZ < f.freeEdge && !player.bridgeSupported) {
        const decision = decideBridgeCrossing(
          {
            along: cellZ,
            lateral: cellX,
            heightUnits: point.height - 0x3f88,
            velocityAlong: player.velocity.z,
            radiusCells: REMASTER_PHYSICS.marbleRadius,
          },
          bridge.smoothStep,
          { footprint: f },
        );
        if (decision.kind === 'rebound') {
          // Gentle push-back when the bridge is raised or closes in front of the marble
          // (never eject violently).
          const nudgeSpeed = Math.min(
            4.2,
            Math.max(1.2, Math.abs(player.velocity.z) * 0.45),
          );
          if (Math.abs(player.velocity.z) > 2.0) {
            events.push({
              type: 'wallBounce',
              player: player.id,
              intensity: Math.min(1, Math.abs(player.velocity.z) / 12),
            });
          }
          player.position.z =
            freeEdgeWorldZ - REMASTER_PHYSICS.marbleRadius - 0.02;
          player.velocity.z = -nudgeSpeed;
          player.velocity.y = 0;
          player.airborneHorizVel = undefined;
          physics.setMarblePosition?.(idx, player.position);
          physics.setMarbleVelocity?.(idx, player.velocity);
          continue;
        }
        // Passable (step 0 or 1): support smoothly across the seam at z = 56
        if (
          decision.kind === 'traverse' &&
          cellZ + REMASTER_PHYSICS.marbleRadius >= f.freeEdge
        ) {
          player.grounded = true;
        }
        continue;
      }

      // 2. Currently on the bridge deck (x in [61, 65), z in [56, 60]):
      if (inLateral && inDeckSpan) {
        const distFromHinge = Math.max(
          0,
          Math.min(deckLen, f.freeEdge + deckLen - cellZ),
        );
        // Exact visual deck height matching createIntermediateBridge.ts (no extra +radius).
        const deckY =
          platformY + bridge.freeEdgeRiseWorld * (distFromHinge / deckLen);
        // Capture the marble if it is already supported on the deck or touching/crossing onto it.
        const canSupport =
          player.bridgeSupported ||
          (player.position.y <= deckY + 0.35 &&
            player.position.y >= platformY - 0.85);
        if (canSupport) {
          player.bridgeSupported = true;
          player.position.y = deckY;
          // Apply physical slope gravity along +Z (toward the hinge) while preserving
          // full player steering in X and Z. Zero vertical velocity so raising never hops.
          if (slopeAccelZ > 0.01) {
            player.velocity.z += slopeAccelZ * dt;
          }
          player.velocity.y = 0;
          player.grounded = true;
          physics.setMarblePosition?.(idx, player.position);
          physics.setMarbleVelocity?.(idx, player.velocity);
        }
        continue;
      }

      // 3. Just exited the bridge deck:
      if (player.bridgeSupported) {
        player.bridgeSupported = false;
        if (inLateral && cellZ < f.freeEdge) {
          // Exiting off the free edge: flat => smooth roll; raised => standard Havok jump!
          if (bridge.freeEdgeRiseWorld >= 0.05 && player.velocity.z < -0.2) {
            const rampSlope = bridge.freeEdgeRiseWorld / deckLen;
            player.velocity.y = Math.max(0, -player.velocity.z * rampSlope);
            physics.setMarbleVelocity?.(idx, player.velocity);
          } else {
            player.velocity.y = 0;
            physics.setMarbleVelocity?.(idx, player.velocity);
          }
        } else if (inLateral && cellZ > f.freeEdge + deckLen) {
          // Exiting at the hinge (always flush with platformY): seamless roll, zero jump.
          player.velocity.y = 0;
          physics.setMarbleVelocity?.(idx, player.velocity);
        }
        // Lateral exits (x < 61 or x >= 65) keep their Havok velocity and fall naturally.
      }
    }
  }

  function updateWorms(dt: number, events: RemasterEvent[]) {
    if (!wormWorld || players.length === 0) return;
    const leader = players.reduce((current, candidate) =>
      progressAlong(candidate.position) > progressAlong(current.position)
        ? candidate
        : current,
    );
    // Anchor worm scroll row to lastSafe while falling so dropping off a cliff
    // never jumps past maxRow and briefly despawns the worms before respawn.
    const wormAnchor =
      leader.life === 'falling' ? leader.lastSafe : leader.position;
    const leaderArcade = worldToArcade(wormAnchor);
    const targetRow = scrollRow(
      arcadeScrollForPoint(leaderArcade.x, leaderArcade.z, leaderArcade.height),
      level.courseIndex === 3
        ? level3OpeningScroll
        : level.courseIndex === 6
          ? level6OpeningScroll
          : undefined,
    );
    // Advance lastWormViewRow by ±1 ONLY once wormWorld.viewRow has processed the
    // previous 30 Hz tick, so 60 Hz frames never skip a worm spawn band's minRow (5 or 6).
    if (lastWormViewRow === undefined) {
      lastWormViewRow = wormWorld.viewRow;
    } else if (wormWorld.viewRow === lastWormViewRow) {
      if (targetRow > lastWormViewRow) lastWormViewRow += 1;
      else if (targetRow < lastWormViewRow) lastWormViewRow -= 1;
    }
    const viewRow = lastWormViewRow;
    const prevStates = players.map((player) =>
      player.wormSwallowed
        ? PlayerArcadeState.swallowed
        : player.dizzyTimer > 0
          ? PlayerArcadeState.stunned
          : PlayerArcadeState.normal,
    );
    const wormPlayers: WormPlayer[] = players.map((player, index) => {
      const arcade = worldToArcade(player.position);
      const previous = worldToArcade({
        ...player.position,
        x: player.position.x - player.velocity.x * dt,
        z: player.position.z - player.velocity.z * dt,
      });
      return {
        id: player.id - 1,
        active: player.life === 'active',
        x: arcade.x,
        z: arcade.z,
        height: arcade.height,
        vx: (player.velocity.x * arcadeCellUnits) / 30,
        vz: (player.velocity.z * arcadeCellUnits) / 30,
        prevX: previous.x,
        prevZ: previous.z,
        arcadeState: prevStates[index]!,
        airState: player.grounded ? 0 : 2,
      };
    });
    const wormEvents = stepWorms(wormWorld, wormPlayers, viewRow, dt, {
      groundHeight: (x, z) => wormGroundHeight(x, z),
      levelIndex: level.courseIndex - 1,
    });

    // Apply worm contact, swallow, and marbleEaten outcomes back to players and Havok.
    for (let i = 0; i < players.length; i++) {
      const player = players[i]!;
      const wp = wormPlayers[i]!;
      const idx = i as 0 | 1;
      if (player.life !== 'active') continue;

      if (wp.arcadeState === PlayerArcadeState.rebuilding) {
        // Worm finished chewing and eating the marble -> respawn nearby at lastSafe.
        player.wormSwallowed = false;
        player.life = 'respawning';
        player.stateTimer = REMASTER_RULES.respawnInvulnSeconds;
        player.position = { ...player.lastSafe };
        player.velocity = { x: 0, y: 0, z: 0 };
        physics.setMarbleKinematic(idx, true);
        physics.teleportMarble(idx, player.lastSafe);
        events.push({ type: 'respawn', player: player.id });
        continue;
      }

      if (wp.arcadeState === PlayerArcadeState.swallowed) {
        const mouthWorld = arcadeToWorld(wp.x, wp.z, wp.height);
        if (!player.wormSwallowed) {
          player.wormSwallowed = true;
          events.push({ type: 'wormEat', player: player.id });
        }
        player.position = mouthWorld;
        player.velocity = { x: 0, y: 0, z: 0 };
        physics.setMarbleKinematic(idx, true);
        physics.teleportMarble(idx, mouthWorld);
        continue;
      }

      const bumpedByWorm = wormEvents.some(
        (ev) =>
          (ev.type === 'bump' || ev.type === 'knockback') &&
          ev.player === player.id - 1,
      );
      if (bumpedByWorm || wp.arcadeState === PlayerArcadeState.stunned) {
        if (bumpedByWorm) {
          const alreadyDizzy = player.dizzyTimer > 0;
          // Re-hit resets dizzy timer to full 50 ROM ticks (1.67 s).
          player.dizzyTimer = REMASTER_RULES.dizzyDurationSeconds;
          if (!alreadyDizzy) {
            events.push({ type: 'dizzy', player: player.id });
          }
          events.push({
            type: 'marbleClack',
            player: player.id,
            intensity: 0.7,
          });
          const knockVx = (wp.vx * 30) / arcadeCellUnits;
          const knockVz = (wp.vz * 30) / arcadeCellUnits;
          if (Math.hypot(knockVx, knockVz) > 0.2) {
            player.velocity.x = knockVx;
            player.velocity.z = knockVz;
            physics.setMarbleVelocity?.(idx, player.velocity);
          } else {
            const backPos = arcadeToWorld(wp.x, wp.z, wp.height);
            player.position.x = backPos.x;
            player.position.z = backPos.z;
            player.velocity.x = -player.velocity.x * 0.4;
            player.velocity.z = -player.velocity.z * 0.4;
            physics.setMarbleVelocity?.(idx, player.velocity);
          }
        }
      }
    }
  }

  function wormSnapshots(): readonly RemasterWormState[] {
    if (!wormWorld) return [];
    return wormWorld.slots.map((slot) => {
      const pose = readWormPose(slot, {
        groundHeight: (x, z) => wormGroundHeight(x, z),
      });
      return pose;
    });
  }

  function updateLevel3Mechanics(dt: number, events: RemasterEvent[]) {
    if (level.courseIndex !== 3 || !mainLayer) return;
    amoebas = stepLevel3Amoebas(amoebas, dt);
    const frame = {
      originX: mainLayer.origin.x,
      originZ: mainLayer.origin.z,
      columns: mainLayer.columns,
      rows: mainLayer.rows,
    };

    for (let i = 0; i < players.length; i++) {
      const player = players[i]!;
      const idx = i as 0 | 1;

      if (player.level3PipeActive) {
        player.pipeElapsed += dt;
        const pipeDuration = 1.05;
        if (player.pipeElapsed < pipeDuration) {
          if (player.pipeEntryPos && player.pipeExitPos) {
            const rawT = Math.min(1, player.pipeElapsed / pipeDuration);
            const t = rawT * rawT * (3 - 2 * rawT);
            player.position = {
              x:
                player.pipeEntryPos.x +
                (player.pipeExitPos.x - player.pipeEntryPos.x) * t,
              y:
                player.pipeEntryPos.y +
                (player.pipeExitPos.y - player.pipeEntryPos.y) * t,
              z:
                player.pipeEntryPos.z +
                (player.pipeExitPos.z - player.pipeEntryPos.z) * t,
            };
          }
          physics.setMarbleKinematic(idx, true);
          continue;
        }
        const exitPos = player.pipeExitPos ?? player.position;
        player.position = { ...exitPos };
        player.level3PipeActive = false;
        player.pipeElapsed = 0;
        player.pipeEntryPos = undefined;
        player.pipeExitPos = undefined;
        player.airbornePeakY = exitPos.y;
        player.grounded = true;
        player.wasGrounded = true;
        player.velocity = {
          x: LEVEL3_COPPER_PIPE.exitVelocityWorld.x,
          y: 0,
          z: LEVEL3_COPPER_PIPE.exitVelocityWorld.z,
        };
        player.score += LEVEL3_COPPER_PIPE.exitScore;
        player.scoreAward = {
          points: LEVEL3_COPPER_PIPE.exitScore,
          timer: 2,
        };
        physics.teleportMarble(idx, player.position);
        physics.setMarbleKinematic(idx, false);
        physics.setMarbleVelocity?.(idx, player.velocity);
        continue;
      }

      if (player.life !== 'active') continue;
      const point = romWorldToArcade(player.position, frame);
      const cellX = point.x / arcadeCellUnits;
      const cellZ = point.z / arcadeCellUnits;

      // 1. Copper vertical funnel pipe (ROM 0x2a5e6)
      const pipeProbe = probeLevel3CopperPipe(point.x, point.z, point.height);
      if (pipeProbe === 'mouth') {
        player.velocity.x = 0;
        player.velocity.z = 0;
        physics.setMarbleVelocity?.(idx, player.velocity);
        continue;
      }
      if (pipeProbe === 'enter') {
        const exitBase = romArcadeToWorld(
          {
            x: LEVEL3_COPPER_PIPE.exitCell.x * arcadeCellUnits,
            z: LEVEL3_COPPER_PIPE.exitCell.z * arcadeCellUnits,
            height: arcadeGroundHeight,
          },
          frame,
        );
        const exitH = sampleLayerHeight(mainLayer, exitBase.x, exitBase.z);
        const finalExit: Vec3 = { ...exitBase, y: exitH ?? exitBase.y };
        player.pipeEntryPos = { ...player.position };
        player.pipeExitPos = finalExit;
        player.velocity = { x: 0, y: 0, z: 0 };
        player.airbornePeakY = finalExit.y;
        player.wasGrounded = true;
        player.level3PipeActive = true;
        player.pipeElapsed = 0;
        physics.setMarbleKinematic(idx, true);
        physics.teleportMarble(idx, finalExit);
        events.push({ type: 'pipeEnter', player: player.id });
        continue;
      }

      // 2. Animated turquoise wave support & traveling-crest slope surfing
      const wave = sampleLevel3WaveAt(cellX, cellZ, playElapsed);
      if (
        wave.onWave &&
        (player.waveSupported ||
          (player.position.y <= wave.surfaceY + 0.45 &&
            player.position.y >= wave.surfaceY - 2.2))
      ) {
        player.waveSupported = true;
        player.position.y = wave.surfaceY;
        player.velocity.z -=
          wave.slopeZ * Math.abs(REMASTER_PHYSICS.gravityY) * 0.55 * dt;
        player.velocity.y = 0;
        player.grounded = true;
        physics.setMarblePosition(idx, player.position);
        physics.setMarbleVelocity?.(idx, player.velocity);
        continue;
      } else if (player.waveSupported) {
        player.waveSupported = false;
        player.velocity.y = 0;
        physics.setMarbleVelocity?.(idx, player.velocity);
      }

      // 3. Acid amoeba contact -> dissolve (ROM state 9 + SFX 0x5e)
      if (player.grounded && touchesLevel3Amoeba(amoebas, cellX, cellZ)) {
        player.life = 'melting';
        player.stateTimer = 1.15;
        player.velocity = { x: 0, y: 0, z: 0 };
        physics.setMarbleKinematic(idx, true);
        events.push({ type: 'acidDissolve', player: player.id });
      }
    }
  }

  function updateLevel4Mechanics(dt: number, events: RemasterEvent[]) {
    if (level.courseIndex !== 4 || !mainLayer) return;
    if (catapultAnimElapsed >= 0) {
      catapultAnimElapsed += dt;
      if (catapultAnimElapsed >= LEVEL4_CATAPULT.animationDurationSeconds) {
        catapultAnimElapsed = -1;
      }
    }
    const vac = evaluateLevel4Vacuums(playElapsed);
    if (level4PistonsTriggered) {
      level4PistonElapsed += dt;
    }
    const pistons = level4PistonsTriggered
      ? evaluateLevel4Pistons(level4PistonElapsed, level4PistonPattern)
      : [];
    const hammers = evaluateLevel4Hammers(playElapsed, level4HammerPattern);

    for (let i = 0; i < players.length; i++) {
      const p = players[i]!;
      const idx = i as 0 | 1;
      if (p.catapultCooldown > 0) {
        p.catapultCooldown = Math.max(0, p.catapultCooldown - dt);
      }
      if (p.hazardBumpCooldown > 0) {
        p.hazardBumpCooldown = Math.max(0, p.hazardBumpCooldown - dt);
      }
      if (p.life !== 'active') continue;

      const cellX = p.position.x + mainLayer.origin.x + mainLayer.columns / 2;
      const cellZ = p.position.z + mainLayer.origin.z + mainLayer.rows / 2;

      // ROM 0x186ac (0x400760) + 0x1871a: latch pistons active and roll Bank-2 pattern (0..3).
      if (
        !level4PistonsTriggered &&
        isInLevel4PistonTriggerZone(cellX, cellZ)
      ) {
        level4PistonsTriggered = true;
        level4PistonElapsed = 0;
        level4PistonPattern = Math.floor(random() * 4) & 3;
      }

      // 1. Vacuum cleaner radial suction & capture (disabled during post-respawn grace window)
      if (p.respawnGraceTimer <= 0) {
        const pull = evaluateLevel4VacuumPull(cellX, cellZ, vac.extensions);
        if (pull.capturedBy !== undefined) {
          p.life = 'suctioned';
          p.suctionVacuumIndex = pull.capturedBy;
          p.stateTimer = 0.95;
          p.velocity = { x: 0, y: 0, z: 0 };
          physics.setMarbleKinematic(idx, true);
          events.push({ type: 'suction', player: p.id });
          continue;
        }
        if (Math.abs(pull.forceX) > 0.01 || Math.abs(pull.forceZ) > 0.01) {
          physics.applyPlayerForce(idx, pull.forceX, pull.forceZ);
        }
      }

      // 2. Red catapult at (63, 70): outer guide funnel pulls the marble into the cup,
      // then seats it cleanly for settleDwellSeconds before firing a high lofty lob.
      const distToCup = Math.hypot(
        cellX - LEVEL4_CATAPULT.cupX,
        cellZ - LEVEL4_CATAPULT.cupZ,
      );
      if (
        p.grounded &&
        p.catapultCooldown <= 0 &&
        isInsideLevel4CatapultCup(cellX, cellZ)
      ) {
        p.catapultDwell += dt;
        const cupWorldX =
          LEVEL4_CATAPULT.cupX - mainLayer.origin.x - mainLayer.columns / 2;
        const cupWorldZ =
          LEVEL4_CATAPULT.cupZ - mainLayer.origin.z - mainLayer.rows / 2;
        p.position.x = cupWorldX;
        p.position.z = cupWorldZ;
        physics.setMarblePosition(idx, p.position);
        if (p.catapultDwell < LEVEL4_CATAPULT.settleDwellSeconds) {
          p.velocity = { x: 0, y: 0, z: 0 };
          physics.setMarbleVelocity?.(idx, p.velocity);
          continue;
        }
        p.catapultDwell = 0;
        p.catapultCooldown = LEVEL4_CATAPULT.cooldownSeconds;
        catapultAnimElapsed = 0;
        p.velocity = { ...LEVEL4_CATAPULT.launchVelocityWorld };
        p.airbornePeakY = p.position.y;
        p.airborneHorizVel = { x: p.velocity.x, z: p.velocity.z };
        p.grounded = false;
        p.wasGrounded = false;
        physics.setMarbleVelocity?.(idx, p.velocity);
        events.push({ type: 'catapult', player: p.id });
        continue;
      } else if (
        p.grounded &&
        p.catapultCooldown <= 0 &&
        distToCup <= LEVEL4_CATAPULT.guideRadiusCells &&
        distToCup > 0.01
      ) {
        p.catapultDwell = 0;
        const gx = (LEVEL4_CATAPULT.cupX - cellX) / distToCup;
        const gz = (LEVEL4_CATAPULT.cupZ - cellZ) / distToCup;
        physics.applyPlayerForce(idx, gx * 28, gz * 28);
      } else {
        p.catapultDwell = 0;
      }

      // 3. Raised pistons & swinging hammers (ROM 0x2a9a2: hammer inflicts subtle bump + 2.0 s dizzy)
      if (p.grounded && p.hazardBumpCooldown <= 0) {
        const pistonBump = evaluateLevel4PistonBump(cellX, cellZ, pistons);
        if (pistonBump) {
          p.hazardBumpCooldown = 0.35;
          p.velocity.x = pistonBump.x;
          p.velocity.z = pistonBump.z;
          physics.setMarbleVelocity?.(idx, p.velocity);
          events.push({ type: 'wallBounce', player: p.id, intensity: 0.9 });
        } else {
          const hammerHit = evaluateLevel4HammerStrike(cellX, cellZ, hammers);
          if (hammerHit) {
            p.hazardBumpCooldown = 0.45;
            p.velocity.x = hammerHit.x;
            p.velocity.z = hammerHit.z;
            physics.setMarbleVelocity?.(idx, p.velocity);
            if (p.dizzyTimer <= 0) {
              events.push({ type: 'dizzy', player: p.id });
            }
            p.dizzyTimer = Math.max(p.dizzyTimer, hammerHit.dizzySeconds);
            events.push({
              type: 'marbleClack',
              player: p.id,
              intensity: 0.65,
            });
          }
        }
      }

      // 3b. ROM 0x2ab7a solid hammer separation: never let the marble clip through a visible hammer head.
      if (p.grounded) {
        const sep = resolveLevel4HammerSeparation(cellX, cellZ, hammers);
        if (sep) {
          p.position.x = sep.cellX - mainLayer.origin.x - mainLayer.columns / 2;
          p.position.z = sep.cellZ - mainLayer.origin.z - mainLayer.rows / 2;
          physics.setMarblePosition(idx, p.position);
          const vn = p.velocity.x * sep.normalX + p.velocity.z * sep.normalZ;
          if (vn < 0) {
            p.velocity.x -= vn * sep.normalX;
            p.velocity.z -= vn * sep.normalZ;
            physics.setMarbleVelocity?.(idx, p.velocity);
          }
        }
      }
    }
  }

  function updateLevel5Mechanics(dt: number, events: RemasterEvent[]) {
    if (level.courseIndex !== 5 || !level5State || !mainLayer) return;
    const frame = {
      originX: mainLayer.origin.x,
      originZ: mainLayer.origin.z,
      columns: mainLayer.columns,
      rows: mainLayer.rows,
    };

    for (let i = 0; i < players.length; i++) {
      const p = players[i]!;
      const idx = i as 0 | 1;
      if (p.escherCooldown > 0) {
        p.escherCooldown = Math.max(0, p.escherCooldown - dt);
      }

      // 1. Active traversal inside the red inverted curly Y-pipe (ROM 0x2a738)
      if (p.level5PipeActive) {
        p.pipeElapsed += dt;
        const duration = LEVEL5_RED_Y_PIPE.durationSeconds;
        if (p.pipeElapsed < duration) {
          if (p.pipeEntryPos && p.pipeExitPos) {
            const rawT = Math.min(1, p.pipeElapsed / duration);
            const t = rawT * rawT * (3 - 2 * rawT);
            p.position = {
              x: p.pipeEntryPos.x + (p.pipeExitPos.x - p.pipeEntryPos.x) * t,
              y: p.pipeEntryPos.y + (p.pipeExitPos.y - p.pipeEntryPos.y) * t,
              z: p.pipeEntryPos.z + (p.pipeExitPos.z - p.pipeEntryPos.z) * t,
            };
          }
          physics.setMarbleKinematic(idx, true);
          continue;
        }
        const exitPos = p.pipeExitPos ?? p.position;
        p.position = { ...exitPos };
        p.lastSafe = { ...exitPos, y: exitPos.y + 0.05 };
        p.level5PipeActive = false;
        p.pipeElapsed = 0;
        p.pipeEntryPos = undefined;
        p.pipeExitPos = undefined;
        p.airbornePeakY = exitPos.y;
        p.grounded = true;
        p.wasGrounded = true;
        p.velocity = { ...LEVEL5_RED_Y_PIPE.exitVelocityWorld };
        physics.teleportMarble(idx, p.position);
        physics.setMarbleKinematic(idx, false);
        physics.setMarbleVelocity?.(idx, p.velocity);
        continue;
      }

      if (p.life !== 'active') continue;
      const point = romWorldToArcade(p.position, frame);
      const cellX = point.x / arcadeCellUnits;
      const cellZ = point.z / arcadeCellUnits;

      // 2. Red inverted curly Y-pipe entry -> 50/50 random upper outlet + pipeEnter SFX
      if (isInsideLevel5RedPipeEntry(cellX, cellZ, point.height)) {
        const exitSpec = LEVEL5_RED_Y_PIPE.exits[random() < 0.5 ? 0 : 1]!;
        const exitBase = romArcadeToWorld(
          {
            x: exitSpec.x * arcadeCellUnits,
            z: exitSpec.z * arcadeCellUnits,
            height: exitSpec.height,
          },
          frame,
        );
        const exitH = sampleLayerHeight(mainLayer, exitBase.x, exitBase.z);
        const finalExit: Vec3 = { ...exitBase, y: exitH ?? exitBase.y };
        p.pipeEntryPos = { ...p.position };
        p.pipeExitPos = finalExit;
        p.velocity = { x: 0, y: 0, z: 0 };
        p.airbornePeakY = finalExit.y;
        p.wasGrounded = true;
        p.level5PipeActive = true;
        p.pipeElapsed = 0;
        physics.setMarbleKinematic(idx, true);
        physics.teleportMarble(idx, finalExit);
        events.push({ type: 'pipeEnter', player: p.id });
        continue;
      }

      // 3. Bidirectional Escher '?' teleport seam: exact (+6, +6, +48) / (-6, -6, -48) isometric ray shift
      // so screen position and arcade scroll remain 100% continuous with zero jump!
      if (p.escherCooldown <= 0) {
        const shiftDir = isInsideLevel5EscherTeleport(
          cellX,
          cellZ,
          point.height,
        )
          ? 1
          : isInsideLevel5EscherReturn(cellX, cellZ, point.height)
            ? -1
            : 0;
        if (shiftDir !== 0) {
          const { dx, dz, dh } = LEVEL5_ESCHER_TELEPORT.rayShift;
          const targetBase = romArcadeToWorld(
            {
              x: (cellX + dx * shiftDir) * arcadeCellUnits,
              z: (cellZ + dz * shiftDir) * arcadeCellUnits,
              height: point.height + dh * shiftDir,
            },
            frame,
          );
          const targetH = sampleLayerHeight(
            mainLayer,
            targetBase.x,
            targetBase.z,
          );
          // Only snap to mainLayer when it lies at the target elevation (never snap 4.9 units up
          // onto the overhanging upper H=16416 platform when returning to the lower H=16368 seam!).
          const dest: Vec3 = {
            ...targetBase,
            y:
              targetH !== null && Math.abs(targetH - targetBase.y) < 0.8
                ? targetH
                : targetBase.y,
          };
          const keepVel = { x: p.velocity.x, y: 0, z: p.velocity.z };
          p.position = { ...dest };
          p.lastSafe = { ...dest };
          p.airbornePeakY = dest.y;
          p.grounded = true;
          p.wasGrounded = true;
          p.escherCooldown = LEVEL5_ESCHER_TELEPORT.cooldownSeconds;
          physics.teleportMarble(idx, dest);
          physics.setMarbleVelocity?.(idx, keepVel);
          continue;
        }
      }
    }

    const probes = players.map((p, i) => ({
      playerIndex: i as 0 | 1,
      cellX: p.position.x + mainLayer.origin.x + mainLayer.columns / 2,
      cellZ: p.position.z + mainLayer.origin.z + mainLayer.rows / 2,
      grounded: p.grounded,
      active: p.life === 'active' && !p.level5PipeActive,
      immune: p.respawnGraceTimer > 0,
    }));
    const arenaFloorY =
      ((16238 - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
    const isArenaFloor = (cx: number, cz: number): boolean => {
      const wx = cx - mainLayer.origin.x - mainLayer.columns / 2;
      const wz = cz - mainLayer.origin.z - mainLayer.rows / 2;
      const h = sampleLayerHeight(mainLayer, wx, wz);
      return h !== null && Math.abs(h - arenaFloorY) < 0.28;
    };
    const outcome = stepLevel5Actors(
      level5State,
      probes,
      dt,
      random,
      isArenaFloor,
    );
    for (const sq of outcome.squashes) {
      const p = players[sq.playerIndex];
      if (!p) continue;
      // ROM 0x19346 (`ADDQ.W #3, $6a(A2)`): +3 seconds time bonus + 500 pts!
      p.remainingTime += sq.timeBonusSeconds;
      p.timeBonusTimer = 1.6;
      p.score += sq.score;
      events.push({ type: 'miniSquash', player: p.id, kind: sq.kind });
    }
    for (const playerIdx of outcome.birdHits) {
      const p = players[playerIdx];
      if (!p || p.life !== 'active') continue;
      // ROM state 0x0b (36 ticks = 1.2 s): special reverse 8-fragment bird death (NO broom!).
      p.life = 'birdDead';
      p.stateTimer = 36 / 30;
      physics.setMarbleKinematic(playerIdx, true);
      events.push({ type: 'birdDeath', player: p.id });
    }
  }

  function updateLevel6Mechanics(dt: number, events: RemasterEvent[]) {
    if (level.courseIndex !== 6 || !mainLayer) return;
    const nextPhase = computeLevel6MazePhase(playElapsed);
    if (nextPhase !== level6MazePhase) {
      level6MazePhase = nextPhase;
      physics.setLevel6MazePhase?.(level6MazePhase);
    }
    const frame = {
      originX: mainLayer.origin.x,
      originZ: mainLayer.origin.z,
      columns: mainLayer.columns,
      rows: mainLayer.rows,
    };
    amoebas = stepLevel3Amoebas(amoebas, dt);
    for (let i = 0; i < players.length; i++) {
      const player = players[i]!;
      const idx = i as 0 | 1;
      if (player.level5PipeActive) {
        // Reuses pipe traversal state for the 2x2 golden square pit -> golden wedge tunnel (ROM 0x2a87a).
        player.pipeElapsed += dt;
        const t = Math.min(
          1,
          player.pipeElapsed / LEVEL6_SQUARE_PIT_TELEPORT.durationSeconds,
        );
        if (player.pipeEntryPos && player.pipeExitPos) {
          player.position = {
            x:
              player.pipeEntryPos.x +
              (player.pipeExitPos.x - player.pipeEntryPos.x) * t,
            y:
              player.pipeEntryPos.y +
              (player.pipeExitPos.y - player.pipeEntryPos.y) * t,
            z:
              player.pipeEntryPos.z +
              (player.pipeExitPos.z - player.pipeEntryPos.z) * t,
          };
        }
        if (player.pipeElapsed >= LEVEL6_SQUARE_PIT_TELEPORT.durationSeconds) {
          const exitPos = player.pipeExitPos ?? player.position;
          player.level5PipeActive = false;
          player.pipeEntryPos = undefined;
          player.pipeExitPos = undefined;
          player.position = { ...exitPos };
          player.lastSafe = { ...exitPos };
          player.airbornePeakY = exitPos.y;
          player.wasGrounded = true;
          physics.setMarbleKinematic(idx, false);
          physics.teleportMarble(idx, exitPos);
          physics.setMarbleVelocity?.(
            idx,
            LEVEL6_SQUARE_PIT_TELEPORT.exitVelocityWorld,
          );
        }
        continue;
      }
      if (player.life !== 'active') continue;
      const point = romWorldToArcade(player.position, frame);
      const cellX = point.x / arcadeCellUnits;
      const cellZ = point.z / arcadeCellUnits;
      // 1. 2x2 golden square pit (tag 0x25, ROM 0x2a87a) -> shoots out of one of the 2 golden wedge tunnels!
      if (isInsideLevel6SquarePit(cellX, cellZ, point.height)) {
        const chosen =
          LEVEL6_SQUARE_PIT_TELEPORT.exits[random() < 0.5 ? 0 : 1]!;
        const exitBase = romArcadeToWorld(
          {
            x: chosen.x * arcadeCellUnits,
            z: chosen.z * arcadeCellUnits,
            height: chosen.height,
          },
          frame,
        );
        const exitH = sampleLayerHeight(mainLayer, exitBase.x, exitBase.z);
        const finalExit: Vec3 = { ...exitBase, y: exitH ?? exitBase.y };
        player.pipeEntryPos = { ...player.position };
        player.pipeExitPos = finalExit;
        player.velocity = { x: 0, y: 0, z: 0 };
        player.airbornePeakY = finalExit.y;
        player.wasGrounded = true;
        player.level5PipeActive = true;
        player.pipeElapsed = 0;
        physics.setMarbleKinematic(idx, true);
        physics.teleportMarble(idx, finalExit);
        events.push({ type: 'pipeEnter', player: player.id });
        continue;
      }
      // 2. Acid amoeba contact -> dissolve (ROM state 9 + SFX 0x5e)
      if (player.grounded && touchesLevel3Amoeba(amoebas, cellX, cellZ)) {
        player.life = 'melting';
        player.stateTimer = 1.15;
        player.velocity = { x: 0, y: 0, z: 0 };
        physics.setMarbleKinematic(idx, true);
        events.push({ type: 'acidDissolve', player: player.id });
      }
    }
  }

  return {
    skipOpening() {
      if (phase !== 'opening') return;
      openingElapsed = REMASTER_RULES.openingDurationSeconds;
      phase = 'playing';
      for (let i = 0; i < players.length; i++) {
        physics.setMarbleKinematic(i as 0 | 1, false);
      }
    },

    reset() {
      phase = 'opening';
      openingElapsed = 0;
      playElapsed = 0;
      startIdleSeconds = 0;
      startLiftTimer = -1;
      remainingTime = level.timerSeconds;
      lastWholeSecond = Math.ceil(level.timerSeconds);
      goalOwner = undefined;
      players[0] = makePlayer(1, level.spawns.player1);
      if (twoPlayers) players[1] = makePlayer(2, level.spawns.player2);
      enemies = makeEnemies();
      lastWormViewRow = undefined;
      wormWorld = makeWormWorld();
      amoebas =
        level.courseIndex === 3
          ? createLevel3Amoebas()
          : level.courseIndex === 6
            ? createLevel6Amoebas()
            : [];
      catapultAnimElapsed = -1;
      level4PistonsTriggered = false;
      level4PistonElapsed = 0;
      level4PistonPattern = 0;
      level4HammerPattern = Math.floor(random() * 4) & 3;
      level5State =
        level.courseIndex === 5 ? createLevel5ActorsState(random) : undefined;
      level6MazePhase = 0;
      physics.setLevel6MazePhase?.(0);
      placePlayersAtSpawn();
      return snapshot([]);
    },

    setTimerFrozen(frozen: boolean) {
      timerFrozen = frozen;
    },

    step(dt: number, inputs: readonly PlayerInput[]): RemasterSnapshot {
      const events: RemasterEvent[] = [];

      if (phase === 'opening') {
        openingElapsed += dt;
        if (openingElapsed >= REMASTER_RULES.openingDurationSeconds) {
          phase = 'playing';
          for (let i = 0; i < players.length; i++) {
            physics.setMarbleKinematic(i as 0 | 1, false);
          }
          events.push({ type: 'start' });
        }
        return snapshot(events);
      }

      if (phase !== 'playing') {
        return snapshot(events);
      }

      playElapsed += dt;

      // Start-lift trigger: if a marble remains idle on its start pad, raise the
      // wedge and physically push it downhill onto the course (matches arcade).
      if (startLiftTimer < 0) {
        const anyIdleAtStart = players.some((p, i) => {
          if (p.life !== 'active') return false;
          const sp = i === 0 ? level.spawns.player1 : level.spawns.player2;
          return Math.hypot(p.position.x - sp.x, p.position.z - sp.z) < 2.6;
        });
        if (anyIdleAtStart) {
          startIdleSeconds += dt;
          if (startIdleSeconds >= START_LIFT_IDLE_DELAY) {
            startLiftTimer = 0;
          }
        } else {
          startIdleSeconds = 0;
        }
      } else if (startLiftTimer < START_LIFT_DURATION) {
        startLiftTimer += dt;
        const liftStrength =
          level.courseIndex === 1
            ? (computeStartLift() ?? 0) / 5
            : Math.sin((startLiftTimer / START_LIFT_DURATION) * Math.PI);
        if (liftStrength > 0) {
          for (let i = 0; i < players.length; i++) {
            const p = players[i]!;
            if (p.life !== 'active') continue;
            const sp = i === 0 ? level.spawns.player1 : level.spawns.player2;
            if (Math.hypot(p.position.x - sp.x, p.position.z - sp.z) < 2.9) {
              if (level.courseIndex === 1) {
                physics.applyPlayerForce(
                  i as 0 | 1,
                  28 * liftStrength,
                  6 * liftStrength,
                );
              } else if (level.courseIndex === 4 && i === 0) {
                physics.applyPlayerForce(i as 0 | 1, 26 * liftStrength, 0);
              } else if (level.courseIndex === 5) {
                physics.applyPlayerForce(
                  i as 0 | 1,
                  -18 * liftStrength,
                  -18 * liftStrength,
                );
              } else {
                physics.applyPlayerForce(i as 0 | 1, 0, 26 * liftStrength);
              }
            }
          }
        }
      }

      // Advance per-player countdown timers and status notices.
      for (const p of players) {
        if (p.life !== 'goal' && !timerFrozen) {
          p.remainingTime = Math.max(0, p.remainingTime - dt);
        }
        if (p.catchUpTimer > 0) {
          p.catchUpTimer = Math.max(0, p.catchUpTimer - dt);
        }
        if (p.timeBonusTimer > 0) {
          p.timeBonusTimer = Math.max(0, p.timeBonusTimer - dt);
        }
        if (p.dizzyTimer > 0) {
          p.dizzyTimer = Math.max(0, p.dizzyTimer - dt);
        }
        if (p.respawnGraceTimer > 0) {
          p.respawnGraceTimer = Math.max(0, p.respawnGraceTimer - dt);
        }
        if (p.scoreAward) {
          p.scoreAward.timer = Math.max(0, p.scoreAward.timer - dt);
          if (p.scoreAward.timer <= 0) p.scoreAward = undefined;
        }
      }
      remainingTime = Math.max(...players.map((p) => p.remainingTime));
      const whole = Math.ceil(remainingTime);
      if (
        whole < lastWholeSecond &&
        whole > 0 &&
        whole <= REMASTER_RULES.lowTimeThresholdSeconds
      ) {
        events.push({ type: 'countdownTick', remainingSeconds: whole });
      }
      lastWholeSecond = whole;

      if (remainingTime <= 0) {
        phase = 'gameOver';
        for (let i = 0; i < players.length; i++) {
          physics.setMarbleKinematic(i as 0 | 1, true);
        }
        events.push({ type: 'gameOver' });
        return snapshot(events);
      }

      // Apply player commands to active marbles, and gentle coast-in for marbles
      // that just crossed GOAL so they roll into the middle of the pad without blocking P2.
      for (let i = 0; i < players.length; i++) {
        const p = players[i]!;
        if (p.life === 'goal') {
          if (p.stateTimer > 0) {
            p.stateTimer = Math.max(0, p.stateTimer - dt);
            const targetX =
              level.goal.minX + (level.goal.maxX - level.goal.minX) * 0.65;
            const targetZ =
              level.goal.minZ +
              (level.goal.maxZ - level.goal.minZ) * (p.id === 1 ? 0.28 : 0.72);
            const dx = targetX - p.position.x;
            const dz = targetZ - p.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.35) {
              const pull = Math.min(18, dist * 9);
              physics.applyPlayerForce(
                i as 0 | 1,
                (dx / dist) * pull,
                (dz / dist) * pull,
              );
            }
          }
          continue;
        }
        if (p.life !== 'active' || p.wormSwallowed) continue;
        const input = inputs[i];
        if (!input) continue;
        const mag = Math.hypot(input.x, input.z);
        const agility = Math.max(0.4, Math.min(1.5, input.agility ?? 1));
        const dizzyScale =
          p.dizzyTimer > 0 ? REMASTER_RULES.dizzySpeedFactor : 1;
        const onRomIce = isIceAtWorld(level, p.position.x, p.position.z);
        if (mag > 0.001) {
          const clamp = Math.min(1, mag);
          const nx = input.x / mag;
          const nz = input.z / mag;
          const boost = input.boost ? REMASTER_PHYSICS.boostMultiplier : 1;
          const effectiveAgility = input.boost ? Math.max(1, agility) : agility;
          const accel =
            REMASTER_PHYSICS.inputAcceleration *
            effectiveAgility *
            clamp *
            boost *
            dizzyScale;
          // PR #10: Arcade ice zones ignore player steering input (decoded in romSurfaceZones.ts).
          const rules = resolveSurfaceRules({
            surface: onRomIce ? 'ice' : 'normal',
            force: { x: nx * accel, z: nz * accel },
            grounded: p.grounded,
          });
          if (rules.steering) {
            physics.applyPlayerForce(
              i as 0 | 1,
              rules.force.x,
              rules.force.z,
              Boolean(input.boost),
              agility,
            );
          } else if (level.courseIndex === 4 && onRomIce && mainLayer) {
            // Level 4 crossing start beams: allow gentle rail-projected control (~42%)
            // so a 2P mid-beam collision never stalls a marble permanently on the beam.
            const cellX =
              p.position.x + mainLayer.origin.x + mainLayer.columns / 2;
            const cellZ =
              p.position.z + mainLayer.origin.z + mainLayer.rows / 2;
            const onBeamX =
              Math.floor(cellZ) === 23 && Math.floor(cellX) !== 22;
            const onBeamZ =
              Math.floor(cellX) === 22 && Math.floor(cellZ) !== 23;
            const railAccel = accel * 0.42;
            const rfx = onBeamZ ? 0 : nx * railAccel;
            const rfz = onBeamX ? 0 : nz * railAccel;
            if (Math.abs(rfx) > 0.001 || Math.abs(rfz) > 0.001) {
              physics.applyPlayerForce(
                i as 0 | 1,
                rfx,
                rfz,
                Boolean(input.boost),
                agility,
              );
            }
          }
        } else if (input.boost && !onRomIce) {
          // Holding Space while rolling (e.g. between trackpad strokes) gives a
          // forward turbo surge along the marble's current velocity vector.
          const vSpeed = Math.hypot(p.velocity.x, p.velocity.z);
          if (vSpeed > 0.8) {
            const surge =
              REMASTER_PHYSICS.inputAcceleration * agility * 1.15 * dizzyScale;
            physics.applyPlayerForce(
              i as 0 | 1,
              (p.velocity.x / vSpeed) * surge,
              (p.velocity.z / vSpeed) * surge,
              true,
              agility,
            );
          }
        }
      }

      // Step physics engine.
      physics.step(dt);

      // Update each player from physics snapshot.
      let allAtGoal = true;
      for (let i = 0; i < players.length; i++) {
        const p = players[i]!;
        const idx = i as 0 | 1;

        if (
          p.life === 'shattered' ||
          p.life === 'birdDead' ||
          p.life === 'melting' ||
          p.life === 'suctioned' ||
          p.life === 'falling'
        ) {
          allAtGoal = false;
          if (p.life === 'falling') {
            // Keep tracking the falling marble under gravity until it exits below the viewport.
            const body = physics.readMarble(idx);
            p.position = { ...body.position };
            p.velocity = { ...body.velocity };
          }
          p.stateTimer -= dt;
          if (p.stateTimer <= 0) {
            p.life = 'respawning';
            p.stateTimer = REMASTER_RULES.respawnInvulnSeconds;
            p.position = { ...p.lastSafe };
            p.velocity = { x: 0, y: 0, z: 0 };
            p.airbornePeakY = p.lastSafe.y;
            p.wasGrounded = true;
            p.onRomIce = false;
            p.iceGlideVel = undefined;
            p.suctionVacuumIndex = undefined;
            physics.setMarbleKinematic(idx, true);
            physics.teleportMarble(idx, p.lastSafe);
            events.push({ type: 'respawn', player: p.id });
          }
          continue;
        }

        if (p.life === 'respawning') {
          allAtGoal = false;
          p.stateTimer -= dt;
          if (p.stateTimer <= 0) {
            p.life = 'active';
            p.respawnGraceTimer = 1.6;
            physics.setMarbleKinematic(idx, false);
          }
          continue;
        }

        if (p.life === 'goal') {
          const body = physics.readMarble(idx);
          p.position = { ...body.position };
          p.velocity = { ...body.velocity };
          p.grounded = body.grounded;
          continue;
        }

        const body = physics.readMarble(idx);
        p.position = { ...body.position };
        p.velocity = { ...body.velocity };
        p.grounded = body.grounded;
        const nowOnIce = isIceAtWorld(level, p.position.x, p.position.z);
        const iceChange = surfaceTransition(
          p.onRomIce ? 'ice' : 'normal',
          nowOnIce ? 'ice' : 'normal',
        );
        p.onRomIce = nowOnIce;
        if (iceChange === 'enterIce') {
          const entrySpeed = Math.hypot(p.velocity.x, p.velocity.z);
          if (entrySpeed >= 3.5) {
            p.iceGlideVel = { x: p.velocity.x, z: p.velocity.z };
          } else if (entrySpeed > 0.2) {
            const scale = 5.5 / entrySpeed;
            p.iceGlideVel = {
              x: p.velocity.x * scale,
              z: p.velocity.z * scale,
            };
          } else {
            p.iceGlideVel = { x: 4.5, z: 0 };
          }
          events.push({ type: 'iceEnter', player: p.id });
        } else if (iceChange === 'leaveIce') {
          p.iceGlideVel = undefined;
          events.push({ type: 'iceLeave', player: p.id });
        }
        // Keep constant horizontal glide speed & direction ONLY on Level 2's concave ice basin
        // (so the bowl never traps or oscillates the marble, while Level 4's frictionless
        // start beams accelerate freely downhill under gravity!).
        if (
          level.courseIndex === 2 &&
          nowOnIce &&
          p.grounded &&
          p.iceGlideVel
        ) {
          if (body.wallImpactSpeed && body.wallImpactSpeed > 0.5) {
            const postSpeed = Math.hypot(p.velocity.x, p.velocity.z);
            if (postSpeed > 0.5) {
              p.iceGlideVel = { x: p.velocity.x, z: p.velocity.z };
            }
          } else if (
            Math.abs(p.velocity.x - p.iceGlideVel.x) > 0.02 ||
            Math.abs(p.velocity.z - p.iceGlideVel.z) > 0.02
          ) {
            p.velocity.x = p.iceGlideVel.x;
            p.velocity.z = p.iceGlideVel.z;
            physics.setMarbleVelocity?.(idx, p.velocity);
          }
        }
        // Keep Level 4's 1-cell-wide frictionless start beams dead straight along their rail
        // (eliminating Havok triangle-seam lateral drift) and cap downhill speed to 10.8 cells/s.
        if (level.courseIndex === 4 && nowOnIce && p.grounded && mainLayer) {
          const cellX =
            p.position.x + mainLayer.origin.x + mainLayer.columns / 2;
          const cellZ = p.position.z + mainLayer.origin.z + mainLayer.rows / 2;
          const onBeamX = Math.floor(cellZ) === 23 && Math.floor(cellX) !== 22;
          const onBeamZ = Math.floor(cellX) === 22 && Math.floor(cellZ) !== 23;
          let changed = false;
          if (onBeamX) {
            const centerWorldZ = 23.5 - mainLayer.origin.z - mainLayer.rows / 2;
            if (Math.abs(p.position.z - centerWorldZ) > 0.01) {
              p.position.z = centerWorldZ;
              physics.setMarblePosition(idx, p.position);
            }
            if (Math.abs(p.velocity.z) > 0.001) {
              p.velocity.z = 0;
              changed = true;
            }
          } else if (onBeamZ) {
            const centerWorldX =
              22.5 - mainLayer.origin.x - mainLayer.columns / 2;
            if (Math.abs(p.position.x - centerWorldX) > 0.01) {
              p.position.x = centerWorldX;
              physics.setMarblePosition(idx, p.position);
            }
            if (Math.abs(p.velocity.x) > 0.001) {
              p.velocity.x = 0;
              changed = true;
            }
          }
          const beamSpeed = Math.hypot(p.velocity.x, p.velocity.z);
          const maxBeamSpeed = 10.8;
          if (beamSpeed > maxBeamSpeed) {
            const s = maxBeamSpeed / beamSpeed;
            p.velocity.x *= s;
            p.velocity.z *= s;
            changed = true;
          }
          if (changed) {
            physics.setMarbleVelocity?.(idx, p.velocity);
          }
        }
        p.surface = nowOnIce
          ? 'ice'
          : sampleSurfaceAt(level, body.position.x, body.position.z);
        physics.setMarbleSurface?.(idx, p.surface);
      }

      // Resolve Level 2 animated drawbridge, pipes & Level 3 mechanics BEFORE void-fall checks
      // so marbles dropping down vertical pipe mouths or riding the wave are handled cleanly.
      updateBridgeCrossing(dt, events);
      updatePipeTraversals(dt, events);
      updateLevel3Mechanics(dt, events);
      updateLevel4Mechanics(dt, events);
      updateLevel5Mechanics(dt, events);
      updateLevel6Mechanics(dt, events);

      for (let i = 0; i < players.length; i++) {
        const p = players[i]!;
        const idx = i as 0 | 1;
        if (
          p.life === 'shattered' ||
          p.life === 'birdDead' ||
          p.life === 'melting' ||
          p.life === 'suctioned' ||
          p.life === 'falling' ||
          p.life === 'respawning' ||
          p.life === 'goal' ||
          p.pipeTraversal !== undefined ||
          p.level3PipeActive ||
          p.level5PipeActive
        ) {
          if (p.life !== 'goal') allAtGoal = false;
          continue;
        }
        const body = physics.readMarble(idx);

        // Track Level 2 ROM zone transitions for Black Marble aggression gating.
        if (level.courseIndex === 2 && mainLayer) {
          const currCell = cellOf({
            x: p.position.x + mainLayer.origin.x + mainLayer.columns / 2,
            z: p.position.z + mainLayer.origin.z + mainLayer.rows / 2,
          });
          p.zone = nextZone(
            LEVEL2_ZONE_BOUNDARIES,
            p.zone,
            p.prevCell,
            currCell,
          );
          p.prevCell = currCell;
        }

        // Forward progress scoring.
        const along = progressAlong(body.position);
        if (along > p.maxProgress + 1) {
          const gained = Math.floor(along - p.maxProgress);
          p.maxProgress += gained;
          p.score += gained * REMASTER_RULES.progressPointsPerCell;
        }

        // Detect Level 2 & Level 3 pipe mouths early so neither airborne fall whistle nor void-fall fires inside a pipe.
        const pipeFrame = mainLayer
          ? {
              originX: mainLayer.origin.x,
              originZ: mainLayer.origin.z,
              columns: mainLayer.columns,
              rows: mainLayer.rows,
            }
          : undefined;
        const inPipeMouth =
          (level.courseIndex === 2 &&
            pipeFrame !== undefined &&
            (p.pipeTraversal !== undefined ||
              probePipeEntry(romWorldToArcade(p.position, pipeFrame)).kind !==
                'none')) ||
          (level.courseIndex === 3 &&
            pipeFrame !== undefined &&
            (p.level3PipeActive ||
              (() => {
                const pt = romWorldToArcade(p.position, pipeFrame);
                return probeLevel3CopperPipe(pt.x, pt.z, pt.height) !== 'none';
              })()));

        // Track airborne peak height so drops > 3 cells shatter and drops < 3 cells dizzy.
        const justLanded = !p.wasGrounded && p.grounded;
        const dropY = Math.max(0, p.airbornePeakY - p.position.y);
        const currentGround = mainLayer
          ? sampleLayerHeight(mainLayer, p.position.x, p.position.z)
          : 0;
        const heightAboveGround =
          currentGround === null ? Infinity : p.position.y - currentGround;
        if (!p.grounded) {
          p.airbornePeakY = Math.max(p.airbornePeakY, p.position.y);
          p.airborneHorizVel = { x: p.velocity.x, z: p.velocity.z };
          // ROM 0x12482: trigger fall whistle (0x45) immediately at take-off when ground
          // drops > 8 arcade units (~0.75 world units) below the marble so its 233 ms
          // YM2151 attack ramps up before shatter or dizzy landing.
          if (
            !p.airborneFallPlayed &&
            !p.bridgeSupported &&
            !inPipeMouth &&
            (heightAboveGround > 0.75 || (dropY > 0.25 && p.velocity.y < -1.0))
          ) {
            p.airborneFallPlayed = true;
            events.push({ type: 'fall', player: p.id });
          }
        } else {
          // Preserve horizontal jump momentum across touchdown (matches 68010 where
          // vertical landing never applies a Coulomb friction brake to horizontal velocity,
          // so jumps off the Level 4 suspension bridge require active counter-spin to stop).
          if (
            justLanded &&
            p.airborneHorizVel &&
            !p.bridgeSupported &&
            !(body.wallImpactSpeed && body.wallImpactSpeed > 0) &&
            p.velocity.x * p.airborneHorizVel.x +
              p.velocity.z * p.airborneHorizVel.z >=
              0
          ) {
            const prevSpeed = Math.hypot(
              p.airborneHorizVel.x,
              p.airborneHorizVel.z,
            );
            const currSpeed = Math.hypot(p.velocity.x, p.velocity.z);
            if (prevSpeed > 1.5 && currSpeed < prevSpeed * 0.92) {
              p.velocity.x = p.airborneHorizVel.x;
              p.velocity.z = p.airborneHorizVel.z;
              physics.setMarbleVelocity?.(idx, p.velocity);
            }
          }
          p.airborneHorizVel = undefined;
          p.airbornePeakY = p.position.y;
          p.airborneFallPlayed = false;
        }
        p.wasGrounded = p.grounded;

        // Save safe grounded checkpoint ONLY on controllable, non-ice, non-acid solid stone
        // with a 0.5-cell flat solid margin — NEVER on a shattering or hard-drop landing frame
        // so respawns always happen at the exact elevation where the fall started!
        if (
          body.grounded &&
          !(justLanded && dropY >= REMASTER_RULES.dizzyDropWorldY) &&
          body.impactSpeed < REMASTER_PHYSICS.shatterImpactSpeed &&
          mainLayer &&
          !p.onRomIce &&
          !p.bridgeSupported &&
          !p.waveSupported &&
          p.surface === 'stone' &&
          (level.courseIndex !== 3 ||
            !touchesLevel3Amoeba(
              amoebas,
              body.position.x + mainLayer.origin.x + mainLayer.columns / 2,
              body.position.z + mainLayer.origin.z + mainLayer.rows / 2,
              1.8,
            )) &&
          (level.courseIndex !== 4 ||
            !isNearLevel4Vacuum(
              body.position.x + mainLayer.origin.x + mainLayer.columns / 2,
              body.position.z + mainLayer.origin.z + mainLayer.rows / 2,
            ))
        ) {
          const bx = body.position.x;
          const bz = body.position.z;
          const groundH = sampleLayerHeight(mainLayer, bx, bz);
          const hE = sampleLayerHeight(mainLayer, bx + 0.5, bz);
          const hW = sampleLayerHeight(mainLayer, bx - 0.5, bz);
          const hS = sampleLayerHeight(mainLayer, bx, bz + 0.5);
          const hN = sampleLayerHeight(mainLayer, bx, bz - 0.5);
          const flatTol = level.courseIndex === 5 ? 0.12 : 0.4;
          const cellXIdx = Math.floor(
            bx + mainLayer.origin.x + mainLayer.columns / 2,
          );
          const cellZIdx = Math.floor(
            bz + mainLayer.origin.z + mainLayer.rows / 2,
          );
          const currCell = mainLayer.cells[cellZIdx]?.[cellXIdx];
          const currCellFlat =
            level.courseIndex !== 5 ||
            (currCell != null &&
              currCell[0] !== null &&
              currCell[1] !== null &&
              currCell[2] !== null &&
              currCell[3] !== null &&
              Math.max(currCell[0], currCell[1], currCell[2], currCell[3]) -
                Math.min(currCell[0], currCell[1], currCell[2], currCell[3]) <
                0.05);
          const safeMargin =
            currCellFlat &&
            !(
              level.courseIndex === 6 &&
              isLevel6DynamicMazeCell(cellXIdx, cellZIdx)
            ) &&
            groundH !== null &&
            hE !== null &&
            hW !== null &&
            hS !== null &&
            hN !== null &&
            !isIceAtWorld(level, bx + 0.5, bz) &&
            !isIceAtWorld(level, bx - 0.5, bz) &&
            !isIceAtWorld(level, bx, bz + 0.5) &&
            !isIceAtWorld(level, bx, bz - 0.5) &&
            Math.abs(hE - groundH) < flatTol &&
            Math.abs(hW - groundH) < flatTol &&
            Math.abs(hS - groundH) < flatTol &&
            Math.abs(hN - groundH) < flatTol;
          if (level.courseIndex === 6 && groundH !== null) {
            // Level 6: snap lastSafe strictly to the nearest authentic 68010 ROM checkpoint
            // (table 0x1f98c) at the exact same elevation as the marble (zero corner/wrong-tier respawns).
            const cp = findNearestLevel6Respawn(
              bx + mainLayer.origin.x + mainLayer.columns / 2,
              bz + mainLayer.origin.z + mainLayer.rows / 2,
              groundH,
              (cx, cz) =>
                sampleLayerHeight(
                  mainLayer,
                  cx - mainLayer.origin.x - mainLayer.columns / 2,
                  cz - mainLayer.origin.z - mainLayer.rows / 2,
                ),
            );
            if (cp) {
              p.lastSafe = {
                x: cp.cellX - mainLayer.origin.x - mainLayer.columns / 2,
                y: cp.y + 0.05,
                z: cp.cellZ - mainLayer.origin.z - mainLayer.rows / 2,
              };
            }
          } else if (safeMargin && groundH !== null) {
            p.lastSafe = {
              x: bx,
              y: groundH + 0.05,
              z: bz,
            };
          }
        }

        // Shatter on > 3-cell drop or excessive vertical impact; dizzy on ~1.4..3-cell drop.
        const hardShatter =
          p.catapultCooldown <= 0 &&
          (body.impactSpeed >= REMASTER_PHYSICS.shatterImpactSpeed ||
            (justLanded && dropY > REMASTER_RULES.shatterDropWorldY));
        const dizzyLanding =
          body.impactSpeed >= 7.5 ||
          (justLanded && dropY >= REMASTER_RULES.dizzyDropWorldY);
        if (p.life === 'active' && hardShatter) {
          p.life = 'shattered';
          p.stateTimer = REMASTER_RULES.shatterDurationSeconds;
          physics.setMarbleKinematic(idx, true);
          events.push({ type: 'shatter', player: p.id });
          allAtGoal = false;
          continue;
        } else if (body.impactSpeed >= 3.0 || dizzyLanding) {
          // Emit landing thud (0x5d) first, then dizzy (0x39) just after (matches ROM 0x124da).
          events.push({
            type: 'impact',
            player: p.id,
            intensity: Math.min(1, Math.max(body.impactSpeed / 15, dropY / 3)),
          });
          if (dizzyLanding) {
            if (p.dizzyTimer <= 0) {
              events.push({ type: 'dizzy', player: p.id });
            }
            // Re-hit resets dizzy duration to full 50 ROM ticks (1.67 s).
            p.dizzyTimer = REMASTER_RULES.dizzyDurationSeconds;
          }
        }
        if (body.wallImpactSpeed && body.wallImpactSpeed > 0) {
          events.push({
            type: 'wallBounce',
            player: p.id,
            intensity: Math.min(1, body.wallImpactSpeed / 12),
          });
        }

        // Fall into abyss: trigger when dropping over a void (outside Level 2 pipe mouths)
        // or below killY. Keep marble dynamic so it visibly falls off the bottom of the screen.
        const droppedOverVoid =
          !p.bridgeSupported &&
          !p.waveSupported &&
          !inPipeMouth &&
          currentGround === null &&
          p.position.y < p.lastSafe.y - 2.4 &&
          p.velocity.y < -4.0;
        if (
          !p.bridgeSupported &&
          !p.waveSupported &&
          !inPipeMouth &&
          (p.position.y < level.killY || droppedOverVoid)
        ) {
          p.life = 'falling';
          p.stateTimer = REMASTER_RULES.fallDurationSeconds;
          if (!p.airborneFallPlayed) {
            p.airborneFallPlayed = true;
            events.push({ type: 'fall', player: p.id });
          }
          allAtGoal = false;
          continue;
        }

        // Goal arrival check.
        if (
          body.grounded &&
          isInsideGoal(level.goal, body.position.x, body.position.z)
        ) {
          p.life = 'goal';
          p.stateTimer = 0.8;
          if (goalOwner === undefined) goalOwner = p.id;
          const timeBonus =
            Math.floor(p.remainingTime) *
            REMASTER_RULES.timeBonusPointsPerSecond;
          p.score += timeBonus;
          if (timeBonus > 0) {
            p.scoreAward = { points: timeBonus, timer: 2.0 };
          }
          events.push({ type: 'goal', player: p.id, timeBonus });
          continue;
        }

        allAtGoal = false;
      }

      // Two-player marble-to-marble billiard bounce + clack SFX.
      if (pvpClackCooldown > 0) {
        pvpClackCooldown = Math.max(0, pvpClackCooldown - dt);
      }
      if (twoPlayers && players.length === 2) {
        const p0 = players[0]!;
        const p1 = players[1]!;
        if (p0.life === 'active' && p1.life === 'active') {
          const closing = physics.resolvePlayerBilliardCollision?.(0.85) ?? 0;
          const pd = Math.hypot(
            p0.position.x - p1.position.x,
            p0.position.z - p1.position.z,
          );
          if (
            pvpClackCooldown <= 0 &&
            (closing > 0.5 || pd < REMASTER_PHYSICS.marbleRadius * 2.15)
          ) {
            const rel = Math.max(
              closing,
              Math.hypot(
                p0.velocity.x - p1.velocity.x,
                p0.velocity.z - p1.velocity.z,
              ),
            );
            events.push({
              type: 'pvpClack',
              player: 1,
              intensity: Math.min(1, 0.35 + rel * 0.06),
            });
            pvpClackCooldown = 0.22;
          }
        }
      }

      updateWorms(dt, events);

      // Update Black Marble AI enemies:
      // Phase A (climbing): climb up the Level 2 ramp onto the upper wells plateau.
      // Phase B (patrol/chase): patrol the plateau and intercept nearby players.
      for (let ei = 0; ei < enemies.length; ei++) {
        const enemy = enemies[ei]!;
        if (enemy.eliminated) continue;
        if (enemy.shatterTimer > 0) {
          enemy.shatterTimer = Math.max(0, enemy.shatterTimer - dt);
          if (enemy.shatterTimer <= 0) {
            enemy.eliminated = true;
          }
          continue;
        }
        if (enemy.hitCooldown > 0) {
          enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
        }
        if (enemy.lastHitTimer > 0) {
          enemy.lastHitTimer = Math.max(0, enemy.lastHitTimer - dt);
          if (enemy.lastHitTimer <= 0) enemy.lastHitBy = undefined;
        }

        let targetX: number;
        let targetZ: number;
        let nearestPlayer: MutablePlayer | undefined;
        let nearestIdx: 0 | 1 = 0;
        let bestDist = 11;
        for (let i = 0; i < players.length; i++) {
          const p = players[i]!;
          if (p.life !== 'active') continue;
          const d = Math.hypot(
            p.position.x - enemy.position.x,
            p.position.z - enemy.position.z,
          );
          if (d < bestDist) {
            bestDist = d;
            nearestPlayer = p;
            nearestIdx = i as 0 | 1;
          }
        }

        let controllerForce: { x: number; z: number } | undefined;
        let selfCell: { x: number; z: number } | undefined;
        if (enemy.controllerState && enemy.controllerSpec) {
          const columns = mainLayer?.columns ?? 0;
          const rows = mainLayer?.rows ?? 0;
          const origin = mainLayer?.origin ?? { x: 0, z: 0 };
          const worldToCell = (position: Vec3) => ({
            x: position.x + origin.x + columns / 2,
            z: position.z + origin.z + rows / 2,
          });
          selfCell = worldToCell(enemy.position);
          if (enemy.id === 'level2-black-marble' && selfCell.x <= 27) {
            enemy.reachedPlateau = true;
          }
          const playerViews: EnemyPlayerView[] = players.map((player) => {
            const cell = worldToCell(player.position);
            return {
              x: cell.x,
              z: cell.z,
              active: player.life === 'active',
              zone: player.zone,
              airborne: !player.grounded,
              targetable: player.life === 'active' && !player.wormSwallowed,
            };
          });
          const controller = stepEnemyMarble(
            enemy.controllerSpec,
            enemy.controllerState,
            {
              x: selfCell.x,
              z: selfCell.z,
              vx: enemy.velocity.x,
              vz: enemy.velocity.z,
              airborne: false,
            },
            playerViews,
            dt,
          );
          enemy.controllerState = controller.state;
          controllerForce = { ...controller.desiredForce };
          targetX = controller.steeringTarget.x - origin.x - columns / 2;
          targetZ = controller.steeringTarget.z - origin.z - rows / 2;

          // Safety clamp: once on the Level 2 upper plateau, the Black Marble NEVER descends
          // past halfway down the ramp (cell x >= 32.0); it turns back up immediately.
          if (
            enemy.id === 'level2-black-marble' &&
            enemy.reachedPlateau &&
            selfCell.x >= 32.0
          ) {
            targetX = 24 - origin.x - columns / 2;
            targetZ = 35.5 - origin.z - rows / 2;
            controllerForce = { x: -24, z: (35.5 - selfCell.z) * 10 };
          } else if (enemy.reachedPlateau) {
            // Calmer, readable plateau aggression; back off strongly during hitCooldown
            // so the player has room to wrestle and shove the Black Marble off.
            const calmScale = enemy.hitCooldown > 0 ? 0.25 : 0.62;
            controllerForce = {
              x: controllerForce.x * calmScale,
              z: controllerForce.z * calmScale,
            };
            if (
              nearestPlayer &&
              enemy.hitCooldown <= 0 &&
              bestDist < 3.2 &&
              bestDist > 0.5 &&
              (enemy.id !== 'level2-black-marble' || selfCell.x < 31.0)
            ) {
              const lx =
                (nearestPlayer.position.x - enemy.position.x) / bestDist;
              const lz =
                (nearestPlayer.position.z - enemy.position.z) / bestDist;
              controllerForce = {
                x: controllerForce.x + lx * 5,
                z: controllerForce.z + lz * 5,
              };
            }
          }
        } else if (enemy.climbing) {
          // Climb straight up the ramp along -X (staying centered on ramp Z = home.z)
          // until reaching the upper plateau.
          targetX = enemy.patrolCenter.x;
          targetZ =
            enemy.position.x > enemy.patrolCenter.x + 2.5
              ? enemy.home.z
              : enemy.patrolCenter.z;
          if (
            Math.hypot(
              enemy.position.x - enemy.patrolCenter.x,
              enemy.position.z - enemy.patrolCenter.z,
            ) < 2.2
          ) {
            enemy.climbing = false;
          }
        } else if (nearestPlayer) {
          targetX = nearestPlayer.position.x;
          targetZ = nearestPlayer.position.z;
        } else {
          enemy.patrolAngle += dt * 1.1;
          targetX =
            enemy.patrolCenter.x +
            Math.cos(enemy.patrolAngle) * enemy.patrolRadius;
          targetZ =
            enemy.patrolCenter.z +
            Math.sin(enemy.patrolAngle) * enemy.patrolRadius * 0.7;
        }

        const dx = targetX - enemy.position.x;
        const dz = targetZ - enemy.position.z;
        const dist = Math.hypot(dx, dz);

        if (physics.applyEnemyForce && physics.readEnemy) {
          // Solid-terrain void-edge guard: when unbumped by a player (lastHitTimer <= 0)
          // and standing on solid terrain, a Black Marble MUST NEVER wander off a void edge.
          let edgeRecoveryForce: { x: number; z: number } | undefined;
          if (
            mainLayer &&
            enemy.lastHitTimer <= 0 &&
            sampleLayerHeight(mainLayer, enemy.position.x, enemy.position.z) !==
              null
          ) {
            const predX = enemy.position.x + enemy.velocity.x * 0.28;
            const predZ = enemy.position.z + enemy.velocity.z * 0.28;
            const nearVoid =
              sampleLayerHeight(mainLayer, predX, predZ) === null ||
              sampleLayerHeight(
                mainLayer,
                enemy.position.x + 0.95,
                enemy.position.z,
              ) === null ||
              sampleLayerHeight(
                mainLayer,
                enemy.position.x - 0.95,
                enemy.position.z,
              ) === null ||
              sampleLayerHeight(
                mainLayer,
                enemy.position.x,
                enemy.position.z + 0.95,
              ) === null ||
              sampleLayerHeight(
                mainLayer,
                enemy.position.x,
                enemy.position.z - 0.95,
              ) === null;
            if (nearVoid) {
              const ix = enemy.patrolCenter.x - enemy.position.x;
              const iz = enemy.patrolCenter.z - enemy.position.z;
              const ilen = Math.max(0.01, Math.hypot(ix, iz));
              edgeRecoveryForce = {
                x: (ix / ilen) * 34 - enemy.velocity.x * 4,
                z: (iz / ilen) * 34 - enemy.velocity.z * 4,
              };
            }
          }
          if (edgeRecoveryForce) {
            physics.applyEnemyForce(
              ei,
              edgeRecoveryForce.x,
              edgeRecoveryForce.z,
            );
          } else if (dist > 0.25) {
            if (controllerForce) {
              physics.applyEnemyForce(ei, controllerForce.x, controllerForce.z);
            } else {
              const accel = enemy.climbing ? 30 : nearestPlayer ? 15 : 10;
              physics.applyEnemyForce(
                ei,
                (dx / dist) * accel,
                (dz / dist) * accel,
              );
            }
          }
          const snap = physics.readEnemy(ei);
          enemy.position = { ...snap.position };
          enemy.velocity = { x: snap.velocity.x, z: snap.velocity.z };

          // Track airborne peak height so a Black Marble falling onto a lower plateau
          // shatters and dies immediately (matching original 68010 behavior).
          const enemyJustLanded = !enemy.wasGrounded && snap.grounded;
          const enemyDropY = Math.max(0, enemy.airbornePeakY - snap.position.y);
          if (!snap.grounded) {
            enemy.airbornePeakY = Math.max(
              enemy.airbornePeakY,
              snap.position.y,
            );
          } else {
            if (
              (enemyJustLanded &&
                enemyDropY >= REMASTER_RULES.shatterDropWorldY) ||
              snap.impactSpeed >= REMASTER_PHYSICS.shatterImpactSpeed
            ) {
              if (enemy.lastHitTimer > 0 && enemy.lastHitBy !== undefined) {
                const victor = players[enemy.lastHitBy];
                if (victor) {
                  victor.score += 1000;
                  victor.scoreAward = { points: 1000, timer: 1.6 };
                }
              }
              const creditPlayer =
                enemy.lastHitBy !== undefined
                  ? (players[enemy.lastHitBy]?.id ?? 1)
                  : 1;
              enemy.shatterTimer = 0.65;
              enemy.velocity = { x: 0, z: 0 };
              enemy.wasGrounded = true;
              physics.setEnemyKinematic?.(ei, true);
              physics.teleportEnemy?.(ei, {
                x: 0,
                y: level.killY - 20,
                z: 0,
              });
              events.push({ type: 'shatter', player: creditPlayer });
              continue;
            }
            enemy.airbornePeakY = snap.position.y;
          }
          enemy.wasGrounded = snap.grounded;

          // Once bumped off by a player, a Black Marble NEVER respawns and awards +1000.
          // If it somehow slipped off without being touched (lastHitTimer <= 0), restore it at home.
          if (enemy.position.y < level.killY) {
            if (enemy.lastHitTimer > 0 && enemy.lastHitBy !== undefined) {
              const victor = players[enemy.lastHitBy];
              if (victor) {
                victor.score += 1000;
                victor.scoreAward = { points: 1000, timer: 1.6 };
              }
              enemy.eliminated = true;
              enemy.velocity = { x: 0, z: 0 };
              physics.setEnemyKinematic?.(ei, true);
            } else {
              enemy.position = { ...enemy.home };
              enemy.velocity = { x: 0, z: 0 };
              enemy.airbornePeakY = enemy.home.y;
              enemy.wasGrounded = true;
              physics.teleportEnemy?.(ei, enemy.home);
            }
            continue;
          }
        } else {
          // Kinematic fallback for unit-test stub backends without enemy bodies.
          if (dist > 0.2) {
            const speed = enemy.climbing ? 6.5 : nearestPlayer ? 5.5 : 3.0;
            enemy.velocity.x +=
              ((dx / dist) * speed - enemy.velocity.x) * Math.min(1, dt * 4);
            enemy.velocity.z +=
              ((dz / dist) * speed - enemy.velocity.z) * Math.min(1, dt * 4);
          }
          const nextX = enemy.position.x + enemy.velocity.x * dt;
          const nextZ = enemy.position.z + enemy.velocity.z * dt;
          const nextH = mainLayer
            ? sampleLayerHeight(mainLayer, nextX, nextZ)
            : enemy.position.y;
          if (nextH !== null) {
            enemy.position.x = nextX;
            enemy.position.y = nextH;
            enemy.position.z = nextZ;
          } else {
            enemy.velocity.x *= -0.5;
            enemy.velocity.z *= -0.5;
          }
        }

        // Elastic billiard-ball collision between player and Black Marble.
        const billiardHit = nearestPlayer
          ? (physics.resolveBilliardCollision?.(nearestIdx, ei, 0.9) ?? 0)
          : 0;
        const contactDist = nearestPlayer
          ? Math.hypot(
              nearestPlayer.position.x - enemy.position.x,
              nearestPlayer.position.z - enemy.position.z,
            )
          : Infinity;
        if (
          nearestPlayer &&
          (billiardHit > 0 ||
            contactDist < REMASTER_PHYSICS.marbleRadius * 2.25) &&
          enemy.hitCooldown <= 0
        ) {
          if (enemy.controllerState && enemy.controllerSpec && selfCell) {
            enemy.controllerState = bumpEnemyMarble(
              enemy.controllerSpec,
              enemy.controllerState,
              selfCell,
            );
          }
          const relSpeed = Math.max(
            billiardHit,
            Math.hypot(
              nearestPlayer.velocity.x - enemy.velocity.x,
              nearestPlayer.velocity.z - enemy.velocity.z,
            ),
          );
          if (!physics.resolveBilliardCollision) {
            const pushX = nearestPlayer.position.x - enemy.position.x;
            const pushZ = nearestPlayer.position.z - enemy.position.z;
            const pushLen = Math.max(0.01, Math.hypot(pushX, pushZ));
            physics.applyPlayerForce(
              nearestIdx,
              (pushX / pushLen) * 28,
              (pushZ / pushLen) * 28,
            );
            physics.applyEnemyForce?.(
              ei,
              -(pushX / pushLen) * 35,
              -(pushZ / pushLen) * 35,
            );
          }
          enemy.hitCooldown = 1.1;
          enemy.lastHitBy = nearestIdx;
          enemy.lastHitTimer = 5.0;
          if (relSpeed > 9.5) {
            if (nearestPlayer.dizzyTimer <= 0) {
              events.push({ type: 'dizzy', player: nearestPlayer.id });
            }
            // Re-hit resets dizzy duration to full 50 ROM ticks (1.67 s).
            nearestPlayer.dizzyTimer = REMASTER_RULES.dizzyDurationSeconds;
          }
          events.push({
            type: 'marbleClack',
            player: nearestPlayer.id,
            intensity: Math.min(1, 0.4 + relSpeed * 0.06),
          });
        }
      }

      // Two-player off-screen catch-up: if the trailing marble falls too far
      // behind the leader, deduct 5 seconds and respawn it near the leader with
      // the arcade "-5 SEC" floating notice.
      if (twoPlayers && players.length === 2) {
        const p0 = players[0]!;
        const p1 = players[1]!;
        const d0 = progressAlong(p0.position);
        const d1 = progressAlong(p1.position);
        const leaderIdx = d0 >= d1 ? 0 : 1;
        const trailerIdx = (1 - leaderIdx) as 0 | 1;
        const leader = players[leaderIdx]!;
        const trailer = players[trailerIdx]!;
        if (
          trailer.life === 'active' &&
          Math.abs(d0 - d1) > REMASTER_RULES.catchUpLagCells
        ) {
          trailer.remainingTime = Math.max(
            0,
            trailer.remainingTime - REMASTER_RULES.catchUpPenaltySeconds,
          );
          trailer.life = 'respawning';
          trailer.stateTimer = REMASTER_RULES.respawnInvulnSeconds;
          trailer.catchUpTimer = REMASTER_RULES.catchUpNoticeSeconds;
          trailer.lastSafe = { ...leader.lastSafe };
          trailer.position = { ...leader.lastSafe };
          trailer.velocity = { x: 0, y: 0, z: 0 };
          physics.setMarbleKinematic(trailerIdx, true);
          physics.teleportMarble(trailerIdx, trailer.lastSafe);
          events.push({
            type: 'catchUp',
            player: trailer.id,
            penaltySeconds: REMASTER_RULES.catchUpPenaltySeconds,
          });
        }
      }

      if (allAtGoal) {
        phase = 'finished';
      }

      return snapshot(events);
    },

    get snapshot(): RemasterSnapshot {
      return snapshot([]);
    },
  };
}
