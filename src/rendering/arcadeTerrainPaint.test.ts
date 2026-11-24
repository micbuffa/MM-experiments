import { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Effect } from '@babylonjs/core/Materials/effect';
import { expect, it, vi } from 'vitest';
import {
  ArcadeTerrainPaint,
  setArcadeTerrainPalette,
} from './arcadeTerrainPaint';
import { IntermediatePipePaint } from './intermediatePipePaint';
import { Level4GoldPaint } from './level4PalettePaint';

it.each(['practice', 'intermediate', 'level3'] as const)(
  'updates %s stone and green surfaces from the native banks without allocating scene resources',
  (level) => {
    const engine = new NullEngine(),
      scene = new Scene(engine);
    try {
      const material = new StandardMaterial('stone', scene);
      const paint = new ArcadeTerrainPaint(material, level, 'floor');
      const green = new ArcadeTerrainPaint(
        new StandardMaterial('green', scene),
        'level3',
        'green',
      );
      const wave = new ArcadeTerrainPaint(
        new StandardMaterial('wave', scene),
        'level3',
        'wave',
      );
      const box = CreateBox('test', {}, scene),
        subMesh = box.subMeshes![0]!;
      const colors = new Map<string, number[]>();
      const effect = {
        setColor3: (name: string, color: { r: number; g: number; b: number }) =>
          colors.set(name, [color.r, color.g, color.b]),
      } as unknown as Effect;
      vi.spyOn(subMesh, 'effect', 'get').mockReturnValue(effect);
      const palette = Array<number>(80).fill(0);
      palette[8] = 0xcfda;
      palette[15] = 0xf0bf;
      palette[24] = 0x99db;
      palette[63] = 0x777b;
      palette[68] = 0xa8fb;
      const counts = [scene.materials.length, scene.textures.length];
      setArcadeTerrainPalette(scene, undefined);
      setArcadeTerrainPalette(scene, palette);
      setArcadeTerrainPalette(scene, palette);
      paint.hardBindForSubMesh(material._uniformBuffer, scene, engine, subMesh);
      expect(colors.get('apFloor')).toEqual([210 / 255, 182 / 255, 140 / 255]);
      expect(colors.get('apLightWall')).toEqual([0, 187 / 255, 1]);
      green.hardBindForSubMesh(material._uniformBuffer, scene, engine, subMesh);
      expect(colors.get('apFloor')).toEqual([99 / 255, 143 / 255, 121 / 255]);
      wave.hardBindForSubMesh(material._uniformBuffer, scene, engine, subMesh);
      expect(colors.get('apFloor')).toEqual([63 / 255, 63 / 255, 99 / 255]);
      expect(colors.get('apBright')).toEqual([96 / 255, 180 / 255, 132 / 255]);
      setArcadeTerrainPalette(scene, Array<number>(32).fill(0));
      paint.hardBindForSubMesh(material._uniformBuffer, scene, engine, subMesh);
      expect(colors.get('apFloor')).toEqual([0, 0, 0]);
      expect([scene.materials.length, scene.textures.length]).toEqual(counts);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  },
);

it('emits unique shader defines per plugin variant so BabylonJS effect cache never collides across levels', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const plugins = [
      new ArcadeTerrainPaint(
        new StandardMaterial('a', scene),
        'practice',
        'floor',
      ),
      new ArcadeTerrainPaint(
        new StandardMaterial('b', scene),
        'practice',
        'wall',
      ),
      new ArcadeTerrainPaint(
        new StandardMaterial('c', scene),
        'level3',
        'wall',
      ),
      new ArcadeTerrainPaint(
        new StandardMaterial('d', scene),
        'level6',
        'wall',
      ),
      new IntermediatePipePaint(new StandardMaterial('e', scene)),
      new Level4GoldPaint(new StandardMaterial('f', scene)),
    ];
    const keys = new Set<string>();
    for (const plugin of plugins) {
      const defines = new MaterialDefines();
      plugin.prepareDefines(defines);
      expect(defines[plugin.shaderDefine]).toBe(true);
      keys.add(plugin.shaderDefine);
    }
    expect(keys.size).toBe(plugins.length);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
