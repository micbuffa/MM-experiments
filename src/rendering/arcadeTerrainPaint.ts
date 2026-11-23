import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import type { Scene } from '@babylonjs/core/scene';
import type { TerrainPalette } from '../emulation/terrainPalette';
import { TerrainPalettePaint, type PaletteSwatch } from './terrainPalettePaint';

export type ArcadePaintLevel =
  'practice' | 'intermediate' | 'level3' | 'level5' | 'level6';
type Surface = 'floor' | 'wall' | 'tower' | 'green' | 'wave' | 'ice';
const defaults = {
  practice: [
    [180, 180, 180],
    [255, 255, 255],
    [70, 70, 70],
    [255, 238, 0],
    [238, 119, 0],
    [170, 51, 0],
    [24, 24, 24],
  ],
  intermediate: [
    [180, 180, 180],
    [255, 255, 255],
    [70, 70, 70],
    [0, 187, 255],
    [0, 100, 150],
    [0, 54, 90],
    [24, 24, 24],
  ],
  level5: [
    [180, 180, 180],
    [255, 255, 255],
    [70, 70, 70],
    [255, 255, 0],
    [170, 170, 0],
    [119, 119, 0],
    [24, 24, 24],
  ],
  level6: [
    [180, 180, 180],
    [255, 255, 255],
    [70, 70, 70],
    [238, 17, 17],
    [170, 0, 0],
    [119, 0, 0],
    [24, 24, 24],
  ],
  level3: [
    [210, 182, 140],
    [255, 238, 221],
    [105, 91, 70],
    [45, 45, 45],
    [36, 36, 36],
    [24, 24, 24],
    [75, 65, 50],
  ],
} as const;
const names = [
  'apFloor',
  'apBright',
  'apShade',
  'apLightWall',
  'apShadeWall',
  'apDarkWall',
  'apJoint',
] as const;
const indices = [8, 12, 4, 15, 14, 13, 1] as const;

/** Lighting selects native palette hues; no white specular is added to masonry. */
export class ArcadeTerrainPaint extends TerrainPalettePaint {
  constructor(
    material: StandardMaterial,
    readonly level: ArcadePaintLevel,
    private readonly surface: Surface,
  ) {
    const swatches: PaletteSwatch[] = names.map((name, i) => {
      const rgb = defaults[level][i]!;
      const index = i === 6 && level === 'level3' ? 3 : indices[i]!;
      return [name, index, ...rgb];
    });
    if (surface === 'green') {
      swatches[0] = ['apFloor', 24, 99, 143, 121];
      swatches[1] = ['apBright', 26, 150, 195, 165];
      swatches[2] = ['apShade', 20, 45, 55, 50];
    }
    if (surface === 'wave') {
      swatches[0] = ['apFloor', 63, 63, 126, 99];
      swatches[1] = ['apBright', 68, 96, 180, 132];
      swatches[2] = ['apShade', 65, 21, 42, 33];
    }
    if (surface === 'ice') {
      swatches[0] = ['apFloor', 24, 0, 135, 135];
      swatches[1] = ['apBright', 28, 0, 255, 255];
      swatches[2] = ['apShade', 20, 0, 45, 45];
    }
    super(material, 'arcade-terrain-paint', swatches);
  }
  override getCustomCode(shader: string) {
    if (shader !== 'fragment') return null;
    const visibility = this.level === 'level3' ? '0.1' : '0.025';
    const pattern =
      this.surface === 'green' || this.surface === 'wave'
        ? 'min(1.0, apPattern.g / 0.72941176)'
        : 'apPattern.r';
    const code =
      this.surface === 'ice'
        ? `
      float apIceTone = apPattern.g;
      vec3 apIce = apIceTone <= 0.75294118 ? apFloor * apIceTone / 0.75294118
        : mix(apFloor,apBright,(apIceTone-0.75294118)/0.24705882);
      color.rgb = mix(apShade, apIce, apSun);
    `
        : this.surface === 'floor' ||
            this.surface === 'green' ||
            this.surface === 'wave'
          ? `
      float apTilt = clamp(dot(normalW.xz, vec2(0.827,-0.372)) * 3.0, -1.0, 1.0);
      vec3 apStone = apTilt < 0.0 ? mix(apFloor, apShade, -apTilt) : mix(apFloor, apBright, apTilt);
      color.rgb = mix(apShade, apStone, apSun) * ${pattern};
    `
          : this.level === 'practice'
            ? `
      float apRatio = apPattern.g / max(apPattern.r, 0.001);
      vec3 apPaint = apRatio > 0.7 ? (abs(normalW.z) > 0.9 ? apDarkWall : apLightWall) : apRatio > 0.4 ? apShadeWall : apDarkWall;
      vec3 apShadow = apRatio > 0.7 && abs(normalW.z) < 0.9 ? apShadeWall : apDarkWall;
      color.rgb = apPattern.r < 0.2 ? apJoint : mix(apShadow, apPaint, apSun);
    `
            : `
      vec3 apPaint = abs(normalW.x) > 0.9 ? mix(${this.level === 'level3' ? 'apDarkWall' : 'apShadeWall'}, apLightWall, apSun) : ${this.level === 'level3' ? 'mix(apDarkWall * 0.55, apDarkWall, apSun)' : 'apDarkWall'};
      ${this.surface === 'tower' ? 'color.rgb = apPattern.r < 0.15 ? apDarkWall * 0.6 : mix(apPaint, apShade, step(0.4, apPattern.r));' : 'color.rgb = mix(apJoint, apPaint, apPattern.r);'}
    `;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: names
        .map((name) => `uniform vec3 ${name};`)
        .join('\n'),
      CUSTOM_FRAGMENT_BEFORE_FOG: `
        vec3 apPattern = baseColor.rgb;
#ifdef VERTEXCOLOR
        apPattern /= max(vColor.rgb,vec3(0.001));
#endif
        float apSun = numLights > 0.0
          ? clamp((aggShadow * numLights - (numLights - 1.0) - ${visibility}) / (1.0 - ${visibility}),0.0,1.0) : 1.0;
        ${code}
      `,
    };
  }
}

export function setArcadeTerrainPalette(
  scene: Scene,
  palette: TerrainPalette | undefined,
) {
  if (!palette) return;
  for (const material of scene.materials) {
    const plugin = material.pluginManager?.getPlugin('arcade-terrain-paint');
    if (plugin instanceof TerrainPalettePaint) plugin.setPalette(palette);
  }
}
