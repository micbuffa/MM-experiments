import { expect, it } from 'vitest';
import { widenLevel3Pipe } from './widenLevel3Pipe';
import { marbleRadius } from './createPracticeMarble';

it('clears the marble at the shaft entrance without widening the funnel lip or outlet', () => {
  const source = {
    positions: [
      18.5274 + 0.663,
      -8.2283,
      20.9958,
      17,
      -6.9402,
      19,
      17,
      -18,
      14,
    ],
    normals: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    shell: [0, 1, 2],
    interior: [2, 1, 0],
  };
  const next = widenLevel3Pipe(source);
  expect(next.positions[0]! - 18.5274).toBeGreaterThan(marbleRadius + 0.1);
  // The imported tube is octagonal: the flat side must clear the marble,
  // with a slight +Z nudge toward the right pillar while keeping lip and outlet fixed.
  expect(
    (next.positions[0]! - 18.5274) * Math.cos(Math.PI / 8),
  ).toBeGreaterThan(marbleRadius + 0.15);
  expect(next.positions[2]! - 20.9958).toBeCloseTo(0.2, 4);
  expect(next.positions.slice(3)).toEqual(source.positions.slice(3));
  expect(source.positions[0]).toBe(18.5274 + 0.663);
  expect(next.normals).toEqual(source.normals);
  expect(next.interior).toBe(source.interior);
  expect(next.shell).toBe(source.shell);
  const unlit = widenLevel3Pipe({
    positions: source.positions,
    shell: [],
    interior: [],
  });
  expect(unlit.normals).toBeUndefined();
});
