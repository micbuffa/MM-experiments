import { expect, it } from 'vitest';
import type { IntermediatePipeGeometry } from '../game/modern/intermediatePipeGeometry';
import { refineIntermediatePipe } from './refineIntermediatePipe';
import { fitIntermediatePipeHoods } from './fitIntermediatePipeHoods';

/** Hollow square tube with lips joining outer and inner skins at both ends. */
function hollowTube(): IntermediatePipeGeometry {
  const positions: number[] = [],
    shell: number[] = [],
    interior: number[] = [];
  for (const radius of [1, 0.8])
    for (const z of [20, 22])
      for (const [x, y] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ])
        positions.push(15.5 + x! * radius, -22.5 + y! * radius, z);
  const quad = (target: number[], a: number, b: number, c: number, d: number) =>
    target.push(a, b, c, a, c, d);
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    quad(shell, i, i + 4, j + 4, j);
    quad(i === 0 ? interior : shell, i + 8, j + 8, j + 12, i + 12);
    quad(shell, i, j, j + 8, i + 8);
    quad(shell, i + 4, i + 12, j + 12, j + 4);
  }
  return { positions, shell, interior };
}

function inspect(model: IntermediatePipeGeometry) {
  const edges = new Map<string, number[]>(),
    ids = [...model.shell, ...model.interior],
    p = model.positions;
  const position = (id: number) => p.slice(id * 3, id * 3 + 3);
  const key = (id: number) =>
    position(id)
      .map((value) => Math.round(value * 10000))
      .join(',');
  let degenerate = 0;
  for (let i = 0; i < ids.length; i += 3) {
    const triangle = ids.slice(i, i + 3);
    for (let j = 0; j < 3; j++) {
      const a = key(triangle[j]!),
        b = key(triangle[(j + 1) % 3]!);
      const edge = [a, b].sort().join('/'),
        directions = edges.get(edge) ?? [];
      directions.push(a < b ? 1 : -1);
      edges.set(edge, directions);
    }
    const [a, b, c] = triangle.map(position),
      u = b!.map((v, i) => v - a![i]!),
      v = c!.map((v, i) => v - a![i]!);
    const area = Math.hypot(
      u[1]! * v[2]! - u[2]! * v[1]!,
      u[2]! * v[0]! - u[0]! * v[2]!,
      u[0]! * v[1]! - u[1]! * v[0]!,
    );
    if (area < 1e-8) degenerate++;
  }
  return {
    open: [...edges.values()].filter((d) => d.length !== 2).length,
    inconsistent: [...edges.values()].filter(
      (d) => d.reduce((a, b) => a + b, 0) !== 0,
    ).length,
    degenerate,
  };
}

it('refines both skins and their lips without opening the wall or reversing adjacent faces', () => {
  const source = hollowTube(),
    before = JSON.stringify(source);
  const refined = refineIntermediatePipe(source);
  expect(inspect(source)).toEqual({ open: 0, inconsistent: 0, degenerate: 0 });
  expect(inspect(refined)).toEqual({ open: 0, inconsistent: 0, degenerate: 0 });
  expect(refined.shell.length + refined.interior.length).toBe(
    4 * (source.shell.length + source.interior.length),
  );
  expect(JSON.stringify(source)).toBe(before);
});

it('keeps the complete fitted wall closed with finite unit normals and identical duplicate vertices', () => {
  const source = hollowTube(),
    fitted = fitIntermediatePipeHoods(source);
  expect(inspect(fitted)).toEqual({ open: 0, inconsistent: 0, degenerate: 0 });
  const ids = new Set([...fitted.shell, ...fitted.interior]);
  for (const id of ids)
    expect(Math.hypot(...fitted.normals.slice(id * 3, id * 3 + 3))).toBeCloseTo(
      1,
    );
  // An undeformed separate J component remains fixed.
  const offset = source.positions.length / 3;
  const withJ = {
    positions: [...source.positions, 0, 0, 10, 1, 0, 10, 0, 1, 10],
    shell: [...source.shell, offset, offset + 1, offset + 2],
    interior: source.interior,
  };
  expect(
    fitIntermediatePipeHoods(withJ).positions.slice(offset * 3, offset * 3 + 9),
  ).toEqual([0, 0, 10, 1, 0, 10, 0, 1, 10]);
});

it('leaves partial exports unchanged rather than subdividing a broken boundary', () => {
  const source = {
    positions: [0, 0, 20, 1, 0, 20, 0, 1, 21],
    shell: [0, 1, 2],
    interior: [],
  };
  expect(refineIntermediatePipe(source)).toBe(source);
});

it('keeps the intake aperture open while the lip and both wall skins remain connected', () => {
  const refined = refineIntermediatePipe(hollowTube());
  const faces = [...refined.shell, ...refined.interior],
    p = refined.positions;
  let coversAperture = false;
  for (let i = 0; i < faces.length; i += 3) {
    const t = faces
      .slice(i, i + 3)
      .map((index) => p.slice(index * 3, index * 3 + 3));
    if (!t.every((point) => Math.abs(point[2]! - 20) < 1e-6)) continue;
    const [a, b, c] = t;
    const det =
      (b![0]! - a![0]!) * (c![1]! - a![1]!) -
      (b![1]! - a![1]!) * (c![0]! - a![0]!);
    if (Math.abs(det) < 1e-8) continue;
    const u =
      ((15.5 - a![0]!) * (c![1]! - a![1]!) -
        (-22.5 - a![1]!) * (c![0]! - a![0]!)) /
      det;
    const v =
      ((b![0]! - a![0]!) * (-22.5 - a![1]!) -
        (b![1]! - a![1]!) * (15.5 - a![0]!)) /
      det;
    if (u >= 0 && v >= 0 && u + v <= 1) coversAperture = true;
  }
  expect(coversAperture).toBe(false);
  expect(inspect(refined).open).toBe(0);
});
