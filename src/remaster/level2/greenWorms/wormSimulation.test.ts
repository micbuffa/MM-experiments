import { describe, expect, it } from 'vitest';
import {
  LEVEL2_WORM_SPAWNS,
  LEVEL3_WORM_SPAWNS,
  LEVEL6_WORM_SPAWNS,
  WORM_POSE_HITBOX,
  WORM_SCRIPT_FRAMES,
  type WormSpawnDefinition,
} from './wormRomData';
import {
  PlayerArcadeState,
  WORM_MAX_TICKS_PER_STEP,
  WORM_TICK_SECONDS,
  WormState,
  arcadeScrollForPoint,
  createWormWorld,
  readWormPose,
  scrollRow,
  stepWorms,
  tickWorms,
  type WormEnvironment,
  type WormEvent,
  type WormPlayer,
  type WormWorld,
} from './wormSimulation';

const PLATEAU = 16264;
const flat: WormEnvironment = { groundHeight: () => PLATEAU };
const firstSpawn: readonly WormSpawnDefinition[] = [LEVEL2_WORM_SPAWNS[0]!];

function player(id: number, x: number, z: number, vx = 0, vz = 0): WormPlayer {
  return {
    id,
    active: true,
    x,
    z,
    height: PLATEAU,
    vx,
    vz,
    prevX: x,
    prevZ: z,
    arcadeState: PlayerArcadeState.normal,
    airState: 0,
  };
}

/** Far away, slow marble below the worm ground (never homed on). */
const bystander = () => ({ ...player(0, 0, 0), height: 0 });

function run(
  world: WormWorld,
  players: WormPlayer[],
  ticks: number,
  options: {
    row?: number;
    env?: WormEnvironment;
    before?: (tick: number) => void;
  } = {},
): WormEvent[] {
  const log: WormEvent[] = [];
  for (let i = 0; i < ticks; i++) {
    options.before?.(i);
    world.events.length = 0;
    tickWorms(world, players, options.row ?? 5, options.env ?? flat);
    log.push(...world.events);
  }
  return log;
}

function spawnedWorld(spawns = firstSpawn) {
  const world = createWormWorld({ spawns });
  const events = run(world, [bystander()], 1);
  return { world, events, worm: world.slots[3]! };
}

describe('ROM tables', () => {
  it('gives every scripted pose a hitbox and keeps paths self-consistent', () => {
    for (const frames of Object.values(WORM_SCRIPT_FRAMES))
      for (const pose of frames) expect(WORM_POSE_HITBOX[pose]).toBeDefined();
    for (const spawns of [
      LEVEL2_WORM_SPAWNS,
      LEVEL3_WORM_SPAWNS,
      LEVEL6_WORM_SPAWNS,
    ])
      for (const spawn of spawns) {
        expect(spawn.minRow).toBeLessThan(spawn.maxRow);
        for (const [, , next] of spawn.path)
          expect(next).toBeLessThan(spawn.path.length);
      }
  });
});

describe('scroll rows', () => {
  it('maps the Level 2 scroll to signed-byte rows of 16 lines', () => {
    expect(scrollRow(-16152)).toBe(0);
    expect(scrollRow(-16072)).toBe(5);
    expect(scrollRow(-16153)).toBe(-1);
    expect(scrollRow(-16152 + 16 * 130)).toBe(-126);
    expect(arcadeScrollForPoint(400, 360, 16264, 120)).toBe(
      120 - 0x54 - 16264 + 380,
    );
  });
});

