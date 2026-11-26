import { describe, expect, it } from 'vitest';
import {
  ENEMY_MARBLE_AI,
  LEVEL2_BLACK_MARBLE,
  LEVEL2_ENEMY_MARBLES,
  LEVEL2_ZONE_BOUNDARIES,
} from './blackMarbleRom';

describe('Level 2 enemy marble ROM data', () => {
  it('has well-formed node graphs (every link points to an existing node)', () => {
    for (const spec of LEVEL2_ENEMY_MARBLES) {
      for (const n of spec.nodes) {
        for (const link of n.links)
          expect(link).toBeLessThan(spec.nodes.length);
      }
    }
  });

  it('places the black marble at the bottom of the corridor, patrolling zone 1', () => {
    const black = LEVEL2_BLACK_MARBLE;
    expect(black.zone).toBe(1);
    expect(black.nodes[0]).toMatchObject({ x: 40, z: 35 });
    // Corridor climb runs on the row z = 35, the centre of the 3-cell corridor 34..36.
    expect([0, 1, 8, 7, 6].map((i) => black.nodes[i]?.z)).toEqual([
      35, 35, 35, 35, 35,
    ]);
    expect(black.keepRows.last).toBe(black.spawnRows.last - 0x10);
  });

  it('has boundary segments with ordered ranges', () => {
    for (const b of LEVEL2_ZONE_BOUNDARIES)
      expect(b.from).toBeLessThanOrEqual(b.to);
  });

  it('keeps steering constants consistent with the ROM ordering', () => {
    expect(ENEMY_MARBLE_AI.attackSpeed).toBeGreaterThan(
      ENEMY_MARBLE_AI.chaseSpeed,
    );
    expect(ENEMY_MARBLE_AI.patrolSpeed).toBeGreaterThan(
      ENEMY_MARBLE_AI.speedCap,
    );
    expect(ENEMY_MARBLE_AI.giveUpTicks).toBe(150);
  });
});
