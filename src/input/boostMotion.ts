/** Assistance de commande autorisée par Michel ; aucune physique ou RAM de jeu modifiée. */
// A sustained 256-count input accelerated faster in the core. Larger
// individual pulses can reverse the visible response.
export const BOOST_COUNTS_PER_ITERATION = 256;
const MAX_HEADING_AGE_SECONDS = 0.25;

export function createBoostMotion() {
  let held = false;
  let heading: readonly [number, number] | null = null;
  let lastDirectionSeconds = -Infinity;
  const metrics = { iterations: 0, sentX: 0, sentY: 0 };
  function validateTime(seconds: number) {
    if (!Number.isFinite(seconds)) throw new RangeError('Invalid boost time');
  }
  return {
    observe(x: number, y: number, seconds: number) {
      validateTime(seconds);
      if (![x, y].every(Number.isFinite))
        throw new RangeError('Invalid boost direction');
      const length = Math.abs(x) + Math.abs(y);
      if (!Number.isFinite(length))
        throw new RangeError('Invalid boost magnitude');
      if (!length) return;
      const dx =
        Math.round((Math.abs(x) / length) * BOOST_COUNTS_PER_ITERATION) *
        Math.sign(x);
      const dy = (BOOST_COUNTS_PER_ITERATION - Math.abs(dx)) * Math.sign(y);
      heading = [dx || 0, dy || 0];
      lastDirectionSeconds = seconds;
    },
    press(seconds: number) {
      validateTime(seconds);
      if (held) return;
      if (seconds - lastDirectionSeconds > MAX_HEADING_AGE_SECONDS)
        heading = null;
      held = true;
    },
    release() {
      held = false;
    },
    reset() {
      held = false;
      heading = null;
      lastDirectionSeconds = -Infinity;
    },
    resetMetrics() {
      metrics.iterations = metrics.sentX = metrics.sentY = 0;
    },
    next(): readonly [number, number] | null {
      if (!held || !heading) return null;
      metrics.iterations++;
      metrics.sentX += heading[0];
      metrics.sentY += heading[1];
      // Reuse the direction, no allocation in the emulation loop.
      return heading;
    },
    get held() {
      return held;
    },
    get snapshot() {
      return {
        mode: 'held-directional-trackball',
        held,
        active: held && heading !== null,
        countsPerIterationL1: BOOST_COUNTS_PER_ITERATION,
        direction: heading ? [...heading] : null,
        ...metrics,
      };
    },
  };
}
