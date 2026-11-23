import { expect, it } from 'vitest';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import {
  createLevel3Pipe,
  level3DisplayTerrain,
} from './createLevel3Materials';
import type { TerrainCell } from '../game/modern/terrainMesh';

it('places the three-row spur after seven approach tiles and closes the far rim', () => {
  const high = ((16320 - 16384) * Math.sqrt(2 / 3)) / 8;
  const low = ((16196 - 16384) * Math.sqrt(2 / 3)) / 8;
  const cells = Array.from({ length: 118 }, () =>
    Array<TerrainCell>(118).fill(null),
  );
  for (let z = 69; z <= 83; z++) cells[z]![75] = [high, high, high, high];
  for (let x = 76; x <= 78; x++) {
    for (let z = 69; z <= 74; z++) cells[z]![x] = [low, low, low, low];
    cells[75]![x] = [low, low, low, high];
    cells[76]![x] = [high, high, high, high];
    cells[77]![x] = [high, high, high, high];
    cells[78]![x] = [high, high, high, low];
    for (let z = 79; z <= 82; z++) cells[z]![x] = [low, low, low, high];
    cells[83]![x] = [high, high, high, high];
  }
  const display = level3DisplayTerrain(cells);
  for (let x = 76; x <= 78; x++) {
    const upperRows = [74, 75, 76, 77, 78, 79, 80, 81, 82].filter((z) =>
      display[z]![x]?.every((y) => Math.abs(y! - high) < 0.001),
    );
    expect(upperRows).toEqual([76, 77, 78]);
    // Only the funnel itself is open above the lower corridor; its far
    // edge is adjacent to a full-height tile with no empty row between.
    for (let z = 79; z <= 82; z++)
      expect(display[z]![x]).toEqual([low, low, low, low]);
    expect(display[83]![x]).toEqual([high, high, high, high]);
    expect(display[74]![x]).toEqual([low, low, low, low]);
  }
  const approach = [69, 70, 71, 72, 73, 74, 75].filter(
    (z) =>
      display[z]![75]?.every((y) => y === high) &&
      display[z]![76]?.every((y) => y === low),
  );
  // The three-row spur starts only at Z=76; every preceding approach tile survives.
  expect(approach).toHaveLength(7);
  expect(cells[75]![76]).toEqual([low, low, low, high]);
});

it('moves shell and lining by one tile so the funnel meets the right terrace at Z=83', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const source = {
    positions: [17, -6.9402, 19, 20, -6.9402, 23, 18.5274, -8.2283, 20.9958],
    shell: [0, 1, 2],
    interior: [0, 2, 1],
  };
  try {
    const meshes = createLevel3Pipe(scene, source);
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
      const bounds = mesh.getBoundingInfo().boundingBox;
      expect(bounds.minimumWorld.z + 59).toBeCloseTo(79);
      expect(bounds.maximumWorld.z + 59).toBeCloseTo(83);
      expect(bounds.minimumWorld.x + 59).toBeCloseTo(76);
      expect(bounds.maximumWorld.x + 59).toBeCloseTo(79);
    }
    expect(meshes[0].position.asArray()).toEqual(meshes[1].position.asArray());
    expect(source.positions[2]).toBe(19);
    expect(source.positions[5]).toBe(23);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
