export interface TouchTrackballDelta {
  readonly dx: number;
  readonly dy: number;
}

export interface TouchTrackballController {
  readonly active: boolean;
  readonly boostActive: boolean;
  pointerDown(pointerId: number, x: number, y: number): void;
  pointerMove(
    pointerId: number,
    x: number,
    y: number,
  ): TouchTrackballDelta | null;
  pointerUp(pointerId: number): void;
  reset(): void;
}

const DEFAULT_TOUCH_GAIN = 3.4;
const MAX_STEP_DELTA = 180;
const FLICK_CURVE_PIXELS = 24;
const MAX_FLICK_BOOST = 1.85;

function clampDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-MAX_STEP_DELTA, Math.min(MAX_STEP_DELTA, value));
}

/**
 * Pure multi-touch trackball state machine for mobile/tablet play:
 * - Primary finger drags produce relative trackball (dx, dy) deltas.
 * - Any additional simultaneous finger on the playfield holds turbo boost.
 */
export function createTouchTrackball(
  gain = DEFAULT_TOUCH_GAIN,
): TouchTrackballController {
  let primaryId: number | null = null;
  let lastX = 0;
  let lastY = 0;
  const secondaryIds = new Set<number>();

  return {
    get active(): boolean {
      return primaryId !== null;
    },
    get boostActive(): boolean {
      return secondaryIds.size > 0;
    },
    pointerDown(pointerId: number, x: number, y: number): void {
      if (primaryId === null) {
        primaryId = pointerId;
        lastX = x;
        lastY = y;
      } else if (pointerId !== primaryId) {
        secondaryIds.add(pointerId);
      }
    },
    pointerMove(
      pointerId: number,
      x: number,
      y: number,
    ): TouchTrackballDelta | null {
      if (pointerId !== primaryId) return null;
      const rawX = x - lastX;
      const rawY = y - lastY;
      lastX = x;
      lastY = y;
      if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;
      const dist = Math.hypot(rawX, rawY);
      if (dist === 0) return null;
      // Snappy arcade trackball feel on small phone screens: precise on slow drifts,
      // progressive acceleration on fast thumb flicks.
      const flickBoost = Math.min(
        MAX_FLICK_BOOST,
        1 + dist / FLICK_CURVE_PIXELS,
      );
      const scale = gain * flickBoost;
      const dx = clampDelta(rawX * scale);
      const dy = clampDelta(rawY * scale);
      if (dx === 0 && dy === 0) return null;
      return { dx, dy };
    },
    pointerUp(pointerId: number): void {
      if (pointerId === primaryId) {
        primaryId = null;
        return;
      }
      secondaryIds.delete(pointerId);
    },
    reset(): void {
      primaryId = null;
      secondaryIds.clear();
    },
  };
}
