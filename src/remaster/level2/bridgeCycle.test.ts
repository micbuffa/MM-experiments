import { describe, expect, it } from 'vitest';
import {
  BRIDGE_PERIOD_SECONDS,
  BRIDGE_ROM,
  bridgeState,
  bridgeStepAtTick,
  deckRiseUnits,
  freeEdgeRiseUnits,
} from './bridgeCycle';

const tick = (n: number) => n / 30;

describe('bridgeStepAtTick (ROM script 0x1db12)', () => {
  it('raises one step every 2 ticks after the first 3 ticks', () => {
    const steps = Array.from(
      { length: 15 },
      (_, t) => bridgeStepAtTick(t).step,
    );
    expect(steps).toEqual([0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
    for (let t = 0; t < 15; t++)
      expect(bridgeStepAtTick(t).phase).toBe('raising');
  });

  it('holds raised 14 ticks, lowers symmetrically, then holds lowered', () => {
    expect(bridgeStepAtTick(15)).toEqual({ step: 6, phase: 'raised' });
    expect(bridgeStepAtTick(28)).toEqual({ step: 6, phase: 'raised' });
    const lower = Array.from({ length: 15 }, (_, i) =>
      bridgeStepAtTick(29 + i),
    );
    expect(lower.map((s) => s.step)).toEqual([
      6, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0,
    ]);
    expect(lower.every((s) => s.phase === 'lowering')).toBe(true);
    expect(bridgeStepAtTick(44)).toEqual({ step: 0, phase: 'lowered' });
    expect(bridgeStepAtTick(72)).toEqual({ step: 0, phase: 'lowered' });
  });

  it('wraps every 73 ticks, including negative ticks', () => {
    expect(BRIDGE_ROM.periodTicks).toBe(73);
    expect(bridgeStepAtTick(73)).toEqual(bridgeStepAtTick(0));
    expect(bridgeStepAtTick(73 + 13).step).toBe(6);
    expect(bridgeStepAtTick(-1)).toEqual({ step: 0, phase: 'lowered' });
  });
});

describe('bridgeState', () => {
  it('reports the 2.433 s period and the flat state at t = 0', () => {
    expect(BRIDGE_PERIOD_SECONDS).toBeCloseTo(73 / 30);
    const s = bridgeState(0);
    expect(s).toMatchObject({
      cycleTick: 0,
      step: 0,
      phase: 'raising',
      freeEdgeRiseUnits: 0,
      passable: true,
    });
    expect(s.angleRadians).toBe(0);
  });

  it('is passable only while the lip stays under 4 units (steps 0-1)', () => {
    const passable = Array.from(
      { length: 73 },
      (_, t) => bridgeState(tick(t)).passable,
    );
    const open = passable.flatMap((p, t) => (p ? [t] : []));
    expect(open).toEqual([
      0,
      1,
      2,
      3,
      4,
      ...Array.from({ length: 33 }, (_, i) => 40 + i),
    ]);
    expect(bridgeState(tick(4)).freeEdgeRiseUnits).toBe(3);
    expect(bridgeState(tick(5)).freeEdgeRiseUnits).toBe(5);
    expect(bridgeState(tick(5)).passable).toBe(false);
  });

  it('reaches 16 units and a ~22 degree tilt when fully raised', () => {
    const s = bridgeState(tick(20));
    expect(s.phase).toBe('raised');
    expect(s.freeEdgeRiseUnits).toBe(16);
    expect(s.freeEdgeRiseWorld).toBeCloseTo((16 * Math.sqrt(2 / 3)) / 8);
    expect((s.angleRadians * 180) / Math.PI).toBeCloseTo(22.2, 1);
  });

  it('interpolates the smooth step between ROM steps for rendering', () => {
    const a = bridgeState(tick(4));
    expect(a.step).toBe(1);
    expect(a.smoothStep).toBeCloseTo(1.5);
    const b = bridgeState(tick(4.5));
    expect(b.step).toBe(1);
    expect(b.smoothStep).toBeCloseTo(1.75);
    const c = bridgeState(tick(33));
    expect(c.phase).toBe('lowering');
    expect(c.smoothStep).toBeCloseTo(4.5);
    expect(bridgeState(tick(60)).smoothStep).toBe(0);
    expect(bridgeState(tick(20)).smoothStep).toBe(6);
  });

  it('applies a phase offset in ROM ticks', () => {
    expect(bridgeState(0, { phaseOffsetTicks: 13 }).step).toBe(6);
    expect(bridgeState(tick(1), { phaseOffsetTicks: 72 }).cycleTick).toBe(0);
  });
});

describe('deck profile', () => {
  it('rises linearly from the hinge (decoded rows 1-3, free edge row 4)', () => {
    expect(deckRiseUnits(0, 6)).toBe(0);
    expect(deckRiseUnits(1, 6)).toBe(4);
    expect(deckRiseUnits(2, 6)).toBe(8);
    expect(deckRiseUnits(3, 6)).toBe(12);
    expect(deckRiseUnits(4, 6)).toBe(16);
    expect(deckRiseUnits(3.5, 6)).toBe(14);
    expect(deckRiseUnits(4, 0)).toBe(0);
    expect(deckRiseUnits(9, 9)).toBe(16);
  });

  it('interpolates the free edge for fractional steps and clamps', () => {
    expect(freeEdgeRiseUnits(2.5)).toBe(6.5);
    expect(freeEdgeRiseUnits(-1)).toBe(0);
    expect(freeEdgeRiseUnits(7)).toBe(16);
  });
});
