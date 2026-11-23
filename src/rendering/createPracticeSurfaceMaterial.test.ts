import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import {
  createPracticeSurfaceMaterial,
  stylePracticeWalls,
  extendPracticePitRims,
  practiceFloorTone,
  practiceTowerStone,
  practiceWallBandColor,
} from './createPracticeSurfaceMaterial';

it('keeps mortar continuous across tiles and adds pixel steps at the stone edge', () => {
  const mortar = practiceFloorTone(0, 6);
  expect(practiceFloorTone(15, 6)).toBe(mortar);
  expect(practiceFloorTone(6, 0)).toBe(mortar);
  expect(practiceFloorTone(6, 15)).toBe(mortar);
  const bevel = practiceFloorTone(1, 3);
  const chippedBevel = practiceFloorTone(1, 4);
  expect(mortar).toBeLessThan(chippedBevel);
  expect(chippedBevel).toBeLessThan(bevel);
  expect(bevel).toBeLessThan(practiceFloorTone(2, 3));
  expect(practiceFloorTone(6, 6)).not.toBe(practiceFloorTone(7, 6));
  expect(practiceFloorTone(6, 6)).toBe(practiceFloorTone(8, 6));
});

it('keeps the wall bands aligned across adjacent faces and offsets the perpendicular face', () => {
  const faces = [
    ...[0, 2, 1, 0, 2, 0, 0, 0, 0, 0, 0, 1],
    ...[0, 2, 2, 0, 2, 1, 0, 0, 1, 0, 0, 2],
    ...[0, 2, 0, 1, 2, 0, 1, 0, 0, 0, 0, 0],
  ];
  const uvs = Array<number>(24).fill(0);
  stylePracticeWalls(faces, uvs, 0, 0);
  expect(uvs.filter((_, index) => index % 2 === 0)).toEqual([
    0.25, 0, 0, 0.25, 0.5, 0.25, 0.25, 0.5, 0.25, 0.5, 0.5, 0.25,
  ]);
});

it('anchors the two pit palettes to the same visible columns and keeps walls outside the pits on the repeating band', () => {
  const face = [25, 0, 13, 24, 0, 13, 24, -1, 13, 25, -1, 13];
  const right = face.map((coordinate, index) =>
    index % 3 === 0
      ? coordinate - 11
      : index % 3 === 2
        ? coordinate + 13
        : coordinate,
  );
  const outside = face.map((coordinate, index) =>
    index % 3 === 2 ? coordinate + 8 : coordinate,
  );
  const uvs = Array<number>(24).fill(0);
  stylePracticeWalls([...face, ...right, ...outside], uvs, 0.5, 0);
  expect(uvs[0]).toBeCloseTo(0.4375);
  expect(uvs[8]).toBeCloseTo(uvs[0]!);
  expect(uvs[1]).toBeGreaterThan(0.25);
  expect(uvs[9]).toBeGreaterThan(0.625);
  expect(uvs[5]).toBeGreaterThan(uvs[3]!);
  expect(uvs[17]).toBeLessThan(0.25);
});

it('covers the trimmed upper wall with paving and leaves the pit open below it', () => {
  const surface = { positions: [], indices: [], uvs: [] } as {
    positions: number[];
    indices: number[];
    uvs: number[];
  };
  const exposedEdge = [0, 0, -12, 1, 0, -12, 1, -2, -12, 0, -2, -12];
  extendPracticePitRims(surface, exposedEdge, { x: 0, z: 0 }, 50, 50, -2);
  expect(surface.indices).toHaveLength(6);
  expect(surface.positions[8]).toBeGreaterThan(-12);
  expect(surface.positions[11]).toBeGreaterThan(-12);
  expect(surface.positions.filter((_, index) => index % 3 === 1)).toEqual([
    0, 0, 0, 0,
  ]);
});

