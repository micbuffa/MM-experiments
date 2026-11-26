/**
 * Deterministic port of the 68010 green-worm logic (Marble Madness set 1).
 *
 * Routine map (decoded statically, see docs/remaster/level2-green-worms.md):
 * - 0x1493c / 0x14966: per-tick update of the four slots at 0x401302 (stride 0x60).
 * - 0x14c46: spawn/despawn when the scroll row crosses a band edge.
 * - 0x15148: state machine run at the end of each animation cycle.
 * - 0x15460: script/velocity selection for the new state.
 * - 0x15670: player detection (starts the lunge).
 * - 0x14e92: marble/worm contact, run from the player update 0x123c8.
 * - 0x14dec: nearest-waypoint search used after a lunge.
 * - 0x25e7c: speed-table friction (mode 2) used while a bumped worm slides.
 *
 * Arithmetic mirrors the ROM: worm positions and velocities are kept in 16.16
 * fixed point, distances use the ROM's `max + 3 * (min >> 3)` octagonal
 * approximation, and divisions truncate like `divs.w`. No BabylonJS, no DOM.
 */
import {
  LEVEL2_SCROLL_ROW_ORIGIN,
  LEVEL2_WORM_SPAWNS,
  SLIDE_FRICTION_TABLE,
  WORM_DEFAULT_HITBOX,
  WORM_LEAP_ARC,
  WORM_POSE_HITBOX,
  WORM_SCRIPT_FRAMES,
  WORM_SLOT_COUNT,
  WORM_SOUND_COMMANDS,
  type WormHitbox,
  type WormScriptName,
  type WormSpawnDefinition,
} from './wormRomData';

/** One game tick. The worm update 0x1493c runs once per main-loop frame (0x10fe6). */
export const WORM_TICK_SECONDS = 1 / 60;
/** Upper bound of ticks simulated by one `stepWorms` call (avoids a spiral after a stall). */
export const WORM_MAX_TICKS_PER_STEP = 8;

const ONE = 0x10000;
const CELL_SHIFT = 19; // 8 units per cell in 16.16.

/** Worm states (`$1a`). Names are descriptive; numbers are the ROM values. */
export const WormState = {
  patrol: 0,
  attack: 1,
  bumped: 2,
  returning: 3,
  brake: 4,
  eat: 5,
  recover: 6,
} as const;
export type WormStateId = (typeof WormState)[keyof typeof WormState];

/** Player states (`$1a` of the marble record) that the worm code tests. */
export const PlayerArcadeState = {
  normal: 0,
  /** Set by 0x25c74 (generic hit/daze routine); meaning partly inferred. */
  dazed: 1,
  rebuilding: 4,
  /** Dizzy after touching a worm; 0x15020 sets it with a 50-tick timer. */
  stunned: 5,
  /** Swallowed by a worm (marble hidden). */
  swallowed: 7,
} as const;

/** Stun duration written to player `$56` on contact (0x150ac). */
export const WORM_CONTACT_STUN_TICKS = 0x32;
/** Value written to player `$57` before the respawn call (0x15432). */
export const WORM_EATEN_MARKER = 0x65;

/**
 * Mutable view of one marble. Units are arcade units (8 per cell) and units per
 * tick. The module writes back x, z, vx, vz and arcadeState exactly where the
 * ROM writes the player record; the caller applies them to its physics.
 */
export interface WormPlayer {
  /** Player index `$19` (0 = P1, 1 = P2). Worm `$56` stores this value. */
  readonly id: number;
  active: boolean;
  x: number;
  z: number;
  height: number;
  vx: number;
  vz: number;
  /** Position before this tick's player move (ROM scratch 0x400684/0x400688). */
  prevX: number;
  prevZ: number;
  /** Raw arcade player state `$1a` (see PlayerArcadeState). */
  arcadeState: number;
  /** Raw `$36`: 0 on the ground, 2 while falling after a drop (0x12464). */
  airState: number;
  /** Terrain layer `$1b`. Undefined means "same layer as every worm". */
  layer?: number;
}

