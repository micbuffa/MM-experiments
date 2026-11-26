import {
  ARCADE_TICK_SECONDS,
  ARCADE_UNITS_PER_CELL,
  ENEMY_MARBLE_AI,
  type EnemyMarbleSpec,
  type PatrolNode,
} from './blackMarbleRom';
import { cellOf, type CellCoord } from './enemyZones';

/**
 * Pure, deterministic port of the 68010 enemy-marble AI used by the Level 2
 * black marble (routines `0x158f6`, `0x182ba`, `0x15db6`, `0x15e24`,
 * `0x1605c`, `0x15c46`, `0x15d10`, `0x160d4`, bump at `0x1bf3e`).
 *
 * Positions are continuous arcade cell coordinates (same axes as
 * `intermediate-terrain.json`), velocities cells/s, accelerations cells/s².
 * Decisions run on the arcade 30 Hz tick; steering output is refreshed on
 * every call so it can drive a 60 Hz physics step.
 */

/** `$1a(A2)` values: 0x20 patrol, 0x21 attack, 0x22 chase, 0x23 return. */
export type EnemyMode = 'patrol' | 'attack' | 'chase' | 'return';

export const ENEMY_MODE_CODE: Readonly<Record<EnemyMode, number>> = {
  patrol: 0x20,
  attack: 0x21,
  chase: 0x22,
  return: 0x23,
};

export interface EnemyMarbleState {
  readonly mode: EnemyMode;
  /** Current node (`$6e`), index into `spec.nodes`. */
  readonly nodeIndex: number;
  /** Targeted player index (`$7a`). */
  readonly targetPlayer: number;
  /** Desired speed `$68`, arcade units per tick. */
  readonly speed: number;
  /** `$6c`: -1 until the first marble contact, then counts down to 0 (give up). */
  readonly giveUpTicks: number;
  /** Seconds accumulated toward the next 30 Hz AI tick. */
  readonly tickClock: number;
  /** Number of AI ticks run since spawn. */
  readonly ticks: number;
  /** Remaster-only wall-stall watchdog (consecutive stalled AI ticks). */
  readonly stallTicks: number;
}

export interface EnemyPlayerView {
  readonly x: number;
  readonly z: number;
  /** `$18 == 1`: in play. */
  readonly active: boolean;
  /** Player zone `$1b`, tracked with `nextZone`. */
  readonly zone: number;
  /** `$36 == 2`: in the air. Airborne players are never targeted. */
  readonly airborne: boolean;
  /** `$1a ∈ {0, 1, 5}`: normal rolling (not dying, rebuilding, in a pipe...). */
  readonly targetable: boolean;
}

export interface Vec2 {
  readonly x: number;
  readonly z: number;
}

export interface EnemySelfView extends Vec2 {
  /** Horizontal velocity, cells/s. */
  readonly vx: number;
  readonly vz: number;
  /** `$36 != 0`: not on the ground. No steering, no attack. */
  readonly airborne: boolean;
  /**
   * Remaster only: horizontal unit normal of a wall the body currently
   * touches, pointing from the wall toward the marble.
   */
  readonly wallNormal?: Vec2 | null;
  /**
   * Remaster only: horizontal acceleration the physics applies on this slope
   * (gravity along the ground), cells/s². Used by `slopeCompensation`.
   */
  readonly slopeAcceleration?: Vec2 | null;
}

export interface EnemyControllerOptions {
  /** Body mass used for `desiredForce` (default 1). */
  readonly mass?: number;
  /** Multiplier on ROM speeds for Remaster calibration (default 1). */
  readonly speedScale?: number;
  /** Drop the into-wall component of the steering (default true). */
  readonly wallSlide?: boolean;
  /** Fraction (0..1) of `slopeAcceleration` cancelled (default 0 = arcade). */
  readonly slopeCompensation?: number;
  /** Below this speed (cells/s) while steering, a tick counts as stalled (default 1). */
  readonly stallSpeed?: number;
  /** Stalled ticks before the release push (default 12 = 0.4 s). */
  readonly stallTicks?: number;
  /** Release push along the wall normal / steering when stalled (cells/s², default 12). */
  readonly stallPush?: number;
}

