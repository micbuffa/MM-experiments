import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { describe, expect, it } from 'vitest';
import { practiceCompleteOrigin } from '../game/modern/practiceProjection';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import type { TerrainCell } from '../game/modern/terrainMesh';
import { createTerrainStudy } from './createTerrainStudy';
import { setLevel6MazePhase } from './createLevel6Terrain';

function makeLevel6Terrain(): PracticeTerrain {
  const size = 122;
  const cells: TerrainCell[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null),
  );
  // Populate start plateau, ice diamond, GOAL, and one dynamic maze cell.
  for (let z = 14; z <= 18; z++)
    for (let x = 14; x <= 18; x++) cells[z]![x] = [0, 0, 0, 0];
  for (let z = 73; z <= 82; z++)
    for (let x = 70; x <= 80; x++) cells[z]![x] = [-3.26, -3.26, -3.26, -3.26];
  for (let z = 87; z <= 97; z++)
    for (let x = 88; x <= 91; x++) cells[z]![x] = [-3.26, -3.26, -3.26, -3.26];
  cells[82]![85] = [-6.94, -6.94, -6.94, -6.94];
  return {
    level: 'level6',
    cells,
    origin: practiceCompleteOrigin,
    lastScroll: -15368,
    mazePhases: [
      [{ x: 85, z: 82, cell: [-3.26, -3.26, -3.26, -3.26] }],
      [{ x: 85, z: 82, cell: [-6.94, -6.94, -6.94, -6.94] }],
      [{ x: 85, z: 82, cell: [-3.26, -3.26, -3.26, -3.26] }],
      [{ x: 85, z: 82, cell: [-6.94, -6.94, -6.94, -6.94] }],
    ],
  };
}

describe('createLevel6Terrain', () => {
  it('builds static terrain, 4 pyramids, 2 wedges, GOAL, and 4 toggleable maze phases', () => {
    const engine = new NullEngine();
    const scene = createTerrainStudy(
      engine,
      undefined,
      makeLevel6Terrain(),
      true,
    );
    try {
      expect(scene.getMeshByName('terrain-cliffs')).not.toBeNull();
      expect(scene.getMeshByName('level6-finish')).not.toBeNull();
      expect(scene.getMeshByName('level6-wedge-0')).not.toBeNull();
      expect(scene.getMeshByName('level6-wedge-1')).not.toBeNull();
      expect(scene.getMeshByName('level6-pyramid-74-74')).not.toBeNull();
      expect(scene.getMeshByName('level6-pyramid-75-81')).not.toBeNull();

      // Phase 0 active initially; phases 1..3 disabled.
      expect(
        scene.getTransformNodeByName('level6-maze-phase-0')?.isEnabled(),
      ).toBe(true);
      expect(
        scene.getTransformNodeByName('level6-maze-phase-1')?.isEnabled(),
      ).toBe(false);
      expect(
        scene.getTransformNodeByName('level6-maze-phase-2')?.isEnabled(),
      ).toBe(false);
      expect(
        scene.getTransformNodeByName('level6-maze-phase-3')?.isEnabled(),
      ).toBe(false);

      // Switching phase toggles active container in O(1).
      setLevel6MazePhase(scene, 2);
      expect(
        scene.getTransformNodeByName('level6-maze-phase-0')?.isEnabled(),
      ).toBe(false);
      expect(
        scene.getTransformNodeByName('level6-maze-phase-2')?.isEnabled(),
      ).toBe(true);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
