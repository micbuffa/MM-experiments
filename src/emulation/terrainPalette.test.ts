import { expect, it } from 'vitest';
import { terrainPaletteRgb, readTerrainPalette } from './terrainPalette';

it('decodes the native intensity and hue, including the live coral and amber walls', () => {
  expect(terrainPaletteRgb(0xff43)).toEqual([255, 68, 51]);
  expect(terrainPaletteRgb(0xfb32)).toEqual([187, 51, 34]);
  expect(terrainPaletteRgb(0xf721)).toEqual([119, 34, 17]);
  expect(terrainPaletteRgb(0xffb0)).toEqual([255, 187, 0]);
  expect(terrainPaletteRgb(0xafff)).toEqual([180, 180, 180]);
  expect(terrainPaletteRgb(0x1888)).toEqual([24, 24, 24]);
  expect(terrainPaletteRgb(0x0fff)).toEqual([0, 0, 0]);
});

it('reads only a verified palette map, refreshes changed entries and reuses unchanged snapshots', () => {
  const heap = new Uint8Array(17_000_000);
  const memory = new DataView(heap.buffer);
  const base = 16_960_000;
  expect(readTerrainPalette(new Uint8Array(4))).toBeUndefined();
  expect(readTerrainPalette(heap)).toBeUndefined();
  for (const address of [9849592, 9849960]) {
    memory.setUint32(address, 0xb00000, true);
    memory.setUint32(address + 4, 0xb007ff, true);
  }
  memory.setUint32(9849592 + 8, 25, true);
  memory.setUint32(9849960 + 8, 17939, true);
  memory.setUint32(9849960 + 12, 16958436, true);
  memory.setUint32(16958436, base, true);
  memory.setUint16(base + 0x400 + 15 * 2, 0xff43, true);
  memory.setUint16(base + 0x400 + 57 * 2, 0xf76f, true);
  memory.setUint16(base + 0x2a0 + 4 * 2, 0xa8fb, true);
  const first = readTerrainPalette(heap)!;
  expect(first).toHaveLength(80);
  expect(terrainPaletteRgb(first[15]!)).toEqual([255, 68, 51]);
  expect(first[57]).toBe(0xf76f);
  expect(first[68]).toBe(0xa8fb);
  expect(readTerrainPalette(heap, first)).toBe(first);
  memory.setUint16(base + 0x2a0 + 4 * 2, 0x1888, true);
  expect(readTerrainPalette(heap, first)?.[68]).toBe(0x1888);
  memory.setUint16(base + 0x400 + 15 * 2, 0xffb0, true);
  const changed = readTerrainPalette(heap, first)!;
  expect(changed).not.toBe(first);
  expect(terrainPaletteRgb(changed[15]!)).toEqual([255, 187, 0]);
  expect(first[15]).toBe(0xff43);
  memory.setUint32(16958436, heap.length - 2, true);
  expect(readTerrainPalette(heap, changed)).toBeUndefined();
  memory.setUint32(16958436, base + 1, true);
  expect(readTerrainPalette(heap)).toBeUndefined();
  memory.setUint32(16958436, 0, true);
  expect(readTerrainPalette(heap)).toBeUndefined();
  memory.setUint32(16958436, base, true);
  memory.setUint32(9849960 + 12, 0, true);
  expect(readTerrainPalette(heap)).toBeUndefined();
});