export interface WormEnvironment {
  /** Ground height (arcade units) under a point, for the given worm layer (0x1bb08 + 0x1cc62). */
  groundHeight(x: number, z: number, layer: number): number;
  /** Level index `$400394` (1 = Level 2). Only gates sound 0x3b. */
  readonly levelIndex?: number;
  /**
   * Tolerance (units) for "the marble is on the worm's ground" during the lunge.
   * The ROM compares 16.16 heights exactly (0x14aa4); a physics marble never
   * matches exactly, so this is an adaptation. Default 0.5 unit.
   */
  readonly playerGroundTolerance?: number;
}

export interface WormSlot {
  readonly slot: number;
  active: boolean;
  spawnIndex: number;
  state: WormStateId;
  layer: number;
  /** 16.16 fixed point. */
  x: number;
  z: number;
  height: number;
  vx: number;
  vz: number;
  /** Velocity of the marble at the bump (`$1c`/`$20`), picks the brake script. */
  bumpVx: number;
  bumpVz: number;
  script: WormScriptName;
  /** Index in the script; -1 or length means "on a terminator". */
  frame: number;
  /** `$26`: +1 or -1. */
  step: number;
  /** `$24` and `$25`. */
  tickInFrame: number;
  ticksPerFrame: number;
  /** `$27` signed byte: lunge clock. */
  leapClock: number;
  /** `$56`: targeted player id. */
  target: number;
  /** Index of the current waypoint (`$4a`). */
  waypoint: number;
  minRow: number;
  maxRow: number;
  /** Last walking direction, kept for rendering non-directional scripts. */
  dirX: number;
  dirZ: number;
}

export interface WormWorld {
  readonly spawns: readonly WormSpawnDefinition[];
  readonly slots: WormSlot[];
  viewRow: number;
  accumulator: number;
  tick: number;
  readonly events: WormEvent[];
}

export type WormEvent =
  | { readonly type: 'spawn'; readonly slot: number; readonly spawn: number }
  | { readonly type: 'despawn'; readonly slot: number }
  | {
      readonly type: 'state';
      readonly slot: number;
      readonly from: WormStateId;
      readonly to: WormStateId;
    }
  | {
      /** Marble blocked by a worm (position reverted, velocity zeroed). */
      readonly type: 'bump';
      readonly slot: number;
      readonly player: number;
      /** True when the marble entered the stunned state on this contact. */
      readonly stunned: boolean;
    }
  | {
      readonly type: 'swallow';
      readonly slot: number;
      readonly player: number;
    }
  | {
      readonly type: 'knockback';
      readonly slot: number;
      readonly player: number;
      readonly vx: number;
      readonly vz: number;
    }
  | {
      /** End of the eat script: the caller must respawn the marble (0x25bae mode 4). */
      readonly type: 'marbleEaten';
      readonly slot: number;
      readonly player: number;
    }
  | {
      /** ROM sound command (data only; playback lives on the SFX branch). */
      readonly type: 'sound';
      readonly command: number;
      readonly slot: number;
    };

export interface CreateWormWorldOptions {
  readonly spawns?: readonly WormSpawnDefinition[];
  /** Scroll row at level start (row 0 on Level 2). */
  readonly initialViewRow?: number;
}

export function createWormWorld(
  options: CreateWormWorldOptions = {},
): WormWorld {
  const slots: WormSlot[] = [];
  for (let i = 0; i < WORM_SLOT_COUNT; i++) {
    slots.push({
      slot: i,
      active: false,
      spawnIndex: -1,
      state: WormState.patrol,
      layer: 0,
      x: 0,
      z: 0,
      height: 0,
      vx: 0,
      vz: 0,
      bumpVx: 0,
      bumpVz: 0,
      script: 'idle',
      frame: 0,
      step: 1,
      tickInFrame: 0,
      ticksPerFrame: 2,
      leapClock: 0,
      target: 0,
      waypoint: 0,
      minRow: 0,
      maxRow: 0,
      dirX: 0,
      dirZ: 1,
    });
  }
  return {
    spawns: options.spawns ?? LEVEL2_WORM_SPAWNS,
    slots,
    viewRow: toByte(options.initialViewRow ?? 0),
    accumulator: 0,
    tick: 0,
    events: [],
  };
}

/** Scroll row used by the spawn bands (0x144e4): `(scroll - origin) >> 4`, as a signed byte. */
export function scrollRow(
  scroll: number,
  origin: number = LEVEL2_SCROLL_ROW_ORIGIN,
): number {
  return toByte(Math.floor(scroll - origin) >> 4);
}

