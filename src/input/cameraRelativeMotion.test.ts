import { expect, it } from 'vitest';
import { createCameraRelativeMotion } from './cameraRelativeMotion';

it('preserves arcade controls and rotates both motion axes relative to the current view', () => {
  const input = createCameraRelativeMotion();
  expect(input.transform(3, -4)).toEqual([3, -4]);
  input.setForward(-1, -1);
  expect(input.transform(3, -4)[0]).toBeCloseTo(3);
  expect(input.transform(3, -4)[1]).toBeCloseTo(-4);
  input.setForward(1, 1);
  const [x, y] = input.transform(3, -4);
  // Screen forward-right becomes world forward-right from a downhill camera.
  expect(y - x).toBeGreaterThan(0);
  expect(y + x).toBeGreaterThan(0);
  expect(Math.hypot(x, y)).toBeCloseTo(5);
  input.setForward(1, 0);
  const [side, forward] = input.transform(0, -5);
  expect(forward - side).toBeGreaterThan(0);
  expect(forward + side).toBeCloseTo(0);
  input.setForward(0, 0);
  expect(input.transform(3, -4)).toEqual([3, -4]);
});
