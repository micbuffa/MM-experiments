import { expect, it } from 'vitest';
import { readBirdDeath } from './birdDeath';
it('reads the two native fragment groups relative to the projected marble and follows the countdown', () => {
  const memory = new DataView(new ArrayBuffer(0x200));
  const base = 0x18;
  memory.setUint8((base + 0x1a) ^ 1, 11);
  memory.setUint8((base + 0x57) ^ 1, 28);
  memory.setInt16(base + 0x1e, 140, true);
  memory.setInt16(base + 0x20, 100, true);
  for (const [i, offset] of [
    0xa4, 0xaa, 0xb0, 0xb6, 0x38, 0x3e, 0x44, 0x4a,
  ].entries()) {
    memory.setUint16(base + offset, 0x10b + i, true);
    memory.setInt16(base + offset + 2, 140 + i * 3, true);
    memory.setInt16(base + offset + 4, 100 - i * 2, true);
  }
  const death = readBirdDeath(memory, base)!;
  expect(death.progress).toBeCloseTo(0.2);
  expect(death.fragments).toHaveLength(8);
  expect(death.fragments[7]).toEqual({ id: 7, x: 21, y: -14 });
  memory.setUint8((base + 0x1a) ^ 1, 4);
  expect(readBirdDeath(memory, base)).toBeUndefined();
  expect(readBirdDeath(new DataView(new ArrayBuffer(4)), base)).toBeUndefined();
});

it('ignores stale graphics at the sentinel and reads the second player independently', () => {
  const memory = new DataView(new ArrayBuffer(0x400));
  const base = 0xfa;
  memory.setUint8((base + 0x1a) ^ 1, 11);
  memory.setUint8((base + 0x57) ^ 1, 102);
  memory.setUint16(base + 0xa4, 0x10b, true);
  expect(readBirdDeath(memory, base)).toEqual({ progress: 0, fragments: [] });
  memory.setUint8((base + 0x57) ^ 1, 0);
  expect(readBirdDeath(memory, base)?.progress).toBe(1);
  expect(readBirdDeath(memory, 0x18)).toBeUndefined();
});
