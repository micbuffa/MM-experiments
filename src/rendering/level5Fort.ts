export const level5FortCornerHeight = 12;

/** Stone roofs of four inward-facing pyramid quarters. */
export function level5FortCorners(rise: number) {
  const positions: number[] = [],
    indices: number[] = [],
    uvs: number[] = [];
  for (const [x, z, corner] of [
    [-1, -1, 0],
    [1, -1, 1],
    [1, 1, 2],
    [-1, 1, 3],
  ]) {
    const square = [
      [x!, z!],
      [x! + 1, z!],
      [x! + 1, z! + 1],
      [x!, z! + 1],
    ];
    const p = [0, 1, 2, 3].map((i) => {
      const v = square[(i + corner!) % 4]!;
      return [v[0]!, i === 0 ? rise : 0, v[1]!];
    });
    for (const triangle of [
      [0, 1, 2],
      [0, 2, 3],
    ]) {
      const start = positions.length / 3;
      for (const v of triangle) {
        positions.push(...p[v!]!);
        uvs.push(p[v!]![0]!, p[v!]![2]!);
      }
      indices.push(start, start + 1, start + 2);
    }
  }
  return { positions, indices, uvs };
}

/** A complete symmetric fort cap and its masonry, independent of the collision
 * sampler's corner triangulation. The surrounding terrain stays at its foot.
 */
export function level5FortGeometry(rise: number, drop: number) {
  const cornersRoof = level5FortCorners(rise);
  const roof = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
  };
  for (let z = -1; z < 2; z++)
    for (let x = -1; x < 2; x++) {
      if (x !== 0 && z !== 0) continue;
      const start = roof.positions.length / 3;
      roof.positions.push(x, 0, z, x + 1, 0, z, x + 1, 0, z + 1, x, 0, z + 1);
      roof.uvs.push(x, z, x + 1, z, x + 1, z + 1, x, z + 1);
      roof.indices.push(
        start,
        start + 1,
        start + 2,
        start,
        start + 2,
        start + 3,
      );
    }
  const walls = {
    positions: [] as number[],
    indices: [] as number[],
    uvs: [] as number[],
  };
  const corners = [
    [-1, -1],
    [2, -1],
    [2, 2],
    [-1, 2],
  ] as const;
  for (let side = 0; side < 4; side++) {
    const a = corners[side]!,
      b = corners[(side + 1) % 4]!;
    for (let step = 0; step < 3; step++) {
      const ax = a[0] + ((b[0] - a[0]) * step) / 3,
        az = a[1] + ((b[1] - a[1]) * step) / 3;
      const bx = a[0] + ((b[0] - a[0]) * (step + 1)) / 3,
        bz = a[1] + ((b[1] - a[1]) * (step + 1)) / 3;
      const ay = step === 0 ? rise : 0,
        by = step === 2 ? rise : 0,
        start = walls.positions.length / 3;
      walls.positions.push(
        bx,
        by,
        bz,
        ax,
        ay,
        az,
        ax,
        -drop,
        az,
        bx,
        -drop,
        bz,
      );
      walls.indices.push(
        start,
        start + 1,
        start + 2,
        start,
        start + 2,
        start + 3,
      );
      walls.uvs.push(step + 1, by, step, ay, step, -drop, step + 1, -drop);
    }
  }
  return { roof, corners: cornersRoof, walls };
}
