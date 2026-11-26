import { describe, expect, it } from 'vitest';
import {
  beginPipeTraversal,
  isExitOccupied,
  LEVEL2_PIPES,
  PIPE_COUNTDOWN_TICKS,
  PIPE_RELEASE_SECONDS,
  PIPE_RELEASE_TICKS,
  pipeTraversalAt,
  probePipeEntry,
} from './pipeTeleport';

const [dropPipe, yPipe] = LEVEL2_PIPES as [
  (typeof LEVEL2_PIPES)[number],
  (typeof LEVEL2_PIPES)[number],
];
const at = (cellX: number, cellZ: number, height: number) => ({
  x: cellX * 8 + 4,
  z: cellZ * 8 + 4,
  height,
});

describe('probePipeEntry: drop pipe (zone 0x12 at cell 64,78)', () => {
  it('teleports between heights 0x3f41 and 0x3f5f inside cells x 62..64, z 74..79', () => {
    for (const [x, z] of [
      [62, 74],
      [64, 79],
      [63, 77],
    ] as const) {
      const r = probePipeEntry(at(x, z, 0x3f50));
      expect(r.kind).toBe('enter');
      if (r.kind === 'enter') {
        expect(r.pipe.id).toBe('drop-pipe');
        expect(r.entry.romType).toBe(0x12);
      }
    }
    expect(probePipeEntry(at(63, 77, 0x3f41)).kind).toBe('enter');
    expect(probePipeEntry(at(63, 77, 0x3f5f)).kind).toBe('enter');
  });

  it('applies each height band boundary', () => {
    expect(probePipeEntry(at(63, 77, 0x3f40)).kind).toBe('none');
    expect(probePipeEntry(at(63, 77, 0x3f60)).kind).toBe('mouth');
    expect(probePipeEntry(at(63, 77, 0x3f77)).kind).toBe('mouth');
    expect(probePipeEntry(at(63, 77, 0x3f78)).kind).toBe('rim');
    expect(probePipeEntry(at(63, 77, 0x3f88)).kind).toBe('rim');
  });

  it('keeps the rim over the whole gate but enters only for x <= 64', () => {
    expect(probePipeEntry(at(66, 77, 0x3f80)).kind).toBe('rim');
    expect(probePipeEntry(at(65, 77, 0x3f50)).kind).toBe('none');
    expect(probePipeEntry(at(61, 77, 0x3f50)).kind).toBe('none');
    expect(probePipeEntry(at(63, 73, 0x3f50)).kind).toBe('none');
    expect(probePipeEntry(at(63, 80, 0x3f50)).kind).toBe('none');
  });

  it('compares integer arcade units', () => {
    expect(
      probePipeEntry({ x: 64 * 8 + 7.9, z: 600, height: 0x3f50 }).kind,
    ).toBe('enter');
    expect(probePipeEntry({ x: 65 * 8, z: 600, height: 0x3f50 }).kind).toBe(
      'none',
    );
  });
});

describe('probePipeEntry: Y-pipe (zones 0x13 at 81,86 and 0x14 at 87,86)', () => {
  it('enters from either arm on row z = 86, at any height', () => {
    for (const [x, type] of [
      [79, 0x13],
      [81, 0x13],
      [85, 0x14],
      [87, 0x14],
    ] as const) {
      const r = probePipeEntry(at(x, 86, 0x3f30));
      expect(r.kind).toBe('enter');
      if (r.kind === 'enter') {
        expect(r.pipe.id).toBe('y-pipe');
        expect(r.entry.romType).toBe(type);
      }
    }
    expect(probePipeEntry(at(80, 86, 0x3000)).kind).toBe('enter');
  });

  it('reports the pipe body inside the gate but outside the mouth cells', () => {
    expect(probePipeEntry(at(80, 85, 0x3f30)).kind).toBe('body');
    expect(probePipeEntry(at(82, 86, 0x3f30)).kind).toBe('body');
    expect(probePipeEntry(at(86, 87, 0x3f30)).kind).toBe('body');
  });

  it('uses the exact unit gate of zone 0x13', () => {
    const gateX = yPipe.entries[0]!.gateUnitsX;
    const gateZ = yPipe.entries[0]!.gateUnitsZ;
    expect(gateX).toEqual({ min: 617, max: 672 });
    expect(gateZ).toEqual({ min: 665, max: 704 });
    expect(probePipeEntry({ x: 616, z: 690, height: 0 }).kind).toBe('none');
    expect(probePipeEntry({ x: 617, z: 690, height: 0 }).kind).toBe('body');
    expect(probePipeEntry({ x: 640, z: 705, height: 0 }).kind).toBe('none');
  });
});

