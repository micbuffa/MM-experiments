import { describe, expect, it } from 'vitest';
import {
  bumpEnemyMarble,
  clampEnemyVelocity,
  closestLinkSlot,
  createEnemyMarbleState,
  ENEMY_MODE_CODE,
  enemyFellOff,
  landsOn,
  nearestNodeIndex,
  nodeAt,
  nodeCentre,
  octagonalDistance,
  octagonalNorm,
  stepEnemyMarble,
  type EnemyMarbleState,
  type EnemyPlayerView,
  type EnemySelfView,
} from './blackMarbleController';
import {
  ARCADE_TICK_SECONDS,
  LEVEL2_BLACK_MARBLE,
  LEVEL2_SECOND_MARBLE,
} from './blackMarbleRom';

const black = LEVEL2_BLACK_MARBLE;
const second = LEVEL2_SECOND_MARBLE;
const TICK = ARCADE_TICK_SECONDS;
/** 1 arcade unit per tick in cells/s. */
const UNIT = 30 / 8;

function at(
  nodeIndex: number,
  extra: Partial<EnemySelfView> = {},
): EnemySelfView {
  const c = nodeCentre(nodeAt(black, nodeIndex));
  return { x: c.x, z: c.z, vx: 0, vz: 0, airborne: false, ...extra };
}

function self(
  x: number,
  z: number,
  extra: Partial<EnemySelfView> = {},
): EnemySelfView {
  return { x, z, vx: 0, vz: 0, airborne: false, ...extra };
}

function player(
  x: number,
  z: number,
  extra: Partial<EnemyPlayerView> = {},
): EnemyPlayerView {
  return {
    x,
    z,
    active: true,
    zone: 1,
    airborne: false,
    targetable: true,
    ...extra,
  };
}

const nobody: EnemyPlayerView[] = [player(27.5, 13.5, { zone: 0 })];

function tick(
  state: EnemyMarbleState,
  me: EnemySelfView,
  players: readonly EnemyPlayerView[] = nobody,
  spec = black,
) {
  return stepEnemyMarble(spec, state, me, players, TICK);
}

describe('enemy marble AI – spawn and patrol (0x20)', () => {
  it('spawns in patrol at node 0 with the give-up timer disarmed', () => {
    const s = createEnemyMarbleState();
    expect(s).toMatchObject({ mode: 'patrol', nodeIndex: 0, giveUpTicks: -1 });
    expect(ENEMY_MODE_CODE[s.mode]).toBe(0x20);
  });

  it('follows links[0] from node to node: up the corridor then the plateau loop', () => {
    let state = createEnemyMarbleState();
    const visited: number[] = [];
    for (let i = 0; i < 10; i++) {
      state = tick(state, at(state.nodeIndex), nobody).state;
      visited.push(state.nodeIndex);
    }
    expect(visited).toEqual([1, 8, 7, 6, 5, 2, 3, 4, 5, 2]);
    expect(state.mode).toBe('patrol');
    expect(state.speed).toBe(7);
  });

  it('keeps its node and speed while travelling between nodes', () => {
    const start = tick(createEnemyMarbleState(), at(0)).state;
    const out = tick(start, self(39.5, 35.5, { vx: -10 }));
    expect(out.state.nodeIndex).toBe(1);
    expect(out.steeringTarget).toEqual({ x: 36.5, z: 35.5 });
    expect(out.desiredVelocity.x).toBeCloseTo(-7 * UNIT);
    expect(out.desiredVelocity.z).toBeCloseTo(0);
  });

  it('ignores players outside its zone (the lower descent boundary)', () => {
    const state = tick(createEnemyMarbleState(), at(0)).state;
    const below = [player(31.5, 35.5, { zone: 2 })];
    expect(tick(state, self(33, 35.5), below).state.mode).toBe('patrol');
  });

  it('ignores airborne, inactive or non-rolling players', () => {
    const state = tick(createEnemyMarbleState(), at(0)).state;
    for (const p of [
      player(37, 35.5, { airborne: true }),
      player(37, 35.5, { active: false }),
      player(37, 35.5, { targetable: false }),
    ]) {
      expect(tick(state, self(38, 35.5), [p]).state.mode).toBe('patrol');
    }
  });
});

