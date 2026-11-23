/** Corner heights in local world units, ordered NW, NE, SE, SW. */
type Height = number | null;
export type TerrainCell = readonly [Height, Height, Height, Height] | null;

export const terrainCorners = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
] as const;

/** Emits an indexed surface with world-space UVs and no faces across voids. */
export function terrainMesh(rows: readonly (readonly TerrainCell[])[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  const uvs: number[] = [];
  const width = Math.max(0, ...rows.map((row) => row.length));
  for (const [z, row] of rows.entries()) {
    for (const [x, cell] of row.entries()) {
      if (!cell || cell.filter((height) => height !== null).length < 3)
        continue;
      const start = positions.length / 3;
      const [nw, ne, se, sw] = cell;
      if (
        nw !== null &&
        ne !== null &&
        se !== null &&
        sw !== null &&
        Math.abs(nw + se - ne - sw) > 0.001
      ) {
        // Split folded cells into two independent triangles so flat and sloped
        // halves keep crisp per-face normals without shading bleed across the crease.
        for (const corner of [0, 1, 2, 0, 2, 3] as const) {
          const [dx, dz] = terrainCorners[corner]!;
          positions.push(
            x + dx - width / 2,
            cell[corner]!,
            z + dz - rows.length / 2,
          );
          uvs.push(x + dx, z + dz);
        }
        indices.push(
          start,
          start + 1,
          start + 2,
          start + 3,
          start + 4,
          start + 5,
        );
        continue;
      }
      for (const [corner, height] of cell.entries()) {
        if (height === null) continue;
        const [dx, dz] = terrainCorners[corner]!;
        positions.push(x + dx - width / 2, height, z + dz - rows.length / 2);
        uvs.push(x + dx, z + dz);
      }
      indices.push(start, start + 1, start + 2);
      if (positions.length / 3 - start === 4)
        indices.push(start, start + 2, start + 3);
    }
  }
  return { positions, indices, uvs };
}
