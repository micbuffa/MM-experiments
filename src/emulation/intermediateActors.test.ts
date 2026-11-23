import { expect, it } from 'vitest';
import { readIntermediateActors } from './intermediateActors';

it('reads the black marble and worm positions, script phase and eat state from native records', () => {
  const memory = new DataView(new ArrayBuffer(0x2000));
  const byte = (address: number, value: number) =>
    memory.setUint8(address ^ 1, value);
  const word = (address: number, value: number) =>
    memory.setUint16(address, value, true);
  const long = (address: number, value: number) => {
    word(address, Math.floor(value / 65536));
    word(address + 2, value & 65535);
  };
  for (const base of [0xa20, 0x1422]) {
    byte(base + 0x18, 1);
    long(base + 0xc, 391 * 65536 + 32768);
    long(base + 0x10, 345 * 65536);
    long(base + 0x14, 16264 * 65536);
  }
  byte(0x1422 + 0x1a, 5);
  byte(0x1422 + 0x24, 1);
  byte(0x1422 + 0x25, 2);
  long(0x1422 + 0x58, 0x20e3c);
  long(0x1422 + 0x5c, 0x20e28);
  const actors = readIntermediateActors(memory);
  expect(actors).toHaveLength(2);
  expect(actors[0]).toMatchObject({
    kind: 'black',
    x: 391.5,
    z: 345,
    height: 16264,
  });
  expect(actors[1]).toMatchObject({
    id: 4,
    kind: 'worm',
    state: 5,
    script: 0x20e28,
    scriptFrame: 5,
    phase: 0.5,
  });
  expect(readIntermediateActors(new DataView(new ArrayBuffer(0x980)))).toEqual(
    [],
  );
});

it('omits inactive actors', () => {
  expect(readIntermediateActors(new DataView(new ArrayBuffer(0x2000)))).toEqual(
    [],
  );
});

it('reads native Level 3 acid amoeba pool records starting at 0x1482', () => {
  const memory = new DataView(new ArrayBuffer(0x2000));
  const byte = (address: number, value: number) =>
    memory.setUint8(address ^ 1, value);
  const word = (address: number, value: number) =>
    memory.setUint16(address, value, true);
  const long = (address: number, value: number) => {
    word(address, Math.floor(value / 65536));
    word(address + 2, value & 65535);
  };
  const slot = 0x1482 + 2 * 0x42;
  byte(slot + 0x18, 1);
  long(slot + 0xc, 64 * 8 * 65536);
  long(slot + 0x10, 68 * 8 * 65536);
  long(slot + 0x14, 16320 * 65536);
  const actors = readIntermediateActors(memory);
  expect(actors).toHaveLength(1);
  expect(actors[0]).toMatchObject({
    id: 12,
    kind: 'acid',
    x: 512,
    z: 544,
    height: 16320,
  });
});
