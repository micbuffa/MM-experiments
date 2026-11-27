import type { EnemyMarbleSpec } from '../level2/blackMarbleRom';

/**
 * Level 4 (Aerial Race) constants and tables decoded statically from the
 * 68010 program ROM (`roms/marble.zip`, course descriptor `0x2d648`).
 *
 * Units: cell coordinates match `local-roms/level4-terrain.json` (130 x 130,
 * origin 0,0; 1 cell = 8 arcade units).
 */

/** Course descriptor 0x2d648 (+0x14 = 0x0a17, +0x16 = 0x1609, height 0x4000 = 16384). */
export const LEVEL4_SPAWNS = {
  player1Cell: { x: 10.5, z: 23.5, height: 16384 },
  player2Cell: { x: 22.5, z: 9.5, height: 16384 },
} as const;

/** Black Marble spawn from ROM table 0x22746 (graph 0x2280a, 7 nodes at 62..67, 49..53). */
export const LEVEL4_BLACK_MARBLE_SPAWN = {
  x: 64.5,
  z: 51.5,
  height: 16300,
  patrolCenter: { x: 64.5, z: 51.5 },
  patrolRadius: 1.8,
} as const;

/** Level 4 Black Marble ROM graph 0x2280a (spawn record 0x22746, 7 nodes). */
export const LEVEL4_BLACK_MARBLE: EnemyMarbleSpec = {
  id: 'level4-black-marble',
  spawnRecordAddress: 0x22746,
  graphAddress: 0x2280a,
  zone: 4,
  spawnRows: { first: 0x0c, last: 0x26 },
  keepRows: { first: 0x0c, last: 0x26 },
  attacksAfterGiveUp: false,
  nodes: [
    { x: 67, z: 53, links: [1, 2, 3, 6] },
    { x: 63, z: 53, links: [2, 0, 6, 4] },
    { x: 62, z: 51, links: [3, 0, 1, 6] },
    { x: 62, z: 49, links: [4, 0, 2, 6] },
    { x: 62, z: 53, links: [5, 0, 1, 3] },
    { x: 63, z: 53, links: [0, 2, 3, 6] },
    { x: 65, z: 49, links: [0, 1, 2, 3] },
  ],
};

export interface Level4VacuumSpec {
  readonly index: number;
  /** Nozzle mouth cell coordinates (matching createLevel4Vacuums.ts). */
  readonly mouthX: number;
  readonly mouthZ: number;
  /** Direction the vacuum faces (+Z for 0x0b, +X for 0x0d). */
  readonly dirX: number;
  readonly dirZ: number;
  readonly phaseOffset: number;
}

/** All 6 Level 4 yellow vacuum cleaners (ROM scripts 0x1d7d0..0x1d83e). */
export const LEVEL4_VACUUM_SPECS: readonly Level4VacuumSpec[] = [
  { index: 0, mouthX: 39.5, mouthZ: 36.8, dirX: 0, dirZ: 1, phaseOffset: 0.0 },
  { index: 1, mouthX: 48.5, mouthZ: 36.8, dirX: 0, dirZ: 1, phaseOffset: 1.8 },
  { index: 2, mouthX: 50.8, mouthZ: 46.5, dirX: 1, dirZ: 0, phaseOffset: 3.6 },
  { index: 3, mouthX: 34.5, mouthZ: 42.8, dirX: 0, dirZ: 1, phaseOffset: 0.9 },
  { index: 4, mouthX: 42.5, mouthZ: 42.8, dirX: 0, dirZ: 1, phaseOffset: 2.7 },
  { index: 5, mouthX: 44.8, mouthZ: 52.5, dirX: 1, dirZ: 0, phaseOffset: 4.5 },
];

export interface Level4PistonSpec {
  readonly slot: number;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly bank: 0 | 1 | 2;
}

/** All 36 Level 4 chrome pistons decoded from ROM 0x24406 / 0x2442a / 0x2444e. */
export const LEVEL4_PISTON_SPECS: readonly Level4PistonSpec[] = [
  // Bank 0 (slots 0..11): x=69..71, z=55..58, h=16300
  ...([55, 56, 57, 58] as const).flatMap((z, zi) =>
    ([69, 70, 71] as const).map((x, xi) => ({
      slot: zi * 3 + xi,
      x,
      z,
      height: 16300,
      bank: 0 as const,
    })),
  ),
  // Bank 1 (slots 12..23): x=69..71, z=63..66, h=16280
  ...([63, 64, 65, 66] as const).flatMap((z, zi) =>
    ([69, 70, 71] as const).map((x, xi) => ({
      slot: 12 + zi * 3 + xi,
      x,
      z,
      height: 16280,
      bank: 1 as const,
    })),
  ),
  // Bank 2 (slots 24..35): x=76..78, z=74..77, h=16280
  ...([74, 75, 76, 77] as const).flatMap((z, zi) =>
    ([76, 77, 78] as const).map((x, xi) => ({
      slot: 24 + zi * 3 + xi,
      x,
      z,
      height: 16280,
      bank: 2 as const,
    })),
  ),
];

