import { expect, it } from 'vitest';
import { advanceOcclusionFade } from './occlusionFade';
it('opens and restores visibility quickly and continuously without overshooting', () => {
  let fade = 0;
  const first = advanceOcclusionFade(fade, true, 1 / 60);
  expect(first).toBeGreaterThan(0);
  expect(first).toBeLessThan(1);
  for (let i = 0; i < 12; i++) fade = advanceOcclusionFade(fade, true, 1 / 60);
  expect(fade).toBeGreaterThan(0.95);
  const reversing = advanceOcclusionFade(fade, false, 1 / 60);
  expect(reversing).toBeLessThan(fade);
  expect(reversing).toBeGreaterThan(0);
  for (let i = 0; i < 50; i++) fade = advanceOcclusionFade(fade, false, 1 / 60);
  expect(fade).toBe(0);
  for (let i = 0; i < 50; i++) fade = advanceOcclusionFade(fade, true, 0.05);
  expect(fade).toBe(1);
});
it('freezes without elapsed time and bounds a long frame', () => {
  for (const seconds of [0, -1, NaN, Infinity])
    expect(advanceOcclusionFade(0.4, true, seconds)).toBe(0.4);
  expect(advanceOcclusionFade(0, true, 5)).toBe(
    advanceOcclusionFade(0, true, 0.1),
  );
});