/**
 * Arcade scroll that would put a point at a given motion-object line, from the
 * projection used by 0x150d0 (`line = height + scroll + 0x54 - (x + z) / 2`).
 * Which line the arcade camera keeps the marble on is NOT decoded: callers
 * must calibrate `line` (inferred default: 120, mid-screen).
 */
export function arcadeScrollForPoint(
  x: number,
  z: number,
  height: number,
  line = 120,
): number {
  return line - 0x54 - height + (x + z) / 2;
}

/**
 * Advances the worms by `dt` seconds of fixed 1/60 s ticks. `viewRow` is the
 * current scroll row (see `scrollRow`). Player objects may be modified (see
 * WormPlayer). Returns the events of this call (array owned by the world).
 */
export function stepWorms(
  world: WormWorld,
  players: readonly WormPlayer[],
  viewRow: number,
  dt: number,
  env: WormEnvironment,
): readonly WormEvent[] {
  world.events.length = 0;
  world.accumulator += Math.max(0, dt);
  let ticks = 0;
  while (
    ticks < WORM_MAX_TICKS_PER_STEP &&
    world.accumulator + 1e-9 >= WORM_TICK_SECONDS
  ) {
    world.accumulator -= WORM_TICK_SECONDS;
    tickWorms(world, players, viewRow, env);
    ticks++;
  }
  // Drop the backlog after a stall instead of fast-forwarding.
  if (world.accumulator >= WORM_TICK_SECONDS) world.accumulator = 0;
  return world.events;
}

/** Runs exactly one arcade tick: scroll bands, contacts, then worm updates. */
export function tickWorms(
  world: WormWorld,
  players: readonly WormPlayer[],
  viewRow: number,
  env: WormEnvironment,
): void {
  const row = toByte(viewRow);
  if (row !== world.viewRow) {
    updateBands(world, world.viewRow, row, env);
    world.viewRow = row;
  }
  for (const player of players) {
    if (player.active && player.arcadeState !== PlayerArcadeState.swallowed)
      checkContact(world, player);
  }
  for (const worm of world.slots) updateWorm(world, worm, players, env);
  world.tick++;
}

/** Spawn/despawn on a scroll-row change (0x14c46). */
function updateBands(
  world: WormWorld,
  oldRow: number,
  newRow: number,
  env: WormEnvironment,
) {
  world.spawns.forEach((spawn, index) => {
    if (newRow !== spawn.minRow && newRow !== spawn.maxRow) return;
    if (oldRow >= spawn.minRow && oldRow <= spawn.maxRow) return;
    if (world.slots.some((w) => w.active && w.spawnIndex === index)) return;
    let free: WormSlot | undefined;
    for (const w of world.slots) if (!w.active) free = w; // 0x14bce keeps the last free slot.
    if (!free) return;
    spawnWorm(world, free, spawn, index, env);
  });
  for (const worm of world.slots) {
    if (!worm.active) continue;
    if (
      (oldRow === worm.minRow && newRow < worm.minRow) ||
      (oldRow === worm.maxRow && newRow > worm.maxRow)
    ) {
      worm.active = false;
      world.events.push({ type: 'despawn', slot: worm.slot });
    }
  }
}

function spawnWorm(
  world: WormWorld,
  worm: WormSlot,
  spawn: WormSpawnDefinition,
  index: number,
  env: WormEnvironment,
) {
  const start = spawn.path[0]!;
  worm.active = true;
  worm.spawnIndex = index;
  worm.waypoint = 0;
  worm.layer = spawn.layer;
  worm.minRow = spawn.minRow;
  worm.maxRow = spawn.maxRow;
  worm.x = cellCenter(start[0]);
  worm.z = cellCenter(start[1]);
  worm.height = ground(env, worm, worm.x, worm.z);
  worm.vx = worm.vz = 0;
  worm.bumpVx = worm.bumpVz = 0;
  worm.state = WormState.patrol;
  worm.script = 'idle';
  worm.frame = 0;
  worm.step = 1;
  worm.tickInFrame = 0;
  worm.ticksPerFrame = 2;
  worm.leapClock = 0;
  world.events.push({ type: 'spawn', slot: worm.slot, spawn: index });
}

