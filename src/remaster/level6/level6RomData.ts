import type { EnemyMarbleSpec } from '../level2/blackMarbleRom';
import type { WormSpawnDefinition } from '../level2/greenWorms/wormRomData';
import type { Level3AmoebaSpec } from '../level3/level3RomData';

/**
 * Level 6 (Ultimate Race) constants and actor tables decoded statically from
 * the 68010 program ROM (`roms/marble.zip`, course descriptor `0x2e790`).
 *
 * Units: cell coordinates match `local-roms/level6-terrain.json` (122 x 122,
 * origin 0,0; 1 cell = 8 arcade units).
 */

/** Course descriptor 0x2e790 (+0x14 = 0x0b10 -> (11,16), +0x16 = 0x0b16 -> (11,22), height 16384). */
export const LEVEL6_SPAWNS = {
  player1Cell: { x: 11.5, z: 16.5, height: 16384 },
  player2Cell: { x: 11.5, z: 22.5, height: 16384 },
} as const;

/** Exact Atari 68010 cadence for the 4-phase disappearing-block maze (0x24e2a..0x24e42): 41 frames at 60 Hz. */
export const LEVEL6_MAZE_PHASE_SECONDS = 41 / 60;
export const LEVEL6_MAZE_PHASE_COUNT = 4;

/**
 * Level 6 special surface friction zones decoded from 68010 ROM 0x12744..0x127EA & 0x2ae90..0x2b048:
 * - 'sand'    (tags 0x2d, 0x2e): Mode 2 -> 4x drag (amber start plateau & strip behind GOAL).
 * - 'ribbed'  (tags 0x2f, 0x30, 0x31): Mode 3 -> anisotropic X: 5x drag, Z: 1x drag (ribbed worm slopes).
 * - 'shimmer' (tags 0x38, 0x39, 0x3a): Mode 4 -> negative drag speed += f/4 (shimmering peach plateaus & GOAL bridge).
 * (Ice tags 0x32..0x37 are handled by `ROM_ICE_ZONES` in `romSurfaceZones.ts`.)
 */
export type Level6SurfaceMode = 'normal' | 'sand' | 'ribbed' | 'shimmer';

