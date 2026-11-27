import type { Level4PistonPose } from '../../emulation/level4Pistons';
import {
  LEVEL4_CATAPULT,
  LEVEL4_HAMMERS,
  LEVEL4_HAMMER_DIZZY_SECONDS,
  LEVEL4_HAMMER_FRAME_COUNT,
  LEVEL4_HAMMER_HITBOX_X0,
  LEVEL4_HAMMER_PATTERNS,
  LEVEL4_HAMMER_TICKS_PER_FRAME,
  LEVEL4_HAMMER_TICK_HZ,
  LEVEL4_PISTON_BANK2_PATTERNS,
  LEVEL4_PISTON_INIT_DELAYS_BANKS_0_1,
  LEVEL4_PISTON_RELOAD_TICKS_BANKS_0_1,
  LEVEL4_PISTON_SPECS,
  LEVEL4_PISTON_STEPS,
  LEVEL4_PISTON_TICK_HZ,
  LEVEL4_PISTON_TRIGGER_ZONE,
  LEVEL4_VACUUM_SPECS,
} from './level4RomData';

export interface Level4MechanismSnapshot {
  readonly vacuumExtensions: readonly number[];
  readonly vacuumMouthFrames: readonly (number | undefined)[];
  readonly pistons: readonly Level4PistonPose[];
  readonly catapultFrame: number | undefined;
  readonly hammerFrames: readonly (number | undefined)[];
}

const VACUUM_CYCLE_SECONDS = 4.9;

/** Evaluates all 6 Level 4 vacuum cleaner extensions (0..1) and active mouth tremor frames. */
export function evaluateLevel4Vacuums(timeSeconds: number): {
  extensions: number[];
  mouthFrames: (number | undefined)[];
} {
  const extensions: number[] = [];
  const mouthFrames: (number | undefined)[] = [];
  for (const spec of LEVEL4_VACUUM_SPECS) {
    const t =
      (((timeSeconds + spec.phaseOffset) % VACUUM_CYCLE_SECONDS) +
        VACUUM_CYCLE_SECONDS) %
      VACUUM_CYCLE_SECONDS;
    // 0..1.15s retracted, 1.15..1.6s extending, 1.6..3.6s active suction, 3.6..4.05s retracting
    let ext = 0;
    let mouth: number | undefined;
    if (t >= 1.15 && t < 1.6) {
      ext = (t - 1.15) / 0.45;
    } else if (t >= 1.6 && t < 3.6) {
      ext = 1;
      mouth = Math.floor(timeSeconds * 15) & 1;
    } else if (t >= 3.6 && t < 4.05) {
      ext = 1 - (t - 3.6) / 0.45;
    }
    extensions.push(ext);
    mouthFrames.push(mouth);
  }
  return { extensions, mouthFrames };
}

export interface Level4VacuumPullResult {
  readonly forceX: number;
  readonly forceZ: number;
  readonly capturedBy: number | undefined;
}

/** Computes balanced suction pull force (world XZ) and capture state for a marble at (cellX, cellZ). */
export function evaluateLevel4VacuumPull(
  cellX: number,
  cellZ: number,
  extensions: readonly number[],
): Level4VacuumPullResult {
  let forceX = 0;
  let forceZ = 0;
  let capturedBy: number | undefined;
  for (const spec of LEVEL4_VACUUM_SPECS) {
    const ext = extensions[spec.index] ?? 0;
    if (ext < 0.78) continue;
    const dx = spec.mouthX - cellX;
    const dz = spec.mouthZ - cellZ;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.22) {
      capturedBy = spec.index;
      break;
    }
    if (dist < 5.6) {
      // Balanced arcade suction: clearly felt across the lane, passable with active counter-steering.
      const falloff = 1 - dist / 5.6;
      const strength = (5 + falloff * 29) * ext;
      forceX += (dx / dist) * strength;
      forceZ += (dz / dist) * strength;
    }
  }
  return { forceX, forceZ, capturedBy };
}

/** Returns true when (cellX, cellZ) is inside a vacuum cleaner's hazard zone (excluded from safe respawn checkpoints). */
export function isNearLevel4Vacuum(
  cellX: number,
  cellZ: number,
  radiusCells = 4.8,
): boolean {
  for (const spec of LEVEL4_VACUUM_SPECS) {
    if (Math.hypot(cellX - spec.mouthX, cellZ - spec.mouthZ) < radiusCells) {
      return true;
    }
  }
  return false;
}