/** 0x14966: one tick of one worm. */
function updateWorm(
  world: WormWorld,
  worm: WormSlot,
  players: readonly WormPlayer[],
  env: WormEnvironment,
) {
  if (!worm.active) return;
  worm.tickInFrame++;
  if (worm.tickInFrame >= worm.ticksPerFrame) {
    worm.tickInFrame = 0;
    worm.frame += worm.step;
    const length = WORM_SCRIPT_FRAMES[worm.script].length;
    if (worm.frame < 0 || worm.frame >= length || worm.frame === 0) {
      worm.frame = 0;
      if (
        worm.step > 0 &&
        (worm.state === WormState.patrol || worm.state === WormState.returning)
      ) {
        worm.x += worm.vx;
        worm.z += worm.vz;
      }
      cycleEnd(world, worm, players, env);
    } else if (worm.state === WormState.bumped) {
      cycleEnd(world, worm, players, env);
    }
  } else if (worm.state === WormState.bumped) {
    cycleEnd(world, worm, players, env);
  }

  if (
    worm.state === WormState.attack ||
    worm.state === WormState.eat ||
    worm.state === WormState.recover
  ) {
    if (worm.leapClock > 5 && worm.leapClock < 0x26) leap(worm, players, env);
    worm.leapClock = toByte(worm.leapClock + 1);
  }
}

/** 0x14a3c..0x14bb8: lunge height and homing. */
function leap(
  worm: WormSlot,
  players: readonly WormPlayer[],
  env: WormEnvironment,
) {
  const base = ground(env, worm, worm.x, worm.z);
  worm.height = base + WORM_LEAP_ARC[worm.leapClock - 6]! * ONE;
  const target = players.find((p) => p.id === worm.target);
  const tolerance = (env.playerGroundTolerance ?? 0.5) * ONE;
  if (
    target &&
    target.active &&
    sameLayer(worm, target) &&
    target.airState === 0 &&
    Math.abs(fx(target.height) - base) <= tolerance &&
    (target.arcadeState === 0 ||
      target.arcadeState === 1 ||
      target.arcadeState === 5 ||
      target.arcadeState === 7)
  ) {
    const dx = fx(target.x) - worm.x;
    const dz = fx(target.z) - worm.z;
    worm.vx = dx >> 4;
    worm.vz = dz >> 4;
    const ax = toUWord(Math.abs(dx) >> 12);
    const az = toUWord(Math.abs(dz) >> 12);
    const length = toUWord(ax > az ? (az >>> 3) * 3 + ax : (ax >>> 3) * 3 + az);
    let nx = 0;
    let nz = 0;
    if (length !== 0) {
      nx = divsW(dx, length);
      nz = divsW(dz, length);
    }
    const tx = (0x800 * nx) >> 4;
    const tz = (0x800 * nz) >> 4;
    worm.vx += (tx - worm.vx) >> 5;
    worm.vz += (tz - worm.vz) >> 5;
  } else {
    worm.vx = worm.vz = 0;
  }
  const oldX = worm.x;
  const oldZ = worm.z;
  worm.x += worm.vx;
  worm.z += worm.vz;
  if (ground(env, worm, worm.x, worm.z) !== base) {
    worm.x = oldX;
    worm.z = oldZ;
  }
}

