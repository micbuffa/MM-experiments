import { Engine } from '@babylonjs/core/Engines/engine';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector';

/** Browser-test inspection only: project real mesh centers before a trusted click. */
export function projectCabinetMesh(name: string) {
  const scene = Engine.LastCreatedScene;
  if (!scene?.activeCamera) throw Error('No live Babylon scene');
  const mesh = scene.getMeshByName(name);
  if (!mesh) throw Error(`Missing mesh ${name}`);
  mesh.computeWorldMatrix(true);
  const engine = scene.getEngine();
  const point = Vector3.Project(
    mesh.getBoundingInfo().boundingBox.centerWorld,
    Matrix.Identity(),
    scene.getTransformMatrix(),
    scene.activeCamera.viewport.toGlobal(
      engine.getRenderWidth(),
      engine.getRenderHeight(),
    ),
  );
  const hit = scene.pick(
    point.x * engine.getHardwareScalingLevel(),
    point.y * engine.getHardwareScalingLevel(),
    (mesh) => mesh.isPickable && mesh.isEnabled(),
  );
  return {
    picked: hit?.pickedMesh?.name,
    x: point.x,
    y: point.y,
    width: engine.getRenderWidth(),
    height: engine.getRenderHeight(),
  };
}

export function captureCabinetResources() {
  const scene = Engine.LastCreatedScene;
  if (!scene) throw Error('No live Babylon scene');
  return () => ({
    disposed: scene.isDisposed,
    meshes: scene.meshes.length,
    textures: scene.textures.length,
    materials: scene.materials.length,
    lights: scene.lights.length,
    cameras: scene.cameras.length,
  });
}

export function trackballOrientation(name = 'cabinet-trackball') {
  const ball = Engine.LastCreatedScene?.getMeshByName(name);
  if (!ball?.rotationQuaternion) throw Error('Missing trackball orientation');
  return ball.rotationQuaternion.asArray();
}
