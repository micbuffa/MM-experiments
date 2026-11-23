import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Scene } from '@babylonjs/core/scene';
import { advanceOcclusionFade } from '../game/modern/occlusionFade';

interface Corridor {
  eye: Vector3;
  marble: Vector3;
  fade: number;
}
class OcclusionCorridor extends MaterialPluginBase {
  constructor(
    material: StandardMaterial,
    private readonly corridor: Corridor,
  ) {
    super(material, 'marble-occlusion-corridor', 250);
    this.registerForExtraEvents = true;
    this._enable(true);
  }
  override getUniforms() {
    return { externalUniforms: ['mmEye', 'mmMarble', 'mmFade'] };
  }
  override hardBindForSubMesh(
    _buffer: UniformBuffer,
    _scene: Scene,
    _engine: AbstractEngine,
    subMesh: SubMesh,
  ) {
    const effect = subMesh.effect;
    if (!effect) return;
    effect.setVector3('mmEye', this.corridor.eye);
    effect.setVector3('mmMarble', this.corridor.marble);
    effect.setFloat('mmFade', this.corridor.fade);
  }
  override getCustomCode(shader: string) {
    return shader === 'fragment'
      ? {
          CUSTOM_FRAGMENT_DEFINITIONS:
            'uniform vec3 mmEye; uniform vec3 mmMarble; uniform float mmFade;',
          CUSTOM_FRAGMENT_BEFORE_LIGHTS: `
        if (mmFade > 0.001) {
        vec3 mmLine = mmMarble - mmEye;
        float mmT = dot(vPositionW - mmEye, mmLine) / max(dot(mmLine, mmLine), 0.001);
        float mmDistance = length(vPositionW - (mmEye + clamp(mmT, 0.0, 1.0) * mmLine));
        float mmAboveFoot = smoothstep(mmMarble.y - 0.55, mmMarble.y - 0.25, vPositionW.y);
        float mmClearFoot = smoothstep(0.85, 1.35, length(vPositionW - mmMarble));
        float mmMask = (1.0 - smoothstep(0.75, 1.5, mmDistance)) * step(0.03, mmT) * step(mmT, 0.96) * mmAboveFoot * mmClearFoot;
        float mmX = mod(floor(gl_FragCoord.x), 4.0);
        float mmY = mod(floor(gl_FragCoord.y), 4.0);
        float mmThreshold = (mod(mmX,2.0)*8.0 + mod(mmY,2.0)*4.0 + floor(mmX/2.0)*2.0 + floor(mmY/2.0) + 0.5) / 16.0;
        if (mmThreshold > 1.0 - mmMask * mmFade * 0.98) discard;
        }
      `,
        }
      : null;
  }
}

/** Per-fragment corridor: a merged wall mesh need not disappear across the level. */
export function createCameraOcclusion(scene: Scene) {
  const corridor: Corridor = {
    eye: Vector3.Zero(),
    marble: Vector3.Zero(),
    fade: 0,
  };
  const painted = new Set<StandardMaterial>();
  for (const mesh of scene.meshes) {
    if (
      mesh.infiniteDistance ||
      !(mesh.material instanceof StandardMaterial) ||
      mesh.material.name.startsWith('arcade-marble-') ||
      painted.has(mesh.material)
    )
      continue;
    painted.add(mesh.material);
    new OcclusionCorridor(mesh.material, corridor);
  }
  return (
    position: { x: number; y: number; z: number } | null,
    enabled: boolean,
    seconds: number,
  ) => {
    corridor.fade =
      enabled && position
        ? advanceOcclusionFade(corridor.fade, true, seconds)
        : 0;
    if (position)
      corridor.marble.set(position.x, position.y + 0.675, position.z);
    const camera = scene.activeCamera;
    if (camera) {
      camera.getViewMatrix();
      corridor.eye.copyFrom(camera.globalPosition);
    }
  };
}
