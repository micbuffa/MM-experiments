import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../../game/modern/practiceProjection';
import type { Vec3 } from '../levels/remasterLevel';

/**
 * The 68010 main loop (0x11804..0x118ce) waits for two VBLANKs per iteration
 * (0x28dea, counter 0x400016 bumped by the IRQ at 0x10120), so every game
 * object, marble and script advances at 30 Hz, not 60 Hz.
 */
export const ROM_TICK_HZ = 30;
export const ROM_TICK_SECONDS = 1 / ROM_TICK_HZ;

/** Whole ROM ticks elapsed after `seconds` (tolerant to float noise). */
export function secondsToRomTicks(seconds: number): number {
  return Math.floor(seconds * ROM_TICK_HZ + 1e-9);
}

/** Fractional ROM ticks elapsed after `seconds` (for smooth presentation). */
export function secondsToRomTickTime(seconds: number): number {
  return seconds * ROM_TICK_HZ;
}

export function romTicksToSeconds(ticks: number): number {
  return ticks / ROM_TICK_HZ;
}

/** Arcade horizontal speed (units per ROM tick) to remaster cells per second. */
export function arcadeSpeedToWorld(unitsPerTick: number): number {
  return (unitsPerTick / arcadeCellUnits) * ROM_TICK_HZ;
}

/** Arcade height difference (units) to remaster world Y difference. */
export function arcadeHeightToWorld(units: number): number {
  return (units * arcadeHeightScale) / arcadeCellUnits;
}

/** Placement of a remaster height layer in arcade cells (see `practiceWorldPoint`). */
export interface ArcadeLayerFrame {
  readonly originX: number;
  readonly originZ: number;
  readonly columns: number;
  readonly rows: number;
}

export interface ArcadePoint {
  /** Arcade X in units (8 units per cell). */
  readonly x: number;
  /** Arcade Z in units (8 units per cell). */
  readonly z: number;
  /** Arcade height word (0x4000 = remaster Y 0). */
  readonly height: number;
}

/** Same mapping as `practiceWorldPoint`, without its visibility culling. */
export function arcadeToWorld(
  point: ArcadePoint,
  frame: ArcadeLayerFrame,
): Vec3 {
  return {
    x: point.x / arcadeCellUnits - frame.originX - frame.columns / 2,
    y: arcadeHeightToWorld(point.height - arcadeGroundHeight),
    z: point.z / arcadeCellUnits - frame.originZ - frame.rows / 2,
  };
}

export function worldToArcade(
  point: Vec3,
  frame: ArcadeLayerFrame,
): ArcadePoint {
  return {
    x: (point.x + frame.originX + frame.columns / 2) * arcadeCellUnits,
    z: (point.z + frame.originZ + frame.rows / 2) * arcadeCellUnits,
    height:
      arcadeGroundHeight + (point.y * arcadeCellUnits) / arcadeHeightScale,
  };
}
