import { expect, it } from 'vitest';
import { renderResolution } from './renderQuality';
it('caps explicit render density without affecting commands', () => {
  expect(renderResolution('eco', 2)).toBe(1);
  expect(renderResolution('balanced', 2)).toBe(1.5);
  expect(renderResolution('retina', 3)).toBe(2);
  expect(renderResolution('balanced', 1)).toBe(1);
  expect(renderResolution('retina', 0.8)).toBe(0.8);
});
it.each([0, -1, NaN, Infinity])('rejects bad DPR %s', (value) =>
  expect(() => renderResolution('retina', value)).toThrow(RangeError),
);
