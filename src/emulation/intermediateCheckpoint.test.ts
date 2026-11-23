import { expect, it } from 'vitest';
import {
  decodeIntermediateCheckpoint,
  encodeIntermediateCheckpoint,
  readCheckpointPorts,
  matchesRestoredCheckpoint,
  restoreCheckpointPorts,
  readCheckpointHardware,
  restoreCheckpointHardware,
} from './intermediateCheckpoint';

it('preserves the native save and signed trackball ports as one versioned checkpoint', () => {
  const state = new Uint8Array(1_106_168);
  const ports = Int32Array.of(-1648, 12276, 900, -34, -1647, 12274, 880, -33);
  state[3] = 74;
  state[state.length - 1] = 19;
  const encoded = encodeIntermediateCheckpoint(
    state,
    ports,
    new Uint8Array(13),
  );
  const unaligned = Uint8Array.of(0, ...encoded.subarray(0, 49));
  const uploaded = new Uint8Array(encoded.length + 1);
  uploaded.set(unaligned);
  uploaded.set(encoded.subarray(49), 50);
  const decoded = decodeIntermediateCheckpoint(uploaded.subarray(1))!;
  expect(decoded.ports).toEqual(ports);
  expect(decoded.state).toEqual(state);
  expect(decodeIntermediateCheckpoint(state)).toBeUndefined();
  uploaded[4] = 1;
  expect(decodeIntermediateCheckpoint(uploaded.subarray(1))).toBeUndefined();
  expect(() =>
    encodeIntermediateCheckpoint(state, Int32Array.of(0), new Uint8Array(13)),
  ).toThrow();
});

it('restores the Atari bank and its original bytes before the CPU continues', () => {
  const heap = new Uint8Array(0x1d99478);
  const memory = new DataView(heap.buffer);
  const target = 26_000_000;
  const savedBankZero = 26_100_000;
  memory.setUint32(24509228, target, true);
  memory.setUint32(24509232, savedBankZero, true);
  memory.setUint32(24509408, 2, true);
  heap.set([1, 0, 0, 0, 2, 3, 1, 0, 0], 24554108);
  heap.fill(0x4d, target + 2 * 8192, target + 3 * 8192);
  heap.fill(0x27, savedBankZero, savedBankZero + 8192);
  const hardware = readCheckpointHardware(heap);
  heap.fill(0, 24554108, 24554117);
  memory.setUint32(24509408, 0, true);
  restoreCheckpointHardware(heap, hardware);
  expect(memory.getUint32(24509408, true)).toBe(2);
  expect(heap.subarray(target, target + 8192)).toEqual(
    new Uint8Array(8192).fill(0x4d),
  );
  expect(readCheckpointHardware(heap)).toEqual(hardware);
  new DataView(hardware.buffer).setUint32(9, 0, true);
  restoreCheckpointHardware(heap, hardware);
  expect(heap[target]).toBe(0x27);
  new DataView(hardware.buffer).setUint32(9, 4, true);
  expect(() => restoreCheckpointHardware(heap, hardware)).toThrow();
});

it('restores both input banks without touching adjacent data or arcade work RAM', () => {
  const heap = new Uint8Array(0x1d99478 + 4).subarray(1);
  const offsets = [0x1018a40, 0x1018ac0];
  const markers = offsets.flatMap((offset) => [offset - 1, offset + 16]);
  markers.push(0x1d99478);
  for (const offset of markers) heap[offset] = 0x5a;
  const ports = Int32Array.of(-300, 500, 0, 0, -320, 520, 10, -10);
  restoreCheckpointPorts(heap, ports);
  expect(readCheckpointPorts(heap)).toEqual(ports);
  const memory = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
  expect(memory.getInt32(offsets[0]!, true)).toBe(-300);
  expect(memory.getInt32(offsets[1]! + 12, true)).toBe(-10);
  expect(markers.map((offset) => heap[offset])).toEqual(
    markers.map(() => 0x5a),
  );
});

it('confirms a restored Level 4 pose without requiring the Level 2 starting coordinates', () => {
  const pose = {
    level: 'level4',
    marble: 'visible',
    scroll: -16152,
    x: 220,
    z: 185,
    height: 16350,
  } as const;
  expect(matchesRestoredCheckpoint(pose, 'level4')).toBe(true);
  expect(
    matchesRestoredCheckpoint({ ...pose, marble: 'hidden' }, 'level4'),
  ).toBe(false);
  expect(matchesRestoredCheckpoint(pose, 'intermediate')).toBe(false);
  expect(
    matchesRestoredCheckpoint(
      { ...pose, level: 'intermediate' },
      'intermediate',
    ),
  ).toBe(false);
  expect(
    matchesRestoredCheckpoint(
      { ...pose, level: 'intermediate', z: 108 },
      'intermediate',
    ),
  ).toBe(true);
});
