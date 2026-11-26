import {
  arcadeHeightToWorld,
  ROM_TICK_HZ,
  secondsToRomTickTime,
} from './romUnits';

/**
 * Level 2 (Beginner Race) drawbridge, decoded from the 68010 program.
 *
 * - Object script 0x1db12 (course list 0x1df7a, entry 0x0d28): type 3 at
 *   cell (61, 56), height 0x3f88, kind 2.
 * - Script ops (interpreter 0x12896): loop { seq 0x21156; play once @2 ticks;
 *   seq 0x21192; wait 15; play once @2 ticks; seq 0x21156; wait 30 }.
 * - Each sequence holds 7 (sprite, height-patch) pairs; the height patches
 *   0x1b908..0x1b9b0 rewrite 12 terrain-code overrides at 0x40076e..0x400785,
 *   so the bridge is pure terrain for the marble (no special collision object).
 * - All counts are ROM ticks (30 Hz, see `ROM_TICK_HZ`).
 */
export const BRIDGE_ROM = {
  objectCell: { x: 61, z: 56 },
  objectHeight: 0x3f88,
  stepCount: 7,
  ticksPerStep: 2,
  raiseStartTick: 0,
  /** Wait op after the raise (0x1db36 `0003 000f`). */
  holdRaisedTicks: 15,
  lowerStartTick: 29,
  /** Wait op after the lower (0x1db48 `0003 001e`). */
  holdLoweredTicks: 30,
  periodTicks: 73,
  deckLengthCells: 4,
  /**
   * Free-edge rise (row 4 cells from the hinge, override word 0x770) above the
   * hinge level, in arcade height units, per step 0..6. Step 5 uses a
   * level-record code (0x0088) that could not be resolved statically; 13 is
   * interpolated from the linear rows below (INFERRED).
   */
  freeEdgeRiseUnits: [0, 3, 5, 8, 10, 13, 16],
  /**
   * Rise per deck row (1, 2, 3 cells from the hinge) per step, decoded from
   * the 0xf0xx/0x6fxx override codes at 0x77e, 0x778 and 0x774.
   */
  rowRiseUnits: [
    [0, 1, 1, 2, 3, 4, 4],
    [0, 1, 2, 4, 5, 7, 8],
    [0, 2, 4, 6, 8, 10, 12],
  ],
  /**
   * Terrain edge rule (0x1c676 + 0x1b5c2): a vertical edge whose top is at
   * least 4 units above the marble reflects the velocity component.
   */
  wallStepUnits: 4,
} as const;

export type BridgePhase = 'raising' | 'raised' | 'lowering' | 'lowered';

export interface BridgeState {
  /** ROM tick inside the 73-tick cycle (0 = raise starts). */
  readonly cycleTick: number;
  /** ROM-exact discrete step 0 (flat) .. 6 (fully raised). */
  readonly step: number;
  /** Continuous step for smooth rendering (same value as `step` on step boundaries). */
  readonly smoothStep: number;
  readonly phase: BridgePhase;
  /** Free-edge height above the hinge/approach level, arcade units (ROM-exact step). */
  readonly freeEdgeRiseUnits: number;
  /** Same rise in remaster world Y (cells), from the smooth step for rendering. */
  readonly freeEdgeRiseWorld: number;
  /** Deck tilt in radians for rendering (smooth), in remaster world proportions. */
  readonly angleRadians: number;
  /** True when the lip is low enough to roll over (rise < `wallStepUnits`). */
  readonly passable: boolean;
}

function wrapTick(tick: number) {
  const period = BRIDGE_ROM.periodTicks;
  return ((tick % period) + period) % period;
}

/** Elapsed steps inside a play segment, ROM-exact (values change at ticks 3, 5, ... 13). */
function playedSteps(ticksIntoSegment: number) {
  if (ticksIntoSegment <= 2) return 0;
  return Math.min(
    BRIDGE_ROM.stepCount - 1,
    Math.floor((ticksIntoSegment - 1) / 2),
  );
}

function smoothPlayed(ticksIntoSegment: number) {
  return Math.min(
    BRIDGE_ROM.stepCount - 1,
    Math.max(0, (ticksIntoSegment - 1) / BRIDGE_ROM.ticksPerStep),
  );
}