/**
 * Evaluates active Level 4 chrome piston poses using the exact 30 Hz 68010 ROM
 * countdown & 13-tick pop-up state machine (0x18476..0x18550, 0x186ac..0x187c0).
 */
export function evaluateLevel4Pistons(
  elapsedSeconds: number,
  bank2PatternIndex = 0,
): Level4PistonPose[] {
  if (elapsedSeconds < 0) return [];
  const tick = Math.floor(elapsedSeconds * LEVEL4_PISTON_TICK_HZ);
  const patternCount = LEVEL4_PISTON_BANK2_PATTERNS.length;
  const pattern =
    LEVEL4_PISTON_BANK2_PATTERNS[
      ((bank2PatternIndex % patternCount) + patternCount) % patternCount
    ]!;
  const active: Level4PistonPose[] = [];
  for (const spec of LEVEL4_PISTON_SPECS) {
    const initDelay =
      spec.slot < 24
        ? LEVEL4_PISTON_INIT_DELAYS_BANKS_0_1[spec.slot]!
        : pattern[spec.slot - 24]!;
    if (tick < initDelay) continue;
    const reloadDelay =
      spec.slot < 24
        ? LEVEL4_PISTON_RELOAD_TICKS_BANKS_0_1
        : pattern[spec.slot - 24]!;
    const cycleTick =
      (tick - initDelay) % (LEVEL4_PISTON_STEPS.length + reloadDelay);
    if (cycleTick < LEVEL4_PISTON_STEPS.length) {
      active.push({
        slot: spec.slot,
        x: spec.x,
        z: spec.z,
        height: spec.height,
        step: LEVEL4_PISTON_STEPS[cycleTick]!,
      });
    }
  }
  return active;
}

/** Returns knockback impulse if a marble overlaps a raised piston (step >= 3). */
export function evaluateLevel4PistonBump(
  cellX: number,
  cellZ: number,
  pistons: readonly Level4PistonPose[],
): { x: number; z: number } | undefined {
  for (const p of pistons) {
    if (p.step < 3) continue;
    const dx = cellX - (p.x + 0.5);
    const dz = cellZ - (p.z + 0.5);
    const dist = Math.hypot(dx, dz);
    if (dist < 0.85) {
      const nx = dist > 0.01 ? dx / dist : 1;
      const nz = dist > 0.01 ? dz / dist : 0;
      return { x: nx * 8.5, z: nz * 8.5 };
    }
  }
  return undefined;
}

/**
 * Evaluates the 4 Level 4 wooden hammer swing steps (0..14) using the exact 30 Hz
 * 68010 ROM script timing (0x1d40c..0x1d742) and one of the 4 patterns from 0x1ded8.
 */
export function evaluateLevel4Hammers(
  timeSeconds: number,
  patternIndex = 0,
): (number | undefined)[] {
  const tick = Math.max(0, Math.floor(timeSeconds * LEVEL4_HAMMER_TICK_HZ));
  const patternCount = LEVEL4_HAMMER_PATTERNS.length;
  const pattern =
    LEVEL4_HAMMER_PATTERNS[
      ((patternIndex % patternCount) + patternCount) % patternCount
    ]!;
  const swingTicks = LEVEL4_HAMMER_FRAME_COUNT * LEVEL4_HAMMER_TICKS_PER_FRAME;
  return LEVEL4_HAMMERS.map((h) => {
    const initWait = pattern.initWaitTicks[h.index]!;
    if (tick < initWait) return 0;
    const loopWait = pattern.loopWaitTicks[h.index]!;
    const cycleTick = (tick - initWait) % (swingTicks + loopWait);
    if (cycleTick >= swingTicks) return 0;
    return Math.min(
      LEVEL4_HAMMER_FRAME_COUNT - 1,
      Math.floor(cycleTick / LEVEL4_HAMMER_TICKS_PER_FRAME),
    );
  });
}

export interface Level4HammerStrikeResult {
  readonly x: number;
  readonly z: number;
  readonly dizzySeconds: number;
}

