import type { terrainMesh } from '../game/modern/terrainMesh';
import { intermediateIce } from './intermediateFinish';

type Geometry = ReturnType<typeof terrainMesh>;
type EdgePoint = readonly [number, number, number, number];

export function splitIntermediateIceWalls(
  walls: Geometry,
  columns: number,
  rows: number,
) {
  const makePart = (): Geometry => ({ positions: [], indices: [], uvs: [] });
  const cliffs = makePart();
  const lip = makePart();
  const { x, z, width, length } = intermediateIce;
  const within = (n: number, min: number, max: number) => n >= min && n <= max;
  const depths = [0.87, 0.88, 0.86, 0.9, 0.89, 0.88, 0.87];
  const intervals = depths.length - 1;

  function face(
    part: Geometry,
    a: EdgePoint,
    b: EdgePoint,
    u0: number,
    u1: number,
  ) {
    const [ax, topA, az, bottomA] = a;
    const [bx, topB, bz, bottomB] = b;
    const start = part.positions.length / 3;
    part.positions.push(
      ax,
      topA,
      az,
      bx,
      topB,
      bz,
      bx,
      bottomB,
      bz,
      ax,
      bottomA,
      az,
    );
    part.uvs.push(u0, 1, u1, 1, u1, 0, u0, 0);
    if (topB !== bottomB) part.indices.push(start, start + 1, start + 2);
    if (topA !== bottomA) part.indices.push(start, start + 2, start + 3);
  }

  for (let i = 0; i < walls.positions.length; i += 12) {
    const p = walls.positions;
    const a = [p[i]!, p[i + 1]!, p[i + 2]!, p[i + 10]!] as const;
    const b = [p[i + 3]!, p[i + 4]!, p[i + 5]!, p[i + 7]!] as const;
    const ax = a[0] + columns / 2;
    const az = a[2] + rows / 2;
    const bx = b[0] + columns / 2;
    const bz = b[2] + rows / 2;
    const onEnd =
      ax === bx &&
      (ax === x || ax === x + width) &&
      within(az, z, z + length) &&
      within(bz, z, z + length);
    const onSide =
      az === bz &&
      (az === z || az === z + length) &&
      within(ax, x, x + width) &&
      within(bx, x, x + width);
    const span = walls.uvs[(i / 12) * 8]!;
    if ((!onEnd && !onSide) || Math.min(a[1] - a[3], b[1] - b[3]) < 0.35) {
      face(cliffs, a, b, span, 0);
      continue;
    }

    const seed = Math.round(Math.min(ax, bx) * 13 + Math.min(az, bz) * 7);
    const dropAt = 1 + (seed % (intervals - 1));
    const reach = seed % 5 < 2 ? 0.53 + (seed % 3) * 0.11 : 0.07;
    function section(index: number) {
      const t = index / intervals;
      const tx = a[0] + (b[0] - a[0]) * t;
      const tz = a[2] + (b[2] - a[2]) * t;
      const top = a[1] + (b[1] - a[1]) * t;
      const bottom = a[3] + (b[3] - a[3]) * t;
      const depth = depths[index]! + (index === dropAt ? reach : 0);
      return { tx, tz, top, bottom, cutoff: Math.max(bottom, top - depth), t };
    }
    let from = section(0);
    for (let segment = 1; segment <= intervals; segment++) {
      const to = section(segment);
      face(
        lip,
        [from.tx, from.top, from.tz, from.cutoff],
        [to.tx, to.top, to.tz, to.cutoff],
        1 - from.t,
        1 - to.t,
      );
      face(
        cliffs,
        [from.tx, from.cutoff, from.tz, from.bottom],
        [to.tx, to.cutoff, to.tz, to.bottom],
        span * (1 - from.t),
        span * (1 - to.t),
      );
      from = to;
    }
  }
  return { cliffs, lip };
}