export interface EnemyStepOutput {
  readonly state: EnemyMarbleState;
  /** Velocity the arcade controller tracks, cells/s (zero when airborne). */
  readonly desiredVelocity: Vec2;
  /** Acceleration to apply this step, cells/s². */
  readonly acceleration: Vec2;
  /** `acceleration * mass`, to feed `applyForce` at the centre of mass. */
  readonly desiredForce: Vec2;
  /** Speed clamp (octagonal norm, see `clampEnemyVelocity`), cells/s. */
  readonly maxSpeed: number;
  /** Point the marble steers to (node centre or target player). */
  readonly steeringTarget: Vec2;
  readonly stalled: boolean;
}

const ZERO: Vec2 = { x: 0, z: 0 };
const CELLS_PER_SECOND_PER_UNIT_TICK =
  1 / (ARCADE_UNITS_PER_CELL * ARCADE_TICK_SECONDS);
const TICK_EPSILON = 1e-9;

/** Arcade octagonal distance `max + 3·(min >> 3)` on non-negative integers. */
export function octagonalDistance(a: number, b: number): number {
  return a > b ? (b >> 3) * 3 + a : (a >> 3) * 3 + b;
}

/** Distance in 1/16 arcade units, as computed from 16.16 positions (`|d| >> 12`). */
function sixteenthDistance(from: Vec2, to: Vec2): number {
  const scale = ARCADE_UNITS_PER_CELL * 16;
  return octagonalDistance(
    Math.floor(Math.abs(to.x - from.x) * scale),
    Math.floor(Math.abs(to.z - from.z) * scale),
  );
}

/** Distance between two cells in the `cells × 16` metric of `0x15c46/0x15d10`. */
function cellDistance(a: CellCoord, b: CellCoord): number {
  return octagonalDistance(Math.abs(a.x - b.x) * 16, Math.abs(a.z - b.z) * 16);
}

export function nodeCentre(nodeValue: PatrolNode): Vec2 {
  return { x: nodeValue.x + 0.5, z: nodeValue.z + 0.5 };
}

/** Node by index; graphs are validated so a miss is a programming error. */
export function nodeAt(spec: EnemyMarbleSpec, index: number): PatrolNode {
  const found = spec.nodes[index];
  if (!found) throw new RangeError(`${spec.id}: no node ${index}`);
  return found;
}

function playerAt(
  players: readonly EnemyPlayerView[],
  index: number,
): EnemyPlayerView {
  const found = players[index];
  if (!found) throw new RangeError(`no player ${index}`);
  return found;
}

/** `0x15d10`: node nearest to the enemy's cell (first strict minimum). */
export function nearestNodeIndex(
  spec: EnemyMarbleSpec,
  self: Vec2,
  current: number,
): number {
  const cell = cellOf(self);
  let best: number = ENEMY_MARBLE_AI.nearestSearchLimit;
  let index = current;
  spec.nodes.forEach((candidate, i) => {
    const d = cellDistance(cell, candidate);
    if (d < best) {
      best = d;
      index = i;
    }
  });
  return index;
}

/** `0x15c46`: which of the current node's four links is closest to the player. */
export function closestLinkSlot(
  spec: EnemyMarbleSpec,
  nodeIndex: number,
  player: Vec2,
): number {
  const cell = cellOf(player);
  let best: number = ENEMY_MARBLE_AI.linkSearchLimit;
  let slot = 0;
  nodeAt(spec, nodeIndex).links.forEach((link, i) => {
    const d = cellDistance(cell, nodeAt(spec, link));
    if (d < best) {
      best = d;
      slot = i;
    }
  });
  return slot;
}

