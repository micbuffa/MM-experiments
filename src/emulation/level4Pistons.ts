export interface Level4PistonPose {
  readonly slot: number;
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly step: number;
}

export const level4PistonCount = 36;

const records = 0x1650;
const stride = 0x10;
// Ordered rise, hold and return images in the native pointer list.
const steps = [1, 2, 3, 4, 4, 4, 4, 4, 4, 4, 3, 2, 1] as const;

export function readLevel4Pistons(memory: DataView): Level4PistonPose[] {
  if (
    memory.byteLength < records + level4PistonCount * stride ||
    memory.getUint8(0x760 ^ 1) !== 1
  )
    return [];
  const pistons: Level4PistonPose[] = [];
  for (let slot = 0; slot < level4PistonCount; slot++) {
    const base = records + slot * stride;
    if (memory.getInt16(base + 2, true) !== -1) continue;
    const pointer =
      memory.getUint16(base + 8, true) * 0x10000 +
      memory.getUint16(base + 10, true);
    const step = steps[(pointer - 0x21342) / 4];
    if (step === undefined) continue;
    pistons.push({
      slot,
      x: memory.getUint8((base + 4) ^ 1),
      z: memory.getUint8((base + 5) ^ 1),
      height: memory.getUint16(base + 6, true),
      step,
    });
  }
  return pistons;
}
