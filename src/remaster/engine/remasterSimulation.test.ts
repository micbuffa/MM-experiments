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
    surfaceZones: [],
    enemies: [],
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
    setMarblePosition(i, position) {
      marbles[i] = {
        ...marbles[i]!,
        position: { ...position },
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

  it('supports a lowered bridge without cancelling steering velocity', () => {
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      spawns: {
        player1: { x: -2, y: 0, z: -3 },
        player2: { x: -3, y: 0, z: -5 },
      },
    };
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    const state = sim.step(1 / 60, [{ x: 1, z: 0 }]);

    expect(state.players[0]!.grounded).toBe(true);
    expect(state.players[0]!.velocity.x).toBeGreaterThan(0);
    expect(physics.marbles[0]!.position.y).toBe(state.players[0]!.position.y);
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

  it('penalizes and respawns the trailing player with -5 SEC when falling off-screen in 2P mode', () => {
    const level = makeFlatLevel();
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(level, physics, true);
    sim.skipOpening();

    // Advance P1 far ahead of P2 (> catchUpLagCells)
    physics.marbles[0] = {
      position: { x: 18, y: 0, z: 18 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    physics.marbles[1] = {
      position: { x: -5, y: 0, z: -5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    const state = sim.step(1 / 60, []);
    expect(state.events).toContainEqual({
      type: 'catchUp',
      player: 2,
      penaltySeconds: REMASTER_RULES.catchUpPenaltySeconds,
    });
    expect(state.players[1]!.life).toBe('respawning');
    expect(state.players[1]!.catchUpTimer).toBeGreaterThan(0);
    expect(state.players[1]!.remainingTime).toBeCloseTo(
      12 - 1 / 60 - REMASTER_RULES.catchUpPenaltySeconds,
      2,
    );
  });

  it('triggers startLift only when idle at spawn and pushes the marble downhill, plus Black Marble AI chase', () => {
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      enemies: [
        {
          id: 'black-1',
          kind: 'blackMarble',
          position: { x: -4.2, y: 0, z: -4.2 },
          patrolRadius: 4,
        },
      ],
    };
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // Immediately after start, the lift has NOT appeared yet
    const early = sim.step(0.1, []);
    expect(early.startLiftPhase).toBeUndefined();
    expect(early.enemies).toHaveLength(1);
    // Close black marble emits marbleClack event on contact
    expect(early.events.some((e) => e.type === 'marbleClack')).toBe(true);

    // Separate run without enemy interference: staying idle at spawn past 2.2s
    // raises the start-lift and pushes the marble downhill (+x).
    const idleBase = makeStubPhysics();
    let pushedForward = false;
    const idlePhysics: RemasterPhysicsBackend = {
      ...idleBase,
      applyPlayerForce(idx, fx, fz) {
        if (idx === 0 && fx > 0) pushedForward = true;
        idleBase.applyPlayerForce(idx, fx, fz);
      },
    };
    const idleSim = createRemasterSimulation(makeFlatLevel(), idlePhysics);
    idleSim.skipOpening();
    let maxLift = 0;
    for (let i = 0; i < 28; i++) {
      const s = idleSim.step(0.1, []);
      if (s.startLiftPhase && s.startLiftPhase > maxLift) {
        maxLift = s.startLiftPhase;
      }
    }
    expect(maxLift).toBeGreaterThanOrEqual(1);
    expect(pushedForward).toBe(true);
  });

  it('drives dynamic Black Marble bodies and awards +1000 points when knocked off the ledge', () => {
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      enemies: [
        {
          id: 'black-dyn',
          kind: 'blackMarble',
          position: { x: -4.2, y: 0, z: -4.2 },
          patrolRadius: 4,
        },
      ],
    };
    const enemyForces: Array<{ fx: number; fz: number }> = [];
    let enemyPos = { x: -4.2, y: 0, z: -4.2 };
    let teleportCount = 0;
    const base = makeStubPhysics();
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyEnemyForce(_idx, fx, fz) {
        enemyForces.push({ fx, fz });
      },
      teleportEnemy(_idx, pos) {
        enemyPos = { ...pos };
        teleportCount += 1;
      },
      readEnemy() {
        return {
          position: { ...enemyPos },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: true,
          impactSpeed: 0,
        };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // First step: AI applies force and mutual push on contact
    sim.step(1 / 60, []);
    expect(enemyForces.length).toBeGreaterThan(0);

    // Simulate player knocking Black Marble below killY -> +1000 and permanent elimination (no respawn)
    const beforeFall = teleportCount;
    enemyPos = { x: -4.2, y: level.killY - 1, z: -4.2 };
    const after = sim.step(1 / 60, []);
    expect(teleportCount).toBe(beforeFall);
    expect(after.enemies).toHaveLength(0);
    expect(after.players[0]!.score).toBeGreaterThanOrEqual(1000);
    expect(after.players[0]!.scoreAward?.points).toBe(1000);
  });

  it('emits dizzy on hard landing and wallBounce on horizontal obstacle impact', () => {
    const physics = makeStubPhysics();
    const sim = createRemasterSimulation(makeFlatLevel(), physics);
    sim.skipOpening();
    physics.marbles[0] = {
      position: { x: -5, y: 0, z: -5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 8.5,
      wallImpactSpeed: 6.0,
    };
    const state = sim.step(1 / 60, []);
    expect(state.events).toContainEqual({ type: 'dizzy', player: 1 });
    expect(state.events.some((e) => e.type === 'wallBounce')).toBe(true);
    expect(state.players[0]!.dizzyTimer).toBeGreaterThan(0);
  });

  it('uses the Level 2 ROM controller to steer the Black Marble toward its first patrol node', () => {
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      enemies: [
        {
          id: 'level2-black-marble',
          kind: 'blackMarble',
          position: { x: 30.5, y: 0, z: 25.5 },
          patrolRadius: 3.5,
        },
      ],
    };
    const base = makeStubPhysics();
    let enemyForce = { x: 0, z: 0 };
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyEnemyForce(_index, fx, fz) {
        enemyForce = { x: fx, z: fz };
      },
      readEnemy() {
        return {
          position: { x: 30.5, y: 0, z: 25.5 },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: true,
          impactSpeed: 0,
        };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    sim.step(1 / 30, []);

    expect(enemyForce.x).toBeLessThan(0);
    expect(enemyForce.z).toBe(0);
    expect(sim.snapshot.worms).toHaveLength(4);
    expect(sim.snapshot.worms.every((worm) => Number.isFinite(worm.x))).toBe(
      true,
    );
    expect(sim.snapshot.bridgeStep).toBe(0);
  });

  it('handles Level 2 drawbridge: flat pass, gentle raised push-back, slope roll without hop, and raised exit jump', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from(
        { length: 130 },
        () => [-12.2474, -12.2474, -12.2474, -12.2474] as const,
      ),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      killY: -30,
    };

    const platformY = ((0x3f88 - 0x4000) * Math.sqrt(2 / 3)) / 8;
    const base = makeStubPhysics();
    const physics: RemasterPhysicsBackend = {
      ...base,
      setMarblePosition(idx, pos) {
        base.marbles[idx] = { ...base.marbles[idx], position: { ...pos } };
      },
      setMarbleVelocity(idx, vel) {
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // 1. Bridge starts flat (step 0): marble on deck (cell x=63 => world -2, cell z=58 => world -7)
    // stays flush at platformY (NO +radius float) and preserves horizontal steering velocity.
    base.marbles[0] = {
      position: { x: -2, y: platformY, z: -7 },
      velocity: { x: 1.5, y: 0, z: 6 },
      grounded: false,
      impactSpeed: 0,
    };
    const flatSnap = sim.step(1 / 60, []);
    expect(flatSnap.players[0]!.position.y).toBeCloseTo(platformY, 3);
    expect(flatSnap.players[0]!.velocity.y).toBe(0);
    expect(flatSnap.players[0]!.velocity.x).toBeCloseTo(1.5, 2);
    expect(flatSnap.players[0]!.velocity.z).toBeCloseTo(6, 2);

    // 2. Advance until bridge is raised (~0.5s => step 6): marble on deck does NOT jump upward
    // (vy === 0) and accelerates downhill toward the hinge (+z) under slope gravity.
    for (let k = 0; k < 29; k++) {
      base.marbles[0] = {
        ...base.marbles[0],
        position: { x: -2, y: base.marbles[0].position.y, z: -7 },
        velocity: { x: 0, y: 0, z: 0 },
      };
      sim.step(1 / 60, []);
    }
    const raisedSnap = sim.step(1 / 60, []);
    expect(raisedSnap.bridgeStep).toBe(6);
    expect(raisedSnap.players[0]!.position.y).toBeGreaterThan(platformY + 0.5);
    expect(raisedSnap.players[0]!.velocity.y).toBe(0);
    expect(raisedSnap.players[0]!.velocity.z).toBeGreaterThan(0.1);

    // 3. Exiting off the raised free edge (cell z < 56 => world z < -9) moving -z launches
    // with standard physical ramp tangent vy > 0 (Havok jump).
    base.marbles[0] = {
      position: { x: -2, y: raisedSnap.players[0]!.position.y, z: -9.2 },
      velocity: { x: 0, y: 0, z: -8 },
      grounded: false,
      impactSpeed: 0,
    };
    const jumpSnap = sim.step(1 / 60, []);
    expect(jumpSnap.players[0]!.velocity.y).toBeGreaterThan(2);

    // 4. Approaching the raised free edge from z < 56 (cell z=55.5 => world -9.5) moving +z
    // is gently nudged back (not ejected far away).
    base.marbles[0] = {
      position: { x: -2, y: platformY, z: -9.5 },
      velocity: { x: 0, y: 0, z: 12 },
      grounded: true,
      impactSpeed: 0,
    };
    const pushSnap = sim.step(1 / 60, []);
    expect(pushSnap.players[0]!.velocity.z).toBeLessThan(0);
    expect(Math.abs(pushSnap.players[0]!.velocity.z)).toBeLessThanOrEqual(4.2);
    expect(pushSnap.players[0]!.velocity.y).toBe(0);
  });

  it('shatters on >3-cell drop, makes dizzy with 0.4x slowdown on <3-cell drop, and resets dizzy timer on re-hit', () => {
    const base = makeStubPhysics();
    let lastForceX = 0;
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyPlayerForce(idx, fx, fz) {
        if (idx === 0) lastForceX = fx;
        base.applyPlayerForce(idx, fx, fz);
      },
    };
    const sim = createRemasterSimulation(makeFlatLevel(), physics);
    sim.skipOpening();

    // Airborne at y=2.0 (~2.45 arcade cells) then land at y=0 => dizzy (not shattered)
    base.marbles[0] = {
      position: { x: -5, y: 2.0, z: -5 },
      velocity: { x: 0, y: -2, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);
    base.marbles[0] = {
      position: { x: -5, y: 0, z: -5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 5,
    };
    const dizzySnap = sim.step(1 / 60, []);
    expect(dizzySnap.players[0]!.life).toBe('active');
    expect(dizzySnap.players[0]!.dizzyTimer).toBeCloseTo(
      REMASTER_RULES.dizzyDurationSeconds,
      2,
    );
    expect(dizzySnap.events).toContainEqual({ type: 'dizzy', player: 1 });

    // While dizzy, player input force is scaled by dizzySpeedFactor (0.4x)
    sim.step(0.5, [{ x: 1, z: 0 }]);
    expect(lastForceX).toBeCloseTo(
      REMASTER_PHYSICS.inputAcceleration * REMASTER_RULES.dizzySpeedFactor,
      2,
    );

    // Re-hit while dizzy resets dizzyTimer back to full 1.67s without spamming dizzy SFX
    base.marbles[0] = {
      position: { x: -5, y: 0, z: -5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 8.5,
    };
    const rehit = sim.step(1 / 60, []);
    expect(rehit.players[0]!.dizzyTimer).toBeCloseTo(
      REMASTER_RULES.dizzyDurationSeconds,
      2,
    );
    expect(rehit.events.some((e) => e.type === 'dizzy')).toBe(false);

    // Drop > 3 cells (y=3.2 -> y=0) => shatters
    base.marbles[0] = {
      position: { x: -5, y: 3.2, z: -5 },
      velocity: { x: 0, y: -2, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);
    base.marbles[0] = {
      position: { x: -5, y: 0, z: -5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 4,
    };
    const shatterSnap = sim.step(1 / 60, []);
    expect(shatterSnap.players[0]!.life).toBe('shattered');
    expect(shatterSnap.events).toContainEqual({ type: 'shatter', player: 1 });
  });

  it('prevents Level 2 Black Marble from descending past halfway down the ramp and triggers lunge/bump', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from({ length: 130 }, () => [0, 0, 0, 0] as const),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      enemies: [
        {
          id: 'level2-black-marble',
          kind: 'blackMarble',
          position: { x: 25 - 65, y: 0, z: 35.5 - 65 },
          patrolRadius: 3.5,
        },
      ],
    };
    const base = makeStubPhysics();
    let enemyPos = { x: 25 - 65, y: 0, z: 35.5 - 65 };
    let lastEnemyForce = { x: 0, z: 0 };
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyEnemyForce(_i, fx, fz) {
        lastEnemyForce = { x: fx, z: fz };
      },
      readEnemy() {
        return {
          position: { ...enemyPos },
          velocity: { x: 0, y: 0, z: 0 },
          grounded: true,
          impactSpeed: 0,
        };
      },
      resolveBilliardCollision() {
        return 10.5;
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // 1. At cell x=25, enemy registers reachedPlateau=true; place player 2 cells away => lunge + contact
    base.marbles[0] = {
      position: { x: 23 - 65, y: 0, z: 35.5 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    const contactSnap = sim.step(1 / 60, []);
    expect(contactSnap.events.some((e) => e.type === 'marbleClack')).toBe(true);
    expect(contactSnap.players[0]!.dizzyTimer).toBeCloseTo(
      REMASTER_RULES.dizzyDurationSeconds,
      2,
    );

    // 2. If enemy ever gets pushed past halfway down the ramp (cell x=33 >= 32), it turns back (-x)
    enemyPos = { x: 33 - 65, y: 0, z: 35.5 - 65 };
    base.marbles[0] = {
      position: { x: 45 - 65, y: 0, z: 35.5 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);
    expect(lastEnemyForce.x).toBeLessThan(0);
  });

  it('applies Level 2 green worm collision dizzy stun and knockback', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from(
        { length: 130 },
        () => [-12.2474, -12.2474, -12.2474, -12.2474] as const,
      ),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      killY: -30,
    };
    const platformY = ((0x3f88 - 0x4000) * Math.sqrt(2 / 3)) / 8;
    const base = makeStubPhysics();
    const physics: RemasterPhysicsBackend = {
      ...base,
      setMarbleVelocity(idx, vel) {
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // Advance player onto the 3-tower plateau so worms spawn, then step onto an active worm
    base.marbles[0] = {
      position: { x: 48 - 65, y: platformY, z: 48 - 65 },
      velocity: { x: 2, y: 0, z: 2 },
      grounded: true,
      impactSpeed: 0,
    };
    let snap = sim.step(1 / 30, []);
    const activeWorm = snap.worms.find((w) => w.active);
    if (activeWorm) {
      base.marbles[0] = {
        position: {
          x: activeWorm.x / 8 - 65,
          y: platformY,
          z: activeWorm.z / 8 - 65,
        },
        velocity: { x: 3, y: 0, z: 0 },
        grounded: true,
        impactSpeed: 0,
      };
      snap = sim.step(1 / 30, []);
      expect(snap.players[0]!.dizzyTimer).toBeGreaterThan(0);
    }
  });

  it('captures Level 2 drop-pipe mouth without triggering void fall and keeps void-falling marbles dynamic', () => {
    const platformY = ((0x3f88 - 0x4000) * Math.sqrt(2 / 3)) / 8;
    const cells = Array.from({ length: 130 }, (_, z) =>
      Array.from({ length: 130 }, (_, x) =>
        x >= 62 && x <= 64 && z >= 74 && z <= 79
          ? null
          : ([platformY, platformY, platformY, platformY] as const),
      ),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      killY: -30,
    };
    const base = makeStubPhysics();
    const recordedVels: { x: number; y: number; z: number }[] = [];
    const physics: RemasterPhysicsBackend = {
      ...base,
      setMarbleVelocity(idx, vel) {
        recordedVels.push({ ...vel });
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // Stand near pipe rim to set lastSafe at platformY
    base.marbles[0] = {
      position: { x: 61 - 65, y: platformY, z: 76 - 65 },
      velocity: { x: 2, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);

    // Drop into the drop-pipe mouth (0x3f68, > 2.4 world units below platformY, over null cells)
    const mouthY = ((0x3f68 - 0x4000) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 63.5 - 65, y: mouthY, z: 76.5 - 65 },
      velocity: { x: 4, y: -8, z: 2 },
      grounded: false,
      impactSpeed: 0,
    };
    let snap = sim.step(1 / 60, []);
    // Must NOT die with falling; mouth zeroes horizontal velocity
    expect(snap.players[0]!.life).toBe('active');
    expect(snap.events.some((e) => e.type === 'fall')).toBe(false);
    expect(recordedVels.some((v) => v.x === 0 && v.z === 0)).toBe(true);

    // Drop below mouthFrom (0x3f58) -> enters pipe, plays pipeEnter, hides marble
    const enterY = ((0x3f58 - 0x4000) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 63.5 - 65, y: enterY, z: 76.5 - 65 },
      velocity: { x: 0, y: -12, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.life).toBe('active');
    expect(snap.players[0]!.pipeHidden).toBe(true);
    expect(snap.events.some((e) => e.type === 'pipeEnter')).toBe(true);
    expect(snap.events.some((e) => e.type === 'fall')).toBe(false);

    // Void fall elsewhere keeps marble dynamic (not frozen kinematic) during fall
    const voidLevel = makeFlatLevel();
    const voidPhys = makeStubPhysics();
    const voidSim = createRemasterSimulation(voidLevel, voidPhys);
    voidSim.skipOpening();
    voidPhys.marbles[0] = {
      position: { x: 0, y: voidLevel.killY - 1, z: 0 },
      velocity: { x: 0, y: -10, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    const fallSnap = voidSim.step(1 / 60, []);
    expect(fallSnap.players[0]!.life).toBe('falling');
    expect(voidPhys.kinematic[0]).toBe(false);
  });

  it('interpolates pipe traversal over 1.05 s, preserves non-ice lastSafe, and scales force with agility', () => {
    const platformY = ((0x3f88 - 0x4000) * Math.sqrt(2 / 3)) / 8;
    const cells = Array.from({ length: 130 }, () =>
      Array.from(
        { length: 130 },
        () => [platformY, platformY, platformY, platformY] as const,
      ),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 2,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      killY: -30,
    };
    const base = makeStubPhysics();
    const recordedForces: { fx: number; fz: number }[] = [];
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyPlayerForce(idx, fx, fz) {
        recordedForces.push({ fx, fz });
        base.applyPlayerForce(idx, fx, fz);
      },
      setMarbleVelocity(idx, vel) {
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // 1. Agility scaling + Space boost surge while rolling
    base.marbles[0] = {
      position: { x: 85 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: 4, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    sim.step(1 / 60, [{ x: 1, z: 0, agility: 0.5 }]);
    sim.step(1 / 60, [{ x: 0, z: 0, boost: true, agility: 0.5 }]);
    expect(recordedForces.length).toBe(2);
    expect(recordedForces[0]!.fx).toBeCloseTo(
      REMASTER_PHYSICS.inputAcceleration * 0.5,
      1,
    );
    expect(recordedForces[1]!.fx).toBeGreaterThan(0);

    // 2. Entering Level 2 ice (95, 100) emits iceEnter and does NOT overwrite lastSafe
    const safeBeforeIce = sim.snapshot.players[0]!.lastSafe;
    base.marbles[0] = {
      position: { x: 95 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: 4, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    let snap = sim.step(1 / 60, []);
    expect(snap.events.some((e) => e.type === 'iceEnter')).toBe(true);
    expect(snap.players[0]!.lastSafe).toEqual(safeBeforeIce);

    // Leaving ice emits iceLeave
    base.marbles[0] = {
      position: { x: 85 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: 4, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.events.some((e) => e.type === 'iceLeave')).toBe(true);

    // 2b. Constant-velocity ice glide resists bowl slope deflection, boosts slow entry,
    // and redirects cleanly on a wall bounce.
    base.marbles[0] = {
      position: { x: 95 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: 1.0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBeCloseTo(5.5, 1);
    // Simulate bowl gravity deflecting velocity sideways -> glide restores entry vector
    base.marbles[0] = {
      position: { x: 96 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: 2.0, y: 0, z: 3.0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBeCloseTo(5.5, 1);
    expect(snap.players[0]!.velocity.z).toBeCloseTo(0, 1);
    // Wall bounce on ice redirects the stored glide vector
    base.marbles[0] = {
      position: { x: 97 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: -4.0, y: 0, z: 2.0 },
      grounded: true,
      impactSpeed: 0,
      wallImpactSpeed: 5.0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBeCloseTo(-4.0, 1);
    expect(snap.players[0]!.velocity.z).toBeCloseTo(2.0, 1);
    // Leave ice again before pipe test
    base.marbles[0] = {
      position: { x: 85 - 65, y: platformY, z: 100 - 65 },
      velocity: { x: 4, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);

    // 3. Y-pipe traversal smoothly interpolates for 1.05 s then releases with score
    base.marbles[0] = {
      position: { x: 80.5 - 65, y: platformY, z: 86.5 - 65 },
      velocity: { x: 0, y: 0, z: 4 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    // Mid-traversal (~0.5 s): still hidden and interpolated between entry and exit
    snap = sim.step(0.5, []);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    // Past 1.05 s: released with exit velocity and +2000 score
    snap = sim.step(0.6, []);
    expect(snap.players[0]!.pipeHidden).toBe(false);
    expect(snap.players[0]!.score).toBeGreaterThanOrEqual(2000);
  });

  it('runs Level 3 acid amoeba dissolve, turquoise wave surfing, and copper pipe traversal', () => {
    const waveY = ((16148 - 16384) * Math.sqrt(2 / 3)) / 8;
    const cells = Array.from({ length: 118 }, () =>
      Array.from({ length: 118 }, () => [waveY, waveY, waveY, waveY] as const),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 3,
      heightLayers: [
        {
          id: 'main',
          columns: 118,
          rows: 118,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      spawns: {
        player1: { x: 22.5 - 59, y: waveY, z: 9.5 - 59 },
        player2: { x: 8.5 - 59, y: waveY, z: 23.5 - 59 },
      },
      killY: -40,
    };
    const base = makeStubPhysics();
    const physics: RemasterPhysicsBackend = {
      ...base,
      setMarbleVelocity(idx, vel) {
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // 0. Level 3 spawns its 2 ROM green worms (0x225ba) as scroll passes row 1
    base.marbles[0] = {
      position: { x: 40 - 59, y: waveY, z: 36 - 59 },
      velocity: { x: 1, y: 0, z: 1 },
      grounded: true,
      impactSpeed: 0,
    };
    let snap = sim.step(1 / 30, []);
    for (let i = 0; i < 6; i++) snap = sim.step(1 / 30, []);
    expect(snap.worms.filter((w) => w.active).length).toBe(2);

    // 1. Wave support & 22-tile waveProfile
    base.marbles[0] = {
      position: { x: 82.5 - 59, y: waveY, z: 82.5 - 59 },
      velocity: { x: 0, y: 0, z: 2 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.waveProfile).toHaveLength(22);
    expect(snap.amoebas).toHaveLength(7);

    // Leave wave cleanly
    base.marbles[0] = {
      position: { x: 50 - 59, y: waveY, z: 50 - 59 },
      velocity: { x: 0, y: 0, z: 2 },
      grounded: true,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);

    // 2. Copper funnel pipe mouth -> enter -> smooth 1.05 s traversal -> +4000 pts
    const mouthY = ((0x3fa4 - 16384) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 77.5 - 59, y: mouthY, z: 80.5 - 59 },
      velocity: { x: 4, y: -2, z: 4 },
      grounded: false,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBe(0);

    const enterY = ((0x3f90 - 16384) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 77.5 - 59, y: enterY, z: 80.5 - 59 },
      velocity: { x: 0, y: -4, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.events.some((e) => e.type === 'pipeEnter')).toBe(true);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    snap = sim.step(0.5, []);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    snap = sim.step(0.6, []);
    expect(snap.players[0]!.pipeHidden).toBe(false);
    expect(snap.players[0]!.score).toBeGreaterThanOrEqual(4000);

    // 3. Touching an acid amoeba triggers acidDissolve -> melting -> respawn
    const a0 = snap.amoebas[0]!;
    base.marbles[0] = {
      position: { x: a0.cellX - 59, y: waveY, z: a0.cellZ - 59 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.life).toBe('melting');
    expect(snap.events.some((e) => e.type === 'acidDissolve')).toBe(true);
    snap = sim.step(1.2, []);
    expect(snap.players[0]!.life).toBe('respawning');
    expect(snap.events.some((e) => e.type === 'respawn')).toBe(true);
  });

  it('runs Level 4 vacuums, catapult launch, raised piston/hammer knockback, and suction respawn', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from({ length: 130 }, () => [0, 0, 0, 0] as const),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 4,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      spawns: {
        player1: { x: 10.5 - 65, y: 0, z: 23.5 - 65 },
        player2: { x: 22.5 - 65, y: 0, z: 9.5 - 65 },
      },
      killY: -40,
    };
    const base = makeStubPhysics();
    const appliedForces: { fx: number; fz: number }[] = [];
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyPlayerForce(_idx, fx, fz) {
        appliedForces.push({ fx, fz });
      },
      setMarbleVelocity(idx, vel) {
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    const sim = createRemasterSimulation(level, physics);
    sim.skipOpening();

    // 0. Pistons stay completely idle until a player reaches ROM zone 4/5 (x>=60, z>=50)
    base.marbles[0] = {
      position: { x: 10.5 - 65, y: 0, z: 23.5 - 65 },
      velocity: { x: 8, y: 0, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    let snap = sim.step(1 / 60, []);
    expect(snap.level4?.pistons).toHaveLength(0);
    // Touchdown preserves horizontal jump momentum even if Havok friction tries to brake it
    base.marbles[0] = {
      position: { x: 32 - 65, y: 0, z: 23.5 - 65 },
      velocity: { x: 3, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBeCloseTo(8, 1);

    // 0b. Level 4 frictionless start beams keep the marble centered straight on the rail and cap speed at 10.8 cells/s
    base.marbles[0] = {
      position: { x: 15 - 65, y: 0, z: 23.2 - 65 },
      velocity: { x: 18, y: 0, z: 1.5 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBeCloseTo(10.8, 1);
    expect(snap.players[0]!.velocity.z).toBe(0);
    expect(snap.players[0]!.position.z).toBeCloseTo(23.5 - 65, 2);

    // P2 beam (x=22, z=9..26) centers X and zeroes lateral vx
    base.marbles[0] = {
      position: { x: 22.2 - 65, y: 0, z: 15 - 65 },
      velocity: { x: 1.2, y: 0, z: 14 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.velocity.x).toBe(0);
    expect(snap.players[0]!.velocity.z).toBeCloseTo(10.8, 1);
    expect(snap.players[0]!.position.x).toBeCloseTo(22.5 - 65, 2);

    // 1. Catapult at (63, 70) also enters zone 4/5 (triggering pistons), settles in cup for 0.26 s, then fires lofty lob
    base.marbles[0] = {
      position: { x: 63 - 65, y: 0, z: 70 - 65 },
      velocity: { x: 1, y: 0, z: 1 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(0.1, []);
    expect(snap.events.some((e) => e.type === 'catapult')).toBe(false);
    expect(snap.level4?.pistons.length).toBeGreaterThan(0);
    snap = sim.step(0.2, []);
    expect(snap.events.some((e) => e.type === 'catapult')).toBe(true);
    expect(snap.level4?.catapultFrame).toBeDefined();
    expect(snap.players[0]!.velocity.y).toBeGreaterThan(24);
    expect(snap.players[0]!.velocity.z).toBeLessThan(-10);

    // Advance past catapult animation & into active hammer/vacuum window (t ~ 2.4 s)
    base.marbles[0] = {
      position: { x: 10 - 65, y: 0, z: 10 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    for (let i = 0; i < 48; i++) snap = sim.step(0.05, []);
    expect(snap.level4?.vacuumExtensions).toHaveLength(6);
    expect(snap.level4?.hammerFrames).toHaveLength(4);

    // 2. Active vacuum 0 (39.5, 36.8) pulls nearby marble, then captures at mouth
    base.marbles[0] = {
      position: { x: 39.5 - 65, y: 0, z: 39.2 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    appliedForces.length = 0;
    sim.step(1 / 60, []);
    expect(appliedForces.some((f) => f.fz < -2)).toBe(true);

    base.marbles[0] = {
      position: { x: 39.5 - 65, y: 0, z: 37.0 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.life).toBe('suctioned');
    expect(snap.players[0]!.suctionVacuumIndex).toBe(0);
    expect(snap.events.some((e) => e.type === 'suction')).toBe(true);
    snap = sim.step(1.0, []);
    expect(snap.players[0]!.life).toBe('respawning');
    // Respawning finishes -> active with 1.6 s post-respawn vacuum immunity
    snap = sim.step(REMASTER_RULES.respawnInvulnSeconds + 0.05, []);
    expect(snap.players[0]!.life).toBe('active');
    // Even if placed right next to an active vacuum during the grace window, it is NOT sucked in
    base.marbles[0] = {
      position: { x: 39.5 - 65, y: 0, z: 37.0 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(0.1, []);
    expect(snap.players[0]!.life).toBe('active');
  });

  it('keeps Level 4 Black Marble on its plateau with void-edge guard and never eliminates it on self-fall', () => {
    // Plateau only on x in [61..73], z in [50..54]; void elsewhere
    const cells = Array.from({ length: 130 }, (_, z) =>
      Array.from({ length: 130 }, (_, x) =>
        x >= 61 && x <= 73 && z >= 50 && z <= 54
          ? ([0, 0, 0, 0] as const)
          : null,
      ),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 4,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      spawns: {
        player1: { x: 65 - 65, y: 0, z: 52 - 65 },
        player2: { x: 66 - 65, y: 0, z: 52 - 65 },
      },
      enemies: [
        {
          id: 'level4-black-marble',
          kind: 'blackMarble',
          position: { x: 64.5 - 65, y: 0, z: 51.5 - 65 },
          patrolRadius: 1.8,
        },
      ],
      killY: -10,
    };
    const base = makeStubPhysics();
    let enemyPos = { x: 64.5 - 65, y: 0, z: 50.2 - 65 };
    let lastEnemyForce = { x: 0, z: 0 };
    let teleportCount = 0;
    const physics: RemasterPhysicsBackend = {
      ...base,
      applyEnemyForce(_i, fx, fz) {
        lastEnemyForce = { x: fx, z: fz };
      },
      teleportEnemy(_i, pos) {
        teleportCount += 1;
        enemyPos = { ...pos };
      },
      readEnemy() {
        return {
          position: { ...enemyPos },
          velocity: { x: 0, y: 0, z: -2 },
          grounded: true,
          impactSpeed: 0,
        };
      },
    };
    const sim = createRemasterSimulation(level, physics, false, () => 0.5);
    sim.skipOpening();

    // 1. Unbumped near the z=50 void edge: first step reads enemyPos into enemy.position,
    // second step triggers the void-edge guard and pulls strongly inward (+Z toward 51.5).
    enemyPos = { x: 64.5 - 65, y: 0, z: 50.2 - 65 };
    base.marbles[0] = {
      position: { x: 70 - 65, y: 0, z: 52 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);
    sim.step(1 / 60, []);
    expect(lastEnemyForce.z).toBeGreaterThan(20);

    // 2. If unbumped enemy somehow drops below killY, it is restored to home (NOT eliminated!)
    enemyPos = { x: 64.5 - 65, y: -15, z: 48 - 65 };
    const snap = sim.step(1 / 60, []);
    expect(snap.enemies).toHaveLength(1);
    expect(teleportCount).toBeGreaterThanOrEqual(2);
  });

  it('inflicts subtle bump + 2.0 s dizzy when struck by a Level 4 wooden hammer', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from({ length: 130 }, () => [0, 0, 0, 0] as const),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 4,
      heightLayers: [
        {
          id: 'main',
          columns: 130,
          rows: 130,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      killY: -40,
    };
    const base = makeStubPhysics();
    const physics: RemasterPhysicsBackend = {
      ...base,
      setMarbleVelocity(idx, vel) {
        base.marbles[idx] = { ...base.marbles[idx], velocity: { ...vel } };
      },
    };
    // random() = 0 -> hammer pattern 0 (all 4 swing immediately; at t = 0.6 s -> frame 9)
    const sim = createRemasterSimulation(level, physics, false, () => 0);
    sim.skipOpening();
    sim.step(0.6, []);

    base.marbles[0] = {
      position: { x: 104.2 - 65, y: 0, z: 102.5 - 65 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    const snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.dizzyTimer).toBeCloseTo(2.0, 2);
    expect(snap.events.some((e) => e.type === 'dizzy')).toBe(true);
    expect(snap.events.some((e) => e.type === 'marbleClack')).toBe(true);
    expect(Math.abs(snap.players[0]!.velocity.x)).toBeLessThanOrEqual(5.5);
  });

  it('runs Level 5 miniature squashes (+1000) and flying bird strikes (shatter)', () => {
    const cells = Array.from({ length: 141 }, () =>
      Array.from({ length: 141 }, () => [0, 0, 0, 0] as const),
    );
    const level: RemasterLevelV1 = {
      ...makeFlatLevel(),
      courseIndex: 5,
      direction: -1,
      heightLayers: [
        {
          id: 'main',
          columns: 141,
          rows: 141,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      spawns: {
        player1: { x: 125.5 - 70.5, y: 0, z: 124.5 - 70.5 },
        player2: { x: 123.5 - 70.5, y: 0, z: 126.5 - 70.5 },
      },
      killY: -40,
    };
    const base = makeStubPhysics();
    const sim = createRemasterSimulation(level, base, false, () => 0.5);
    sim.skipOpening();

    let snap = sim.step(1 / 60, []);
    expect(snap.level5Actors).toHaveLength(19);

    // 1. Roll over a miniature Silly -> +3 SEC time bonus, +500 score & marbleClack SFX
    const timeBefore = snap.players[0]!.remainingTime;
    const mini = snap.level5Actors.find((a) => a.kind === 'black')!;
    base.marbles[0] = {
      position: { x: mini.x / 8 - 70.5, y: 0, z: mini.z / 8 - 70.5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.remainingTime).toBeGreaterThan(timeBefore + 2.5);
    expect(snap.players[0]!.timeBonusTimer).toBeGreaterThan(1.0);
    expect(snap.players[0]!.score).toBeGreaterThanOrEqual(500);
    expect(snap.events.some((e) => e.type === 'miniSquash')).toBe(true);

    // 2. Red inverted Y-pipe at (89, 90, h=16244) -> hides marble, plays pipeEnter, exits at upper outlet
    const pipeEntryY = ((16244 - 16384) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 89 - 70.5, y: pipeEntryY, z: 90 - 70.5 },
      velocity: { x: 0, y: 0, z: -2 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    expect(snap.events.some((e) => e.type === 'pipeEnter')).toBe(true);
    snap = sim.step(0.4, []);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    snap = sim.step(0.5, []);
    expect(snap.players[0]!.pipeHidden).toBe(false);
    expect(snap.players[0]!.velocity.z).toBeLessThan(-4);

    // 3. Bidirectional Escher '?' seam: exact (+6, +6, +48) / (-6, -6, -48) isometric ray shift
    const escherY = ((16368 - 16384) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 28.2 - 70.5, y: escherY, z: 16.0 - 70.5 },
      velocity: { x: -3, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.position.x).toBeCloseTo(34.2 - 70.5, 1);
    expect(snap.players[0]!.position.z).toBeCloseTo(22.0 - 70.5, 1);
    // Turning back on the upper bridge after cooldown shifts by (-6, -6, -48)
    sim.step(0.5, []);
    const upperY = ((16416 - 16384) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 34.95 - 70.5, y: upperY, z: 22.5 - 70.5 },
      velocity: { x: 3, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.position.x).toBeCloseTo(28.95 - 70.5, 1);
    expect(snap.players[0]!.position.y).toBeCloseTo(escherY, 2);
    expect(snap.players[0]!.position.z).toBeCloseTo(16.5 - 70.5, 1);

    // 4. Collide with a flying bird -> special birdDead state (NO broom!)
    const bird = snap.level5Actors.find(
      (a) => a.kind === 'bird' && a.state === 1,
    )!;
    base.marbles[0] = {
      position: { x: bird.x / 8 - 70.5, y: 0, z: bird.z / 8 - 70.5 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.life).toBe('birdDead');
    expect(snap.events.some((e) => e.type === 'birdDeath')).toBe(true);
  });

  it('runs Level 6 disappearing maze phases, acid amoeba dissolve, and Black Marble', () => {
    const cells = Array.from({ length: 122 }, () =>
      Array.from({ length: 122 }, () => [0, 0, 0, 0] as const),
    );
    const level: RemasterLevelV1 = {
      format: 'remaster-level-v1',
      id: 'level6',
      name: 'Ultimate Race',
      courseIndex: 6,
      timerSeconds: 65,
      direction: 1,
      heightLayers: [
        {
          id: 'main-terrain',
          columns: 122,
          rows: 122,
          origin: { x: 0, z: 0 },
          cells,
          defaultSurface: 'stone',
        },
      ],
      volumes: [],
      surfaceZones: [],
      enemies: [
        {
          id: 'level6-black-marble',
          kind: 'blackMarble',
          position: { x: 79.5 - 61, y: 0, z: 83.5 - 61 },
          patrolRadius: 2.2,
        },
      ],
      spawns: {
        player1: { x: 11.5 - 61, y: 0, z: 16.5 - 61 },
        player2: { x: 11.5 - 61, y: 0, z: 22.5 - 61 },
      },
      goal: { minX: 27, maxX: 31, minZ: 27, maxZ: 37, y: 0 },
      killY: -10,
    };
    const phasesSeen: number[] = [];
    const base = makeStubPhysics();
    const physics = {
      ...base,
      setLevel6MazePhase(phase: 0 | 1 | 2 | 3) {
        phasesSeen.push(phase);
      },
    };
    const sim = createRemasterSimulation(level, physics, false, () => 0.5);
    sim.skipOpening();

    // Advance past 41 frames (0.6833 s) -> maze transitions from phase 0 to phase 1
    let snap = sim.step(0.75, []);
    expect(snap.level6MazePhase).toBe(1);
    expect(phasesSeen).toContain(1);
    expect(snap.amoebas).toHaveLength(4);
    expect(snap.enemies).toHaveLength(1);

    // Drop into the 2x2 golden square pit (tag 0x25) -> pipeEnter + shoots out of golden wedge tunnel
    const pitY = ((16352 - 16384) * Math.sqrt(2 / 3)) / 8;
    base.marbles[0] = {
      position: { x: 22.5 - 61, y: pitY, z: 31.5 - 61 },
      velocity: { x: 0, y: -2, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.events.some((e) => e.type === 'pipeEnter')).toBe(true);
    expect(snap.players[0]!.pipeHidden).toBe(true);
    snap = sim.step(0.8, []);
    expect(snap.players[0]!.pipeHidden).toBe(false);
    expect(snap.players[0]!.position.x).toBeCloseTo(30.8 - 61, 1);

    // Move onto a Level 6 acid amoeba -> triggers melting + acidDissolve event
    const amoeba = snap.amoebas[0]!;
    base.marbles[0] = {
      position: { x: amoeba.cellX - 61, y: 0, z: amoeba.cellZ - 61 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.life).toBe('melting');
    expect(snap.events.some((e) => e.type === 'acidDissolve')).toBe(true);

    // Reset restores maze phase to 0
    snap = sim.reset();
    expect(snap.level6MazePhase).toBe(0);

    // Timer freeze toggle (KeyT dev mode) pauses countdown without losing remaining time
    sim.skipOpening();
    const beforeFreeze = sim.snapshot.remainingTime;
    sim.setTimerFrozen(true);
    snap = sim.step(2.0, []);
    expect(snap.remainingTime).toBe(beforeFreeze);
    sim.setTimerFrozen(false);
    snap = sim.step(1.0, []);
    expect(snap.remainingTime).toBeLessThan(beforeFreeze);

    // Falling from an upper plateau (y=0) and shattering on a lower plateau (y=-3.27)
    // must keep lastSafe at the upper elevation (never overwrite lastSafe on impact!)
    base.marbles[0] = {
      position: { x: 11.5 - 61, y: 0, z: 16.5 - 61 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    snap = sim.step(1 / 60, []);
    const upperSafeY = snap.players[0]!.lastSafe.y;
    base.marbles[0] = {
      position: { x: 11.5 - 61, y: -1.5, z: 16.5 - 61 },
      velocity: { x: 0, y: -8, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    sim.step(1 / 60, []);
    base.marbles[0] = {
      position: { x: 11.5 - 61, y: -3.27, z: 16.5 - 61 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 14,
    };
    snap = sim.step(1 / 60, []);
    expect(snap.players[0]!.life).toBe('shattered');
    expect(snap.players[0]!.lastSafe.y).toBeCloseTo(upperSafeY, 2);

    // Black Marble dropping onto a lower plateau (>= shatterDropWorldY) shatters
    // immediately and is permanently eliminated (never stays alive below).
    let enemySnap: PhysicsMarbleSnapshot = {
      position: { x: 80 - 61, y: -3.27, z: 82 - 61 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    const enemyPhysics: RemasterPhysicsBackend = {
      ...base,
      applyEnemyForce: () => {},
      teleportEnemy: (_idx, pos) => {
        enemySnap = { ...enemySnap, position: { ...pos } };
      },
      readEnemy: () => enemySnap,
    };
    const enemySim = createRemasterSimulation(
      level,
      enemyPhysics,
      false,
      () => 0.25,
    );
    enemySim.skipOpening();
    // Grounded on upper deck (y = -3.27)
    enemySim.step(1 / 60, []);
    // Airborne falling off edge
    enemySnap = {
      position: { x: 83 - 61, y: -4.8, z: 82 - 61 },
      velocity: { x: 0, y: -9, z: 0 },
      grounded: false,
      impactSpeed: 0,
    };
    enemySim.step(1 / 60, []);
    // Lands on lower maze floor (y = -6.95, drop = 3.68 >= shatterDropWorldY)
    enemySnap = {
      position: { x: 83 - 61, y: -6.95, z: 82 - 61 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    };
    const shatterSnap = enemySim.step(1 / 60, []);
    expect(shatterSnap.events.some((e) => e.type === 'shatter')).toBe(true);
    expect(shatterSnap.enemies[0]?.shattered).toBe(true);
    // After the brief shatter burst (0.65 s), the Black Marble is permanently gone
    const goneSnap = enemySim.step(0.7, []);
    expect(goneSnap.enemies).toHaveLength(0);
  });
});
