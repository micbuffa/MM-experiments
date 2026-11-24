import { describe, expect, it } from 'vitest';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  isLevel6FloatingSlabEdge,
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
    // Never materialize void/boundary cells outside the cyan ice diamond (x<=79, z<=81).
    grid[77]![80] = [null, null, null, 0];
    grid[82]![75] = [0, null, null, null];
    const clipped = level6DisplayTerrain(grid);
    expect(clipped[77]![80]).toEqual([null, null, null, 0]);
    expect(clipped[82]![75]).toEqual([0, null, null, null]);
  });

  it('clips outer diagonal ears at |x - z| = 21 and discards out-of-corridor cells beyond |x - z| > 21', () => {
    const grid = emptyGrid();
    grid[40]![19] = [0, 0, 0, 0];
    grid[20]![41] = [0, 0, 0, 0];
    grid[100]![70] = [0, 0, 0, 0];
    grid[70]![100] = [0, 0, 0, 0];
    const display = level6DisplayTerrain(grid);
    expect(display[40]![19]![3]).toBeNull();
    expect(display[20]![41]![1]).toBeNull();
    expect(display[100]![70]).toBeNull();
    expect(display[70]![100]).toBeNull();
    // Preserve real SW corner instead of extrapolating nw + se - ne spikes on stepped boundary cells.
    grid[82]![103] = [-3.26, -6.94, -3.26, -3.26];
    const noSpike = level6DisplayTerrain(grid);
    expect(noSpike[82]![103]![3]).toBeCloseTo(-3.26, 2);
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
    // 6x5 mound (x=20..25, z=17..21) and 2-cell ridge (x=22..23, z=22..26) are stone;
    // adjacent foot rows along the ridge (x=21 and x=24 at z=24) stay amber.
    expect(level6SurfaceKind(23, 21, flatHigh)).toBe('stone');
    expect(level6SurfaceKind(25, 19, flatHigh)).toBe('stone');
    expect(level6SurfaceKind(22, 24, flatHigh)).toBe('stone');
    expect(level6SurfaceKind(21, 24, flatHigh)).toBe('amber');
    expect(level6SurfaceKind(24, 24, flatHigh)).toBe('amber');
    // Sloped chutes in mid-section are stone; low tucked ledge under amoeba plateau is ribbed.
    expect(level6SurfaceKind(57, 45, [0, 0, -1.2, -1.2])).toBe('stone');
    expect(level6SurfaceKind(52, 45, [-2.5, -2.5, -2.5, -2.5])).toBe('ribbed');
    // Right 2-wide walkway (z=69..70) stays grey stone (no peach bleed from z=55..68).
    expect(level6SurfaceKind(55, 68, flatHigh)).toBe('peach');
    expect(level6SurfaceKind(46, 60, flatHigh)).toBe('peach');
    expect(level6SurfaceKind(45, 60, flatHigh)).toBe('ribbed');
    expect(level6SurfaceKind(55, 69, flatHigh)).toBe('stone');
    // Left 2-wide walkway (x=67..68) stays grey stone (no ribbed bleed from worm platform x<=66).
    expect(level6SurfaceKind(66, 52, flatHigh)).toBe('ribbed');
    expect(level6SurfaceKind(67, 52, flatHigh)).toBe('stone');
    // Hollow square pit island (x=20..25, z=29..34): outer rim and inner sunken ledge are grey stone.
    expect(level6SurfaceKind(21, 30, [-0.41, -0.41, -0.41, -0.41])).toBe(
      'stone',
    );
    expect(level6SurfaceKind(42, 34, flatHigh)).toBe('ice');
    expect(level6SurfaceKind(52, 42, flatHigh)).toBe('peach');
    expect(level6SurfaceKind(55, 50, flatHigh)).toBe('ribbed');
    expect(level6SurfaceKind(74, 74, flatMazeTop)).toBe('ice');
    expect(level6SurfaceKind(68, 74, flatMazeTop)).toBe('stone');
    expect(level6SurfaceKind(74, 70, flatMazeTop)).toBe('stone');
    expect(level6SurfaceKind(80, 82, flatMazeTop)).toBe('stone');
    expect(
      level6SurfaceKind(level6Goal.x + 1, level6Goal.z + 1, flatMazeTop),
    ).toBe('amber');
    expect(level6SurfaceKind(84, 89, flatMazeTop)).toBe('amber');
    expect(level6SurfaceKind(84, 93, flatMazeTop)).toBe('ice');
    expect(level6SurfaceKind(92, 104, flatMazeTop)).toBe('ice');
    expect(level6SurfaceKind(103, 106, flatMazeTop)).toBe('stone');
    expect(level6SurfaceKind(90, 82, flatMazeTop)).toBe('dark');
    expect(level6SurfaceKind(84, 95, flatMazeBase)).toBe('stone');
  });

  it('keeps upper floating platforms 1-block thick and transitions to deep cliffs at the amoeba/worm plateaus', () => {
    // Start plateau, square pit, both wedge branches, and both cyan ice strips float in space.
    expect(isLevel6FloatingSlabEdge(16, 18)).toBe(true);
    expect(isLevel6FloatingSlabEdge(23, 35)).toBe(true);
    expect(isLevel6FloatingSlabEdge(31, 32)).toBe(true);
    expect(isLevel6FloatingSlabEdge(44, 34)).toBe(true);
    expect(isLevel6FloatingSlabEdge(41, 44)).toBe(true);
    // Deep cliffs begin at the left amoeba plateau (x >= 46) and right ribbed worm platform (z >= 46 + notch).
    expect(isLevel6FloatingSlabEdge(46, 36)).toBe(false);
    expect(isLevel6FloatingSlabEdge(37, 45)).toBe(false);
    expect(isLevel6FloatingSlabEdge(40, 46)).toBe(false);
    expect(isLevel6FloatingSlabEdge(74, 74)).toBe(false);
  });

  it('assigns authentic Level 6 end-maze materials per cell and slope', () => {
    const elevated = [0, 0, 0, 0] as const;
    const sloped = [0, 0, -0.5, -0.5] as const;
    expect(level6SurfaceKind(86, 88, elevated)).toBe('amber');
    expect(level6SurfaceKind(84, 92, elevated)).toBe('amber');
    expect(level6SurfaceKind(84, 95, elevated)).toBe('ice');
    expect(level6SurfaceKind(84, 97, elevated)).toBe('amber');
    expect(level6SurfaceKind(84, 103, elevated)).toBe('ribbed');
    expect(level6SurfaceKind(87, 105, elevated)).toBe('stone');
    expect(level6SurfaceKind(88, 103, elevated)).toBe('stone');
    expect(level6SurfaceKind(88, 104, elevated)).toBe('ice');
    expect(level6SurfaceKind(92, 104, elevated)).toBe('ice');
    expect(level6SurfaceKind(95, 104, sloped)).toBe('dark');
    expect(level6SurfaceKind(99, 104, sloped)).toBe('dark');
    expect(level6SurfaceKind(104, 103, elevated)).toBe('dark');
    expect(level6SurfaceKind(102, 85, elevated)).toBe('stone');
    expect(level6SurfaceKind(102, 87, elevated)).toBe('dark');
    expect(level6SurfaceKind(100, 90, elevated)).toBe('dark');
    expect(level6SurfaceKind(86, 82, elevated)).toBe('dark');
  });
});