describe('spawn and despawn bands (0x14c46)', () => {
  it('spawns worms into the last free slots when the row reaches a band edge', () => {
    const world = createWormWorld();
    const events = run(world, [bystander()], 1, { row: 5 });
    expect(events.filter((e) => e.type === 'spawn')).toEqual([
      { type: 'spawn', slot: 3, spawn: 0 },
      { type: 'spawn', slot: 2, spawn: 1 },
    ]);
    const worm = readWormPose(world.slots[3]!, flat);
    expect([worm.x, worm.z, worm.height]).toEqual([412, 364, PLATEAU]);
    expect(worm.script).toBe('idle');
    run(world, [bystander()], 1, { row: 6 });
    expect(world.slots[1]!.active).toBe(true);
    expect(readWormPose(world.slots[1]!, flat).x).toBe(61 * 8 + 4);
  });

  it('needs an exact edge crossing and never duplicates a path', () => {
    const world = createWormWorld();
    run(world, [bystander()], 1, { row: 10 });
    expect(world.slots.some((w) => w.active)).toBe(false);
    run(world, [bystander()], 1, { row: 31 });
    run(world, [bystander()], 1, { row: 30 });
    expect(
      world.slots.filter((w) => w.active).map((w) => w.spawnIndex),
    ).toEqual([0]);
    run(world, [bystander()], 1, { row: 31 });
    run(world, [bystander()], 1, { row: 30 });
    expect(world.slots.filter((w) => w.active)).toHaveLength(1);
  });

  it('despawns when the row leaves the band through the same edge', () => {
    const world = createWormWorld();
    run(world, [bystander()], 1, { row: 5 });
    const back = run(world, [bystander()], 1, { row: 4 });
    expect(back.filter((e) => e.type === 'despawn')).toHaveLength(2);
    run(world, [bystander()], 1, { row: 5 });
    for (let row = 6; row <= 31; row++) run(world, [bystander()], 1, { row });
    expect(world.slots.map((w) => w.active)).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });

  it('stops spawning when the four slots are taken', () => {
    const many = Array.from({ length: 5 }, () => LEVEL2_WORM_SPAWNS[0]!).map(
      (s, i) => ({ ...s, pathAddress: i }),
    );
    const world = createWormWorld({ spawns: many });
    const events = run(world, [bystander()], 1);
    expect(events.filter((e) => e.type === 'spawn')).toHaveLength(4);
  });
});

describe('patrol (0x15148 / 0x15460)', () => {
  it('idles 22 ticks, then inches one cell per 16-tick step', () => {
    const { world, worm } = spawnedWorld();
    run(world, [bystander()], 20);
    expect(worm.script).toBe('idle');
    expect(worm.x / 65536).toBe(412);
    run(world, [bystander()], 1);
    expect(worm.script).toBe('walkNegX');
    run(world, [bystander()], 15);
    expect(worm.x / 65536).toBe(412);
    run(world, [bystander()], 1);
    expect(worm.x / 65536).toBe(404);
  });

  it('walks a staircase through the waypoints and comes home to idle', () => {
    const { world, worm } = spawnedWorld();
    const cells: string[] = [];
    let last = '';
    for (let i = 0; i < 2000; i++) {
      run(world, [bystander()], 1);
      const cell = `${worm.x >> 19},${worm.z >> 19}`;
      if (cell !== last) cells.push(cell);
      last = cell;
    }
    expect(cells.slice(0, 7)).toEqual([
      '51,45',
      '50,45',
      '50,44',
      '49,44',
      '49,43',
      '48,43',
      '47,43',
    ]);
    // Every move is one orthogonal cell.
    for (let i = 1; i < cells.length; i++) {
      const [ax, az] = cells[i - 1]!.split(',').map(Number);
      const [bx, bz] = cells[i]!.split(',').map(Number);
      expect(Math.abs(ax! - bx!) + Math.abs(az! - bz!)).toBe(1);
    }
    expect(cells).toContain('50,43');
    expect(cells.filter((c) => c === '51,45').length).toBeGreaterThan(1);
  });
});