/** 0x15148: state machine at the end of an animation cycle. */
function cycleEnd(
  world: WormWorld,
  worm: WormSlot,
  players: readonly WormPlayer[],
  env: WormEnvironment,
) {
  const spawn = world.spawns[worm.spawnIndex]!;
  switch (worm.state) {
    case WormState.patrol:
    case WormState.returning: {
      const cx = worm.x >> CELL_SHIFT;
      const cz = worm.z >> CELL_SHIFT;
      const home = spawn.path[0]!;
      const goal = spawn.path[worm.waypoint]!;
      if (home[0] === cx && home[1] === cz && worm.script !== 'idle') {
        if (worm.state === WormState.returning)
          setState(world, worm, WormState.patrol);
        worm.script = 'idle';
        worm.vx = worm.vz = 0;
        worm.step = 1;
        worm.frame = 0;
        worm.tickInFrame = 0;
        worm.ticksPerFrame = 2;
        worm.waypoint = goal[2];
      } else if (goal[0] === cx && goal[1] === cz) {
        if (worm.state === WormState.returning)
          setState(world, worm, WormState.patrol);
        worm.waypoint = goal[2];
        selectScript(worm, spawn);
      } else {
        selectScript(worm, spawn);
      }
      if (worm.state === WormState.patrol) detectPlayer(world, worm, players);
      return;
    }
    case WormState.bumped: {
      slideFriction(worm);
      if (worm.vx === 0 && worm.vz === 0) {
        setState(world, worm, WormState.brake);
        selectScript(worm, spawn);
        return;
      }
      const oldX = worm.x;
      const oldZ = worm.z;
      const oldHeight = worm.height;
      worm.x += worm.vx;
      worm.z += worm.vz;
      worm.height = ground(env, worm, worm.x, worm.z);
      if (worm.height !== oldHeight) {
        setState(
          world,
          worm,
          oldHeight <= worm.height ? WormState.attack : WormState.brake,
        );
        worm.x = oldX;
        worm.z = oldZ;
        worm.height = oldHeight;
      }
      selectScript(worm, spawn);
      return;
    }
    case WormState.brake:
      setState(world, worm, WormState.attack);
      selectScript(worm, spawn);
      return;
    case WormState.attack:
      resolveLunge(world, worm, players);
      selectScript(worm, spawn);
      return;
    case WormState.eat:
    case WormState.recover:
      worm.x = (worm.x & ~0x7ffff) + 0x40000;
      worm.z = (worm.z & ~0x7ffff) + 0x40000;
      if (worm.state === WormState.eat) {
        const victim = players.find((p) => p.id === worm.target);
        sound(world, worm, WORM_SOUND_COMMANDS.wormFinishesMeal);
        if ((env.levelIndex ?? 1) !== 2)
          sound(world, worm, WORM_SOUND_COMMANDS.wormFinishesMealExtra);
        if (victim) {
          victim.vx = victim.vz = 0;
          victim.arcadeState = PlayerArcadeState.rebuilding;
        }
        sound(world, worm, WORM_SOUND_COMMANDS.eatenMarbleRespawn);
        world.events.push({
          type: 'marbleEaten',
          slot: worm.slot,
          player: worm.target,
        });
      }
      setState(world, worm, WormState.returning);
      worm.waypoint = nearestWaypoint(worm, spawn);
      selectScript(worm, spawn);
      return;
  }
}

/** 0x15316: what happens when the 34-pose lunge ends. */
function resolveLunge(
  world: WormWorld,
  worm: WormSlot,
  players: readonly WormPlayer[],
) {
  const target = players.find((p) => p.id === worm.target);
  if (!target) {
    setState(world, worm, WormState.recover);
    return;
  }
  const dx = fx(target.x) - worm.x;
  const dz = fx(target.z) - worm.z;
  const ax = toWord(Math.abs(dx) >> 12);
  const az = toWord(Math.abs(dz) >> 12);
  if (ax > 0x100 || az > 0x100) {
    setState(world, worm, WormState.recover);
    return;
  }
  const length = ax > az ? (az >> 3) * 3 + ax : (ax >> 3) * 3 + az;
  if (length < 0x70) {
    target.x = worm.x / ONE;
    target.z = worm.z / ONE;
    target.arcadeState = PlayerArcadeState.swallowed;
    setState(world, worm, WormState.eat);
    sound(world, worm, WORM_SOUND_COMMANDS.wormSwallowsMarble);
    world.events.push({ type: 'swallow', slot: worm.slot, player: target.id });
    return;
  }
  if (length < 0xc0) {
    const vx = (0x400 * divsW(dx, length)) >> 4;
    const vz = (0x400 * divsW(dz, length)) >> 4;
    target.vx = vx / ONE;
    target.vz = vz / ONE;
    world.events.push({
      type: 'knockback',
      slot: worm.slot,
      player: target.id,
      vx: target.vx,
      vz: target.vz,
    });
  }
  setState(world, worm, WormState.recover);
}