describe('enemy marble AI – chase (0x22) and attack (0x21)', () => {
  it('chases through the graph when the player is in its zone but 5+ cells away', () => {
    const state = { ...createEnemyMarbleState(), nodeIndex: 2 };
    const out = tick(state, at(2), [player(19.5, 26.5)]);
    expect(out.state.mode).toBe('chase');
    expect(out.state.speed).toBe(8);
    // From node 2 the link closest to cell (19,26) is node 4 (19,31): 80 vs 82 for node 3.
    expect(out.state.nodeIndex).toBe(4);
  });

  it('switches to attack within 40 units and steers straight at the player', () => {
    const state = {
      ...createEnemyMarbleState(),
      nodeIndex: 6,
      mode: 'chase' as const,
    };
    const p = player(20.2, 33.1);
    const out = tick(state, self(22.6, 34.4), [p]);
    expect(out.state.mode).toBe('attack');
    expect(out.state.speed).toBe(12);
    expect(out.steeringTarget).toEqual({ x: 20.2, z: 33.1 });
    expect(out.desiredVelocity.x).toBeLessThan(0);
    expect(out.desiredVelocity.z).toBeLessThan(0);
  });

  it('does not attack while airborne and produces no steering in the air', () => {
    const state = { ...createEnemyMarbleState(), nodeIndex: 6 };
    const out = tick(state, self(22.6, 34.4, { airborne: true }), [
      player(21, 34),
    ]);
    expect(out.state.mode).toBe('chase');
    expect(out.acceleration).toEqual({ x: 0, z: 0 });
    expect(out.desiredForce).toEqual({ x: 0, z: 0 });
  });

  it('targets player 2 only when both are eligible and P2 is further down', () => {
    const state = { ...createEnemyMarbleState(), nodeIndex: 2 };
    const p1 = player(19.5, 26.5);
    const p2 = player(23.5, 33.5);
    expect(tick(state, at(2), [p1, p2]).state.targetPlayer).toBe(1);
    expect(tick(state, at(2), [p2, p1]).state.targetPlayer).toBe(0);
    expect(
      tick(state, at(2), [p1, { ...p2, zone: 2 }]).state.targetPlayer,
    ).toBe(0);
  });

  it('slows to 1 unit/tick once within half a cell of its steering target', () => {
    const state = {
      ...createEnemyMarbleState(),
      nodeIndex: 6,
      mode: 'attack' as const,
    };
    const out = tick(state, self(22.6, 34.6), [player(22.7, 34.7)]);
    expect(out.state.speed).toBe(1);
  });
});

describe('enemy marble AI – return (0x23)', () => {
  it('leaves attack for return when the player crosses into zone 2', () => {
    const attacking = {
      ...createEnemyMarbleState(),
      nodeIndex: 8,
      mode: 'attack' as const,
    };
    const out = tick(attacking, self(29.2, 35.4), [
      player(31.2, 35.5, { zone: 2 }),
    ]);
    expect(out.state.mode).toBe('return');
    expect(out.state.speed).toBe(7);
    expect(out.state.nodeIndex).toBe(8); // nearest node to (29,35)
  });

  it('re-targets the nearest node every tick, then patrols on arrival', () => {
    let state: EnemyMarbleState = {
      ...createEnemyMarbleState(),
      mode: 'return',
      nodeIndex: 0,
    };
    state = tick(state, self(25.2, 34.9)).state;
    expect(state).toMatchObject({ mode: 'return', nodeIndex: 10 });
    state = tick(state, self(25.6, 34.2)).state;
    expect(state.mode).toBe('patrol');
    expect(state.nodeIndex).toBe(7); // links[0] of node 10
  });

  it('a marble contact arms the give-up timer once and sends it back to the graph', () => {
    const state = {
      ...createEnemyMarbleState(),
      mode: 'attack' as const,
      nodeIndex: 6,
    };
    const bumped = bumpEnemyMarble(black, state, { x: 30.4, z: 35.5 });
    expect(bumped).toMatchObject({
      mode: 'return',
      giveUpTicks: 150,
      nodeIndex: 8,
    });
    const again = bumpEnemyMarble(
      black,
      { ...bumped, giveUpTicks: 40 },
      { x: 30.4, z: 35.5 },
    );
    expect(again.giveUpTicks).toBe(40);
  });
});

