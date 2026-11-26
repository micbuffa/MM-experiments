import {
  isInsideGoal,
  sampleLayerHeight,
  sampleSurfaceAt,
  type RemasterLevelV1,
  type RemasterSurfaceKind,
  type Vec3,
} from '../levels/remasterLevel';
import { REMASTER_PHYSICS, REMASTER_RULES } from './physicsConstants';

export type RemasterPhase = 'opening' | 'playing' | 'finished' | 'gameOver';
export type StartLiftPhase = 1 | 2 | 3 | 4 | 5;

export type MarbleLifeState =
  'active' | 'shattered' | 'falling' | 'respawning' | 'goal';

export interface PlayerInput {
  /** Normalized horizontal command in world XZ plane (-1..1). */
  readonly x: number;
  readonly z: number;
  readonly boost?: boolean;
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
  applyPlayerForce(playerIndex: 0 | 1, fx: number, fz: number): void;
  teleportMarble(playerIndex: 0 | 1, position: Vec3): void;
  setMarbleKinematic(playerIndex: 0 | 1, kinematic: boolean): void;
  setMarbleSurface?(playerIndex: 0 | 1, surface: RemasterSurfaceKind): void;
  applyEnemyForce?(enemyIndex: number, fx: number, fz: number): void;
  teleportEnemy?(enemyIndex: number, position: Vec3): void;
  readEnemy?(enemyIndex: number): PhysicsMarbleSnapshot;
  resolveBilliardCollision?(
    playerIndex: 0 | 1,
    enemyIndex: number,
    restitution?: number,
  ): number;
  resolvePlayerBilliardCollision?(restitution?: number): number;
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
  | { readonly type: 'shatter'; readonly player: 1 | 2 }
  | { readonly type: 'dizzy'; readonly player: 1 | 2 }
  | { readonly type: 'fall'; readonly player: 1 | 2 }
  | { readonly type: 'respawn'; readonly player: 1 | 2 }
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
  readonly dizzyTimer: number;
  readonly scoreAward:
    { readonly points: number; readonly timer: number } | undefined;
  readonly lastSafe: Vec3;
  readonly maxProgress: number;
}

export interface RemasterEnemyState {
  readonly id: string;
  readonly kind: 'blackMarble';
  readonly position: Vec3;
}

export interface RemasterSnapshot {
  readonly phase: RemasterPhase;
  readonly openingProgress: number;
  readonly startLiftPhase: StartLiftPhase | undefined;
  readonly bridgePhase: number;
  readonly remainingTime: number;
  readonly twoPlayers: boolean;
  readonly players: readonly RemasterPlayerState[];
  readonly enemies: readonly RemasterEnemyState[];
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
  dizzyTimer: number;
  scoreAward: { points: number; timer: number } | undefined;
  lastSafe: { x: number; y: number; z: number };
  maxProgress: number;
}

interface MutableEnemy {
  id: string;
  kind: 'blackMarble';
  home: { x: number; y: number; z: number };
  patrolCenter: { x: number; z: number };
  climbing: boolean;
  position: { x: number; y: number; z: number };
  velocity: { x: number; z: number };
  patrolRadius: number;
  patrolAngle: number;
  hitCooldown: number;
}

