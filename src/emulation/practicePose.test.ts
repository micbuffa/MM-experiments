import { describe, expect, it } from 'vitest';
import {
  PRACTICE_WORK_RAM,
  readPracticePose,
  readModernPhase,
} from './practicePose';

describe('readPracticePose', () => {
  const heap = new Uint8Array(PRACTICE_WORK_RAM + 0x981).subarray(1);
  const ram = new DataView(heap.buffer, heap.byteOffset + PRACTICE_WORK_RAM);

  function arrange() {
    const words = [
      [0x474, 2],
      [0x476, 0xbee2],
      [0x390, 0],
      [0x396, 1],
      [0x3a4, 0xff00],
      [0x24, -42],
      [0x26, 0xc000],
      [0x28, 151],
      [0x2a, 0x8000],
      [0x2c, 0x4011],
      [0x2e, 0x4000],
      [0x97e, 0xc0f0],
    ] as const;
    for (const [address, value] of words) ram.setUint16(address, value, true);
    ram.setUint8(0x31, 1);
    ram.setUint8(0x33, 0);
    ram.setUint8(0x35, 1);
  }

  it('preserves fractional coordinates and the sign of 68010 fixed-point positions', () => {
    arrange();
    expect(readPracticePose(heap)).toEqual({
      marble: 'visible',
      x: -41.25,
      z: 151.5,
      height: 0x4011 + 0.25,
      scroll: -16144,
      atGoal: false,
    });
  });

  it('exposes the next supported terrain during its native title countdown', () => {
    arrange();
    ram.setUint16(0x476, 0xc54c, true);
    ram.setUint16(0x390, 3, true);
    expect(readPracticePose(heap, 2450)).toMatchObject({
      level: 'intermediate',
      frame: 2450,
    });
    ram.setUint16(0x390, 2, true);
    expect(readPracticePose(heap, 2450)).toBeNull();
    ram.setUint16(0x390, 0, true);
    ram.setUint16(0x476, 0xbee2, true);
  });

  it('keeps title countdowns and out-of-time/game-over in 3D while returning results and attract to arcade', () => {
    arrange();
    for (const mode of [0, 3, 4, 5]) {
      ram.setUint16(0x390, mode, true);
      expect(readModernPhase(heap)).toBe('level');
    }
    for (const mode of [1, 2, 6]) {
      ram.setUint16(0x390, mode, true);
      expect(readModernPhase(heap)).toBe('arcade');
    }
    ram.setUint16(0x390, 4, true);
    ram.setUint8(0x31, 2);
    expect(readPracticePose(heap)?.marble).toBe('visible');
    ram.setUint16(0x390, 0, true);
    ram.setUint16(0x476, 0xdead, true);
    expect(readModernPhase(heap)).toBe('arcade');
    expect(readModernPhase(new Uint8Array(10))).toBe('loading');
    arrange();
  });

  it('reads broken primary/broom pointers and Intermediate Race bridge height steps', () => {
    arrange();
    ram.setUint8(0x33, 2);
    ram.setUint16(0x72, 2, true);
    ram.setUint16(0x74, 0x0fde + 8 * 4, true);
    ram.setUint8(0x7f ^ 1, 0);
    expect(readPracticePose(heap)?.broken).toEqual({ primaryFrame: 8 });
    ram.setUint16(0x74, 0x0fde + 13 * 4, true);
    ram.setUint8(0x7f ^ 1, 1);
    ram.setUint16(0x7a, 2, true);
    ram.setUint16(0x7c, 0x15f6 + 7 * 4, true);
    expect(readPracticePose(heap)?.broken).toEqual({
      primaryFrame: 13,
      broomFrame: 7,
    });
    ram.setUint8(0x33, 0);
    ram.setUint16(0x476, 0xc54c, true);
    ram.setUint16(0x772, 0xf040, true);
    ram.setUint16(0x774, 0xf040, true);
    expect(readPracticePose(heap)?.bridgeStep).toBeUndefined();
    for (let step = 0; step <= 6; step++) {
      ram.setUint16(0x772, 0x6fc8 + step * 2, true);
      ram.setUint16(0x774, 0xf048 + step * 2, true);
      expect(readPracticePose(heap)?.bridgeStep).toBe(step);
    }
    arrange();
  });

  it('reads native magic timing, body stretch and +10 SEC notices for either player', () => {
    arrange();
    ram.setUint8(0x33, 8);
    ram.setUint8(0x6e ^ 1, 9);
    ram.setUint8(0x6f ^ 1, 10);
    ram.setUint16(0xe4, 2, true);
    ram.setUint16(0xe6, 0x16aa + 26 * 4, true);
    expect(readPracticePose(heap)?.magic).toEqual({
      progress: 0,
      frame: 26,
      stretch: 0.75,
    });
    ram.setUint8(0x6f ^ 1, 5);
    ram.setUint16(0xe6, 0x16aa + 28 * 4, true);
    expect(readPracticePose(heap)?.magic).toEqual({
      progress: 0.5,
      frame: 28,
      stretch: 1.5,
    });
    ram.setUint16(0xe6, 0x16aa, true);
    expect(readPracticePose(heap)?.magic?.stretch).toBe(1);
    ram.setUint16(0xec, 2, true);
    ram.setUint16(0xee, 0x2446, true);
    ram.setUint8(0xf0 ^ 1, 1);
    ram.setInt8(0x80 ^ 1, -9);
    expect(readPracticePose(heap)?.timeBonusOffset).toBe(-9);
    expect(readPracticePose(heap)?.timeBonusSeconds).toBe(10);
    ram.setUint16(0xee, 0x242e, true);
    expect(readPracticePose(heap)?.timeBonusOffset).toBe(-9);
    expect(readPracticePose(heap)?.timeBonusSeconds).toBe(3);
    ram.setUint16(0xee, 0x2446, true);
    ram.setUint16(0x396, 2, true);
    expect(readPracticePose(heap)?.catchUpOffset).toBeUndefined();
    ram.setUint16(0x396, 1, true);
    ram.setUint8(0xf0 ^ 1, 0);
    expect(readPracticePose(heap)?.timeBonusOffset).toBeUndefined();
    ram.setUint8(0x33, 0);
  });

  it('reads the native black-marble reward as 1000 points without inventing time or a penalty', () => {
    arrange();
    ram.setUint16(0x396, 2, true);
    ram.setUint16(0xec, 2, true);
    ram.setUint16(0xee, 0x23aa, true);
    ram.setUint8(0xf0 ^ 1, 1);
    ram.setUint16(0x88, 0x00ff, true);
    ram.setInt8(0x80 ^ 1, -8);
    expect(readPracticePose(heap)?.scoreAward).toEqual({
      points: 1000,
      offset: -8,
    });
    expect(readPracticePose(heap)?.timeBonusOffset).toBeUndefined();
    expect(readPracticePose(heap)?.catchUpOffset).toBeUndefined();
    ram.setUint8(0xf0 ^ 1, 0);
    expect(readPracticePose(heap)?.scoreAward).toBeUndefined();
    arrange();
  });

  it('preserves small reversals across an integer boundary in the native settling trace', () => {
    arrange();
    const positions = [
      [174, 13823],
      [173, 42537],
      [174, 6076],
    ] as const;
    const z = positions.map(([whole, fractional]) => {
      ram.setUint16(0x28, whole, true);
      ram.setUint16(0x2a, fractional, true);
      return readPracticePose(heap)!.z;
    });
    expect(z[0]! - z[1]!).toBeCloseTo(0.56);
    expect(z[2]! - z[1]!).toBeCloseTo(0.44);
  });

  it('keeps the camera snapshot when the ball is hidden or rebuilding', () => {
    arrange();
    ram.setUint8(0x35, 0);
    expect(readPracticePose(heap)).toMatchObject({
      marble: 'hidden',
      scroll: -16144,
    });
    ram.setUint8(0x33, 4);
    expect(readPracticePose(heap)?.marble).toBe('rebuilding');
    ram.setUint8(0x35, 1);
    expect(readPracticePose(heap)?.marble).toBe('rebuilding');
    ram.setUint16(0x6e, 47, true);
    expect(readPracticePose(heap)?.respawnTicks).toBe(47);
    ram.setUint16(0x6e, 48, true);
    expect(readPracticePose(heap)?.respawnTicks).toBeUndefined();
  });

  it('keeps a drawable marble in an unrecognized animation and hides malformed display flags', () => {
    arrange();
    ram.setUint8(0x33, 7);
    expect(readPracticePose(heap)?.marble).toBe('visible');
    ram.setUint8(0x33, 0);
    ram.setUint8(0x35, 2);
    expect(readPracticePose(heap)?.marble).toBe('hidden');
  });

  it('reads the native animation and uses the emulator frame as its clock', () => {
    arrange();
    ram.setUint8(0x33, 2);
    expect(readPracticePose(heap, 420)).toMatchObject({
      animation: 2,
      animationTick: 420,
    });
    expect(readPracticePose(heap, 420)).toMatchObject({ animationTick: 420 });
    ram.setUint8(0x33, 5);
    expect(readPracticePose(heap, 430)).toMatchObject({
      animation: 5,
      animationTick: 430,
    });
    ram.setUint8(0x33, 0);
    expect(readPracticePose(heap, 431)?.animation).toBeUndefined();
  });

  it('reads the visible arrival and lets arcade show the results and next race', () => {
    arrange();
    ram.setUint8(0x33, 6);
    ram.setUint16(0x97e, -15784, true);
    expect(readPracticePose(heap)).toMatchObject({
      marble: 'visible',
      scroll: -15784,
      atGoal: true,
    });
    ram.setUint16(0x390, 3, true);
    expect(readPracticePose(heap)).toBeNull();
    ram.setUint16(0x390, 0, true);
    ram.setUint16(0x476, 0xc54c, true);
    expect(readPracticePose(heap)).toMatchObject({
      level: 'intermediate',
      marble: 'visible',
      x: -41.25,
      z: 151.5,
    });
    expect(readPracticePose(heap)?.startLift).toBeUndefined();
    ram.setUint16(0x390, 3, true);
    expect(readPracticePose(heap)).toBeNull();
  });

  it('reads the first finisher even after both players reach the goal', () => {
    arrange();
    ram.setUint16(0x396, 2, true);
    ram.setUint16(0x112, 0x0101, true);
    ram.setUint16(0x114, 0x0600, true);
    ram.setUint16(0x116, 0x0100, true);
    ram.setUint16(0x3a4, 0x0100, true);
    expect(readPracticePose(heap)?.goalOwner).toBe(2);
    ram.setUint8(0x33, 6);
    expect(readPracticePose(heap)?.goalOwner).toBe(2);
    ram.setUint16(0x112, 0x0100, true);
    expect(readPracticePose(heap)?.player2?.marble).toBe('hidden');
    expect(readPracticePose(heap)?.goalOwner).toBe(2);
    ram.setUint16(0x3a4, 0x0000, true);
    expect(readPracticePose(heap)?.goalOwner).toBe(1);
  });

  it.each([0x474, 0x476, 0x390, 0x396])(
    'rejects an incompatible word at %i',
    (address) => {
      arrange();
      ram.setUint16(address, 7, true);
      expect(readPracticePose(heap)).toBeNull();
    },
  );

  it('reads Level 3 descriptor 0x2cd9e with native wave profile and acid melt progress', () => {
    arrange();
    ram.setUint16(0x474, 0x0002, true);
    ram.setUint16(0x476, 0xcd9e, true);
    ram.setUint16(0x76e, 0x9ab4, true);
    ram.setUint16(0x774, 0x9ac3, true);
    ram.setUint16(0x77a, 0x9ad2, true);
    ram.setUint16(0x7f0, 0x8fa2, true);
    ram.setUint8(0x33, 9);
    ram.setUint16(0x74, 0x106e, true);
    expect(readModernPhase(heap)).toBe('level');
    const pose = readPracticePose(heap, 42);
    expect(pose).toMatchObject({
      level: 'level3',
      frame: 42,
      marble: 'visible',
      animation: 9,
      animationTick: 42,
      melt: 0.5,
      actors: [],
    });
    expect(pose?.waveProfile).toHaveLength(22);
    expect(pose?.waveProfile?.slice(0, 3)).toEqual([0, 0.5, 1]);
    expect(pose?.waveProfile?.[21]).toBe(1);
  });

  it('reads Level 4 (Aerial Race) descriptor 0x2d648', () => {
    arrange();
    ram.setUint16(0x474, 0x0002, true);
    ram.setUint16(0x476, 0xd648, true);
    expect(readModernPhase(heap)).toBe('level');
    expect(readPracticePose(heap, 99)).toMatchObject({
      level: 'level4',
      frame: 99,
      marble: 'visible',
      actors: [],
    });
  });

  it('reads the Level 4 suction countdown and native catapult launch frames', () => {
    arrange();
    const work = new Uint8Array(PRACTICE_WORK_RAM + 0x2000);
    work.set(heap.subarray(PRACTICE_WORK_RAM), PRACTICE_WORK_RAM);
    const memory = new DataView(work.buffer, PRACTICE_WORK_RAM);
    memory.setUint16(0x476, 0xd648, true);
    const vacuum = 0xa9c + 2 * 0x56;
    memory.setUint8((vacuum + 0x1b) ^ 1, 0x20);
    memory.setUint8((vacuum + 0x1f) ^ 1, 0x0d);
    memory.setUint8(0x32 ^ 1, 0x0a);
    memory.setUint8(0x6f ^ 1, 24);
    memory.setUint8(0x70 ^ 1, 2);
    const catapult = 0xa9c + 7 * 0x56;
    memory.setUint8((catapult + 0x18) ^ 1, 1);
    memory.setUint8((catapult + 0x1f) ^ 1, 0x0a);
    memory.setUint16(catapult + 0x3e, 2, true);
    memory.setUint16(catapult + 0x40, 0x111e, true);
    expect(readPracticePose(work)?.suction).toEqual({
      progress: 0.25,
      vacuumIndex: 2,
    });
    expect(readPracticePose(work)?.catapultFrame).toBeUndefined();
    memory.setUint16(catapult + 0x40, 0x10d6, true);
    expect(readPracticePose(work)?.catapultFrame).toBe(3);
    memory.setUint8(0x32 ^ 1, 4);
    expect(readPracticePose(work)?.suction).toBeUndefined();
  });

  it('hides an inactive slot and rejects truncated RAM', () => {
    arrange();
    expect(readPracticePose(heap.subarray(0, -1))).toBeNull();
    ram.setUint8(0x31, 0);
    expect(readPracticePose(heap)?.marble).toBe('hidden');
  });

  it('reads the second slot while the first player falls or is absent', () => {
    arrange();
    ram.setUint16(0x396, 2, true);
    ram.setUint16(0x106, 132, true);
    ram.setUint16(0x108, 0x8000, true);
    ram.setUint16(0x10a, 148, true);
    ram.setUint16(0x10e, 0x4000, true);
    ram.setUint16(0x110, 0x4000, true);
    ram.setUint16(0x112, 0x0101, true);
    ram.setUint16(0x114, 0, true);
    ram.setUint16(0x116, 0x0100, true);
    ram.setUint8(0x33, 4);
    expect(readPracticePose(heap)).toMatchObject({
      marble: 'rebuilding',
      player2: { marble: 'visible', x: 132.5, z: 148, height: 0x4000 + 0.25 },
    });
    ram.setUint8(0x31, 0);
    ram.setUint16(0x114, 0x0600, true);
    expect(readPracticePose(heap)).toMatchObject({
      marble: 'hidden',
      player2: { marble: 'visible', atGoal: true },
    });
    ram.setUint16(0x112, 0x0100, true);
    expect(readPracticePose(heap)?.player2).toMatchObject({
      marble: 'hidden',
      atGoal: false,
    });
    ram.setUint16(0x112, 0x0101, true);
    ram.setUint16(0x114, 0x0400, true);
    ram.setUint16(0x150, 12, true);
    expect(readPracticePose(heap)?.player2).toMatchObject({
      marble: 'rebuilding',
      respawnTicks: 12,
    });
  });

  it('shows the penalty for a returning player until the arcade retires the notice', () => {
    arrange();
    ram.setUint16(0x396, 2, true);
    ram.setUint16(0x112, 0x0101, true);
    ram.setUint16(0x114, 0x0400, true);
    ram.setUint16(0x116, 0x0100, true);
    ram.setUint16(0x162, 0x00ff, true);
    ram.setUint16(0x16a, 0x00ff, true);
    ram.setUint16(0x1ce, 2, true);
    ram.setUint16(0x1d0, 0x243a, true);
    ram.setUint8((0xe2 + 0xf0) ^ 1, 1);
    expect(readPracticePose(heap)?.player2?.catchUpOffset).toBeUndefined();
    ram.setUint16(0x114, 0, true);
    expect(readPracticePose(heap)?.player2?.catchUpOffset).toBe(0);
    ram.setUint16(0x162, 0xf401, true);
    ram.setUint16(0x16a, 0x28ff, true);
    expect(readPracticePose(heap)?.player2?.catchUpOffset).toBe(-12);
    ram.setUint16(0x16a, 0xffff, true);
    expect(readPracticePose(heap)?.player2?.catchUpOffset).toBeUndefined();
    expect(readPracticePose(heap)?.catchUpOffset).toBeUndefined();
  });

  it('reads all observed lift positions and clears the lift on flat paving', () => {
    arrange();
    const sequence = [0x20c2, 0x2245, 0x244a, 0x254e, 0x25d0, 0x254e, 0xf040];
    const phases = sequence.map((code) => {
      ram.setUint16(0x76e, code, true);
      ram.setUint16(0x774, code | 0x4000, true);
      return readPracticePose(heap)?.startLift;
    });
    expect(phases).toEqual([1, 2, 3, 4, 5, 4, undefined]);
    ram.setUint16(0x76e, 0x25d0, true);
    expect(readPracticePose(heap)?.startLift).toBeUndefined();
  });

  it('represents the solo starting countdown continuously across the byte wrap', () => {
    arrange();
    ram.setUint16(0x390, 5, true);
    ram.setUint8(0x15, 0x42);
    expect(readPracticePose(heap)?.opening).toBe(0);
    ram.setUint8(0x15, 0xff);
    const beforeWrap = readPracticePose(heap)!.opening!;
    ram.setUint8(0x15, 0x00);
    expect(readPracticePose(heap)!.opening! - beforeWrap).toBeCloseTo(1 / 251);
    ram.setUint8(0x15, 0x3d);
    expect(readPracticePose(heap)?.opening).toBe(1);
    ram.setUint16(0x97e, -16100, true);
    expect(readPracticePose(heap)).toBeNull();
    ram.setUint16(0x390, 0, true);
    expect(readPracticePose(heap)?.opening).toBeUndefined();
  });
});

