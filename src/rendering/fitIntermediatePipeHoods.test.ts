import { expect, it } from 'vitest';
import { fitIntermediatePipeHoods } from './fitIntermediatePipeHoods';

it('keeps all hood and lining faces while raising the upper hood roof for marble clearance', () => {
  const floor = ((16176 - 16384) * Math.sqrt(2 / 3)) / 8;
  const source = {
    positions: [14, floor + 1, 20.5, 14, floor + 1, 21.5, 17, floor + 1, 21.5],
    shell: [0, 1, 2],
    interior: [0, 2, 1],
  };
  const before = JSON.stringify(source);
  const fitted = fitIntermediatePipeHoods(source);
  expect(fitted.shell).toEqual(source.shell);
  expect(fitted.interior).toEqual(source.interior);
  expect(fitted.positions).toHaveLength(source.positions.length);
  expect(fitted.positions[1]).toBeGreaterThan(source.positions[1]!);
  expect(fitted.positions.filter((_, i) => i % 3 !== 1)).toEqual(
    source.positions.filter((_, i) => i % 3 !== 1),
  );
  expect(JSON.stringify(source)).toBe(before);
});

it('lowers the fork without moving the upper pipe and keeps thickness at the planar spout', () => {
  const source = {
    positions: [
      17, -24.55, 30.0095, 20, -24.55, 30.0095, 18.5, -24.55, 26.85, 17.1,
      -24.66, 30.0095, 19.9, -24.66, 30.0095, 18.5, -24.66, 26.85, 18.5, -24,
      23.6, 0, -12, 10,
    ],
    shell: [0, 1, 2],
    interior: [3, 4, 5],
  };
  const before = [...source.positions];
  const result = fitIntermediatePipeHoods(source);
  expect(result.positions[19]).toBeCloseTo(-25.45);
  expect(result.positions.slice(21, 24)).toEqual([0, -12, 10]);
  expect(result.positions[1]! - result.positions[10]!).toBeCloseTo(0.11);
  expect(result.positions[7]! - result.positions[16]!).toBeCloseTo(0.11);
  expect(source.positions).toEqual(before);
});

it('keeps the inner and outer roof skins separate even when both use the shell material', () => {
  const source = {
    positions: [
      17, -24.55, 28, 20, -24.55, 28, 20, -24.55, 30, 17, -24.66, 28, 20,
      -24.66, 28, 20, -24.66, 30,
    ],
    normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0],
    shell: [0, 1, 2, 3, 5, 4],
    interior: [],
  };
  const original = JSON.stringify(source);
  const fitted = fitIntermediatePipeHoods(source);
  for (let vertex = 0; vertex < 3; vertex++)
    expect(
      fitted.positions[vertex * 3 + 1]! -
        fitted.positions[(vertex + 3) * 3 + 1]!,
    ).toBeCloseTo(0.11);
  expect(JSON.stringify(source)).toBe(original);
});

it('moves duplicate export vertices together and gives their shared edge continuous normals', () => {
  const source = {
    positions: [
      14, -20.2, 20.5, 15, -20.2, 20.5, 15, -21, 21, 15, -21, 21, 15, -20.2,
      20.5, 16, -20, 21,
    ],
    normals: [0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0],
    shell: [0, 1, 2, 3, 4, 5],
    interior: [],
  };
  const fitted = fitIntermediatePipeHoods(source);
  for (const [a, b] of [
    [2, 3],
    [1, 4],
  ]) {
    expect(fitted.positions.slice(a! * 3, a! * 3 + 3)).toEqual(
      fitted.positions.slice(b! * 3, b! * 3 + 3),
    );
    expect(fitted.normals.slice(a! * 3, a! * 3 + 3)).toEqual(
      fitted.normals.slice(b! * 3, b! * 3 + 3),
    );
  }
});
