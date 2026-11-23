import { expect, it } from 'vitest';
import { level5FortCorners } from './level5Fort';
it('builds two inward stone facets per corner and leaves the vertical masonry to terrainCliffs', () => {
  const roof = level5FortCorners(0.8);
  expect(roof.indices).toHaveLength(4 * 2 * 3);
  for (let i = 0; i < roof.positions.length; i += 9) {
    const heights = [1, 4, 7].map((v) => roof.positions[i + v]!);
    expect(heights.sort()).toEqual([0, 0, 0.8]);
  }
  for (let corner = 0; corner < 4; corner++) {
    const start = corner * 18;
    const apex = roof.positions.slice(start, start + 3);
    expect(apex[1]).toBe(0.8);
    expect(Math.abs(apex[0]! - 0.5)).toBe(1.5);
    expect(Math.abs(apex[2]! - 0.5)).toBe(1.5);
  }
});

it('keeps the complete roof and masonry identical under four rotations around the platform centre', async () => {
  const { level5FortGeometry } = await import('./level5Fort');
  const fort = level5FortGeometry(0.8, 1.2);
  const key = (p: readonly number[]) =>
    p.map((n) => Math.round(n * 1e6)).join(',');
  for (const part of Object.values(fort)) {
    const points = new Set<string>();
    for (let i = 0; i < part.positions.length; i += 3)
      points.add(key(part.positions.slice(i, i + 3)));
    for (let i = 0; i < part.positions.length; i += 3) {
      const [x, y, z] = part.positions.slice(i, i + 3);
      expect(points.has(key([1 - z!, y!, x!]))).toBe(true);
      expect(points.has(key([1 - x!, y!, 1 - z!]))).toBe(true);
    }
  }
  const raised = [];
  for (let i = 0; i < fort.corners.positions.length; i += 3)
    if (fort.corners.positions[i + 1] === 0.8)
      raised.push([fort.corners.positions[i], fort.corners.positions[i + 2]]);
  expect(new Set(raised.map((p) => p.join(','))).size).toBe(4);
});

it('makes each quarter a solid ridge rather than a concave diagonal fold', async () => {
  const { VertexData } = await import('@babylonjs/core/Meshes/mesh.vertexData');
  const roof = level5FortCorners(1.2),
    normals: number[] = [];
  VertexData.ComputeNormals(roof.positions, roof.indices, normals);
  for (let q = 0; q < 4; q++) {
    const p = roof.positions.slice(q * 18, q * 18 + 18);
    for (let tri = 0; tri < 2; tri++) {
      const base = q * 6 + tri * 3,
        v = roof.indices[base]!,
        n = normals.slice(v * 3, v * 3 + 3),
        origin = roof.positions.slice(v * 3, v * 3 + 3);
      expect(n[1]).toBeGreaterThan(0);
      for (let i = 0; i < p.length; i += 3)
        expect(
          n.reduce(
            (sum, c, axis) => sum + c * (p[i + axis]! - origin[axis]!),
            0,
          ),
        ).toBeLessThanOrEqual(1e-7);
    }
  }
});
