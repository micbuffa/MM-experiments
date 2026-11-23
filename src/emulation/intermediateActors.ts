import type { PracticeMarblePose } from './practicePose';

export interface IntermediateActor extends PracticeMarblePose {
  readonly id: number;
  readonly kind: 'black' | 'worm' | 'acid';
  readonly state: number;
  readonly scriptFrame: number;
  readonly script: number;
  readonly phase: number;
  readonly heading: number;
}

const acidSlotStart = 0x1482;
const acidSlotStride = 0x42;
const acidSlotCount = 8;

/** Measured 68010 object records, read only for presentation. */
export function readIntermediateActors(memory: DataView): IntermediateActor[] {
  if (memory.byteLength < 0x1482) return [];
  const byte = (offset: number) => memory.getUint8(offset ^ 1);
  const word = (offset: number) => memory.getUint16(offset, true);
  const long = (offset: number) => word(offset) * 65536 + word(offset + 2);
  const fixed = (offset: number) =>
    memory.getInt16(offset, true) + word(offset + 2) / 65536;
  const actors: IntermediateActor[] = [];
  for (const [id, base] of [0xa20, 0x1302, 0x1362, 0x13c2, 0x1422].entries()) {
    if (byte(base + 0x18) !== 1) continue;
    const script = long(base + 0x5c);
    const current = long(base + 0x58);
    const vx = fixed(base);
    const vz = fixed(base + 4);
    actors.push({
      id,
      kind: id === 0 ? 'black' : 'worm',
      marble: 'visible',
      x: fixed(base + 0xc),
      z: fixed(base + 0x10),
      height: fixed(base + 0x14),
      state: byte(base + 0x1a),
      scriptFrame: current >= script ? (current - script) / 4 : 0,
      script,
      phase: byte(base + 0x24) / Math.max(1, byte(base + 0x25)),
      heading: vx || vz ? Math.atan2(vx, vz) : 0,
    });
  }
  // Level 3 acid/amoeba pools occupy 0x42-byte slots starting at 0x1482.
  if (memory.byteLength >= acidSlotStart + acidSlotCount * acidSlotStride) {
    for (let i = 0; i < acidSlotCount; i++) {
      const base = acidSlotStart + i * acidSlotStride;
      if (byte(base + 0x18) !== 1) continue;
      actors.push({
        id: 10 + i,
        kind: 'acid',
        marble: 'visible',
        x: fixed(base + 0xc),
        z: fixed(base + 0x10),
        height: fixed(base + 0x14),
        state: byte(base + 0x1a),
        scriptFrame: 0,
        script: 0,
        phase: i / acidSlotCount,
        heading: 0,
      });
    }
  }
  return actors;
}
