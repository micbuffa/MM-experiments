import { expect, it } from 'vitest';
import { updateWormPose, type WormPose } from './wormPose';
const rig = (): WormPose => ({
  tailY: 0,
  tailZ: 0,
  headY: 0,
  headX: 0,
  headZ: 0,
  arch: 0,
  heading: 0,
  mouth: 0,
  tongue: 0,
  flare: 0,
});
it('plants the old foot, lands the other, then lifts only the old foot', () => {
  const p = rig();
  updateWormPose(p, 3, 0x20c6c, 0, 0, 0);
  expect([p.tailY, p.tailZ, p.headY, p.headZ]).toEqual([0, 0, 1.05, 0]);
  for (const frame of [1, 2, 3]) {
    updateWormPose(p, 3, 0x20c6c, frame, 0, 0);
    expect([p.tailY, p.tailZ]).toEqual([0, 0]);
    expect(p.headY).toBeGreaterThan(0);
    expect(p.arch).toBeGreaterThan(0);
  }
  updateWormPose(p, 3, 0x20c6c, 4, 0, 0);
  expect([p.tailY, p.tailZ, p.headY, p.headZ]).toEqual([0, 0, 0, 1]);
  for (const frame of [5, 6, 7]) {
    updateWormPose(p, 3, 0x20c6c, frame, 0, 0);
    expect([p.headY, p.headZ]).toEqual([0, 1]);
    expect(p.tailY).toBeGreaterThan(0);
  }
  updateWormPose(p, 3, 0x20c6c, 8, 0, 0);
  expect([p.tailY, p.tailZ, p.headY, p.headZ]).toEqual([1.05, 1, 0, 1]);
});
it.each([
  [0x20c48, Math.PI / 2],
  [0x20c6c, 0],
  [0x20c90, Math.PI],
  [0x20cb4, -Math.PI / 2],
])('uses native direction %i when velocity is zero', (script, heading) => {
  const p = rig();
  updateWormPose(p, 0, script!, 3, 0.5, 2);
  expect(p.heading).toBe(heading);
  expect(p.headZ).toBeGreaterThan(0.9);
});
it('separates attack, recovery and late tongue poses using the native script', () => {
  const p = rig();
  updateWormPose(p, 1, 0x20cd8, 0, 0, 1);
  expect(p.headY).toBe(0);
  expect(p.arch).toBeGreaterThan(0.5);
  updateWormPose(p, 1, 0x20cd8, 16, 0, 1);
  expect(p.headY).toBe(1.05);
  updateWormPose(p, 1, 0x20cd8, 23, 0, 1);
  expect(p.headY).toBe(0);
  expect(p.mouth).toBe(1);
  updateWormPose(p, 1, 0x20cd8, 32, 0, 1);
  expect(p.flare).toBe(1);
  expect(p.headY).toBeCloseTo(0.83);
  updateWormPose(p, 5, 0x20e28, 0, 0, 1);
  expect(p.headY).toBe(0.83);
  expect(p.flare).toBe(1);
  expect(p.tongue).toBe(0);
  updateWormPose(p, 5, 0x20e28, 16, 0, 1);
  expect(p.headY).toBe(1.05);
  expect(p.mouth).toBe(0);
  updateWormPose(p, 5, 0x20e28, 20, 0, 1);
  expect(p.tongue).toBe(0);
  updateWormPose(p, 5, 0x20e28, 22, 0, 1);
  expect(p.tongue).toBeCloseTo(1 / 3);
  updateWormPose(p, 5, 0x20e28, 26, 0, 1);
  expect(p.tongue).toBe(1);
  updateWormPose(p, 5, 0x20e28, 29, 0, 1);
  expect(p.tongue).toBe(0.5);
  updateWormPose(p, 6, 0x20d6c, 26, 0, 1);
  expect(p.headY).toBe(1.05);
  expect(p.mouth).toBe(0);
});
it('resets the rig at rest and bounds phases without advancing a private clock', () => {
  const p = rig();
  for (const state of [2, 4]) {
    updateWormPose(p, state, 0, 100, 4, 0.4);
    expect(p.headY).toBeGreaterThan(0);
    expect(p.arch).toBeGreaterThan(0);
  }
  updateWormPose(p, 0, 0x20c18, 10, 0, 0.4);
  expect(p).toEqual({
    tailY: 0,
    tailZ: 0,
    headY: 1.05,
    headX: 0,
    headZ: 0,
    arch: 0,
    heading: 0.4,
    mouth: 0,
    tongue: 0,
    flare: 0,
  });
});

it('looks left and right during the eleven-pose native idle without moving its planted end', () => {
  const p = rig();
  updateWormPose(p, 0, 0x20c18, 2, 0, 1);
  expect(p.headX).toBeLessThan(-0.1);
  const left = p.headX;
  updateWormPose(p, 0, 0x20c18, 2, 0, 1);
  expect(p.headX).toBe(left);
  updateWormPose(p, 0, 0x20c18, 7, 0, 1);
  expect(p.headX).toBeGreaterThan(0.1);
  expect([p.tailY, p.tailZ, p.heading]).toEqual([0, 0, 1]);
  updateWormPose(p, 0, 0x20c18, 10, 0, 1);
  expect(p.headX).toBe(0);
});