describe('enemy marble AI – give-up timer ($6c)', () => {
  it('counts down 150 ticks then abandons a chase', () => {
    let state: EnemyMarbleState = {
      ...createEnemyMarbleState(),
      mode: 'chase',
      nodeIndex: 3,
      giveUpTicks: 2,
    };
    const far = [player(19.5, 26.5)];
    state = tick(state, self(24.1, 31.3), far).state;
    expect(state).toMatchObject({ giveUpTicks: 1, mode: 'chase' });
    state = tick(state, self(24.1, 31.3), far).state;
    expect(state.giveUpTicks).toBe(0);
    expect(state.mode).toBe('return');
  });

  it('after giving up the black marble only patrols, even at close range', () => {
    const state = { ...createEnemyMarbleState(), nodeIndex: 6, giveUpTicks: 0 };
    expect(tick(state, self(22.6, 34.4), [player(21, 34)]).state.mode).toBe(
      'patrol',
    );
    expect(tick(state, self(22.6, 34.4), [player(19.5, 26.5)]).state.mode).toBe(
      'patrol',
    );
  });

  it('the zone 7 marble keeps attacking at close range after giving up', () => {
    const state = { ...createEnemyMarbleState(), giveUpTicks: 0 };
    const c = nodeCentre(nodeAt(second, 0));
    const near = [player(c.x + 1, c.z, { zone: 7 })];
    expect(tick(state, self(c.x, c.z), near, second).state.mode).toBe('attack');
    const far = [player(c.x + 10, c.z, { zone: 7 })];
    expect(tick(state, self(c.x, c.z), far, second).state.mode).toBe('patrol');
  });

  it('does not count down while disarmed or in patrol after expiry', () => {
    const state = tick(createEnemyMarbleState(), at(0)).state;
    expect(state.giveUpTicks).toBe(-1);
  });
});

describe('enemy marble AI – timing and steering output', () => {
  it('runs one AI tick per 1/30 s at a 60 Hz physics step', () => {
    let state = createEnemyMarbleState();
    state = stepEnemyMarble(black, state, at(0), nobody, 1 / 60).state;
    expect(state.ticks).toBe(0);
    state = stepEnemyMarble(black, state, at(0), nobody, 1 / 60).state;
    expect(state.ticks).toBe(1);
    expect(stepEnemyMarble(black, state, at(0), nobody, -1).state.ticks).toBe(
      1,
    );
  });

  it('tracks the desired velocity with the arcade 1/32-per-tick gain', () => {
    const state = tick(createEnemyMarbleState(), at(0)).state;
    const out = stepEnemyMarble(
      black,
      state,
      self(39.5, 35.5, { vx: -2 }),
      nobody,
      0,
      {
        mass: 2,
      },
    );
    expect(out.acceleration.x).toBeCloseTo((-7 * UNIT + 2) * (30 / 32));
    expect(out.desiredForce.x).toBeCloseTo(out.acceleration.x * 2);
    expect(out.maxSpeed).toBeCloseTo(5 * UNIT);
  });

  it('slides along a wall instead of pushing into it', () => {
    const state = {
      ...tick(createEnemyMarbleState(), at(0)).state,
      nodeIndex: 5,
    };
    const me = self(30.5, 34.4, { wallNormal: { x: 0, z: 1 } });
    const out = stepEnemyMarble(black, state, me, nobody, 0);
    expect(out.acceleration.z).toBeCloseTo(0);
    expect(out.acceleration.x).toBeLessThan(0);
    const raw = stepEnemyMarble(black, state, me, nobody, 0, {
      wallSlide: false,
    });
    expect(raw.acceleration.z).toBeLessThan(0);
  });

  it('cancels part of the downhill pull when slope compensation is enabled', () => {
    const state = tick(createEnemyMarbleState(), at(0)).state;
    const me = self(39.5, 35.5, { slopeAcceleration: { x: 8, z: 0 } });
    const base = stepEnemyMarble(black, state, me, nobody, 0).acceleration.x;
    const helped = stepEnemyMarble(black, state, me, nobody, 0, {
      slopeCompensation: 0.5,
    });
    expect(helped.acceleration.x).toBeCloseTo(base - 4);
  });

  it('flags a stall and adds a release push after the configured ticks', () => {
    let state = tick(createEnemyMarbleState(), at(0)).state;
    // Wall on the +z side; the steering toward node 1 (36.5, 35.5) presses into it.
    const stuck = self(33.5, 34.7, { wallNormal: { x: 0, z: -1 } });
    let out = tick(state, stuck);
    for (let i = 0; i < 3; i++) {
      out = stepEnemyMarble(black, out.state, stuck, nobody, TICK, {
        stallTicks: 3,
      });
    }
    expect(out.stalled).toBe(true);
    expect(out.acceleration.z).toBeLessThan(0);
    const moving = stepEnemyMarble(
      black,
      out.state,
      { ...stuck, vx: -5 },
      nobody,
      TICK,
    );
    expect(moving.stalled).toBe(false);
    expect(moving.state.stallTicks).toBe(0);
    state = moving.state;
    expect(state.stallTicks).toBe(0);
  });

  it('stall push without a wall goes toward the steering target', () => {
    const state = {
      ...tick(createEnemyMarbleState(), at(0)).state,
      stallTicks: 5,
    };
    const out = stepEnemyMarble(black, state, self(39.5, 35.5), nobody, TICK, {
      stallTicks: 1,
      stallPush: 10,
    });
    expect(out.stalled).toBe(true);
    expect(out.acceleration.x).toBeLessThan(-7 * UNIT * (30 / 32));
  });

  it('produces no velocity when already on the target point', () => {
    const state = { ...createEnemyMarbleState(), nodeIndex: 1 };
    const out = stepEnemyMarble(black, state, at(1), nobody, 0);
    expect(out.desiredVelocity).toEqual({ x: 0, z: 0 });
  });

  it('is deterministic', () => {
    const run = () => {
      let state = createEnemyMarbleState();
      const seq: string[] = [];
      for (let i = 0; i < 40; i++) {
        const me = self(40.5 - i * 0.4, 35.5, { vx: -3 });
        const out = stepEnemyMarble(
          black,
          state,
          me,
          [player(30 - i * 0.1, 34)],
          1 / 60,
        );
        state = out.state;
        seq.push(
          `${state.mode}:${state.nodeIndex}:${out.acceleration.x.toFixed(6)}`,
        );
      }
      return seq;
    };
    expect(run()).toEqual(run());
  });
});

