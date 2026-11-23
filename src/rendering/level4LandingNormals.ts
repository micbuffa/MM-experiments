import type { terrainMesh } from '../game/modern/terrainMesh';

/** Keep one shading normal per landing tile despite sub-tile survey height variations. */
export function level4LandingNormals(
  surface: ReturnType<typeof terrainMesh>,
  normals: ArrayLike<number>,
  columns: number,
  rows: number,
) {
  const result = Array.from(normals);
  const tiles = new Map<
    string,
    { vertices: Set<number>; x: number; y: number; z: number }
  >();
  for (let i = 0; i < surface.indices.length; i += 3) {
    const triangle = surface.indices.slice(i, i + 3);
    let x = 0,
      z = 0;
    for (const v of triangle) {
      x += surface.positions[v * 3]! / 3;
      z += surface.positions[v * 3 + 2]! / 3;
    }
    const tileX = Math.floor(x + columns / 2);
    const tileZ = Math.floor(z + rows / 2);
    if (tileX < 80 || tileX >= 87 || tileZ < 91 || tileZ >= 95) continue;
    const key = `${tileX},${tileZ}`;
    let tile = tiles.get(key);
    if (!tile) {
      tile = { vertices: new Set(), x: 0, y: 0, z: 0 };
      tiles.set(key, tile);
    }
    for (const v of triangle) {
      tile.vertices.add(v);
      tile.x += normals[v * 3]!;
      tile.y += normals[v * 3 + 1]!;
      tile.z += normals[v * 3 + 2]!;
    }
  }
  for (const tile of tiles.values()) {
    const length = Math.hypot(tile.x, tile.y, tile.z);
    if (length === 0) continue;
    for (const v of tile.vertices) {
      result[v * 3] = tile.x / length;
      result[v * 3 + 1] = tile.y / length;
      result[v * 3 + 2] = tile.z / length;
    }
  }
  return result;
}
