import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../../game/modern/practiceProjection';
import {
  LEVEL3_AMOEBA_SPECS,
  LEVEL3_COPPER_PIPE,
  LEVEL3_WAVE,
  type Level3AmoebaSpec,
} from './level3RomData';

export interface Level3AmoebaState {
  readonly id: string;
  readonly cellX: number;
  readonly cellZ: number;
  readonly heading: number;
  readonly stridePhase: number;
  readonly spec: Level3AmoebaSpec;
  readonly waypointIndex: number;
}

export interface Level3AmoebaSnapshot {
  readonly id: string;
  readonly cellX: number;
  readonly cellZ: number;
  readonly heading: number;
  readonly stridePhase: number;
}

const AMOEBA_SPEED_CELLS_PER_SEC = 1.85;

export function createLevel3Amoebas(): Level3AmoebaState[] {
  return LEVEL3_AMOEBA_SPECS.map((spec) => {
    const start = spec.waypoints[0]!;
    const next = spec.waypoints[1] ?? start;
    return {
      id: spec.id,
      cellX: start.x + 0.5,
      cellZ: start.z + 0.5,
      heading: Math.atan2(next.x - start.x, next.z - start.z),
      stridePhase: 0,
      spec,
      waypointIndex: 1 % spec.waypoints.length,
    };
  });
}

export function stepLevel3Amoebas(
  amoebas: readonly Level3AmoebaState[],
  dt: number,
): Level3AmoebaState[] {
  const stepDist = AMOEBA_SPEED_CELLS_PER_SEC * Math.max(0, dt);
  return amoebas.map((a) => {
    const target = a.spec.waypoints[a.waypointIndex]!;
    const tx = target.x + 0.5;
    const tz = target.z + 0.5;
    const dx = tx - a.cellX;
    const dz = tz - a.cellZ;
    const dist = Math.hypot(dx, dz);
    if (dist <= stepDist || dist < 0.001) {
      const nextIdx = (a.waypointIndex + 1) % a.spec.waypoints.length;
      const after = a.spec.waypoints[nextIdx]!;
      return {
        ...a,
        cellX: tx,
        cellZ: tz,
        heading: Math.atan2(after.x + 0.5 - tx, after.z + 0.5 - tz),
        stridePhase: (a.stridePhase + dist * 0.95) % 1,
        waypointIndex: nextIdx,
      };
    }
    const nx = dx / dist;
    const nz = dz / dist;
    return {
      ...a,
      cellX: a.cellX + nx * stepDist,
      cellZ: a.cellZ + nz * stepDist,
      heading: Math.atan2(nx, nz),
      stridePhase: (a.stridePhase + stepDist * 0.95) % 1,
    };
  });
}

/** Returns true when a marble at (cellX, cellZ) touches any Level 3 acid amoeba pool. */
export function touchesLevel3Amoeba(
  amoebas: readonly Level3AmoebaState[],
  cellX: number,
  cellZ: number,
  contactRadius = 0.82,
): boolean {
  for (const a of amoebas) {
    if (Math.hypot(cellX - a.cellX, cellZ - a.cellZ) <= contactRadius) {
      return true;
    }
  }
  return false;
}

const WAVE_BASE_WORLD_Y =
  ((LEVEL3_WAVE.baseArcadeHeight - arcadeGroundHeight) * arcadeHeightScale) /
  arcadeCellUnits;
const WAVE_MAX_WORLD_HEIGHT =
  (LEVEL3_WAVE.maxArcadeDelta * arcadeHeightScale) / arcadeCellUnits;

/** Normalized wave crest height (0..1) at local Z (0..22) and elapsed seconds. */
export function level3WaveNormalized(zLocal: number, timeSeconds: number) {
  const period = LEVEL3_WAVE.wavelengthCells;
  const phase =
    (((zLocal - timeSeconds * LEVEL3_WAVE.speedCellsPerSec) % period) +
      period) %
    period;
  const dist = Math.abs(phase - period / 2);
  if (dist >= LEVEL3_WAVE.crestHalfWidthCells) return 0;
  const c = Math.cos((dist / LEVEL3_WAVE.crestHalfWidthCells) * (Math.PI / 2));
  return c * c;
}

/** 22-tile normalized profile (0..1) consumed by `setLevel3WaveProfile()` in the 3D scene. */
export function sampleLevel3WaveProfile(timeSeconds: number): number[] {
  return Array.from({ length: LEVEL3_WAVE.length }, (_, i) =>
    level3WaveNormalized(i + 0.5, timeSeconds),
  );
}

export interface Level3WaveSample {
  readonly onWave: boolean;
  readonly surfaceY: number;
  /** World dY/dZ gradient of the wave at this cell (positive = rising ahead along +Z). */
  readonly slopeZ: number;
}

/** Evaluates wave support height and longitudinal slope at an arcade cell coordinate. */
export function sampleLevel3WaveAt(
  cellX: number,
  cellZ: number,
  timeSeconds: number,
): Level3WaveSample {
  const inX =
    cellX >= LEVEL3_WAVE.x && cellX < LEVEL3_WAVE.x + LEVEL3_WAVE.width;
  const inZ =
    cellZ >= LEVEL3_WAVE.z && cellZ < LEVEL3_WAVE.z + LEVEL3_WAVE.length;
  if (!inX || !inZ) {
    return { onWave: false, surfaceY: WAVE_BASE_WORLD_Y, slopeZ: 0 };
  }
  const zLocal = cellZ - LEVEL3_WAVE.z;
  const eps = 0.15;
  const h = level3WaveNormalized(zLocal, timeSeconds) * WAVE_MAX_WORLD_HEIGHT;
  const hPrev =
    level3WaveNormalized(Math.max(0, zLocal - eps), timeSeconds) *
    WAVE_MAX_WORLD_HEIGHT;
  const hNext =
    level3WaveNormalized(
      Math.min(LEVEL3_WAVE.length, zLocal + eps),
      timeSeconds,
    ) * WAVE_MAX_WORLD_HEIGHT;
  return {
    onWave: true,
    surfaceY: WAVE_BASE_WORLD_Y + h,
    slopeZ: (hNext - hPrev) / (2 * eps),
  };
}

export type Level3PipeProbe = 'none' | 'mouth' | 'enter';

/** Probes the Level 3 copper vertical funnel pipe (ROM 0x2a5e6). */
export function probeLevel3CopperPipe(
  arcadeX: number,
  arcadeZ: number,
  arcadeHeight: number,
): Level3PipeProbe {
  const cellX = Math.floor(arcadeX / arcadeCellUnits);
  const cellZ = Math.floor(arcadeZ / arcadeCellUnits);
  if (
    cellX < LEVEL3_COPPER_PIPE.enterCellX.min ||
    cellX > LEVEL3_COPPER_PIPE.enterCellX.max ||
    cellZ < LEVEL3_COPPER_PIPE.enterCellZ.min ||
    cellZ > LEVEL3_COPPER_PIPE.enterCellZ.max
  ) {
    return 'none';
  }
  if (arcadeHeight <= LEVEL3_COPPER_PIPE.ignoreAtOrBelowHeight) return 'none';
  if (arcadeHeight >= LEVEL3_COPPER_PIPE.rimFromHeight) return 'none';
  if (arcadeHeight >= LEVEL3_COPPER_PIPE.mouthFromHeight) return 'mouth';
  return 'enter';
}
