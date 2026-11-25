import { refineIntermediatePipe } from './refineIntermediatePipe';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData';
import type { IntermediatePipeGeometry } from '../game/modern/intermediatePipeGeometry';

/** Average normals across the duplicate export vertices, including material seams. */
function continuousNormals(positions: number[], indices: readonly number[]) {
  const groups = new Map<string, number>();
  const welded: number[] = [];
  const lookup: number[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const key = positions
      .slice(i, i + 3)
      .map((value) => Math.round(value * 10000))
      .join(',');
    let index = groups.get(key);
    if (index === undefined) {
      index = welded.length / 3;
      groups.set(key, index);
      welded.push(positions[i]!, positions[i + 1]!, positions[i + 2]!);
    }
    lookup.push(index);
  }
  const normals: number[] = [];
  VertexData.ComputeNormals(
    welded,
    indices.map((index) => lookup[index]!),
    normals,
  );
  return lookup.flatMap((index) => normals.slice(index * 3, index * 3 + 3));
}

/** Deform the closed RM surface without deleting its hood, lining or lip faces. */
export function fitIntermediatePipeHoods(input: IntermediatePipeGeometry) {
  const source = refineIntermediatePipe(input);
  const positions = [...source.positions];
  const floor = ((16176 - 16384) * Math.sqrt(2 / 3)) / 8;
  // Identical export positions must receive exactly the same displacement,
  // even when they belong to separate faces or materials.
  const mapped = new Map<string, readonly [number, number, number]>();
  for (let i = 0; i < positions.length; i += 3) {
    const original = source.positions.slice(i, i + 3);
    const key = original.join(',');
    const existing = mapped.get(key);
    if (existing) {
      positions.splice(i, 3, ...existing);
      continue;
    }
    const x = original[0]!,
      z = original[2]!;
    let y = original[1]!;
    if (z > 18) {
      // Raise the upper rounded hoods slightly above the floor so the top of the
      // marble clears the roof cleanly while entering the Level 2 blue Y-pipe.
      if (y > floor) y = floor + (y - floor) * 1.1;
      const t = Math.max(0, 1 - Math.abs(z - 23.6) / 3.6);
      y -= 1.45 * t * t * (3 - 2 * t);
    }
    const point = [x, y, z] as const;
    mapped.set(key, point);
    positions.splice(i, 3, ...point);
  }
  const shell = [...source.shell],
    interior = [...source.interior];
  const normals = continuousNormals(positions, [...shell, ...interior]);
  // The separate upper J pipe is unchanged, including its original shading.
  if (source.normals)
    for (let i = 0; i < positions.length; i += 3) {
      if (positions[i + 2]! >= 18) continue;
      normals[i] = source.normals[i]!;
      normals[i + 1] = source.normals[i + 1]!;
      normals[i + 2] = source.normals[i + 2]!;
    }
  return { positions, shell, interior, normals };
}
