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
  | { readonly type: 'shatter'; readonly player: 1 | 2 }
  | { readonly type: 'fall'; readonly player: 1 | 2 }
  | { readonly type: 'respawn'; readonly player: 1 | 2 }
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
  readonly stateTimer: number;
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
  stateTimer: number;
  lastSafe: { x: number; y: number; z: number };
  maxProgress: number;
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
      stateTimer: 0,
      lastSafe: { ...pos },
      maxProgress: progressAlong(pos),
    };
  }

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
        stateTimer: p.stateTimer,
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

      // Advance race countdown timer.
      remainingTime = Math.max(0, remainingTime - dt);
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

      // Apply player commands to active marbles.
      for (let i = 0; i < players.length; i++) {
        const p = players[i]!;
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

        if (p.life === 'goal') continue;

        const body = physics.readMarble(idx);
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
          events.push({
            type: 'impact',
            player: p.id,
            intensity: Math.min(1, body.impactSpeed / 15),
          });
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
          if (goalOwner === undefined) goalOwner = p.id;
          const timeBonus =
            Math.floor(remainingTime) * REMASTER_RULES.timeBonusPointsPerSecond;
          p.score += timeBonus;
          physics.setMarbleKinematic(idx, true);
          events.push({ type: 'goal', player: p.id, timeBonus });
          continue;
        }

        allAtGoal = false;
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
