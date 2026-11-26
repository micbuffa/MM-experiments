/**
 * Green worm ("slinky") constants and tables decoded from the 68010 program
 * of Marble Madness (set 1). Every value below was read statically from the
 * program image; addresses are 68010 bus addresses. See
 * docs/remaster/level2-green-worms.md for the routine-by-routine analysis.
 *
 * Units: positions use arcade units (1 terrain cell = 8 units), velocities use
 * arcade units per game tick, the routines themselves use 16.16 fixed point.
 */

/** Hitbox of one sprite pose: [x offset, z offset, x size, z size] in units (bytes 4..7 of the pose record). */
export type WormHitbox = readonly [number, number, number, number];

/** One waypoint: [cell x, cell z, index of the next waypoint]. */
export type WormWaypoint = readonly [number, number, number];

export interface WormSpawnDefinition {
  /** Scroll row that opens/closes the band (signed byte, table offset 0). */
  readonly minRow: number;
  /** Scroll row that opens/closes the band (signed byte, table offset 1). */
  readonly maxRow: number;
  /** Terrain layer byte copied to the worm (`$1b`), table offset 6. */
  readonly layer: number;
  /** ROM address of the waypoint list (diagnostic only). */
  readonly pathAddress: number;
  /** Waypoints; entry 0 is the spawn cell. */
  readonly path: readonly WormWaypoint[];
}

/** Animation scripts: lists of pose-record addresses ending with 0xffffffff. */
export const WORM_SCRIPT_FRAMES = {
  /** Script table 0x20c18, 11 poses. */
  idle: [
    0x21a6a, 0x21a8e, 0x21a9a, 0x21a9a, 0x21a9a, 0x21a8e, 0x21a76, 0x21a82,
    0x21a82, 0x21a82, 0x21a76,
  ],
  /** Script table 0x20c48, 8 poses (inchworm step toward +X). */
  walkPosX: [
    0x21a6a, 0x21aa6, 0x21ab2, 0x21abe, 0x21aca, 0x21ad6, 0x21ae2, 0x21aee,
  ],
  /** Script table 0x20c6c, 8 poses (step toward +Z). */
  walkPosZ: [
    0x21a6a, 0x21b4e, 0x21b5a, 0x21b66, 0x21b72, 0x21b7e, 0x21b8a, 0x21b96,
  ],
  /** Script table 0x20c90, 8 poses (step toward -Z). */
  walkNegZ: [
    0x21a6a, 0x21ba2, 0x21bae, 0x21bba, 0x21bc6, 0x21bd2, 0x21bde, 0x21bea,
  ],
  /** Script table 0x20cb4, 8 poses (step toward -X). */
  walkNegX: [
    0x21a6a, 0x21afa, 0x21b06, 0x21b12, 0x21b1e, 0x21b2a, 0x21b36, 0x21b42,
  ],
  /** Script table 0x20cd8, 34 poses (rear up and lunge). */
  attack: [
    0x21a6a, 0x21bf6, 0x21bf6, 0x21c02, 0x21c02, 0x21c02, 0x21c0e, 0x21c0e,
    0x21c0e, 0x21c0e, 0x21c0e, 0x21c0e, 0x21c0e, 0x21c0e, 0x21c0e, 0x21c0e,
    0x21c0e, 0x21c1a, 0x21c1a, 0x21c1a, 0x21c26, 0x21c26, 0x21c32, 0x21c32,
    0x21c3e, 0x21c3e, 0x21c3e, 0x21c4a, 0x21c4a, 0x21c4a, 0x21c4a, 0x21c4a,
    0x21c4a, 0x21c4a,
  ],
  /** Script table 0x20d64, 1 pose (held while sliding after a bump). */
  bumped: [0x21a6a],
  /** Script table 0x20d6c, 26 poses (missed lunge, straighten, idle wiggle). */
  recover: [
    0x21c4a, 0x21c4a, 0x21c56, 0x21c56, 0x21c56, 0x21c62, 0x21c6e, 0x21c7a,
    0x21c86, 0x21c92, 0x21c9e, 0x21a6a, 0x21a6a, 0x21a6a, 0x21a8e, 0x21a9a,
    0x21a9a, 0x21a8e, 0x21a76, 0x21a82, 0x21a82, 0x21a76, 0x21a8e, 0x21a9a,
    0x21a9a, 0x21a8e,
  ],
  /** Script table 0x20dd8, 4 poses. */
  brakePosX: [0x21a6a, 0x21aa6, 0x21ab2, 0x21ab2],
  /** Script table 0x20dec, 4 poses. */
  brakePosZ: [0x21a6a, 0x21b4e, 0x21b5a, 0x21b5a],
  /** Script table 0x20e00, 4 poses. */
  brakeNegZ: [0x21a6a, 0x21ba2, 0x21bae, 0x21bae],
  /** Script table 0x20e14, 4 poses. */
  brakeNegX: [0x21a6a, 0x21afa, 0x21b06, 0x21b06],
  /** Script table 0x20e28, 30 poses (swallow, then tongue). */
  eat: [
    0x21c4a, 0x21c4a, 0x21c56, 0x21c56, 0x21c56, 0x21c62, 0x21c62, 0x21c62,
    0x21c6e, 0x21c6e, 0x21c6e, 0x21c7a, 0x21c86, 0x21c92, 0x21c9e, 0x21a6a,
    0x21a6a, 0x21a6a, 0x21aa6, 0x21caa, 0x21caa, 0x21cb6, 0x21cb6, 0x21cb6,
    0x21cc2, 0x21cc2, 0x21cc2, 0x21cc2, 0x21cb6, 0x21cb6,
  ],
} as const satisfies Record<string, readonly number[]>;

