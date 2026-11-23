import { Engine } from '@babylonjs/core/Engines/engine';
import { createScene } from '../rendering/createScene';

/** Le propriétaire de l'application doit appeler dispose à sa destruction. */
export function createApplication(
  canvas: HTMLCanvasElement,
  create = createScene,
): {
  scene: ReturnType<typeof createScene>;
  dispose(): void;
} {
  const engine = new Engine(canvas, true);
  const scene = create(engine, canvas);
  const resize = () => engine.resize();
  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', resize);

  return {
    scene,
    dispose() {
      window.removeEventListener('resize', resize);
      engine.stopRenderLoop();
      scene.dispose();
      engine.dispose();
    },
  };
}
