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
  { x: 29, z: 31, width: 3, length: 2 },
  { x: 29, z: 39, width: 3, length: 2 },
] as const;

/** Outer cliff edges in the upper floating section (start pads, plateau, square pit, both wedge branches + cyan ice strips) are 1-block-thick slabs suspended in space, before deep cliffs begin at the amoeba/worm plateaus. */
export function isLevel6FloatingSlabEdge(
  cellX: number,
  cellZ: number,
): boolean {
  return cellX < 45.95 && cellZ < 45.95 && !(cellX < 38.05 && cellZ > 43.95);
}

const roundHeight = (height: number) => Math.round(height * 1e9) / 1e9;
const arcadeToWorldY = (height: number) =>
  ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;

const lowerMazeFloorY = arcadeToWorldY(16316);
const upperStartY = arcadeToWorldY(16384);
const walkwayBaseY = arcadeToWorldY(16352);

/** Continuous vertex height for the 6x5 start mound (x=20..25, z=17..21) so adjacent cells share exact corners (zero red facets). */
function startMoundVertexY(vx: number, vz: number): number {
  if (vx >= 22 && vx <= 24 && vz >= 19 && vz <= 22)
    return roundHeight(arcadeToWorldY(16396));
  if (vx >= 21 && vx <= 25 && vz >= 18 && vz <= 21)
    return roundHeight(arcadeToWorldY(16386));
  return roundHeight(upperStartY);
}

/** Exact 3-face arcade bump on the left narrow walkway (x=67..68, z=59..62): peak (67,61,+8) + 4 planar shoulder vertices at +4. */
function leftWalkwayBumpVertexY(vx: number, vz: number): number {
  if (vx === 67 && vz === 61) return roundHeight(arcadeToWorldY(16360));
  if (
    (vx === 67 && (vz === 60 || vz === 62)) ||
    (vx === 68 && (vz === 61 || vz === 62))
  ) {
    return roundHeight(arcadeToWorldY(16356));
  }
  return roundHeight(walkwayBaseY);
}

/** Exact 3-face arcade dip on the right narrow walkway (x=59..62, z=69..70): trough (61,71,-8) + 4 planar shoulder vertices at -4. */
function rightWalkwayDipVertexY(vx: number, vz: number): number {
  if (vx === 61 && vz === 71) return roundHeight(arcadeToWorldY(16344));
  if (
    (vz === 71 && (vx === 60 || vx === 62)) ||
    (vz === 70 && (vx === 60 || vx === 61))
  ) {
    return roundHeight(arcadeToWorldY(16348));
  }
  return roundHeight(walkwayBaseY);
}

