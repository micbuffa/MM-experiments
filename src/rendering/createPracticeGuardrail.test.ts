import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import { createPracticeGuardrail } from './createPracticeGuardrail';

it('builds rail sections with independent materials from the same mounting points', () => {
  const engine = new NullEngine();
  try {
    const scene = new Scene(engine);
    const red = new StandardMaterial('red', scene);
    red.diffuseColor = Color3.Red();
    const blue = new StandardMaterial('blue', scene);
    blue.diffuseColor = Color3.Blue();
    const posts = [
      { base: Vector3.Zero(), top: new Vector3(0, 1, 0) },
      { base: new Vector3(2, 1, 0), top: new Vector3(2, 2, 0) },
      { base: new Vector3(2, 1, 2), top: new Vector3(2, 2, 2) },
    ];
    const corner = createPracticeGuardrail(scene, 'corner', posts, red);
    const straight = createPracticeGuardrail(
      scene,
      'straight',
      posts.slice(0, 2),
      blue,
    );
    expect(corner.getChildMeshes()).toHaveLength(8);
    expect(straight.getChildMeshes()).toHaveLength(5);
    const beam = scene.getMeshByName('straight-beam-1')!;
    expect(beam.position.asArray()).toEqual([1, 1.5, 0]);
    expect(beam.material).toBe(blue);
    expect(corner.getChildMeshes().every((mesh) => mesh.material === red)).toBe(
      true,
    );
    corner.dispose();
    expect(beam.isDisposed()).toBe(false);
  } finally {
    engine.dispose();
  }
});
