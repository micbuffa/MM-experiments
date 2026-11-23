import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { expect, it } from 'vitest';
import { createBirdDeath } from './createBirdDeath';
it('displays only the emitted native fragments and clears them at the end of the death state', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    new FreeCamera('camera', new Vector3(0, 0, -10), scene).setTarget(
      Vector3.Zero(),
    );
    const update = createBirdDeath(scene, 'test-death', false),
      point = { x: 0, y: 0, z: 0 };
    expect(
      update({ progress: 0.5, fragments: [{ id: 3, x: 24, y: -12 }] }, point),
    ).toBe(true);
    const mesh = scene.getMeshByName('test-death-3')!;
    expect(mesh.isEnabled()).toBe(true);
    expect(scene.meshes.filter((m) => m.isEnabled())).toHaveLength(1);
    const position = mesh.position.clone();
    update({ progress: 0.5, fragments: [{ id: 3, x: 24, y: -12 }] }, point);
    expect(mesh.position.equals(position)).toBe(true);
    expect(update(undefined, point)).toBe(false);
    expect(mesh.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
