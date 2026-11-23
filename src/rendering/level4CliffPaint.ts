import {
  Level4PalettePaint,
  level4PaletteDefinitions,
  level4KeyVisibility,
} from './level4PalettePaint';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

export class Level4CliffPaint extends Level4PalettePaint {
  constructor(material: StandardMaterial) {
    super(material, 'level4-cliff-paint');
    this._enable(true);
  }
  override getCustomCode(shader: string) {
    if (shader !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_DEFINITIONS: level4PaletteDefinitions,
      CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
#ifdef VERTEXCOLOR
        float mmDiagonal = vPositionW.x + vPositionW.z + 130.0;
        vec2 mmGrid = vPositionW.xz + vec2(65.0);
        bool mmSecondBridge = mmGrid.x >= 82.0 && mmGrid.x <= 98.0 &&
          mmGrid.y >= 90.0 && mmGrid.y <= 98.0;
        float mmHeight = (16228.0 - 16384.0) * 0.102062073 -
          max(0.0, mmDiagonal - 146.0) * 0.06;
        if (mmSecondBridge) mmHeight = (16228.0 - 16384.0) * 0.102062073;
        float mmAlong = max(abs(normalW.x), abs(normalW.z)) == abs(normalW.x)
          ? vPositionW.z : vPositionW.x;
        float mmMark = step(0.23, fract(mmAlong)) * step(fract(mmAlong), 0.62);
        float mmRaised = step(0.10, fract(mmAlong)) * step(fract(mmAlong), 0.76);
        float mmBand = step(mmHeight, vPositionW.y) *
          step(vPositionW.y, mmHeight + 0.30) * mmRaised;
        // The opening walls remain orange/red all the way down. The
        // yellow lower band starts only in the later cylinder/catapult sector.
        bool mmFullYellow = vColor.g > 0.6;
        bool mmYellow = mmDiagonal >= 120.0 && (vPositionW.y < mmHeight || mmBand > 0.5);
        bool mmOrangeDot = vPositionW.y >= mmHeight &&
          vPositionW.y < mmHeight + 0.15 && mmMark > 0.5;
        mmYellow = mmFullYellow || (mmYellow && !mmOrangeDot);
        // The arcade uses an orange light-facing side and a deep red side.
        vec3 mmPaint = mmYellow ? vec3(1.0,1.0,0.0) : vec3(0.8,0.26666667,0.0);
        if (!mmYellow && abs(normalW.z) > 0.9)
          mmPaint = vec3(0.4,0.0,0.0);
        // The narrow upper edges are grey masonry, as on the adjacent paving.
        bool mmArchRim = normalW.y > 0.9 &&
          ((mmGrid.x >= 76.0 && mmGrid.x <= 79.0 && mmGrid.y >= 78.0 && mmGrid.y <= 81.0) ||
           (mmGrid.x >= 87.0 && mmGrid.x <= 90.0 && mmGrid.y >= 91.0 && mmGrid.y <= 95.0));
        if (mmArchRim) mmPaint = vec3(0.48);
        baseColor.rgb *= mmPaint / max(vColor.rgb, vec3(0.01));
#endif
      `,
      CUSTOM_FRAGMENT_BEFORE_FOG: `
#ifdef VERTEXCOLOR
        if (abs(normalW.y) < 0.1) {
          // The hemisphere contributes a shadow value of one. Remove that
          // contribution before normalizing the key's 0.1 shadow floor.
          ${level4KeyVisibility}
          float mmStone = clamp(baseColor.r / max(mmPaint.r, 0.01), 0.0, 1.0);
          bool mmDarkSide = abs(normalW.z) > 0.9;
          vec3 mmSunColor = mmYellow
            ? (mmDarkSide ? mmYellowDark : mmYellowLight)
            : (mmDarkSide ? mmWallDark : mmWallLight);
          vec3 mmShadeColor = mmYellow
            ? (mmDarkSide ? mmYellowDark : mmYellowShade)
            : (mmDarkSide ? mmWallDark : mmWallShade);
          // This facade is continuously lit in the reference; a coplanar
          // crossing edge must not introduce the old false contact stripe.
          bool mmLeftOpeningWall = abs(mmGrid.x - 22.0) < 0.01 &&
            mmGrid.y >= 18.0 && mmGrid.y <= 23.0 && abs(normalW.x) > 0.9;
          if (mmLeftOpeningWall) mmSun = 1.0;
          // The exterior finish facade has a baked tile shadow in the arcade.
          // Its sunward half-space contains no 3D caster. Reference boundary:
          // Z=72.5/73.5/74.5 -> H=16213/16203/16193; Z=75.5..78.5
          // -> H=16187; Z=79.5/80.5/81.5 -> H=16185/16175/16165.
          // Keep this mask in wall coordinates so it survives camera rotation.
          if (abs(mmGrid.x - 90.0) < 0.01 && abs(normalW.x) > 0.9 &&
              mmGrid.y >= 72.0 && mmGrid.y < 90.0) {
            float mmBakedHeight = 16187.0 + max(0.0, 75.1 - mmGrid.y) * 10.0
              - max(0.0, mmGrid.y - 79.3) * 10.0;
            mmSun = min(mmSun, step((mmBakedHeight - 16384.0) * 0.102062073, vPositionW.y));
          }
          color.rgb = mix(mmJoint, mix(mmShadeColor, mmSunColor, mmSun), mmStone);
        }
#endif
      `,
    };
  }
}
