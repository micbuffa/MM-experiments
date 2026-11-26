import { describe, expect, it } from 'vitest';
import {
  GOAL_ZONE,
  LEVEL2_BLACK_MARBLE,
  LEVEL2_SECOND_MARBLE,
  LEVEL2_SCROLL_ROW0,
  LEVEL2_ZONE_BOUNDARIES,
} from './blackMarbleRom';
import {
  arcadeScreenY,
  cellOf,
  enemyBandEvent,
  estimateLevel2Scroll,
  LEVEL2_START,
  nextZone,
  scrollRow,
} from './enemyZones';

const zones = LEVEL2_ZONE_BOUNDARIES;
const black = LEVEL2_BLACK_MARBLE;
const second = LEVEL2_SECOND_MARBLE;

describe('zone tracker (0x1365c)', () => {
  it('changes zone only when leaving a boundary cell', () => {
    expect(nextZone(zones, 0, { x: 16, z: 24 }, { x: 16, z: 25 })).toBe(0);
    expect(nextZone(zones, 0, { x: 16, z: 25 }, { x: 16, z: 26 })).toBe(1);
    expect(nextZone(zones, 1, { x: 16, z: 25 }, { x: 16, z: 24 })).toBe(0);
    expect(nextZone(zones, 0, { x: 27, z: 25 }, { x: 27, z: 26 })).toBe(1);
  });

  it('x = 30 (z 34..37) is the black marble descent boundary between zones 1 and 2', () => {
    expect(nextZone(zones, 1, { x: 30, z: 35 }, { x: 31, z: 35 })).toBe(2);
    expect(nextZone(zones, 2, { x: 30, z: 35 }, { x: 29, z: 35 })).toBe(1);
    expect(nextZone(zones, 1, { x: 30, z: 33 }, { x: 31, z: 33 })).toBe(1);
  });

  it('keeps the zone when the cell is unchanged or moves along the line', () => {
    expect(nextZone(zones, 1, { x: 30, z: 35 }, { x: 30, z: 35 })).toBe(1);
    expect(nextZone(zones, 1, { x: 30, z: 35 }, { x: 30, z: 36 })).toBe(1);
  });

  it('reports the goal zone when the finish line is crossed', () => {
    expect(nextZone(zones, 12, { x: 111, z: 108 }, { x: 111, z: 109 })).toBe(
      GOAL_ZONE,
    );
  });

  it('converts continuous cell positions to integer cells', () => {
    expect(cellOf({ x: 30.99, z: -0.2 })).toEqual({ x: 30, z: -1 });
  });
});

describe('scroll band spawner (0x15a12)', () => {
  it('computes signed-byte scroll rows from the level row-0 scroll', () => {
    expect(scrollRow(LEVEL2_SCROLL_ROW0)).toBe(0);
    expect(scrollRow(LEVEL2_SCROLL_ROW0 - 25)).toBe(-2);
    expect(scrollRow(LEVEL2_SCROLL_ROW0 + 16 * 16)).toBe(16);
    expect(scrollRow(LEVEL2_SCROLL_ROW0 + 16 * 130)).toBe(-126);
  });

  it('spawns the black marble at level start and removes it past row 15', () => {
    expect(enemyBandEvent(black, false, -2, 0)).toBe('spawn');
    expect(enemyBandEvent(black, true, 14, 15)).toBeNull();
    expect(enemyBandEvent(black, true, 15, 16)).toBe('despawn');
    expect(enemyBandEvent(black, true, 0, -1)).toBe('despawn');
    expect(enemyBandEvent(black, false, 32, 31)).toBe('spawn');
    expect(enemyBandEvent(black, false, 3, 4)).toBeNull();
    expect(enemyBandEvent(black, false, 5, 5)).toBeNull();
  });

  it('spawns the zone 7 marble when the screen reaches row 15 from above', () => {
    expect(enemyBandEvent(second, false, 14, 15)).toBe('spawn');
    expect(enemyBandEvent(second, false, 16, 15)).toBeNull();
    expect(enemyBandEvent(second, true, 15, 14)).toBe('despawn');
    expect(enemyBandEvent(second, true, 40, 41)).toBe('despawn');
  });
});

describe('scroll estimate (inferred)', () => {
  it('is row 0 at the start and grows as the player goes down the course', () => {
    const start = estimateLevel2Scroll(
      LEVEL2_START,
      LEVEL2_START.heightAboveBaseUnits,
    );
    expect(start).toBe(LEVEL2_SCROLL_ROW0);
    expect(estimateLevel2Scroll({ x: 10, z: 5 }, 0)).toBe(LEVEL2_SCROLL_ROW0);
    const corridorBottom = estimateLevel2Scroll({ x: 43.5, z: 35.5 }, -104);
    expect(scrollRow(corridorBottom)).toBe(15);
    expect(arcadeScreenY({ x: 1, z: 1 }, 2)).toBe(6);
  });
});
