import { expect, it } from 'vitest';
import { spatialMix } from './spatialMix';
it('keeps the near-field level, attenuates distance and positions the cabinet on either side', () => {
  expect(spatialMix({ x: 0, y: 1.3, z: -0.2, yaw: 0 })).toEqual({
    distance: 0,
    gain: 1,
    pan: 0,
  });
  const left = spatialMix({ x: 3, y: 1.3, z: -0.2, yaw: 0 });
  expect(left.pan).toBe(-1);
  expect(left.gain).toBeCloseTo(0.625);
  expect(spatialMix({ x: -3, y: 1.3, z: -0.2, yaw: 0 }).pan).toBe(1);
  expect(spatialMix({ x: 3, y: 1.3, z: -0.2, yaw: Math.PI }).pan).toBeCloseTo(
    1,
  );
  expect(spatialMix({ x: 10, y: 1.3, z: -0.2, yaw: 0 }).gain).toBeLessThan(
    left.gain,
  );
  expect(spatialMix({ x: 0, y: 1.65, z: -3, yaw: 0 }).pan).toBe(0);
});
it.each(['x', 'y', 'z', 'yaw'] as const)('rejects invalid %s', (key) =>
  expect(() => spatialMix({ x: 0, y: 0, z: 0, yaw: 0, [key]: NaN })).toThrow(
    RangeError,
  ),
);
