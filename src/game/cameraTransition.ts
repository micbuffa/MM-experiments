/** Seconds in, smooth interpolation fraction out; independent of render cadence. */
export function cameraTransition(
  elapsedSeconds: number,
  durationSeconds = 0.65,
): number {
  if (
    !Number.isFinite(elapsedSeconds) ||
    elapsedSeconds < 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  )
    throw new RangeError('Invalid camera transition time');
  const t = Math.min(1, elapsedSeconds / durationSeconds);
  return t * t * (3 - 2 * t);
}
