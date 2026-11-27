import { describe, expect, it } from 'vitest';
import {
  isInsideGoal,
  practiceTerrainToRemasterLevel,
  sampleLayerHeight,
  sampleSurfaceAt,
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
    expect(sampleSurfaceAt(level, 0, 0)).toBe('stone');
  });

  it('converts Level 2 (intermediate) terrain with ice surface zone and black marble enemy', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from({ length: 130 }, () => [0, 0, 0, 0] as const),
    );
    const terrain: PracticeTerrain = {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15846,
      level: 'intermediate',
    };
    const level = practiceTerrainToRemasterLevel(terrain);
    expect(level.courseIndex).toBe(2);
    expect(level.name).toBe('Beginner Race');
    expect(level.surfaceZones).toHaveLength(1);
    const ice = level.surfaceZones[0]!;
    expect(
      sampleSurfaceAt(
        level,
        (ice.minX + ice.maxX) / 2,
        (ice.minZ + ice.maxZ) / 2,
      ),
    ).toBe('ice');
    expect(level.enemies).toHaveLength(1);
    expect(level.enemies[0]!.kind).toBe('blackMarble');
    // Black Marble spawns at native 68010 RAM 0x400a20 coords (324, 284) => cells (40.5, 35.5) on the bridge
    expect(level.enemies[0]!.position.x).toBeCloseTo(324 / 8 - 65, 1);
    expect(level.enemies[0]!.position.z).toBeCloseTo(284 / 8 - 65, 1);
    // 5 raised rectangular wells × 4 elastic outer-wall bumper strips = 20 volumes
    expect(level.volumes).toHaveLength(20);
    // P1 and P2 spawn in the two recessed start cups at z=14 (world -51),
    // behind the raised wells that start at z=17 (world -48).
    expect(level.spawns.player1.x).toBeCloseTo(17.5 - 65, 1);
    expect(level.spawns.player1.z).toBeCloseTo(14 - 65, 1);
    expect(level.spawns.player2.x).toBeCloseTo(27.5 - 65, 1);
    expect(level.spawns.player2.z).toBeCloseTo(14 - 65, 1);
  });

  it('converts Level 3 (Intermediate Race) terrain with wave surface zone and ROM tower spawns', () => {
    const cells = Array.from({ length: 118 }, () =>
      Array.from({ length: 118 }, () => [0, 0, 0, 0] as const),
    );
    const terrain: PracticeTerrain = {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15336,
      level: 'level3',
    };
    const level = practiceTerrainToRemasterLevel(terrain);
    expect(level.courseIndex).toBe(3);
    expect(level.name).toBe('Intermediate Race');
    expect(level.timerSeconds).toBe(60);
    expect(level.enemies).toHaveLength(0);
    expect(level.surfaceZones).toHaveLength(1);
    const wave = level.surfaceZones[0]!;
    expect(
      sampleSurfaceAt(
        level,
        (wave.minX + wave.maxX) / 2,
        (wave.minZ + wave.maxZ) / 2,
      ),
    ).toBe('wave');
    expect(level.spawns.player1.x).toBeCloseTo(22.5 - 59, 1);
    expect(level.spawns.player1.z).toBeCloseTo(9.5 - 59, 1);
    expect(level.spawns.player2.x).toBeCloseTo(8.5 - 59, 1);
    expect(level.spawns.player2.z).toBeCloseTo(23.5 - 59, 1);
  });

  it('converts Level 4 (Aerial Race) terrain with Black Marble and ROM beam spawns', () => {
    const cells = Array.from({ length: 130 }, () =>
      Array.from({ length: 130 }, () => [0, 0, 0, 0] as const),
    );
    const terrain: PracticeTerrain = {
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15200,
      level: 'level4',
    };
    const level = practiceTerrainToRemasterLevel(terrain);
    expect(level.courseIndex).toBe(4);
    expect(level.name).toBe('Aerial Race');
    expect(level.timerSeconds).toBe(70);
    expect(level.enemies).toHaveLength(1);
    expect(level.enemies[0]!.id).toBe('level4-black-marble');
    expect(level.spawns.player1.x).toBeCloseTo(10.5 - 65, 1);
    expect(level.spawns.player1.z).toBeCloseTo(23.5 - 65, 1);
    expect(level.spawns.player2.x).toBeCloseTo(22.5 - 65, 1);
    expect(level.spawns.player2.z).toBeCloseTo(9.5 - 65, 1);
  });
});
