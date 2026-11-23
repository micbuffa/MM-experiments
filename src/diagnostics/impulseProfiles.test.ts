import { expect, it } from 'vitest';
import { distributeImpulse } from './impulseProfiles';

it('preserves a fixed total across durations, with at most one count of unevenness', () => {
  for (const total of [0, 1, -1, 416, 1536, -1536, 32767]) {
    for (const duration of [1, 2, 4, 6, 12]) {
      const values = distributeImpulse(total, duration);
      expect(values).toHaveLength(duration);
      expect(values.reduce((a, b) => a + b, 0)).toBe(total);
      expect(Math.max(...values) - Math.min(...values)).toBeLessThanOrEqual(1);
      expect(values.every(Number.isInteger)).toBe(true);
    }
  }
  expect(distributeImpulse(1536, 6)).toEqual([256, 256, 256, 256, 256, 256]);
});
it.each([
  [NaN, 1],
  [Infinity, 1],
  [1.5, 1],
  [32768, 2],
  [1, 0],
  [1, 13],
  [1, 1.5],
])('rejects invalid total/duration %s/%s', (total, duration) => {
  expect(() => distributeImpulse(total, duration)).toThrow(RangeError);
});
