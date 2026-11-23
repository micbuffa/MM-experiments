// Unique sprite ordinals in ROM table 0x22346..0x2237e (15 entries).
// The held strike and repeated emergence frames are deliberate native timing.
export const level4HammerSpriteSequence = [
  0, 1, 2, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8, 1, 0,
] as const;

// The 4 Level 4 hammers (kind 0x0c, id 0x0a, tile X=105, Z in {102, 104, 106, 108})
// switch from their idle sprite (0x20c14) to the 15-step swing table at 0x22346..0x2237e.
const hammerZ = [102, 104, 106, 108] as const;

export function readLevel4HammerFrames(
  memory: DataView,
): readonly (number | undefined)[] {
  const frames: (number | undefined)[] = [
    undefined,
    undefined,
    undefined,
    undefined,
  ];
  for (
    let i = 0, base = 0xa9c;
    i < 25 && base + 0x46 <= memory.byteLength;
    i++, base += 0x56
  ) {
    if (
      memory.getUint8((base + 0x18) ^ 1) !== 1 ||
      memory.getUint8((base + 0x1f) ^ 1) !== 0x0c ||
      memory.getUint8((base + 0x1b) ^ 1) !== 0x0a
    )
      continue;
    // Object coordinates use eight arcade units per terrain tile.
    const z = memory.getInt16(base + 0x10, true) / 8;
    const index = hammerZ.indexOf(z as (typeof hammerZ)[number]);
    if (index < 0) continue;
    // 0x13334 copies the emitted sprite-list entry to +0x42 before
    // 0x132e0 advances +0x3e. Read the displayed image, not the next image.
    const pointer =
      memory.getUint16(base + 0x42, true) * 0x10000 +
      memory.getUint16(base + 0x44, true);
    const step = (pointer - 0x22346) / 4;
    if (Number.isInteger(step) && step >= 0 && step <= 14) {
      frames[index] = step;
    } else if (pointer === 0x20c14) {
      frames[index] = 0;
    }
  }
  return frames;
}
