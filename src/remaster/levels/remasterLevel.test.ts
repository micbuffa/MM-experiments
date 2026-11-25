import { describe, expect, it } from 'vitest';
import {
  isInsideGoal,
  practiceTerrainToRemasterLevel,
  sampleLayerHeight,
  type HeightLayer,
} from './remasterLevel';
import type { PracticeTerrain } from '../../game/modern/practiceTerrain';

describe('remasterLevel', () => {
  it('samples bilinear heights on solid cells and returns null on voids', () => {
    const layer: HeightLayer = {
      id: 'test',
      columns: 2,
      rows: 2,
      origin: { x: 0, z: 0 },
      defaultSurface: 'stone',
      cells: [
        [[0, 2, 4, 2], null],
        [
          [1, 1, 1, null],
          [0, 0, null, null],
        ],
      ],
    };
    // Cell (0,0) spans world [-1..0, -1..0], center at (-0.5, -0.5) => avg 2
    expect(sampleLayerHeight(layer, -0.5, -0.5)).toBeCloseTo(2);
    // Void cell (1,0) at world (0.5, -0.5)
    expect(sampleLayerHeight(layer, 0.5, -0.5)).toBeNull();
    // 3-corner partial cell (0,1) at world (-0.5, 0.5) => average of 3 corners = 1
    expect(sampleLayerHeight(layer, -0.5, 0.5)).toBeCloseTo(1);
    // 2-corner cell (1,1) => null
    expect(sampleLayerHeight(layer, 0.5, 0.5)).toBeNull();
    // Out of bounds => null
    expect(sampleLayerHeight(layer, 10, 10)).toBeNull();
  });

  it('converts PracticeTerrain into RemasterLevelV1 with valid spawns, goal and killY', () => {
    const cells = Array.from({ length: 91 }, () =>
      Array.from({ length: 91 }, () => [0, 0, 0, 0] as const),
    );
    const terrain: PracticeTerrain = {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15784,
    };
    const level = practiceTerrainToRemasterLevel(terrain);
    expect(level.format).toBe('remaster-level-v1');
    expect(level.courseIndex).toBe(1);
    expect(level.timerSeconds).toBe(60);
    expect(level.direction).toBe(1);
    expect(level.heightLayers).toHaveLength(1);
    expect(level.killY).toBe(-6);
    expect(
      isInsideGoal(
        level.goal,
        (level.goal.minX + level.goal.maxX) / 2,
        (level.goal.minZ + level.goal.maxZ) / 2,
      ),
    ).toBe(true);
    expect(isInsideGoal(level.goal, -40, -40)).toBe(false);
  });
});
