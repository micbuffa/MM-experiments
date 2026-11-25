import type { TerrainCell } from './terrainMesh';

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

function sampleCellHeight(
  cell: TerrainCell,
  fx: number,
  fz: number,
): number | null {
  if (!cell) return null;
  const [nw, ne, se, sw] = cell;
  if (nw !== null && ne !== null && se !== null && sw !== null) {
    const north = nw + (ne - nw) * fx;
    const south = sw + (se - sw) * fx;
    return north + (south - north) * fz;
  }
  let max = -Infinity;
  for (let i = 0; i < 4; i++) {
    const h = cell[i];
    if (h !== null && h !== undefined && h > max) max = h;
  }
  return max === -Infinity ? null : max;
}

/**
 * Raymarches the sightline from camera `eye` to `marble` against the terrain
 * heightfield so occlusion transparency only activates when terrain genuinely
 * rises into the line of sight (preventing floor/slope false positives).
 */
export function isMarbleOccludedByTerrain(
  eye: { readonly x: number; readonly y: number; readonly z: number },
  marble: { readonly x: number; readonly y: number; readonly z: number },
  cells: readonly (readonly TerrainCell[])[],
) {
  const rows = cells.length;
  const columns = rows > 0 ? cells[0]!.length : 0;
  if (rows === 0 || columns === 0) return false;
  const dx = marble.x - eye.x;
  const dy = marble.y - eye.y;
  const dz = marble.z - eye.z;
  const steps = 24;
  for (let i = 1; i <= steps; i++) {
    const t = 0.06 + (0.84 * i) / steps;
    const wx = eye.x + dx * t;
    const wy = eye.y + dy * t;
    const wz = eye.z + dz * t;
    const gx = wx + columns / 2;
    const gz = wz + rows / 2;
    const cx = Math.floor(gx);
    const cz = Math.floor(gz);
    if (cz < 0 || cz >= rows || cx < 0 || cx >= columns) continue;
    const groundY = sampleCellHeight(cells[cz]![cx]!, gx - cx, gz - cz);
    if (groundY !== null && groundY > wy + 0.08) return true;
  }
  return false;
}