describe('detection and lunge (0x15670 / 0x14a3c / 0x15316)', () => {
  it('ignores slow or too-close marbles', () => {
    const slow = spawnedWorld();
    run(slow.world, [player(0, 380, 364, 0.5)], 40);
    expect(slow.worm.state).toBe(WormState.patrol);
    const close = spawnedWorld();
    run(close.world, [player(0, 396, 364, 1)], 22);
    expect(close.worm.state).toBe(WormState.patrol);
  });

  it('lunges at a fast marble 3-5 cells away and swallows it', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 380, 364, 1);
    run(world, [p], 20);
    expect(worm.state).toBe(WormState.patrol);
    let events = run(world, [p], 1);
    expect(worm.state).toBe(WormState.attack);
    expect(events).toContainEqual({
      type: 'state',
      slot: 3,
      from: WormState.patrol,
      to: WormState.attack,
    });
    p.vx = 0;
    let peak = 0;
    events = [];
    for (let i = 0; i < 34; i++) {
      events.push(...run(world, [p], 1));
      peak = Math.max(peak, readWormPose(worm, flat).lift);
    }
    expect(peak).toBe(32);
    expect(worm.state).toBe(WormState.eat);
    expect(events).toContainEqual({ type: 'swallow', slot: 3, player: 0 });
    expect(events).toContainEqual({ type: 'sound', command: 0x33, slot: 3 });
    expect(p.arcadeState).toBe(PlayerArcadeState.swallowed);
    expect(p.x).toBe(worm.x / 65536);
    events = run(world, [p], 30);
    expect(
      events.filter((e) => e.type === 'sound').map((e) => e.command),
    ).toEqual([0x3a, 0x3b, 0x3c]);
    expect(events).toContainEqual({ type: 'marbleEaten', slot: 3, player: 0 });
    expect(p.arcadeState).toBe(PlayerArcadeState.rebuilding);
    expect(worm.state).toBe(WormState.returning);
    expect(worm.ticksPerFrame).toBe(1);
    expect(worm.x & 0x7ffff).toBe(0x40000);
    expect(readWormPose(worm, flat).lift).toBe(0);
  });

  it('skips sound 0x3b on level index 2', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 380, 364, 1);
    const env = { ...flat, levelIndex: 2 };
    run(world, [p], 21, { env });
    p.vx = 0;
    const events = run(world, [p], 64, { env });
    expect(worm.state).toBe(WormState.returning);
    expect(
      events.filter((e) => e.type === 'sound').map((e) => e.command),
    ).toEqual([0x33, 0x3a, 0x3c]);
  });

  it('knocks back a marble that ends 7-12 units away, then recovers', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 380, 364, 1);
    run(world, [p], 21);
    expect(worm.state).toBe(WormState.attack);
    p.airState = 1; // airborne: no homing, the worm lunges in place.
    p.x = 412 - 9;
    const events = run(world, [p], 34);
    expect(events).toContainEqual({
      type: 'knockback',
      slot: 3,
      player: 0,
      vx: -4,
      vz: 0,
    });
    expect(worm.state).toBe(WormState.recover);
    expect(worm.x / 65536).toBe(412);
    run(world, [p], 26);
    expect(worm.state).toBe(WormState.returning);
  });

  it('misses a marble that escaped more than two cells', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 380, 364, 1);
    run(world, [p], 21);
    p.x = 300;
    const events = run(world, [p], 34);
    expect(worm.state).toBe(WormState.recover);
    expect(events.some((e) => e.type === 'knockback')).toBe(false);
  });

  it('recovers when the target player disappears', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 380, 364, 1);
    run(world, [p], 21);
    run(world, [], 34);
    expect(worm.state).toBe(WormState.recover);
  });

  it('cannot leap onto a different ground height', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 380, 364, 1);
    const env: WormEnvironment = {
      groundHeight: (x) => (x < 410 ? PLATEAU - 8 : PLATEAU),
      playerGroundTolerance: 100,
    };
    run(world, [p], 21, { env });
    p.vx = 0;
    run(world, [p], 34, { env });
    expect(worm.x / 65536).toBeGreaterThanOrEqual(410);
    expect(worm.state).toBe(WormState.recover);
  });

  it('targets the leading marble in 2P', () => {
    const world = createWormWorld();
    const p1 = player(0, 380, 364, 1);
    const p2 = player(1, 412, 396, 0, 1);
    run(world, [p1, p2], 22);
    expect(world.slots[3]!.state).toBe(WormState.attack);
    expect(world.slots[3]!.target).toBe(1);
    // Worm 2 (home 45,51) also picks P2 as leader but it is out of range.
    expect(world.slots[2]!.target).toBe(1);
    expect(world.slots[2]!.state).toBe(WormState.patrol);
  });

  it('leaves a marble alone while another worm lunges at it', () => {
    const world = createWormWorld();
    run(world, [bystander()], 1);
    const other = world.slots[2]!;
    other.state = WormState.attack;
    other.target = 0;
    other.script = 'attack';
    other.ticksPerFrame = 99;
    run(world, [player(0, 380, 364, 1)], 21);
    expect(world.slots[3]!.state).toBe(WormState.patrol);
  });

  it('picks P1 when P2 is the slower one', () => {
    const { world, worm } = spawnedWorld();
    run(world, [player(0, 380, 364, 1), player(1, 412, 396, 0, 0.2)], 21);
    expect(worm.target).toBe(0);
    expect(worm.state).toBe(WormState.attack);
  });

  it('respects layers when picking the leader', () => {
    const { world, worm } = spawnedWorld();
    const p1 = { ...player(0, 380, 364, 1), layer: 3 };
    const p2 = { ...player(1, 412, 396, 0, 1), layer: 4 };
    run(world, [p1, p2], 21);
    expect(worm.target).toBe(0);
  });
});

