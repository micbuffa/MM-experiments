import { describe, expect, it } from 'vitest';
import {
  arcadeHeightToWorld,
  arcadeSpeedToWorld,
  arcadeToWorld,
  romTicksToSeconds,
  secondsToRomTicks,
  secondsToRomTickTime,
  worldToArcade,
} from './romUnits';

describe('romUnits', () => {
  it('runs ROM logic at 30 Hz', () => {
    expect(secondsToRomTicks(0)).toBe(0);
    expect(secondsToRomTicks(1 / 30 - 1e-6)).toBe(0);
    expect(secondsToRomTicks(1 / 30)).toBe(1);
    expect(secondsToRomTicks(0.6)).toBe(18);
    expect(secondsToRomTickTime(0.05)).toBeCloseTo(1.5);
    expect(romTicksToSeconds(73)).toBeCloseTo(2.4333, 4);
  });

  it('converts 4 units per tick into 15 cells per second', () => {
    expect(arcadeSpeedToWorld(4)).toBe(15);
    expect(arcadeHeightToWorld(8)).toBeCloseTo(Math.sqrt(2 / 3));
  });

  it('maps arcade points like practiceWorldPoint and back', () => {
    const frame = { originX: 0, originZ: 0, columns: 130, rows: 130 };
    const world = arcadeToWorld({ x: 524, z: 612, height: 0x4000 }, frame);
    expect(world).toEqual({ x: 0.5, y: 0, z: 11.5 });
    const back = worldToArcade({ x: 0.5, y: -1, z: 11.5 }, frame);
    expect(back.x).toBeCloseTo(524);
    expect(back.z).toBeCloseTo(612);
    expect(arcadeToWorld(back, frame).y).toBeCloseTo(-1);
  });
});
