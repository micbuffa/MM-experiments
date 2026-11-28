import { describe, expect, it } from 'vitest';
import { createTouchTrackball } from './touchTrackball';

describe('createTouchTrackball', () => {
  it('tracks primary finger drag deltas scaled by gain and clamps spikes', () => {
    const touch = createTouchTrackball(2);
    expect(touch.active).toBe(false);
    expect(touch.boostActive).toBe(false);

    touch.pointerDown(1, 100, 200);
    expect(touch.active).toBe(true);
    expect(touch.pointerMove(1, 100, 200)).toBeNull();
    const move = touch.pointerMove(1, 110, 195);
    expect(move).not.toBeNull();
    expect(move!.dx).toBeGreaterThan(20);
    expect(move!.dy).toBeLessThan(-10);

    // Large teleport spike is clamped cleanly to MAX_STEP_DELTA (180)
    expect(touch.pointerMove(1, 500, -500)).toEqual({ dx: 180, dy: -180 });

    // Non-finite input produces null (zero delta)
    expect(touch.pointerMove(1, Number.NaN, Number.NaN)).toBeNull();

    touch.pointerUp(1);
    expect(touch.active).toBe(false);
  });

  it('activates boost while a secondary finger is held and ignores its drag', () => {
    const touch = createTouchTrackball(1);
    touch.pointerDown(10, 50, 50);
    touch.pointerDown(20, 300, 300);

    expect(touch.boostActive).toBe(true);
    expect(touch.pointerMove(20, 340, 320)).toBeNull();
    const move = touch.pointerMove(10, 62, 58);
    expect(move).not.toBeNull();
    expect(move!.dx).toBeGreaterThan(12);
    expect(move!.dy).toBeGreaterThan(8);

    // Duplicate pointerDown on primary does not activate boost
    touch.pointerDown(10, 62, 58);
    expect(touch.boostActive).toBe(true);

    touch.pointerUp(20);
    expect(touch.boostActive).toBe(false);
    expect(touch.active).toBe(true);

    touch.reset();
    expect(touch.active).toBe(false);
    expect(touch.boostActive).toBe(false);
  });
});
