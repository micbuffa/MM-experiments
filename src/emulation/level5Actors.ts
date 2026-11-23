export interface Level5Actor {
  readonly id: number;
  readonly kind: 'black' | 'worm' | 'acid' | 'bird';
  readonly x: number;
  readonly z: number;
  readonly height: number;
  readonly state: number;
  readonly phase: number;
  readonly heading: number;
  readonly fast: boolean;
  readonly squash?: number;
  /** Native bird wall-collision yellow spark: 'flash' during stunned frames (0x224f2..0x22526),
   * or 1/3..1 during the 3-stage yellow explosion (0x2252a..0x2253e / 0x2254a..0x22552).
   */
  readonly birdSpark?: 'flash' | number;
}

/** Pinned 68010 routines 19024/1917c (9 × 0x28) and 19a40/19bd4
 * (10 × 0x38). These are separate pools, not the generic scripted objects.
 * +1c is the current sprite-list pointer; +24/+25 are its native timer/period.
 */
const miniatureCycles = [
  [0x219b2, 4],
  [0x21a32, 8],
  [0x2197a, 4],
  [0x219ea, 8],
  [0x2194e, 1],
  [0x21e3e, 8],
  [0x21eb6, 8],
  [0x21d4e, 8],
  [0x21dc6, 8],
] as const;
export function readLevel5Actors(memory: DataView): Level5Actor[] {
  const actors: Level5Actor[] = [];
  const byte = (o: number) => memory.getUint8(o ^ 1);
  const word = (o: number) => memory.getUint16(o, true);
  const long = (o: number) => word(o) * 65536 + word(o + 2);
  const fixed = (o: number) => memory.getInt16(o, true) + word(o + 2) / 65536;
  for (const bird of [false, true]) {
    const count = bird ? 10 : 9,
      stride = bird ? 0x38 : 0x28,
      start = bird ? 0x19f8 : 0x1890;
    for (let i = 0; i < count; i++) {
      const base = start + i * stride;
      if (base + stride > memory.byteLength || byte(base + 0x18) !== 1)
        continue;
      const type = byte(base + 0x25);
      if (!bird && (type < 7 || type > 9)) continue;
      const pointer = long(base + 0x1c),
        state = byte(base + 0x1a);
      const vx = fixed(base),
        vz = fixed(base + 4);
      const cycle = bird
        ? state === 2
          ? pointer >= 0x22546
            ? [0x22546, 4]
            : [0x224e2, 25]
          : state === 1
            ? [0x224ca, 2]
            : [0x224d6, 2]
        : (miniatureCycles.find(
            ([start, count]) => pointer >= start && pointer < start + count * 4,
          ) ?? [pointer, 1]);
      const [animation, steps] = cycle;
      const step = Math.max(0, (pointer - animation!) / 4);
      const timer =
        byte(base + 0x24) / Math.max(1, bird ? type : state === 1 ? 1 : 3);
      actors.push({
        id: (bird ? 9 : 0) + i,
        kind: bird
          ? 'bird'
          : type === 7
            ? 'black'
            : type === 8
              ? 'worm'
              : 'acid',
        x: fixed(base + 0xc),
        z: fixed(base + 0x10),
        height: fixed(base + 0x14),
        state,
        phase: (step + timer) / steps!,
        heading: vx || vz ? Math.atan2(vx, vz) : 0,
        fast: bird && Math.abs(vz) > 3,
        ...(!bird && state === 2
          ? {
              squash:
                type === 7 && pointer >= 0x21f7a && pointer <= 0x21f82
                  ? ((pointer - 0x21f7a) / 4 + 1) / 3
                  : 1,
            }
          : {}),
        ...(bird && state === 2
          ? pointer >= 0x2252a && pointer <= 0x2253e
            ? { birdSpark: (Math.floor((pointer - 0x2252a) / 8) + 1) / 3 }
            : pointer >= 0x2254a && pointer <= 0x22552
              ? { birdSpark: ((pointer - 0x2254a) / 4 + 1) / 3 }
              : pointer >= 0x224f2 && pointer <= 0x22526
                ? { birdSpark: 'flash' as const }
                : {}
          : {}),
      });
    }
  }
  return actors;
}
