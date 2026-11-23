import { expect, it } from 'vitest';
import { CABINET } from './venueLayout';
import {
  initialBarPose,
  lookInBar,
  walkInBar,
  canEnterCabinet,
} from './barNavigation';
it('returns independent initial poses and keeps look pitch bounded', () => {
  const a = initialBarPose(),
    b = initialBarPose();
  a.x = 8;
  expect(b.x).toBe(0);
  expect(lookInBar(b, 100, 50).yaw).toBeCloseTo(0.2);
  expect(lookInBar(b, 0, 10000).pitch).toBe(1.15);
  expect(lookInBar(b, 0, -10000).pitch).toBe(-1.15);
  expect(Math.abs(lookInBar(b, 1e6, 0).yaw)).toBeLessThanOrEqual(Math.PI);
});
it('moves the same distance at 60 and 120 Hz without diagonal acceleration', () => {
  const start = { x: -2, z: -4, yaw: 0, pitch: 0 };
  let a = { ...start },
    b = { ...start };
  for (let i = 0; i < 60; i++) a = walkInBar(a, 1, 0, 1 / 60);
  for (let i = 0; i < 120; i++) b = walkInBar(b, 1, 0, 1 / 120);
  expect(a.z).toBeCloseTo(b.z, 10);
  expect(a.z).toBeCloseTo(-1.6);
  const diagonal = walkInBar(start, 1, 1, 0.05),
    straight = walkInBar(start, 1, 0, 0.05);
  expect(Math.hypot(diagonal.x - start.x, diagonal.z - start.z)).toBeCloseTo(
    Math.abs(straight.z - start.z),
  );
});
it('stops at the cabinet, counter, table and shelf and slides along blocked axes', () => {
  let pose = initialBarPose();
  for (let i = 0; i < 100; i++) pose = walkInBar(pose, 1, 0, 0.05);
  expect(pose.z).toBeLessThanOrEqual(CABINET.frontZ - 0.2);
  const slide = walkInBar(pose, 1, 1, 0.05);
  expect(slide.x).toBeGreaterThan(pose.x);
  expect(slide.z).toBe(pose.z);
  for (const start of [
    { x: 4, z: 1, yaw: 0, pitch: 0 },
    { x: -4.6, z: -0.16, yaw: 0, pitch: 0 },
    { x: 3, z: 4.0, yaw: 0, pitch: 0 },
  ]) {
    const next = walkInBar(start, 1, 0, 0.05);
    expect(next.z).toBe(start.z);
  }
});
it('rotates movement with yaw, caps stalled frames and bounds the room', () => {
  const start = { x: 0, z: -4, yaw: Math.PI / 2, pitch: 0 };
  expect(walkInBar(start, 1, 0, 0.05).x).toBeCloseTo(0.12);
  expect(walkInBar(start, 1, 0, 5).x).toBeCloseTo(0.12);
  expect(
    walkInBar({ x: 7.89, z: -6.79, yaw: 0, pitch: 0 }, -1, 1, 0.05),
  ).toMatchObject({ x: 7.9, z: -6.8 });
  expect(
    walkInBar({ x: -7.89, z: 4.49, yaw: 0, pitch: 0 }, 1, -1, 0.05),
  ).toMatchObject({ x: -7.9, z: 4.5 });
});
it('allows entering only near the front of the cabinet', () => {
  expect(canEnterCabinet(initialBarPose())).toBe(true);
  expect(canEnterCabinet({ x: 5, z: -3, yaw: 0, pitch: 0 })).toBe(false);
  expect(canEnterCabinet({ x: 0, z: 1, yaw: 0, pitch: 0 })).toBe(false);
});
it.each([NaN, Infinity])('rejects nonfinite input %s', (value) => {
  expect(() => lookInBar(initialBarPose(), value, 0)).toThrow(RangeError);
  expect(() => walkInBar(initialBarPose(), 0, 0, value)).toThrow(RangeError);
});
it('rejects a negative navigation step', () => {
  expect(() => walkInBar(initialBarPose(), 1, 0, -1)).toThrow(RangeError);
});
