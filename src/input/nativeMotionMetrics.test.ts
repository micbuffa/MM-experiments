import { describe, expect, it } from 'vitest';
import { createNativeMotionMetrics } from './nativeMotionMetrics';

describe('dernier poll natif échantillonné après une itération', () => {
  it('conserve les extrema signés et le dernier mouvement après des zéros', () => {
    const metrics = createNativeMotionMetrics();
    metrics.sample(360, -270);
    metrics.sample(-100, 80);
    metrics.sample(0, 0);
    expect(metrics.snapshot).toEqual({
      iterations: 3,
      nonzeroSamples: 2,
      minX: -100,
      maxX: 360,
      minY: -270,
      maxY: 80,
      reversalsX: 1,
      reversalsY: 1,
      lastNonzeroX: -100,
      lastNonzeroY: 80,
    });
  });
  it('compte les inversions par axe, y compris séparées par des zéros', () => {
    const metrics = createNativeMotionMetrics();
    for (const [x, y] of [
      [5, 0],
      [5, 6],
      [0, 0],
      [-2, 4],
      [-3, -1],
      [8, 0],
    ] as const)
      metrics.sample(x, y);
    expect(metrics.snapshot).toMatchObject({ reversalsX: 2, reversalsY: 1 });
  });
  it('une pause rompt les séquences sans effacer les mesures', () => {
    const metrics = createNativeMotionMetrics();
    metrics.sample(10, -20);
    metrics.breakSequence();
    expect(metrics.snapshot).toMatchObject({ maxX: 10, minY: -20 });
    metrics.sample(-10, 20);
    expect(metrics.snapshot).toMatchObject({ reversalsX: 0, reversalsY: 0 });
  });
  it('réinitialise tout sans exposer de référence mutable', () => {
    const metrics = createNativeMotionMetrics();
    metrics.sample(7, 8);
    const snapshot = metrics.snapshot;
    snapshot.maxX = 1000;
    expect(metrics.snapshot.maxX).toBe(7);
    metrics.reset();
    expect(Object.values(metrics.snapshot).every((value) => value === 0)).toBe(
      true,
    );
    metrics.sample(-2, -3);
    expect(metrics.snapshot).toMatchObject({
      iterations: 1,
      reversalsX: 0,
      reversalsY: 0,
    });
  });
  it.each([NaN, Infinity, -Infinity])(
    'rejette %s sans modifier les statistiques',
    (value) => {
      const metrics = createNativeMotionMetrics();
      expect(() => metrics.sample(value, 0)).toThrow(RangeError);
      expect(() => metrics.sample(0, value)).toThrow(RangeError);
      expect(metrics.snapshot.iterations).toBe(0);
    },
  );
});
