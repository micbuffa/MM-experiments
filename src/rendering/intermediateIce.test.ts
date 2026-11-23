import { expect, it } from 'vitest';
import {
  arcadeCellUnits,
  arcadeGroundHeight,
  arcadeHeightScale,
} from '../game/modern/practiceProjection';
import type { TerrainCell } from '../game/modern/terrainMesh';
import {
  intermediateIceHeight,
  intermediateIcePixel,
} from './intermediateIceMaterial';
import { splitIntermediateIceWalls } from './intermediateIceWalls';

it('projects the painted reflections onto the same triangle heights as the basin mesh', () => {
  const h = (height: number) =>
    ((height - arcadeGroundHeight) * arcadeHeightScale) / arcadeCellUnits;
  const cell: TerrainCell = [h(16116), h(16112), h(16100), h(16108)];
  expect(intermediateIceHeight(cell, 0.75, 0.25)).toBeCloseTo(16110);
  expect(intermediateIceHeight(cell, 0.25, 0.75)).toBeCloseTo(16108);
});

it('keeps vertical cliff ribs on flat ice, tile joints on the basin, and hexagonal rim boundaries', () => {
  const groove = intermediateIcePixel(1.5, 1.5, 16116, 0);
  const flat = intermediateIcePixel(1.5, 1.82, 16116, 0);
  expect(groove[1]).toBeLessThan(flat[1]! - 25);
  const seam = intermediateIcePixel(10, 4.4, 16104, 1);
  const basin = intermediateIcePixel(10.2, 4.4, 16104, 1);
  expect(seam[1]).toBeLessThan(basin[1]!);
  // Outside the hexagonal basin (radius >= 6), flat ice is not darkened by the basin shadow.
  const leftInside = intermediateIcePixel(11.5, 4.5, 16108, 0);
  const leftOutside = intermediateIcePixel(15.2, 1.5, 16116, 0);
  expect(leftInside[1]).toBeLessThan(leftOutside[1]! - 60);
});

it('joins the icicle edge to the original wall at the right side and inside the hole', () => {
  const walls = {
    positions: [
      25, -26, 42, 26, -26, 42, 26, -29, 42, 25, -29, 42, 41, -26, 34, 41, -26,
      35, 41, -29, 35, 41, -29, 34,
    ],
    indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7],
    uvs: [1, 3, 0, 3, 0, 0, 1, 0, 1, 3, 0, 3, 0, 0, 1, 0],
  };
  const { lip, cliffs } = splitIntermediateIceWalls(walls, 130, 130);
  expect(lip.indices.length).toBeGreaterThan(walls.indices.length);
  const bottom = [];
  for (let i = 0; i < lip.positions.length; i += 12) {
    expect(lip.positions.slice(i + 6, i + 12)).toEqual([
      ...cliffs.positions.slice(i + 3, i + 6),
      ...cliffs.positions.slice(i, i + 3),
    ]);
    bottom.push(lip.positions[i + 7]!);
  }
  expect(Math.min(...bottom)).toBeLessThan(-27.3);
});