it.each([0xbee2, 0xc54c, 0xcd9e])(
  'publishes native terrain colors for descriptor %x and reuses the palette',
  (descriptor) => {
    const heap = new Uint8Array(PRACTICE_WORK_RAM + 0x2000);
    const memory = new DataView(heap.buffer);
    const ram = new DataView(heap.buffer, PRACTICE_WORK_RAM);
    ram.setUint16(0x474, 2, true);
    ram.setUint16(0x476, descriptor, true);
    ram.setUint16(0x396, 1, true);
    ram.setUint16(0x2c, 16384, true);
    ram.setUint16(0x97e, 0xc0f0, true);
    for (const address of [9849592, 9849960]) {
      memory.setUint32(address, 0xb00000, true);
      memory.setUint32(address + 4, 0xb007ff, true);
    }
    memory.setUint32(9849592 + 8, 25, true);
    memory.setUint32(9849960 + 8, 17939, true);
    memory.setUint32(9849960 + 12, 16958436, true);
    memory.setUint32(16958436, 17_000_000, true);
    memory.setUint16(17_000_000 + 0x400 + 15 * 2, 0xf0bf, true);
    const first = readPracticePose(heap)!;
    expect(first.terrainPalette?.[15]).toBe(0xf0bf);
    expect(
      readPracticePose(heap, 1, first.terrainPalette)?.terrainPalette,
    ).toBe(first.terrainPalette);
    memory.setUint16(17_000_000 + 0x400 + 15 * 2, 0x1fff, true);
    expect(
      readPracticePose(heap, 2, first.terrainPalette)?.terrainPalette?.[15],
    ).toBe(0x1fff);
    expect(first.terrainPalette?.[15]).toBe(0xf0bf);
  },
);