it('keeps the orange stripe phase continuous over adjoining faces of the outer right cliff', () => {
  const faces = [
    19, 0, 40, 18, 0, 40, 18, -2, 40, 19, -2, 40, 20, -0.2, 40, 19, 0, 40, 19,
    -2, 40, 20, -2, 40,
  ];
  const uvs = Array<number>(16).fill(0);
  stylePracticeWalls(faces, uvs, 0, 0);
  expect(uvs.slice(0, 8)).toEqual(uvs.slice(8));
  expect(uvs[0]).toBeGreaterThan(uvs[2]!);
});

it('uses burnt orange and yellow on the appropriate ends of each central guardrail wall', () => {
  const face = (x: number, z: number, dx: number, dz: number) => [
    x + dx,
    0,
    z + dz,
    x,
    0,
    z,
    x,
    -1,
    z,
    x + dx,
    -1,
    z + dz,
  ];
  const walls = [
    ...face(30, 25, 1, 0),
    ...face(33, 24, 1, 1),
    ...face(25, 30, 0, 1),
    ...face(25, 34, 0, 1),
    ...face(31, 25, 1, 0),
    ...face(31, 25, 0, 1),
    ...face(31, 26, 0, 1),
  ];
  const uvs: number[] = [];
  const colors = stylePracticeWalls(walls, uvs, 0, 0);
  expect([uvs[2], uvs[10], uvs[18], uvs[26]]).toEqual([0, 0.5, 0.5, 0]);
  expect([uvs[34], uvs[42], uvs[50]]).toEqual([0.5, 0.25, 0]);
  expect(colors[64]).toBeGreaterThan(colors[48]!);
  expect(colors[80]).toBe(1);
  expect(uvs[41]).toBeGreaterThan(uvs[45]!);
  expect(uvs[49]).toBe(uvs[53]);
});

it('uses dark mortar around the stones of the skirt and follows the taper of the cap', () => {
  expect(practiceTowerStone(0.01, 0.25)).toBeLessThan(
    practiceTowerStone(0.25, 0.25),
  );
  expect(practiceTowerStone(0.5, 0.75)).toBeGreaterThan(
    practiceTowerStone(0.25, 0.75),
  );
  expect(practiceTowerStone(0.25, 0.48)).toBeLessThan(
    practiceTowerStone(0.25, 0.25),
  );
});

it('divides the cap face with a diagonal which converges toward the apex', () => {
  expect(practiceTowerStone(0.34, 0.57)).toBeLessThan(
    practiceTowerStone(0.57, 0.57),
  );
  expect(practiceTowerStone(0.44, 0.83)).toBeLessThan(
    practiceTowerStone(0.57, 0.83),
  );
});

it('paints uniform yellow cliff courses separated by dark vertical joints', () => {
  expect(practiceWallBandColor(0)).toEqual([26, 20, 15, 255]);
  expect(practiceWallBandColor(16)).toEqual([26, 20, 15, 255]);
  expect(practiceWallBandColor(5)).toEqual([254, 237, 0, 255]);
  expect(practiceWallBandColor(25)).toEqual([254, 237, 0, 255]);
  expect(practiceWallBandColor(42)).toEqual([254, 237, 0, 255]);
  expect(practiceWallBandColor(56)).toEqual([254, 237, 0, 255]);
});

it('centers four pixels of vertical mortar on each sixteen-pixel tile boundary', () => {
  const mortar = Array.from({ length: 16 }, (_, x) => x).filter(
    (x) => practiceWallBandColor(x)[0] === 26,
  );
  expect(mortar).toEqual([0, 1, 14, 15]);
});

it('includes the atlas cutout in the final alpha test instead of painting transparent texels black', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const material = createPracticeSurfaceMaterial(scene, 'wall');
    expect(material.useAlphaFromDiffuseTexture).toBe(true);
    expect(material.diffuseTexture?.hasAlpha).toBe(true);
    expect(material.needAlphaTesting()).toBe(true);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
