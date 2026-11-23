import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
  practiceCompleteOrigin,
  practiceFinishScroll,
  practiceLastSurveyedScroll,
  practiceOrigin,
} from './practiceProjection';
import { terrainCorners } from './terrainMesh';
import type { TerrainCell } from './terrainMesh';
import {
  parseIntermediatePipeGeometry,
  type IntermediatePipeGeometry,
} from './intermediatePipeGeometry';

export const MAX_TERRAIN_BYTES = 300_000;
const completeDimension = 91;
const level3Dimension = 118;
const level5Dimension = 141;
export const level5OpeningScroll = -15212;
export const level5FinishScroll = -16152;
const intermediateDimension = 130;
export const intermediateOpeningScroll = -16152;
const intermediateLastSurveyedScroll = -15846;
export const level3OpeningScroll = -16176;
// Includes the complete GOAL slab (native projected bottom 1016), with
// 32 pixels below it in the 240-pixel reference frame.
const level3LastSurveyedScroll = -15336;
export const level4OpeningScroll = -16152;
const level4LastSurveyedScroll = -15368;
const heightPerUnit = arcadeHeightScale / arcadeCellUnits;

export interface PracticeTerrain {
  readonly cells: TerrainCell[][];
  readonly origin: typeof practiceOrigin;
  readonly lastScroll: number;
  readonly level?: 'intermediate' | 'level3' | 'level4' | 'level5';
  readonly pipes?: IntermediatePipeGeometry;
}

export function parsePracticeTerrain(json: string): PracticeTerrain {
  const data: unknown = JSON.parse(json);
  if (
    !data ||
    typeof data !== 'object' ||
    !('format' in data) ||
    (data.format !== 'practice-terrain-v1' &&
      data.format !== 'practice-terrain-v2' &&
      data.format !== 'intermediate-terrain-v1' &&
      data.format !== 'level3-terrain-v1' &&
      data.format !== 'level4-terrain-v1' &&
      data.format !== 'level5-terrain-v1') ||
    !('rows' in data) ||
    !Array.isArray(data.rows) ||
    data.rows.length < 1 ||
    data.rows.length > level5Dimension
  )
    throw new Error('Grille Practice Race invalide.');
  const width: unknown = Array.isArray(data.rows[0])
    ? data.rows[0].length
    : null;
  const complete = data.format === 'practice-terrain-v2';
  const intermediate = data.format === 'intermediate-terrain-v1';
  const level3 = data.format === 'level3-terrain-v1';
  const level4 = data.format === 'level4-terrain-v1';
  const level5 = data.format === 'level5-terrain-v1';
  const exactDimension = level5
    ? level5Dimension
    : intermediate || level4
      ? intermediateDimension
      : level3
        ? level3Dimension
        : complete
          ? completeDimension
          : undefined;
  if (
    typeof width !== 'number' ||
    width < 1 ||
    (exactDimension
      ? width !== exactDimension || data.rows.length !== exactDimension
      : width > 40 || data.rows.length > 40)
  )
    throw new Error('Largeur de grille invalide.');
  const rows = data.rows.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== width)
      throw new Error('La grille doit être rectangulaire.');
    return row.map((cell: unknown): SurveyCell => {
      if (!Array.isArray(cell) || cell.length !== 4)
        throw new Error('Quatre hauteurs sont attendues par cellule.');
      const heights = cell.map((value: unknown) => {
        if (
          typeof value !== 'number' ||
          !Number.isInteger(value) ||
          (value !== 0 &&
            Math.abs(value - arcadeGroundHeight) >
              (intermediate || level3 || level4 || level5 ? 0x200 : 0x100))
        )
          throw new Error('Hauteur arcade invalide.');
        return value === 0
          ? null
          : (value - arcadeGroundHeight) * heightPerUnit;
      });
      const [a, b, c, d] = heights;
      return [a ?? null, b ?? null, c ?? null, d ?? null];
    });
  });
  const pipes =
    (intermediate || level3 || level4 || level5) && 'pipes' in data
      ? parseIntermediatePipeGeometry(data.pipes)
      : undefined;
  return {
    cells: joinFineSteps(rows),
    origin:
      complete || intermediate || level3 || level4 || level5
        ? practiceCompleteOrigin
        : practiceOrigin,
    lastScroll: level5
      ? level5FinishScroll
      : intermediate
        ? intermediateLastSurveyedScroll
        : level3
          ? level3LastSurveyedScroll
          : level4
            ? level4LastSurveyedScroll
            : complete
              ? practiceFinishScroll
              : practiceLastSurveyedScroll,
    ...(level5
      ? { level: 'level5' as const }
      : intermediate
        ? { level: 'intermediate' as const }
        : level3
          ? { level: 'level3' as const }
          : level4
            ? { level: 'level4' as const }
            : {}),
    ...(pipes ? { pipes } : {}),
  };
}

// Close sub-tile seams of one arcade height step in the presentation mesh.
type SurveyCell = Exclude<TerrainCell, null>;

function joinFineSteps(
  rows: readonly (readonly SurveyCell[])[],
): TerrainCell[][] {
  const shared = new Map<string, number[]>();
  const keyAt = (x: number, z: number, corner: number) => {
    const [dx, dz] = terrainCorners[corner]!;
    return `${x + dx},${z + dz}`;
  };
  for (const [z, row] of rows.entries()) {
    for (const [x, cell] of row.entries()) {
      for (const [corner, height] of cell.entries()) {
        if (height === null) continue;
        const key = keyAt(x, z, corner);
        const heights = shared.get(key) ?? [];
        heights.push(height);
        shared.set(key, heights);
      }
    }
  }
  return rows.map((row, z) =>
    row.map((cell, x) => {
      const [a, b, c, d] = cell.map((height, corner) => {
        if (height === null) return null;
        const heights = shared.get(keyAt(x, z, corner))!;
        const spread = Math.max(...heights) - Math.min(...heights);
        if (Math.round(spread / heightPerUnit) > 2) return height;
        return (
          heights.reduce((total, value) => total + value, 0) / heights.length
        );
      });
      return [a ?? null, b ?? null, c ?? null, d ?? null];
    }),
  );
}
