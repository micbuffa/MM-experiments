import {
  ARCADE_UNITS_PER_CELL,
  LEVEL2_SCROLL_ROW0,
  type EnemyMarbleSpec,
  type ZoneBoundary,
} from './blackMarbleRom';

export interface CellCoord {
  readonly x: number;
  readonly z: number;
}

/** Arcade cell index of a continuous cell coordinate (`pos >> 19`). */
export function cellOf(position: CellCoord): CellCoord {
  return { x: Math.floor(position.x), z: Math.floor(position.z) };
}

function onSegment(b: ZoneBoundary, cell: CellCoord): boolean {
  const [across, along] = b.axis === 'x' ? [cell.x, cell.z] : [cell.z, cell.x];
  return across === b.line && along >= b.from && along <= b.to;
}

/**
 * Port of the zone tracker `0x1365c` (players only; enemies keep their
 * spawn zone). A zone changes when a marble LEAVES a boundary segment cell:
 * the first record whose segment contains the previous cell but not the new
 * one gives `higherZone` if the new cell is beyond the line, else `lowerZone`.
 */
export function nextZone(
  boundaries: readonly ZoneBoundary[],
  zone: number,
  previousCell: CellCoord,
  newCell: CellCoord,
): number {
  if (previousCell.x === newCell.x && previousCell.z === newCell.z) return zone;
  for (const b of boundaries) {
    if (!onSegment(b, previousCell) || onSegment(b, newCell)) continue;
    const across = b.axis === 'x' ? newCell.x : newCell.z;
    return across > b.line ? b.higherZone : b.lowerZone;
  }
  return zone;
}

/**
 * Scroll row used by the spawner `0x15a12` (computed in `0x144e4`):
 * `(scroll - descriptor.$10) >> 4`, stored in a signed byte.
 */
export function scrollRow(
  scroll: number,
  row0Scroll = LEVEL2_SCROLL_ROW0,
): number {
  const row = Math.floor((scroll - row0Scroll) / 16);
  return ((((row + 128) % 256) + 256) % 256) - 128;
}

export type EnemyBandEvent = 'spawn' | 'despawn' | null;

/**
 * Spawn/despawn rule of `0x15a12` for one enemy when the scroll row changes
 * from `oldRow` to `newRow`. The arcade also requires a free enemy slot
 * (`0x1599a`, two slots) and that the same graph is not already active
 * (`0x159d8`); callers express both through `active`/their own slot count.
 * At level start the arcade calls it with `(scroll - 25, scroll)`
 * (`0x105dc`), which spawns the Level 2 black marble immediately.
 */
export function enemyBandEvent(
  spec: EnemyMarbleSpec,
  active: boolean,
  oldRow: number,
  newRow: number,
): EnemyBandEvent {
  if (oldRow === newRow) return null;
  if (!active) {
    const { first, last } = spec.spawnRows;
    const entering = newRow === first || newRow === last;
    const fromOutside = oldRow < first || oldRow > last;
    return entering && fromOutside ? 'spawn' : null;
  }
  const { first, last } = spec.keepRows;
  if (
    (oldRow === first && newRow < first) ||
    (oldRow === last && newRow > last)
  ) {
    return 'despawn';
  }
  return null;
}

/**
 * Arcade screen Y (pixels) of a world point, from the 30°/45° projection used
 * across the project (`practiceProjection.ts`): `(x + z) / 2 - (h - 0x4000)`
 * with x/z in arcade units. `heightAboveBaseUnits` is `h - 0x4000`.
 */
export function arcadeScreenY(
  position: CellCoord,
  heightAboveBaseUnits: number,
): number {
  return (
    ((position.x + position.z) * ARCADE_UNITS_PER_CELL) / 2 -
    heightAboveBaseUnits
  );
}

/** Level 2 start: `(220, 108)` arcade units, height 16378 (HANDOFF checkpoint). */
export const LEVEL2_START = {
  x: 220 / 8,
  z: 108 / 8,
  heightAboveBaseUnits: 16378 - 0x4000,
};

/**
 * INFERRED: approximate arcade scroll for a Remaster scene that has no
 * arcade camera. Assumes the leading player keeps the screen height it had
 * at the start (the real camera has a dead zone of rows 0x48..0xa8 decoded
 * from `0x1f1d0/0x1f1d2`, so expect up to ±3 rows of error).
 */
export function estimateLevel2Scroll(
  leader: CellCoord,
  heightAboveBaseUnits: number,
  row0Scroll = LEVEL2_SCROLL_ROW0,
): number {
  const start = arcadeScreenY(LEVEL2_START, LEVEL2_START.heightAboveBaseUnits);
  return (
    row0Scroll +
    Math.max(0, arcadeScreenY(leader, heightAboveBaseUnits) - start)
  );
}