export type WormScriptName = keyof typeof WORM_SCRIPT_FRAMES;

/** ROM address of each script table (used by the emulator-side reader on `main`). */
export const WORM_SCRIPT_ADDRESS: Readonly<Record<WormScriptName, number>> = {
  idle: 0x20c18,
  walkPosX: 0x20c48,
  walkPosZ: 0x20c6c,
  walkNegZ: 0x20c90,
  walkNegX: 0x20cb4,
  attack: 0x20cd8,
  bumped: 0x20d64,
  recover: 0x20d6c,
  brakePosX: 0x20dd8,
  brakePosZ: 0x20dec,
  brakeNegZ: 0x20e00,
  brakeNegX: 0x20e14,
  eat: 0x20e28,
};

/** Hitbox bytes 4..7 of every pose record used by the worm scripts. */
export const WORM_POSE_HITBOX: Readonly<Record<number, WormHitbox>> = {
  0x21a6a: [-4, -4, 8, 8],
  0x21a76: [-4, -4, 8, 8],
  0x21a82: [-4, -4, 8, 8],
  0x21a8e: [-4, -4, 8, 8],
  0x21a9a: [-4, -4, 8, 8],
  0x21aa6: [-4, -4, 9, 8],
  0x21ab2: [-4, -4, 12, 8],
  0x21abe: [-4, -4, 15, 8],
  0x21aca: [-4, -4, 16, 8],
  0x21ad6: [-3, -4, 15, 8],
  0x21ae2: [0, -4, 12, 8],
  0x21aee: [3, -4, 9, 8],
  0x21afa: [-5, -4, 9, 8],
  0x21b06: [-8, -4, 12, 8],
  0x21b12: [-11, -4, 15, 8],
  0x21b1e: [-12, -4, 16, 8],
  0x21b2a: [-12, -4, 15, 8],
  0x21b36: [-12, -4, 12, 8],
  0x21b42: [-12, -4, 9, 8],
  0x21b4e: [-4, -4, 8, 9],
  0x21b5a: [-4, -4, 8, 12],
  0x21b66: [-4, -4, 8, 15],
  0x21b72: [-4, -4, 8, 16],
  0x21b7e: [-4, -3, 8, 15],
  0x21b8a: [-4, 0, 8, 12],
  0x21b96: [-4, 3, 8, 9],
  0x21ba2: [-4, -5, 8, 9],
  0x21bae: [-4, -8, 8, 12],
  0x21bba: [-4, -11, 8, 15],
  0x21bc6: [-4, -12, 8, 16],
  0x21bd2: [-4, -12, 8, 15],
  0x21bde: [-4, -12, 8, 12],
  0x21bea: [-4, -12, 8, 9],
  0x21bf6: [-4, -4, 8, 8],
  0x21c02: [-4, -4, 8, 8],
  0x21c0e: [-4, -4, 8, 8],
  0x21c1a: [-4, -4, 8, 8],
  0x21c26: [-4, -4, 8, 8],
  0x21c32: [-4, -4, 8, 8],
  0x21c3e: [-4, -4, 8, 8],
  0x21c4a: [0, 0, 8, 8],
  0x21c56: [0, 0, 8, 8],
  0x21c62: [0, 0, 8, 8],
  0x21c6e: [0, 0, 8, 8],
  0x21c7a: [0, 0, 8, 8],
  0x21c86: [0, 0, 8, 8],
  0x21c92: [0, 0, 8, 8],
  0x21c9e: [0, 0, 8, 8],
  0x21caa: [-4, -4, 8, 8],
  0x21cb6: [-4, -4, 8, 8],
  0x21cc2: [-4, -4, 8, 8],
};

/** Hitbox used by 0x14e92 when the frame pointer sits on a terminator. */
export const WORM_DEFAULT_HITBOX: WormHitbox = [-4, -4, 8, 8];

/** Leap height table 0x2255a (signed bytes, whole units), indexed by `$27 - 6`. */
export const WORM_LEAP_ARC = [
  0, 5, 10, 15, 18, 22, 24, 26, 28, 29, 30, 30, 31, 31, 32, 32, 31, 31, 30, 30,
  29, 28, 26, 24, 22, 17, 13, 8, 2, -6, 0, 0,
] as const;

