import type { terrainCliffs } from '../game/modern/terrainCliffs';

type Walls = ReturnType<typeof terrainCliffs>;

/** Keep landing walls in their own mesh, preserving quads for consistent wall painting. */
export function splitLevel4LandingWalls(
  walls: Walls,
  columns: number,
  rows: number,
) {
  const indices: number[] = [];
  const landing: Walls = { positions: [], indices: [], uvs: [] };
  const faces = new Map<number, number>();
  for (let i = 0; i < walls.indices.length; i += 3) {
    const triangle = walls.indices.slice(i, i + 3);
    const onLanding = triangle.every((v) => {
      const x = walls.positions[v * 3]! + columns / 2;
      const z = walls.positions[v * 3 + 2]! + rows / 2;
      return x >= 82 && x <= 87 && z >= 91 && z <= 95;
    });
    if (!onLanding) {
      indices.push(...triangle);
      continue;
    }
    const face = Math.floor(triangle[0]! / 4) * 4;
    let start = faces.get(face);
    if (start === undefined) {
      start = landing.positions.length / 3;
      faces.set(face, start);
      // Keep each source quad together: wall painting uses its top edge.
      for (let corner = 0; corner < 4; corner++) {
        const v = face + corner;
        landing.positions.push(...walls.positions.slice(v * 3, v * 3 + 3));
        landing.uvs.push(...walls.uvs.slice(v * 2, v * 2 + 2));
      }
    }
    for (const v of triangle) landing.indices.push(start + v - face);
  }
  return { cliffs: { ...walls, indices }, landing };
}
