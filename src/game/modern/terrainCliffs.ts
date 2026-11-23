import type { terrainMesh } from './terrainMesh';

type Point = readonly [number, number, number];

/** Vertical faces under exposed edges and between surface steps. */
export function terrainCliffs(
  surface: ReturnType<typeof terrainMesh>,
  columns: number,
  rows: number,
  base: number,
) {
  const { indices, positions } = surface;
  const edges = new Map<string, readonly [number, number]>();
  const point = (index: number): Point => [
    positions[index * 3]!,
    positions[index * 3 + 1]!,
    positions[index * 3 + 2]!,
  ];
  const planar = (index: number) =>
    `${positions[index * 3]},${positions[index * 3 + 2]}`;
  const walls = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
  };

  function face(a: Point, b: Point, lowA: number, lowB: number) {
    const [ax, ay, az] = a;
    const [bx, by, bz] = b;
    const start = walls.positions.length / 3;
    const width = Math.hypot(ax - bx, az - bz);
    walls.positions.push(bx, by, bz, ax, ay, az, ax, lowA, az, bx, lowB, bz);
    if (ay !== lowA) walls.indices.push(start, start + 1, start + 2);
    if (by !== lowB) walls.indices.push(start, start + 2, start + 3);
    walls.uvs.push(width, by - lowB, 0, ay - lowA, 0, 0, width, 0);
  }

  function step(
    start: number,
    end: number,
    opposite: readonly [number, number],
  ) {
    const a = point(start);
    const b = point(end);
    const reversed = planar(start) === planar(opposite[1]);
    const lowA = positions[opposite[reversed ? 1 : 0] * 3 + 1]!;
    const lowB = positions[opposite[reversed ? 0 : 1] * 3 + 1]!;
    const from = a[1] - lowA;
    const to = b[1] - lowB;
    if (from === 0 && to === 0) return;
    const otherA: Point = [a[0], lowA, a[2]];
    const otherB: Point = [b[0], lowB, b[2]];
    if (from >= 0 && to >= 0) face(a, b, lowA, lowB);
    else if (from <= 0 && to <= 0) face(otherB, otherA, b[1], a[1]);
    else {
      const ratio = from / (from - to);
      const cross: Point = [
        a[0] + ratio * (b[0] - a[0]),
        a[1] + ratio * (b[1] - a[1]),
        a[2] + ratio * (b[2] - a[2]),
      ];
      if (from > 0) {
        face(a, cross, lowA, cross[1]);
        face(otherB, cross, b[1], cross[1]);
      } else {
        face(cross, b, cross[1], lowB);
        face(cross, otherA, cross[1], a[1]);
      }
    }
  }

  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index]!;
    const b = indices[index + 1]!;
    const c = indices[index + 2]!;
    for (const [start, end] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = [planar(start), planar(end)].sort().join('/');
      const opposite = edges.get(key);
      if (opposite) {
        edges.delete(key);
        step(start, end, opposite);
      } else edges.set(key, [start, end]);
    }
  }

  for (const [start, end] of edges.values()) {
    const a = point(start);
    const b = point(end);
    if (
      (a[0] === b[0] && Math.abs(a[0]) === columns / 2) ||
      (a[2] === b[2] && Math.abs(a[2]) === rows / 2)
    )
      continue;
    face(a, b, base, base);
  }
  return walls;
}
