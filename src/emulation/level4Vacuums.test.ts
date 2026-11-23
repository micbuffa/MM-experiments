import { expect, it } from 'vitest';
import {
  readLevel4VacuumExtensions,
  readLevel4VacuumMouthFrames,
} from './level4Vacuums';

it('reads opening, active and closing frames by actor ID, regardless of slot order', () => {
  const memory = new DataView(new ArrayBuffer(0x2000));
  function actor(slot: number, id: number, kind: number, frame: number) {
    const base = 0xa9c + slot * 0x56;
    memory.setUint8((base + 0x18) ^ 1, 1);
    memory.setUint8((base + 0x1b) ^ 1, id);
    memory.setUint8((base + 0x1f) ^ 1, kind);
    memory.setUint16(base + 0x3e, frame >>> 16, true);
    memory.setUint16(base + 0x40, frame & 0xffff, true);
  }
  actor(9, 0x1e, 0x0b, 0x21fc2);
  actor(2, 0x20, 0x0d, 0x220a6);
  actor(3, 0x1f, 0x0b, 0x20c14);
  actor(4, 0x23, 0x0d, 0x22092);
  actor(5, 0x21, 0x02, 0x21fc2);
  expect(readLevel4VacuumExtensions(memory)).toEqual([
    0.125, 0, 1, 0, 0, 0.125,
  ]);
  actor(9, 0x1e, 0x0b, 0x22002);
  actor(2, 0x20, 0x0d, 0x2206e);
  expect(readLevel4VacuumExtensions(memory)).toEqual([
    0.125, 0, 1, 0, 0, 0.125,
  ]);
  memory.setUint8((0xa9c + 2 * 0x56 + 0x18) ^ 1, 0);
  expect(readLevel4VacuumExtensions(memory)[2]).toBe(0);
  expect(
    readLevel4VacuumExtensions(new DataView(new ArrayBuffer(0xa9c))),
  ).toEqual([0, 0, 0, 0, 0, 0]);
});

it('reads active mouth alternation from emitted images and stops on withdrawal', () => {
  const memory = new DataView(new ArrayBuffer(0x2000));
  const base = 0xa9c;
  memory.setUint8((base + 0x18) ^ 1, 1);
  memory.setUint8((base + 0x1b) ^ 1, 0x1e);
  memory.setUint8((base + 0x1f) ^ 1, 0x0b);
  memory.setUint16(base + 0x42, 2, true);
  memory.setUint16(base + 0x44, 0x2016, true);
  memory.setUint16(base + 0x3e, 2, true);
  memory.setUint16(base + 0x40, 0x201a, true);
  expect(readLevel4VacuumMouthFrames(memory)[0]).toBe(0);
  memory.setUint16(base + 0x44, 0x201a, true);
  expect(readLevel4VacuumMouthFrames(memory)[0]).toBe(1);
  memory.setUint16(base + 0x44, 0x1fe6, true);
  expect(readLevel4VacuumMouthFrames(memory)[0]).toBeUndefined();
  memory.setUint8((base + 0x1b) ^ 1, 0x20);
  memory.setUint8((base + 0x1f) ^ 1, 0x0d);
  memory.setUint16(base + 0x44, 0x20aa, true);
  expect(readLevel4VacuumMouthFrames(memory)[2]).toBe(1);
  memory.setUint8((base + 0x18) ^ 1, 0);
  expect(
    readLevel4VacuumMouthFrames(memory).every((v) => v === undefined),
  ).toBe(true);
  expect(
    readLevel4VacuumMouthFrames(new DataView(new ArrayBuffer(0xae1))),
  ).toHaveLength(6);
});