export interface Level6SurfaceZone {
  readonly tag: number;
  readonly mode: Exclude<Level6SurfaceMode, 'normal'>;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

export const LEVEL6_SURFACE_ZONES: readonly Level6SurfaceZone[] = [
  // Mode 2: Heavy sand / amber (4x drag)
  { tag: 0x2d, mode: 'sand', minX: 10, maxX: 29, minZ: 13, maxZ: 26 },
  { tag: 0x2e, mode: 'sand', minX: 84, maxX: 85, minZ: 90, maxZ: 92 },
  // Mode 3: Ribbed metallic washboard (X: 5x drag, Z: 1x normal)
  { tag: 0x2f, mode: 'ribbed', minX: 36, maxX: 45, minZ: 45, maxZ: 64 },
  { tag: 0x30, mode: 'ribbed', minX: 48, maxX: 66, minZ: 45, maxZ: 53 },
  { tag: 0x31, mode: 'ribbed', minX: 84, maxX: 85, minZ: 99, maxZ: 104 },
  // Mode 4: Shimmering peach / hyper-slick (negative drag speed += f/4)
  { tag: 0x38, mode: 'shimmer', minX: 44, maxX: 63, minZ: 33, maxZ: 46 },
  { tag: 0x39, mode: 'shimmer', minX: 46, maxX: 57, minZ: 55, maxZ: 68 },
  { tag: 0x3a, mode: 'shimmer', minX: 84, maxX: 87, minZ: 88, maxZ: 89 },
];

/**
 * 2x2 golden square pit (tag 0x25, ROM 0x2a87a): dropping into (22..23, 31..32, h < 16372)
 * plays pipe SFX 0x35 and randomly shoots the marble out of one of the two golden wedge
 * tunnels at (30.5, 32.0) or (30.5, 40.0) along +X!
 */
export const LEVEL6_SQUARE_PIT_TELEPORT = {
  entryBox: {
    minX: 21.8,
    maxX: 24.2,
    minZ: 30.8,
    maxZ: 33.2,
    /** Trigger 1 arcade unit below the 16380 sunken ledge so the marble drops straight in without bouncing off the pit walls. */
    maxHeight: 16379,
  },
  exits: [
    { x: 30.8, z: 32.0, height: 16384 },
    { x: 30.8, z: 40.0, height: 16384 },
  ] as const,
  durationSeconds: 0.75,
  exitVelocityWorld: { x: 8.5, y: 0, z: 0 },
} as const;

/**
 * Complete 144-point Level 6 respawn table decoded statically from 68010 ROM 0x1f98c
 * (pointer table 0x1ef1a[5], 4 bytes/entry: [cellX, cellZ, zoneLayer]).
 */
export const LEVEL6_ROM_RESPAWN_POINTS: readonly (readonly [
  number,
  number,
  number,
])[] = [
  [11, 15, 0],
  [11, 18, 0],
  [11, 21, 0],
  [11, 24, 0],
  [13, 16, 0],
  [13, 17, 0],
  [13, 22, 0],
  [13, 23, 0],
  [16, 13, 0],
  [16, 16, 0],
  [16, 17, 0],
  [16, 22, 0],
  [16, 23, 0],
  [16, 26, 0],
  [19, 13, 0],
  [19, 25, 0],
  [22, 13, 0],
  [22, 24, 0],
  [23, 24, 0],
  [13, 13, 0],
  [29, 13, 0],
  [29, 17, 0],
  [29, 21, 0],
  [25, 26, 0],
  [29, 26, 0],
  [28, 29, 1],
  [28, 34, 1],
  [31, 29, 1],
  [31, 34, 1],
  [33, 31, 1],
  [33, 32, 1],
  [36, 32, 1],
  [36, 34, 1],
  [37, 31, 1],
  [37, 33, 1],
  [39, 33, 1],
  [39, 34, 1],
  [44, 33, 3],
  [44, 34, 3],
  [46, 34, 3],
  [47, 33, 3],
  [28, 37, 2],
  [28, 42, 2],
  [31, 37, 2],
  [31, 42, 2],
  [33, 39, 2],
  [33, 40, 2],
  [36, 37, 2],
  [36, 39, 2],
  [37, 38, 2],
  [37, 40, 2],
  [40, 38, 2],
  [41, 37, 2],
  [40, 40, 2],
  [41, 40, 2],
  [46, 35, 3],
  [46, 42, 3],
  [48, 42, 3],
  [48, 44, 3],
  [48, 46, 3],
  [50, 35, 3],
  [50, 38, 3],
  [50, 46, 3],
  [55, 41, 3],
  [55, 44, 3],
  [55, 46, 3],
  [56, 46, 3],
  [59, 46, 3],
  [61, 46, 3],
  [36, 52, 4],
  [37, 46, 4],
  [38, 56, 4],
  [39, 53, 4],
  [39, 55, 4],
  [41, 46, 4],
  [41, 52, 4],
  [45, 55, 4],
  [45, 58, 4],
  [45, 61, 4],
  [48, 55, 30],
  [48, 57, 30],
  [48, 60, 30],
  [48, 45, 5],
  [51, 49, 5],
  [51, 53, 5],
  [53, 50, 5],
  [53, 53, 5],
  [55, 49, 5],
  [55, 53, 5],
  [57, 50, 5],
  [57, 53, 5],
  [59, 51, 5],
  [55, 57, 30],
  [54, 61, 30],
  [54, 68, 30],
  [57, 57, 30],
  [57, 61, 30],
  [57, 68, 30],
  [54, 70, 7],
  [57, 70, 7],
  [58, 69, 7],
  [64, 69, 7],
  [64, 70, 7],
  [59, 53, 5],
  [61, 51, 5],
  [61, 53, 5],
  [63, 50, 5],
  [65, 50, 5],
  [65, 53, 5],
  [67, 53, 6],
  [67, 58, 6],
  [67, 64, 6],
  [68, 52, 6],
  [68, 58, 6],
  [68, 64, 6],
  [67, 69, 8],
  [67, 73, 8],
  [68, 70, 8],
  [71, 69, 8],
  [67, 77, 8],
  [67, 81, 8],
  [68, 73, 8],
  [68, 77, 8],
  [68, 81, 8],
  [71, 70, 8],
  [75, 69, 8],
  [75, 70, 8],
  [79, 69, 8],
  [79, 70, 8],
  [77, 81, 9],
  [79, 79, 9],
  [99, 83, 10],
  [99, 86, 10],
  [100, 85, 10],
  [102, 86, 10],
  [86, 102, 12],
  [86, 104, 12],
  [87, 105, 12],
  [89, 103, 12],
  [102, 104, 11],
  [102, 106, 11],
  [102, 109, 11],
  [105, 104, 11],
  [105, 109, 11],
];

/** Black Marble spawn from ROM table 0x2275e (graph 0x2283a, 3 nodes at 79..81, 81..83). */
export const LEVEL6_BLACK_MARBLE_SPAWN = {
  x: 79.5,
  z: 83.5,
  height: 16352,
  patrolRadius: 2.2,
} as const;

/** Level 6 Black Marble ROM graph 0x2283a (spawn record 0x2275e, 3 nodes). */
export const LEVEL6_BLACK_MARBLE: EnemyMarbleSpec = {
  id: 'level6-black-marble',
  spawnRecordAddress: 0x2275e,
  graphAddress: 0x2283a,
  zone: 9,
  spawnRows: { first: 0x10, last: 0x30 },
  keepRows: { first: 0x10, last: 0x30 },
  attacksAfterGiveUp: false,
  nodes: [
    { x: 79, z: 83, links: [1, 2, 1, 1] },
    { x: 81, z: 81, links: [0, 2, 0, 0] },
    { x: 79, z: 81, links: [0, 1, 0, 1] },
  ],
};

/**
 * 4 Green Worms decoded from ROM 0x225e0..0x22600 (patrol paths 0x226be..0x22704):
 * 2 on the right ribbed slope (x=39..42, z=48..57) and 2 on the left ribbed slope (x=57..64, z=48..52).
 */
export const LEVEL6_WORM_SPAWNS: readonly WormSpawnDefinition[] = [
  {
    minRow: 0x00,
    maxRow: 0x19,
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
    minRow: 0x00,
    maxRow: 0x19,
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
    minRow: 0x06,
    maxRow: 0x20,
    layer: 5,
    pathAddress: 0x226ee,
    path: [
      [58, 52, 1],
      [57, 50, 0],
    ],
  },
  {
    minRow: 0x06,
    maxRow: 0x20,
    layer: 5,
    pathAddress: 0x226fa,
    path: [
      [64, 49, 1],
      [62, 48, 0],
    ],
  },
];

/**
 * 4 Acid Amoeba loops decoded from ROM 0x23dfa..0x23e1c (tables 0x240e6..0x24174):
 * 2 on the left peach plateau (x=47..53, z=37..43) and 2 on the right peach plateau (x=50..56, z=58..66).
 */
export const LEVEL6_AMOEBA_SPECS: readonly Level3AmoebaSpec[] = [
  {
    id: 'level6-amoeba-0',
    romPathAddress: 0x240e6,
    waypoints: [
      { x: 48, z: 40 },
      { x: 47, z: 39 },
      { x: 48, z: 38 },
      { x: 47, z: 37 },
      { x: 48, z: 37 },
      { x: 47, z: 38 },
      { x: 48, z: 39 },
      { x: 47, z: 40 },
    ],
  },
  {
    id: 'level6-amoeba-1',
    romPathAddress: 0x2410a,
    waypoints: [
      { x: 50, z: 43 },
      { x: 51, z: 42 },
      { x: 52, z: 43 },
      { x: 53, z: 42 },
      { x: 53, z: 43 },
      { x: 52, z: 42 },
      { x: 51, z: 43 },
      { x: 50, z: 42 },
    ],
  },
  {
    id: 'level6-amoeba-2',
    romPathAddress: 0x2412e,
    waypoints: [
      { x: 50, z: 59 },
      { x: 51, z: 58 },
      { x: 52, z: 59 },
      { x: 53, z: 58 },
      { x: 53, z: 59 },
      { x: 52, z: 58 },
      { x: 51, z: 59 },
      { x: 50, z: 58 },
    ],
  },
  {
    id: 'level6-amoeba-3',
    romPathAddress: 0x24152,
    waypoints: [
      { x: 56, z: 66 },
      { x: 55, z: 65 },
      { x: 56, z: 64 },
      { x: 55, z: 63 },
      { x: 56, z: 63 },
      { x: 55, z: 64 },
      { x: 56, z: 65 },
      { x: 55, z: 66 },
    ],
  },
];
