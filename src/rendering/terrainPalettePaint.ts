import type { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Scene } from '@babylonjs/core/scene';
import {
  terrainPaletteRgb,
  type TerrainPalette,
} from '../emulation/terrainPalette';

export type PaletteSwatch = readonly [
  name: string,
  index: number,
  r: number,
  g: number,
  b: number,
];

/** Palette uniforms belong to the material/scene, without observers or readbacks. */
export class TerrainPalettePaint extends MaterialPluginBase {
  private readonly colors: Color3[];
  private palette?: TerrainPalette;
  readonly shaderDefine: string;
  constructor(
    material: StandardMaterial,
    name: string,
    private readonly swatches: readonly PaletteSwatch[],
    defineKey?: string,
  ) {
    const key =
      defineKey ??
      `MM_PALETTE_${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
    super(material, name, 210, { [key]: false });
    this.shaderDefine = key;
    this.colors = swatches.map(
      ([, , r, g, b]) => new Color3(r / 255, g / 255, b / 255),
    );
    this.registerForExtraEvents = true;
    this._enable(true);
  }
  override prepareDefines(defines: MaterialDefines) {
    defines[this.shaderDefine] = true;
  }
  setPalette(palette: TerrainPalette) {
    if (palette === this.palette) return;
    this.palette = palette;
    for (let i = 0; i < this.swatches.length; i++) {
      const word = palette[this.swatches[i]![1]];
      if (word === undefined) continue;
      const [r, g, b] = terrainPaletteRgb(word);
      this.colors[i]!.set(r / 255, g / 255, b / 255);
    }
  }
  override getUniforms() {
    return { externalUniforms: this.swatches.map(([name]) => name) };
  }
  override hardBindForSubMesh(
    _buffer: UniformBuffer,
    _scene: Scene,
    _engine: AbstractEngine,
    subMesh: SubMesh,
  ) {
    const effect = subMesh.effect;
    if (effect)
      for (let i = 0; i < this.swatches.length; i++)
        effect.setColor3(this.swatches[i]![0], this.colors[i]!);
  }
}
