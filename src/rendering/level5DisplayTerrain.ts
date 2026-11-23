import { arcadeHeightScale } from '../game/modern/practiceProjection';
import { terrainMesh } from '../game/modern/terrainMesh';
import type { TerrainCell } from '../game/modern/terrainMesh';

/** The fourth lookup sample crosses into the neighbouring collision triangle.
 * Restore each rectilinear display plane from its three coherent corners;
 * the untouched survey remains the emulator's reference, not a physics mesh.
 */
const roundHeight = (height: number) => Math.round(height * 1e9) / 1e9;
export function level5DisplayTerrain(
  cells: readonly (readonly TerrainCell[])[],
): TerrainCell[][] {
  const display: TerrainCell[][] = cells.map((row, z) =>
    row.map((cell, x) => {
      // Native finish collisions are deliberately on a lower, displaced strip.
      // Reconstruct the visible upper platforms: +6 cells/+48 height projects
      // to exactly the same arcade pixels, but joins the real ramp at Z=34.
      if (
        (x >= 25 && x < 29 && z >= 6 && z < 34 && x <= z + 21) ||
        (x >= 19 && x < 23 && z >= 4 && z < 43 && x >= z - 21)
      ) {
        const y = ((16416 - 16384) * arcadeHeightScale) / 8;
        return [y, y, y, y];
      }
      // The Escher approach bridge spans only the 6 cells X=29..34, Z=21..23 at H=16416.
      // Beyond X=35, the floor stays at its true lower height H=16368 (no yellow wall under the marble).
      if (x >= 29 && x < 35 && z >= 21 && z < 24 && x <= z + 21) {
        const y = ((16416 - 16384) * arcadeHeightScale) / 8;
        return [y, y, y, y];
      }
      if (x >= 23 && x < 25 && z >= 4 && z < 28) {
        const y = ((16388 - 16384) * arcadeHeightScale) / 8;
        return [y, y, y, y];
      }
      if (x >= 25 && x < 29 && z >= 34 && z < 36) {
        const profile = [16388, 16384, 16376, 16368, 16368];
        const a = roundHeight(
          ((profile[x - 25]! - 16384) * arcadeHeightScale) / 8,
        );
        const b = roundHeight(
          ((profile[x - 24]! - 16384) * arcadeHeightScale) / 8,
        );
        return [a, b, b, a];
      }
      if (!cell) return null;
      const pyramid = level5Pyramids.find(
        ([cx, cz]) => x >= cx - 1 && x < cx + 2 && z >= cz - 1 && z < cz + 2,
      );
      if (pyramid) {
        const support = pyramid[2] === 16352 ? pyramid[2] : pyramid[2] - 12;
        const y = ((support - 16384) * arcadeHeightScale) / 8;
        const heights: [number, number, number, number] = [y, y, y, y];
        return heights;
      }
      if (x >= 90 && x < 93 && z >= 95 && z < 97) {
        const a = roundHeight(
          ((16244 - (x - 90) * 2 - 16384) * arcadeHeightScale) / 8,
        );
        const b = roundHeight(
          ((16242 - (x - 90) * 2 - 16384) * arcadeHeightScale) / 8,
        );
        return [a, b, b, a];
      }
      const [nw, ne, se] = cell;
      // The two broad flanks meet along a diagonal ridge. Their ridge cells
      // are folded quads, not extensions of either single sloping plane.
      const onArenaRidge =
        (x >= 106 && x <= 111 && x - z === 9) ||
        (x >= 96 && x <= 101 && x - z === -11);
      if (
        onArenaRidge &&
        nw !== null &&
        ne !== null &&
        se !== null &&
        Math.abs(nw - se) < 1e-7 &&
        nw > ne
      ) {
        return [
          roundHeight(nw),
          roundHeight(ne),
          roundHeight(se),
          roundHeight(ne),
        ];
      }
      return nw !== null && ne !== null && se !== null
        ? [
            roundHeight(nw),
            roundHeight(ne),
            roundHeight(se),
            roundHeight(nw + se - ne),
          ]
        : cell;
    }),
  );
  // Apply after the platform repairs too: no square ears on this diagonal.
  for (let z = 21; z < display.length; z++) {
    const x = z - 21,
      cell = display[z]?.[x];
    if (cell) display[z]![x] = [cell[0], cell[1], cell[2], null];
  }
  for (let z = 0; z < display.length; z++) {
    const x = z + 21,
      source = cells[z]?.[x],
      cell = display[z]?.[x];
    if (
      source &&
      cell &&
      cell[0] !== null &&
      cell[2] !== null &&
      cell[3] !== null
    ) {
      // The NE point lies outside the diagonal playfield, at every scroll.
      const flat = cell.every((height) => height === cell[0]);
      const threeFlat = source[0] === source[2] && source[0] === source[3];
      display[z]![x] = [
        cell[0],
        null,
        cell[2],
        flat || threeFlat ? cell[0] : source[3],
      ];
    }
  }
  return display;
}

export const level5Pyramids = [
  [60, 56, 16352],
  [52, 56, 16352],
  [47, 48, 16352],
  [44, 56, 16352],
  [38, 56, 16352],
  [36, 27, 16380],
  [11, 28, 16396],
  [48, 36, 16380],
] as const;

/** Shared roofs and masonry edges, with fine tiles only inside the arena. */
export function level5Surface(cells: readonly (readonly TerrainCell[])[]) {
  const geometry = terrainMesh(cells);
  const { positions, indices, uvs } = geometry;
  const halfX = cells[0]!.length / 2,
    halfZ = cells.length / 2;
  for (let i = 0; i < indices.length; i += 3) {
    const triangle = indices.slice(i, i + 3);
    const x = Math.floor(
      triangle.reduce((sum, v) => sum + positions[v * 3]!, 0) / 3 + halfX,
    );
    const z = Math.floor(
      triangle.reduce((sum, v) => sum + positions[v * 3 + 2]!, 0) / 3 + halfZ,
    );
    const density = x >= 90 && x < 104 && z >= 91 && z < 105 ? 2 : 1;
    for (const v of triangle) {
      uvs[v * 2] = (positions[v * 3]! + halfX) * density;
      uvs[v * 2 + 1] = (positions[v * 3 + 2]! + halfZ) * density;
    }
  }
  return geometry;
}

export const level5Goal = { x: 25, z: 24, width: 4, length: 10 } as const;

/** Shift the native lower finish strip and 6-cell bridge along the isometric viewing ray.
 * In orthographic arcade view, shifting a wider approach zone (X < 33, Z < 21) is
 * pixel-identical and prevents the floating bridge deck from ever slicing the marble.
 * In perspective/free views, shift tightly at the '?' marker (X < 29.75, Z < 18.5).
 */
export function level5FinishDepth(
  x: number,
  z: number,
  height: number,
  arcadeView = false,
) {
  const maxX = arcadeView ? 33 * 8 : 29 * 8 + 6;
  const maxZ = x < 23 * 8 ? 28 * 8 : arcadeView ? 21 * 8 : 18 * 8 + 4;
  return x >= 19 * 8 &&
    x < maxX &&
    z >= 0 &&
    z < maxZ &&
    Math.abs(height - 16368) <= 24
    ? 48
    : 0;
}
