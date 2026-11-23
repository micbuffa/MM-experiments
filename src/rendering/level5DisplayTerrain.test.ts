import { expect, it } from 'vitest';
import { level5DisplayTerrain } from './level5DisplayTerrain';
import type { TerrainCell } from '../game/modern/terrainMesh';
it('repairs the extraneous fourth lookup corner without changing native survey cells', () => {
  const cells: TerrainCell[][] = [
    [[2, 3, 3, 8], [2, 2, 1, null], null, [null, 0, 0, 0]],
  ];
  expect(level5DisplayTerrain(cells)).toEqual([
    [[2, 3, 3, 2], [2, 2, 1, 1], null, [null, 0, 0, 0]],
  ]);
  expect(cells[0]![0]).toEqual([2, 3, 3, 8]);
});

it('keeps the fort base flat before inserting the inward stone roof facets', () => {
  const cells = Array.from({ length: 40 }, () =>
    Array<TerrainCell>(40).fill(null),
  );
  for (let z = 26; z < 29; z++)
    for (let x = 35; x < 38; x++) cells[z]![x] = [0, 0, 0, 0];
  const display = level5DisplayTerrain(cells);
  for (let z = 26; z < 29; z++)
    for (let x = 35; x < 38; x++)
      expect(new Set(display[z]![x])).toHaveProperty('size', 1);
});

it('keeps both arena ridge lines below their shared crest and joins both planar flanks', () => {
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  const raw = (h: number) => ((h - 16384) * Math.sqrt(2 / 3)) / 8;
  for (const [x, z] of [
    [106, 97],
    [96, 107],
  ]) {
    cells[z!]![x!] = [raw(16244), raw(16240), raw(16244), raw(16244)];
    cells[z! + 1]![x!] = [raw(16240), raw(16244), raw(16240), raw(16236)];
  }
  const display = level5DisplayTerrain(cells);
  for (const [x, z] of [
    [106, 97],
    [96, 107],
  ]) {
    const ridge = display[z!]![x!]!,
      next = display[z! + 1]![x!]!;
    expect(
      Math.max(...ridge.filter((height): height is number => height !== null)),
    ).toBeCloseTo(raw(16244));
    expect(ridge[3]).toBeCloseTo(raw(16240));
    expect(ridge[3]).toBe(next[0]);
    expect(ridge[2]).toBe(next[1]);
  }
});

it('applies half-size tiles to the arena floor and raised block tops without UV jumps on neighbouring ramps', async () => {
  const { level5Surface } = await import('./level5DisplayTerrain');
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  cells[92]![92] = [-14, -14, -14, -14];
  cells[93]![92] = [-13, -13, -13, -13];
  cells[113]![99] = [-15, -15, -15.4, -15.4];
  const geometry = level5Surface(cells);
  for (let i = 0; i < geometry.indices.length; i += 3) {
    const tri = geometry.indices.slice(i, i + 3);
    const inside = geometry.positions[tri[0]! * 3 + 2]! + 65 < 100;
    for (const [a, b] of [
      [tri[0]!, tri[1]!],
      [tri[1]!, tri[2]!],
    ]) {
      expect(geometry.uvs[b! * 2]! - geometry.uvs[a! * 2]!).toBeCloseTo(
        (geometry.positions[b! * 3]! - geometry.positions[a! * 3]!) *
          (inside ? 2 : 1),
      );
      expect(geometry.uvs[b! * 2 + 1]! - geometry.uvs[a! * 2 + 1]!).toBeCloseTo(
        (geometry.positions[b! * 3 + 2]! - geometry.positions[a! * 3 + 2]!) *
          (inside ? 2 : 1),
      );
    }
  }
});

it('makes the small arena entry ramp planar and joined across both lanes', () => {
  const cells = Array.from({ length: 100 }, () =>
    Array<TerrainCell>(100).fill(null),
  );
  for (let z = 95; z < 97; z++)
    for (let x = 90; x < 93; x++) cells[z]![x] = [0, 1, 3, 8];
  const display = level5DisplayTerrain(cells);
  for (let z = 95; z < 97; z++)
    for (let x = 90; x < 93; x++) {
      const cell = display[z]![x]!;
      expect(cell[0]).toBe(cell[3]);
      expect(cell[1]).toBe(cell[2]);
      if (x < 92) expect(cell[1]).toBe(display[z]![x + 1]![0]);
      expect(cell).toEqual(display[95]![x]);
    }
});

it('joins the goal end wall directly to the sloping lower path and merges the former isolated ledges', () => {
  const cells = Array.from({ length: 45 }, () =>
    Array<TerrainCell>(45).fill(null),
  );
  const display = level5DisplayTerrain(cells),
    raw = (v: number) => Math.round((v * 8) / Math.sqrt(2 / 3) + 16384);
  for (let x = 25; x < 29; x++) {
    expect(display[33]![x]!.map((v) => raw(v!))).toEqual([
      16416, 16416, 16416, 16416,
    ]);
    const path = display[34]![x]!;
    expect(path).toEqual(display[35]![x]);
    expect(path[0]!).toBeLessThan(display[33]![x]![3]!);
    if (x < 28) expect(path[1]).toBe(display[34]![x + 1]![0]);
  }
  expect(raw(display[30]![20]![0]!)).toBe(16416);
  expect(display[30]![20]).toEqual(display[24]![20]);
});

