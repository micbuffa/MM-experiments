import type { IntermediatePipeGeometry } from '../game/modern/intermediatePipeGeometry';

/** Widen the shaft lumen, blending into the unchanged funnel rim and outlet. */
export function widenLevel3Pipe(
  source: IntermediatePipeGeometry,
): IntermediatePipeGeometry {
  const positions = source.positions.slice();
  const normals = source.normals?.slice();
  for (let i = 0; i < positions.length; i += 3) {
    const y = positions[i + 1]!;
    const upperBlend = Math.max(0, Math.min(1, (-6.9402 - y) / 1.2881));
    const lowerBlend = Math.max(0, Math.min(1, (y + 17.2) / 2.2));
    const blend = Math.min(upperBlend, lowerBlend);
    const scale = 1 + 0.42 * blend;
    positions[i] = 18.5274 + (positions[i]! - 18.5274) * scale;
    positions[i + 2] =
      20.9958 + (positions[i + 2]! - 20.9958) * scale + 0.2 * blend;
    if (normals) {
      const x = normals[i]! / scale,
        ny = normals[i + 1]!,
        z = normals[i + 2]! / scale;
      const length = Math.hypot(x, ny, z) || 1;
      normals[i] = x / length;
      normals[i + 1] = ny / length;
      normals[i + 2] = z / length;
    }
  }
  return { ...source, positions, ...(normals ? { normals } : {}) };
}
