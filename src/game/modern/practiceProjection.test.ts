import { expect, it } from 'vitest';
import { practiceWorldPoint, projectPracticePoint } from './practiceProjection';

it('projects an airborne marble within the optional margin of the surveyed surface', () => {
  expect(
    practiceWorldPoint(750, 528, 0x4008, 91, 91, { x: 0, z: 0 }),
  ).toBeNull();
  expect(
    practiceWorldPoint(750, 528, 0x4008, 91, 91, { x: 0, z: 0 }, 6)?.x,
  ).toBeCloseTo(48.25);
  expect(
    practiceWorldPoint(900, 528, 0x4008, 91, 91, { x: 0, z: 0 }, 6),
  ).toBeNull();
});

it('projects the measured start and advances each horizontal axis in its arcade direction', () => {
  expect(projectPracticePoint(140, 140, 0x4000)).toEqual({ x: 159, y: 48 });
  expect(projectPracticePoint(148, 140, 0x4000)).toEqual({ x: 151, y: 52 });
  expect(projectPracticePoint(140, 148, 0x4002)).toEqual({ x: 167, y: 50 });
});

it('maps the live start and elevated poses into the surveyed mesh', () => {
  expect(practiceWorldPoint(140, 140, 0x4000, 20, 14)).toEqual({
    x: -2.5,
    y: 0,
    z: -0.5,
  });
  const point = practiceWorldPoint(132, 148, 0x4008, 20, 14);
  expect(point).toMatchObject({ x: -3.5, z: 0.5 });
  expect(point?.y).toBeCloseTo(Math.sqrt(2 / 3));
});

it.each([
  [79, 140, 0x4000],
  [240, 140, 0x4000],
  [140, 87, 0x4000],
  [140, 200, 0x4000],
  [140, 140, 0x3eff],
])('rejects poses outside the surveyed volume (%i, %i, %i)', (x, z, height) => {
  expect(practiceWorldPoint(x, z, height, 20, 14)).toBeNull();
});
