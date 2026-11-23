/** Let the grout show through paint along the edges of each underlying tile. */
export function practiceDecalOpacity(x: number, y: number) {
  // Both decals use 16 texels per terrain tile, even when their UVs are rotated.
  const u = ((x % 16) + 0.5) / 16;
  const v = ((y % 16) + 0.5) / 16;
  const edge = Math.min(u, 1 - u, v, 1 - v);
  const blend = Math.min(1, Math.max(0, (edge - 0.04) / 0.065));
  return Math.round(255 * (0.62 + 0.38 * blend));
}