/** 0x15670: start a lunge at a fast marble 3 to 5 cells away. */
function detectPlayer(
  world: WormWorld,
  worm: WormSlot,
  players: readonly WormPlayer[],
) {
  let remaining = players.length;
  let chosen: WormPlayer | undefined;
  for (const p of players) {
    const speed = Math.abs(fx(p.vx)) + Math.abs(fx(p.vz));
    if (
      !p.active ||
      !sameLayer(worm, p) ||
      speed <= 0xc000 ||
      p.airState === 2 ||
      !(p.arcadeState === 0 || p.arcadeState === 1 || p.arcadeState === 5)
    )
      continue;
    const claimed = world.slots.some(
      (other) =>
        other !== worm &&
        other.active &&
        other.state === WormState.attack &&
        other.target === p.id,
    );
    if (claimed) continue;
    remaining--;
    chosen = p;
  }
  if (remaining === players.length || !chosen) return;
  if (players.length === 2 && remaining === 0) {
    chosen = leaderOf(players[0]!, players[1]!);
  }
  const ax = Math.abs(fx(chosen.x) - worm.x) >> 12;
  const az = Math.abs(fx(chosen.z) - worm.z) >> 12;
  const length = ax > az ? (az >>> 3) * 3 + ax : (ax >>> 3) * 3 + az;
  worm.target = chosen.id;
  if (length > 0x180 && length < 0x280) {
    setState(world, worm, WormState.attack);
    selectScript(worm, world.spawns[worm.spawnIndex]!);
  }
}

/** 0x15fe6: P2 is chosen when it is further down the course (or on a higher layer). */
function leaderOf(p1: WormPlayer, p2: WormPlayer): WormPlayer {
  if (!p1.active || !p2.active) return p1;
  if ((p1.layer ?? 0) === (p2.layer ?? 0)) {
    const s1 = (fx(p1.x) >> CELL_SHIFT) + (fx(p1.z) >> CELL_SHIFT);
    const s2 = (fx(p2.x) >> CELL_SHIFT) + (fx(p2.z) >> CELL_SHIFT);
    return s2 > s1 ? p2 : p1;
  }
  return (p1.layer ?? 0) < (p2.layer ?? 0) ? p2 : p1;
}

/** 0x15460: pick the script (and walking velocity) for the current state. */
function selectScript(worm: WormSlot, spawn: WormSpawnDefinition) {
  switch (worm.state) {
    case WormState.patrol:
    case WormState.returning: {
      const cx = worm.x >> CELL_SHIFT;
      const cz = worm.z >> CELL_SHIFT;
      const goal = spawn.path[worm.waypoint]!;
      let dx = 0;
      let dz = 0;
      const xFirst = worm.vx === 0;
      const axisX = () => (cx > goal[0] ? -8 : cx < goal[0] ? 8 : 0);
      const axisZ = () => (cz > goal[1] ? -8 : cz < goal[1] ? 8 : 0);
      if (xFirst) {
        dx = axisX();
        if (dx === 0) dz = axisZ();
      } else {
        dz = axisZ();
        if (dz === 0) dx = axisX();
      }
      worm.script =
        dz > 0
          ? 'walkPosZ'
          : dz < 0
            ? 'walkNegZ'
            : dx > 0
              ? 'walkPosX'
              : dx < 0
                ? 'walkNegX'
                : 'idle';
      worm.vx = dx * ONE;
      worm.vz = dz * ONE;
      worm.step = 1;
      if (dx !== 0 || dz !== 0) {
        worm.dirX = Math.sign(dx);
        worm.dirZ = Math.sign(dz);
      }
      break;
    }
    case WormState.attack:
      worm.script = 'attack';
      worm.leapClock = 0;
      worm.step = 1;
      break;
    case WormState.bumped:
      if (worm.script !== 'bumped') {
        if (worm.frame === 0) {
          worm.script = 'bumped';
          worm.step = 1;
        } else {
          worm.step = worm.frame >= 4 ? 1 : -1;
        }
      }
      break;
    case WormState.brake: {
      const sx = worm.bumpVx;
      const sz = worm.bumpVz;
      if (Math.abs(sx) > Math.abs(sz)) {
        worm.script = sx > 0 ? 'brakePosX' : 'brakeNegX';
        worm.dirX = sx > 0 ? 1 : -1;
        worm.dirZ = 0;
      } else {
        worm.script = sz > 0 ? 'brakePosZ' : 'brakeNegZ';
        worm.dirX = 0;
        worm.dirZ = sz > 0 ? 1 : -1;
      }
      worm.step = 1;
      break;
    }
    case WormState.eat:
      worm.script = 'eat';
      break;
    case WormState.recover:
      worm.script = 'recover';
      break;
  }
  worm.frame = 0;
  worm.tickInFrame = 0;
  worm.ticksPerFrame =
    worm.state === WormState.patrol || worm.state === WormState.brake ? 2 : 1;
}

