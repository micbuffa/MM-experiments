import { describe, expect, it } from 'vitest';
import type { RemasterLevelV1, Vec3 } from '../levels/remasterLevel';
import {
  createRemasterSimulation,
  type PhysicsMarbleSnapshot,
  type RemasterPhysicsBackend,
} from './remasterSimulation';
import { isIceAtWorld } from './romSurfaceZones';
import { surfaceLinearDamping } from './surfaceRules';

const size = 130;
const toWorld = (cell: number) => cell - size / 2 + 0.5;

/** Flat 130 x 130 Beginner Race stand-in (course 2, origin 0). */
function makeBeginnerLevel(): RemasterLevelV1 {
  const cells = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => [0, 0, 0, 0] as const),
  );
  return {
    format: 'remaster-level-v1',
    id: 'test-beginner',
    name: 'Test Beginner',
    courseIndex: 2,
    timerSeconds: 60,
    direction: 1,
    heightLayers: [
      {
        id: 'main',
        columns: size,
        rows: size,
        origin: { x: 0, z: 0 },
        cells,
        defaultSurface: 'stone',
      },
    ],
    volumes: [],
    spawns: {
      player1: { x: toWorld(80), y: 0, z: toWorld(100) },
      player2: { x: toWorld(80), y: 0, z: toWorld(102) },
    },
    goal: { minX: 60, maxX: 61, minZ: 60, maxZ: 61, y: 0 },
    killY: -50,
  };
}

/**
 * Point-mass stand-in for Havok: integrates player force, then applies the
 * same surface damping as the real backend after each step.
 */
function makeSlidingPhysics(level: RemasterLevelV1) {
  const marble: { snapshot: PhysicsMarbleSnapshot } = {
    snapshot: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      grounded: true,
      impactSpeed: 0,
    },
  };
  let force: Vec3 = { x: 0, y: 0, z: 0 };
  let damping = 0;
  const forces: Vec3[] = [];
  const backend: RemasterPhysicsBackend = {
    applyPlayerForce(i, fx, fz) {
      if (i === 0) force = { x: fx, y: 0, z: fz };
    },
    teleportMarble(i, position) {
      if (i !== 0) return;
      marble.snapshot = {
        ...marble.snapshot,
        position: { ...position },
        velocity: { x: 0, y: 0, z: 0 },
      };
    },
    setMarbleKinematic() {},
    step(dt) {
      forces.push(force);
      const m = marble.snapshot;
      const decay = Math.max(0, 1 - damping * dt);
      const vx = (m.velocity.x + force.x * dt) * decay;
      const vz = (m.velocity.z + force.z * dt) * decay;
      const position = {
        x: m.position.x + vx * dt,
        y: 0,
        z: m.position.z + vz * dt,
      };
      marble.snapshot = { ...m, position, velocity: { x: vx, y: 0, z: vz } };
      force = { x: 0, y: 0, z: 0 };
      damping = surfaceLinearDamping(
        isIceAtWorld(level, position.x, position.z) ? 'ice' : 'normal',
        true,
      );
    },
    readMarble() {
      return marble.snapshot;
    },
  };
  return { backend, marble, forces };
}

function place(
  marble: { snapshot: PhysicsMarbleSnapshot },
  cellX: number,
  cellZ: number,
  velocity: Vec3,
) {
  marble.snapshot = {
    position: { x: toWorld(cellX), y: 0, z: toWorld(cellZ) },
    velocity,
    grounded: true,
    impactSpeed: 0,
  };
}

const dt = 1 / 60;
const steerNorth = [{ x: 0, z: 1 }];

describe('Beginner Race ice in the simulation', () => {
  it('steers normally before the ice', () => {
    const level = makeBeginnerLevel();
    const { backend, forces } = makeSlidingPhysics(level);
    const sim = createRemasterSimulation(level, backend);
    sim.skipOpening();
    sim.step(dt, steerNorth);
    expect(forces.at(-1)!.z).toBeGreaterThan(0);
  });

  it('ignores input and keeps speed and direction while on the ice', () => {
    const level = makeBeginnerLevel();
    const { backend, marble, forces } = makeSlidingPhysics(level);
    const sim = createRemasterSimulation(level, backend);
    sim.skipOpening();
    // Marble already sliding east inside the zone (x 90..105, z 94..107).
    place(marble, 91, 100, { x: 4, y: 0, z: 0 });
    sim.step(dt, []); // reads the new position
    for (let i = 0; i < 120; i++) {
      const state = sim.step(dt, steerNorth);
      const p = state.players[0]!;
      if (!isIceAtWorld(level, p.position.x, p.position.z)) break;
      expect(forces.at(-1)).toEqual({ x: 0, y: 0, z: 0 });
      expect(p.velocity.x).toBeCloseTo(4, 10);
      expect(p.velocity.z).toBe(0);
    }
  });

  it('applies the entry frame input, then locks steering on the next frame', () => {
    const level = makeBeginnerLevel();
    const { backend, marble, forces } = makeSlidingPhysics(level);
    const sim = createRemasterSimulation(level, backend);
    sim.skipOpening();
    // West of the zone, rolling east at 50 cells/s (about 0.8 cell per step).
    place(marble, 88, 100, { x: 50, y: 0, z: 0 });
    const before = sim.step(dt, []).players[0]!;
    expect(isIceAtWorld(level, before.position.x, before.position.z)).toBe(
      false,
    );
    // The input of the crossing step is read on normal ground, as in the ROM
    // (FUN_17F66 runs before the zone scan of the same frame).
    const entry = sim.step(dt, steerNorth).players[0]!;
    expect(forces.at(-1)!.z).toBeGreaterThan(0);
    expect(isIceAtWorld(level, entry.position.x, entry.position.z)).toBe(true);
    sim.step(dt, steerNorth);
    expect(forces.at(-1)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('gives control back on the first step after leaving the ice', () => {
    const level = makeBeginnerLevel();
    const { backend, marble, forces } = makeSlidingPhysics(level);
    const sim = createRemasterSimulation(level, backend);
    sim.skipOpening();
    place(marble, 104, 100, { x: 30, y: 0, z: 0 });
    sim.step(dt, []);
    let left = false;
    for (let i = 0; i < 60 && !left; i++) {
      const p = sim.step(dt, steerNorth).players[0]!;
      left = !isIceAtWorld(level, p.position.x, p.position.z);
      if (!left) expect(forces.at(-1)).toEqual({ x: 0, y: 0, z: 0 });
    }
    expect(left).toBe(true);
    const after = sim.step(dt, steerNorth).players[0]!;
    expect(forces.at(-1)!.z).toBeGreaterThan(0);
    expect(after.velocity.z).toBeGreaterThan(0);
    // Normal ground damping is back as well.
    expect(after.velocity.x).toBeLessThan(30);
  });
});
