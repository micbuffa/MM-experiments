import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { expect, it } from 'vitest';
import { createTerrainStudy } from './createTerrainStudy';
import type { TerrainCell } from '../game/modern/terrainMesh';
it('builds a separate Level 5 scene, reverse opening camera and scene-owned resources', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 141 }, () =>
      Array<TerrainCell>(141).fill(null),
    );
    for (let z = 18; z < 28; z++)
      for (let x = 19; x < 23; x++) cells[z]![x] = [0, 0, 0, 0];
    const scene = createTerrainStudy(engine, undefined, {
      level: 'level5',
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -16152,
    });
    expect(scene.getMeshByName('level5-finish')).not.toBeNull();
    expect(scene.getMeshByName('terrain-cliffs')?.material?.name).toBe(
      'level5-cliffs',
    );
    expect(
      scene.meshes.filter((m) => m.name.startsWith('level5-pyramid-')),
    ).toHaveLength(5);
    expect(
      scene.meshes.filter((m) => m.name.startsWith('level5-fort-corners-')),
    ).toHaveLength(3);
    expect(scene.getMeshByName('practice-landmarks')).toBeNull();
    scene.dispose();
    expect(scene.textures).toHaveLength(0);
    expect(scene.meshes).toHaveLength(0);
  } finally {
    engine.dispose();
  }
});

it('follows decreasing native scroll instead of clamping the whole race to its finish', async () => {
  const { createLivePracticeView } = await import('./createLivePracticeView');
  const { practiceFrustum } = await import('../game/modern/practiceProjection');
  const engine = new NullEngine();
  try {
    const terrain = {
      level: 'level5' as const,
      cells: [[[0, 0, 0, 0] as const]],
      origin: { x: 0, z: 0 },
      lastScroll: -16152,
    };
    const view = createLivePracticeView(engine, terrain);
    view.update({
      level: 'level5',
      marble: 'visible',
      x: 4,
      z: 4,
      height: 16384,
      scroll: -15212,
    });
    const camera = view.scene.getCameraByName('practice-reference-camera')!;
    expect(camera.orthoTop).toBeCloseTo(
      practiceFrustum(1, 1, -15212, { x: 0, z: 0 }).top,
    );
    const opening = camera.orthoTop!;
    view.update({
      level: 'level5',
      marble: 'visible',
      x: 4,
      z: 4,
      height: 16384,
      scroll: -15330,
    });
    expect(camera.orthoTop).toBeGreaterThan(opening);
    expect(camera.orthoTop).toBeCloseTo(
      practiceFrustum(1, 1, -15330, { x: 0, z: 0 }).top,
    );
    view.scene.dispose();
  } finally {
    engine.dispose();
  }
});

it('places both marbles on the visible finish platform while retaining native pose coordinates', async () => {
  const { createLivePracticeView } = await import('./createLivePracticeView');
  const engine = new NullEngine();
  try {
    const terrain = {
      level: 'level5' as const,
      cells: Array.from({ length: 141 }, () =>
        Array<TerrainCell>(141).fill(null),
      ),
      origin: { x: 0, z: 0 },
      lastScroll: -16152,
    };
    const view = createLivePracticeView(engine, terrain);
    const pose = {
      level: 'level5' as const,
      marble: 'visible' as const,
      x: 168,
      z: 176,
      height: 16368,
      scroll: -16000,
      player2: { marble: 'visible' as const, x: 169, z: 176, height: 16368 },
    };
    view.update(pose);
    const marble = view.scene.getMeshByName('practice-player')!;
    expect(marble.position.x).toBeCloseTo((168 + 48) / 8 - 70.5);
    expect(marble.position.z).toBeCloseTo((176 + 48) / 8 - 70.5);
    expect(pose.x).toBe(168);
    expect(pose.player2.x).toBe(169);
    view.scene.dispose();
  } finally {
    engine.dispose();
  }
});

it('builds the three castle forts with four corner quarters and no central spike, and shows the Escher ? hint only outside arcade view', () => {
  const engine = new NullEngine();
  try {
    const cells = Array.from({ length: 141 }, () =>
      Array<TerrainCell>(141).fill(null),
    );
    const scene = createTerrainStudy(engine, undefined, {
      level: 'level5',
      cells,
      origin: { x: 0, z: 0 },
      lastScroll: -16152,
    });
    for (const [cx, cz] of [
      [36, 27],
      [11, 28],
      [48, 36],
    ]) {
      expect(scene.getMeshByName(`level5-pyramid-${cx}-${cz}`)).toBeNull();
      const corners = scene.getMeshByName(`level5-fort-corners-${cx}-${cz}`)!;
      expect(corners).not.toBeNull();
      const normals = corners.getVerticesData('normal')!;
      for (let i = 1; i < normals.length; i += 3)
        expect(normals[i]).toBeGreaterThan(0);
    }
    const hint = scene.getMeshByName('level5-escher-hint')!;
    expect(hint).not.toBeNull();
    expect(hint.isVisible).toBe(true);
    scene.activeCamera = scene.getCameraByName('practice-reference-camera')!;
    expect(hint.isVisible).toBe(false);
    scene.activeCamera = scene.getCameraByName('terrain-camera')!;
    expect(hint.isVisible).toBe(true);
    scene.dispose();
  } finally {
    engine.dispose();
  }
});
