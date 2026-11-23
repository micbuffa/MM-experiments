import { expect, it } from 'vitest';
import { parseIntermediatePipeGeometry } from './intermediatePipeGeometry';

const model = {
  positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
  shell: [0, 1, 2],
  interior: [2, 1, 0],
};

it('keeps the shell and interior triangles in the same coordinate system', () => {
  expect(parseIntermediatePipeGeometry(model)).toEqual(model);
});

it('retains the smooth normals from newer local surveys', () => {
  const normals = [0, 0, 1, 0, 0, 1, 0, 0, 1];
  expect(parseIntermediatePipeGeometry({ ...model, normals }).normals).toEqual(
    normals,
  );
});

it.each([
  null,
  'mesh',
  {},
  { ...model, positions: [] },
  { ...model, positions: [...model.positions, 0] },
  { ...model, positions: Array(6003).fill(0) },
  { ...model, positions: [...model.positions.slice(0, 8), Infinity] },
  { ...model, positions: [140, ...model.positions.slice(1)] },
  { ...model, positions: ['0', ...model.positions.slice(1)] },
  { ...model, normals: null },
  { ...model, normals: [0, 0, 1] },
  { ...model, normals: [0, 0, 2, 0, 0, 1, 0, 0, 1] },
  { ...model, shell: null },
  { ...model, shell: [0, 1] },
  { ...model, shell: [0, 1, 2, 0] },
  { ...model, shell: Array(6003).fill(0) },
  { ...model, shell: [0, 1, '2'] },
  { ...model, shell: [0, 1, 1.25] },
  { ...model, shell: [0, 1, -2] },
  { ...model, interior: [0, 1, 3] },
])('rejects invalid local geometry %#', (geometry) => {
  expect(() => parseIntermediatePipeGeometry(geometry)).toThrow('Géométrie');
});
