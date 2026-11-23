import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import { iceBasinHeight } from '../game/modern/iceBasin';
import type { TerrainCell } from '../game/modern/terrainMesh';

const wells = [
  [14, 17, 16382],
  [24, 17, 16382],
  [9, 25, 16366],
  [19, 25, 16366],
  [29, 25, 16366],
] as const;
const straightRims = [
  [22, 6, 9],
  [22, 35, 41],
  [36, 15, 23],
  [55, 34, 60],
  [64, 74, 76],
  [71, 65, 74],
  [71, 76, 85],
  [74, 62, 64],
  [77, 77, 79],
  [78, 65, 69],
  [80, 69, 77],
  [83, 63, 65],
  [86, 79, 82],
  [86, 85, 88],
  [98, 106, 109],
  [106, 86, 110],
  [118, 110, 114],
] as const;
const verticalRims = [
  [60, 56, 59],
  [65, 57, 60],
] as const;
const surveyDiagonal = 21;

// Top-left cells of the isolated two-by-two platforms around the ramps.
const platformOrigins = [
  [38, 26],
  [42, 26],
  [38, 30],
  [42, 30],
  [26, 40],
  [30, 40],
  [26, 44],
  [30, 44],
  [59, 42],
  [63, 42],
  [59, 46],
  [63, 46],
  [40, 58],
  [44, 58],
  [48, 58],
  [52, 58],
] as const;

export function intermediatePlatformCell(
  cells: readonly (readonly TerrainCell[])[],
  x: number,
  z: number,
) {
  const origin = platformOrigins.find(
    ([left, back]) => x >= left && x < left + 2 && z >= back && z < back + 2,
  );
  if (!origin) return undefined;
  const [left, back] = origin;
  const top = cells[back]?.[left]?.[0];
  if (top == null) return undefined;
  // The survey leaves partial corners on the front edge and crops one column
  // at the edge of the arcade viewport. All four cap tiles share one height.
  return [top, top, top, top] as const;
}

function worldHeight(height: number) {
  return ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
}

/** Carry the measured longitudinal wave profile across the paved lanes. */
export function intermediateWaveCell(
  cell: TerrainCell,
  x: number,
  z: number,
): TerrainCell {
  if (!cell || x < 64 || x > 81 || z < 75 || z > 80) return cell;
  const [nw, ne, se, sw] = cell;
  if (nw !== null && ne !== null && se !== null && sw !== null)
    return [nw, ne, ne, nw];
  return cell;
}

/** The collision survey samples through some raised rims on a diagonal. */
export function intermediateRimCell(
  cell: TerrainCell,
  x: number,
  z: number,
): TerrainCell {
  if (!cell) return cell;
  const [nw, ne, se, sw] = cell;
  // The survey keeps cells by their origin. Clip the outer corner to keep
  // the exposed edge on the same diagonal at the top and bottom of the cliff.
  if (x - z === surveyDiagonal) return [nw, null, se, sw];
  if (z - x === surveyDiagonal) return [nw, ne, se, null];
  if (z === 71 && x >= 62 && x <= 64 && nw !== null && nw === ne && nw === se)
    return [nw, nw, nw, nw];
  // The survey picked up a corner of the other level at these two ledges.
  if (
    x === 64 &&
    (z === 74 || z === 78) &&
    nw !== null &&
    nw === ne &&
    nw === se
  )
    return [nw, nw, nw, nw];
  const well = wells.find(
    ([left, back]) =>
      x >= left && x < left + 6 && z >= back - 1 && z < back + 4,
  );
  if (well) {
    const [left, back, height] = well;
    if (
      z >= back &&
      (z === back || z === back + 3 || x === left || x === left + 5)
    ) {
      const h = worldHeight(height);
      return [h, h, h, h];
    }
    const top = worldHeight(16410 - 2 * z);
    const bottom = worldHeight(16410 - 2 * (z + 1));
    return [top, top, bottom, bottom];
  }
  if (
    z === 33 &&
    x >= 23 &&
    x <= 34 &&
    nw !== null &&
    ne !== null &&
    se !== null
  ) {
    // The upper platform ends on the straight line above the lower bridge.
    return [nw, ne, se, nw];
  }
  const straight = straightRims.some(
    ([row, start, end]) => z === row && x >= start && x < end,
  );
  if (straight && nw !== null && ne !== null && se !== null && sw === null)
    return [nw, ne, se, nw + (se - ne)];
  const vertical = verticalRims.some(
    ([column, start, end]) => x === column && z >= start && z < end,
  );
  if (vertical && nw === null && ne !== null && se !== null && sw !== null)
    return [ne + (sw - se), ne, se, sw];
  return cell;
}

/** The finish bowl and its approach share one height at each paved vertex. */
export function intermediateFinishCell(
  cell: TerrainCell,
  cells: readonly (readonly TerrainCell[])[],
  x: number,
  z: number,
): TerrainCell {
  if (!cell || x < 89 || x > 109 || z < 95 || z > 106) return cell;
  const [nw, ne, se, sw] = cell;
  const basinCenter = cells[101]?.[99]?.[0];
  if (
    basinCenter != null &&
    Math.abs(basinCenter - worldHeight(16097)) < 0.15 &&
    x >= 93 &&
    x <= 105 &&
    z >= 95 &&
    z <= 106
  ) {
    const at = (dx: number, dz: number, h: number | null) =>
      h === null ? null : worldHeight(iceBasinHeight(x + dx, z + dz));
    return [at(0, 0, nw), at(1, 0, ne), at(1, 1, se), at(0, 1, sw)];
  }
  const at = (a: number, b: number, fallback: number | null) =>
    fallback === null
      ? null
      : (cells[b]?.[a]?.[0] ?? cells[b - 1]?.[a - 1]?.[2] ?? fallback);
  return [nw, at(x + 1, z, ne), at(x + 1, z + 1, se), at(x, z + 1, sw)];
}
