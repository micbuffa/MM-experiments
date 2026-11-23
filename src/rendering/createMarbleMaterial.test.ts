import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import {
  arcadeMarblePixels,
  createMarbleMaterial,
  marbleReflectionPixels,
} from './createMarbleMaterial';
import { expect, it } from 'vitest';

it('paints a Rolling Madness 3D two-tone rolling texture for blue and red spheres', () => {
  const blue = arcadeMarblePixels(false),
    red = arcadeMarblePixels(true);
  let blueLight = 0,
    blueDeep = 0,
    redLight = 0,
    redDeep = 0;
  for (let i = 0; i < blue.length; i += 4) {
    expect(blue[i + 3]).toBe(255);
    expect(red[i + 3]).toBe(255);
    expect(blue[i + 2]).toBeGreaterThan(blue[i]!);
    expect(red[i]).toBeGreaterThan(red[i + 2]!);
    if (blue[i]! > 60) blueLight++;
    else if (blue[i]! < 30) blueDeep++;
    if (red[i + 1]! > 65) redLight++;
    else if (red[i + 1]! < 30) redDeep++;
  }
  expect(blueLight).toBeGreaterThan(2000);
  expect(blueDeep).toBeGreaterThan(2000);
  expect(redLight).toBeGreaterThan(2000);
  expect(redDeep).toBeGreaterThan(2000);
  expect(blue).not.toEqual(red);
});

it('builds a spherical reflection map with a crisp glossy highlight', () => {
  const env = marbleReflectionPixels();
  let peak = 0;
  let dark = 255;
  for (let i = 0; i < env.length; i += 4) {
    expect(env[i + 3]).toBe(255);
    if (env[i]! > peak) peak = env[i]!;
    if (env[i]! < dark) dark = env[i]!;
  }
  expect(peak).toBeGreaterThan(220);
  expect(dark).toBeLessThan(10);
});

it('repeats UVs, applies spherical reflection, and shares paint per player', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const paint = createMarbleMaterial(scene, false);
    expect(paint.diffuseTexture?.wrapV).toBe(Texture.WRAP_ADDRESSMODE);
    expect(paint.reflectionTexture?.coordinatesMode).toBe(
      Texture.SPHERICAL_MODE,
    );
    expect(createMarbleMaterial(scene, false)).toBe(paint);
    expect(createMarbleMaterial(scene, true)).not.toBe(paint);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
