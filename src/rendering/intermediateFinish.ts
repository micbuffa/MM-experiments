import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';

export const intermediateIce = { x: 90, z: 95, width: 16, length: 12 };
export const intermediateGoal = { x: 110, z: 109, width: 4, length: 10 };
type Region = typeof intermediateIce;

export function intermediateFinishContains(
  region: Region,
  x: number,
  z: number,
) {
  return (
    x >= region.x &&
    x < region.x + region.width &&
    z >= region.z &&
    z < region.z + region.length
  );
}

export function intermediateFinishSurface(
  cells: readonly (readonly TerrainCell[])[],
  region: Region,
  painting: 'ice' | 'goal',
) {
  const surface = terrainMesh(
    cells.map((row, z) =>
      row.map((cell, x) =>
        intermediateFinishContains(region, x, z) ? cell : null,
      ),
    ),
  );
  for (let i = 0; i < surface.uvs.length; i += 2) {
    const u = (surface.uvs[i]! - region.x) / region.width;
    const v = (surface.uvs[i + 1]! - region.z) / region.length;
    surface.uvs[i] = painting === 'ice' ? u : v;
    surface.uvs[i + 1] = painting === 'ice' ? v : (u * 35) / 64;
  }
  return surface;
}
