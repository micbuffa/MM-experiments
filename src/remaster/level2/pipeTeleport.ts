import { LEVEL2_ROM_SOUND_CUES } from './romSoundCues';
import { arcadeSpeedToWorld, ROM_TICK_HZ, secondsToRomTicks } from './romUnits';

/**
 * Level 2 pipes, decoded from the marble/zone handler 0x29cce (jump table
 * 0x29db4, zone slots 0x400a9c + n * 0x56) and the in-pipe state 3 handler
 * 0x25514..0x255c2. Course 2 zone scripts: 0x1dd44 (type 0x12),
 * 0x1dd8c (0x15), 0x1dd5c (0x13), 0x1dd74 (0x14), 0x1dda4 (0x16).
 *
 * Positions are arcade units (8 per cell); heights are arcade height words.
 */

export interface CellRange {
  readonly min: number;
  readonly max: number;
}

/** Height bands of the vertical drop pipe (case 0x12, 0x2a360..0x2a3e2). */
export interface DropPipeHeights {
  /** At or below: the zone is ignored (0x2a380, `ble` on 0x3f40). */
  readonly ignoreAtOrBelow: number;
  /** At or above: solid rim, collision shape 0 via 0x1cd00 (0x2a3aa). */
  readonly rimFrom: number;
  /** At or above (and below rim): horizontal velocity zeroed (0x2a3d2). */
  readonly mouthFrom: number;
}

export interface PipeEntryZone {
  /** Zone object type byte `$1f` in the ROM. */
  readonly romType: number;
  readonly objectCell: { readonly x: number; readonly z: number };
  readonly objectHeight: number;
  /** Marble cell window (floor(units / 8)) that triggers the teleport. */
  readonly enterCellX: CellRange;
  readonly enterCellZ: CellRange;
  /**
   * Outer gate in arcade units (inclusive). Inside it but outside the enter
   * window the marble hits the pipe body (Y-pipe, shape 2 via 0x1cd00).
   */
  readonly gateUnitsX: CellRange;
  readonly gateUnitsZ: CellRange;
  readonly heights?: DropPipeHeights;
}

export interface Level2Pipe {
  readonly id: 'drop-pipe' | 'y-pipe';
  readonly entries: readonly PipeEntryZone[];
  /** Exit position (arcade units); height = terrain height there (0x1cc62). */
  readonly exit: { readonly x: number; readonly z: number };
  /** Used when another marble/actor occupies `exit` (0x17cb8, radius 0x70). */
  readonly alternateExit: { readonly x: number; readonly z: number };
  /** Exit velocity in arcade units per ROM tick (16.16 0x40000 = 4.0). */
  readonly exitVelocity: { readonly x: number; readonly z: number };
  /** Case 0x12 also clears the airborne byte `$36` at the teleport. */
  readonly clearsAirborne: boolean;
  /** Score table 0x23cd4 index awarded by 0x285b0 at the exit. */
  readonly exitScoreIndex: number;
  readonly exitScore: number;
  /** Exit collision zone (type, cell, shape) kept for the outer mesh collider. */
  readonly exitZone: {
    readonly romType: number;
    readonly objectCell: { readonly x: number; readonly z: number };
    readonly objectHeight: number;
  };
}

/** `$59` countdown loaded at the teleport (0x2a3fe / 0x2a4c6). */
export const PIPE_COUNTDOWN_TICKS = 18;
/**
 * The marble is drawn hidden on the teleport tick and on the 18 countdown
 * ticks (0x264aa skips the sprite while `$58` != 0 and `$59` != 0xff), then
 * normal physics resumes on the next tick with the exit velocity.
 */
export const PIPE_RELEASE_TICKS = PIPE_COUNTDOWN_TICKS + 1;

export const LEVEL2_PIPES: readonly Level2Pipe[] = [
  {
    id: 'drop-pipe',
    entries: [
      {
        romType: 0x12,
        objectCell: { x: 64, z: 78 },
        objectHeight: 0x3f88,
        enterCellX: { min: 62, max: 64 },
        enterCellZ: { min: 74, max: 79 },
        gateUnitsX: { min: 62 * 8, max: 66 * 8 + 7 },
        gateUnitsZ: { min: 74 * 8, max: 79 * 8 + 7 },
        heights: {
          ignoreAtOrBelow: 0x3f40,
          rimFrom: 0x3f78,
          mouthFrom: 0x3f60,
        },
      },
    ],
    exit: { x: 0x20c, z: 0x264 },
    alternateExit: { x: 0x204, z: 0x264 },
    exitVelocity: { x: 4, z: 0 },
    clearsAirborne: true,
    exitScoreIndex: 9,
    exitScore: 4000,
    exitZone: {
      romType: 0x15,
      objectCell: { x: 67, z: 78 },
      objectHeight: 0x3f30,
    },
  },
  {
    id: 'y-pipe',
    entries: [
      {
        romType: 0x13,
        objectCell: { x: 81, z: 86 },
        objectHeight: 0x3f30,
        enterCellX: { min: 79, max: 81 },
        enterCellZ: { min: 86, max: 86 },
        gateUnitsX: { min: 81 * 8 - 31, max: 81 * 8 + 24 },
        gateUnitsZ: { min: 86 * 8 - 23, max: 86 * 8 + 16 },
      },
      {
        romType: 0x14,
        objectCell: { x: 87, z: 86 },
        objectHeight: 0x3f30,
        enterCellX: { min: 85, max: 87 },
        enterCellZ: { min: 86, max: 86 },
        gateUnitsX: { min: 87 * 8 - 31, max: 87 * 8 + 24 },
        gateUnitsZ: { min: 86 * 8 - 23, max: 86 * 8 + 16 },
      },
    ],
    exit: { x: 0x29c, z: 0x2e4 },
    alternateExit: { x: 0x29c, z: 0x2dc },
    exitVelocity: { x: 0, z: 4 },
    clearsAirborne: false,
    exitScoreIndex: 5,
    exitScore: 2000,
    exitZone: {
      romType: 0x16,
      objectCell: { x: 84, z: 94 },
      objectHeight: 0x3f00,
    },
  },
];

