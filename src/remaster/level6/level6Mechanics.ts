import type { Level3AmoebaState } from '../level3/level3Mechanics';
import {
  LEVEL6_AMOEBA_SPECS,
  LEVEL6_MAZE_PHASE_COUNT,
  LEVEL6_MAZE_PHASE_SECONDS,
  LEVEL6_ROM_RESPAWN_POINTS,
  LEVEL6_SQUARE_PIT_TELEPORT,
  LEVEL6_SURFACE_ZONES,
  type Level6SurfaceMode,
} from './level6RomData';

/** Create the 4 Level 6 Acid Amoeba pools reusing Level 3's exact state & step contract. */
export function createLevel6Amoebas(): Level3AmoebaState[] {
  return LEVEL6_AMOEBA_SPECS.map((spec) => {
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

/** Exact 41-frame (60 Hz) 4-phase disappearing-block maze index for elapsed play time. */
export function computeLevel6MazePhase(playElapsed: number): 0 | 1 | 2 | 3 {
  if (!Number.isFinite(playElapsed) || playElapsed <= 0) return 0;
  return (Math.floor(playElapsed / LEVEL6_MAZE_PHASE_SECONDS) %
    LEVEL6_MAZE_PHASE_COUNT) as 0 | 1 | 2 | 3;
}

/** True when a cell lies inside the dynamic 4-phase disappearing-block maze (unsafe for lastSafe). */
export function isLevel6DynamicMazeCell(cellX: number, cellZ: number): boolean {
  if (cellX < 76 || cellZ < 78) return false;
  // Static stone entry platform (77..82, 79..84) and GOAL pad (88..91, 88..97) never disappear.
  if (cellX >= 77 && cellX <= 82 && cellZ >= 79 && cellZ <= 84) return false;
  if (cellX >= 88 && cellX <= 91 && cellZ >= 88 && cellZ <= 97) return false;
  return true;
}

/** Sample the exact 68010 ROM Level 6 surface friction mode at arcade cell coordinates. */
export function sampleLevel6SurfaceMode(
  cellX: number,
  cellZ: number,
): Level6SurfaceMode {
  const cx = Math.floor(cellX);
  const cz = Math.floor(cellZ);
  // ROM 0x2ae90 checks `marble.height == zone.height (16384)`: the elevated white start mound
  // (x=20..25, z=17..21) and white ridge (x=22..23, z=22..26) are stone, NOT sand!
  if (
    (cx >= 20 && cx <= 25 && cz >= 17 && cz <= 21) ||
    (cx >= 22 && cx <= 23 && cz >= 22 && cz <= 26)
  ) {
    return 'normal';
  }
  for (const z of LEVEL6_SURFACE_ZONES) {
    if (cx >= z.minX && cx <= z.maxX && cz >= z.minZ && cz <= z.maxZ) {
      return z.mode;
    }
  }
  return 'normal';
}

/** True when a marble has dropped into the 2x2 golden square pit (tag 0x25, ROM 0x2a87a). */
export function isInsideLevel6SquarePit(
  cellX: number,
  cellZ: number,
  arcadeHeight: number,
): boolean {
  const b = LEVEL6_SQUARE_PIT_TELEPORT.entryBox;
  return (
    cellX >= b.minX &&
    cellX <= b.maxX &&
    cellZ >= b.minZ &&
    cellZ <= b.maxZ &&
    arcadeHeight <= b.maxHeight
  );
}

/**
 * Select the nearest authentic 68010 ROM respawn checkpoint (table 0x1f98c) at the
 * same elevation as the marble's current grounded height (never jumping to a different tier
 * or spawning on an unsafe corner).
 */
export function findNearestLevel6Respawn(
  cellX: number,
  cellZ: number,
  worldY: number,
  sampleHeightAtCell: (cx: number, cz: number) => number | null,
): {
  readonly cellX: number;
  readonly cellZ: number;
  readonly y: number;
} | null {
  let best: { cellX: number; cellZ: number; y: number } | null = null;
  let bestDistSq = Infinity;
  for (const [rx, rz] of LEVEL6_ROM_RESPAWN_POINTS) {
    const cx = rx + 0.5;
    const cz = rz + 0.5;
    const h = sampleHeightAtCell(cx, cz);
    if (h === null || Math.abs(h - worldY) > 0.75) continue;
    const dx = cx - cellX;
    const dz = cz - cellZ;
    const dSq = dx * dx + dz * dz;
    if (dSq < bestDistSq) {
      bestDistSq = dSq;
      best = { cellX: cx, cellZ: cz, y: h };
    }
  }
  return best;
}