describe('exit selection (0x17cb8)', () => {
  it('detects another marble near the exit with the octagonal metric', () => {
    const exit = dropPipe.exit;
    expect(isExitOccupied(exit, exit)).toBe(true);
    expect(isExitOccupied(exit, { x: exit.x + 6, z: exit.z })).toBe(true);
    expect(isExitOccupied(exit, { x: exit.x + 7, z: exit.z })).toBe(false);
    // (5, 5): 16 * 5 + 3 * (2 * 5) = 110 < 112; (5, 6): 16 * 6 + 3 * 10 = 126.
    expect(isExitOccupied(exit, { x: exit.x + 5, z: exit.z + 5 })).toBe(true);
    expect(isExitOccupied(exit, { x: exit.x + 5, z: exit.z + 6 })).toBe(false);
    expect(isExitOccupied(exit, { x: exit.x + 40, z: exit.z })).toBe(false);
  });

  it('uses the alternate exit when occupied', () => {
    const entry = dropPipe.entries[0]!;
    const free = beginPipeTraversal(dropPipe, entry, [{ x: 0, z: 0 }]);
    expect(free.exit).toEqual({ x: 0x20c, z: 0x264 });
    expect(free.usedAlternateExit).toBe(false);
    const busy = beginPipeTraversal(dropPipe, entry, [{ x: 0x20c, z: 0x264 }]);
    expect(busy.exit).toEqual({ x: 0x204, z: 0x264 });
    expect(busy.usedAlternateExit).toBe(true);
  });
});

describe('beginPipeTraversal / pipeTraversalAt', () => {
  it('carries per-pipe exit data, 15 cells/s exit speed and sound 0x35', () => {
    const drop = beginPipeTraversal(dropPipe, dropPipe.entries[0]!);
    expect(drop).toMatchObject({
      entryType: 0x12,
      entrySound: 0x35,
      exitVelocityWorld: { x: 15, z: 0 },
    });
    expect(dropPipe).toMatchObject({ clearsAirborne: true, exitScore: 4000 });
    const y = beginPipeTraversal(yPipe, yPipe.entries[1]!);
    expect(y).toMatchObject({
      entryType: 0x14,
      exit: { x: 0x29c, z: 0x2e4 },
      exitVelocityWorld: { x: 0, z: 15 },
    });
    expect(yPipe).toMatchObject({ clearsAirborne: false, exitScore: 2000 });
  });

  it('hides and freezes the marble for 19 ticks then releases it', () => {
    expect(PIPE_COUNTDOWN_TICKS).toBe(18);
    expect(PIPE_RELEASE_TICKS).toBe(19);
    expect(PIPE_RELEASE_SECONDS).toBeCloseTo(0.6333, 4);
    expect(pipeTraversalAt(0)).toEqual({
      hidden: true,
      frozen: true,
      released: false,
      ticks: 0,
    });
    expect(pipeTraversalAt(18 / 30).released).toBe(false);
    expect(pipeTraversalAt(19 / 30)).toEqual({
      hidden: false,
      frozen: false,
      released: true,
      ticks: 19,
    });
    expect(pipeTraversalAt(-1).ticks).toBe(0);
  });
});
