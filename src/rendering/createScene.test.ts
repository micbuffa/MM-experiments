import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { expect, it } from 'vitest';
import { createScene } from './createScene';

it('construit et détruit la scène de démarrage sans navigateur', () => {
  const engine = new NullEngine();
  try {
    const scene = createScene(engine);
    expect(scene.activeCamera?.name).toBe('camera');
    expect(scene.getMeshByName('board')).not.toBeNull();
    expect(scene.getMeshByName('marble')?.position.y).toBe(0.5);
    expect(scene.lights).toHaveLength(1);
    scene.render();
    scene.dispose();
    expect(scene.isDisposed).toBe(true);
  } finally {
    engine.dispose();
  }
});
