import {
  isInsideGoal,
  sampleLayerHeight,
  type RemasterLevelV1,
  type Vec3,
} from '../levels/remasterLevel';
import { REMASTER_PHYSICS, REMASTER_RULES } from './physicsConstants';

export type RemasterPhase = 'opening' | 'playing' | 'finished' | 'gameOver';

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
}

/** Injectable physics backend (Havok in browser, deterministic stub in unit tests). */
export interface RemasterPhysicsBackend {
  applyPlayerForce(playerIndex: 0 | 1, fx: number, fz: number): void;
  teleportMarble(playerIndex: 0 | 1, position: Vec3): void;
  setMarbleKinematic(playerIndex: 0 | 1, kinematic: boolean): void;
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
      /** Horizontal collision: `wall` (cliff, guardrail, landmark) or `marble` (marble-to-marble). */
      readonly type: 'bump';
      readonly player: 1 | 2;
      readonly target: 'wall' | 'marble';
      /** Normalized collision strength 0..1 (lost/closing speed over `bumpFullSpeed`). */
      readonly intensity: number;
    }
  | {
      /** Marble left the ground and is dropping (ramp jump or ledge). */
      readonly type: 'airborne';
      readonly player: 1 | 2;
    }
  | {
      /** Marble touched ground again after an `airborne` event and survived. */
      readonly type: 'land';
      readonly player: 1 | 2;
      /** Landing speed over the shatter threshold (0..1). */
      readonly intensity: number;
    }
  | { readonly type: 'shatter'; readonly player: 1 | 2 }
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
  readonly score: number;
  readonly remainingTime: number;
  readonly stateTimer: number;
  readonly catchUpTimer: number;
  readonly lastSafe: Vec3;
  readonly maxProgress: number;
}

export interface RemasterSnapshot {
  readonly phase: RemasterPhase;
  readonly openingProgress: number;
  readonly remainingTime: number;
  readonly twoPlayers: boolean;
  readonly players: readonly RemasterPlayerState[];
  readonly goalOwner: 1 | 2 | undefined;
  readonly events: readonly RemasterEvent[];
}

interface MutablePlayer {
  id: 1 | 2;
  life: MarbleLifeState;
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  grounded: boolean;
  score: number;
  remainingTime: number;
  stateTimer: number;
  catchUpTimer: number;
  lastSafe: { x: number; y: number; z: number };
  maxProgress: number;
  airborne: boolean;
}

/** Extra center distance (cells) still counted as marble-to-marble contact. */
const MARBLE_CONTACT_SLACK = 0.08;

/**
 * Horizontal collision speed between two consecutive velocities: the full
 * horizontal velocity change when the marble reverses against its previous
 * direction of travel, otherwise only the change perpendicular to it. Pure
 * along-track slowdowns (ramp entries, damping, braking) therefore never count
 * as a bump, while wall hits (normal component reflected) do.
 */
export function horizontalBumpSpeed(prev: Vec3, next: Vec3): number {
  const prevSpeed = Math.hypot(prev.x, prev.z);
  if (prevSpeed < 1e-6) return 0;
  const dirX = prev.x / prevSpeed;
  const dirZ = prev.z / prevSpeed;
  const dvx = next.x - prev.x;
  const dvz = next.z - prev.z;
  const alongNext = next.x * dirX + next.z * dirZ;
  if (alongNext < 0) return Math.hypot(dvx, dvz);
  return Math.abs(dvx * dirZ - dvz * dirX);
}

function bumpIntensity(speed: number): number {
  return Math.min(1, speed / REMASTER_RULES.bumpFullSpeed);
}

