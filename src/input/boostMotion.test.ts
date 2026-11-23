import { expect, it } from 'vitest';
import { createBoostMotion } from './boostMotion';

it('waits for direction, then sends a sustained bounded diagonal until release', () => {
  const boost = createBoostMotion();
  expect(boost.next()).toBeNull();
  boost.press(0);
  expect(boost.held).toBe(true);
  expect(boost.next()).toBeNull();
  boost.observe(300, -300, 0.01);
  for (let i = 0; i < 20; i++) expect(boost.next()).toEqual([128, -128]);
  expect(boost.snapshot).toMatchObject({
    iterations: 20,
    sentX: 2560,
    sentY: -2560,
    active: true,
  });
  boost.release();
  expect(boost.held).toBe(false);
  expect(boost.next()).toBeNull();
});
it('uses a recent movement but never accelerates in a stale direction on a later press', () => {
  const boost = createBoostMotion();
  boost.observe(-5, 0, 1);
  boost.press(1.1);
  expect(boost.next()).toEqual([-256, 0]);
  boost.release();
  boost.press(2);
  expect(boost.next()).toBeNull();
  boost.observe(0, 1, 2.1);
  expect(boost.next()).toEqual([0, 256]);
});
it('steers during boost, ignores zero movements and repeated presses, reuses the emitted vector', () => {
  const boost = createBoostMotion();
  boost.observe(3, 1, 0);
  boost.press(0);
  const step = boost.next();
  expect(step).toEqual([192, 64]);
  boost.press(10);
  boost.observe(0, 0, 10);
  expect(boost.next()).toBe(step);
  boost.observe(-1, -3, 10);
  expect(boost.next()).toEqual([-64, -192]);
});
it('bounds the joint axes even with very large diagonal movement', () => {
  const boost = createBoostMotion();
  boost.press(0);
  for (const [x, y] of [
    [5000, 3],
    [-111, 999],
    [0, -9],
    [1, 0],
  ]) {
    boost.observe(x!, y!, 0);
    const step = boost.next()!;
    expect(Math.abs(step[0]) + Math.abs(step[1])).toBe(256);
    expect(step.every(Number.isInteger)).toBe(true);
  }
});
it('purges direction and hold on interruption without erasing stats until requested', () => {
  const boost = createBoostMotion();
  boost.observe(1, 0, 0);
  boost.press(0);
  boost.next();
  const exposed = boost.snapshot;
  exposed.direction![0] = 999;
  expect(boost.snapshot.direction).toEqual([256, 0]);
  boost.reset();
  expect(boost.snapshot).toMatchObject({
    held: false,
    direction: null,
    iterations: 1,
  });
  boost.press(0.1);
  expect(boost.next()).toBeNull();
  boost.resetMetrics();
  expect(boost.snapshot).toMatchObject({ iterations: 0, sentX: 0, sentY: 0 });
  const snapshot = boost.snapshot;
  snapshot.direction?.push(999);
  expect(boost.snapshot.direction).toBeNull();
});
it('rejects non-finite input without entering boost', () => {
  const boost = createBoostMotion();
  expect(() => boost.press(Infinity)).toThrow();
  expect(() => boost.observe(NaN, 0, 0)).toThrow();
  expect(() => boost.observe(0, Infinity, 0)).toThrow();
  expect(() => boost.observe(1, 0, NaN)).toThrow();
  expect(() => boost.observe(1e308, 1e308, 0)).toThrow();
  expect(boost.snapshot.held).toBe(false);
});
