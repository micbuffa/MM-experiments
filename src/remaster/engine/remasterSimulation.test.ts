import { describe, expect, it } from 'vitest';
import {
  createRemasterSimulation,
  type PhysicsMarbleSnapshot,
  type RemasterPhysicsBackend,
} from './remasterSimulation';
import { REMASTER_PHYSICS, REMASTER_RULES } from './physicsConstants';
import type { RemasterLevelV1, Vec3 } from '../levels/remasterLevel';

function makeFlatLevel(): RemasterLevelV1 {
  const cells = Array.from({ length: 20 }, () =>
    Array.from({ length: 20 }, () => [0, 0, 0, 0] as const),
  );
  return {
    format: 'remaster-level-v1',
    id: 'test-flat',
    name: 'Test Flat',
    courseIndex: 1,
    timerSeconds: 12,
    direction: 1,
    heightLayers: [
      {
        id: 'main',
        columns: 20,
        rows: 20,
        origin: { x: 0, z: 0 },
        cells,
        defaultSurface: 'stone',
      },
    ],
    volumes: [],
    spawns: {
      player1: { x: -5, y: 0, z: -5 },
      player2: { x: -3, y: 0, z: -5 },
    },
    goal: { minX: 4, maxX: 8, minZ: 4, maxZ: 8, y: 0 },
    killY: -5,
  };
}

function makeStubPhysics(): RemasterPhysicsBackend & {
  marbles: [PhysicsMarbleSnapshot, PhysicsMarbleSnapshot];
  forces: [Vec3, Vec3];
  kinematic: [boolean, boolean];
} {
  const marbles: [PhysicsMarbleSnapshot, PhysicsMarbleSnapshot] = [
    {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    },
    {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    },
  ];
  const forces: [Vec3, Vec3] = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
  ];
  const kinematic: [boolean, boolean] = [false, false];
  return {
    marbles,
    forces,
    kinematic,
    applyPlayerForce(i, fx, fz) {
      forces[i] = { x: fx, y: 0, z: fz };
    },
    teleportMarble(i, position) {
      marbles[i] = {
        position: { ...position },
        velocity: { x: 0, y: 0, z: 0 },
        grounded: true,
        impactSpeed: 0,
      };
    },
    setMarbleKinematic(i, value) {
      kinematic[i] = value;
    },
    step(dt) {
      for (let i = 0; i < 2; i++) {
        if (kinematic[i]) continue;
        const m = marbles[i]!;
        const f = forces[i]!;
        const vx = m.velocity.x + f.x * dt;
        const vz = m.velocity.z + f.z * dt;
        marbles[i] = {
          ...m,
          position: {
            x: m.position.x + vx * dt,
            y: m.position.y,
            z: m.position.z + vz * dt,
          },
          velocity: { x: vx, y: m.velocity.y, z: vz },
        };
        forces[i] = { x: 0, y: 0, z: 0 };
      }
    },
    readMarble(i) {
      return marbles[i]!;
    },
  };
}

describe('createRemasterSimulation', () => {
  it('transitions from opening to playing, scores forward progress, and finishes on GOAL', () => {
    const level = makeFlatLevel();
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(level, physics);

    expect(sim.snapshot.phase).toBe('opening');
    expect(physics.kinematic[0]).toBe(true);

    // Advance through opening flyover
    let state = sim.step(REMASTER_RULES.openingDurationSeconds, []);
    expect(state.phase).toBe('playing');
    expect(physics.kinematic[0]).toBe(false);
    expect(state.events).toContainEqual({ type: 'start' });

    // Drive player forward toward GOAL (without reaching GOAL yet)
    state = sim.step(0.25, [{ x: 1, z: 1, boost: true }]);
    expect(state.phase).toBe('playing');
    expect(state.players[0]!.score).toBeGreaterThan(0);

    // Arrive inside GOAL zone
    physics.marbles[0] = {
      position: { x: 6, y: 0, z: 6 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    state = sim.step(1 / 60, []);
    expect(state.phase).toBe('finished');
    expect(state.goalOwner).toBe(1);
    expect(state.events.some((e) => e.type === 'goal')).toBe(true);
  });

  it('shatters on hard impact and respawns at last safe grounded position', () => {
    const level = makeFlatLevel();
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // Soft impact emits impact event without shattering
    physics.marbles[0] = {
      ...physics.marbles[0],
      impactSpeed: 5,
    };
    let state = sim.step(1 / 60, []);
    expect(state.players[0]!.life).toBe('active');
    expect(state.events.some((e) => e.type === 'impact')).toBe(true);

    // Hard impact shatters marble
    physics.marbles[0] = {
      ...physics.marbles[0],
      impactSpeed: REMASTER_PHYSICS.shatterImpactSpeed + 1,
    };
    state = sim.step(1 / 60, []);
    expect(state.players[0]!.life).toBe('shattered');
    expect(physics.kinematic[0]).toBe(true);
    expect(state.events).toContainEqual({ type: 'shatter', player: 1 });

    // Advance past shatter timer -> respawns
    physics.marbles[0] = { ...physics.marbles[0], impactSpeed: 0 };
    state = sim.step(REMASTER_RULES.shatterDurationSeconds + 0.1, []);
    expect(state.players[0]!.life).toBe('respawning');
    expect(state.events).toContainEqual({ type: 'respawn', player: 1 });

    // Advance past invulnerability -> active again
    state = sim.step(REMASTER_RULES.respawnInvulnSeconds + 0.1, []);
    expect(state.players[0]!.life).toBe('active');
  });

  it('handles abyss falls, low-time ticks, gameOver, 2-player mode and reset', () => {
    const level = makeFlatLevel();
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(level, physics, true);
    sim.skipOpening();
    expect(sim.snapshot.players).toHaveLength(2);

    // Drop player 1 below killY
    physics.marbles[0] = {
      position: { x: -5, y: -10, z: -5 },
      velocity: { x: 0, y: -10, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    let state = sim.step(1 / 60, []);
    expect(state.players[0]!.life).toBe('falling');
    expect(state.events).toContainEqual({ type: 'fall', player: 1 });

    // Tick down into low-time warning and then game over
    state = sim.step(3, []);
    expect(state.events.some((e) => e.type === 'countdownTick')).toBe(true);
    state = sim.step(15, []);
    expect(state.phase).toBe('gameOver');
    expect(state.events).toContainEqual({ type: 'gameOver' });

    // Stepping after gameOver is a no-op
    expect(sim.step(1 / 60, []).phase).toBe('gameOver');

    // Reset restores opening phase
    state = sim.reset();
    expect(state.phase).toBe('opening');
    expect(state.remainingTime).toBe(12);
    expect(state.players[0]!.score).toBe(0);
  });
});
