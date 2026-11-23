import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { RawTexture } from '@babylonjs/core/Materials/Textures/rawTexture';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import type { Scene } from '@babylonjs/core/scene';

/**
 * Rolling Madness 3D-inspired two-tone glossy marble texture (4×2 subtle check/swirl).
 * Rolling motion reads naturally without painting high-contrast bowling-ball dots.
 */
export function arcadeMarblePixels(red: boolean) {
  const width = 128,
    height = 64;
  const pixels = new Uint8Array(width * height * 4);
  const deep = red ? ([196, 16, 14] as const) : ([14, 24, 214] as const);
  const light = red ? ([244, 86, 70] as const) : ([84, 102, 248] as const);
  for (let y = 0; y < height; y++) {
    const v = (y + 0.5) / height;
    for (let x = 0; x < width; x++) {
      const u = (x + 0.5) / width;
      // Softly antialiased 4×2 two-tone panels matching Rolling Madness 3D's player.png.
      const waveU = Math.sin(u * Math.PI * 4);
      const waveV = Math.sin(v * Math.PI * 2);
      const blend = Math.max(0, Math.min(1, 0.5 + 3.2 * waveU * waveV));
      const offset = (y * width + x) * 4;
      pixels[offset] = Math.round(deep[0] + (light[0] - deep[0]) * blend);
      pixels[offset + 1] = Math.round(deep[1] + (light[1] - deep[1]) * blend);
      pixels[offset + 2] = Math.round(deep[2] + (light[2] - deep[2]) * blend);
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

/** Procedural spherical environment map giving a view-stable glossy marble highlight. */
export function marbleReflectionPixels() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    const ny = (y + 0.5) / size - 0.5;
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size - 0.5;
      const distPrimary = Math.hypot(nx + 0.14, ny + 0.16);
      const distSecondary = Math.hypot(nx - 0.18, ny - 0.19);
      const primary = Math.exp(-distPrimary * distPrimary * 68);
      const secondary = Math.exp(-distSecondary * distSecondary * 28) * 0.28;
      const rim = Math.max(0, 1 - Math.hypot(nx, ny) * 2.1) * 0.14;
      const value = Math.min(
        255,
        Math.round((primary + secondary + rim) * 255),
      );
      const offset = (y * size + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = Math.min(255, Math.round(value * 1.04));
      pixels[offset + 3] = 255;
    }
  }
  return pixels;
}

/** Scene-owned glossy marble paint shared by normal, dizzy and broken meshes of one player. */
export function createMarbleMaterial(scene: Scene, red: boolean) {
  const name = 'arcade-marble-' + (red ? 'red' : 'blue');
  const existing = scene.getMaterialByName(name);
  if (existing instanceof StandardMaterial) return existing;
  const paint = new StandardMaterial(name, scene);
  const rgba = arcadeMarblePixels(red);
  paint.diffuseTexture = RawTexture.CreateRGBATexture(
    rgba,
    128,
    64,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  paint.diffuseTexture.name = name + '-paint';
  paint.diffuseTexture.wrapU = paint.diffuseTexture.wrapV =
    Texture.WRAP_ADDRESSMODE;
  const env = RawTexture.CreateRGBATexture(
    marbleReflectionPixels(),
    64,
    64,
    scene,
    true,
    false,
    Texture.TRILINEAR_SAMPLINGMODE,
  );
  env.name = name + '-env';
  env.coordinatesMode = Texture.SPHERICAL_MODE;
  env.level = 0.6;
  paint.reflectionTexture = env;
  paint.emissiveColor.set(red ? 0.11 : 0.025, 0.02, red ? 0.02 : 0.14);
  paint.specularColor.set(0.95, 0.96, 1);
  paint.specularPower = 96;
  return paint;
}
