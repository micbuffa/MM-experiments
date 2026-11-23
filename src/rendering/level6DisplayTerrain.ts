import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { Level6MazeCell } from '../game/modern/practiceTerrain';
import type { TerrainCell } from '../game/modern/terrainMesh';

export type Level6SurfaceKind =
  'stone' | 'amber' | 'ice' | 'peach' | 'ribbed' | 'dark';

export const level6Goal = { x: 88, z: 88, width: 4, length: 10 } as const;

export const level6Pyramids = [
  [74, 74, 16352],
  [71, 77, 16352],
  [79, 77, 16352],
  [75, 81, 16352],
] as const;

export const level6Wedges = [
  { x: 29, z: 30, width: 3, length: 3 },
  { x: 29, z: 38, width: 3, length: 3 },
] as const;

const roundHeight = (height: number) => Math.round(height * 1e9) / 1e9;
const arcadeToWorldY = (height: number) =>
  ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;

const lowerMazeFloorY = arcadeToWorldY(16316);
const upperStartY = arcadeToWorldY(16384);

/** Clean Level 6 display grid: flatten 4 pyramid bases and clip diagonal ears. */
export function level6DisplayTerrain(
  cells: readonly (readonly TerrainCell[])[],
): TerrainCell[][] {
  const display: TerrainCell[][] = cells.map((row, z) =>
    row.map((cell, x) => {
      if (!cell) return null;
      const pyramid = level6Pyramids.find(
        ([cx, cz]) => x >= cx - 1 && x < cx + 2 && z >= cz - 1 && z < cz + 2,
      );
      if (pyramid) {
        const y = arcadeToWorldY(pyramid[2]);
        return [y, y, y, y];
      }
      const [nw, ne, se] = cell;
      if (nw !== null && ne !== null && se !== null) {
        return [
          roundHeight(nw),
          roundHeight(ne),
          roundHeight(se),
          roundHeight(nw + se - ne),
        ];
      }
      return cell;
    }),
  );
  for (let z = 21; z < display.length; z++) {
    const x = z - 21;
    const cell = display[z]?.[x];
    if (cell) display[z]![x] = [cell[0], cell[1], cell[2], null];
  }
  for (let z = 0; z < display.length; z++) {
    const x = z + 21;
    const cell = display[z]?.[x];
    if (cell && cell[0] !== null && cell[2] !== null && cell[3] !== null) {
      display[z]![x] = [cell[0], null, cell[2], cell[3]];
    }
  }
  return display;
}

/** Apply one of the 4 MAME-measured disappearing-block phases onto a copy of the base grid. */
export function level6PhaseGrid(
  baseCells: readonly (readonly TerrainCell[])[],
  phaseCells: readonly Level6MazeCell[],
): TerrainCell[][] {
  const grid = baseCells.map((row) => [...row]);
  for (const { x, z, cell } of phaseCells) {
    if (grid[z] && x >= 0 && x < grid[z]!.length) {
      grid[z]![x] = cell;
    }
  }
  return grid;
}

/** Classify each Level 6 cell into its authentic arcade surface material. */
export function level6SurfaceKind(
  x: number,
  z: number,
  cell: TerrainCell,
): Level6SurfaceKind {
  if (!cell) return 'stone';
  const maxY = Math.max(
    cell[0] ?? -999,
    cell[1] ?? -999,
    cell[2] ?? -999,
    cell[3] ?? -999,
  );
  // Start pads & warm amber/gold start plateau (outside the white marble ramp)
  const inWhiteRamp =
    (x >= 20 && x <= 26 && z >= 17 && z <= 22) ||
    (x >= 22 && x <= 24 && z >= 19 && z <= 27);
  if (x >= 10 && x <= 30 && z >= 12 && z <= 27 && !inWhiteRamp) return 'amber';
  // Amber bottom inside the hollow square ring island
  if (x >= 21 && x <= 25 && z >= 30 && z <= 34 && maxY < upperStartY - 0.1)
    return 'amber';
  // Cyan ice strips on the two upper branches
  if (x >= 40 && x <= 45 && z >= 33 && z <= 35) return 'ice';
  if (x >= 40 && x <= 42 && z >= 42 && z <= 46) return 'ice';
  // Left peach amoeba plateau (acid 15 & 16)
  if (x >= 46 && x <= 67 && z >= 35 && z <= 46) return 'peach';
  // Left grey ribbed worm slope (worm 1 & 2)
  if (x >= 48 && x <= 67 && z >= 47 && z <= 54) return 'ribbed';
  // Right grey ribbed worm slope (worm 3 & 4)
  if (x >= 36 && x <= 46 && z >= 45 && z <= 69) return 'ribbed';
  // Right peach amoeba plateau (acid 13 & 14)
  if (x >= 46 && x <= 58 && z >= 55 && z <= 69) return 'peach';
  // Static stone entry platform before the final disappearing-block maze
  if (x >= 77 && x <= 82 && z >= 79 && z <= 84) return 'stone';
  // Cyan ice diamond with 4 grey pyramids
  if (x >= 68 && x <= 79 && z >= 70 && z <= 81) return 'ice';
  // Final disappearing-block maze (x >= 77, z >= 79)
  if (x >= 77 && z >= 79) {
    const elevated = maxY > lowerMazeFloorY + 0.5;
    if (!elevated) return 'stone';
    // Static entry platform & GOAL pad stay stone (GOAL decal sits on top)
    if (x <= 82 && z <= 84) return 'stone';
    if (
      x >= level6Goal.x &&
      x < level6Goal.x + level6Goal.width &&
      z >= level6Goal.z - 1 &&
      z < level6Goal.z + level6Goal.length
    )
      return 'stone';
    // Gold/amber block above GOAL & cyan ice block in lower-right maze
    if (x >= 87 && x <= 94 && z >= 81 && z <= 84) return 'amber';
    if (x >= 99 && x <= 104 && z >= 104 && z <= 109) return 'ice';
    return 'dark';
  }
  return 'stone';
}
