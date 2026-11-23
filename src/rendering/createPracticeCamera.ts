import { Camera } from '@babylonjs/core/Cameras/camera';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import type { Scene } from '@babylonjs/core/scene';
import {
  practiceFrame,
  practiceFrustum,
  practiceOpeningScroll,
  practiceOrigin,
  practiceSideBorder,
} from '../game/modern/practiceProjection';

export function createPracticeCamera(
  scene: Scene,
  columns: number,
  rows: number,
  origin = practiceOrigin,
  scroll = practiceOpeningScroll,
) {
  const camera = new FreeCamera(
    'practice-reference-camera',
    new Vector3(Math.sqrt(3 / 8), 0.5, Math.sqrt(3 / 8)).scale(100),
    scene,
  );
  camera.setTarget(Vector3.Zero());
  camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
  camera.minZ = 1;
  camera.maxZ = 250;
  const { left, right, top, bottom } = practiceFrustum(
    columns,
    rows,
    scroll,
    origin,
  );
  camera.orthoLeft = left;
  camera.orthoRight = right;
  camera.orthoTop = top;
  camera.orthoBottom = bottom;

  const engine = scene.getEngine();
  function fitViewport() {
    const ratio = engine.getRenderWidth() / engine.getRenderHeight();
    const frameWidth = Math.min(1, practiceFrame.displayAspect / ratio);
    const border = practiceSideBorder / practiceFrame.width;
    camera.viewport.width = frameWidth * (1 - 2 * border);
    camera.viewport.height = Math.min(1, ratio / practiceFrame.displayAspect);
    camera.viewport.x = (1 - camera.viewport.width) / 2;
    camera.viewport.y = (1 - camera.viewport.height) / 2;
  }
  fitViewport();
  const resize = engine.onResizeObservable.add(fitViewport);
  scene.onDisposeObservable.add(() => engine.onResizeObservable.remove(resize));
  return camera;
}