function speedFor(mode: EnemyMode): number {
  switch (mode) {
    case 'patrol':
      return ENEMY_MARBLE_AI.patrolSpeed;
    case 'attack':
      return ENEMY_MARBLE_AI.attackSpeed;
    case 'chase':
      return ENEMY_MARBLE_AI.chaseSpeed;
    case 'return':
      return ENEMY_MARBLE_AI.returnSpeed;
  }
}

/** Fresh state right after the spawn at node 0 (`0x15a74..0x15b2a`). */
export function createEnemyMarbleState(): EnemyMarbleState {
  return {
    mode: 'patrol',
    nodeIndex: 0,
    targetPlayer: 0,
    speed: ENEMY_MARBLE_AI.patrolSpeed,
    giveUpTicks: -1,
    tickClock: 0,
    ticks: 0,
    stallTicks: 0,
  };
}

/** `0x160d4`: go back to the graph through the nearest node at return speed. */
function enterReturn(
  spec: EnemyMarbleSpec,
  state: EnemyMarbleState,
  self: Vec2,
): EnemyMarbleState {
  return {
    ...state,
    mode: 'return',
    nodeIndex: nearestNodeIndex(spec, self, state.nodeIndex),
    speed: ENEMY_MARBLE_AI.returnSpeed,
  };
}

function isEligible(spec: EnemyMarbleSpec, player: EnemyPlayerView): boolean {
  return (
    player.active &&
    player.zone === spec.zone &&
    !player.airborne &&
    player.targetable
  );
}

/** `0x15fe6`: with two eligible players, target player 2 only if further down the course. */
function pickTarget(
  players: readonly EnemyPlayerView[],
  eligible: readonly number[],
): number {
  if (players.length === 2 && eligible.length === 2) {
    const p1 = cellOf(playerAt(players, 0));
    const p2 = cellOf(playerAt(players, 1));
    return p2.x + p2.z > p1.x + p1.z ? 1 : 0;
  }
  return eligible[eligible.length - 1] ?? 0;
}

/** `0x15e24` + `0x1605c`: mode decision and next node. */
function decide(
  spec: EnemyMarbleSpec,
  state: EnemyMarbleState,
  self: EnemySelfView,
  players: readonly EnemyPlayerView[],
  arrived: boolean,
): EnemyMarbleState {
  const previousMode = state.mode;
  const eligible = players.flatMap((p, i) => (isEligible(spec, p) ? [i] : []));
  let next: EnemyMarbleState = state;
  let mode: EnemyMode;
  if (eligible.length === 0) {
    mode = state.mode === 'return' ? 'return' : 'patrol';
  } else {
    const targetPlayer = pickTarget(players, eligible);
    next = { ...next, targetPlayer };
    const distance = sixteenthDistance(self, playerAt(players, targetPlayer));
    const inRange = distance < ENEMY_MARBLE_AI.attackRadiusUnits * 16;
    const mayAttack = state.giveUpTicks !== 0 || spec.attacksAfterGiveUp;
    if (inRange && mayAttack && !self.airborne) mode = 'attack';
    else if (state.giveUpTicks !== 0) mode = 'chase';
    else mode = state.mode === 'return' ? 'return' : 'patrol';
  }
  next = { ...next, mode };
  let replan = arrived;
  if (mode !== previousMode) {
    if (previousMode === 'attack') next = enterReturn(spec, next, self);
    else replan = true;
  }
  if (!replan) return next;
  next = { ...next, speed: speedFor(next.mode) };
  const links = nodeAt(spec, next.nodeIndex).links;
  if (next.mode === 'patrol') return { ...next, nodeIndex: links[0] };
  if (next.mode === 'chase') {
    const slot = closestLinkSlot(
      spec,
      next.nodeIndex,
      playerAt(players, next.targetPlayer),
    );
    return { ...next, nodeIndex: links[slot] ?? links[0] };
  }
  return next;
}

