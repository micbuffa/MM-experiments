import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { describe, expect, it } from 'vitest';
import { createAcidDissolve } from './createAcidDissolve';
import { marbleRadius } from './createPracticeMarble';

describe('createAcidDissolve', () => {
  it('shrinks the marble core and emits rising fizz particles across progress 0..1', () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      const update = createAcidDissolve(scene, 'p1', false);
      const core = scene.getMeshByName('p1-acid-core')!;
      const sparks = scene.meshes.filter((m) =>
        m.name.startsWith('p1-acid-spark-'),
      );
      expect(core).not.toBeNull();
      expect(sparks).toHaveLength(16);
      expect(core.isEnabled()).toBe(false);

      const pos = { x: 2, y: 1, z: -3 };
      update(pos, 0);
      expect(core.isEnabled()).toBe(true);
      expect(core.scaling.x).toBeCloseTo(1, 2);
      expect(core.position.y).toBeCloseTo(pos.y + marbleRadius, 2);

      update(pos, 0.4);
      expect(core.isEnabled()).toBe(true);
      expect(core.scaling.x).toBeLessThan(0.6);
      const activeSparks = sparks.filter((s) => s.isEnabled());
      expect(activeSparks.length).toBeGreaterThan(6);
      expect(activeSparks.every((s) => s.position.y > pos.y)).toBe(true);

      update(pos, 1);
      expect(core.isEnabled()).toBe(false);
      expect(sparks.every((s) => !s.isEnabled())).toBe(true);

      update(pos, 0.3);
      update(null);
      expect(core.isEnabled()).toBe(false);
      expect(sparks.every((s) => !s.isEnabled())).toBe(true);
    } finally {
      scene.dispose();
      engine.dispose();
    }
  });
});