it('identifies Silly Race and reads its miniature pool without treating it as worms from another level', () => {
  const heap = new Uint8Array(PRACTICE_WORK_RAM + 0x2000);
  const ram = new DataView(heap.buffer, PRACTICE_WORK_RAM);
  for (const [o, v] of [
    [0x474, 2],
    [0x476, 0xde1e],
    [0x396, 1],
    [0x97e, -15212],
    [0x24, 1004],
    [0x28, 996],
    [0x2c, 16168],
  ])
    ram.setUint16(o!, v!, true);
  ram.setUint8(0x31, 1);
  ram.setUint8(0x35, 1);
  const base = 0x1890;
  ram.setUint8((base + 0x18) ^ 1, 1);
  ram.setUint8((base + 0x25) ^ 1, 7);
  ram.setUint16(base + 0xc, 750, true);
  ram.setUint16(base + 0x10, 780, true);
  ram.setUint16(base + 0x14, 16238, true);
  expect(readModernPhase(heap)).toBe('level');
  const pose = readPracticePose(heap, 42);
  expect(pose).toMatchObject({
    level: 'level5',
    frame: 42,
    x: 1004,
    z: 996,
    scroll: -15212,
  });
  expect(pose?.level5Actors).toHaveLength(1);
  expect(pose?.actors).toBeUndefined();
  ram.setUint16(0x390, 3, true);
  expect(readPracticePose(heap)?.level).toBe('level5');
});

