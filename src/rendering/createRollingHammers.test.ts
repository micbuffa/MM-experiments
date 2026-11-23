import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { CreateBox } from '@babylonjs/core/Meshes/Builders/boxBuilder';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { expect, it, vi } from 'vitest';
import { createRollingHammers } from './createRollingHammers';
import { setLevel4HammerFrames } from './createLevel4Materials';
import { readLevel4HammerFrames } from '../emulation/level4Hammers';

it('reads the 4 Level 4 hammer frames from native object slots', () => {
  const bytes = new Uint8Array(0x1600);
  const memory = new DataView(bytes.buffer);
  expect(readLevel4HammerFrames(memory)).toEqual([
    undefined,
    undefined,
    undefined,
    undefined,
  ]);
  const slot0 = 0xa9c;
  memory.setUint8((slot0 + 0x18) ^ 1, 1);
  memory.setUint8((slot0 + 0x1b) ^ 1, 0x0a);
  memory.setUint8((slot0 + 0x1f) ^ 1, 0x0c);
  memory.setInt16(slot0 + 0x10, 102 * 8, true);
  memory.setUint16(slot0 + 0x42, 0x0002, true);
  memory.setUint16(slot0 + 0x44, 0x0c14, true);

  const slot2 = 0xa9c + 2 * 0x56;
  memory.setUint8((slot2 + 0x18) ^ 1, 1);
  memory.setUint8((slot2 + 0x1b) ^ 1, 0x0a);
  memory.setUint8((slot2 + 0x1f) ^ 1, 0x0c);
  memory.setInt16(slot2 + 0x10, 106 * 8, true);
  memory.setUint16(slot2 + 0x42, 0x0002, true);
  memory.setUint16(slot2 + 0x44, 0x2346 + 9 * 4, true);

  // The interpreter has already advanced its next-entry pointer; the emitted
  // sprite remains step 9 until the next native update actually draws step 10.
  memory.setUint16(slot2 + 0x3e, 0x0002, true);
  memory.setUint16(slot2 + 0x40, 0x2346 + 10 * 4, true);
  expect(readLevel4HammerFrames(memory)).toEqual([0, undefined, 9, undefined]);
  memory.setUint16(slot2 + 0x44, 0x2346 + 14 * 4, true);
  expect(readLevel4HammerFrames(memory)[2]).toBe(14);
  memory.setUint16(slot2 + 0x44, 0x2347, true);
  expect(readLevel4HammerFrames(memory)[2]).toBeUndefined();
  expect(
    readLevel4HammerFrames(new DataView(new ArrayBuffer(0xae1)))[0],
  ).toBeUndefined();
});

it.each([false, true])(
  'synchronizes imported hammers without a local clock (live=%s)',
  (live) => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    try {
      vi.spyOn(engine, 'getDeltaTime').mockReturnValue(100);
      scene.metadata = {};
      expect(createRollingHammers(scene, { models: {}, textures: {} })).toBe(
        false,
      );
      const key = new DirectionalLight('key', new Vector3(-1, -2, -1), scene);
      new ShadowGenerator(512, key);
      for (let i = 0; i < 4; i++) {
        const base = CreateBox(`level4-hammer-${i}-base`, {}, scene);
        base.position.set(40, -15.6, 37.5 + i * 2);
        const pivot = new TransformNode(`level4-hammer-${i}`, scene);
        pivot.position.set(40, -15.27, 37.5 + i * 2);
      }
      const basePose = {
        positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
        normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      };
      const poses = Array.from({ length: 42 }, (_, idx) => ({
        ...basePose,
        positions: [0, 0, 0, 1, 0, 0, 0, idx + 1, 0],
      }));
      const model = {
        seconds: 4,
        poses,
        uvs: [0, 0, 1, 0, 0, 1],
        groups: { 'hammer.png': [0, 1, 2] },
      };
      expect(
        createRollingHammers(
          scene,
          {
            models: { hammer: model },
            textures: { 'hammer.png': 'data:image/png;base64,AA==' },
          },
          live,
        ),
      ).toBe(true);
      const first = scene.getMeshByName(
        'level4-imported-hammer-0-hammer-hammer.png',
      )!;
      const second = scene.getMeshByName(
        'level4-imported-hammer-1-hammer-hammer.png',
      )!;
      expect(first.isEnabled()).toBe(!live);
      expect(second.isEnabled()).toBe(false);
      expect(scene.getMeshByName('level4-hammer-0-base')?.isEnabled()).toBe(
        false,
      );
      expect(first.rotation.y).toBeCloseTo(0);
      expect(first.position.x).toBeCloseTo(40.45);
      // Study mode starts hammer 0 and 2 at pose 6 (value 7) and hides hammers 1 and 3.
      expect(first.getVerticesData(VertexBuffer.PositionKind)?.[7]).toBe(
        live ? 1 : 7,
      );

      // Live frame override maps native step 9 -> pose 10 (value 11), step 0 -> hidden.
      setLevel4HammerFrames(scene, [9, 2, undefined, 0]);
      expect(first.isEnabled()).toBe(true);
      expect(first.getVerticesData(VertexBuffer.PositionKind)?.[7]).toBe(11);
      expect(second.isEnabled()).toBe(true);
      expect(second.getVerticesData(VertexBuffer.PositionKind)?.[7]).toBe(4);

      // Identical ROM sprites must have identical 3D geometry, including the return.
      for (const steps of [
        [3, 4],
        [8, 9, 10, 11],
        [1, 13],
      ]) {
        const snapshots = steps.map((step) => {
          setLevel4HammerFrames(scene, [step]);
          return Array.from(first.getVerticesData(VertexBuffer.PositionKind)!);
        });
        for (const pose of snapshots) expect(pose).toEqual(snapshots[0]);
      }
      setLevel4HammerFrames(scene, [14]);
      expect(first.isEnabled()).toBe(false);

      setLevel4HammerFrames(scene, undefined);
      scene.onBeforeRenderObservable.notifyObservers(scene);
      expect(first.isEnabled()).toBe(!live);
      expect(second.isEnabled()).toBe(false);
      expect(
        scene.getLightByName('level4-hammers-detail-light'),
      ).not.toBeNull();
    } finally {
      scene.dispose();
      engine.dispose();
    }
  },
);
