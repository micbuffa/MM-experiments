import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { expect, it } from 'vitest';
import { createPracticeTower } from './createPracticeTower';

it('keeps the apex and every shoulder/skirt ring centred on the square under all quarter turns', () => {
  const engine = new NullEngine(),
    scene = new Scene(engine);
  try {
    const mesh = createPracticeTower(
      scene,
      'tower',
      new StandardMaterial('stone', scene),
    );
    const positions = mesh.getVerticesData('position')!;
    const vertices = [] as number[][];
    for (let v = 0; v < positions.length; v += 3)
      vertices.push(Array.from(positions.slice(v, v + 3)));
    const top = Math.max(...vertices.map((p) => p[1]!));
    for (const p of vertices.filter((p) => p[1] === top)) {
      expect(p[0]).toBe(0.5);
      expect(p[2]).toBe(0.5);
    }
    const key = (p: readonly number[]) =>
      p.map((n) => Math.round(n * 1e6)).join(',');
    const points = new Set(vertices.map(key));
    for (const [x, y, z] of vertices)
      expect(points.has(key([1 - z!, y!, x!]))).toBe(true);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
