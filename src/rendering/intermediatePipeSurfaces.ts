import { Vector3 } from '@babylonjs/core/Maths/math.vector';

type Axis = 'x' | 'y' | 'z';
interface Section {
  readonly axis: Axis;
  readonly center: number;
  readonly includes: (point: Vector3) => boolean;
}

function clip(points: Vector3[], axis: Axis, plane: number, side: number) {
  return points.flatMap((point, index) => {
    const next = points[(index + 1) % points.length]!;
    const from = side * (point[axis] - plane);
    const to = side * (next[axis] - plane);
    const crossing = (from < 0 && to > 0) || (from > 0 && to < 0);
    const inside = from >= 0 ? [point] : [];
    if (crossing) inside.push(Vector3.Lerp(point, next, from / (from - to)));
    return inside;
  });
}

export function pipeSeamStrip(points: Vector3[], axis: Axis, center: number) {
  const halfWidth = 0.036;
  return clip(
    clip(points, axis, center - halfWidth, 1),
    axis,
    center + halfWidth,
    -1,
  );
}

const upper = (point: Vector3) => point.z < 16;
const fork = (point: Vector3) => point.z > 18;
const sections: readonly Section[] = [
  { axis: 'y', center: -13.85, includes: upper },
  { axis: 'y', center: -17.2, includes: upper },
  { axis: 'x', center: 0.5, includes: (p) => upper(p) && p.y < -18.5 },
  { axis: 'y', center: -21.16, includes: (p) => fork(p) && p.z < 23 },
  { axis: 'y', center: -22.32, includes: (p) => fork(p) && p.z < 23 },
  { axis: 'z', center: 24.25, includes: fork },
  { axis: 'z', center: 26.7, includes: fork },
];

export function intermediatePipeSeamGeometry(
  positions: number[],
  shell: number[],
) {
  const vertices = [];
  for (let i = 0; i < positions.length; i += 3)
    vertices.push(Vector3.FromArray(positions, i));
  const stripPositions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i < shell.length; i += 3) {
    const a = vertices[shell[i]!]!;
    const b = vertices[shell[i + 1]!]!;
    const c = vertices[shell[i + 2]!]!;
    for (const { axis, center, includes } of sections) {
      if (!includes(a) || !includes(b) || !includes(c)) continue;
      const strip = pipeSeamStrip([a, b, c], axis, center);
      if (strip.length < 3) continue;
      const bias = Vector3.Cross(a.subtract(b), c.subtract(b))
        .normalize()
        .scale(0.008);
      const start = stripPositions.length / 3;
      for (const p of strip)
        stripPositions.push(p.x + bias.x, p.y + bias.y, p.z + bias.z);
      for (let j = 1; j < strip.length - 1; j++)
        indices.push(start, start + j, start + j + 1);
    }
  }
  return { positions: stripPositions, indices };
}

const outletBounds = [
  { minX: 2, maxX: 4, minZ: 10, maxZ: 14 },
  { minX: 17, maxX: 20, minZ: 27, maxZ: 30 },
] as const;

/** Keep the original mesh and assign whole tiles under the outlets to the lining. */
export function intermediatePipeFloorIndices(
  positions: number[],
  triangles: number[],
) {
  const lining: number[] = [];
  const paving: number[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const a = triangles[i]! * 3;
    const b = triangles[i + 1]! * 3;
    const c = triangles[i + 2]! * 3;
    const x = (positions[a]! + positions[b]! + positions[c]!) / 3;
    const z = (positions[a + 2]! + positions[b + 2]! + positions[c + 2]!) / 3;
    const covered = outletBounds.some(
      ({ minX, maxX, minZ, maxZ }) =>
        x >= minX && x < maxX && z >= minZ && z < maxZ,
    );
    (covered ? lining : paving).push(
      triangles[i]!,
      triangles[i + 1]!,
      triangles[i + 2]!,
    );
  }
  return { lining, paving };
}