/** 0x14e92: marble/worm overlap test, first touching worm only. */
function checkContact(world: WormWorld, player: WormPlayer) {
  const px = Math.floor(player.x);
  const pz = Math.floor(player.z);
  const ph = Math.floor(player.height);
  for (const worm of world.slots) {
    if (!worm.active) continue;
    const [ox, oz, sx, sz] = wormHitbox(worm);
    const wx0 = (worm.x >> 16) + ox;
    const wz0 = (worm.z >> 16) + oz;
    const wh0 = worm.height >> 16;
    if (
      !endpointsOverlap(wh0, wh0 + 16, ph, ph + 14) ||
      !endpointsOverlap(wx0, wx0 + sx, px - 3, px + 3) ||
      !endpointsOverlap(wz0, wz0 + sz, pz - 3, pz + 3)
    )
      continue;
    if (worm.state === WormState.patrol || worm.state === WormState.returning) {
      setState(world, worm, WormState.bumped);
      selectScript(worm, world.spawns[worm.spawnIndex]!);
      worm.vx = worm.bumpVx = fx(player.vx);
      worm.vz = worm.bumpVz = fx(player.vz);
    }
    const lunging =
      worm.state === WormState.attack || worm.state === WormState.recover;
    if (lunging && player.id === worm.target) return;
    if (
      player.arcadeState !== PlayerArcadeState.stunned &&
      worm.state !== WormState.eat
    )
      worm.target = player.id;
    player.x = player.prevX;
    player.z = player.prevZ;
    player.vx = player.vz = 0;
    let stunned = false;
    if (
      player.arcadeState !== PlayerArcadeState.dazed &&
      player.arcadeState !== PlayerArcadeState.stunned
    )
      sound(world, worm, WORM_SOUND_COMMANDS.marbleBumpsWorm);
    if (
      player.arcadeState !== PlayerArcadeState.stunned &&
      player.arcadeState !== PlayerArcadeState.swallowed
    ) {
      player.arcadeState = PlayerArcadeState.stunned;
      stunned = true;
    }
    world.events.push({
      type: 'bump',
      slot: worm.slot,
      player: player.id,
      stunned,
    });
    return;
  }
}

/** 0x14dec: closest waypoint (first minimum, `max + 3 * (min >> 3)` on cells * 16). */
function nearestWaypoint(worm: WormSlot, spawn: WormSpawnDefinition): number {
  const cx = worm.x >> CELL_SHIFT;
  const cz = worm.z >> CELL_SHIFT;
  let best = 0x400;
  let index = worm.waypoint;
  spawn.path.forEach(([x, z], i) => {
    const ax = toUWord(Math.abs(cx - x) << 4);
    const az = toUWord(Math.abs(cz - z) << 4);
    const length = toUWord(ax > az ? (az >>> 3) * 3 + ax : (ax >>> 3) * 3 + az);
    if (length < best) {
      best = length;
      index = i;
    }
  });
  return index;
}

/** 0x25e7c mode 2: speed-table friction applied each tick while sliding. */
function slideFriction(worm: WormSlot) {
  const ax = Math.abs(worm.vx);
  const az = Math.abs(worm.vz);
  let speed =
    ax > az
      ? ((((az >>> 3) & 0xffff) * 3) >>> 0) + ax
      : ((((ax >>> 3) & 0xffff) * 3) >>> 0) + az;
  const index = (speed >>> 15) & 15;
  const fraction = (speed >>> 12) & 7;
  const low = SLIDE_FRICTION_TABLE[index]!;
  const high = SLIDE_FRICTION_TABLE[index + 1]!;
  let friction = (((high - low) * fraction) >> 3) + low;
  if (speed < 0x100) speed = 0x100;
  friction *= 4;
  const reduced = friction < speed ? speed - friction : 0;
  const scale = Math.floor((reduced << 6) / (speed >>> 8)) & 0xffff;
  worm.vx = ((worm.vx >> 8) * toWord(scale)) >> 6;
  worm.vz = ((worm.vz >> 8) * toWord(scale)) >> 6;
}