export interface PipeMarbleProbe {
  /** Arcade units; the ROM compares the integer parts. */
  readonly x: number;
  readonly z: number;
  readonly height: number;
}

export type PipeProbeResult =
  | { readonly kind: 'none' }
  /** Solid pipe exterior: let the outer collider handle it. */
  | { readonly kind: 'rim' | 'body'; readonly pipe: Level2Pipe }
  /** Drop pipe mouth: zero the horizontal velocity, keep gravity. */
  | { readonly kind: 'mouth'; readonly pipe: Level2Pipe }
  | {
      readonly kind: 'enter';
      readonly pipe: Level2Pipe;
      readonly entry: PipeEntryZone;
    };

const within = (value: number, range: CellRange) =>
  value >= range.min && value <= range.max;

/** Pipe trigger test for one marble, exactly as the 0x29cce cases 0x12..0x14. */
export function probePipeEntry(
  marble: PipeMarbleProbe,
  pipes: readonly Level2Pipe[] = LEVEL2_PIPES,
): PipeProbeResult {
  const x = Math.floor(marble.x);
  const z = Math.floor(marble.z);
  const h = Math.floor(marble.height);
  const cellX = x >> 3;
  const cellZ = z >> 3;
  for (const pipe of pipes)
    for (const entry of pipe.entries) {
      if (!within(x, entry.gateUnitsX) || !within(z, entry.gateUnitsZ))
        continue;
      const heights = entry.heights;
      if (heights) {
        if (h <= heights.ignoreAtOrBelow) continue;
        if (h >= heights.rimFrom) return { kind: 'rim', pipe };
        if (
          !within(cellX, entry.enterCellX) ||
          !within(cellZ, entry.enterCellZ)
        )
          continue;
        if (h >= heights.mouthFrom) return { kind: 'mouth', pipe };
        return { kind: 'enter', pipe, entry };
      }
      if (within(cellX, entry.enterCellX) && within(cellZ, entry.enterCellZ))
        return { kind: 'enter', pipe, entry };
      return { kind: 'body', pipe };
    }
  return { kind: 'none' };
}

/**
 * Occupancy metric of 0x17cb8: per-axis distance must be under 32 units,
 * then 16 * max + 3 * floor(2 * min) (integer units) must stay below 0x70.
 */
export function isExitOccupied(
  exit: { readonly x: number; readonly z: number },
  other: { readonly x: number; readonly z: number },
): boolean {
  const dx = Math.abs(Math.floor(other.x) - exit.x);
  const dz = Math.abs(Math.floor(other.z) - exit.z);
  if (dx >> 3 > 3 || dz >> 3 > 3) return false;
  const big = Math.max(dx, dz) * 16;
  const small = Math.min(dx, dz) * 16;
  return (small >> 3) * 3 + big < 0x70;
}

export interface PipeTraversal {
  readonly pipe: Level2Pipe;
  readonly entryType: number;
  readonly exit: { readonly x: number; readonly z: number };
  readonly usedAlternateExit: boolean;
  /** Exit velocity in remaster cells per second (x, z). */
  readonly exitVelocityWorld: { readonly x: number; readonly z: number };
  /** Sound command sent at the teleport (0x35). Data only. */
  readonly entrySound: number;
}

/** Start the timed teleport; `others` are the other marbles/actors (arcade units). */
export function beginPipeTraversal(
  pipe: Level2Pipe,
  entry: PipeEntryZone,
  others: readonly { readonly x: number; readonly z: number }[] = [],
): PipeTraversal {
  const occupied = others.some((other) => isExitOccupied(pipe.exit, other));
  return {
    pipe,
    entryType: entry.romType,
    exit: occupied ? pipe.alternateExit : pipe.exit,
    usedAlternateExit: occupied,
    exitVelocityWorld: {
      x: arcadeSpeedToWorld(pipe.exitVelocity.x),
      z: arcadeSpeedToWorld(pipe.exitVelocity.z),
    },
    entrySound: LEVEL2_ROM_SOUND_CUES.pipeEnter,
  };
}

export interface PipeTraversalFrame {
  /** Marble sprite hidden (true until release). */
  readonly hidden: boolean;
  /** Physics frozen at the exit position (kinematic) until release. */
  readonly frozen: boolean;
  /** Release reached: restore dynamics with `exitVelocityWorld`, award score. */
  readonly released: boolean;
  /** ROM ticks elapsed since the teleport tick. */
  readonly ticks: number;
}

/** Pure timeline of a traversal `elapsedSeconds` after the teleport. */
export function pipeTraversalAt(elapsedSeconds: number): PipeTraversalFrame {
  const ticks = Math.max(0, secondsToRomTicks(elapsedSeconds));
  const released = ticks >= PIPE_RELEASE_TICKS;
  return { hidden: !released, frozen: !released, released, ticks };
}

/** Seconds from the teleport to release (19 ticks = 0.633 s). */
export const PIPE_RELEASE_SECONDS = PIPE_RELEASE_TICKS / ROM_TICK_HZ;
