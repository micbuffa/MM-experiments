/**
 * Level 3 (Intermediate Race) constants and tables decoded statically from the
 * 68010 program ROM (`roms/marble.zip`, course descriptor `0x2cd9e`).
 *
 * Units: cell coordinates match `local-roms/level3-terrain.json` (118 x 118,
 * origin 0,0; 1 cell = 8 arcade units).
 */

export interface Level3Waypoint {
  readonly x: number;
  readonly z: number;
}

export interface Level3AmoebaSpec {
  readonly id: string;
  readonly romPathAddress: number;
  readonly waypoints: readonly Level3Waypoint[];
}

/** Course descriptor 0x2cd9e (+0x14 = 0x1609, +0x16 = 0x0817, height 0x4018 = 16408). */
export const LEVEL3_SPAWNS = {
  player1Cell: { x: 22.5, z: 9.5, height: 16408 },
  player2Cell: { x: 8.5, z: 23.5, height: 16408 },
} as const;

/** Lower-terrace 18-point closed loop shared by 6 staggered acid amoebas (0x23e36..0x23fb2). */
const LOWER_AMOEBA_LOOP: readonly Level3Waypoint[] = [
  { x: 71, z: 66 },
  { x: 71, z: 69 },
  { x: 63, z: 69 },
  { x: 63, z: 72 },
  { x: 64, z: 72 },
  { x: 64, z: 68 },
  { x: 60, z: 68 },
  { x: 60, z: 66 },
  { x: 61, z: 66 },
  { x: 61, z: 68 },
  { x: 67, z: 68 },
  { x: 67, z: 70 },
  { x: 74, z: 70 },
  { x: 74, z: 72 },
  { x: 73, z: 72 },
  { x: 73, z: 70 },
  { x: 70, z: 70 },
  { x: 70, z: 66 },
];

function rotateLoop(
  loop: readonly Level3Waypoint[],
  startIndex: number,
): readonly Level3Waypoint[] {
  return [...loop.slice(startIndex), ...loop.slice(0, startIndex)];
}

/**
 * All 7 Level 3 acid amoeba pools decoded from ROM table 0x23daa (course 3)
 * and path table 0x23d62: 1 upper-terrace pool (0x23e22) + 6 staggered pools
 * patrolling the lower acid terrace (0x23e36..0x23fb2).
 */
export const LEVEL3_AMOEBA_SPECS: readonly Level3AmoebaSpec[] = [
  {
    id: 'level3-amoeba-0',
    romPathAddress: 0x23e22,
    waypoints: [
      { x: 62, z: 60 },
      { x: 60, z: 58 },
      { x: 62, z: 58 },
      { x: 60, z: 60 },
    ],
  },
  {
    id: 'level3-amoeba-1',
    romPathAddress: 0x23e36,
    waypoints: rotateLoop(LOWER_AMOEBA_LOOP, 0),
  },
  {
    id: 'level3-amoeba-2',
    romPathAddress: 0x23e82,
    waypoints: rotateLoop(LOWER_AMOEBA_LOOP, 2),
  },
  {
    id: 'level3-amoeba-3',
    romPathAddress: 0x23ece,
    waypoints: rotateLoop(LOWER_AMOEBA_LOOP, 5),
  },
  {
    id: 'level3-amoeba-4',
    romPathAddress: 0x23f1a,
    waypoints: rotateLoop(LOWER_AMOEBA_LOOP, 9),
  },
  {
    id: 'level3-amoeba-5',
    romPathAddress: 0x23f66,
    waypoints: rotateLoop(LOWER_AMOEBA_LOOP, 11),
  },
  {
    id: 'level3-amoeba-6',
    romPathAddress: 0x23fb2,
    waypoints: rotateLoop(LOWER_AMOEBA_LOOP, 14),
  },
];

/**
 * Level 3 copper vertical funnel pipe decoded from zone scripts 0x1ddbc (0x20)
 * / 0x1ddd4 (0x21) and handler 0x2a5e6.
 */
export const LEVEL3_COPPER_PIPE = {
  enterCellX: { min: 75, max: 78 },
  enterCellZ: { min: 78, max: 82 },
  ignoreAtOrBelowHeight: 0x3f80,
  rimFromHeight: 0x3fb0,
  mouthFromHeight: 0x3fa0,
  /** Exit cell (0x26c / 8 = 77.5, 0x254 / 8 = 74.5); rolls out along -Z. */
  exitCell: { x: 77.5, z: 74.5 },
  alternateExitCell: { x: 77.5, z: 75.5 },
  exitVelocityWorld: { x: 0, z: -8.5 },
  exitScore: 4000,
} as const;

/** Level 3 animated turquoise wave strip (ROM updater 0x1d0a0, 22 tiles along Z). */
export const LEVEL3_WAVE = {
  x: 81,
  z: 76,
  width: 4,
  length: 22,
  baseArcadeHeight: 16148,
  maxArcadeDelta: 30,
  /** Wave propagation speed along +Z (cells / s) matching createLevel3Wave(). */
  speedCellsPerSec: 3.8,
  wavelengthCells: 12,
  crestHalfWidthCells: 2.2,
} as const;
