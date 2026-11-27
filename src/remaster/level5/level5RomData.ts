/**
 * Level 5 (Silly Race) constants and tables decoded statically from the
 * 68010 program ROM (`roms/marble.zip`, course descriptor `0x2de1e`).
 *
 * Level 5 runs UPHILL (`direction = -1`) from the bottom-right spawns
 * `(125.5, 124.5)` / `(123.5, 126.5)` up to the Escher finish `(25..29, 24..34)`.
 * Units: cell coordinates match `local-roms/level5-terrain.json` (141 x 141,
 * origin 0,0; 1 cell = 8 arcade units).
 */

/** Course descriptor 0x2de1e (+0x14 = 0x7d7c, +0x16 = 0x7b7e, height 16168). */
export const LEVEL5_SPAWNS = {
  player1Cell: { x: 125.5, z: 124.5, height: 16168 },
  player2Cell: { x: 123.5, z: 126.5, height: 16168 },
} as const;

/**
 * Silly Arena miniature-enemy bounds decoded from ROM 0x1904e..0x19094:
 * x = (rand(32) << 2) + 0x2ca -> [89.25 .. 104.75] cells
 * z = (rand(32) << 2) + 0x2d2 -> [90.25 .. 105.75] cells
 * height = 0x3f6e (16238).
 */
export const LEVEL5_SILLY_ARENA = {
  minX: 90.2,
  maxX: 103.8,
  minZ: 91.2,
  maxZ: 104.8,
  height: 16238,
  squashRadiusCells: 0.95,
  /** ROM 0x19346 (`ADDQ.W #3, $6a(A2)`): squashing a mini enemy adds +3 seconds! */
  squashTimeBonusSeconds: 3,
  /** ROM 0x19358 (`0x01f4`): +500 bonus points. */
  squashScore: 500,
} as const;

/**
 * Red inverted curly Y-pipe (`level5-clock`, ROM kind 0x22 at 89,90 -> handler 0x2a738):
 * 50/50 random choice between the two upper outlets at (91.5, 86.0) and (85.5, 86.0).
 */
export const LEVEL5_RED_Y_PIPE = {
  entryBox: {
    minX: 87.6,
    maxX: 90.4,
    minZ: 88.6,
    maxZ: 91.2,
    maxHeight: 16272,
  },
  exits: [
    { x: 91.5, z: 86.0, height: 16308 },
    { x: 85.5, z: 86.0, height: 16308 },
  ] as const,
  durationSeconds: 0.85,
  exitVelocityWorld: { x: 0, y: 0, z: -5.5 },
} as const;

/**
 * Bidirectional Escher optical-illusion '?' floor teleport (level5DisplayTerrain.ts:16):
 * Shifts along the exact isometric viewing ray (+6 cells X, +6 cells Z, +48 height units)
 * so screenX = x - z and screenY = (x + z)/2 - h/8 change by 0.000 pixels (zero jump, zero scroll pop!).
 */
export const LEVEL5_ESCHER_TELEPORT = {
  triggerBox: {
    minX: 27.0,
    maxX: 28.7,
    minZ: 15.0,
    maxZ: 18.0,
    maxHeight: 16392,
  },
  returnBox: {
    minX: 34.85,
    maxX: 35.6,
    minZ: 21.0,
    maxZ: 24.0,
    minHeight: 16400,
  },
  rayShift: { dx: 6, dz: 6, dh: 48 },
  cooldownSeconds: 0.45,
} as const;

export type Level5MiniKind = 'black' | 'worm' | 'acid';

/** ROM 0x19024..0x19044: 9 miniature Sillies (3 black, 3 worm, 3 acid, ids 0..8). */
export const LEVEL5_MINIATURE_KINDS: readonly Level5MiniKind[] = [
  'black',
  'black',
  'black',
  'worm',
  'worm',
  'worm',
  'acid',
  'acid',
  'acid',
];

export interface Level5BirdLane {
  readonly laneIndex: number;
  /** Spawn cell X from ROM table 0x244f6. */
  readonly x: number;
  /** Spawn cell Z from ROM table 0x244f6. */
  readonly startZ: number;
  /** End cell Z where the bird hits the upper wall and explodes. */
  readonly endZ: number;
  readonly height: number;
}

/**
 * 5 flying bird lanes decoded from ROM 0x244f6 (`39 3f, 37 3f, 31 3a, 2f 3a, 29 3a`).
 * Two birds per lane (ids 9..18, 10 slots total) fly in -Z across the pyramid field.
 */
export const LEVEL5_BIRD_LANES: readonly Level5BirdLane[] = [
  { laneIndex: 0, x: 57.5, startZ: 63.0, endZ: 42.0, height: 16358 },
  { laneIndex: 1, x: 55.5, startZ: 63.0, endZ: 42.0, height: 16358 },
  { laneIndex: 2, x: 49.5, startZ: 58.0, endZ: 38.0, height: 16358 },
  { laneIndex: 3, x: 47.5, startZ: 58.0, endZ: 38.0, height: 16358 },
  { laneIndex: 4, x: 41.5, startZ: 58.0, endZ: 38.0, height: 16358 },
];

export const LEVEL5_BIRD_COLLISION_RADIUS = 0.92;
