import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import type { Effect } from '@babylonjs/core/Materials/effect';
import { expect, it, vi } from 'vitest';
import {
  createLevel4CliffMaterial,
  createLevel4TopFloorMaterial,
} from './createLevel4Materials';
import {
  type Level4PalettePaint,
  setLevel4Palette,
} from './level4PalettePaint';

it('updates the wall and ramp uniforms from the same native snapshot without creating resources', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const wall = createLevel4CliffMaterial(scene);
    const gold = createLevel4TopFloorMaterial(scene);
    const mesh = CreateBox('palette-check', {}, scene);
    const subMesh = mesh.subMeshes![0]!;
    const colors = new Map<string, number[]>();
    const effect = {
      setColor3: (name: string, color: { r: number; g: number; b: number }) =>
        colors.set(name, [color.r, color.g, color.b]),
    } as unknown as Effect;
    vi.spyOn(subMesh, 'effect', 'get').mockReturnValue(effect);
    const palette = Array<number>(32).fill(0);
    palette[15] = 0xff43;
    palette[31] = 0xffb0;
    palette[28] = 0xffcc;
    const counts = [scene.materials.length, scene.textures.length];
    setLevel4Palette(scene, undefined);
    for (let i = 0; i < 3; i++) setLevel4Palette(scene, palette);
    for (const [material, name] of [
      [wall, 'level4-cliff-paint'],
      [gold, 'level4-gold-paint'],
    ] as const) {
      const plugin = material.pluginManager!.getPlugin(
        name,
      ) as Level4PalettePaint;
      plugin.hardBindForSubMesh(
        material._uniformBuffer,
        scene,
        engine,
        subMesh,
      );
      expect(colors.get('mmWallLight')).toEqual([1, 68 / 255, 51 / 255]);
      expect(colors.get('mmYellowLight')).toEqual([1, 187 / 255, 0]);
      expect(colors.get('mmGoldLight')).toEqual([1, 204 / 255, 204 / 255]);
    }
    expect([scene.materials.length, scene.textures.length]).toEqual(counts);
    setLevel4Palette(scene, Array<number>(32).fill(0));
    const plugin = wall.pluginManager!.getPlugin(
      'level4-cliff-paint',
    ) as Level4PalettePaint;
    plugin.hardBindForSubMesh(wall._uniformBuffer, scene, engine, subMesh);
    expect(colors.get('mmWallLight')).toEqual([0, 0, 0]);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
