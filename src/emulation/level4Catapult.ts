// The native object switches from its idle sprite list (0x2111e)
// to the launch list when the collision routine starts a throw.
export function readLevel4CatapultFrame(memory: DataView): number | undefined {
  for (
    let i = 0, base = 0xa9c;
    i < 25 && base + 0x42 <= memory.byteLength;
    i++, base += 0x56
  ) {
    if (
      memory.getUint8((base + 0x18) ^ 1) !== 1 ||
      memory.getUint8((base + 0x1f) ^ 1) !== 0x0a
    )
      continue;
    const pointer =
      memory.getUint16(base + 0x3e, true) * 0x10000 +
      memory.getUint16(base + 0x40, true);
    const frame = (pointer - 0x210ca) / 4;
    if (Number.isInteger(frame) && frame >= 0 && frame <= 19) return frame;
  }
  return undefined;
}