/** One 30 Hz AI tick: `0x158f6` timer, then `0x15db6` decision. */
function aiTick(
  spec: EnemyMarbleSpec,
  state: EnemyMarbleState,
  self: EnemySelfView,
  players: readonly EnemyPlayerView[],
): EnemyMarbleState {
  let next: EnemyMarbleState = { ...state, ticks: state.ticks + 1 };
  if (next.giveUpTicks > 0) {
    next = { ...next, giveUpTicks: next.giveUpTicks - 1 };
    if (
      next.giveUpTicks === 0 &&
      (next.mode === 'attack' || next.mode === 'chase')
    ) {
      next = enterReturn(spec, next, self);
    }
  }
  const cell = cellOf(self);
  const target = nodeAt(spec, next.nodeIndex);
  const arrived = cell.x === target.x && cell.z === target.z;
  if (arrived && next.mode === 'return') next = { ...next, mode: 'patrol' };
  if (next.mode === 'return') {
    return { ...next, nodeIndex: nearestNodeIndex(spec, self, next.nodeIndex) };
  }
  return decide(spec, next, self, players, arrived);
}

/** Steering target of `0x182ba`: the player in attack mode, else the node centre. */
function steeringTargetOf(
  spec: EnemyMarbleSpec,
  state: EnemyMarbleState,
  players: readonly EnemyPlayerView[],
): Vec2 {
  const player = players[state.targetPlayer];
  if (
    state.mode === 'attack' &&
    player &&
    player.active &&
    player.zone === spec.zone &&
    player.targetable
  ) {
    return { x: player.x, z: player.z };
  }
  return nodeCentre(nodeAt(spec, state.nodeIndex));
}

function scale(v: Vec2, k: number): Vec2 {
  return { x: v.x * k, z: v.z * k };
}

function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, z: a.z + b.z };
}

/** Octagonal clamp of `0x26196`, in cells/s. */
export function clampEnemyVelocity(velocity: Vec2, speedScale = 1): Vec2 {
  const cap =
    ENEMY_MARBLE_AI.speedCap * CELLS_PER_SECOND_PER_UNIT_TICK * speedScale;
  const norm = octagonalNorm(velocity.x, velocity.z);
  return norm > cap ? scale(velocity, cap / norm) : velocity;
}

/** Continuous form of the arcade octagonal norm (`max + 3/8 · min`). */
export function octagonalNorm(x: number, z: number): number {
  const ax = Math.abs(x);
  const az = Math.abs(z);
  return ax > az ? ax + az * 0.375 : az + ax * 0.375;
}

/**
 * Advance the controller by `dt` seconds and return the steering to apply.
 * Deterministic: same inputs, same outputs.
 */
