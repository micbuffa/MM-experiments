import { expect, it } from 'vitest';
import { splitBirdBeak } from './birdParts';
it('isolates the thin beak despite repeated UV coordinates outside the unit atlas', () => {
  const indices = [0, 1, 2, 1, 2, 3],
    uvs = [0.0004, 1.49, 0.35, 1.52, 0.4, 1.49, 0.7, 1.6];
  expect(splitBirdBeak(indices, uvs)).toEqual({
    beak: [0, 1, 2],
    body: [1, 2, 3],
  });
  expect(indices).toEqual([0, 1, 2, 1, 2, 3]);
});

it('broadens the beak and shortens the outermost feathers without mutating the animation source', async () => {
  const { fitBirdPoses } = await import('./birdParts');
  const poses = [{ positions: [0.5, 0.2, -6, 10, 0, 3.1, 8.8, 0, 4] }];
  const result = fitBirdPoses(poses, [0]);
  expect(result[0]![0]).toBeCloseTo(0.9);
  expect(result[0]![2]).toBe(-6);
  expect(result[0]![3]).toBe(9);
  expect(poses[0]!.positions[3]).toBe(10);
});
