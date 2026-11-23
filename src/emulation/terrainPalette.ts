// Verified Atari System I map in CORE_WASM_SHA256: B00000..B007ff is
// palette RAM; the 64 playfield entries start at B00400. The final 16 entries
// in our snapshot are motion-object bank 5 (wave shading), at B002a0. Never read ROM.
const readMap = 9849592;
const writeMap = 9849960;
const palettePointer = 16958436;
export type TerrainPalette = readonly number[];

/** IIIIRRRRGGGGBBBB, as paletteram16_IIIIRRRRGGGGBBBB_word_w. */
export function terrainPaletteRgb(
  word: number,
): readonly [number, number, number] {
  const intensity = word >>> 12;
  const scale = intensity === 0 ? 0 : intensity + 2;
  return [
    ((word >>> 8) & 15) * scale,
    ((word >>> 4) & 15) * scale,
    (word & 15) * scale,
  ];
}

/** Read-only, bounds checked; reuse the last palette when it is unchanged. */
export function readTerrainPalette(
  heap: Uint8Array,
  previous?: TerrainPalette,
): TerrainPalette | undefined {
  if (heap.byteLength < palettePointer + 4) return undefined;
  const view = new DataView(heap.buffer, heap.byteOffset, heap.byteLength);
  if (
    view.getUint32(readMap, true) !== 0xb00000 ||
    view.getUint32(readMap + 4, true) !== 0xb007ff ||
    view.getUint32(readMap + 8, true) !== 25 ||
    view.getUint32(writeMap, true) !== 0xb00000 ||
    view.getUint32(writeMap + 4, true) !== 0xb007ff ||
    view.getUint32(writeMap + 8, true) !== 17939 ||
    view.getUint32(writeMap + 12, true) !== palettePointer
  )
    return undefined;
  const pointer = view.getUint32(palettePointer, true);
  if (!pointer) return undefined;
  const base = pointer + 0x400;
  if (base < 0x400 || base + 128 > heap.byteLength || base % 2 !== 0)
    return undefined;
  let same = previous?.length === 80;
  for (let i = 0; i < 80 && same; i++)
    same =
      previous![i] ===
      view.getUint16(
        i < 64 ? base + i * 2 : pointer + 0x2a0 + (i - 64) * 2,
        true,
      );
  if (same) return previous;
  return Array.from({ length: 80 }, (_, i) =>
    view.getUint16(
      i < 64 ? base + i * 2 : pointer + 0x2a0 + (i - 64) * 2,
      true,
    ),
  );
}
