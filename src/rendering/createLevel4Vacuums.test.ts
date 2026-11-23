import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { Scene } from '@babylonjs/core/scene';
import { expect, it } from 'vitest';
import { createLevel4Vacuums } from './createLevel4Vacuums';
import { setLevel4VacuumExtensions } from './createLevel4Materials';
import type { TerrainCell } from '../game/modern/terrainMesh';

it('uses rectangular procedural mouths and shakes only the head on native active images', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const cells = Array.from({ length: 130 }, () =>
    Array<TerrainCell>(130).fill(null),
  );
  cells[37]![39] = [-8, -8, -8, -8];
  try {
    createLevel4Vacuums(scene, cells, true);
    const root = scene.getTransformNodeByName('level4-vacuum-0')!;
    const head = scene.getTransformNodeByName('level4-vacuum-0-head')!;
    const hose = scene.getMeshByName('level4-vacuum-0-hose')!;
    const mouth = scene.getMeshByName('level4-vacuum-0-mouth')!;
    expect(root.isEnabled()).toBe(false);
    setLevel4VacuumExtensions(scene, [1], [0]);
    const startY = head.position.y;
    const hoseY = hose.getAbsolutePosition().y;
    mouth.computeWorldMatrix(true);
    const startTarget = mouth.getAbsolutePosition().clone();
    expect(head.rotation.z).toBeLessThan(0);
    setLevel4VacuumExtensions(scene, [1], [1]);
    expect(head.position.y).toBeGreaterThan(startY);
    expect(head.rotation.z).toBeGreaterThan(0);
    expect(hose.getAbsolutePosition().y).toBe(hoseY);
    mouth.computeWorldMatrix(true);
    expect(mouth.getAbsolutePosition().equals(startTarget)).toBe(false);
    for (let i = 0; i < 10; i++)
      scene.onBeforeRenderObservable.notifyObservers(scene);
    expect(head.position.y).toBeCloseTo(1.225);
    setLevel4VacuumExtensions(scene, [0.5], [1]);
    expect(head.rotation.z).toBe(0);
    expect(head.scaling.x).toBe(1);
    setLevel4VacuumExtensions(scene, undefined);
    expect(root.isEnabled()).toBe(false);
    expect(head.position.y).toBe(1.2);
    mouth.computeWorldMatrix(true);
    const bounds = mouth.getBoundingInfo().boundingBox.extendSize;
    expect(bounds.x / bounds.y).toBeGreaterThan(1.9);
    expect(bounds.x / bounds.y).toBeLessThan(2.2);
    const elbow = scene.getMeshByName('level4-vacuum-0-elbow')!;
    expect(elbow.parent).toBe(root);
    const points = elbow.getVerticesData(VertexBuffer.PositionKind)!;
    const ys = points.filter((_, i) => i % 3 === 1);
    const zs = points.filter((_, i) => i % 3 === 2);
    // The bend overlaps the shaft at its lower end and enters the rear hood.
    expect(Math.min(...ys)).toBeLessThan(1.05);
    expect(Math.max(...ys)).toBeGreaterThan(1.5);
    expect(Math.max(...zs)).toBeGreaterThan(0.25);
    expect(Math.min(...zs)).toBeLessThan(0);
    expect(elbow.material).toBe(hose.material);
    expect(bounds.z).toBeLessThan(0.03);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
