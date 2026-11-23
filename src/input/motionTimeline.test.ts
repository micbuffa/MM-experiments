import { expect, it } from 'vitest';
import { createMotionTimeline } from './motionTimeline';

it('records only when armed, survives capture purges before the first gesture, then completes on silence', () => {
  const trace = createMotionTimeline();
  trace.event(1, 10, 0, 17, 0);
  trace.sample(1, 1, 17, 0);
  expect(trace.snapshot.status).toBe('idle');
  trace.arm(1.7);
  trace.stop('interrupted');
  trace.sample(2, 10, 0, 0);
  expect(trace.snapshot).toMatchObject({ status: 'armed', rows: [] });
  trace.event(2, 10, -2, 17, -3);
  trace.event(2.005, 20, 0, 34, 0);
  trace.sample(2.01, 20, 51, -3);
  trace.sample(2.02, 21, 0, 0);
  trace.event(2.03, -5, 1, -8, 2);
  trace.sample(2.04, 22, -8, 2);
  trace.sample(2.22, 23, 0, 0);
  expect(trace.snapshot).toMatchObject({
    status: 'recording',
    reason: null,
    selection: { selectedReason: 'quiet' },
    gain: 1.7,
    summary: {
      events: 3,
      nonzeroNativeSamples: 2,
      nativeSpanIterations: 3,
      peakNativeL1: 54,
    },
  });
  expect(trace.snapshot.summary.eventDurationSeconds).toBeCloseTo(0.03);
  expect(trace.snapshot.rows[0]).toMatchObject({
    events: 2,
    rawX: 30,
    rawY: -2,
    sentX: 51,
    sentY: -3,
    firstEventSeconds: 0,
  });
  trace.event(3, 100, 0, 170, 0);
  trace.sample(3, 24, 170, 0);
  expect(trace.snapshot.rows).toHaveLength(1);
  expect(trace.snapshot.selection).toMatchObject({
    segmentsSeen: 2,
    selectedSegment: 2,
    peakL1: 170,
  });
});

it('retains events interrupted before a native sample separately, never pretends they were polled', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(0, 9, 0, 9, 0);
  trace.stop('interrupted');
  expect(trace.snapshot).toMatchObject({
    reason: 'interrupted',
    rows: [],
    unsampledEvents: { events: 1, sentX: 9 },
    summary: { events: 1, nonzeroNativeSamples: 0 },
  });
  trace.stop('disposed', true);
  expect(trace.snapshot.reason).toBe('interrupted');
});

it('bounds both elapsed seconds and iteration count, even without quiet', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(0, 1, 0, 1, 0);
  for (let i = 0; i < 150; i++) trace.sample(i / 100, i, 1, 0);
  expect(trace.snapshot.rows).toHaveLength(128);
  expect(trace.snapshot.selection.selectedReason).toBe('limit');
  trace.arm(1);
  trace.event(0, 1, 0, 1, 0);
  trace.sample(2.1, 1, 1, 0);
  expect(trace.snapshot).toMatchObject({
    status: 'recording',
    selection: { selectedReason: 'limit' },
  });
});

it('does not start on zero events or prematurely end while the last poll is nonzero', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(0, 0, 0, 0, 0);
  expect(trace.snapshot.status).toBe('armed');
  trace.event(1, 1, 0, 1, 0);
  trace.sample(1.3, 2, 1, 0);
  expect(trace.snapshot.status).toBe('recording');
});

it('cancels an armed trace explicitly on gain change or disposal, and resets with immutable snapshots', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.stop('gain-change', true);
  expect(trace.snapshot).toMatchObject({
    status: 'complete',
    reason: 'gain-change',
  });
  trace.arm(2);
  trace.event(0, 2, 0, 4, 0);
  trace.sample(0.1, 1, 4, 0);
  const view = trace.snapshot;
  view.rows[0]!.polledX = 999;
  view.unsampledEvents.events = 99;
  expect(trace.snapshot.rows[0]!.polledX).toBe(4);
  trace.arm(3);
  expect(trace.snapshot).toMatchObject({
    gain: 3,
    reason: null,
    rows: [],
    summary: { events: 0, nativeSpanIterations: 0 },
  });
});

