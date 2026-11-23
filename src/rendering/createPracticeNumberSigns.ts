import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import { terrainMesh, type TerrainCell } from '../game/modern/terrainMesh';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { practiceDecalOpacity } from './practiceDecalOpacity';

const digits = [
  ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  ['10010', '10010', '10010', '11111', '00010', '00010', '00010'],
  ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  ['01111', '10000', '10000', '11110', '10001', '10001', '01110'],
] as const;

export const practiceNumberSignPlacements = [
  { x: 66, z: 54, acrossX: true },
  { x: 49, z: 61, acrossX: false },
  { x: 59, z: 71, acrossX: false },
] as const;

export function practiceNumberSignPaint(mirrorDigits = false) {
  const pixels = new Uint8Array(96 * 64 * 4);
  const red = [177, 42, 40, 255];
  const white = [255, 237, 230, 255];
  for (let y = 0; y < 64; y++) {
    for (let x = 0; x < 96; x++) {
      const column = Math.floor(x / 16);
      const onWhite = column % 2 === 0;
      let color: number[] | undefined;
      if (column < 4 && (onWhite ? y < 48 : y >= 16)) {
        const letterY = Math.floor((y - (onWhite ? 2 : 36)) / 3);
        const glyphColumn = Math.floor(((x % 16) - 3) / 2);
        // The left-facing arcade marking flips the glyph within its tile.
        // The checkerboard and the arrow stay in the same UV positions.
        const letterX = mirrorDigits ? 4 - glyphColumn : glyphColumn;
        const stroke = digits[column]?.[letterY]?.[letterX] === '1';
        color = onWhite !== stroke ? white : red;
      }
      if (x >= 64 && x < 92 && Math.abs(y - 32) <= (x < 81 ? 3 : 92 - x))
        color = red;
      if (color) {
        const offset = 4 * (y * 96 + x);
        pixels.set(color, offset);
        pixels[offset + 3] = practiceDecalOpacity(x, y);
      }
    }
  }
  return pixels;
}

export function practiceNumberSignMesh(
  {
    cells,
    origin,
  }: {
    readonly cells: readonly (readonly TerrainCell[])[];
    readonly origin: PracticeTerrain['origin'];
  },
  {
    x: startX,
    z: startZ,
    acrossX,
  }: (typeof practiceNumberSignPlacements)[number],
) {
  const coordinates = (x: number, z: number) => {
    const dx = x + origin.x - startX;
    const dz = z + origin.z - startZ;
    return acrossX ? ([dx, dz] as const) : ([dz, dx] as const);
  };
  const marked = cells.map((row, z) =>
    row.map((cell, x) => {
      const [along, across] = coordinates(x, z);
      return along >= 0 && along < 6 && across >= 0 && across < 4 ? cell : null;
    }),
  );
  const mesh = terrainMesh(marked);
  for (let i = 0; i < mesh.uvs.length; i += 2) {
    const [along, across] = coordinates(mesh.uvs[i]!, mesh.uvs[i + 1]!);
    mesh.uvs[i] = along / 6;
    mesh.uvs[i + 1] = across / 4;
  }
  return mesh;
}

export function createPracticeNumberSignMaterial(
  scene: Scene,
  mirrorDigits: boolean,
) {
  const name = mirrorDigits
    ? 'practice-number-sign-left'
    : 'practice-number-sign';
  const material = new StandardMaterial(name, scene);
  material.specularColor.set(0, 0, 0);
  material.emissiveColor.set(0.18, 0.18, 0.18);
  const texture = RawTexture.CreateRGBATexture(
    practiceNumberSignPaint(mirrorDigits),
    96,
    64,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.hasAlpha = true;
  material.diffuseTexture = texture;
  material.useAlphaFromDiffuseTexture = true;
  return material;
}
