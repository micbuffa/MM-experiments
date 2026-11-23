/** Equal-total integer profiles for controlled diagnostics, never player controls. */
export function distributeImpulse(total: number, iterations: number): number[] {
  if (
    !Number.isSafeInteger(total) ||
    !Number.isInteger(iterations) ||
    iterations < 1 ||
    iterations > 12 ||
    Math.abs(total) > 32767
  ) {
    throw new RangeError('Invalid impulse profile');
  }
  return Array.from(
    { length: iterations },
    (_, i) =>
      Math.trunc((total * (i + 1)) / iterations) -
      Math.trunc((total * i) / iterations),
  );
}