export function createRemasterSimulation(
  level: RemasterLevelV1,
  physics: RemasterPhysicsBackend,
  twoPlayers = false,
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
      dizzyTimer: 0,
      scoreAward: undefined,
      lastSafe: { ...pos },
      maxProgress: progressAlong(pos),
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
      return {
        id: e.id,
        kind: e.kind,
        home: { ...pos },
        patrolCenter: isLevel2Ramp
          ? { x: pos.x - 16, z: pos.z - 4 }
          : { x: pos.x, z: pos.z },
        climbing: isLevel2Ramp,
        position: { ...pos },
        velocity: { x: 0, z: 0 },
        patrolRadius: e.patrolRadius,
        patrolAngle: 0,
        hitCooldown: 0,
      };
    });
  }

  let enemies: MutableEnemy[] = makeEnemies();

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
    return {
      phase,
      openingProgress: Math.min(
        1,
        openingElapsed / REMASTER_RULES.openingDurationSeconds,
      ),
      startLiftPhase: computeStartLift(),
      bridgePhase: (Math.sin(playElapsed * 1.4) + 1) * 0.5,
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
        dizzyTimer: p.dizzyTimer,
        scoreAward: p.scoreAward ? { ...p.scoreAward } : undefined,
        lastSafe: { ...p.lastSafe },
        maxProgress: p.maxProgress,
      })),
      enemies: enemies.map((e) => ({
        id: e.id,
        kind: e.kind,
        position: { ...e.position },
      })),
      goalOwner,
      events,
    };
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
      placePlayersAtSpawn();
      return snapshot([]);
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
              } else {
                physics.applyPlayerForce(i as 0 | 1, 0, 26 * liftStrength);
              }
            }
          }
        }
      }

      // Advance per-player countdown timers and status notices.
      for (const p of players) {
        if (p.life !== 'goal') {
          p.remainingTime = Math.max(0, p.remainingTime - dt);
        }
        if (p.catchUpTimer > 0) {
          p.catchUpTimer = Math.max(0, p.catchUpTimer - dt);
        }
        if (p.dizzyTimer > 0) {
          p.dizzyTimer = Math.max(0, p.dizzyTimer - dt);
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
        if (p.life !== 'active') continue;
        const input = inputs[i];
        if (!input) continue;
        const mag = Math.hypot(input.x, input.z);
        if (mag > 0.001) {
          const clamp = Math.min(1, mag);
          const nx = input.x / mag;
          const nz = input.z / mag;
          const boost = input.boost ? REMASTER_PHYSICS.boostMultiplier : 1;
          const accel = REMASTER_PHYSICS.inputAcceleration * clamp * boost;
          physics.applyPlayerForce(i as 0 | 1, nx * accel, nz * accel);
        }
      }

      // Step physics engine.
      physics.step(dt);

      // Update each player from physics snapshot.
      let allAtGoal = true;
      for (let i = 0; i < players.length; i++) {
        const p = players[i]!;
        const idx = i as 0 | 1;

        if (p.life === 'shattered' || p.life === 'falling') {
          allAtGoal = false;
          p.stateTimer -= dt;
          if (p.stateTimer <= 0) {
            p.life = 'respawning';
            p.stateTimer = REMASTER_RULES.respawnInvulnSeconds;
            p.position = { ...p.lastSafe };
            p.velocity = { x: 0, y: 0, z: 0 };
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
        p.surface = sampleSurfaceAt(level, body.position.x, body.position.z);
        physics.setMarbleSurface?.(idx, p.surface);

        // Forward progress scoring.
        const along = progressAlong(body.position);
        if (along > p.maxProgress + 1) {
          const gained = Math.floor(along - p.maxProgress);
          p.maxProgress += gained;
          p.score += gained * REMASTER_RULES.progressPointsPerCell;
        }

        // Save safe grounded checkpoint slightly inside solid terrain.
        if (body.grounded && mainLayer) {
          const groundH = sampleLayerHeight(
            mainLayer,
            body.position.x,
            body.position.z,
          );
          if (groundH !== null) {
            p.lastSafe = {
              x: body.position.x,
              y: groundH + 0.05,
              z: body.position.z,
            };
          }
        }

        // Shatter on excessive vertical impact.
        if (
          p.life === 'active' &&
          body.impactSpeed >= REMASTER_PHYSICS.shatterImpactSpeed
        ) {
          p.life = 'shattered';
          p.stateTimer = REMASTER_RULES.shatterDurationSeconds;
          physics.setMarbleKinematic(idx, true);
          events.push({ type: 'shatter', player: p.id });
          allAtGoal = false;
          continue;
        } else if (body.impactSpeed >= 3.0) {
          if (body.impactSpeed >= 7.5) {
            if (p.dizzyTimer <= 0) {
              events.push({ type: 'dizzy', player: p.id });
            }
            p.dizzyTimer = 1.2;
          }
          events.push({
            type: 'impact',
            player: p.id,
            intensity: Math.min(1, body.impactSpeed / 15),
          });
        }
        if (body.wallImpactSpeed && body.wallImpactSpeed > 0) {
          events.push({
            type: 'wallBounce',
            player: p.id,
            intensity: Math.min(1, body.wallImpactSpeed / 12),
          });
        }

        // Fall into abyss: trigger promptly when dropping over a void as well as below killY.
        const currentGround = mainLayer
          ? sampleLayerHeight(mainLayer, body.position.x, body.position.z)
          : 0;
        const droppedOverVoid =
          currentGround === null &&
          body.position.y < p.lastSafe.y - 2.4 &&
          body.velocity.y < -4.0;
        if (body.position.y < level.killY || droppedOverVoid) {
          p.life = 'falling';
          p.stateTimer = REMASTER_RULES.fallDurationSeconds;
          physics.setMarbleKinematic(idx, true);
          events.push({ type: 'fall', player: p.id });
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
              type: 'marbleClack',
              player: 1,
              intensity: Math.min(1, 0.35 + rel * 0.06),
            });
            pvpClackCooldown = 0.22;
          }
        }
      }

      // Update Black Marble AI enemies:
      // Phase A (climbing): climb up the Level 2 ramp onto the upper wells plateau.
      // Phase B (patrol/chase): patrol the plateau and intercept nearby players.
      for (let ei = 0; ei < enemies.length; ei++) {
        const enemy = enemies[ei]!;
        if (enemy.hitCooldown > 0) {
          enemy.hitCooldown = Math.max(0, enemy.hitCooldown - dt);
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

        if (enemy.climbing) {
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
          if (dist > 0.25) {
            const accel = enemy.climbing ? 30 : nearestPlayer ? 15 : 10;
            physics.applyEnemyForce(
              ei,
              (dx / dist) * accel,
              (dz / dist) * accel,
            );
          }
          const snap = physics.readEnemy(ei);
          enemy.position = { ...snap.position };
          enemy.velocity = { x: snap.velocity.x, z: snap.velocity.z };
          // If knocked into the abyss, award +1000 arcade bonus and respawn at home.
          if (enemy.position.y < level.killY) {
            const victor = nearestPlayer ?? players[0];
            if (victor) {
              victor.score += 1000;
              victor.scoreAward = { points: 1000, timer: 1.6 };
            }
            enemy.position = { ...enemy.home };
            enemy.velocity = { x: 0, z: 0 };
            enemy.climbing =
              level.courseIndex === 2 && enemy.id === 'level2-black-marble';
            physics.teleportEnemy?.(ei, enemy.home);
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
          ? (physics.resolveBilliardCollision?.(nearestIdx, ei, 0.85) ?? 0)
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
            contactDist < REMASTER_PHYSICS.marbleRadius * 2.18) &&
          enemy.hitCooldown <= 0
        ) {
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
          enemy.hitCooldown = 0.2;
          const playerSpeed = Math.hypot(
            nearestPlayer.velocity.x,
            nearestPlayer.velocity.z,
          );
          const enemySpeed = Math.hypot(enemy.velocity.x, enemy.velocity.z);
          if (enemySpeed > playerSpeed + 3.0 && relSpeed > 5.0) {
            if (nearestPlayer.dizzyTimer <= 0) {
              events.push({ type: 'dizzy', player: nearestPlayer.id });
            }
            nearestPlayer.dizzyTimer = 0.55;
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