/** Speed-indexed friction table 0x1eef8 used by 0x25e7c (16.16 per tick). */
export const SLIDE_FRICTION_TABLE = [
  0x200, 0x400, 0x700, 0xc00, 0x1000, 0x2000, 0x3000, 0x4000, 0x5000, 0x5000,
  0x5000, 0x5000, 0x5000, 0x5000, 0x5000, 0x5000, 0x5000,
] as const;

/** Number of worm slots at 0x401302 (stride 0x60). */
export const WORM_SLOT_COUNT = 4;

/** Level 2 (Beginner Race, level index 1): table 0x2257a[1] = 0x2259a. */
export const LEVEL2_WORM_SPAWNS: readonly WormSpawnDefinition[] = [
  {
    minRow: 5,
    maxRow: 30,
    layer: 3,
    pathAddress: 0x2260a,
    path: [
      [51, 45, 1],
      [49, 44, 2],
      [47, 43, 3],
      [48, 45, 4],
      [50, 45, 5],
      [50, 43, 0],
      [48, 47, 3],
      [47, 48, 6],
      [45, 48, 7],
      [48, 41, 2],
      [46, 41, 9],
      [43, 41, 10],
      [53, 46, 0],
    ],
  },
  {
    minRow: 5,
    maxRow: 31,
    layer: 3,
    pathAddress: 0x22642,
    path: [
      [45, 51, 1],
      [44, 49, 2],
      [43, 47, 3],
      [45, 48, 4],
      [45, 50, 5],
      [43, 50, 0],
      [47, 48, 3],
      [48, 47, 6],
      [48, 45, 7],
      [41, 46, 2],
      [41, 44, 9],
      [41, 42, 10],
      [46, 53, 0],
    ],
  },
  {
    minRow: 6,
    maxRow: 34,
    layer: 4,
    pathAddress: 0x2267a,
    path: [
      [61, 51, 1],
      [59, 52, 2],
      [57, 53, 3],
      [58, 51, 4],
      [60, 51, 5],
      [60, 53, 0],
    ],
  },
];

/** Level 3 (level index 2) mini-worms, table 0x225ba. Same routines. */
export const LEVEL3_WORM_SPAWNS: readonly WormSpawnDefinition[] = [
  {
    minRow: 1,
    maxRow: 24,
    layer: 1,
    pathAddress: 0x22696,
    path: [
      [44, 33, 1],
      [44, 37, 2],
      [42, 37, 3],
      [44, 37, 0],
    ],
  },
  {
    minRow: 1,
    maxRow: 24,
    layer: 2,
    pathAddress: 0x226aa,
    path: [
      [32, 45, 1],
      [36, 45, 2],
      [36, 43, 3],
      [36, 45, 0],
    ],
  },
];

/** Level 6 (level index 5) worms, table 0x225e2. Same routines. */
export const LEVEL6_WORM_SPAWNS: readonly WormSpawnDefinition[] = [
  {
    minRow: 0,
    maxRow: 25,
    layer: 4,
    pathAddress: 0x226be,
    path: [
      [40, 48, 1],
      [39, 49, 2],
      [40, 50, 3],
      [39, 50, 4],
      [40, 49, 5],
      [39, 48, 0],
    ],
  },
  {
    minRow: 0,
    maxRow: 25,
    layer: 4,
    pathAddress: 0x226da,
    path: [
      [41, 57, 1],
      [42, 56, 2],
      [41, 56, 3],
      [42, 57, 0],
    ],
  },
  {
    minRow: 6,
    maxRow: 32,
    layer: 5,
    pathAddress: 0x226ee,
    path: [
      [58, 52, 1],
      [57, 50, 0],
    ],
  },
  {
    minRow: 6,
    maxRow: 32,
    layer: 5,
    pathAddress: 0x226fa,
    path: [
      [64, 49, 1],
      [62, 48, 0],
    ],
  },
];

/** Level descriptor 0x2c54c offset 0x10: scroll value of row 0 on Level 2. */
export const LEVEL2_SCROLL_ROW_ORIGIN = -16152;

/** Sound commands sent through 0x158ac by the worm code (see the findings doc). */
export const WORM_SOUND_COMMANDS = {
  /** 0x15076: marble bumps a worm and becomes dizzy. */
  marbleBumpsWorm: 0x39,
  /** 0x153a2: lunge ends with the marble swallowed. */
  wormSwallowsMarble: 0x33,
  /** 0x15884: end of the eat script. */
  wormFinishesMeal: 0x3a,
  /** 0x1589c: also sent at the end of the eat script, except on level index 2. */
  wormFinishesMealExtra: 0x3b,
  /** 0x25c44: respawn routine 0x25bae mode 4 when `$57 == 0x65` (eaten by a worm). */
  eatenMarbleRespawn: 0x3c,
} as const;
