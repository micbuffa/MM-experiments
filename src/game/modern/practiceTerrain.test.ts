import { expect, it } from 'vitest';
import {
  arcadeHeightScale,
  practiceFrame,
  practiceOpeningScroll,
  projectPracticePoint,
} from './practiceProjection';
import { parsePracticeTerrain } from './practiceTerrain';

const encode = (rows: unknown) =>
  JSON.stringify({ format: 'practice-terrain-v1', rows });

it('keeps slope offsets and distinguishes missing corners from height zero', () => {
  expect(
    parsePracticeTerrain(encode([[[16384, 16382, 0, 16386]]])).cells,
  ).toEqual([[[0, -(arcadeHeightScale / 4), null, arcadeHeightScale / 4]]]);
});

it('loads the extended survey through the first scroll', () => {
  const row = Array.from({ length: 38 }, () => [16384, 16384, 16384, 16384]);
  const grid = parsePracticeTerrain(
    encode(Array.from({ length: 37 }, () => row)),
  );
  expect(grid.cells).toHaveLength(37);
  expect(grid.cells[36]).toHaveLength(38);
  expect(grid.cells[36]![37]).toEqual([0, 0, 0, 0]);
  expect(grid).toMatchObject({ origin: { x: 10, z: 11 }, lastScroll: -16069 });
});

it('gives a complete survey its own grid origin and measured scroll range', () => {
  const row = Array.from({ length: 91 }, () => [0, 0, 0, 0]);
  const rows = Array.from({ length: 91 }, () => row);
  const encodeComplete = (rows: unknown) =>
    JSON.stringify({ format: 'practice-terrain-v2', rows });
  const grid = parsePracticeTerrain(encodeComplete(rows));
  expect(grid).toMatchObject({ origin: { x: 0, z: 0 }, lastScroll: -15784 });
  expect(grid.cells).toHaveLength(91);
  expect(grid.cells[90]).toHaveLength(91);
  expect(() => parsePracticeTerrain(encodeComplete(rows.slice(1)))).toThrow();
});

it('loads Intermediate Race with its own extents, depth and scroll range', () => {
  const row = Array.from({ length: 130 }, () => [16097, 16097, 0, 16098]);
  const rows = Array.from({ length: 130 }, () => row);
  const encodeIntermediate = (rows: unknown) =>
    JSON.stringify({ format: 'intermediate-terrain-v1', rows });
  const grid = parsePracticeTerrain(encodeIntermediate(rows));
  expect(grid).toMatchObject({
    level: 'intermediate',
    origin: { x: 0, z: 0 },
    lastScroll: -15846,
  });
  expect(grid.cells[0]![0]![0]).toBeLessThan(-25);
  expect(grid.cells[0]![0]![2]).toBeNull();
  expect(() =>
    parsePracticeTerrain(encodeIntermediate(rows.slice(1))),
  ).toThrow();
  const pipes = {
    positions: [0, 0, 0, 0, 1, 0, 1, 0, 0],
    shell: [0, 1, 2],
    interior: [0, 2, 1],
  };
  expect(
    parsePracticeTerrain(
      JSON.stringify({ format: 'intermediate-terrain-v1', rows, pipes }),
    ).pipes,
  ).toEqual(pipes);
  expect(grid.pipes).toBeUndefined();
});

it.each([
  '{}',
  'null',
  encode([]),
  encode([[]]),
  encode([[[16384, 16384, 16384, 16384]], []]),
  encode([[[1, 2]]]),
  encode([[[16384, 0, 3, 16384]]]),
  encode([[[16384, 0, '16384', 16384]]]),
  encode([[[16384, 0, 16384.1, 16384]]]),
])('rejects an incompatible survey %s', (text) => {
  expect(() => parsePracticeTerrain(text)).toThrow();
});

it('closes a one-step seam while preserving larger height differences', () => {
  const grid = parsePracticeTerrain(
    encode([
      [
        [16384, 16384, 16384, 16384],
        [16382, 16382, 16382, 16376],
      ],
    ]),
  );
  expect(grid.cells[0]).toEqual([
    [0, -(arcadeHeightScale / 8), 0, 0],
    [
      -(arcadeHeightScale / 8),
      -(arcadeHeightScale / 4),
      -(arcadeHeightScale / 4),
      -arcadeHeightScale,
    ],
  ]);
});

it('closes a one-step seam at negative heights after scaling', () => {
  const grid = parsePracticeTerrain(
    encode([
      [
        [16378, 16378, 16378, 16378],
        [16376, 16376, 16376, 16376],
      ],
    ]),
  );
  expect(grid.cells[0]![0]![1]).toBe(grid.cells[0]![1]![0]);
  expect(grid.cells[0]![0]![2]).toBe(grid.cells[0]![1]![3]);
});

