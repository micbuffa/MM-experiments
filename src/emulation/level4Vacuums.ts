// Object records and animation tables observed in the pinned 68010 program.
export function readLevel4VacuumExtensions(memory: DataView): number[] {
  const extensions = Array<number>(6).fill(0);
  const start = 0xa9c;
  const stride = 0x56;
  const slots = Math.min(25, Math.floor((memory.byteLength - start) / stride));
  for (let i = 0; i < slots; i++) {
    const base = start + i * stride;
    const byte = (offset: number) => memory.getUint8((base + offset) ^ 1);
    if (byte(0x18) !== 1) continue;
    const id = byte(0x1b) - 0x1e;
    if (id < 0 || id >= extensions.length) continue;
    const kind = byte(0x1f);
    if (kind !== 0x0b && kind !== 0x0d) continue;
    const frame =
      memory.getUint16(base + 0x3e, true) * 0x10000 +
      memory.getUint16(base + 0x40, true);
    const opening = kind === 0x0b ? 0x21fc2 : 0x22052;
    const closing = kind === 0x0b ? 0x21fe6 : 0x22076;
    if (frame >= opening && frame < opening + 32)
      extensions[id] = ((frame - opening) / 4 + 1) / 8;
    else if (frame >= closing && frame < closing + 32)
      extensions[id] = (8 - (frame - closing) / 4) / 8;
    else if (
      frame === (kind === 0x0b ? 0x22016 : 0x220a6) ||
      frame === (kind === 0x0b ? 0x2201a : 0x220aa)
    )
      extensions[id] = 1;
  }
  return extensions;
}

export function readLevel4VacuumIndex(memory: DataView, slot: number) {
  const base = 0xa9c + slot * 0x56;
  if (slot >= 25 || base + 0x20 > memory.byteLength) return undefined;
  const kind = memory.getUint8((base + 0x1f) ^ 1);
  const id = memory.getUint8((base + 0x1b) ^ 1) - 0x1e;
  return (kind === 0x0b || kind === 0x0d) && id >= 0 && id < 6 ? id : undefined;
}

/** The two emitted on-images alternate in the native active loop, not in a render timer. */
export function readLevel4VacuumMouthFrames(
  memory: DataView,
): (number | undefined)[] {
  const frames = Array<number | undefined>(6).fill(undefined);
  for (
    let slot = 0, base = 0xa9c;
    slot < 25 && base + 0x46 <= memory.byteLength;
    slot++, base += 0x56
  ) {
    if (memory.getUint8((base + 0x18) ^ 1) !== 1) continue;
    const kind = memory.getUint8((base + 0x1f) ^ 1);
    const index = readLevel4VacuumIndex(memory, slot);
    if (index === undefined) continue;
    // +0x42 holds the image emitted by 0x13334; +0x3e may already be advanced.
    const pointer =
      memory.getUint16(base + 0x42, true) * 0x10000 +
      memory.getUint16(base + 0x44, true);
    const on = kind === 0x0b ? 0x22016 : 0x220a6;
    if (pointer === on || pointer === on + 4)
      frames[index] = (pointer - on) / 4;
  }
  return frames;
}
