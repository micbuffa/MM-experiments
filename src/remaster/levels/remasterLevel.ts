import {
  arcadeCellUnits,
  arcadeGroundHeight,
  practiceWorldPoint,
} from '../../game/modern/practiceProjection';
import type { PracticeTerrain } from '../../game/modern/practiceTerrain';
import type { TerrainCell } from '../../game/modern/terrainMesh';

export type RemasterSurfaceKind =
  'stone' | 'ice' | 'acid' | 'goal' | 'wave' | 'booster';

export interface Vec3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface HeightLayer {
  readonly id: string;
  readonly columns: number;
  readonly rows: number;
  readonly origin: { readonly x: number; readonly z: number };
  readonly cells: readonly (readonly TerrainCell[])[];
  readonly defaultSurface: RemasterSurfaceKind;
}

/**
 * Free-form 3D volume for multi-tier Hamsterball-style geometry
 * (overpasses, bridges, half-pipes, ramps, moving platforms, boosters).
 */
export interface LevelVolume {
  readonly id: string;
  readonly shape: 'box' | 'ramp' | 'cylinder';
  readonly position: Vec3;
  readonly size: Vec3;
  readonly rotation?: Vec3;
  readonly surface: RemasterSurfaceKind;
  readonly kinematic?: boolean;
}

export interface GoalZone {
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly y: number;
}

export interface RemasterLevelV1 {
  readonly format: 'remaster-level-v1';
  readonly id: string;
  readonly name: string;
  readonly courseIndex: number;
  readonly timerSeconds: number;
  readonly direction: 1 | -1;
  readonly heightLayers: readonly HeightLayer[];
  readonly volumes: readonly LevelVolume[];
  readonly spawns: {
    readonly player1: Vec3;
    readonly player2: Vec3;
  };
  readonly goal: GoalZone;
  readonly killY: number;
}

/** Bilinear ground height sample on a height layer, or null over a void. */
export function sampleLayerHeight(
  layer: HeightLayer,
  worldX: number,
  worldZ: number,
): number | null {
  const gx = worldX + layer.columns / 2;
  const gz = worldZ + layer.rows / 2;
  const cx = Math.floor(gx);
  const cz = Math.floor(gz);
  const cell = layer.cells[cz]?.[cx];
  if (!cell) return null;
  const [nw, ne, se, sw] = cell;
  if (nw === null || ne === null || se === null || sw === null) {
    let sum = 0;
    let count = 0;
    for (const h of cell) {
      if (h !== null) {
        sum += h;
        count++;
      }
    }
    return count >= 3 ? sum / count : null;
  }
  const u = gx - cx;
  const v = gz - cz;
  return (
    nw * (1 - u) * (1 - v) + ne * u * (1 - v) + se * u * v + sw * (1 - u) * v
  );
}

export function isInsideGoal(goal: GoalZone, x: number, z: number): boolean {
  return x >= goal.minX && x <= goal.maxX && z >= goal.minZ && z <= goal.maxZ;
}

/**
 * Convert an existing PracticeTerrain (e.g. Level 1 Practice Race) into
 * the hybrid RemasterLevelV1 format.
 */
export function practiceTerrainToRemasterLevel(
  terrain: PracticeTerrain,
): RemasterLevelV1 {
  const rows = terrain.cells.length;
  const columns = terrain.cells[0]?.length ?? 0;
  const p1 = practiceWorldPoint(
    140,
    140,
    arcadeGroundHeight,
    columns,
    rows,
    terrain.origin,
  ) ?? { x: -28, y: 0, z: -28 };
  const p2 = practiceWorldPoint(
    156,
    124,
    arcadeGroundHeight,
    columns,
    rows,
    terrain.origin,
  ) ?? { x: p1.x + 2, y: p1.y, z: p1.z - 2 };

  // Practice Race GOAL banner spans cells x = 72..80, z = 64..68 (matches createTerrainStudy.ts).
  const goalMin = practiceWorldPoint(
    72 * arcadeCellUnits,
    64 * arcadeCellUnits,
    16348,
    columns,
    rows,
    terrain.origin,
  ) ?? { x: 26.5, y: -3.67, z: 18.5 };
  const goalMax = practiceWorldPoint(
    80 * arcadeCellUnits,
    68 * arcadeCellUnits,
    16348,
    columns,
    rows,
    terrain.origin,
  ) ?? { x: 34.5, y: -3.67, z: 22.5 };

  let minHeight = Infinity;
  for (const row of terrain.cells) {
    for (const cell of row) {
      if (!cell) continue;
      for (const h of cell) {
        if (h !== null && h < minHeight) minHeight = h;
      }
    }
  }
  const killY = (Number.isFinite(minHeight) ? minHeight : -5) - 6;

  return {
    format: 'remaster-level-v1',
    id: terrain.level ?? 'practice',
    name: terrain.level ? terrain.level : 'Practice Race',
    courseIndex: 1,
    timerSeconds: 60,
    direction: terrain.level === 'level5' ? -1 : 1,
    heightLayers: [
      {
        id: 'main-terrain',
        columns,
        rows,
        origin: terrain.origin,
        cells: terrain.cells,
        defaultSurface: 'stone',
      },
    ],
    volumes: [],
    spawns: {
      player1: p1,
      player2: p2,
    },
    goal: {
      minX: Math.min(goalMin.x, goalMax.x),
      maxX: Math.max(goalMin.x, goalMax.x),
      minZ: Math.min(goalMin.z, goalMax.z),
      maxZ: Math.max(goalMin.z, goalMax.z),
      y: goalMin.y,
    },
    killY,
  };
}
