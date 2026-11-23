/** Quick reversible presentation fade, independent of gameplay. */
export function advanceOcclusionFade(
  current: number,
  enabled: boolean,
  seconds: number,
) {
  const target = enabled ? 1 : 0;
  if (!Number.isFinite(seconds) || seconds <= 0) return current;
  const next =
    current +
    (target - current) * (1 - Math.exp(-Math.min(seconds, 0.1) / 0.065));
  return Math.abs(next - target) < 0.001 ? target : next;
}