describe('contact (0x14e92)', () => {
  it('blocks and stuns the marble, then the bumped worm slides, brakes and lunges', () => {
    const { world, worm } = spawnedWorld();
    const p = player(0, 412 - 6, 364, 1);
    p.prevX = 400;
    let events = run(world, [p], 1);
    expect(events).toContainEqual({
      type: 'bump',
      slot: 3,
      player: 0,
      stunned: true,
    });
    expect(events).toContainEqual({ type: 'sound', command: 0x39, slot: 3 });
    expect([p.x, p.vx, p.arcadeState]).toEqual([400, 0, 5]);
    expect(worm.state).toBe(WormState.bumped);
    expect(worm.script).toBe('bumped');
    const p2 = bystander();
    events = run(world, [p2], 40);
    expect(worm.x / 65536).toBeGreaterThan(412);
    const states = events.flatMap((e) => (e.type === 'state' ? [e.to] : []));
    expect(states.slice(0, 2)).toEqual([WormState.brake, WormState.attack]);
    expect(events.some((e) => e.type === 'state' && e.to === 4)).toBe(true);
  });

  it('chooses the brake script from the marble velocity', () => {
    for (const [vx, vz, script] of [
      [-1, 0, 'brakeNegX'],
      [0, 1, 'brakePosZ'],
      [0, -1, 'brakeNegZ'],
    ] as const) {
      const { world, worm } = spawnedWorld();
      run(world, [player(0, 412, 364, vx, vz)], 1);
      run(world, [bystander()], 1);
      let seen = '';
      for (let i = 0; i < 40 && !seen; i++) {
        run(world, [bystander()], 1);
        if (worm.state === WormState.brake) seen = worm.script;
      }
      expect(seen).toBe(script);
    }
  });

  it('lunges immediately when the slide hits higher ground', () => {
    const { world, worm } = spawnedWorld();
    const env: WormEnvironment = {
      groundHeight: (x) => (x >= 414 ? PLATEAU + 8 : PLATEAU),
    };
    run(world, [player(0, 406, 364, 1)], 1, { env });
    run(world, [bystander()], 3, { env });
    expect(worm.state).toBe(WormState.attack);
    expect(worm.x / 65536).toBeLessThan(414);
  });

  it('stays silent for dazed or stunned marbles and ignores its own target mid-lunge', () => {
    const { world } = spawnedWorld();
    const dazed = player(0, 412, 364, 1);
    dazed.arcadeState = PlayerArcadeState.dazed;
    let events = run(world, [dazed], 1);
    expect(events.some((e) => e.type === 'sound')).toBe(false);
    expect(dazed.arcadeState).toBe(PlayerArcadeState.stunned);
    events = run(world, [dazed], 1);
    expect(events).toContainEqual({
      type: 'bump',
      slot: 3,
      player: 0,
      stunned: false,
    });

    const lunge = spawnedWorld();
    const p = player(0, 380, 364, 1);
    run(lunge.world, [p], 21);
    p.x = 412;
    events = run(lunge.world, [p], 1);
    expect(events.some((e) => e.type === 'bump')).toBe(false);
  });

  it('skips swallowed and inactive marbles', () => {
    const { world } = spawnedWorld();
    const swallowed = player(0, 412, 364, 1);
    swallowed.arcadeState = PlayerArcadeState.swallowed;
    const inactive = { ...player(1, 412, 364, 1), active: false };
    const events = run(world, [swallowed, inactive], 1);
    expect(events.some((e) => e.type === 'bump')).toBe(false);
  });

  it('only touches when an interval endpoint is inside the hitbox', () => {
    const { world } = spawnedWorld();
    const above = player(0, 412, 364, 1);
    above.height = PLATEAU + 17;
    expect(run(world, [above], 1).some((e) => e.type === 'bump')).toBe(false);
    const side = player(0, 412, 364 + 8, 1);
    expect(run(world, [side], 1).some((e) => e.type === 'bump')).toBe(false);
  });
});

