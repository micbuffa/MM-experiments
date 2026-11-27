import { describe, expect, it } from 'vitest';
import { stepLevel3Amoebas } from '../level3/level3Mechanics';
import {
  computeLevel6MazePhase,
  createLevel6Amoebas,
  findNearestLevel6Respawn,
  isInsideLevel6SquarePit,
  isLevel6DynamicMazeCell,
  sampleLevel6SurfaceMode,
} from './level6Mechanics';
import {
  LEVEL6_AMOEBA_SPECS,
  LEVEL6_BLACK_MARBLE,
  LEVEL6_MAZE_PHASE_SECONDS,
  LEVEL6_WORM_SPAWNS,
} from './level6RomData';

describe('Level 6 Ultimate Race mechanics', () => {
  it('exposes ROM-verified Black Marble, 4 Green Worms, and 4 Acid Amoeba loops', () => {
    expect(LEVEL6_BLACK_MARBLE.nodes).toHaveLength(3);
    expect(LEVEL6_WORM_SPAWNS).toHaveLength(4);
    expect(LEVEL6_AMOEBA_SPECS).toHaveLength(4);
  });

  it('advances the 4 Acid Amoeba pools smoothly around their closed ROM loops', () => {
    let amoebas = createLevel6Amoebas();
    expect(amoebas).toHaveLength(4);
    const startX = amoebas[0]!.cellX;
    const startZ = amoebas[0]!.cellZ;

    amoebas = stepLevel3Amoebas(amoebas, 0.5);
    expect(
      Math.hypot(amoebas[0]!.cellX - startX, amoebas[0]!.cellZ - startZ),
    ).toBeGreaterThan(0.1);

    for (let i = 0; i < 20; i++) amoebas = stepLevel3Amoebas(amoebas, 0.4);
    expect(amoebas[0]!.waypointIndex).toBeGreaterThanOrEqual(0);
    expect(amoebas[0]!.waypointIndex).toBeLessThan(
      LEVEL6_AMOEBA_SPECS[0]!.waypoints.length,
    );
  });

  it('cycles the disappearing-block maze across phases 0..3 at 41 frames (60 Hz)', () => {
    expect(computeLevel6MazePhase(0)).toBe(0);
    expect(computeLevel6MazePhase(-1)).toBe(0);
    expect(computeLevel6MazePhase(LEVEL6_MAZE_PHASE_SECONDS * 0.5)).toBe(0);
    expect(computeLevel6MazePhase(LEVEL6_MAZE_PHASE_SECONDS * 1.1)).toBe(1);
    expect(computeLevel6MazePhase(LEVEL6_MAZE_PHASE_SECONDS * 2.1)).toBe(2);
    expect(computeLevel6MazePhase(LEVEL6_MAZE_PHASE_SECONDS * 3.1)).toBe(3);
    expect(computeLevel6MazePhase(LEVEL6_MAZE_PHASE_SECONDS * 4.1)).toBe(0);
  });

  it('distinguishes dynamic disappearing-block cells from static entry and GOAL pads', () => {
    expect(isLevel6DynamicMazeCell(50, 50)).toBe(false);
    expect(isLevel6DynamicMazeCell(79, 82)).toBe(false); // static entry platform
    expect(isLevel6DynamicMazeCell(89, 92)).toBe(false); // GOAL pad
    expect(isLevel6DynamicMazeCell(85, 85)).toBe(true); // dynamic maze block
  });

  it('classifies Level 6 ROM surface friction modes (sand, ribbed, shimmer) and square pit entry', () => {
    expect(sampleLevel6SurfaceMode(18.5, 20.5)).toBe('sand'); // 0x2d start amber
    expect(sampleLevel6SurfaceMode(22.5, 19.5)).toBe('normal'); // elevated white start mound (H > 16384)
    expect(sampleLevel6SurfaceMode(22.5, 24.5)).toBe('normal'); // white ridge (H > 16384)
    expect(sampleLevel6SurfaceMode(84.5, 91.5)).toBe('sand'); // 0x2e strip behind GOAL
    expect(sampleLevel6SurfaceMode(40.5, 52.5)).toBe('ribbed'); // 0x2f right worm slope
    expect(sampleLevel6SurfaceMode(58.5, 49.5)).toBe('ribbed'); // 0x30 left worm slope
    expect(sampleLevel6SurfaceMode(52.5, 40.5)).toBe('shimmer'); // 0x38 left peach plateau
    expect(sampleLevel6SurfaceMode(52.5, 62.5)).toBe('shimmer'); // 0x39 right peach plateau
    expect(sampleLevel6SurfaceMode(85.5, 88.5)).toBe('shimmer'); // 0x3a GOAL bridge
    expect(sampleLevel6SurfaceMode(22.5, 31.5)).toBe('normal');

    expect(isInsideLevel6SquarePit(22.5, 31.5, 16378)).toBe(true);
    expect(isInsideLevel6SquarePit(22.5, 31.5, 16384)).toBe(false);
    expect(isInsideLevel6SquarePit(50, 50, 16352)).toBe(false);
  });

  it('picks the nearest 68010 ROM respawn checkpoint at the exact same elevation', () => {
    const sample = (cx: number, cz: number) => (cx < 45 && cz < 45 ? 0 : -3.27);
    const upper = findNearestLevel6Respawn(36.2, 37.8, 0, sample);
    expect(upper).not.toBeNull();
    expect(upper!.y).toBe(0);
    expect(upper!.cellX).toBeCloseTo(36.5, 1);
    expect(upper!.cellZ).toBeCloseTo(37.5, 1);

    // Points at a different elevation are ignored
    const none = findNearestLevel6Respawn(36.2, 37.8, -10, sample);
    expect(none).toBeNull();
  });
});
