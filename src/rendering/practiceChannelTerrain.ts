import { practiceFinishScroll } from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainCorners, type TerrainCell } from '../game/modern/terrainMesh';

const surveyDiagonal = 21;

export const practiceChannelSpikes = [
  [45, 32],
  [32, 45],
] as const;

const channelRims = [
  [31, 47, 51],
  [33, 43, 47],
  [46, 32, 34],
  [48, 56, 63],
  [50, 29, 32],
  [50, 63, 66],
  [51, 37, 45],
  [57, 45, 59],
  [57, 66, 72],
  [61, 72, 75],
  [67, 59, 75],
  [67, 77, 80],
  [72, 63, 77],
  [82, 62, 63],
] as const;

const channelSections = [
  [39, 53, 44, 49],
  [49, 53, 49, 54],
  [49, 63, 54, 58],
  [59, 63, 58, 64],
  [59, 80, 64, 68],
] as const;

function channelVertex(x: number, z: number) {
  return channelSections.some(
    ([left, right, top, bottom]) =>
      x >= left && x <= right && z >= top && z <= bottom,
  );
}

/** Continue the exposed cliffs below the arcade framing near the finish. */
export function extendPracticeDescentCliffs(
  positions: number[],
  base: number,
  xOrigin: number,
  zOrigin: number,
) {
  for (let face = 0; face < positions.length; face += 12) {
    if (positions[face + 7] !== base || positions[face + 10] !== base) continue;
    for (const vertex of [face + 6, face + 9]) {
      const along =
        positions[vertex]! + xOrigin + positions[vertex + 2]! + zOrigin;
      positions[vertex + 1] =
        base - Math.min(7, Math.max(0, (along - 105) / 3));
    }
  }
}

/** Use one height at each channel vertex and restore the straight paved rim. */
export function practiceChannelTerrain({
  cells,
  origin,
  lastScroll,
}: PracticeTerrain) {
  const complete = lastScroll === practiceFinishScroll;
  const width = cells[0]!.length;
  const shared = new Map<number, { sum: number; count: number }>();
  const keyAt = (x: number, z: number) => z * (width + 1) + x;
  for (const [z, row] of cells.entries()) {
    for (const [x, cell] of row.entries()) {
      if (!cell || cell.filter((height) => height !== null).length < 3)
        continue;
      for (const [index, [dx, dz]] of terrainCorners.entries()) {
        const height = cell[index];
        if (
          height == null ||
          !channelVertex(x + dx + origin.x, z + dz + origin.z)
        )
          continue;
        const key = keyAt(x + dx, z + dz);
        const sample = shared.get(key) ?? { sum: 0, count: 0 };
        sample.sum += height;
        sample.count++;
        shared.set(key, sample);
      }
    }
  }
  return cells.map((row, z) =>
    row.map((cell, x): TerrainCell => {
      if (!cell) return cell;
      const wx = x + origin.x;
      const wz = z + origin.z;
      const [nw, ne, se, sw] = cell;
      const straight = channelRims.some(
        ([line, start, end]) => wz === line && wx >= start && wx < end,
      );
      const corners =
        straight && nw !== null && ne !== null && se !== null && sw === null
          ? ([nw, ne, se, nw + se - ne] as const)
          : cell;

      const nearSpike = practiceChannelSpikes.some(
        ([sx, sz]) => wx >= sx - 2 && wx <= sx && wz >= sz - 1 && wz <= sz,
      );
      if (nearSpike && corners.every((height) => height !== null)) {
        const floor = Math.min(
          ...corners.filter((height): height is number => height !== null),
        );
        return [floor, floor, floor, floor];
      }
      const [a, b, c, d] = terrainCorners.map(([dx, dz], index) => {
        const height = corners[index];
        const sample = shared.get(keyAt(x + dx, z + dz));
        return height != null && sample
          ? sample.sum / sample.count
          : (height ?? null);
      });
      // Clip the outer corner on the complete survey boundary diagonals to avoid sawtooth edges.
      if (complete && wx - wz === surveyDiagonal)
        return [a ?? null, null, c ?? null, d ?? null];
      if (complete && wz - wx === surveyDiagonal)
        return [a ?? null, b ?? null, c ?? null, null];
      return [a ?? null, b ?? null, c ?? null, d ?? null];
    }),
  );
}
