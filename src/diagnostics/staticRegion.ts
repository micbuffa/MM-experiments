/** Compare an unchanged terrain region; RGBA bottom-up, region in top-down pixels. */
export function countChangedPixels(
  before: Uint8Array,
  after: Uint8Array,
  width: number,
  height: number,
  region: readonly [number, number, number, number],
): number {
  const [left, top, right, bottom] = region;
  if (
    ![width, height, ...region].every(Number.isSafeInteger) ||
    width <= 0 ||
    height <= 0 ||
    before.length !== width * height * 4 ||
    after.length !== before.length ||
    left < 0 ||
    top < 0 ||
    right > width ||
    bottom > height ||
    right <= left ||
    bottom <= top
  )
    throw new RangeError('Invalid comparison region');
  let changed = 0;
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const offset = ((height - 1 - y) * width + x) * 4;
      if (
        before[offset] !== after[offset] ||
        before[offset + 1] !== after[offset + 1] ||
        before[offset + 2] !== after[offset + 2] ||
        before[offset + 3] !== after[offset + 3]
      )
        changed++;
    }
  }
  return changed;
}