it('exposes the bird death for each player and clears it during native reconstruction', () => {
  const heap = new Uint8Array(PRACTICE_WORK_RAM + 0x2000),
    memory = new DataView(heap.buffer, PRACTICE_WORK_RAM);
  for (const [offset, value] of [
    [0x474, 2],
    [0x476, 0xde1e],
    [0x396, 2],
  ])
    memory.setUint16(offset!, value!, true);
  for (const base of [0, 0xe2]) {
    memory.setUint8(base + 0x31, 1);
    memory.setUint8(base + 0x30, base === 0 ? 0 : 1);
    memory.setUint8(base + 0x33, 11);
    memory.setUint8(base + 0x6e, 20);
  }
  const pose = readPracticePose(heap, 42)!;
  expect(pose.animation).toBe(11);
  expect(pose.birdDeath?.progress).toBeCloseTo(15 / 35);
  expect(pose.player2?.birdDeath?.progress).toBeCloseTo(15 / 35);
  memory.setUint8(0x33, 4);
  expect(readPracticePose(heap)?.birdDeath).toBeUndefined();
});

it('exposes inPipe when 68010 animation state is 3 (pipe traversal)', () => {
  const heap = new Uint8Array(PRACTICE_WORK_RAM + 0x2000),
    memory = new DataView(heap.buffer, PRACTICE_WORK_RAM);
  for (const [offset, value] of [
    [0x474, 2],
    [0x476, 0xde1e],
    [0x396, 1],
  ])
    memory.setUint16(offset!, value!, true);
  memory.setUint8(0x31, 1);
  memory.setUint8(0x30, 0);
  memory.setUint8(0x33, 3);
  expect(readPracticePose(heap)?.inPipe).toBe(true);
  memory.setUint8(0x33, 0);
  expect(readPracticePose(heap)?.inPipe).toBeUndefined();
});