/** Red catapult at (63, 70) decoded from ROM script 0x1db6a and handler 0x29e22. */
export const LEVEL4_CATAPULT = {
  cupX: 63.0,
  cupZ: 70.0,
  /** Outer auto-funneling zone that smoothly pulls the marble into the cup. */
  guideRadiusCells: 1.65,
  /** Tight cup capture radius where the marble seats before launch. */
  triggerRadiusCells: 0.62,
  /** Settle dwell inside the cup before the catapult arm snaps up. */
  settleDwellSeconds: 0.26,
  /**
   * High, lofty arcade catapult lob (67° launch angle, peak +11.7 world units):
   * airborne ~1.67 s under gravityY = -30 / airDamping = 0.08, landing
   * dead-center at (63.0, 52.5) on the (61..73, 50..54) upper plateau.
   */
  launchVelocityWorld: { x: 0, y: 26.5, z: -11.2 },
  animationDurationSeconds: 20 / 30,
  cooldownSeconds: 2.3,
} as const;

/** ROM 0x186dc/0x186e6: Level 4 pistons stay idle until a player enters zone 4/5 (x>=60, z>=50). */
export const LEVEL4_PISTON_TRIGGER_ZONE = {
  minX: 60,
  maxX: 82,
  minZ: 50,
  maxZ: 82,
} as const;

/** 68010 main-loop rate for piston state machine (0x18476..0x18550). */
export const LEVEL4_PISTON_TICK_HZ = 30;

/** ROM 0x21342: 13-tick pop-up sequence (0.10 s rise, 0.233 s hold, 0.10 s drop). */
export const LEVEL4_PISTON_STEPS = [
  1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1,
] as const;

/** ROM 0x242f6: Banks 0 & 1 reload countdown after every pop-up (100 ticks = 3.333 s). */
export const LEVEL4_PISTON_RELOAD_TICKS_BANKS_0_1 = 100;

/** ROM 0x242c6 (Bank 0, slots 0..11) & 0x242de (Bank 1, slots 12..23) initial delays in 30 Hz ticks. */
export const LEVEL4_PISTON_INIT_DELAYS_BANKS_0_1: readonly number[] = [
  0, 40, 80, 120, 160, 200, 40, 80, 0, 160, 120, 200, 20, 60, 100, 140, 180,
  220, 60, 100, 20, 180, 140, 220,
];

/** ROM 0x243e6[rand % 4] (0x1871a): 4 Bank-2 initial & reload delay tables (slots 24..35, 30 Hz ticks). */
export const LEVEL4_PISTON_BANK2_PATTERNS: readonly (readonly number[])[] = [
  [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
  [60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 60],
  [20, 20, 100, 100, 40, 40, 60, 60, 100, 100, 80, 80],
  [20, 40, 60, 40, 60, 80, 60, 80, 20, 80, 20, 40],
];

/** Four wooden swinging hammers before GOAL (ROM kind 0x0c, x=105, z in {102, 104, 106, 108}). */
export const LEVEL4_HAMMERS = [
  { index: 0, x: 105, z: 102.5 },
  { index: 1, x: 105, z: 104.5 },
  { index: 2, x: 105, z: 106.5 },
  { index: 3, x: 105, z: 108.5 },
] as const;

/** 68010 hammer script timing (0x1d40c..0x1d742): 30 Hz ticks, 15 frames x 2 ticks/frame = 30 ticks (1.0 s). */
export const LEVEL4_HAMMER_TICK_HZ = 30;
export const LEVEL4_HAMMER_FRAME_COUNT = 15;
export const LEVEL4_HAMMER_TICKS_PER_FRAME = 2;

/** ROM 0x2ab6a (`MOVE.B #$3c, $57(A2)`): hammer strike inflicts 60 ticks (2.0 s) of dizzy + SFX 0x39. */
export const LEVEL4_HAMMER_DIZZY_SECONDS = 60 / 30;

/** ROM 0x22346 per-frame protrusion in cells (x0 / 8) from anchor x=105 along -X. */
export const LEVEL4_HAMMER_HITBOX_X0: readonly number[] = [
  0, 0, 0, -0.25, -0.25, -0.25, -0.5, -0.75, -1.0, -1.0, -1.0, -1.0, -1.0, 0, 0,
];

export interface Level4HammerPattern {
  /** Initial WAIT ticks before first swing for hammers [z=102, z=104, z=106, z=108]. */
  readonly initWaitTicks: readonly [number, number, number, number];
  /** Loop WAIT ticks after each 30-tick swing for hammers [z=102, z=104, z=106, z=108]. */
  readonly loopWaitTicks: readonly [number, number, number, number];
}

/** ROM 0x1ded8..0x1df14 (chosen via rand(4) at 0x12e50): all 4 hammer timing patterns. */
export const LEVEL4_HAMMER_PATTERNS: readonly Level4HammerPattern[] = [
  // Set 0 (0x1ded8): alternating 2.0 s / 1.0 s waits
  { initWaitTicks: [0, 0, 0, 0], loopWaitTicks: [60, 30, 60, 30] },
  // Set 1 (0x1dee8): all 4 synchronized every 25 ticks
  { initWaitTicks: [0, 0, 0, 0], loopWaitTicks: [25, 25, 25, 25] },
  // Set 2 (0x1def8): cascading wave from z=102 -> z=108
  { initWaitTicks: [0, 30, 60, 90], loopWaitTicks: [90, 90, 90, 90] },
  // Set 3 (0x1df08): staggered cross pattern (108, 104, 102, 106)
  { initWaitTicks: [60, 30, 90, 0], loopWaitTicks: [90, 90, 90, 90] },
];