describe('poses for the renderer', () => {
  it('exposes inchworm extents, heading and phase', () => {
    const { world, worm } = spawnedWorld();
    run(world, [bystander()], 21 + 8);
    const pose = readWormPose(worm, flat);
    expect(pose.script).toBe('walkNegX');
    expect(pose.frame).toBe(4);
    expect(pose.heading).toBeCloseTo(-Math.PI / 2);
    expect([pose.rear, pose.front]).toEqual([-4, 12]);
    expect(pose.phase).toBeCloseTo(4 / 8);
    expect(pose.poseId).toBe(0x21b1e);

    worm.script = 'walkPosZ';
    worm.dirX = 0;
    worm.dirZ = 1;
    expect(readWormPose(worm, flat).heading).toBe(0);
    worm.dirZ = -1;
    worm.script = 'walkNegZ';
    expect(readWormPose(worm, flat).rear).toBe(-4);
    worm.dirX = 1;
    worm.dirZ = 0;
    worm.script = 'walkPosX';
    expect(readWormPose(worm, flat)).toMatchObject({ rear: -4, front: 12 });
    worm.active = false;
    expect(readWormPose(worm, flat).lift).toBe(0);
  });
});

describe('stepWorms', () => {
  it('runs fixed 1/30 s ticks (2 video frames), clears events and drops backlog', () => {
    expect(WORM_TICK_SECONDS).toBe(1 / 30);
    const world = createWormWorld({ spawns: firstSpawn });
    const env = flat;
    const events = stepWorms(
      world,
      [bystander()],
      5,
      2 * WORM_TICK_SECONDS,
      env,
    );
    expect(world.tick).toBe(2);
    expect(events.filter((e) => e.type === 'spawn')).toHaveLength(1);
    expect(stepWorms(world, [bystander()], 5, 0.001, env)).toHaveLength(0);
    stepWorms(world, [bystander()], 5, 10, env);
    expect(world.tick).toBe(2 + WORM_MAX_TICKS_PER_STEP);
    expect(world.accumulator).toBe(0);
    stepWorms(world, [bystander()], 5, -1, env);
    expect(world.tick).toBe(2 + WORM_MAX_TICKS_PER_STEP);
  });

  it('is deterministic', () => {
    const play = () => {
      const world = createWormWorld();
      const p1 = player(0, 380, 364, 1);
      const log: string[] = [];
      for (let i = 0; i < 600; i++) {
        p1.x = 380 + Math.sin(i / 20) * 10;
        p1.prevX = p1.x;
        for (const e of stepWorms(
          world,
          [p1],
          5 + (i >> 6),
          WORM_TICK_SECONDS,
          flat,
        ))
          log.push(JSON.stringify(e));
        if (p1.arcadeState === PlayerArcadeState.rebuilding)
          p1.arcadeState = PlayerArcadeState.normal;
      }
      return log.join('\n');
    };
    expect(play()).toBe(play());
    expect(play().length).toBeGreaterThan(0);
  });
});