export function stepEnemyMarble(
  spec: EnemyMarbleSpec,
  state: EnemyMarbleState,
  self: EnemySelfView,
  players: readonly EnemyPlayerView[],
  dt: number,
  options: EnemyControllerOptions = {},
): EnemyStepOutput {
  const speedScale = options.speedScale ?? 1;
  const stallSpeed = options.stallSpeed ?? 1;
  const stallLimit = options.stallTicks ?? 12;
  let next: EnemyMarbleState = {
    ...state,
    tickClock: state.tickClock + Math.max(0, dt),
  };
  let ranTick = false;
  while (next.tickClock + TICK_EPSILON >= ARCADE_TICK_SECONDS) {
    next = aiTick(
      spec,
      { ...next, tickClock: next.tickClock - ARCADE_TICK_SECONDS },
      self,
      players,
    );
    ranTick = true;
  }
  if (next.tickClock < 0) next = { ...next, tickClock: 0 };

  let target = steeringTargetOf(spec, next, players);
  const distance = sixteenthDistance(self, target);
  if (ranTick && distance < ENEMY_MARBLE_AI.approachRadiusUnits * 16) {
    next = { ...next, speed: ENEMY_MARBLE_AI.approachSpeed };
  }
  const maxSpeed =
    ENEMY_MARBLE_AI.speedCap * CELLS_PER_SECOND_PER_UNIT_TICK * speedScale;
  if (self.airborne) {
    target = { x: self.x, z: self.z };
    return {
      state: { ...next, stallTicks: 0 },
      desiredVelocity: ZERO,
      acceleration: ZERO,
      desiredForce: ZERO,
      maxSpeed,
      steeringTarget: target,
      stalled: false,
    };
  }

  const dx = target.x - self.x;
  const dz = target.z - self.z;
  const norm = octagonalNorm(dx, dz);
  const speed = next.speed * CELLS_PER_SECOND_PER_UNIT_TICK * speedScale;
  const desiredVelocity =
    norm > 0 ? { x: (dx / norm) * speed, z: (dz / norm) * speed } : ZERO;
  const gain = 1 / (ENEMY_MARBLE_AI.steeringDivisor * ARCADE_TICK_SECONDS);
  let acceleration: Vec2 = scale(
    { x: desiredVelocity.x - self.vx, z: desiredVelocity.z - self.vz },
    gain,
  );

  const compensation = options.slopeCompensation ?? 0;
  if (compensation > 0 && self.slopeAcceleration) {
    acceleration = add(
      acceleration,
      scale(self.slopeAcceleration, -compensation),
    );
  }

  const wall = self.wallNormal ?? null;
  if ((options.wallSlide ?? true) && wall) {
    const into = acceleration.x * wall.x + acceleration.z * wall.z;
    if (into < 0) acceleration = add(acceleration, scale(wall, -into));
  }

  const currentSpeed = Math.hypot(self.vx, self.vz);
  const wantsToMove =
    Math.hypot(desiredVelocity.x, desiredVelocity.z) > stallSpeed;
  let stallTicks = next.stallTicks;
  if (ranTick)
    stallTicks = wantsToMove && currentSpeed < stallSpeed ? stallTicks + 1 : 0;
  const stalled = stallTicks >= stallLimit;
  if (stalled) {
    const push = options.stallPush ?? 12;
    const along =
      norm > 0 ? scale({ x: dx, z: dz }, push / Math.hypot(dx, dz)) : ZERO;
    acceleration = add(
      acceleration,
      wall ? add(scale(wall, push), along) : along,
    );
  }

  const mass = options.mass ?? 1;
  return {
    state: { ...next, stallTicks },
    desiredVelocity,
    acceleration,
    desiredForce: scale(acceleration, mass),
    maxSpeed,
    steeringTarget: target,
    stalled,
  };
}

/**
 * Marble-to-marble contact (`0x1bf3e..0x1bf8a`): the first contact arms the
 * 150-tick give-up timer; every contact sends the enemy back to the graph.
 * (The ROM writes state 0x24 there but `0x160d4` overwrites it with 0x23.)
 */
export function bumpEnemyMarble(
  spec: EnemyMarbleSpec,
  state: EnemyMarbleState,
  self: Vec2,
): EnemyMarbleState {
  const giveUpTicks =
    state.giveUpTicks === -1 ? ENEMY_MARBLE_AI.giveUpTicks : state.giveUpTicks;
  return enterReturn(spec, { ...state, giveUpTicks }, self);
}

/** `0x12256`: the enemy fell more than 16 units below the ground → destroyed, 1000 points. */
export function enemyFellOff(
  groundHeightUnits: number,
  selfHeightUnits: number,
): boolean {
  return groundHeightUnits - selfHeightUnits > ENEMY_MARBLE_AI.fallDestroyUnits;
}

/**
 * `0x1bfba..0x1bff0`: an airborne marble touching another while at the same
 * height or above squashes it. Squashing an enemy awards 1000 points to every
 * active player; squashing a player kills that player.
 */
export function landsOn(
  attackerAirborne: boolean,
  attackerHeight: number,
  victimHeight: number,
): boolean {
  return attackerAirborne && attackerHeight - victimHeight >= 0;
}
