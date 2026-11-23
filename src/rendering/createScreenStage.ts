import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { RenderTargetTexture } from '@babylonjs/core/Materials/Textures/renderTargetTexture';
import type { Scene } from '@babylonjs/core/scene';
import type { RenderQuality } from '../game/renderQuality';
import { createCabinet } from './createCabinet';
import { createBarRoom } from './createBarRoom';

export function createScreenStage(scene: Scene) {
  const root = new TransformNode('screen-stage', scene);
  const cabinet = createCabinet(scene, root),
    room = createBarRoom(scene, root);
  // ShadowGenerator registers its scene component in this BabylonJS version.
  const shadows = new ShadowGenerator(1024, room.key);
  shadows.usePercentageCloserFiltering = true;
  shadows.bias = 0.002;
  shadows.normalBias = 0.025;
  shadows.darkness = 0.3;
  room.key.shadowMinZ = 0.1;
  room.key.shadowMaxZ = 30;
  for (const mesh of cabinet.root.getChildMeshes())
    if (
      mesh.visibility > 0 &&
      !mesh.name.includes('label') &&
      !mesh.name.includes('marquee') &&
      !mesh.name.includes('stripe') &&
      !mesh.name.includes('title')
    )
      shadows.addShadowCaster(mesh, false);
  for (const mesh of room.root.getChildMeshes())
    if (
      mesh.name.includes('counter') ||
      mesh.name.includes('stool') ||
      mesh.name.includes('table')
    )
      shadows.addShadowCaster(mesh, false);
  const map = () => shadows.getShadowMap()!;
  map().refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  return {
    roll: cabinet.roll,
    setQuality(quality: RenderQuality) {
      room.key.shadowEnabled = quality !== 'eco';
      shadows.mapSize = quality === 'retina' ? 2048 : 1024;
      map().refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
      map().resetRefreshCounter();
    },
    setEnabled(enabled: boolean) {
      root.setEnabled(enabled);
      room.setEnabled(enabled);
    },
  };
}
