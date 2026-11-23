import { expect, it } from 'vitest';
import { readLevel5Actors } from './level5Actors';

it('reads the nine miniatures and ten birds from separate native pools', () => {
  const ram = new DataView(new ArrayBuffer(0x2000));
  const byte = (o: number, v: number) => ram.setUint8(o ^ 1, v);
  const word = (o: number, v: number) => ram.setUint16(o, v, true);
  for (const [base, type] of [
    [0x1890, 7],
    [0x1890 + 0x28, 8],
    [0x1890 + 8 * 0x28, 9],
    [0x19f8 + 9 * 0x38, 4],
  ]) {
    byte(base! + 0x18, 1);
    byte(base! + 0x25, type!);
    word(base! + 0xc, 460);
    word(base! + 0xe, 0x8000);
    word(base! + 0x10, 468);
    word(base! + 0x14, 16344);
  }
  const bird = 0x19f8 + 9 * 0x38;
  byte(bird + 0x24, 2);
  word(bird + 4, 0xfffc);
  word(bird + 0x1c, 2);
  word(bird + 0x1e, 0x24da);
  const actors = readLevel5Actors(ram);
  expect(actors.map((a) => [a.id, a.kind])).toEqual([
    [0, 'black'],
    [1, 'worm'],
    [8, 'acid'],
    [18, 'bird'],
  ]);
  expect(actors[3]).toMatchObject({
    x: 460.5,
    z: 468,
    height: 16344,
    phase: 0.75,
    fast: true,
  });
  byte(bird + 0x18, 0);
  expect(readLevel5Actors(ram)).toHaveLength(3);
});

it('ignores unknown types and truncated or inactive records', () => {
  expect(readLevel5Actors(new DataView(new ArrayBuffer(12)))).toEqual([]);
  const ram = new DataView(new ArrayBuffer(0x2000));
  ram.setUint8((0x1890 + 0x18) ^ 1, 1);
  ram.setUint8((0x1890 + 0x25) ^ 1, 6);
  expect(readLevel5Actors(ram)).toEqual([]);
});

it('preserves the three black-ball squash images and holds the worm/amoeba crushed image', () => {
  const ram = new DataView(new ArrayBuffer(0x2000));
  const set = (base: number, type: number, pointer: number) => {
    ram.setUint8((base + 0x18) ^ 1, 1);
    ram.setUint8((base + 0x1a) ^ 1, 2);
    ram.setUint8((base + 0x25) ^ 1, type);
    ram.setUint16(base + 0x1c, pointer >>> 16, true);
    ram.setUint16(base + 0x1e, pointer & 65535, true);
  };
  for (const [pointer, squash] of [
    [0x21f7a, 1 / 3],
    [0x21f7e, 2 / 3],
    [0x21f82, 1],
    [0x21f8a, 1],
  ]) {
    set(0x1890, 7, pointer!);
    expect(readLevel5Actors(ram)[0]?.squash).toBe(squash);
  }
  set(0x18b8, 8, 0x21a62);
  set(0x18e0, 9, 0x21efe);
  expect(readLevel5Actors(ram).map((a) => [a.kind, a.squash])).toEqual([
    ['black', 1],
    ['worm', 1],
    ['acid', 1],
  ]);
});

it('reports native bird wall-collision yellow flash and 3-stage burst pointers', () => {
  const ram = new DataView(new ArrayBuffer(0x2000));
  const bird = 0x19f8;
  const setPtr = (pointer: number) => {
    ram.setUint8((bird + 0x18) ^ 1, 1);
    ram.setUint8((bird + 0x1a) ^ 1, 2);
    ram.setUint8((bird + 0x25) ^ 1, 4);
    ram.setUint16(bird + 0x1c, pointer >>> 16, true);
    ram.setUint16(bird + 0x1e, pointer & 65535, true);
  };
  setPtr(0x224f2);
  expect(readLevel5Actors(ram)[0]?.birdSpark).toBe('flash');
  setPtr(0x2252a);
  expect(readLevel5Actors(ram)[0]?.birdSpark).toBeCloseTo(1 / 3);
  setPtr(0x22532);
  expect(readLevel5Actors(ram)[0]?.birdSpark).toBeCloseTo(2 / 3);
  setPtr(0x2253a);
  expect(readLevel5Actors(ram)[0]?.birdSpark).toBeCloseTo(1);
  setPtr(0x2254e);
  expect(readLevel5Actors(ram)[0]?.birdSpark).toBeCloseTo(2 / 3);
});
