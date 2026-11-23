import { expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Scene } from '@babylonjs/core/scene';
import { terrainCliffs } from '../game/modern/terrainCliffs';
import { terrainMesh } from '../game/modern/terrainMesh';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  createIntermediateTowers,
  intermediateDisplayTerrain,
} from './intermediateLandmarks';

it('reconstructs the three lanes with aligned edges across all the bridge slopes', () => {
  const cells = Array.from({ length: 38 }, () =>
    Array<TerrainCell>(49).fill(null),
  );
  cells[34]![37] = [1, 0.5, 0.5, 0.5];
  cells[36]![37] = [1, 0.5, 0.5, null];
  const result = intermediateDisplayTerrain({
    cells,
    origin: { x: 0, z: 0 },
    lastScroll: -15846,
  });
  for (const x of [24, 35, 37, 46]) {
    const lane = result[34]![x]!;
    expect(result[35]![x]).toEqual(lane);
    expect(result[36]![x]).toEqual(lane);
    expect(lane[0]).toBe(lane[3]);
    expect(lane[1]).toBe(lane[2]);
  }
  expect(result[34]![35]![0]).toBe(result[34]![35]![1]);
  expect(result[34]![37]![0]).toBeGreaterThan(result[34]![37]![1]!);
  expect(result[37]![37]).toBeNull();
  expect(cells[36]![37]![3]).toBeNull();
});

it('builds the staggered 3–4–4–3 plinths and the taller lower faces of Intermediate Race', () => {
  const sampled = [-9, -6, -10, -11] as const;
  const terrain = {
    cells: Array.from({ length: 57 }, () =>
      Array<TerrainCell>(57).fill(sampled),
    ),
    origin: { x: 0, z: 0 },
    lastScroll: -15846,
  };
  const display = intermediateDisplayTerrain(terrain);
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const towers = createIntermediateTowers(scene, terrain);
    expect(towers).toHaveLength(3);
    for (const tower of towers) {
      const x = tower.position.x + 28.5;
      const z = tower.position.z + 28.5;
      const paved = display
        .slice(z - 2, z + 2)
        .map((row) =>
          row.slice(x - 2, x + 2).map((cell) => cell?.[0] === tower.position.y),
        );
      expect(paved).toEqual([
        [true, true, true, false],
        [true, true, true, true],
        [true, true, true, true],
        [false, true, true, true],
      ]);
      const vertices = tower.getVerticesData(VertexBuffer.PositionKind)!;
      const levels = [...new Set(vertices.filter((_, i) => i % 3 === 1))].sort(
        (a, b) => a - b,
      );
      expect(levels[0]).toBe(0);
      expect(
        levels.some(
          (y) => y > levels.at(-1)! * 0.55 && y < levels.at(-1)! * 0.75,
        ),
      ).toBe(true);
      const xs = vertices.filter((_, i) => i % 3 === 0);
      const zs = vertices.filter((_, i) => i % 3 === 2);
      expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(4);
      expect(Math.max(...zs) - Math.min(...zs)).toBeCloseTo(4);
      expect(terrain.cells[z]![x]).toBe(sampled);
    }
  } finally {
    engine.dispose();
  }
});

it.each([
  [26, 40],
  [38, 26],
  [63, 42],
  [52, 58],
])(
  'closes the four cap tiles and the vertical sides of the platform at %i, %i',
  (x, z) => {
    const cells = Array.from({ length: 66 }, () =>
      Array<TerrainCell>(67).fill(null),
    );
    cells[z]![x] = [-3, null, -3, -3];
    cells[z + 1]![x] = [-3, -3, -3, null];
    cells[z - 1]![x] = [null, null, null, -3];
    const display = intermediateDisplayTerrain({
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -15846,
    });
    const cap = [display[z]!.slice(x, x + 2), display[z + 1]!.slice(x, x + 2)];
    const top = [-3, -3, -3, -3];
    expect(cap).toEqual([
      [top, top],
      [top, top],
    ]);
    expect(display[z - 1]![x]).toBe(cells[z - 1]![x]);
    expect(display[z]![x + 2]).toBeNull();
    expect(cells[z]![x + 1]).toBeNull();
    const surface = terrainMesh(cap.map((row) => [null, ...row, null]));
    const walls = terrainCliffs(surface, 4, 4, -7);
    expect(surface.indices).toHaveLength(4 * 6);
    expect(walls.indices).toHaveLength(8 * 6);
  },
);
