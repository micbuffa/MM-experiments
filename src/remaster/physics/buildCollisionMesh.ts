import { terrainCliffs } from '../../game/modern/terrainCliffs';
import {
  terrainCorners,
  terrainMesh,
  type TerrainCell,
} from '../../game/modern/terrainMesh';
import type { HeightLayer } from '../levels/remasterLevel';

export interface WeldedMeshData {
  readonly positions: Float32Array;
  readonly indices: Uint32Array;
}

export interface LayerCollisionMeshes {
  readonly floor: WeldedMeshData;
  readonly cliffs: WeldedMeshData;
}

/**
 * Smooth small vertical creases (< 0.45 cells) across sloped floor cells
 * (such as the Level 1 gorge/channel) while keeping true vertical cliffs intact.
 */
function smoothSlopedFloorCells(
  cells: readonly (readonly TerrainCell[])[],
  passes = 2,
): TerrainCell[][] {
  const rows = cells.length;
  const cols = cells[0]?.length ?? 0;
  let current: TerrainCell[][] = cells.map((row) =>
    row.map((cell) => (cell ? ([...cell] as const) : null)),
  );

  for (let pass = 0; pass < passes; pass++) {
    // Collect heights at each shared grid vertex from adjacent solid floor cells.
    const vertexHeights = new Map<number, number[]>();
    const vKey = (vx: number, vz: number) => vz * (cols + 1) + vx;
    for (let z = 0; z < rows; z++) {
      for (let x = 0; x < cols; x++) {
        const cell = current[z]![x];
        if (!cell) continue;
        for (let c = 0; c < 4; c++) {
          const h = cell[c];
          if (h === null || h === undefined) continue;
          const [dx, dz] = terrainCorners[c]!;
          const key = vKey(x + dx, z + dz);
          let list = vertexHeights.get(key);
          if (!list) {
            list = [];
            vertexHeights.set(key, list);
          }
          list.push(h);
        }
      }
    }

    const next: TerrainCell[][] = current.map((row, z) =>
      row.map((cell, x): TerrainCell => {
        if (!cell) return null;
        const solid = cell.filter((h): h is number => h !== null);
        if (solid.length < 3) return cell;
        const span = Math.max(...solid) - Math.min(...solid);
        // Only smooth sloped/gorge cells (leave flat plateaus untouched).
        if (span < 0.04 || span > 1.2) return cell;

        const out: [
          number | null,
          number | null,
          number | null,
          number | null,
        ] = [cell[0], cell[1], cell[2], cell[3]];
        for (let c = 0; c < 4; c++) {
          const h = cell[c];
          if (h === null || h === undefined) continue;
          const [dx, dz] = terrainCorners[c]!;
          const samples = vertexHeights.get(vKey(x + dx, z + dz));
          if (!samples || samples.length < 2) continue;
          // Average only neighbours within 0.45 cells (ignore true cliffs).
          let sum = 0;
          let count = 0;
          for (const s of samples) {
            if (Math.abs(s - h) < 0.45) {
              sum += s;
              count++;
            }
          }
          if (count > 1) out[c] = sum / count;
        }
        return out;
      }),
    );
    current = next;
  }

  return current;
}

function weldPart(
  partPositions: readonly number[],
  partIndices: readonly number[],
): WeldedMeshData {
  const vertexMap = new Map<string, number>();
  const positions: number[] = [];
  const indices: number[] = [];

  function addVertex(x: number, y: number, z: number): number {
    // Quantize to 1e-4 to weld shared corners cleanly without distorting slopes.
    const key = `${Math.round(x * 10000)},${Math.round(y * 10000)},${Math.round(z * 10000)}`;
    const existing = vertexMap.get(key);
    if (existing !== undefined) return existing;
    const next = positions.length / 3;
    positions.push(x, y, z);
    vertexMap.set(key, next);
    return next;
  }

  for (let i = 0; i < partIndices.length; i += 3) {
    const ia = partIndices[i]! * 3;
    const ib = partIndices[i + 1]! * 3;
    const ic = partIndices[i + 2]! * 3;
    const a = addVertex(
      partPositions[ia]!,
      partPositions[ia + 1]!,
      partPositions[ia + 2]!,
    );
    const b = addVertex(
      partPositions[ib]!,
      partPositions[ib + 1]!,
      partPositions[ib + 2]!,
    );
    const c = addVertex(
      partPositions[ic]!,
      partPositions[ic + 1]!,
      partPositions[ic + 2]!,
    );
    if (a !== b && b !== c && c !== a) {
      indices.push(a, b, c);
    }
  }

  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  };
}

/**
 * Build separate, vertex-welded floor and vertical-cliff collision meshes so
 * Havok applies zero restitution on floors/slopes while preserving crisp wall
 * bounce on vertical cliffs.
 */
export function buildLayerCollisionMesh(
  layer: HeightLayer,
  cliffBase = -12,
): LayerCollisionMeshes {
  const smoothedCells = smoothSlopedFloorCells(layer.cells);
  const floorSurface = terrainMesh(smoothedCells);
  const rawSurface = terrainMesh(layer.cells);
  const cliffs = terrainCliffs(
    rawSurface,
    layer.columns,
    layer.rows,
    cliffBase,
  );
  return {
    floor: weldPart(floorSurface.positions, floorSurface.indices),
    cliffs: weldPart(cliffs.positions, cliffs.indices),
  };
}
