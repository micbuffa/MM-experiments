import { describe, expect, it } from 'vitest';
import {
  createTouchTrackballState,
  isTouchBoostActive,
  resetTouchTrackball,
  sampleTouchTrackball,
  setTouchButtonBoost,
  touchPointerDown,
  touchPointerMove,
  touchPointerUp,
} from './remasterTouch';

describe('remasterTouch', () => {
  it('converts finger drag deltas into normalized trackball steering with decay', () => {
    const state = createTouchTrackballState();
    touchPointerDown(state, 1, 100, 100, 1000);
    touchPointerMove(state, 1, 120, 90);

    const first = sampleTouchTrackball(state, 0.8);
    expect(first.sx).toBeGreaterThan(0.5);
    expect(first.sy).toBeLessThan(-0.3);
    expect(first.boost).toBe(false);

    // Next frame without movement decays smoothly toward zero
    const second = sampleTouchTrackball(state, 0.8);
    expect(Math.abs(second.sx)).toBeLessThan(Math.abs(first.sx));
    expect(Math.abs(second.sy)).toBeLessThan(Math.abs(first.sy));

    // Movement from an untracked pointer is ignored
    touchPointerMove(state, 99, 500, 500);
    const third = sampleTouchTrackball(state, 0.8);
    expect(Math.abs(third.sx)).toBeLessThan(Math.abs(second.sx));
  });

  it('activates boost via second finger or dedicated touch BOOST button', () => {
    const state = createTouchTrackballState();
    touchPointerDown(state, 1, 100, 100, 0);
    expect(isTouchBoostActive(state)).toBe(false);

    // Second finger on canvas activates boost
    touchPointerDown(state, 2, 260, 180, 50);
    expect(isTouchBoostActive(state)).toBe(true);
    expect(sampleTouchTrackball(state, 0.8).boost).toBe(true);

    // Lifting second finger releases boost without ending primary steering
    const secUp = touchPointerUp(state, 2, 260, 180, 200);
    expect(secUp).toEqual({ wasTap: false, swipeDirection: 0 });
    expect(isTouchBoostActive(state)).toBe(false);
    expect(state.steerPointerId).toBe(1);

    // Dedicated BOOST button works independently
    setTouchButtonBoost(state, true);
    expect(sampleTouchTrackball(state, 0.8).boost).toBe(true);
    setTouchButtonBoost(state, false);
    expect(sampleTouchTrackball(state, 0.8).boost).toBe(false);

    // Reset clears everything
    touchPointerDown(state, 3, 10, 10, 210);
    setTouchButtonBoost(state, true);
    resetTouchTrackball(state);
    expect(state.steerPointerId).toBeNull();
    expect(isTouchBoostActive(state)).toBe(false);
  });

  it('detects short taps and horizontal swipes for attract mode navigation', () => {
    const state = createTouchTrackballState();

    // Short tap
    touchPointerDown(state, 10, 150, 150, 1000);
    touchPointerMove(state, 10, 153, 152);
    expect(touchPointerUp(state, 10, 153, 152, 1120)).toEqual({
      wasTap: true,
      swipeDirection: 0,
    });

    // Swipe left -> next attract stage (+1)
    touchPointerDown(state, 11, 250, 150, 2000);
    touchPointerMove(state, 11, 160, 155);
    expect(touchPointerUp(state, 11, 160, 155, 2220)).toEqual({
      wasTap: false,
      swipeDirection: 1,
    });

    // Swipe right -> previous attract stage (-1)
    touchPointerDown(state, 12, 100, 150, 3000);
    touchPointerMove(state, 12, 190, 145);
    expect(touchPointerUp(state, 12, 190, 145, 3250)).toEqual({
      wasTap: false,
      swipeDirection: -1,
    });

    // Unknown pointer up returns neutral outcome
    expect(touchPointerUp(state, 999, 0, 0, 4000)).toEqual({
      wasTap: false,
      swipeDirection: 0,
    });
  });
});
