import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import type { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { expect, it } from 'vitest';
import { createRollingCatapult } from './createRollingCatapult';
import { setLevel4CatapultFrame } from './createLevel4Materials';

it('selects imported idle and throw poses while retaining the procedural fallback', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    scene.metadata = {};
    expect(createRollingCatapult(scene, { models: {}, textures: {} })).toBe(
      false,
    );
    const root = new TransformNode('level4-catapult', scene);
    root.position.y = -11;
    const axle = new TransformNode('level4-catapult-axle', scene);
    const cup = CreateBox('level4-catapult-cup', {}, scene);
    cup.position.set(-2, -11, 5);
    cup.parent = axle;
    const pose = {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    };
    const model = {
      seconds: 1,
      poses: [pose],
      uvs: [0, 0, 1, 0, 0, 1],
      groups: { 'catapult.png': [0, 1, 2] },
    };
    expect(
      createRollingCatapult(scene, {
        models: {
          catapult: model,
          catapult_throw: {
            ...model,
            poses: [pose, { ...pose, positions: [0, 0, 0, 1, 0, 0, 0, 3, 0] }],
          },
        },
        textures: { 'catapult.png': 'data:image/png;base64,AA==' },
      }),
    ).toBe(true);
    const idle = scene.getMeshByName(
      'level4-imported-catapult-catapult-catapult.png',
    )!;
    expect(idle.isEnabled()).toBe(true);
    const material = idle.material as StandardMaterial;
    expect(material.diffuseTexture).not.toBeNull();
    expect(material.diffuseColor.asArray()).toEqual([1, 0, 0]);
    // Even the extracted pink swatch and its highlights must remain red.
    expect(material.emissiveColor.g).toBe(0);
    expect(material.emissiveColor.b).toBe(0);
    expect(material.specularColor.g).toBe(0);
    expect(material.specularColor.b).toBe(0);
    expect(cup.isEnabled()).toBe(false);
    setLevel4CatapultFrame(scene, 19);
    const throwing = scene.getMeshByName(
      'level4-imported-catapult-catapult_throw-catapult.png',
    )!;
    expect(idle.isEnabled()).toBe(false);
    expect(throwing.getVerticesData(VertexBuffer.PositionKind)?.[7]).toBe(3);
    setLevel4CatapultFrame(scene, undefined);
    expect(idle.isEnabled()).toBe(true);
    expect(throwing.isEnabled()).toBe(false);
    expect(scene.getMeshByName('level4-catapult-cup')).toBe(cup);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
