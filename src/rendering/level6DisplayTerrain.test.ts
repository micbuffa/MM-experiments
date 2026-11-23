import { describe, expect, it } from 'vitest';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  level6DisplayTerrain,
  level6Goal,
  level6PhaseGrid,
  level6Pyramids,
  level6SurfaceKind,
} from './level6DisplayTerrain';

function emptyGrid(size = 122): TerrainCell[][] {
  return Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
}

describe('level6DisplayTerrain', () => {
  it('flattens the 3x3 bases of all 4 ice-diamond pyramids without mutating input', () => {
    const grid = emptyGrid();
    grid[74]![74] = [0, 1, 2, 3];
    const display = level6DisplayTerrain(grid);
    expect(display[74]![74]).not.toEqual([0, 1, 2, 3]);
    expect(grid[74]![74]).toEqual([0, 1, 2, 3]);
    expect(level6Pyramids).toHaveLength(4);
    for (const [cx, cz] of level6Pyramids) {
      grid[cz]![cx] = [-1, 0, 1, 2];
    }
    const clean = level6DisplayTerrain(grid);
    for (const [cx, cz] of level6Pyramids) {
      const cell = clean[cz]![cx]!;
      expect(cell[0]).toBe(cell[1]);
      expect(cell[1]).toBe(cell[2]);
      expect(cell[2]).toBe(cell[3]);
    }
  });

  it('clips outer diagonal ears at |x - z| = 21', () => {
    const grid = emptyGrid();
    grid[40]![19] = [0, 0, 0, 0];
    grid[20]![41] = [0, 0, 0, 0];
    const display = level6DisplayTerrain(grid);
    expect(display[40]![19]![3]).toBeNull();
    expect(display[20]![41]![1]).toBeNull();
  });

  it('applies dynamic maze phase overrides onto a fresh grid copy', () => {
    const base = emptyGrid();
    base[82]![85] = [-6.94, -6.94, -6.94, -6.94];
    const next = level6PhaseGrid(base, [
      { x: 85, z: 82, cell: [-3.26, -3.26, -3.26, -3.26] },
    ]);
    expect(base[82]![85]).toEqual([-6.94, -6.94, -6.94, -6.94]);
    expect(next[82]![85]).toEqual([-3.26, -3.26, -3.26, -3.26]);
  });

  it('classifies Level 6 surface zones accurately', () => {
    const flatHigh: TerrainCell = [0, 0, 0, 0];
    const flatMazeTop: TerrainCell = [-3.26, -3.26, -3.26, -3.26];
    const flatMazeBase: TerrainCell = [-6.94, -6.94, -6.94, -6.94];
    expect(level6SurfaceKind(12, 16, flatHigh)).toBe('amber');
    expect(level6SurfaceKind(23, 21, flatHigh)).toBe('stone');
    expect(level6SurfaceKind(42, 34, flatHigh)).toBe('ice');
    expect(level6SurfaceKind(52, 42, flatHigh)).toBe('peach');
    expect(level6SurfaceKind(55, 50, flatHigh)).toBe('ribbed');
    expect(level6SurfaceKind(74, 74, flatMazeTop)).toBe('ice');
    expect(level6SurfaceKind(80, 82, flatMazeTop)).toBe('stone');
    expect(
      level6SurfaceKind(level6Goal.x + 1, level6Goal.z + 1, flatMazeTop),
    ).toBe('stone');
    expect(level6SurfaceKind(90, 82, flatMazeTop)).toBe('amber');
    expect(level6SurfaceKind(101, 106, flatMazeTop)).toBe('ice');
    expect(level6SurfaceKind(84, 95, flatMazeTop)).toBe('dark');
    expect(level6SurfaceKind(84, 95, flatMazeBase)).toBe('stone');
  });
});
