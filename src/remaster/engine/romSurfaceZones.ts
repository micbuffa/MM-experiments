import type { HeightLayer, RemasterLevelV1 } from '../levels/remasterLevel';

/**
 * Ice zones decoded from the Marble Madness 68010 program ROM.
 *
 * The arcade does not mark ice in the height map or in the playfield
 * attributes. Ice is a "zone object": a script slot in the 25-entry table at
 * `0x400A9C` (stride `0x56`) whose type byte `+0x1F` is one of the tags below.
 * Every game tick (30 Hz), `FUN_00029CCE` clears the marble's zone byte `+0x58` and copies
 * the tag of the zone it stands in (`0x2A1E4..0x2A356`). The physics code then
 * reads `+0x58`:
 *
 * - `FUN_00017F66` (`0x17FA8..0x17FF2`) adds trackball input only for tag 0
 *   and the Level 6 friction tags. Ice tags skip input (`0x1808E`).
 * - `FUN_000121B8` (`0x1279A..0x127EA`) skips the friction routine
 *   `FUN_00025E7C` for ice tags.
 * - Slope gravity (`FUN_00025DF6`, called at `0x1280E`) still runs.
 *
 * See `docs/remaster/ice-zones.md` for the full decode.
 */

/** Course number as shown to players: 1 = Practice ... 6 = Ultimate. */
export type CourseNumber = 1 | 2 | 3 | 4 | 5 | 6;

/** Zone tags that turn off input and friction (`0x127A2..0x127DE`). */
export const ROM_ICE_ZONE_TAGS: readonly number[] = [
  0x10, 0x17, 0x18, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37,
];

export interface RomIceZone {
  readonly course: CourseNumber;
  readonly tag: number;
  /** ROM address of the zone script (opcode 0 header: x, y, z, flag, tag). */
  readonly script: number;
  /** Script anchor cell (script words 1 and 2). */
  readonly anchor: { readonly x: number; readonly z: number };
  /**
   * Inclusive arcade-cell bounds. Arcade cell x = position x >> 3 (word at
   * `0x400696`), cell z = position y >> 3 (`0x400698`). These are the same
   * indices as the rows and columns of `local-roms/*-terrain*.json`.
   */
  readonly minX: number;
  readonly maxX: number;
  readonly minZ: number;
  readonly maxZ: number;
}

/**
 * Rectangle test of the ice handlers: anchor - cell must lie in [0, size).
 * So the anchor is the zone's maximum corner.
 */
function rect(
  course: CourseNumber,
  tag: number,
  script: number,
  x: number,
  z: number,
  width: number,
  depth: number,
): RomIceZone {
  return {
    course,
    tag,
    script,
    anchor: { x, z },
    minX: x - width + 1,
    maxX: x,
    minZ: z - depth + 1,
    maxZ: z,
  };
}

/**
 * All ice-class zones in the six spawn lists (`0x1DEC0` pointer table,
 * indexed by the course word at `0x400394`).
 */
export const ROM_ICE_ZONES: readonly RomIceZone[] = [
  // Course 2 (Beginner): one 16 x 14 rectangle, handler 0x2A1E4.
  rect(2, 0x10, 0x1db94, 105, 107, 16, 14),
  // Course 4 (Aerial): two 1-cell-wide lines of 18 cells.
  // 0x17 (0x2A210): x == anchor.x and anchor.z - z in [-17, 0].
  {
    course: 4,
    tag: 0x17,
    script: 0x1dbac,
    anchor: { x: 22, z: 9 },
    minX: 22,
    maxX: 22,
    minZ: 9,
    maxZ: 26,
  },
  // 0x18 (0x2A234): z == anchor.z and anchor.x - x in [-17, 0].
  {
    course: 4,
    tag: 0x18,
    script: 0x1dbc4,
    anchor: { x: 10, z: 23 },
    minX: 10,
    maxX: 27,
    minZ: 23,
    maxZ: 23,
  },
  // Course 6 (Ultimate): six rectangles, handlers 0x2A258..0x2A334.
  rect(6, 0x32, 0x1dbdc, 43, 34, 4, 2),
  rect(6, 0x33, 0x1dbf4, 41, 44, 2, 4),
  rect(6, 0x34, 0x1dc0c, 76, 81, 8, 11),
  rect(6, 0x35, 0x1dc24, 79, 78, 3, 8),
  rect(6, 0x36, 0x1dc3c, 93, 106, 6, 3),
  rect(6, 0x37, 0x1dc54, 85, 95, 2, 3),
];

/** Returns the ice zone containing an arcade cell, if any. */
export function iceZoneAt(
  course: number,
  cellX: number,
  cellZ: number,
): RomIceZone | undefined {
  return ROM_ICE_ZONES.find(
    (zone) =>
      zone.course === course &&
      cellX >= zone.minX &&
      cellX <= zone.maxX &&
      cellZ >= zone.minZ &&
      cellZ <= zone.maxZ,
  );
}

/** True when the ROM treats this arcade cell as ice (no input, no friction). */
export function isIceCell(
  course: number,
  cellX: number,
  cellZ: number,
): boolean {
  return iceZoneAt(course, cellX, cellZ) !== undefined;
}

/** Converts a Remaster world position to the arcade cell of a height layer. */
export function arcadeCellAt(
  layer: Pick<HeightLayer, 'columns' | 'rows' | 'origin'>,
  worldX: number,
  worldZ: number,
): { readonly x: number; readonly z: number } {
  return {
    x: Math.floor(worldX + layer.columns / 2) + layer.origin.x,
    z: Math.floor(worldZ + layer.rows / 2) + layer.origin.z,
  };
}

/**
 * Ice test for a world position, using the level's course number and its
 * first height layer for the cell grid. False when the level has no layer.
 */
export function isIceAtWorld(
  level: Pick<RemasterLevelV1, 'courseIndex' | 'heightLayers'>,
  worldX: number,
  worldZ: number,
): boolean {
  const layer = level.heightLayers[0];
  if (!layer) return false;
  const cell = arcadeCellAt(layer, worldX, worldZ);
  return isIceCell(level.courseIndex, cell.x, cell.z);
}
