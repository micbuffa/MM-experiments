import { describe, expect, it } from 'vitest';
import { buildLayerCollisionMesh } from './buildCollisionMesh';
import type { HeightLayer } from '../levels/remasterLevel';

describe('buildLayerCollisionMesh', () => {
  it('welds shared corners across adjacent flat cells and emits valid triangle indices', () => {
    const layer: HeightLayer = {
      id: 'flat-2x2',
      columns: 2,
      rows: 2,
      origin: { x: 0, z: 0 },
      defaultSurface: 'stone',
      cells: [
        [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
        [
          [0, 0, 0, 0],
          [0, 0, 0, 0],
        ],
      ],
    };
    const { floor, cliffs } = buildLayerCollisionMesh(layer, -4);
    // 2x2 flat grid has 3x3 = 9 unique surface vertices (unwelded would be 16)
    expect(floor.positions.length / 3).toBe(9);
    // 4 cells * 2 triangles = 8 triangles = 24 indices
    expect(floor.indices.length).toBe(24);
    for (const idx of floor.indices) {
      expect(idx).toBeLessThan(floor.positions.length / 3);
    }
    expect(cliffs.indices.length).toBe(0);
  });
});
