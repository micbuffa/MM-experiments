import { describe, expect, it } from 'vitest';
import {
  createLevel5ActorsState,
  isInsideLevel5EscherReturn,
  isInsideLevel5EscherTeleport,
  isInsideLevel5RedPipeEntry,
  readLevel5ActorsSnapshot,
  stepLevel5Actors,
} from './level5Mechanics';
import { LEVEL5_BIRD_LANES, LEVEL5_SILLY_ARENA } from './level5RomData';

describe('Level 5 Silly Race mechanics', () => {
  it('spawns 9 miniature Sillies inside the arena and 10 flying birds across the 5 ROM lanes', () => {
    const state = createLevel5ActorsState(() => 0.5);
    const snap = readLevel5ActorsSnapshot(state);
    expect(snap).toHaveLength(19);
    expect(snap.filter((a) => a.kind === 'black')).toHaveLength(3);
    expect(snap.filter((a) => a.kind === 'worm')).toHaveLength(3);
    expect(snap.filter((a) => a.kind === 'acid')).toHaveLength(3);
    expect(snap.filter((a) => a.kind === 'bird')).toHaveLength(10);
    expect(LEVEL5_BIRD_LANES).toHaveLength(5);
  });

  it('squashes miniature Sillies on grounded player contact for +1000 points and fades them after 3 s', () => {
    let seed = 0.07;
    const rng = () => {
      seed = (seed + 0.19) % 1;
      return seed;
    };
    const state = createLevel5ActorsState(rng);
    const target = state.minis[0]!;
    const out = stepLevel5Actors(
      state,
      [
        {
          playerIndex: 0,
          cellX: target.x,
          cellZ: target.z,
          grounded: true,
          active: true,
          immune: false,
        },
      ],
      1 / 60,
      rng,
    );
    expect(out.squashes).toContainEqual({
      playerIndex: 0,
      kind: target.kind,
      timeBonusSeconds: LEVEL5_SILLY_ARENA.squashTimeBonusSeconds,
      score: LEVEL5_SILLY_ARENA.squashScore,
    });
    const squashedActor = out.actors.find((a) => a.id === target.id)!;
    expect(squashedActor.state).toBe(2);
    expect(squashedActor.squash).toBeGreaterThanOrEqual(0);

    // After > 3 s squashed miniature disappears from snapshot
    const faded = stepLevel5Actors(state, [], 3.2, () => 0.5);
    expect(faded.actors.find((a) => a.id === target.id)).toBeUndefined();
  });

  it('flies birds along -Z, triggers birdHit + yellow spark explosion on contact, and respawns after explosion', () => {
    const state = createLevel5ActorsState(() => 0.5);
    const bird = state.birds[0]!;
    const initialZ = bird.z;

    // Step forward: bird moves toward -Z
    stepLevel5Actors(state, [], 0.2, () => 0.5);
    expect(bird.z).toBeLessThan(initialZ);

    // Immune player is NOT hit by bird
    const safeOut = stepLevel5Actors(
      state,
      [
        {
          playerIndex: 0,
          cellX: bird.x,
          cellZ: bird.z,
          grounded: true,
          active: true,
          immune: true,
        },
      ],
      1 / 60,
      () => 0.5,
    );
    expect(safeOut.birdHits).toHaveLength(0);

    // Non-immune player is struck -> birdHit + bird enters state 2 (flash -> numeric spark -> respawn)
    const hitOut = stepLevel5Actors(
      state,
      [
        {
          playerIndex: 0,
          cellX: bird.x,
          cellZ: bird.z,
          grounded: true,
          active: true,
          immune: false,
        },
      ],
      1 / 60,
      () => 0.5,
    );
    expect(hitOut.birdHits).toEqual([0]);
    const flashing = hitOut.actors.find((a) => a.id === bird.id)!;
    expect(flashing.state).toBe(2);
    expect(flashing.birdSpark).toBe('flash');

    // Mid-explosion (0.30 s): numeric spark stage 1/3..1
    const exploding = stepLevel5Actors(state, [], 0.3, () => 0.5);
    const expActor = exploding.actors.find((a) => a.id === bird.id)!;
    expect(typeof expActor.birdSpark).toBe('number');

    // Past explosion (0.25 s) -> hidden respawn delay (state 0), then respawns at startZ
    stepLevel5Actors(state, [], 0.25, () => 0.5);
    expect(bird.state).toBe(0);
    stepLevel5Actors(state, [], 1.5, () => 0.5);
    expect(bird.state).toBe(1);
    expect(bird.z).toBeCloseTo(bird.startZ, 1);
  });

  it('bounces wandering miniatures cleanly off all four Silly Arena boundaries', () => {
    const state = createLevel5ActorsState(() => 0.5);
    state.minis[0]!.x = LEVEL5_SILLY_ARENA.minX - 1;
    state.minis[0]!.vx = -2;
    state.minis[1]!.x = LEVEL5_SILLY_ARENA.maxX + 1;
    state.minis[1]!.vx = 2;
    state.minis[2]!.z = LEVEL5_SILLY_ARENA.minZ - 1;
    state.minis[2]!.vz = -2;
    state.minis[3]!.z = LEVEL5_SILLY_ARENA.maxZ + 1;
    state.minis[3]!.vz = 2;
    state.minis[4]!.turnTimer = 0;

    stepLevel5Actors(state, [], 0.05, () => 0.25);
    expect(state.minis[0]!.vx).toBeGreaterThan(0);
    expect(state.minis[1]!.vx).toBeLessThan(0);
    expect(state.minis[2]!.vz).toBeGreaterThan(0);
    expect(state.minis[3]!.vz).toBeLessThan(0);
  });

  it('detects the red inverted Y-pipe entry (89,90) and Escher ? teleport seam (29..31, 15..17)', () => {
    expect(isInsideLevel5RedPipeEntry(89, 90, 16244)).toBe(true);
    expect(isInsideLevel5RedPipeEntry(89, 90, 16308)).toBe(false);
    expect(isInsideLevel5RedPipeEntry(50, 50, 16244)).toBe(false);

    expect(isInsideLevel5EscherTeleport(28.2, 16, 16368)).toBe(true);
    expect(isInsideLevel5EscherTeleport(28.2, 16, 16416)).toBe(false);
    expect(isInsideLevel5EscherTeleport(50, 50, 16368)).toBe(false);

    expect(isInsideLevel5EscherReturn(34.95, 22.5, 16416)).toBe(true);
    expect(isInsideLevel5EscherReturn(34.95, 22.5, 16368)).toBe(false);
    expect(isInsideLevel5EscherReturn(50, 50, 16416)).toBe(false);
  });
});
