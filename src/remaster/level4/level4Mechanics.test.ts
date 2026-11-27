import { describe, expect, it } from 'vitest';
import {
  evaluateLevel4HammerStrike,
  evaluateLevel4Hammers,
  evaluateLevel4PistonBump,
  evaluateLevel4Pistons,
  evaluateLevel4VacuumPull,
  evaluateLevel4Vacuums,
  isInLevel4PistonTriggerZone,
  isInsideLevel4CatapultCup,
  isNearLevel4Vacuum,
  resolveLevel4HammerSeparation,
} from './level4Mechanics';
import { LEVEL4_CATAPULT, LEVEL4_PISTON_SPECS } from './level4RomData';

describe('Level 4 Aerial Race mechanics', () => {
  it('cycles all 6 vacuum cleaners and computes radial suction pull + capture', () => {
    // At t = 2.5 s, vacuum 0 (phaseOffset 0) is in active suction (1.9..3.6 s)
    const { extensions, mouthFrames } = evaluateLevel4Vacuums(2.5);
    expect(extensions).toHaveLength(6);
    expect(extensions[0]).toBe(1);
    expect(mouthFrames[0]).toBeDefined();

    // Marble 2.5 cells away from vacuum 0 (39.5, 36.8) gets pulled toward it
    const pull = evaluateLevel4VacuumPull(39.5, 39.3, extensions);
    expect(pull.capturedBy).toBeUndefined();
    expect(pull.forceZ).toBeLessThan(-5);

    // Marble right at nozzle mouth gets captured
    const cap = evaluateLevel4VacuumPull(39.5, 37.0, extensions);
    expect(cap.capturedBy).toBe(0);

    // Retracted vacuums exert zero pull
    const idle = evaluateLevel4VacuumPull(39.5, 37.0, [0, 0, 0, 0, 0, 0]);
    expect(idle.capturedBy).toBeUndefined();
    expect(idle.forceX).toBe(0);
    expect(idle.forceZ).toBe(0);
  });

  it('cycles all 36 ROM pistons at 30 Hz with exact delays, 13-tick pop-up, 100-tick reload, and 4 Bank-2 patterns', () => {
    expect(LEVEL4_PISTON_SPECS).toHaveLength(36);
    expect(evaluateLevel4Pistons(-0.1)).toHaveLength(0);

    // At tick 0 (0.0 s): Bank 0 slots 0 & 8 have initDelay 0 -> step 1
    const atZero = evaluateLevel4Pistons(0, 0);
    expect(atZero.map((p) => p.slot)).toEqual([0, 8]);
    expect(atZero.every((p) => p.step === 1)).toBe(true);

    // At tick 3 (0.10 s): slots 0 & 8 reach full height (step 4)
    const atPeak = evaluateLevel4Pistons(3 / 30, 0);
    expect(atPeak.map((p) => p.slot)).toEqual([0, 8]);
    expect(atPeak.every((p) => p.step === 4)).toBe(true);

    // At tick 13 (0.433 s): slots 0 & 8 retract; no pistons active until Bank 1 (tick 20)
    expect(evaluateLevel4Pistons(13 / 30, 0)).toHaveLength(0);

    // At tick 20: Bank 1 slots 12 & 20 pop (pattern 0 has Bank 2 at delay 60);
    // under pattern 2, Bank 2 slots 24 & 25 also have delay 20!
    expect(evaluateLevel4Pistons(20 / 30, 0).map((p) => p.slot)).toEqual([
      12, 20,
    ]);
    expect(evaluateLevel4Pistons(20 / 30, 2).map((p) => p.slot)).toEqual([
      12, 20, 24, 25,
    ]);
    // Under pattern 3, Bank 2 slots 24, 32, 34 have delay 20
    expect(evaluateLevel4Pistons(20 / 30, 3).map((p) => p.slot)).toEqual([
      12, 20, 24, 32, 34,
    ]);

    // After 13 + 100 = 113 ticks, Bank 0 slots 0 & 8 pop again!
    expect(evaluateLevel4Pistons(113 / 30, 0).map((p) => p.slot)).toEqual([
      0, 8,
    ]);

    const raised = atPeak.find((p) => p.step >= 3)!;
    expect(raised).toBeDefined();
    const bump = evaluateLevel4PistonBump(
      raised.x + 0.6,
      raised.z + 0.5,
      atPeak,
    );
    expect(bump).toBeDefined();
    expect(Math.hypot(bump!.x, bump!.z)).toBeGreaterThan(5);
    expect(evaluateLevel4PistonBump(10, 10, atPeak)).toBeUndefined();
  });

  it('excludes positions near vacuum nozzles from safe checkpoints', () => {
    expect(isNearLevel4Vacuum(39.5, 38.0)).toBe(true);
    expect(isNearLevel4Vacuum(10.5, 23.5)).toBe(false);
  });

  it('swings all 4 wooden hammers using the 4 ROM 30 Hz patterns and inflicts subtle bump + 2.0 s dizzy', () => {
    // Pattern 0 at t = 18/30 s (0.6 s): tick 18 -> frame 9 (active strike) for all 4 hammers
    const frames0 = evaluateLevel4Hammers(18 / 30, 0);
    expect(frames0).toEqual([9, 9, 9, 9]);

    // Pattern 2 (cascading wave: initWait = [0, 30, 60, 90]) at tick 18: only hammer 0 swings
    expect(evaluateLevel4Hammers(18 / 30, 2)).toEqual([9, 0, 0, 0]);
    // At tick 48 (1.6 s): hammer 0 is waiting, hammer 1 is at frame 9
    expect(evaluateLevel4Hammers(48 / 30, 2)).toEqual([0, 9, 0, 0]);

    // Pattern 3 (staggered cross: initWait = [60, 30, 90, 0]) at tick 18: only hammer 3 swings
    expect(evaluateLevel4Hammers(18 / 30, 3)).toEqual([0, 0, 0, 9]);

    const hit = evaluateLevel4HammerStrike(104.2, 102.5, frames0);
    expect(hit).toBeDefined();
    expect(hit!.x).toBeLessThan(-2);
    expect(Math.abs(hit!.x)).toBeLessThanOrEqual(5.5);
    expect(hit!.dizzySeconds).toBeCloseTo(2.0, 2);
    expect(evaluateLevel4HammerStrike(50, 50, frames0)).toBeUndefined();

    // Solid separation (ROM 0x2ab7a) pushes marble out of visible hammer head along nearest face
    const sepLeft = resolveLevel4HammerSeparation(103.8, 102.5, frames0);
    expect(sepLeft).toBeDefined();
    expect(sepLeft!.normalX).toBe(-1);
    const sepNorth = resolveLevel4HammerSeparation(104.8, 101.9, frames0);
    expect(sepNorth).toBeDefined();
    expect(sepNorth!.normalZ).toBe(-1);
    const sepSouth = resolveLevel4HammerSeparation(104.8, 103.1, frames0);
    expect(sepSouth).toBeDefined();
    expect(sepSouth!.normalZ).toBe(1);
    expect(resolveLevel4HammerSeparation(50, 50, frames0)).toBeUndefined();
  });

  it('detects the red catapult cup at (63, 70) and ROM piston trigger zone (0x400760)', () => {
    expect(
      isInsideLevel4CatapultCup(LEVEL4_CATAPULT.cupX, LEVEL4_CATAPULT.cupZ),
    ).toBe(true);
    expect(isInsideLevel4CatapultCup(63.9, 70)).toBe(false);
    expect(isInsideLevel4CatapultCup(20, 20)).toBe(false);

    expect(isInLevel4PistonTriggerZone(20, 20)).toBe(false);
    expect(isInLevel4PistonTriggerZone(66, 54)).toBe(true);
  });
});