export function createRemasterSimulation(
  level: RemasterLevelV1,
  physics: RemasterPhysicsBackend,
  twoPlayers = false,
) {
  const mainLayer = level.heightLayers[0];
  let phase: RemasterPhase = 'opening';
  let openingElapsed = 0;
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
      score: 0,
      remainingTime: level.timerSeconds,
      stateTimer: 0,
      catchUpTimer: 0,
      lastSafe: { ...pos },
      maxProgress: progressAlong(pos),
      airborne: false,
    };
  }

  let marblesTouching = false;
  const prevVelocities: Vec3[] = [];
  const wallBumps: number[] = [];

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
  }

  placePlayersAtSpawn();

  function snapshot(events: RemasterEvent[]): RemasterSnapshot {
    return {
      phase,
      openingProgress: Math.min(
        1,
        openingElapsed / REMASTER_RULES.openingDurationSeconds,
      ),
      remainingTime,
      twoPlayers,
      players: players.map((p) => ({
        id: p.id,
        life: p.life,
        position: { ...p.position },
        velocity: { ...p.velocity },
        grounded: p.grounded,
        score: p.score,
        remainingTime: p.remainingTime,
        stateTimer: p.stateTimer,
        catchUpTimer: p.catchUpTimer,
        lastSafe: { ...p.lastSafe },
        maxProgress: p.maxProgress,
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
      remainingTime = level.timerSeconds;
      lastWholeSecond = Math.ceil(level.timerSeconds);
      goalOwner = undefined;
      marblesTouching = false;
      players[0] = makePlayer(1, level.spawns.player1);
      if (twoPlayers) players[1] = makePlayer(2, level.spawns.player2);
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

      // Advance per-player countdown timers.
      for (const p of players) {
        if (p.life !== 'goal') {
          p.remainingTime = Math.max(0, p.remainingTime - dt);
        }
        if (p.catchUpTimer > 0) {
          p.catchUpTimer = Math.max(0, p.catchUpTimer - dt);
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
      for (let i = 0; i < players.length; i++) {
        prevVelocities[i] = players[i]!.velocity;
        wallBumps[i] = 0;
      }
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
            p.airborne = false;
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
        const bump = horizontalBumpSpeed(p.velocity, body.velocity);
        p.position = { ...body.position };
        p.velocity = { ...body.velocity };
        p.grounded = body.grounded;

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

        // Airborne / landing tracking (arcade 0x121b8: a marble more than
        // 0x60000 = 0.75 cell above the ground starts the falling sound).
        if (!p.airborne && !body.grounded && body.velocity.y < 0) {
          const groundH = mainLayer
            ? sampleLayerHeight(mainLayer, body.position.x, body.position.z)
            : null;
          if (
            groundH === null ||
            body.position.y - groundH > REMASTER_RULES.airborneMinHeight
          ) {
            p.airborne = true;
            events.push({ type: 'airborne', player: p.id });
          }
        }
        const landedFromAir = p.airborne && body.grounded;
        if (landedFromAir) p.airborne = false;

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
        } else if (landedFromAir) {
          events.push({
            type: 'land',
            player: p.id,
            intensity: Math.min(
              1,
              body.impactSpeed / REMASTER_PHYSICS.shatterImpactSpeed,
            ),
          });
        }
        if (body.impactSpeed >= 3.0) {
          events.push({
            type: 'impact',
            player: p.id,
            intensity: Math.min(1, body.impactSpeed / 15),
          });
        }

        if (bump >= REMASTER_RULES.bumpMinSpeed) {
          wallBumps[i] = bump;
        }

        // Fall into abyss.
        if (body.position.y < level.killY) {
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
          events.push({ type: 'goal', player: p.id, timeBonus });
          continue;
        }

        allAtGoal = false;
      }

      // Marble-to-marble contact (2P; future black marbles / steelies reuse the
      // same 'marble' bump target). Reported once per contact, on touch-down.
      let marbleContact = false;
      if (players.length === 2) {
        const a = players[0]!;
        const b = players[1]!;
        if (a.life === 'active' && b.life === 'active') {
          const dx = b.position.x - a.position.x;
          const dy = b.position.y - a.position.y;
          const dz = b.position.z - a.position.z;
          const dist = Math.hypot(dx, dy, dz);
          const touching =
            dist < REMASTER_PHYSICS.marbleRadius * 2 + MARBLE_CONTACT_SLACK;
          if (touching && !marblesTouching && dist > 1e-6) {
            const closing =
              ((prevVelocities[0]!.x - prevVelocities[1]!.x) * dx +
                (prevVelocities[0]!.y - prevVelocities[1]!.y) * dy +
                (prevVelocities[0]!.z - prevVelocities[1]!.z) * dz) /
              dist;
            if (closing >= REMASTER_RULES.bumpMinSpeed) {
              marbleContact = true;
              events.push({
                type: 'bump',
                player: a.id,
                target: 'marble',
                intensity: bumpIntensity(closing),
              });
            }
          }
          marblesTouching = touching;
        } else {
          marblesTouching = false;
        }
      }
      for (let i = 0; i < players.length; i++) {
        const speed = wallBumps[i] ?? 0;
        const p = players[i]!;
        if (speed > 0 && !marbleContact && p.life === 'active') {
          events.push({
            type: 'bump',
            player: p.id,
            target: 'wall',
            intensity: bumpIntensity(speed),
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
          trailer.airborne = false;
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