/** Clean Level 6 display grid: smooth start mound, flatten 4 pyramid bases, and clip diagonal ears. */
export function level6DisplayTerrain(
  cells: readonly (readonly TerrainCell[])[],
): TerrainCell[][] {
  const display: TerrainCell[][] = cells.map((row, z) =>
    row.map((cell, x) => {
      if (!cell || Math.abs(x - z) > 21) return null;
      // Smooth 6x5 start mound (x=20..25, z=17..21): shared vertex heights eliminate triangular cliff artifacts.
      if (x >= 20 && x <= 25 && z >= 17 && z <= 21) {
        return [
          startMoundVertexY(x, z),
          startMoundVertexY(x + 1, z),
          startMoundVertexY(x + 1, z + 1),
          startMoundVertexY(x, z + 1),
        ];
      }
      // Hollow square pit island (x=20..25, z=29..34): crisp grey outer rim (0),
      // sunken 1-cell grey stone ledge (-4), and clean 2x2 central pit (x=22..23, z=31..32).
      if (x >= 20 && x <= 25 && z >= 29 && z <= 34) {
        if (x >= 22 && x <= 23 && z >= 31 && z <= 32) return null;
        if (x >= 21 && x <= 24 && z >= 30 && z <= 33) {
          const yLedge = roundHeight(arcadeToWorldY(16380));
          return [yLedge, yLedge, yLedge, yLedge];
        }
        const yRim = roundHeight(upperStartY);
        return [yRim, yRim, yRim, yRim];
      }
      // Keep the floor flat under the two open-mouthed yellow wedge tunnels so no red cliff sliver pokes inside.
      if (
        x >= 29 &&
        x <= 32 &&
        ((z >= 30 && z <= 32) || (z >= 38 && z <= 40))
      ) {
        const yFlat = roundHeight(upperStartY);
        return [yFlat, yFlat, yFlat, yFlat];
      }
      // Exact 3-face bump on the left narrow walkway (x=67..68, z=59..62)
      if (x >= 67 && x <= 68 && z >= 59 && z <= 62) {
        return [
          leftWalkwayBumpVertexY(x, z),
          leftWalkwayBumpVertexY(x + 1, z),
          leftWalkwayBumpVertexY(x + 1, z + 1),
          leftWalkwayBumpVertexY(x, z + 1),
        ];
      }
      // Exact 3-face dip on the right narrow walkway (x=59..62, z=69..70)
      if (x >= 59 && x <= 62 && z >= 69 && z <= 70) {
        return [
          rightWalkwayDipVertexY(x, z),
          rightWalkwayDipVertexY(x + 1, z),
          rightWalkwayDipVertexY(x + 1, z + 1),
          rightWalkwayDipVertexY(x, z + 1),
        ];
      }
      const pyramid =
        x >= 68 && x <= 79 && z >= 70 && z <= 81
          ? level6Pyramids.find(
              ([cx, cz]) => x >= cx - 1 && x <= cx && z >= cz - 1 && z <= cz,
            )
          : undefined;
      if (pyramid) {
        const y = arcadeToWorldY(pyramid[2]);
        return [y, y, y, y];
      }
      const [nw, ne, se, sw] = cell;
      if (nw !== null && ne !== null && se !== null) {
        const planarSw = nw + se - ne;
        const maxCorner = Math.max(nw, ne, se);
        const safeSw =
          sw !== null && planarSw > maxCorner + 0.5 ? sw : planarSw;
        return [
          roundHeight(nw),
          roundHeight(ne),
          roundHeight(se),
          roundHeight(safeSw),
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
  const minY = Math.min(
    cell[0] ?? 999,
    cell[1] ?? 999,
    cell[2] ?? 999,
    cell[3] ?? 999,
  );
  // Start pads & warm amber/gold start plateau (outside the exact 6x5 white mound & 2-cell ridge)
  const inWhiteRamp =
    (x >= 20 && x <= 25 && z >= 17 && z <= 21) ||
    (x >= 22 && x <= 23 && z >= 22 && z <= 26);
  if (x >= 10 && x <= 30 && z >= 12 && z <= 27 && !inWhiteRamp) return 'amber';
  // Cyan ice strips on the two upper branches (4 cells each: x=42..45 on left, z=42..45 on right)
  if (x >= 42 && x <= 45 && z >= 33 && z <= 34) return 'ice';
  if (x >= 40 && x <= 41 && z >= 42 && z <= 45) return 'ice';
  // Inclined stone chutes connecting the upper amoeba/worm levels (z=43..61)
  if (x >= 36 && x <= 67 && z >= 43 && z <= 61 && maxY - minY > 0.15) {
    return 'stone';
  }
  // Left peach amoeba plateau (acid 15 & 16, including its 2x2 neck x=46..47, z=33..34 meeting the left ice strip)
  if (
    ((x >= 46 && x <= 67 && z >= 35 && z <= 46) ||
      (x >= 46 && x <= 47 && z >= 33 && z <= 34)) &&
    maxY > -0.5
  ) {
    return 'peach';
  }
  // Left grey ribbed worm slope (worm 1 & 2, stopping at x<=66 so the 2-wide grey walkway x=67..68 stays stone)
  if (x >= 48 && x <= 66 && z >= 45 && z <= 53) return 'ribbed';
  // Right grey ribbed worm slope (worm 3 & 4; stops at x<=45 so x=46 belongs to the lower peach amoeba plateau)
  if (x >= 36 && x <= 45 && z >= 45 && z <= 69) return 'ribbed';
  // Right peach amoeba plateau (acid 13 & 14; stops at z=68 so the 2-wide right walkway z=69..70 stays grey stone)
  if (x >= 46 && x <= 58 && z >= 55 && z <= 68) return 'peach';
  // Static stone entry platform before the final disappearing-block maze
  if (x >= 77 && x <= 82 && z >= 79 && z <= 84) return 'stone';
  // Cyan ice diamond with 4 grey pyramids (11x11: leaves 2-cell grey stone borders at x=67..68 and z=69..70)
  if (x >= 69 && x <= 79 && z >= 71 && z <= 81) return 'ice';
  // Final disappearing-block maze (x >= 77, z >= 79)
  if (x >= 77 && z >= 79) {
    const elevated = maxY > lowerMazeFloorY + 0.5;
    if (!elevated) return 'stone';
    // Static entry platform, far-left upper maze cap (x=99..103, z=81..86), and GOAL pad stay grey stone.
    if (x <= 82 && z <= 84) return 'stone';
    if (x >= 99 && x <= 103 && z >= 81 && z <= 86) return 'stone';
    if (
      x >= level6Goal.x &&
      x < level6Goal.x + level6Goal.width &&
      z >= level6Goal.z - 1 &&
      z < level6Goal.z + level6Goal.length
    )
      return 'stone';
    // 4x2 shimmering yellow-peach cap & bridge under the GOAL flags (x=84..87, z=88..89, Playfield Bank 3 indices 56..63)
    if (x >= 84 && x <= 87 && z >= 88 && z <= 89) return 'peach';
    // Strip behind-right of GOAL (x=84..85, z=90..104): amber -> cyan ice -> amber -> ribbed
    if (x >= 84 && x <= 85 && z >= 90 && z <= 104) {
      if (z <= 92) return 'amber';
      if (z <= 95) return 'ice';
      if (z <= 98) return 'amber';
      return 'ribbed';
    }
    // Flat cyan ice block at the bottom-right of the maze (x=88..93, z=104..106)
    if (x >= 88 && x <= 93 && z >= 104 && z <= 106) return 'ice';
    // Grey stone block bordering the top-right of the cyan ice (x=86..89, z=101..105)
    if (x >= 86 && x <= 89 && z >= 101 && z <= 105) return 'stone';
    // Flat grey stone landing at the bottom-left of the maze (both gable ramps x=94..101 stay dark charcoal)
    if (x >= 102 && x <= 106 && z >= 104 && z <= 109) return 'stone';
    return 'dark';
  }
  return 'stone';
}