/** Renderer-facing description of one worm. Units: arcade units; heading in radians. */
export interface WormPose {
  readonly slot: number;
  readonly active: boolean;
  readonly state: WormStateId;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  /** Height above the ground under the worm (lunge arc), units. */
  readonly lift: number;
  /** atan2(dirX, dirZ): +X = PI/2, +Z = 0 (same convention as main's wormPose.ts). */
  readonly heading: number;
  readonly script: WormScriptName;
  readonly frame: number;
  readonly frameCount: number;
  /** Pose-record address in ROM (identifies the arcade sprite). */
  readonly poseId: number;
  readonly hitbox: WormHitbox;
  /** 0..1 progress through the current script, including sub-frame ticks. */
  readonly phase: number;
  /** Body extent along the heading (units from the worm's cell center). */
  readonly rear: number;
  readonly front: number;
  readonly vx: number;
  readonly vz: number;
  readonly target: number;
}

export function readWormPose(
  worm: WormSlot,
  env: Pick<WormEnvironment, 'groundHeight'>,
): WormPose {
  const frames = WORM_SCRIPT_FRAMES[worm.script];
  const frame = Math.max(0, Math.min(frames.length - 1, worm.frame));
  const poseId = frames[frame]!;
  const hitbox = WORM_POSE_HITBOX[poseId] ?? WORM_DEFAULT_HITBOX;
  const [ox, oz, sx, sz] = hitbox;
  const along =
    worm.dirX > 0
      ? [ox, ox + sx]
      : worm.dirX < 0
        ? [-(ox + sx), -ox]
        : worm.dirZ < 0
          ? [-(oz + sz), -oz]
          : [oz, oz + sz];
  const x = worm.x / ONE;
  const z = worm.z / ONE;
  const height = worm.height / ONE;
  return {
    slot: worm.slot,
    active: worm.active,
    state: worm.state,
    x,
    z,
    height,
    lift: worm.active ? height - env.groundHeight(x, z, worm.layer) : 0,
    heading: Math.atan2(worm.dirX, worm.dirZ),
    script: worm.script,
    frame,
    frameCount: frames.length,
    poseId,
    hitbox,
    phase: Math.min(
      1,
      (frame + worm.tickInFrame / worm.ticksPerFrame) / frames.length,
    ),
    rear: along[0]!,
    front: along[1]!,
    vx: worm.vx / ONE,
    vz: worm.vz / ONE,
    target: worm.target,
  };
}

function wormHitbox(worm: WormSlot): WormHitbox {
  const frames = WORM_SCRIPT_FRAMES[worm.script];
  const pose = frames[worm.frame];
  return pose === undefined
    ? WORM_DEFAULT_HITBOX
    : (WORM_POSE_HITBOX[pose] ?? WORM_DEFAULT_HITBOX);
}

/** ROM overlap test: one end of the player's interval lies inside the worm's. */
function endpointsOverlap(lo: number, hi: number, a: number, b: number) {
  return (lo <= a && a <= hi) || (lo <= b && b <= hi);
}

function setState(world: WormWorld, worm: WormSlot, to: WormStateId) {
  if (worm.state === to) return;
  world.events.push({ type: 'state', slot: worm.slot, from: worm.state, to });
  worm.state = to;
}

function sound(world: WormWorld, worm: WormSlot, command: number) {
  world.events.push({ type: 'sound', command, slot: worm.slot });
}

function sameLayer(worm: WormSlot, player: WormPlayer) {
  return player.layer === undefined || player.layer === worm.layer;
}

function ground(env: WormEnvironment, worm: WormSlot, x: number, z: number) {
  return fx(env.groundHeight(x / ONE, z / ONE, worm.layer));
}

function cellCenter(cell: number) {
  return cell * 8 * ONE + 0x40000;
}

function fx(units: number) {
  return Math.round(units * ONE);
}

function toByte(n: number) {
  return ((n & 0xff) << 24) >> 24;
}

function toWord(n: number) {
  return ((n & 0xffff) << 16) >> 16;
}

function toUWord(n: number) {
  return n & 0xffff;
}

/** `divs.w`: truncating 32/16 division; on overflow the 68010 leaves the dividend. */
function divsW(dividend: number, divisor: number) {
  const q = Math.trunc(dividend / toWord(divisor));
  return q > 0x7fff || q < -0x8000 ? toWord(dividend) : q;
}
