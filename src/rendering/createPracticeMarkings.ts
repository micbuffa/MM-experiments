import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';
import { terrainMesh } from '../game/modern/terrainMesh';

export function practiceArrowMesh(terrain: PracticeTerrain, acrossX: boolean) {
  const { cells, origin } = terrain;
  const masked = cells.map((row, z) =>
    row.map((cell, x) => {
      const worldX = x + origin.x;
      const worldZ = z + origin.z;
      const cross = acrossX ? worldZ : worldX;
      const along = acrossX ? worldX : worldZ;
      return cross >= 37 && cross < 39 && along >= 23 && along < 32
        ? cell
        : null;
    }),
  );
  const arrow = terrainMesh(masked);
  for (let i = 0; i < arrow.uvs.length; i += 2) {
    const x = arrow.uvs[i]! + origin.x;
    const z = arrow.uvs[i + 1]! + origin.z;
    arrow.uvs[i] = ((acrossX ? z : x) - 37) / 2;
    arrow.uvs[i + 1] = ((acrossX ? x : z) - 23) / 9;
  }
  return arrow;
}

export function practiceCenterArrowMesh({ cells, origin }: PracticeTerrain) {
  const masked = cells.map((row, z) =>
    row.map((cell, x) => {
      const wx = x + origin.x;
      const wz = z + origin.z;
      return wx >= 37 && wx < 45 && wz >= 37 && wz < 45 ? cell : null;
    }),
  );
  const arrow = terrainMesh(masked);
  for (let i = 0; i < arrow.uvs.length; i += 2) {
    const x = arrow.uvs[i]! + origin.x;
    const z = arrow.uvs[i + 1]! + origin.z;
    arrow.uvs[i] = 0.5 + (z - x) / 5;
    arrow.uvs[i + 1] = (x + z - 76) / 11;
  }
  return arrow;
}

export function practiceArrowPaint(
  width: number,
  length: number,
  center = false,
) {
  const pixels = new Uint8Array(width * length * 4);
  for (let y = 0; y < length; y++) {
    const along = y / (length - 1);
    let edge = 0;
    if (center) {
      if ((along >= 0.1 && along < 0.19) || (along >= 0.225 && along < 0.32))
        edge = 0.1;
      else if (along >= 0.36 && along < 0.72) edge = 0.15;
      else if (along >= 0.72 && along < 0.96)
        edge = (0.325 * (0.96 - along)) / 0.24;
    } else if (along >= 0.06 && along < 0.57) edge = 0.205;
    else if (along >= 0.57 && along < 0.71)
      edge = (0.4 * (0.71 - along)) / 0.14;
    else if (along >= 0.73 && along < 0.846)
      edge = (0.31 * (0.846 - along)) / 0.116;
    else if (along >= 0.865 && along < 0.958)
      edge = (0.25 * (0.958 - along)) / 0.093;
    for (let x = 0; x < width; x++) {
      const across = x / (width - 1) - 0.5;
      const opacity = Math.min(1, (edge - Math.abs(across)) * width);
      if (opacity <= 0) continue;
      const bright = across > -0.08 && across < 0.14;
      pixels.set(
        [bright ? 179 : 127, bright ? 39 : 23, 22, Math.round(215 * opacity)],
        4 * (y * width + x),
      );
    }
  }
  return pixels;
}

export function createPracticeArrowMaterial(scene: Scene, center = false) {
  const paint = new StandardMaterial(
    center ? 'practice-center-arrow-paint' : 'practice-arrow-paint',
    scene,
  );
  paint.specularColor.set(0, 0, 0);
  const width = 64;
  const length = 128;
  const texture = RawTexture.CreateRGBATexture(
    practiceArrowPaint(width, length, center),
    width,
    length,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  texture.hasAlpha = true;
  paint.diffuseTexture = texture;
  paint.useAlphaFromDiffuseTexture = true;
  return paint;
}
