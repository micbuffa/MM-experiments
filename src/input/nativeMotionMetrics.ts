/** Échantillons du dernier poll natif, pas un décompte exhaustif des polls MAME. */
export function createNativeMotionMetrics() {
  let previousX = 0;
  let previousY = 0;
  const metrics = {
    iterations: 0,
    nonzeroSamples: 0,
    minX: 0,
    maxX: 0,
    minY: 0,
    maxY: 0,
    reversalsX: 0,
    reversalsY: 0,
    lastNonzeroX: 0,
    lastNonzeroY: 0,
  };
  function breakSequence() {
    previousX = previousY = 0;
  }
  return {
    sample(x: number, y: number) {
      if (!Number.isFinite(x) || !Number.isFinite(y))
        throw new RangeError('Échantillon natif non fini.');
      metrics.iterations++;
      if (x !== 0 || y !== 0) metrics.nonzeroSamples++;
      metrics.minX = Math.min(metrics.minX, x);
      metrics.maxX = Math.max(metrics.maxX, x);
      metrics.minY = Math.min(metrics.minY, y);
      metrics.maxY = Math.max(metrics.maxY, y);
      if (x !== 0) {
        if (previousX !== 0 && Math.sign(x) !== Math.sign(previousX))
          metrics.reversalsX++;
        previousX = metrics.lastNonzeroX = x;
      }
      if (y !== 0) {
        if (previousY !== 0 && Math.sign(y) !== Math.sign(previousY))
          metrics.reversalsY++;
        previousY = metrics.lastNonzeroY = y;
      }
    },
    breakSequence,
    reset() {
      for (const key of Object.keys(metrics) as Array<keyof typeof metrics>)
        metrics[key] = 0;
      breakSequence();
    },
    get snapshot() {
      return { ...metrics };
    },
  };
}
