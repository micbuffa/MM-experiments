/**
 * Pure touch-trackball + multi-touch boost controller for phones and tablets.
 * DOM-free and deterministic so it can be unit-tested without a browser.
 */

export interface TouchTrackballState {
  steerPointerId: number | null;
  lastX: number;
  lastY: number;
  startX: number;
  startY: number;
  startTimeMs: number;
  totalMovePx: number;
  deltaX: number;
  deltaY: number;
  readonly secondaryPointerIds: Set<number>;
  buttonBoost: boolean;
}

export interface TouchPointerUpOutcome {
  readonly wasTap: boolean;
  readonly swipeDirection: -1 | 0 | 1;
}

export interface TouchTrackballSample {
  readonly sx: number;
  readonly sy: number;
  readonly boost: boolean;
}

const TAP_MAX_DURATION_MS = 260;
const TAP_MAX_MOVE_PX = 14;
const SWIPE_MIN_X_PX = 55;
const SWIPE_MAX_Y_RATIO = 0.65;

export function createTouchTrackballState(): TouchTrackballState {
  return {
    steerPointerId: null,
    lastX: 0,
    lastY: 0,
    startX: 0,
    startY: 0,
    startTimeMs: 0,
    totalMovePx: 0,
    deltaX: 0,
    deltaY: 0,
    secondaryPointerIds: new Set<number>(),
    buttonBoost: false,
  };
}

export function resetTouchTrackball(state: TouchTrackballState): void {
  state.steerPointerId = null;
  state.totalMovePx = 0;
  state.deltaX = 0;
  state.deltaY = 0;
  state.secondaryPointerIds.clear();
  state.buttonBoost = false;
}

export function touchPointerDown(
  state: TouchTrackballState,
  pointerId: number,
  x: number,
  y: number,
  nowMs: number,
): void {
  if (state.steerPointerId === null) {
    state.steerPointerId = pointerId;
    state.startX = x;
    state.startY = y;
    state.lastX = x;
    state.lastY = y;
    state.startTimeMs = nowMs;
    state.totalMovePx = 0;
  } else if (state.steerPointerId !== pointerId) {
    // A second finger anywhere on the playfield activates turbo boost!
    state.secondaryPointerIds.add(pointerId);
  }
}

export function touchPointerMove(
  state: TouchTrackballState,
  pointerId: number,
  x: number,
  y: number,
): void {
  if (state.steerPointerId !== pointerId) return;
  const dx = x - state.lastX;
  const dy = y - state.lastY;
  state.lastX = x;
  state.lastY = y;
  state.deltaX += dx;
  state.deltaY += dy;
  state.totalMovePx += Math.hypot(dx, dy);
}

export function touchPointerUp(
  state: TouchTrackballState,
  pointerId: number,
  x: number,
  y: number,
  nowMs: number,
): TouchPointerUpOutcome {
  if (state.secondaryPointerIds.has(pointerId)) {
    state.secondaryPointerIds.delete(pointerId);
    return { wasTap: false, swipeDirection: 0 };
  }
  if (state.steerPointerId !== pointerId) {
    return { wasTap: false, swipeDirection: 0 };
  }

  const dtMs = Math.max(0, nowMs - state.startTimeMs);
  const netDx = x - state.startX;
  const netDy = y - state.startY;
  const wasTap =
    dtMs <= TAP_MAX_DURATION_MS && state.totalMovePx <= TAP_MAX_MOVE_PX;
  let swipeDirection: -1 | 0 | 1 = 0;
  if (
    !wasTap &&
    Math.abs(netDx) >= SWIPE_MIN_X_PX &&
    Math.abs(netDy) <= Math.abs(netDx) * SWIPE_MAX_Y_RATIO
  ) {
    // Swipe left -> next attract stage (+1), swipe right -> previous (-1)
    swipeDirection = netDx < 0 ? 1 : -1;
  }

  state.steerPointerId = null;
  state.totalMovePx = 0;
  return { wasTap, swipeDirection };
}

export function setTouchButtonBoost(
  state: TouchTrackballState,
  active: boolean,
): void {
  state.buttonBoost = active;
}

export function isTouchBoostActive(state: TouchTrackballState): boolean {
  return state.buttonBoost || state.secondaryPointerIds.size > 0;
}

/**
 * Sample normalized screen-space steering (-1..1) and boost state from the
 * accumulated touch trackball deltas, then apply smooth frame decay.
 */
export function sampleTouchTrackball(
  state: TouchTrackballState,
  agilityFactor: number,
): TouchTrackballSample {
  let sx = 0;
  let sy = 0;
  if (Math.abs(state.deltaX) > 0.01 || Math.abs(state.deltaY) > 0.01) {
    // Touchscreens fire fewer pixels per flick than high-DPI desktop trackpads,
    // so apply a responsive touch gain scaled by the Ball Sensitivity slider.
    const gain = Math.max(0.2, agilityFactor) / 16;
    sx = Math.max(-1, Math.min(1, state.deltaX * gain));
    sy = Math.max(-1, Math.min(1, state.deltaY * gain));
    state.deltaX *= 0.55;
    state.deltaY *= 0.55;
  }
  return {
    sx,
    sy,
    boost: isTouchBoostActive(state),
  };
}
