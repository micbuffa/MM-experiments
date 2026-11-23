import { expect, it } from 'vitest';
import { readLevel4Pistons } from './level4Pistons';

it('reads separately timed cylinders from the native level 4 slot table', () => {
  const ram = new DataView(new ArrayBuffer(0x2000));
  function write(
    slot: number,
    timer: number,
    pointer: number,
    x: number,
    z: number,
  ) {
    const base = 0x1650 + 0x10 * slot;
    ram.setInt16(base + 2, timer, true);
    ram.setUint8((base + 4) ^ 1, x);
    ram.setUint8((base + 5) ^ 1, z);
    ram.setUint16(base + 6, 16280, true);
    ram.setUint16(base + 8, pointer >>> 16, true);
    ram.setUint16(base + 10, pointer & 0xffff, true);
  }
  write(0, -1, 0x21342, 69, 55);
  write(12, 100, 0x2134e, 69, 63);
  write(35, -1, 0x2134e, 78, 77);
  expect(readLevel4Pistons(ram)).toEqual([]);
  ram.setUint8(0x760 ^ 1, 1);
  expect(readLevel4Pistons(ram)).toEqual([
    { slot: 0, x: 69, z: 55, height: 16280, step: 1 },
    { slot: 35, x: 78, z: 77, height: 16280, step: 4 },
  ]);
  write(0, -1, 0x2136e, 69, 55);
  expect(readLevel4Pistons(ram)[0]?.step).toBe(2);
  write(0, 100, 0x21376, 69, 55);
  expect(readLevel4Pistons(ram).map(({ slot }) => slot)).toEqual([35]);
  expect(readLevel4Pistons(new DataView(ram.buffer, 0, 0x1650))).toEqual([]);
});
