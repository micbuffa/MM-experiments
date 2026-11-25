import type { MaterialDefines } from '@babylonjs/core/Materials/materialDefines';
import { MaterialPluginBase } from '@babylonjs/core/Materials/materialPluginBase';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Ray } from '@babylonjs/core/Culling/ray';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh';
import type { UniformBuffer } from '@babylonjs/core/Materials/uniformBuffer';
import type { SubMesh } from '@babylonjs/core/Meshes/subMesh';
import type { AbstractEngine } from '@babylonjs/core/Engines/abstractEngine';
import type { Scene } from '@babylonjs/core/scene';
import {
  advanceOcclusionFade,
  isMarbleOccludedByTerrain,
} from '../game/modern/occlusionFade';
import type { PracticeTerrain } from '../game/modern/practiceTerrain';

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
    super(material, 'marble-occlusion-corridor', 250, {
      MM_OCCLUSION_CORRIDOR: false,
    });
    this.registerForExtraEvents = true;
    this._enable(true);
  }
  override prepareDefines(defines: MaterialDefines) {
    defines['MM_OCCLUSION_CORRIDOR'] = true;
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

const LANDMARK_OCCLUDER_PARTS = [
  'tower',
  'fort',
  'pyramid',
  'arch',
  'pipe',
  'wedge',
  'clock',
] as const;

/** Per-fragment corridor gated by real sightline raycasting so open floors stay spotless. */
export function createCameraOcclusion(scene: Scene, terrain?: PracticeTerrain) {
  const corridor: Corridor = {
    eye: Vector3.Zero(),
    marble: Vector3.Zero(),
    fade: 0,
  };
  const painted = new Set<StandardMaterial>();
  const landmarks: AbstractMesh[] = [];
  for (const mesh of scene.meshes) {
    if (
      mesh.infiniteDistance ||
      !(mesh.material instanceof StandardMaterial) ||
      mesh.material.name.startsWith('arcade-marble-') ||
      painted.has(mesh.material) ||
      mesh.material.pluginManager?.getPlugin('marble-occlusion-corridor')
    )
      continue;
    painted.add(mesh.material);
    new OcclusionCorridor(mesh.material, corridor);
  }
  if (terrain) {
    for (const mesh of scene.meshes) {
      if (
        !mesh.infiniteDistance &&
        LANDMARK_OCCLUDER_PARTS.some((part) => mesh.name.includes(part))
      ) {
        landmarks.push(mesh);
      }
    }
  }
  const rayDirection = Vector3.Zero();
  const ray = new Ray(Vector3.Zero(), Vector3.Forward(), 1);

  function isLandmarkOccluding() {
    if (landmarks.length === 0) return false;
    corridor.marble.subtractToRef(corridor.eye, rayDirection);
    const dist = rayDirection.length();
    if (dist < 1.2) return false;
    rayDirection.scaleInPlace(1 / dist);
    ray.origin.copyFrom(corridor.eye);
    ray.direction.copyFrom(rayDirection);
    ray.length = dist - 0.8;
    for (const mesh of landmarks) {
      if (!mesh.isEnabled() || !mesh.isVisible) continue;
      const box = mesh.getBoundingInfo().boundingBox;
      if (ray.intersectsBoxMinMax(box.minimumWorld, box.maximumWorld)) {
        return true;
      }
    }
    return false;
  }

  return (
    position: { x: number; y: number; z: number } | null,
    enabled: boolean,
    seconds: number,
  ) => {
    if (position)
      corridor.marble.set(position.x, position.y + 0.675, position.z);
    const camera = scene.activeCamera;
    if (camera) {
      camera.getViewMatrix();
      corridor.eye.copyFrom(camera.globalPosition);
    }
    const occluded =
      enabled && position
        ? terrain
          ? isMarbleOccludedByTerrain(
              corridor.eye,
              corridor.marble,
              terrain.cells,
            ) || isLandmarkOccluding()
          : true
        : false;
    corridor.fade =
      enabled && position
        ? advanceOcclusionFade(corridor.fade, occluded, seconds)
        : 0;
  };
}
