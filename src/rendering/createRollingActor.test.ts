import { NullEngine } from '@babylonjs/core/Engines/nullEngine';
import { Scene } from '@babylonjs/core/scene';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer';
import { expect, it } from 'vitest';
import { createPracticeMarble } from './createPracticeMarble';
import { createPracticeCamera } from './createPracticeCamera';
import { createScoreAward } from './createScoreAward';
import { createMagicWand } from './createMagicWand';
import { createRollingActor } from './createRollingActor';
import { createMarbleAnimation } from './createMarbleAnimation';
import { createIntermediateActors } from './createIntermediateActors';
import type { PracticePose } from '../emulation/practicePose';
import type { RollingActors } from '../emulation/rollingActors';

const model = {
  seconds: 1,
  poses: [
    {
      positions: [0, 0, 0, 1, 0, 0, 0, 1, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    },
    {
      positions: [0, 0, 0, 1, 0, 0, 0, 2, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
    },
  ],
  uvs: [0, 0, 1, 0, 0, 1],
  groups: { 'player.png': [0, 1, 2] },
};
const library: RollingActors = {
  models: { player_broken: model, player_dizzy: model, player_melt: model },
  textures: { 'player.png': 'data:image/png;base64,AA==' },
};
it('morphs existing meshes, reuses them and hides inactive animations', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const actor = createRollingActor(scene, 'effect', library, true);
    expect(actor.update('absent', 0, { x: 0, y: 0, z: 0 })).toBe(false);
    actor.update('player_broken', 0, { x: 1, y: 2, z: 3 });
    const mesh = scene.getMeshByName('effect-player_broken-player.png')!;
    expect(mesh.isEnabled()).toBe(true);
    actor.update('player_broken', 1, { x: 2, y: 3, z: 4 });
    expect(mesh.getVerticesData(VertexBuffer.PositionKind)?.[7]).toBe(2);
    expect(scene.meshes).toHaveLength(1);
    actor.hide();
    expect(mesh.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
it('advances death animations with the arcade clock, freezes in pause and loops dizziness', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const effect = createMarbleAnimation(scene, 'effect', library, true);
    const pose = {
      marble: 'visible' as const,
      x: 0,
      z: 0,
      height: 16384,
      animation: 2,
      animationTick: 65520,
    };
    const point = { x: 1, y: 0, z: 2 };
    effect(pose, point);
    effect({ ...pose, animationTick: 30 }, point);
    const mesh = scene.getMeshByName('effect-player_broken-player.png')!;
    expect(mesh.getVerticesData(VertexBuffer.PositionKind)?.[7]).toBe(2);
    effect({ ...pose, animationTick: 30 }, point);
    expect(scene.meshes).toHaveLength(1);
    effect(undefined, null);
    expect(mesh.isEnabled()).toBe(false);
    effect({ ...pose, animation: 5, animationTick: 60 }, point);
    const star = scene.getMeshByName('effect-star-0')!;
    expect(star.isEnabled()).toBe(true);
    const initial = star.position.clone();
    effect({ ...pose, animation: 5, animationTick: 80 }, point);
    expect(star.position.equalsWithEpsilon(initial)).toBe(false);
    effect(undefined, null);
    expect(star.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('uses the bent spring rig and exposes the tongue only late in the native meal script', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const update = createIntermediateActors(
      scene,
      {
        level: 'intermediate',
        cells: Array.from({ length: 14 }, () => Array(14).fill([0, 0, 0, 0])),
        origin: { x: 40, z: 40 },
        lastScroll: -15846,
      },
      library,
    );
    const actor = {
      id: 4,
      kind: 'worm' as const,
      marble: 'visible' as const,
      x: 350,
      z: 350,
      height: 16264,
      state: 3,
      script: 0x20c6c,
      scriptFrame: 0,
      phase: 0,
      heading: 0,
    };
    const pose: PracticePose = {
      marble: 'visible',
      x: 350,
      z: 350,
      height: 16264,
      level: 'intermediate',
      scroll: -16000,
      frame: 10,
      actors: [actor],
    };
    update(pose);
    const body = scene.getMeshByName('arcade-worm-4-body')!;
    const before = Array.from(body.getVerticesData(VertexBuffer.PositionKind)!);
    const count = scene.meshes.length;
    update({ ...pose, actors: [{ ...actor, scriptFrame: 4 }] });
    expect(body.isEnabled()).toBe(true);
    expect(body.getVerticesData(VertexBuffer.PositionKind)).not.toEqual(before);
    const tail = scene.getMeshByName('arcade-worm-4-end-0')!,
      head = scene.getMeshByName('arcade-worm-4-end-1')!;
    expect(tail.position.y).toBe(0);
    expect(head.position.y).toBe(0);
    expect(head.position.z - tail.position.z).toBe(1);
    const frozen = Array.from(body.getVerticesData(VertexBuffer.PositionKind)!);
    update({ ...pose, actors: [{ ...actor, scriptFrame: 4 }] });
    expect(
      Array.from(body.getVerticesData(VertexBuffer.PositionKind)!),
    ).toEqual(frozen);
    update({
      ...pose,
      actors: [{ ...actor, state: 5, script: 0x20e28, scriptFrame: 3 }],
    });
    const tongue = scene.getMeshByName('arcade-worm-4-tongue')!;
    expect(tongue.isEnabled()).toBe(false);
    update({
      ...pose,
      actors: [{ ...actor, state: 5, script: 0x20e28, scriptFrame: 26 }],
    });
    expect(tongue.isEnabled()).toBe(true);
    expect(scene.meshes.length).toBe(count);
    update(null);
    expect(body.isEnabled()).toBe(false);
    expect(tongue.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
it('hides the consumed marble instead of drawing a blue puddle', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const effect = createMarbleAnimation(scene, 'consumed', library, false);
    expect(
      effect(
        {
          marble: 'hidden',
          x: 0,
          z: 0,
          height: 16384,
          animation: 7,
          animationTick: 10,
        },
        { x: 0, y: 0, z: 0 },
      ),
    ).toBe(true);
    expect(scene.meshes).toHaveLength(0);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('shares exactly the normal marble paint with dizzy and broken meshes for both players', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    for (const red of [false, true]) {
      const name = red ? 'red' : 'blue';
      const ball = createPracticeMarble(scene, name, red, {
        ...library,
        models: { ...library.models, player: model },
      });
      const effect = createRollingActor(scene, name + '-anim', library, red);
      for (const key of ['player_dizzy', 'player_broken']) {
        effect.update(key, 0, { x: 0, y: 0, z: 0 });
        expect(
          scene.getMeshByName(name + '-anim-' + key + '-player.png')?.material,
        ).toBe(ball.marble.material);
      }
      expect(ball.marble.getVerticesData(VertexBuffer.ColorKind)).toBeNull();
      expect(ball.marble.material?.name).toBe('arcade-marble-' + name);
    }
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
it('uses native magic progress, freezes its pose and cleans up after the spell', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const update = createMagicWand(scene, 'spell');
    const point = { x: 0, y: 0, z: 0 };
    const pose = {
      marble: 'visible' as const,
      x: 0,
      z: 0,
      height: 16384,
      magic: { progress: 0.5, frame: 26, stretch: 0.75 },
    };
    update(pose, point);
    const shaft = scene.getMeshByName('spell-shaft')!;
    expect(shaft.isEnabled()).toBe(true);
    const pivot = scene.getTransformNodeByName('spell')!;
    const position = pivot.position.clone(),
      rotation = pivot.rotation.clone();
    update(pose, point);
    expect(pivot.position.equals(position)).toBe(true);
    expect(pivot.rotation.equals(rotation)).toBe(true);
    update({ ...pose, magic: { ...pose.magic, progress: 0.65 } }, point);
    expect(pivot.rotation.equals(rotation)).toBe(false);
    update({ ...pose, magic: { ...pose.magic, frame: 42 } }, point);
    expect(shaft.isEnabled()).toBe(false);
    update(undefined, null);
    expect(shaft.isEnabled()).toBe(false);
    expect(scene.getMeshByName('spell-magic-star-0')?.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('shows and reuses the native black-marble score message without a time notice', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    scene.activeCamera = createPracticeCamera(scene, 14, 14);
    const update = createScoreAward(scene, 'native-award', false);
    const point = { x: 0, y: 0, z: 0 };
    const pose = {
      marble: 'visible' as const,
      x: 0,
      z: 0,
      height: 16384,
      scoreAward: { points: 1000, offset: 0 },
    };
    update(pose, point);
    const label = scene.getMeshByName('native-award-1000-catch-up')!;
    expect(label.isEnabled()).toBe(true);
    const count = scene.meshes.length;
    update({ ...pose, scoreAward: { points: 1000, offset: -8 } }, point);
    expect(scene.meshes.length).toBe(count);
    update({ ...pose, scoreAward: { points: 250, offset: 0 } }, point);
    expect(label.isEnabled()).toBe(false);
    update(undefined, null);
    expect(scene.getMeshByName('native-award-250-catch-up')?.isEnabled()).toBe(
      false,
    );
    update(pose, null);
    expect(label.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('grounds the broom, hides it until the native secondary pointer activates, and syncs its sweep', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const brokenModel = {
      seconds: 2,
      poses: Array.from({ length: 17 }, (_, f) => ({
        // 3 marble vertices at y=-5.67..0, 3 broom vertices floating at y=-1.5..18.5
        positions: [
          0,
          -5.67,
          0,
          1,
          -5.67,
          0,
          0,
          0,
          0,
          0,
          f < 5 ? 0 : -1.5,
          0,
          1,
          f < 5 ? 0.1 : 18.5,
          0,
          0,
          f < 5 ? 0.1 : 5 + f * 0.2,
          1,
        ],
        normals: Array(18).fill(1),
      })),
      uvs: Array(12).fill(0),
      groups: { 'player.png': [0, 1, 2], 'broom.jpg': [3, 4, 5] },
    };
    const effect = createMarbleAnimation(
      scene,
      'broken-sync',
      {
        models: { player_broken: brokenModel },
        textures: {
          'player.png': 'data:image/png;base64,AA==',
          'broom.jpg': 'data:image/jpeg;base64,AA==',
        },
      },
      false,
    );
    const point = { x: 0, y: 0, z: 0 };
    effect(
      {
        marble: 'visible',
        x: 0,
        z: 0,
        height: 16384,
        animation: 2,
        animationTick: 10,
        broken: { primaryFrame: 5 },
      },
      point,
    );
    const broom = scene.getMeshByName('broken-sync-player_broken-broom.jpg')!;
    const debris = scene.getMeshByName('broken-sync-player_broken-player.png')!;
    expect(debris.isEnabled()).toBe(true);
    expect(broom.isEnabled()).toBe(false);
    effect(
      {
        marble: 'visible',
        x: 0,
        z: 0,
        height: 16384,
        animation: 2,
        animationTick: 20,
        broken: { primaryFrame: 15, broomFrame: 20 },
      },
      point,
    );
    expect(broom.isEnabled()).toBe(true);
    const pos = broom.getVerticesData(VertexBuffer.PositionKind)!;
    // Lowest broom bristle is grounded to -5.67 in model space.
    expect(pos[10]).toBeCloseTo(-5.67, 2);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});

it('centers amoeba_stretch poses in Z, uses semi-transparent acid paint, and morphs while moving', () => {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  try {
    const amoebaModel = {
      seconds: 1,
      poses: [
        {
          positions: [-6, 0, -6, 6, 0, -6, 0, 0, 6],
          normals: [0, 1, 0, 0, 1, 0, 0, 1, 0],
        },
        {
          positions: [-4, 0, 2, 4, 0, 2, 0, 0, 18],
          normals: [0, 1, 0, 0, 1, 0, 0, 1, 0],
        },
      ],
      uvs: [0, 0, 1, 0, 0.5, 1],
      groups: { 'amoeba.png': [0, 1, 2] },
    };
    const update = createIntermediateActors(
      scene,
      {
        level: 'level3',
        cells: Array.from({ length: 14 }, () => Array(14).fill([0, 0, 0, 0])),
        origin: { x: 40, z: 40 },
        lastScroll: -15440,
      },
      {
        models: { ...library.models, amoeba_stretch: amoebaModel },
        textures: {
          ...library.textures,
          'amoeba.png': 'data:image/png;base64,AA==',
        },
      },
    );
    const acidActor = {
      id: 10,
      kind: 'acid' as const,
      marble: 'visible' as const,
      x: 340,
      z: 340,
      height: 16320,
      state: 1,
      script: 0,
      scriptFrame: 0,
      phase: 0,
      heading: 0,
    };
    const pose: PracticePose = {
      marble: 'visible',
      x: 340,
      z: 340,
      height: 16320,
      level: 'level3',
      scroll: -15800,
      frame: 1,
      actors: [acidActor],
    };
    update(pose);
    const mesh = scene.getMeshByName(
      'arcade-amoeba-0-amoeba_stretch-amoeba.png',
    )!;
    expect(mesh.isEnabled()).toBe(true);
    expect(mesh.material?.alpha).toBeLessThan(1);
    expect(mesh.material?.disableDepthWrite).toBe(true);
    // Advance 7 frames (~0.73 stride phase) toward a new target tile so the stretch morph hits pose 1.
    for (let f = 2; f <= 8; f++) {
      update({
        ...pose,
        frame: f,
        actors: [{ ...acidActor, x: 356, z: 340 }],
      });
    }
    const morphed = mesh.getVerticesData(VertexBuffer.PositionKind)!;
    // Pose 1 had z in [2, 18] (center 10), so Z-centering places vertices at [-8, +8].
    expect(morphed[2]).toBeCloseTo(-8, 2);
    expect(morphed[8]).toBeCloseTo(8, 2);
    update(null);
    expect(mesh.isEnabled()).toBe(false);
  } finally {
    scene.dispose();
    engine.dispose();
  }
});
