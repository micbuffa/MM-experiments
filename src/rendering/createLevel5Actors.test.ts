import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import { createLevel5Actors } from './createLevel5Actors';
import { createPracticeSun } from './createPracticeSun';
import type { RollingActors } from '../emulation/rollingActors';

it('shows native slots, freezes their pose without a new snapshot and removes vanished slots', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const model = {
      seconds: 1,
      uvs: [0, 0, 1, 0, 0, 1],
      groups: { 'test.png': [0, 1, 2] },
      poses: [
        {
          positions: [0, -2, 0, 1, -2, 0, 0, 1, 0],
          normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
        },
      ],
    };
    const library: RollingActors = {
      models: { blacky_mini: model, bird: model },
      textures: {
        'test.png':
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      },
    };
    const shadows = createPracticeSun(scene, 140, 'intermediate');
    const update = createLevel5Actors(
      scene,
      {
        level: 'level5',
        cells: Array.from({ length: 141 }, () => Array(141).fill(null)),
        origin: { x: 0, z: 0 },
        lastScroll: -16152,
      },
      library,
    );
    const pose = {
      marble: 'visible' as const,
      x: 1004,
      z: 996,
      height: 16168,
      scroll: -15212,
      level5Actors: [
        {
          id: 0,
          kind: 'black' as const,
          x: 750,
          z: 780,
          height: 16238,
          state: 0,
          phase: 0,
          heading: 0,
          fast: false,
        },
      ],
    };
    update(pose);
    const mesh = scene.meshes.find((m) => m.name.includes('blacky_mini'))!;
    expect(mesh.isEnabled()).toBe(true);
    const position = mesh.position.clone();
    update(pose);
    expect(mesh.position.equals(position)).toBe(true);
    update({
      ...pose,
      level5Actors: [{ ...pose.level5Actors[0]!, state: 2, squash: 1 / 3 }],
    });
    expect(mesh.scaling.y).toBeCloseTo(0.119 * (1 - 0.8 / 3));
    expect(mesh.scaling.x).toBeCloseTo(0.119 * 1.35);
    expect(mesh.position.y - 2 * mesh.scaling.y).toBeCloseTo(
      position.y + 0.025,
    );
    update(pose);
    expect(mesh.scaling.y).toBeCloseTo(0.119);
    expect(mesh.scaling.x).toBeCloseTo(0.119);
    expect(mesh.position.equals(position)).toBe(true);
    update({
      ...pose,
      level5Actors: [
        { ...pose.level5Actors[0]!, id: 9, kind: 'bird', heading: Math.PI },
      ],
    });
    const bird = scene.meshes.find((m) =>
      m.name.includes('level5-actor-9-bird-'),
    )!;
    expect(bird.rotation.y).toBeCloseTo(2 * Math.PI);
    expect(bird.receiveShadows).toBe(false);
    expect(shadows.getShadowMap()?.renderList).toContain(bird);
    const spark = scene.getMeshByName('level5-bird-spark-0')!;
    expect(spark.isEnabled()).toBe(false);
    update({
      ...pose,
      level5Actors: [
        {
          ...pose.level5Actors[0]!,
          id: 9,
          kind: 'bird',
          state: 2,
          birdSpark: 2 / 3,
        },
      ],
    });
    expect(spark.isEnabled()).toBe(true);
    expect(bird.isEnabled()).toBe(false);
    update({ ...pose, level5Actors: [] });
    expect(mesh.isEnabled()).toBe(false);
    expect(spark.isEnabled()).toBe(false);
    update(null);
    expect(mesh.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