it('rejects invalid events, samples and clocks without adding rows', () => {
  const trace = createMotionTimeline();
  expect(() => trace.arm(NaN)).toThrow();
  expect(() => trace.arm(0)).toThrow();
  trace.arm(1);
  expect(() => trace.event(0, NaN, 0, 0, 0)).toThrow();
  expect(() => trace.event(Infinity, 1, 0, 1, 0)).toThrow();
  trace.event(1, 1, 0, 1, 0);
  expect(() => trace.event(0.9, 1, 0, 1, 0)).toThrow();
  expect(() => trace.sample(2, 1.5, 1, 0)).toThrow();
  expect(() => trace.sample(2, 1, Infinity, 0)).toThrow();
  expect(() => trace.sample(0.9, 1, 1, 0)).toThrow();
  expect(trace.snapshot.rows).toHaveLength(0);
});

it('does not leak the previous duration when a new armed trace is cancelled before motion', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(1, 1, 0, 1, 0);
  trace.event(1.1, 1, 0, 1, 0);
  trace.stop('interrupted');
  trace.arm(1);
  trace.stop('disposed', true);
  expect(trace.snapshot.summary.eventDurationSeconds).toBe(0);
});

it('keeps the strongest later gesture after a small first gesture and ignores weaker trailing motion', () => {
  const trace = createMotionTimeline();
  trace.arm(1.7);
  trace.event(0, 24, 164, 41, 278);
  trace.sample(0.01, 1, 41, 278);
  trace.sample(0.2, 2, 0, 0);
  trace.event(1, 539, 0, 916, 0);
  trace.sample(1.01, 3, 916, 0);
  trace.sample(1.2, 4, 0, 0);
  trace.event(2, 5, 0, 8, 0);
  trace.sample(2.01, 5, 8, 0);
  trace.stop('interrupted');
  expect(trace.snapshot).toMatchObject({
    status: 'complete',
    reason: 'interrupted',
    selection: {
      segmentsSeen: 3,
      selectedSegment: 2,
      peakL1: 916,
      selectedReason: 'quiet',
    },
    summary: { peakNativeL1: 916 },
  });
  expect(trace.snapshot.rows[0]).toMatchObject({
    frame: 3,
    sentX: 916,
    polledX: 916,
  });
  trace.event(3, 1000, 0, 1700, 0);
  expect(trace.snapshot.selection.segmentsSeen).toBe(3);
});

it('an immediate Escape preserves a stronger unpolled gesture without claiming native consumption', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(0, 2, 0, 2, 0);
  trace.sample(0.01, 1, 2, 0);
  trace.sample(0.2, 2, 0, 0);
  trace.event(1, 916, 0, 916, 0);
  trace.stop('interrupted');
  expect(trace.snapshot).toMatchObject({
    selection: { selectedSegment: 2, peakL1: 916 },
    rows: [],
    unsampledEvents: { sentX: 916, events: 1 },
    summary: { nonzeroNativeSamples: 0 },
  });
});

it('retains bounded best data through many later segments and rearms after a segment limit', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(0, 1, 0, 1, 0);
  for (let i = 0; i < 128; i++) trace.sample(i / 100, i, 1, 0);
  for (let i = 0; i < 300; i++) {
    const t = 2 + i;
    trace.event(t, i + 2, 0, i + 2, 0);
    trace.sample(t + 0.01, 200 + i * 2, i + 2, 0);
    trace.sample(t + 0.2, 201 + i * 2, 0, 0);
  }
  trace.stop('interrupted');
  expect(trace.snapshot.selection).toMatchObject({
    segmentsSeen: 301,
    selectedSegment: 301,
    peakL1: 301,
  });
  expect(trace.snapshot.rows).toHaveLength(2);
});

it('reports a transmitted batch peak even when opposite events cancel before the native poll', () => {
  const trace = createMotionTimeline();
  trace.arm(1);
  trace.event(0, 500, 0, 500, 0);
  trace.event(0.001, -500, 0, -500, 0);
  trace.sample(0.01, 1, 0, 0);
  trace.stop('interrupted');
  expect(trace.snapshot.selection.peakL1).toBe(500);
  expect(trace.snapshot.rows[0]).toMatchObject({
    sentX: 0,
    polledX: 0,
    peakSentL1: 500,
  });
});

it('distinguishes generated boost commands from physical mouse events', () => {
  const trace = createMotionTimeline();
  trace.arm(1.7);
  trace.event(0, 0, 0, 64, -64, true);
  trace.sample(0.01, 1, 64, -64);
  trace.stop('interrupted');
  expect(trace.snapshot).toMatchObject({
    summary: { generatedCommands: 1, events: 0, peakNativeL1: 128 },
  });
  expect(trace.snapshot.rows[0]).toMatchObject({
    generatedCommands: 1,
    sentX: 64,
    polledX: 64,
  });
});