describe('enemy marble AI – helpers', () => {
  it('octagonal distance matches the ROM approximation', () => {
    expect(octagonalDistance(16, 0)).toBe(16);
    expect(octagonalDistance(0, 16)).toBe(16);
    expect(octagonalDistance(16, 16)).toBe(22);
    expect(octagonalNorm(3, -4)).toBeCloseTo(4 + 3 * 0.375);
  });

  it('nearest node and closest link searches pick the first strict minimum', () => {
    expect(nearestNodeIndex(black, { x: 40.9, z: 35.1 }, 5)).toBe(0);
    expect(nearestNodeIndex(black, { x: 26.5, z: 34.5 }, 5)).toBe(9);
    expect(nearestNodeIndex(black, { x: 200, z: 200 }, 5)).toBe(5);
    expect(closestLinkSlot(black, 2, { x: 19.5, z: 31.5 })).toBe(2);
    expect(closestLinkSlot(black, 2, { x: 300, z: 300 })).toBe(0);
  });

  it('clamps velocity with the octagonal 5 units/tick cap', () => {
    expect(clampEnemyVelocity({ x: 10, z: 0 })).toEqual({ x: 10, z: 0 });
    const v = clampEnemyVelocity({ x: 40, z: 0 });
    expect(v.x).toBeCloseTo(5 * UNIT);
    expect(clampEnemyVelocity({ x: 40, z: 0 }, 2).x).toBeCloseTo(10 * UNIT);
  });

  it('rejects unknown nodes and players instead of reading garbage', () => {
    expect(() => nodeAt(black, 99)).toThrow(RangeError);
    const chasing = { ...createEnemyMarbleState(), nodeIndex: 2 };
    expect(() => tick(chasing, at(2), [])).not.toThrow();
  });

  it('destroys an enemy more than 16 units below the ground', () => {
    expect(enemyFellOff(16300, 16290)).toBe(false);
    expect(enemyFellOff(16300, 16283)).toBe(true);
  });

  it('squash needs an airborne marble at or above its victim', () => {
    expect(landsOn(true, 16310, 16300)).toBe(true);
    expect(landsOn(true, 16300, 16300)).toBe(true);
    expect(landsOn(true, 16290, 16300)).toBe(false);
    expect(landsOn(false, 16310, 16300)).toBe(false);
  });
});
