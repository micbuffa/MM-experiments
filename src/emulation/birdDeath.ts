export interface BirdDeath {
  readonly progress: number;
  readonly fragments: readonly {
    readonly id: number;
    readonly x: number;
    readonly y: number;
  }[];
}

/** State 0x0b calls the native 8-fragment routine 0x13ade in reverse.
 * player+0x57: 0x66 sentinel -> 36 -> 0. The two MO groups at +0x38
 * and +0xa4 contain the already simulated projected positions.
 * base points to the player record (0x18 for player 1), not work RAM start.
 */
export function readBirdDeath(
  memory: DataView,
  base: number,
): BirdDeath | undefined {
  if (
    base + 0xbc > memory.byteLength ||
    memory.getUint8((base + 0x1a) ^ 1) !== 0x0b
  )
    return undefined;
  const word = (o: number) => memory.getUint16(base + o, true);
  const signed = (o: number) => memory.getInt16(base + o, true);
  const counter = memory.getUint8((base + 0x57) ^ 1);
  if (counter > 36) return { progress: 0, fragments: [] };
  const originX = signed(0x1e),
    originY = signed(0x20);
  const fragments: { id: number; x: number; y: number }[] = [];
  for (const start of [0xa4, 0x38])
    for (let i = 0; i < 4; i++) {
      const offset = start + i * 6,
        id = word(offset) - 0x10b;
      if (id < 0 || id >= 8) continue;
      fragments.push({
        id,
        x: signed(offset + 2) - originX,
        y: signed(offset + 4) - originY,
      });
    }
  return {
    progress: Math.max(0, Math.min(1, (35 - counter) / 35)),
    fragments,
  };
}
