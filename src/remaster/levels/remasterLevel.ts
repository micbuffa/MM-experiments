import {
  arcadeCellUnits,
  arcadeGroundHeight,
  practiceWorldPoint,
} from '../../game/modern/practiceProjection';
import type { PracticeTerrain } from '../../game/modern/practiceTerrain';
import type { TerrainCell } from '../../game/modern/terrainMesh';
import {
  intermediateGoal,
  intermediateIce,
} from '../../rendering/intermediateFinish';
import { level3Goal, waveRegion } from '../../rendering/createLevel3Materials';
import { level4Goal } from '../../rendering/createLevel4Materials';
import { level5Goal } from '../../rendering/level5DisplayTerrain';
import { LEVEL3_SPAWNS } from '../level3/level3RomData';
import {
  LEVEL4_BLACK_MARBLE_SPAWN,
  LEVEL4_SPAWNS,
} from '../level4/level4RomData';
import { LEVEL5_SPAWNS } from '../level5/level5RomData';

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

export interface SurfaceZone {
  readonly id: string;
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
  readonly surface: RemasterSurfaceKind;
}

export interface EnemySpawn {
  readonly id: string;
  readonly kind: 'blackMarble';
  readonly position: Vec3;
  readonly patrolRadius: number;
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
  readonly surfaceZones: readonly SurfaceZone[];
  readonly enemies: readonly EnemySpawn[];
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

export function sampleSurfaceAt(
  level: RemasterLevelV1,
  x: number,
  z: number,
): RemasterSurfaceKind {
  for (const zone of level.surfaceZones) {
    if (x >= zone.minX && x <= zone.maxX && z >= zone.minZ && z <= zone.maxZ) {
      return zone.surface;
    }
  }
  return level.heightLayers[0]?.defaultSurface ?? 'stone';
}

/**
 * Convert an existing PracticeTerrain (Level 1 Practice Race or Level 2 Beginner Race)
 * into the hybrid RemasterLevelV1 format.
 */
export function practiceTerrainToRemasterLevel(
  terrain: PracticeTerrain,
): RemasterLevelV1 {
  const rows = terrain.cells.length;
  const columns = terrain.cells[0]?.length ?? 0;
  const isLevel2 = terrain.level === 'intermediate';
  const isLevel3 = terrain.level === 'level3';
  const isLevel4 = terrain.level === 'level4';
  const isLevel5 = terrain.level === 'level5';

  const p1 = isLevel5
    ? (practiceWorldPoint(
        LEVEL5_SPAWNS.player1Cell.x * arcadeCellUnits,
        LEVEL5_SPAWNS.player1Cell.z * arcadeCellUnits,
        LEVEL5_SPAWNS.player1Cell.height,
        columns,
        rows,
        terrain.origin,
      ) ?? { x: 55, y: -22, z: 54 })
    : isLevel4
      ? (practiceWorldPoint(
          LEVEL4_SPAWNS.player1Cell.x * arcadeCellUnits,
          LEVEL4_SPAWNS.player1Cell.z * arcadeCellUnits,
          LEVEL4_SPAWNS.player1Cell.height,
          columns,
          rows,
          terrain.origin,
        ) ?? { x: -54.5, y: 0, z: -41.5 })
      : isLevel3
        ? (practiceWorldPoint(
            LEVEL3_SPAWNS.player1Cell.x * arcadeCellUnits,
            LEVEL3_SPAWNS.player1Cell.z * arcadeCellUnits,
            LEVEL3_SPAWNS.player1Cell.height,
            columns,
            rows,
            terrain.origin,
          ) ?? { x: -36.5, y: 2.45, z: -49.5 })
        : isLevel2
          ? (practiceWorldPoint(
              17.5 * arcadeCellUnits,
              14 * arcadeCellUnits,
              16378,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: -47.5, y: 0, z: -51 })
          : (practiceWorldPoint(
              140,
              140,
              arcadeGroundHeight,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: -28, y: 0, z: -28 });
  const p2 = isLevel5
    ? (practiceWorldPoint(
        LEVEL5_SPAWNS.player2Cell.x * arcadeCellUnits,
        LEVEL5_SPAWNS.player2Cell.z * arcadeCellUnits,
        LEVEL5_SPAWNS.player2Cell.height,
        columns,
        rows,
        terrain.origin,
      ) ?? { x: 53, y: -22, z: 56 })
    : isLevel4
      ? (practiceWorldPoint(
          LEVEL4_SPAWNS.player2Cell.x * arcadeCellUnits,
          LEVEL4_SPAWNS.player2Cell.z * arcadeCellUnits,
          LEVEL4_SPAWNS.player2Cell.height,
          columns,
          rows,
          terrain.origin,
        ) ?? { x: -42.5, y: 0, z: -55.5 })
      : isLevel3
        ? (practiceWorldPoint(
            LEVEL3_SPAWNS.player2Cell.x * arcadeCellUnits,
            LEVEL3_SPAWNS.player2Cell.z * arcadeCellUnits,
            LEVEL3_SPAWNS.player2Cell.height,
            columns,
            rows,
            terrain.origin,
          ) ?? { x: -50.5, y: 2.45, z: -35.5 })
        : isLevel2
          ? (practiceWorldPoint(
              27.5 * arcadeCellUnits,
              14 * arcadeCellUnits,
              16378,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: p1.x + 10, y: p1.y, z: p1.z })
          : (practiceWorldPoint(
              156,
              124,
              arcadeGroundHeight,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: p1.x + 2, y: p1.y, z: p1.z - 2 });

  const goalMin = isLevel5
    ? (practiceWorldPoint(
        level5Goal.x * arcadeCellUnits,
        level5Goal.z * arcadeCellUnits,
        16416,
        columns,
        rows,
        terrain.origin,
      ) ?? { x: -45.5, y: 3.2, z: -46.5 })
    : isLevel4
      ? (practiceWorldPoint(
          level4Goal.x * arcadeCellUnits,
          level4Goal.z * arcadeCellUnits,
          16228,
          columns,
          rows,
          terrain.origin,
        ) ?? { x: 48, y: -15.9, z: 39 })
      : isLevel3
        ? (practiceWorldPoint(
            level3Goal.x * arcadeCellUnits,
            level3Goal.z * arcadeCellUnits,
            16100,
            columns,
            rows,
            terrain.origin,
          ) ?? { x: 33, y: -29, z: 42 })
        : isLevel2
          ? (practiceWorldPoint(
              intermediateGoal.x * arcadeCellUnits,
              intermediateGoal.z * arcadeCellUnits,
              arcadeGroundHeight,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: 45, y: 0, z: 44 })
          : (practiceWorldPoint(
              72 * arcadeCellUnits,
              64 * arcadeCellUnits,
              16348,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: 26.5, y: -3.67, z: 18.5 });
  const goalMax = isLevel5
    ? (practiceWorldPoint(
        (level5Goal.x + level5Goal.width) * arcadeCellUnits,
        (level5Goal.z + level5Goal.length) * arcadeCellUnits,
        16416,
        columns,
        rows,
        terrain.origin,
      ) ?? { x: -41.5, y: 3.2, z: -36.5 })
    : isLevel4
      ? (practiceWorldPoint(
          (level4Goal.x + level4Goal.width) * arcadeCellUnits,
          (level4Goal.z + level4Goal.length) * arcadeCellUnits,
          16228,
          columns,
          rows,
          terrain.origin,
        ) ?? { x: 52, y: -15.9, z: 49 })
      : isLevel3
        ? (practiceWorldPoint(
            (level3Goal.x + level3Goal.width) * arcadeCellUnits,
            (level3Goal.z + level3Goal.length) * arcadeCellUnits,
            16100,
            columns,
            rows,
            terrain.origin,
          ) ?? { x: 37, y: -29, z: 52 })
        : isLevel2
          ? (practiceWorldPoint(
              (intermediateGoal.x + intermediateGoal.width) * arcadeCellUnits,
              (intermediateGoal.z + intermediateGoal.length) * arcadeCellUnits,
              arcadeGroundHeight,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: 49, y: 0, z: 54 })
          : (practiceWorldPoint(
              80 * arcadeCellUnits,
              68 * arcadeCellUnits,
              16348,
              columns,
              rows,
              terrain.origin,
            ) ?? { x: 34.5, y: -3.67, z: 22.5 });

  const surfaceZones: SurfaceZone[] = [];
  const enemies: EnemySpawn[] = [];
  const volumes: LevelVolume[] = [];
  if (isLevel2) {
    const iceMin = practiceWorldPoint(
      intermediateIce.x * arcadeCellUnits,
      intermediateIce.z * arcadeCellUnits,
      arcadeGroundHeight,
      columns,
      rows,
      terrain.origin,
    );
    const iceMax = practiceWorldPoint(
      (intermediateIce.x + intermediateIce.width) * arcadeCellUnits,
      (intermediateIce.z + intermediateIce.length) * arcadeCellUnits,
      arcadeGroundHeight,
      columns,
      rows,
      terrain.origin,
    );
    if (iceMin && iceMax) {
      surfaceZones.push({
        id: 'level2-ice-basin',
        minX: Math.min(iceMin.x, iceMax.x),
        maxX: Math.max(iceMin.x, iceMax.x),
        minZ: Math.min(iceMin.z, iceMax.z),
        maxZ: Math.max(iceMin.z, iceMax.z),
        surface: 'ice',
      });
    }
    // Exact native Level 2 Black Marble spawn read from MAME 68010 RAM 0x400a20
    // (324, 284, 16290) => cell (40.5, 35.5) on the narrow bridge before the 3 towers.
    const blackSpawn = practiceWorldPoint(
      324,
      284,
      16290,
      columns,
      rows,
      terrain.origin,
    );
    if (blackSpawn) {
      enemies.push({
        id: 'level2-black-marble',
        kind: 'blackMarble',
        position: blackSpawn,
        patrolRadius: 3.5,
      });
    }
    // Elastic outer-wall bumpers for the 5 raised rectangular wells at the start of Level 2.
    // Because the marble radius (0.675) exceeds the back-wall step height (~0.41),
    // thin bumper strips along each well's 4 walls guarantee crisp wall restitution
    // instead of contacting the 0-restitution top floor lip, while keeping the interior hollow.
    const level2Wells = [
      [14, 17, 16382],
      [24, 17, 16382],
      [9, 25, 16366],
      [19, 25, 16366],
      [29, 25, 16366],
    ] as const;
    const stripThick = 0.22;
    const stripHeight = 1.1;
    for (let i = 0; i < level2Wells.length; i++) {
      const [wx, wz, wh] = level2Wells[i]!;
      const corner = practiceWorldPoint(
        wx * arcadeCellUnits,
        wz * arcadeCellUnits,
        wh,
        columns,
        rows,
        terrain.origin,
      );
      if (!corner) continue;
      // Top sits +0.05 above the well rim so the marble hits the elastic bumper first.
      const centerY = corner.y + 0.05 - stripHeight / 2;
      const w = 6;
      const d = 4;
      const cx = corner.x + w / 2;
      const cz = corner.z + d / 2;
      volumes.push(
        {
          id: `level2-well-${i}-n`,
          shape: 'box',
          position: { x: cx, y: centerY, z: corner.z + stripThick / 2 - 0.04 },
          size: { x: w + 0.08, y: stripHeight, z: stripThick },
          surface: 'booster',
        },
        {
          id: `level2-well-${i}-s`,
          shape: 'box',
          position: {
            x: cx,
            y: centerY,
            z: corner.z + d - stripThick / 2 + 0.04,
          },
          size: { x: w + 0.08, y: stripHeight, z: stripThick },
          surface: 'booster',
        },
        {
          id: `level2-well-${i}-w`,
          shape: 'box',
          position: { x: corner.x + stripThick / 2 - 0.04, y: centerY, z: cz },
          size: { x: stripThick, y: stripHeight, z: d + 0.08 },
          surface: 'booster',
        },
        {
          id: `level2-well-${i}-e`,
          shape: 'box',
          position: {
            x: corner.x + w - stripThick / 2 + 0.04,
            y: centerY,
            z: cz,
          },
          size: { x: stripThick, y: stripHeight, z: d + 0.08 },
          surface: 'booster',
        },
      );
    }
  }

  if (isLevel3) {
    const waveMin = practiceWorldPoint(
      waveRegion.x * arcadeCellUnits,
      waveRegion.z * arcadeCellUnits,
      16148,
      columns,
      rows,
      terrain.origin,
    );
    const waveMax = practiceWorldPoint(
      (waveRegion.x + waveRegion.width) * arcadeCellUnits,
      (waveRegion.z + waveRegion.length) * arcadeCellUnits,
      16148,
      columns,
      rows,
      terrain.origin,
    );
    if (waveMin && waveMax) {
      surfaceZones.push({
        id: 'level3-wave',
        minX: Math.min(waveMin.x, waveMax.x),
        maxX: Math.max(waveMin.x, waveMax.x),
        minZ: Math.min(waveMin.z, waveMax.z),
        maxZ: Math.max(waveMin.z, waveMax.z),
        surface: 'wave',
      });
    }
  }

  if (isLevel4) {
    const bm = practiceWorldPoint(
      LEVEL4_BLACK_MARBLE_SPAWN.x * arcadeCellUnits,
      LEVEL4_BLACK_MARBLE_SPAWN.z * arcadeCellUnits,
      LEVEL4_BLACK_MARBLE_SPAWN.height,
      columns,
      rows,
      terrain.origin,
    );
    if (bm) {
      enemies.push({
        id: 'level4-black-marble',
        kind: 'blackMarble',
        position: bm,
        patrolRadius: LEVEL4_BLACK_MARBLE_SPAWN.patrolRadius,
      });
    }
  }

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
    name: isLevel5
      ? 'Silly Race'
      : isLevel4
        ? 'Aerial Race'
        : isLevel3
          ? 'Intermediate Race'
          : isLevel2
            ? 'Beginner Race'
            : (terrain.level ?? 'Practice Race'),
    courseIndex: isLevel5 ? 5 : isLevel4 ? 4 : isLevel3 ? 3 : isLevel2 ? 2 : 1,
    timerSeconds: isLevel2 ? 75 : isLevel4 || isLevel5 ? 70 : 60,
    direction: isLevel5 ? -1 : 1,
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
    volumes,
    surfaceZones,
    enemies,
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
