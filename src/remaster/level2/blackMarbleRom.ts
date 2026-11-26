/**
 * Level 2 (Beginner Race) enemy-marble data decoded from the 68010 program
 * ROM (Marble Madness set 1, `136033.623..630` + `136033.107/108`).
 *
 * Everything in this file is DECODED (read from ROM tables or constants in
 * the routines listed next to each field). See
 * `docs/remaster/level2-black-marble.md` for the full analysis and for what
 * remains inferred.
 *
 * Coordinate conventions (same as `local-roms/intermediate-terrain.json`):
 * - `x`, `z` are arcade cell indices (`rows[z][x]` in the survey). One cell is
 *   8 arcade units; a node's steering target is the cell centre (`+0.5`).
 * - Speeds are arcade units per game tick. The 68010 main loop
 *   (`0x11804..0x118ce`, waits at `0x28dea`) runs the game logic once every
 *   two video frames, i.e. one tick = 1/30 s.
 */

/** Seconds per 68010 game-logic tick (main loop waits two VBLANKs). */
export const ARCADE_TICK_SECONDS = 1 / 30;
/** Arcade units per terrain cell (`pos >> 19` in 16.16 fixed point). */
export const ARCADE_UNITS_PER_CELL = 8;

export interface PatrolNode {
  /** Cell X index (byte 0 of the 6-byte node record). */
  readonly x: number;
  /** Cell Z index (byte 1 of the node record). */
  readonly z: number;
  /** Four successor node indices (bytes 2..5). `links[0]` is the patrol successor. */
  readonly links: readonly [number, number, number, number];
}

export interface EnemyMarbleSpec {
  readonly id: string;
  /** Address of the 8-byte spawn record in the per-level table `0x22706`. */
  readonly spawnRecordAddress: number;
  /** Address of the node graph (`$72(A2)`), terminated by `0xff 0xff`. */
  readonly graphAddress: number;
  /** Course zone the enemy belongs to (`$1b(A2)`, record byte 6). Never updated for enemies. */
  readonly zone: number;
  /** Scroll rows whose entry from outside spawns the enemy (record bytes 0 and 1). */
  readonly spawnRows: { readonly first: number; readonly last: number };
  /** Scroll rows `$76/$78`; leaving below `first` or above `last` removes the enemy. */
  readonly keepRows: { readonly first: number; readonly last: number };
  /**
   * `0x15f38..0x15f48`: zone 7 and zone 9 enemies keep attacking at close
   * range after their give-up timer expired; all others only patrol.
   */
  readonly attacksAfterGiveUp: boolean;
  readonly nodes: readonly PatrolNode[];
}

function node(
  x: number,
  z: number,
  links: readonly [number, number, number, number],
): PatrolNode {
  return { x, z, links };
}

/**
 * Level 2 entries of table `0x22706` (`0x22726` and `0x2272e`).
 *
 * The first one is the black marble of the issue: it spawns at the bottom of
 * the corridor (40,35), climbs it along z = 35 through nodes 0 → 1 → 8 → 7 → 6
 * and then loops 5 → 2 → 3 → 4 → 5 on the upper plateau.
 */
export const LEVEL2_BLACK_MARBLE: EnemyMarbleSpec = {
  id: 'level2-black-marble',
  spawnRecordAddress: 0x22726,
  graphAddress: 0x2276e,
  zone: 1,
  spawnRows: { first: 0x00, last: 0x1f },
  // 0x15a9a..0x15aa6: the 0x2276e graph gets `$78 = B - 0x10`.
  keepRows: { first: 0x00, last: 0x0f },
  attacksAfterGiveUp: false,
  nodes: [
    node(40, 35, [1, 1, 1, 1]),
    node(36, 35, [8, 8, 8, 8]),
    node(25, 31, [3, 5, 4, 6]),
    node(22, 30, [4, 2, 5, 5]),
    node(19, 31, [5, 2, 3, 6]),
    node(22, 32, [2, 3, 4, 6]),
    node(22, 35, [5, 4, 4, 4]),
    node(25, 35, [6, 6, 6, 6]),
    node(28, 35, [7, 7, 7, 7]),
    node(26, 34, [7, 7, 7, 7]),
    node(25, 34, [7, 7, 7, 7]),
    node(24, 34, [6, 6, 6, 6]),
    node(23, 34, [6, 6, 6, 6]),
  ],
};

/** Second Level 2 enemy marble (zone 7, graph `0x227c2`), spawned at scroll row 15. */
export const LEVEL2_SECOND_MARBLE: EnemyMarbleSpec = {
  id: 'level2-second-marble',
  spawnRecordAddress: 0x2272e,
  graphAddress: 0x227c2,
  zone: 7,
  spawnRows: { first: 0x0f, last: 0x28 },
  keepRows: { first: 0x0f, last: 0x28 },
  attacksAfterGiveUp: true,
  nodes: [
    node(57, 69, [1, 2, 3, 3]),
    node(58, 72, [2, 0, 0, 0]),
    node(59, 69, [3, 0, 1, 4]),
    node(58, 66, [0, 2, 4, 4]),
    node(60, 64, [3, 2, 2, 2]),
    node(63, 64, [4, 4, 4, 4]),
    node(63, 67, [5, 5, 5, 5]),
    node(66, 70, [6, 6, 6, 6]),
    node(66, 70, [7, 7, 7, 7]),
    node(66, 67, [8, 8, 8, 8]),
    node(66, 64, [9, 9, 9, 9]),
  ],
};

