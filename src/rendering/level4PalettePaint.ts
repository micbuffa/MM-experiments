import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { TerrainPalette } from '../emulation/terrainPalette';
import { TerrainPalettePaint } from './terrainPalettePaint';

// Measured fallback from the pinned core's Level 4 checkpoint, not the full-map PNG.
const swatches = [
  ['mmWallLight', 15, 255, 68, 51],
  ['mmWallShade', 14, 187, 51, 34],
  ['mmWallDark', 13, 119, 34, 17],
  ['mmYellowLight', 31, 255, 187, 0],
  ['mmYellowShade', 30, 221, 136, 0],
  ['mmYellowDark', 29, 153, 102, 0],
  ['mmJoint', 4, 70, 70, 70],
  ['mmGoldLight', 28, 255, 204, 204],
  ['mmGoldMid', 24, 165, 143, 110],
  ['mmGoldDark', 21, 75, 70, 60],
] as const;
export const level4PaletteDefinitions = swatches
  .map(([name]) => `uniform vec3 ${name};`)
  .join('\n');
export const level4KeyVisibility = `float mmSun = numLights > 0.0
  ? clamp((aggShadow * numLights - (numLights - 1.0) - 0.1) / 0.9, 0.0, 1.0) : 0.0;`;

export class Level4PalettePaint extends TerrainPalettePaint {
  constructor(material: StandardMaterial, name: string) {
    super(material, name, swatches);
  }
}

export function setLevel4Palette(
  scene: Scene,
  palette: TerrainPalette | undefined,
) {
  if (!palette) return;
  for (const name of ['level4-cliffs', 'level4-top-floor']) {
    const material = scene.getMaterialByName(name) as StandardMaterial | null;
    const plugin = material?.pluginManager?.getPlugin(
      name === 'level4-cliffs' ? 'level4-cliff-paint' : 'level4-gold-paint',
    );
    if (plugin instanceof Level4PalettePaint) plugin.setPalette(palette);
  }
}

export class Level4GoldPaint extends Level4PalettePaint {
  constructor(material: StandardMaterial) {
    super(material, 'level4-gold-paint');
  }
  override getCustomCode(shader: string) {
    return shader === 'fragment'
      ? {
          CUSTOM_FRAGMENT_DEFINITIONS: level4PaletteDefinitions,
          CUSTOM_FRAGMENT_BEFORE_FOG: `
        ${level4KeyVisibility}
        // Palette lighting changes hue as well as intensity on the arcade ramps.
        float mmTilt = clamp(dot(normalW.xz, vec2(0.824, -0.370)) * 3.0, -1.0, 1.0);
        vec3 mmGold = mmTilt < 0.0
          ? mix(mmGoldMid, mmGoldDark, -mmTilt)
          : mix(mmGoldMid, mmGoldLight, mmTilt);
        color.rgb = mix(mmGoldDark, mmGold, mmSun) * baseColor.rgb;
      `,
        }
      : null;
  }
}
