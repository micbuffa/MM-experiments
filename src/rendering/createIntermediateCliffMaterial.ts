import { ArcadeTerrainPaint } from './arcadeTerrainPaint';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

export function createIntermediateCliffMaterial(scene: Scene) {
  const pixels = new Uint8Array(8 * 4);
  for (let x = 0; x < 8; x++) {
    pixels.set(
      x === 0 || x === 7 ? [0, 0, 0, 255] : [255, 255, 255, 255],
      x * 4,
    );
  }
  const material = new StandardMaterial('intermediate-cliffs', scene);
  material.diffuseTexture = RawTexture.CreateRGBATexture(
    pixels,
    8,
    1,
    scene,
    true,
    false,
    Texture.NEAREST_NEAREST_MIPLINEAR,
  );
  new ArcadeTerrainPaint(material, 'intermediate', 'wall');
  material.twoSidedLighting = true;
  material.specularColor.set(0, 0, 0);
  material.emissiveColor.set(0.045, 0.1, 0.16);
  // Open cliff faces must also block light coming from their reverse side.
  material.backFaceCulling = false;
  return material;
}