export interface Level4HammerSeparationResult {
  readonly cellX: number;
  readonly cellZ: number;
  readonly normalX: number;
  readonly normalZ: number;
}

/**
 * ROM 0x2ab7a solid wall-block separation: prevents the marble from clipping through
 * a visible wooden hammer head (steps 3..12) by pushing it cleanly to the nearest face.
 */
export function resolveLevel4HammerSeparation(
  cellX: number,
  cellZ: number,
  hammerFrames: readonly (number | undefined)[],
): Level4HammerSeparationResult | undefined {
  for (const h of LEVEL4_HAMMERS) {
    const step = hammerFrames[h.index] ?? 0;
    if (step < 3 || step > 12) continue;
    const x0 = LEVEL4_HAMMER_HITBOX_X0[step] ?? -1.0;
    const minX = h.x + x0 - 0.42;
    const maxX = h.x + 0.45;
    const minZ = h.z - 0.72;
    const maxZ = h.z + 0.72;
    if (cellX > minX && cellX < maxX && cellZ > minZ && cellZ < maxZ) {
      const penLeft = cellX - minX;
      const penNorth = cellZ - minZ;
      const penSouth = maxZ - cellZ;
      if (penLeft <= penNorth && penLeft <= penSouth) {
        return { cellX: minX, cellZ, normalX: -1, normalZ: 0 };
      }
      if (penNorth <= penSouth) {
        return { cellX, cellZ: minZ, normalX: 0, normalZ: -1 };
      }
      return { cellX, cellZ: maxZ, normalX: 0, normalZ: 1 };
    }
  }
  return undefined;
}

/**
 * Returns subtle radial knockback + 2.0 s dizzy (ROM 0x2a9a2..0x2ab74) when a marble
 * is struck by a swinging hammer (steps 6..12, using exact per-frame ROM hitbox 0x22346).
 */
export function evaluateLevel4HammerStrike(
  cellX: number,
  cellZ: number,
  hammerFrames: readonly (number | undefined)[],
): Level4HammerStrikeResult | undefined {
  for (const h of LEVEL4_HAMMERS) {
    const step = hammerFrames[h.index] ?? 0;
    if (step < 6 || step > 12) continue;
    const x0 = LEVEL4_HAMMER_HITBOX_X0[step] ?? -1.0;
    if (
      cellX >= h.x + x0 - 0.38 &&
      cellX <= h.x + 0.35 &&
      Math.abs(cellZ - h.z) <= 0.72
    ) {
      // Subtle radial bump away from the hammer head (ROM 0x2aaa4..0x2ab36) + 60-tick dizzy.
      const centerX = h.x + x0 * 0.5;
      const dx = cellX - centerX;
      const dz = cellZ - h.z;
      const len = Math.hypot(dx, dz);
      const nx = len > 0.05 ? dx / len : -1;
      const nz = len > 0.05 ? dz / len : 0;
      const pushSpeed = 5.2;
      return {
        x: Math.min(-2.2, nx * pushSpeed),
        z: nz * pushSpeed * 0.65,
        dizzySeconds: LEVEL4_HAMMER_DIZZY_SECONDS,
      };
    }
  }
  return undefined;
}

/** Returns true when a marble enters the ROM 0x186ac zone 4/5 trigger for Level 4 pistons (0x400760). */
export function isInLevel4PistonTriggerZone(
  cellX: number,
  cellZ: number,
): boolean {
  return (
    cellX >= LEVEL4_PISTON_TRIGGER_ZONE.minX &&
    cellX <= LEVEL4_PISTON_TRIGGER_ZONE.maxX &&
    cellZ >= LEVEL4_PISTON_TRIGGER_ZONE.minZ &&
    cellZ <= LEVEL4_PISTON_TRIGGER_ZONE.maxZ
  );
}

/** Returns true when a marble enters the red catapult cup at (63, 70). */
export function isInsideLevel4CatapultCup(
  cellX: number,
  cellZ: number,
): boolean {
  return (
    Math.hypot(cellX - LEVEL4_CATAPULT.cupX, cellZ - LEVEL4_CATAPULT.cupZ) <=
    LEVEL4_CATAPULT.triggerRadiusCells
  );
}
