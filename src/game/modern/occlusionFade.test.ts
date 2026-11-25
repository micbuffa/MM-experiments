import { expect, it } from 'vitest';
import {
  advanceOcclusionFade,
  isMarbleOccludedByTerrain,
} from './occlusionFade';
import type { TerrainCell } from './terrainMesh';
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

it('detects terrain ridges crossing the eye-to-marble ray without false positives on flat or sloped floors', () => {
  expect(
    isMarbleOccludedByTerrain({ x: 0, y: 3, z: -6 }, { x: 0, y: 1, z: 0 }, []),
  ).toBe(false);
  const flat: TerrainCell[][] = Array.from({ length: 12 }, () =>
    Array.from({ length: 12 }, () => [0, 0, 0, 0] as const),
  );
  // Open flat floor: sightline stays well above ground.
  expect(
    isMarbleOccludedByTerrain(
      { x: 0, y: 3, z: -5 },
      { x: 0, y: 0.675, z: 2 },
      flat,
    ),
  ).toBe(false);
  // Downhill slope behind marble: sightline still clears the ground.
  const slope: TerrainCell[][] = Array.from({ length: 12 }, (_, z) =>
    Array.from({ length: 12 }, () => {
      const h = (6 - z) * 0.35;
      return [h, h, h - 0.35, h - 0.35] as const;
    }),
  );
  expect(
    isMarbleOccludedByTerrain(
      { x: 0, y: 4.5, z: -4 },
      { x: 0, y: 0.675, z: 2 },
      slope,
    ),
  ).toBe(false);
  // High wall/ridge rising between eye and marble: triggers occlusion.
  const walled = flat.map((row) => row.slice());
  walled[5]![6] = [4, 4, 4, 4];
  expect(
    isMarbleOccludedByTerrain(
      { x: 0.5, y: 2.5, z: -4 },
      { x: 0.5, y: 0.675, z: 2 },
      walled,
    ),
  ).toBe(true);
  // Partial-corner cell still reports occlusion when its valid corners rise above the ray.
  const partial = flat.map((row) => row.slice());
  partial[5]![6] = [null, 4, null, null];
  expect(
    isMarbleOccludedByTerrain(
      { x: 0.5, y: 2.5, z: -4 },
      { x: 0.5, y: 0.675, z: 2 },
      partial,
    ),
  ).toBe(true);
});