/** Both Level 2 entries, in ROM order. */
export const LEVEL2_ENEMY_MARBLES: readonly EnemyMarbleSpec[] = [
  LEVEL2_BLACK_MARBLE,
  LEVEL2_SECOND_MARBLE,
];

export interface ZoneBoundary {
  readonly romAddress: number;
  /** `x`: the segment is the cell column `x = line`; `z`: the row `z = line`. */
  readonly axis: 'x' | 'z';
  readonly line: number;
  /** Inclusive range of the other coordinate covered by the segment. */
  readonly from: number;
  readonly to: number;
  /** Zone given when leaving the segment toward smaller `axis` values. */
  readonly lowerZone: number;
  /** Zone given when leaving the segment toward larger `axis` values. */
  readonly higherZone: number;
}

/** `0xff`: the zone reached by crossing the finish line (handled as GOAL at `0x1379a`). */
export const GOAL_ZONE = 0xff;

function boundary(
  romAddress: number,
  axis: 'x' | 'z',
  line: number,
  from: number,
  to: number,
  lowerZone: number,
  higherZone: number,
): ZoneBoundary {
  return { romAddress, axis, line, from, to, lowerZone, higherZone };
}

/**
 * Level 2 boundary table `0x239fa` (pointer at `0x1eb16 + 4`), decoded by
 * the zone tracker `0x1365c`. Players start in zone 0.
 */
export const LEVEL2_ZONE_BOUNDARIES: readonly ZoneBoundary[] = [
  boundary(0x239fa, 'z', 25, 15, 18, 0, 1),
  boundary(0x23a00, 'z', 25, 25, 28, 0, 1),
  // The black marble's "lower descent boundary": leaving column x = 30
  // toward +x (down the corridor) moves the player out of zone 1.
  boundary(0x23a06, 'x', 30, 34, 37, 1, 2),
  boundary(0x23a0c, 'z', 37, 37, 54, 2, 3),
  boundary(0x23a12, 'x', 37, 38, 56, 2, 3),
  boundary(0x23a18, 'x', 56, 49, 56, 3, 4),
  boundary(0x23a1e, 'z', 55, 60, 64, 4, 5),
  boundary(0x23a24, 'z', 59, 61, 64, 5, 6),
  boundary(0x23a2a, 'x', 61, 59, 81, 7, 6),
  boundary(0x23a30, 'x', 68, 74, 79, 6, 8),
  boundary(0x23a36, 'z', 68, 75, 79, 6, 10),
  boundary(0x23a3c, 'x', 76, 74, 81, 8, 9),
  boundary(0x23a42, 'z', 83, 78, 82, 9, 11),
  boundary(0x23a48, 'z', 83, 84, 88, 10, 11),
  boundary(0x23a4e, 'x', 107, 94, 107, 11, 12),
  boundary(0x23a54, 'z', 108, 110, 113, 12, GOAL_ZONE),
];

/** Level 2 descriptor `0x2c54c`, word `+0x10`: scroll of row 0. */
export const LEVEL2_SCROLL_ROW0 = -16152;

/**
 * Enemy-marble AI constants, in arcade units and ticks (all DECODED).
 */
export const ENEMY_MARBLE_AI = {
  /** `$68` per mode, set at `0x15f92..0x15fce` (16.16 → units/tick). */
  patrolSpeed: 7, // 0x20: 0x70 << 12
  attackSpeed: 12, // 0x21: 0xc0 << 12
  chaseSpeed: 8, // 0x22: 0x80 << 12
  returnSpeed: 7, // 0x23: 0x160e8 and 0x15fc2
  /** `0x183b2`: closer than 0x40/16 units to the steering target → `$68 = 1.0`. */
  approachSpeed: 1,
  approachRadiusUnits: 4,
  /** `0x15f28`: octagonal distance below 0x280/16 units → attack (0x21). */
  attackRadiusUnits: 40,
  /** `0x183d8..0x183e0`: velocity moves 1/32 of the error per tick. */
  steeringDivisor: 32,
  /** `0x26196`: speed clamp (octagonal norm) 5.0 for enemies (4.0 for state 0). */
  speedCap: 5,
  /** `0x1bf4c`: first marble contact arms a 0x96-tick give-up timer. */
  giveUpTicks: 0x96,
  /** `0x15c74` / `0x15d30`: initial best distances of the node searches (cells × 16). */
  linkSearchLimit: 0x800,
  nearestSearchLimit: 0x400,
  /** `0x1225a`: enemy below the ground by more than 16 units is destroyed. */
  fallDestroyUnits: 16,
  /** Score table `0x23cd4`, index 3 (`0x15c20`, `0x285b0`). */
  destroyScore: 1000,
} as const;
