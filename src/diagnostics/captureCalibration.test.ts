import { expect, it } from 'vitest';
import {
  makeCalibrationCases,
  makeCalibrationPhaseCases,
  makeCalibrationRefinementCases,
  readCapturedProfile,
  scaleCapturedProfile,
} from './captureCalibration';
import type { MotionPair } from './captureCalibration';

it('reads numeric pairs without retaining mutable evidence references', () => {
  const data = {
    capture: { gain: 1.7 },
    webReplay: {
      profile: [
        [-608, 574],
        [0, 0],
      ],
    },
  };
  const result = readCapturedProfile(data);
  data.webReplay.profile[0]![0] = 0;
  expect(result).toEqual({
    sourceGain: 1.7,
    profile: [
      [-608, 574],
      [0, 0],
    ],
  });
});
it.each([
  null,
  [],
  {},
  { capture: null },
  { capture: { gain: 0 }, webReplay: { profile: [[1, 2]] } },
  { capture: { gain: Infinity }, webReplay: { profile: [[1, 2]] } },
  { capture: { gain: 1 }, webReplay: { profile: [] } },
  { capture: { gain: 1 }, webReplay: { profile: [[1, 2, 3]] } },
  { capture: { gain: 1 }, webReplay: { profile: [[NaN, 0]] } },
  { capture: { gain: 1 }, webReplay: { profile: [[32768, 0]] } },
  { capture: { gain: 1 }, webReplay: { profile: ['execute me'] } },
])('rejects malformed evidence %#', (value) => {
  expect(() => readCapturedProfile(value)).toThrow();
});
it('rescales both axes with bounded prefix error while preserving pauses and signs', () => {
  const profile: MotionPair[] = [
    [-1, 1],
    [-1, 1],
    [0, 0],
    [-3, 3],
    [1, -1],
    [-608, 574],
  ];
  expect(scaleCapturedProfile(profile, 1)).toEqual(profile);
  for (const factor of [0, 0.25, 0.5, 0.75, 1.25]) {
    const result = scaleCapturedProfile(profile, factor);
    expect(result).toHaveLength(profile.length);
    expect(result[2]).toEqual([0, 0]);
    for (let i = 1; i <= profile.length; i++) {
      for (const axis of [0, 1] as const) {
        const expected =
          profile.slice(0, i).reduce((n, pair) => n + pair[axis], 0) * factor;
        const actual = result
          .slice(0, i)
          .reduce((n, pair) => n + pair[axis], 0);
        expect(Math.abs(expected - actual)).toBeLessThan(1);
      }
    }
  }
});
it('rejects invalid factors and saturation instead of silently clipping', () => {
  for (const factor of [NaN, Infinity, -1])
    expect(() => scaleCapturedProfile([[1, 1]], factor)).toThrow();
  expect(() => scaleCapturedProfile([[32767, 0]], 2)).toThrow('saturate');
});
it('compares full gesture and fixed peak window with matching timings, gains and neutral controls', () => {
  const profile: MotionPair[] = Array.from({ length: 95 }, (_, i) =>
    i === 65 ? [-608, 574] : [0, 0],
  );
  const cases = makeCalibrationCases({ sourceGain: 1.7, profile });
  expect(cases).toHaveLength(12);
  expect(
    cases
      .filter((c) => c.scope === 'neutral')
      .every((c) => c.profile.every(([x, y]) => x === 0 && y === 0)),
  ).toBe(true);
  expect(cases.find((c) => c.label === 'full-1.7')!.profile).toEqual(profile);
  const peak = cases.find((c) => c.label === 'peak-1.7')!;
  expect(peak.profile).toHaveLength(8);
  expect(peak.profile[3]).toEqual([-608, 574]);
  expect(peak.sampleFrames.at(-1)).toBeGreaterThan(1200 + peak.profile.length);
  expect(makeCalibrationCases({ sourceGain: 1.7, profile }, true)).toHaveLength(
    8,
  );
});
it('keeps a peak at either edge inside the window and handles short recordings', () => {
  for (const profile of [
    [
      [9, 0],
      [1, 0],
    ],
    [
      [1, 0],
      [9, 0],
    ],
  ] as MotionPair[][]) {
    expect(
      makeCalibrationCases({ sourceGain: 1.7, profile }).find(
        (c) => c.label === 'peak-1.7',
      )!.profile,
    ).toEqual(profile);
  }
});

it('rejects recordings beyond the memory bound and gains outside the UI domain', () => {
  for (const gain of ['1.7', 4.01]) {
    expect(() =>
      readCapturedProfile({
        capture: { gain },
        webReplay: { profile: [[0, 1]] },
      }),
    ).toThrow();
  }
  expect(() =>
    readCapturedProfile({
      capture: { gain: 1 },
      webReplay: { profile: Array.from({ length: 129 }, () => [0, 1]) },
    }),
  ).toThrow();
  expect(() =>
    readCapturedProfile({
      capture: { gain: 1 },
      webReplay: { profile: [[0, -32769]] },
    }),
  ).toThrow();
});
it('observes beyond the last input even at the maximum recording length', () => {
  const profile: MotionPair[] = Array.from({ length: 128 }, () => [1, 1]);
  const full = makeCalibrationCases({ sourceGain: 1.7, profile }).find(
    (c) => c.label === 'full-1.7',
  )!;
  expect(full.sampleFrames.at(-1)).toBe(1351);
  expect(
    full.sampleFrames.every(
      (frame, i, frames) => i === 0 || frame > frames[i - 1]!,
    ),
  ).toBe(true);
});

it('checks timing by shifting the same peak profiles and observation instants together', () => {
  const source = {
    sourceGain: 1.7,
    profile: [
      [1, 2],
      [-608, 574],
    ] as MotionPair[],
  };
  const normal = makeCalibrationCases(source, true).filter(
    (c) => c.scope !== 'full',
  );
  const shifted = makeCalibrationPhaseCases(source);
  expect(shifted).toHaveLength(5);
  for (let i = 0; i < shifted.length; i++) {
    expect(shifted[i]!.startFrame).toBe(1201);
    expect(shifted[i]!.profile).toEqual(normal[i]!.profile);
    expect(shifted[i]!.sampleFrames).toEqual(
      normal[i]!.sampleFrames.map((frame) => frame + 1),
    );
  }
});

it('refines on selectable slider steps while checking both timings without changing the waveform', () => {
  const source = {
    sourceGain: 1.7,
    profile: [
      [-1, 1],
      [-608, 574],
      [-30, 20],
    ] as MotionPair[],
  };
  const cases = makeCalibrationRefinementCases(source);
  expect(cases).toHaveLength(8);
  for (const gain of [0.4, 0.45, 0.5]) {
    const variants = cases.filter((c) => c.gain === gain);
    expect(variants).toHaveLength(2);
    expect(variants[0]!.profile).toEqual(variants[1]!.profile);
    expect(variants.map((c) => c.startFrame)).toEqual([1200, 1201]);
    expect(
      Math.abs((gain - 0.25) / 0.05 - Math.round((gain - 0.25) / 0.05)),
    ).toBeLessThan(1e-10);
  }
});
