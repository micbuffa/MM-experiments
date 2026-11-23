import { expect, it } from 'vitest';
import { fitCatapultAxle } from './fitCatapultAxle';

it('recesses both axle ends through every pose without changing the bowl or source', () => {
  const rest = [-9.3, 0, -15, 9.3, 0, -15, 9.1, 2, 6, 0, 0, -12];
  const raised = [-9.3, 1, -12, 9.3, 1, -12, 9.1, 25, -15, 0, 1, -12];
  const model = {
    seconds: 1,
    poses: [rest, raised].map((positions) => ({
      positions,
      normals: Array<number>(12).fill(0),
    })),
    uvs: [],
    groups: {},
  };
  const fitted = fitCatapultAxle(model);
  for (const [i, pose] of fitted.poses.entries()) {
    expect(pose.positions[0]! * 0.119).toBeGreaterThan(-1);
    expect(pose.positions[3]! * 0.119).toBeLessThan(1);
    expect(pose.positions.slice(6)).toEqual(model.poses[i]!.positions.slice(6));
  }
  expect(model.poses[0]!.positions[0]).toBe(-9.3);
  expect(fitted.uvs).toBe(model.uvs);
  expect(fitted.groups).toBe(model.groups);
});
