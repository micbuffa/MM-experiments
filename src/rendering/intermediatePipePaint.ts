import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { TerrainPalettePaint } from './terrainPalettePaint';

/** Native playfield bank 3: violet light and dark faces, with no white gloss. */
export class IntermediatePipePaint extends TerrainPalettePaint {
  constructor(material: StandardMaterial) {
    super(material, 'arcade-terrain-paint', [
      ['pipeDark', 52, 51, 34, 170],
      ['pipeMid', 54, 85, 68, 204],
      ['pipeLight', 57, 119, 102, 255],
    ]);
  }
  override getCustomCode(shader: string) {
    return shader === 'fragment'
      ? {
          CUSTOM_FRAGMENT_DEFINITIONS:
            'uniform vec3 pipeDark; uniform vec3 pipeMid; uniform vec3 pipeLight;',
          CUSTOM_FRAGMENT_BEFORE_FOG: `
        float pipeFacing = clamp(dot(normalW, vec3(0.827,0.421,-0.372)),0.0,1.0);
        color.rgb = pipeFacing < 0.6 ? mix(pipeDark,pipeMid,pipeFacing/0.6)
          : mix(pipeMid,pipeLight,(pipeFacing-0.6)/0.4);
      `,
        }
      : null;
  }
}