it('parses the 118x118 Level 3 terrain format and its deeper height range', () => {
  const rows = Array.from({ length: 118 }, () =>
    Array.from({ length: 118 }, () => [0, 0, 0, 0]),
  );
  rows[10]![22] = [16408, 16408, 16408, 16408];
  rows[100]![98] = [16100, 16100, 16100, 16100];
  const parsed = parsePracticeTerrain(
    JSON.stringify({ format: 'level3-terrain-v1', rows }),
  );
  expect(parsed.level).toBe('level3');
  const offset = parsed.lastScroll - practiceOpeningScroll;
  const goalBottom = projectPracticePoint(96 * 8, 110 * 8, 16100).y - offset;
  const goalTop = projectPracticePoint(92 * 8, 100 * 8, 16100).y - offset;
  expect(goalTop).toBeGreaterThan(48);
  expect(goalBottom).toBeLessThanOrEqual(practiceFrame.height - 32);

  expect(parsed.origin).toEqual({ x: 0, z: 0 });
  expect(parsed.cells).toHaveLength(118);
  expect(parsed.cells[10]![22]![0]).toBeGreaterThan(0);
  expect(parsed.cells[100]![98]![0]).toBeLessThan(-10);
});

it('parses a 130x130 Level 4 (Aerial Race) survey with full scroll range', () => {
  const rows = Array.from({ length: 130 }, () =>
    Array.from({ length: 130 }, () => [0, 0, 0, 0]),
  );
  rows[8]![22] = [16384, 16384, 16384, 16384];
  rows[104]![113] = [16228, 16228, 16228, 16228];
  const parsed = parsePracticeTerrain(
    JSON.stringify({ format: 'level4-terrain-v1', rows }),
  );
  expect(parsed.level).toBe('level4');
  expect(parsed.origin).toEqual({ x: 0, z: 0 });
  expect(parsed.cells).toHaveLength(130);
  expect(parsed.lastScroll).toBe(-15368);
});

it('accepts the reverse-scrolling 141-cell Silly Race survey', () => {
  const rows = Array.from({ length: 141 }, () =>
    Array.from({ length: 141 }, () => [0, 0, 0, 0]),
  );
  rows[125]![126] = [16168, 16168, 16168, 16168];
  const parsed = parsePracticeTerrain(
    JSON.stringify({ format: 'level5-terrain-v1', rows }),
  );
  expect(parsed.level).toBe('level5');
  expect(parsed.origin).toEqual({ x: 0, z: 0 });
  expect(parsed.lastScroll).toBeLessThan(-15212);
  expect(parsed.cells[125]![126]![0]).toBeLessThan(-20);
  expect(() =>
    parsePracticeTerrain(
      JSON.stringify({ format: 'level5-terrain-v1', rows: rows.slice(1) }),
    ),
  ).toThrow();
});

it('parses a 122x122 Level 6 (Ultimate Race) survey with 4 maze phases', () => {
  const rows = Array.from({ length: 122 }, () =>
    Array.from({ length: 122 }, () => [0, 0, 0, 0]),
  );
  rows[16]![12] = [16384, 16384, 16384, 16384];
  const parsed = parsePracticeTerrain(
    JSON.stringify({
      format: 'level6-terrain-v1',
      rows,
      mazePhases: [
        [[85, 82, 16352, 16352, 16352, 16352]],
        [[85, 82, 16316, 16316, 16316, 16316]],
        [[85, 82, 16352, 16352, 16352, 16352]],
        [[85, 82, 16316, 16316, 16316, 16316]],
      ],
    }),
  );
  expect(parsed.level).toBe('level6');
  expect(parsed.cells).toHaveLength(122);
  expect(parsed.mazePhases).toHaveLength(4);
  expect(parsed.mazePhases![0]![0]!.x).toBe(85);
  expect(() =>
    parsePracticeTerrain(
      JSON.stringify({
        format: 'level6-terrain-v1',
        rows,
        mazePhases: ['bad'],
      }),
    ),
  ).toThrow();
  expect(() =>
    parsePracticeTerrain(
      JSON.stringify({
        format: 'level6-terrain-v1',
        rows,
        mazePhases: [[[999, 82, 16352, 16352, 16352, 16352]]],
      }),
    ),
  ).toThrow();
  expect(() =>
    parsePracticeTerrain(
      JSON.stringify({
        format: 'level6-terrain-v1',
        rows,
        mazePhases: [[[85, 82]]],
      }),
    ),
  ).toThrow();
});
