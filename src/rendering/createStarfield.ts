import { Layer } from '@babylonjs/core/Layers/layer';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';
import { starfieldPixels } from '../game/modern/starfield';

/** Scene-owned background, equally legible in orthographic and perspective views.
 * Layer registers LayerSceneComponent and its shaders in BabylonJS 9.33.2.
 */
export function createStarfield(scene: Scene) {
  const sky = new Layer('modern-starfield', null, scene, true);
  const texture = RawTexture.CreateRGBATexture(
    starfieldPixels(),
    1024,
    512,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  texture.name = 'modern-starfield-paint';
  texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
  sky.texture = texture;
  return sky;
}