it('preserves the arcade projection when placing the lower finish collision strip on its visible platform', async () => {
  const { level5FinishDepth, level5Goal } =
    await import('./level5DisplayTerrain');
  const { projectPracticePoint } =
    await import('../game/modern/practiceProjection');
  expect(level5Goal).toEqual({ x: 25, z: 24, width: 4, length: 10 });
  const offset = level5FinishDepth(21 * 8, 22 * 8, 16368);
  expect(offset).toBe(48);
  expect(
    projectPracticePoint(168 + offset, 176 + offset, 16368 + offset),
  ).toEqual(projectPracticePoint(168, 176, 16368));
  expect(level5FinishDepth(29 * 8, 34 * 8, 16368)).toBe(0);
  expect(level5FinishDepth(30 * 8, 16 * 8, 16368)).toBe(0);
  expect(level5FinishDepth(30 * 8, 16 * 8, 16368, true)).toBe(48);
  expect(level5FinishDepth(29 * 8 + 4, 16 * 8, 16368)).toBe(48);
  expect(level5FinishDepth(26 * 8, 16 * 8, 16368)).toBe(48);
  expect(level5FinishDepth(168, 176, 16416)).toBe(0);
});

it('clips square ears from the diagonal boundary, including repaired platform cells', () => {
  const cells = Array.from({ length: 45 }, () =>
    Array<TerrainCell>(45).fill(null),
  );
  for (let z = 21; z <= 42; z++) cells[z]![z - 21] = [0, 0, 0, 0];
  const display = level5DisplayTerrain(cells);
  for (let z = 21; z <= 42; z++) expect(display[z]![z - 21]![3]).toBeNull();
});

it('drops the foreign upper sample at the opposite diagonal without introducing a raised point', () => {
  const cells = Array.from({ length: 30 }, () =>
    Array<TerrainCell>(50).fill(null),
  );
  const raw = (v: number) => ((v - 16384) * Math.sqrt(2 / 3)) / 8;
  cells[14]![35] = [raw(16368), raw(16384), raw(16368), raw(16368)];
  const display = level5DisplayTerrain(cells);
  expect(display[14]![35]![1]).toBeNull();
  for (const i of [0, 2, 3])
    expect(display[14]![35]![i]!).toBeCloseTo(raw(16368));
});

it('clips both diagonal cliff boundaries throughout the race without foreign peaks or square teeth', async () => {
  const { level5Surface } = await import('./level5DisplayTerrain');
  const cells = Array.from({ length: 141 }, () =>
    Array<TerrainCell>(141).fill(null),
  );
  for (let z = 60; z < 92; z++)
    for (let x = z - 21; x <= z + 21; x++) cells[z]![x] = [0, 0, 0, 0];
  for (let z = 60; z < 92; z++) cells[z]![z + 21] = [0, 2, 0, 0];
  const display = level5DisplayTerrain(cells);
  for (let z = 60; z < 92; z++) {
    expect(display[z]![z + 21]).toEqual([0, null, 0, 0]);
    expect(display[z]![z - 21]).toEqual([0, 0, 0, null]);
  }
  const mesh = level5Surface(display);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const z = mesh.positions[i + 2]! + 70.5;
    if (z < 60 || z > 92) continue;
    const d = mesh.positions[i]! - mesh.positions[i + 2]!;
    expect(d).toBeGreaterThanOrEqual(-21);
    expect(d).toBeLessThanOrEqual(21);
    expect(mesh.positions[i + 1]).toBe(0);
  }
});

it('completes the missing SW sample of a straight interior ledge instead of cutting a tooth from every tile', async () => {
  const { level5Surface } = await import('./level5DisplayTerrain');
  const cells = Array.from({ length: 60 }, () =>
    Array<TerrainCell>(60).fill(null),
  );
  for (let x = 42; x < 49; x++) cells[28]![x] = [0, 0, 0, null];
  const display = level5DisplayTerrain(cells);
  for (let x = 42; x < 49; x++) expect(display[28]![x]).toEqual([0, 0, 0, 0]);
  const mesh = level5Surface(display);
  const tris = mesh.indices
    .filter((_, i) => i % 3 === 0)
    .filter((_, t) => {
      const indices = mesh.indices.slice(t * 3, t * 3 + 3);
      return indices.every(
        (v) =>
          mesh.positions[v * 3]! + 30 >= 42 &&
          mesh.positions[v * 3]! + 30 <= 49 &&
          mesh.positions[v * 3 + 2]! + 30 >= 28 &&
          mesh.positions[v * 3 + 2]! + 30 <= 29,
      );
    });
  expect(tris).toHaveLength(7 * 2);
});