/** Discrete ROM step and phase at an integer ROM tick (wraps every 73 ticks). */
export function bridgeStepAtTick(tick: number): {
  readonly step: number;
  readonly phase: BridgePhase;
} {
  const t = wrapTick(Math.floor(tick));
  if (t < BRIDGE_ROM.holdRaisedTicks)
    return { step: playedSteps(t), phase: 'raising' };
  if (t < BRIDGE_ROM.lowerStartTick) return { step: 6, phase: 'raised' };
  if (t < BRIDGE_ROM.lowerStartTick + 15)
    return {
      step: 6 - playedSteps(t - BRIDGE_ROM.lowerStartTick),
      phase: 'lowering',
    };
  return { step: 0, phase: 'lowered' };
}

function smoothStepAt(tickTime: number) {
  const period = BRIDGE_ROM.periodTicks;
  const t = ((tickTime % period) + period) % period;
  if (t < BRIDGE_ROM.holdRaisedTicks) return smoothPlayed(t);
  if (t < BRIDGE_ROM.lowerStartTick) return 6;
  if (t < BRIDGE_ROM.lowerStartTick + 15)
    return 6 - smoothPlayed(t - BRIDGE_ROM.lowerStartTick);
  return 0;
}

function interpolate(table: readonly number[], step: number) {
  const low = Math.floor(step);
  const high = Math.min(table.length - 1, low + 1);
  const a = table[low]!;
  return a + (table[high]! - a) * (step - low);
}

/** Free-edge rise for a (possibly fractional) step, arcade units. */
export function freeEdgeRiseUnits(step: number): number {
  return interpolate(
    BRIDGE_ROM.freeEdgeRiseUnits,
    Math.max(0, Math.min(6, step)),
  );
}

/**
 * Deck surface rise above the hinge level at `distanceFromHingeCells`
 * (0 = hinge, 4 = free edge) for a step, arcade units. Rows 1..4 are decoded,
 * values between rows are interpolated linearly.
 */
export function deckRiseUnits(distanceFromHingeCells: number, step: number) {
  const s = Math.max(0, Math.min(6, step));
  const d = Math.max(
    0,
    Math.min(BRIDGE_ROM.deckLengthCells, distanceFromHingeCells),
  );
  const rows = [
    BRIDGE_ROM.freeEdgeRiseUnits.map(() => 0),
    ...BRIDGE_ROM.rowRiseUnits,
    BRIDGE_ROM.freeEdgeRiseUnits,
  ].map((row) => interpolate(row, s));
  return interpolate(rows, d);
}

export interface BridgeStateOptions {
  /**
   * ROM ticks already elapsed in the cycle at `seconds = 0`. The ROM starts
   * the cycle (raise) when the object spawns from the course list; the scene
   * picks the offset (0 = start raising when its clock starts).
   */
  readonly phaseOffsetTicks?: number;
}

/** Pure drawbridge state at `seconds` of the scene's bridge clock. */
export function bridgeState(
  seconds: number,
  options: BridgeStateOptions = {},
): BridgeState {
  const tickTime =
    secondsToRomTickTime(seconds) + (options.phaseOffsetTicks ?? 0);
  const cycleTick = wrapTick(Math.floor(tickTime + 1e-9));
  const { step, phase } = bridgeStepAtTick(cycleTick);
  const smoothStep = smoothStepAt(tickTime);
  const rise = BRIDGE_ROM.freeEdgeRiseUnits[step]!;
  const riseWorld = arcadeHeightToWorld(freeEdgeRiseUnits(smoothStep));
  return {
    cycleTick,
    step,
    smoothStep,
    phase,
    freeEdgeRiseUnits: rise,
    freeEdgeRiseWorld: riseWorld,
    angleRadians: Math.atan2(riseWorld, BRIDGE_ROM.deckLengthCells),
    passable: rise < BRIDGE_ROM.wallStepUnits,
  };
}

/** Cycle duration in seconds (73 ticks at 30 Hz = 2.433 s). */
export const BRIDGE_PERIOD_SECONDS = BRIDGE_ROM.periodTicks / ROM_TICK_HZ;
